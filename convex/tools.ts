import { v } from "convex/values";
import type { UserIdentity as ConvexUserIdentity } from "convex/server";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";

const ADMIN_EMAIL = "abnazir.ibs@gmail.com";

type UserIdentity = Pick<ConvexUserIdentity, "subject" | "name" | "email" | "emailVerified">;

async function authenticatedUser(ctx: {
  auth: { getUserIdentity: () => Promise<UserIdentity | null> };
}) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("You must be signed in.");
  return identity;
}

function isAdmin(identity: UserIdentity) {
  return isVerifiedEmail(identity)
    && identity.email?.trim().toLowerCase() === ADMIN_EMAIL;
}

function isVerifiedEmail(identity: UserIdentity) {
  return identity.emailVerified === true;
}

async function adminUser(ctx: Parameters<typeof authenticatedUser>[0]) {
  const identity = await authenticatedUser(ctx);
  if (!isAdmin(identity)) throw new Error("Admin access required.");
  return identity;
}

function publicTool(tool: Doc<"tools">) {
  return { _id: tool._id, name: tool.name, category: tool.category };
}

export const publicAvailable = query({
  args: {},
  handler: async (ctx) => {
    const tools = await ctx.db.query("tools").collect();
    const loans = await ctx.db.query("loans").withIndex("by_status", (q) => q.eq("status", "approved")).collect();
    const reservedTools = new Set(loans.map((loan) => loan.toolId));
    return tools.filter((tool) => !tool.archived && !reservedTools.has(tool._id)).map(publicTool);
  },
});

export const allForMember = query({
  args: {},
  handler: async (ctx) => {
    const identity = await authenticatedUser(ctx);
    const [tools, loans, profiles] = await Promise.all([
      ctx.db.query("tools").collect(),
      ctx.db.query("loans").collect(),
      ctx.db.query("profiles").collect(),
    ]);
    const trustedOwners = new Set(profiles.filter((profile) => profile.trustedLender).map((profile) => profile.clerkId));
    const admin = isAdmin(identity);
    const ownTools = tools.filter((tool) => tool.ownerId === identity.subject && !tool.archived);
    const visibleTools = tools.filter((tool) => !tool.archived);
    const relatedLoans = loans.filter((loan) => admin || loan.lenderId === identity.subject || loan.borrowerId === identity.subject);
    const events = await ctx.db.query("automationEvents").collect();
    return {
      tools: visibleTools.map((tool) => ({
        ...tool,
        trustedLender: trustedOwners.has(tool.ownerId),
      })),
      ownTools: ownTools.map((tool) => tool._id),
      loans: await Promise.all(relatedLoans.map(async (loan) => {
        const tool = await ctx.db.get(loan.toolId);
        const activity = events
          .filter((event) => event.loanId === loan._id)
          .sort((a, b) => b.sentAt - a.sentAt)
          .slice(0, 3);
        return { ...loan, tool, activity };
      })),
      isAdmin: admin,
    };
  },
});

export const syncProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await authenticatedUser(ctx);
    const email = identity.email?.trim().toLowerCase();
    if (!email || !isVerifiedEmail(identity)) {
      const emailClaim = email ? "present" : "missing";
      const verifiedClaim = identity.emailVerified === undefined
        ? "missing"
        : `${typeof identity.emailVerified}:${String(identity.emailVerified)}`;
      throw new Error(
        `Clerk Convex identity claims are incomplete (email: ${emailClaim}; email_verified: ${verifiedClaim}). In Clerk's session-token customization, preserve "aud": "convex" and include "email": "{{user.primary_email_address}}" and "email_verified": "{{user.email_verified}}", then refresh your sign-in.`,
      );
    }
    const profile = await ctx.db.query("profiles")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    const values = {
      displayName: identity.name?.slice(0, 80) || "Neighbor",
      email,
      updatedAt: Date.now(),
    };
    if (profile) await ctx.db.patch(profile._id, values);
    else await ctx.db.insert("profiles", {
      clerkId: identity.subject,
      ...values,
      trustedLender: false,
    });
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    condition: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await authenticatedUser(ctx);
    const name = args.name.trim();
    const description = args.description.trim();
    if (!name || name.length > 80) throw new Error("Tool name must be 1–80 characters.");
    if (!args.category.trim() || args.category.length > 40) throw new Error("Choose a valid category.");
    if (!args.condition.trim() || args.condition.length > 80) throw new Error("Add a valid condition.");
    if (!description || description.length > 280) throw new Error("Description must be 1–280 characters.");
    const now = Date.now();
    return await ctx.db.insert("tools", {
      ...args,
      name,
      description,
      category: args.category.trim(),
      condition: args.condition.trim(),
      ownerId: identity.subject,
      ownerName: identity.name?.slice(0, 80) || "Neighbor",
      archived: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    toolId: v.id("tools"),
    name: v.string(),
    category: v.string(),
    condition: v.string(),
    description: v.string(),
  },
  handler: async (ctx, { toolId, ...args }) => {
    const identity = await authenticatedUser(ctx);
    const tool = await ctx.db.get(toolId);
    if (!tool) throw new Error("Listing not found.");
    if (tool.archived) throw new Error("This listing has been removed.");
    if (!isAdmin(identity) && tool.ownerId !== identity.subject) throw new Error("You can only edit your own listings.");
    if (await ctx.db.query("loans").withIndex("by_tool", (q) => q.eq("toolId", toolId)).filter((q) => q.or(q.eq(q.field("status"), "requested"), q.eq(q.field("status"), "approved"))).first()) {
      throw new Error("This listing has an active request or loan and cannot be edited.");
    }
    if (
      !args.name.trim() || args.name.length > 80
      || !args.category.trim() || args.category.length > 40
      || !args.condition.trim() || args.condition.length > 80
      || !args.description.trim() || args.description.length > 280
    ) {
      throw new Error("Check the listing fields and try again.");
    }
    await ctx.db.patch(toolId, {
      name: args.name.trim(),
      category: args.category.trim(),
      condition: args.condition.trim(),
      description: args.description.trim(),
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { toolId: v.id("tools") },
  handler: async (ctx, { toolId }) => {
    const identity = await authenticatedUser(ctx);
    const tool = await ctx.db.get(toolId);
    if (!tool) throw new Error("Listing not found.");
    if (!isAdmin(identity) && tool.ownerId !== identity.subject) throw new Error("You can only remove your own listings.");
    const activeLoan = await ctx.db.query("loans").withIndex("by_tool", (q) => q.eq("toolId", toolId)).filter((q) => q.or(q.eq(q.field("status"), "requested"), q.eq(q.field("status"), "approved"))).first();
    if (activeLoan && !isAdmin(identity)) throw new Error("A listing with an active request or loan cannot be removed.");
    if (isAdmin(identity)) {
      const pendingRequests = await ctx.db.query("loans")
        .withIndex("by_tool", (q) => q.eq("toolId", toolId))
        .filter((q) => q.eq(q.field("status"), "requested"))
        .collect();
      for (const loan of pendingRequests) {
        await ctx.db.patch(loan._id, { status: "declined", updatedAt: Date.now() });
        await ctx.scheduler.runAfter(0, internal.automation.dispatchRequestNotification, {
          loanId: loan._id,
          event: "declined",
        });
      }
    }
    await ctx.db.patch(toolId, { archived: true, updatedAt: Date.now() });
  },
});

export const markTrustedLender = mutation({
  args: { clerkId: v.string(), trusted: v.boolean() },
  handler: async (ctx, { clerkId, trusted }) => {
    await adminUser(ctx);
    const profile = await ctx.db.query("profiles").withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId)).unique();
    if (profile) await ctx.db.patch(profile._id, { trustedLender: trusted, updatedAt: Date.now() });
    else await ctx.db.insert("profiles", { clerkId, displayName: "Neighbor", trustedLender: trusted, updatedAt: Date.now() });
  },
});

