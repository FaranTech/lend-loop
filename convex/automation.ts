import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

const secret = () => {
  const value = process.env.LENDLOOP_N8N_SECRET;
  if (!value) throw new Error("LENDLOOP_N8N_SECRET is not configured in Convex.");
  return value;
};

async function hmac(value: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const dispatchRequestNotification = internalAction({
  args: {
    loanId: v.id("loans"),
    event: v.string(),
  },
  handler: async (ctx, { loanId, event }) => {
    const webhook = process.env.N8N_REQUEST_WEBHOOK_URL;
    if (!webhook) throw new Error("N8N_REQUEST_WEBHOOK_URL is not configured.");
    const data = await ctx.runQuery(internal.automation.requestNotificationData, { loanId });
    if (!data) return;
    const body = JSON.stringify({ event, ...data });
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = await hmac(`${timestamp}.${body}`);
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json", "x-lendloop-timestamp": timestamp, "x-lendloop-signature": signature },
      body,
    });
    if (!response.ok) throw new Error(`n8n request notification failed with HTTP ${response.status}.`);
  },
});

export const requestNotificationData = internalQuery({
  args: { loanId: v.id("loans") },
  handler: async (ctx, { loanId }) => {
    const loan = await ctx.db.get(loanId);
    if (!loan) return null;
    const tool = await ctx.db.get(loan.toolId);
    if (!tool) return null;
    return {
      loanId,
      toolName: tool.name,
      category: tool.category,
      lenderId: loan.lenderId,
      borrowerId: loan.borrowerId,
      borrowerName: loan.borrowerName,
      startDate: loan.startDate,
      endDate: loan.endDate,
      status: loan.status,
    };
  },
});

export const overdueLoans = internalQuery({
  args: { today: v.string() },
  handler: async (ctx, { today }) => {
    const loans = await ctx.db.query("loans").withIndex("by_status", (q) => q.eq("status", "approved")).collect();
    const overdue = loans.filter((loan) => loan.endDate < today);
    return Promise.all(overdue.map(async (loan) => {
      const tool = await ctx.db.get(loan.toolId);
      const events = await ctx.db.query("automationEvents").withIndex("by_loan", (q) => q.eq("loanId", loan._id)).collect();
      return {
        loanId: loan._id,
        toolName: tool?.name ?? "Borrowed tool",
        borrowerId: loan.borrowerId,
        borrowerName: loan.borrowerName,
        endDate: loan.endDate,
        idempotencyKey: `${loan._id}:${today}`,
        reminderSentToday: events.some((event) => event.idempotencyKey === `${loan._id}:${today}`),
      };
    }));
  },
});

export const recordReminder = internalMutation({
  args: { loanId: v.id("loans"), idempotencyKey: v.string() },
  handler: async (ctx, { loanId, idempotencyKey }) => {
    const existing = await ctx.db.query("automationEvents").withIndex("by_idempotency_key", (q) => q.eq("idempotencyKey", idempotencyKey)).unique();
    if (existing) return { recorded: false, eventId: existing._id };
    const loan = await ctx.db.get(loanId);
    if (!loan || loan.status !== "approved") throw new Error("Reminder target is not an active loan.");
    const expectedKey = `${loanId}:${new Date().toISOString().slice(0, 10)}`;
    if (expectedKey !== idempotencyKey || loan.endDate >= new Date().toISOString().slice(0, 10)) {
      throw new Error("Reminder key or loan due date is not valid.");
    }
    const eventId = await ctx.db.insert("automationEvents", {
      idempotencyKey,
      loanId,
      kind: "overdue_reminder",
      status: "sent",
      sentAt: Date.now(),
    });

    return { recorded: true, eventId };
  },
});

export const normalizeLoanId = internalQuery({
  args: { loanId: v.string() },
  handler: async (ctx, { loanId }) => ctx.db.normalizeId("loans", loanId),
});