export const requestBorrow = mutation({
  args: {
    toolId: v.id("tools"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, { toolId, startDate, endDate }) => {
    const identity = await authenticatedUser(ctx);
    const tool = await ctx.db.get(toolId);
    if (!tool || tool.archived) throw new Error("Tool listing not found.");
    if (tool.ownerId === identity.subject) throw new Error("You cannot request your own tool.");
    const today = new Date().toISOString().slice(0, 10);
    const isValidDate = (value: string) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const timestamp = Date.parse(`${value}T00:00:00.000Z`);
      return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
    };
    if (!isValidDate(startDate) || !isValidDate(endDate) || startDate <= today || endDate <= startDate) {
      throw new Error("Choose a valid future date range.");
    }
    const existing = await ctx.db.query("loans").withIndex("by_tool", (q) => q.eq("toolId", toolId)).filter((q) =>
      q.and(
        q.or(q.eq(q.field("status"), "requested"), q.eq(q.field("status"), "approved")),
        q.lte(q.field("startDate"), endDate),
        q.gte(q.field("endDate"), startDate),
      ),
    ).first();
    if (existing) throw new Error("This tool already has a request or loan for those dates.");
    const now = Date.now();
    const loanId = await ctx.db.insert("loans", {
      toolId,
      lenderId: tool.ownerId,
      borrowerId: identity.subject,
      borrowerName: identity.name?.slice(0, 80) || "Neighbor",
      startDate,
      endDate,
      status: "requested",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.automation.dispatchRequestNotification, {
      loanId,
      event: "requested",
    });
    return loanId;
  },
});

export const updateRequestStatus = mutation({
  args: {
    loanId: v.id("loans"),
    status: v.union(v.literal("approved"), v.literal("declined"), v.literal("returned")),
  },
  handler: async (ctx, { loanId, status }) => {
    const identity = await authenticatedUser(ctx);
    const loan = await ctx.db.get(loanId);
    if (!loan) throw new Error("Request not found.");
    if (status === "returned") {
      if (!isAdmin(identity) && loan.borrowerId !== identity.subject && loan.lenderId !== identity.subject) {
        throw new Error("Only the borrower or lender can mark this loan returned.");
      }
      if (loan.status !== "approved") throw new Error("Only an approved loan can be returned.");
    } else {
      if (!isAdmin(identity) && loan.lenderId !== identity.subject) throw new Error("Only the lender can respond to this request.");
      if (loan.status !== "requested") throw new Error("This request is no longer pending.");
      if (status === "approved") {
        const overlap = await ctx.db.query("loans").withIndex("by_tool", (q) => q.eq("toolId", loan.toolId)).filter((q) =>
          q.and(
            q.eq(q.field("status"), "approved"),
            q.lte(q.field("startDate"), loan.endDate),
            q.gte(q.field("endDate"), loan.startDate),
          ),
        ).first();
        if (overlap) throw new Error("This tool has an overlapping approved loan.");
      }
    }
    const now = Date.now();
    await ctx.db.patch(loanId, {
      status,
      updatedAt: now,
      ...(status === "returned" ? { returnedAt: now } : {}),
    });
    await ctx.scheduler.runAfter(0, internal.automation.dispatchRequestNotification, { loanId, event: status });
  },
});

export const adminLoans = query({
  args: {},
  handler: async (ctx) => {
    await adminUser(ctx);
    const loans = await ctx.db.query("loans").collect();
    return Promise.all(loans.map(async (loan) => ({ ...loan, tool: await ctx.db.get(loan.toolId) })));
  },
});
