import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tools: defineTable({
    name: v.string(),
    category: v.string(),
    condition: v.string(),
    description: v.string(),
    ownerId: v.string(),
    ownerName: v.string(),
    archived: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_owner", ["ownerId"]).index("by_category", ["category"]),
  loans: defineTable({
    toolId: v.id("tools"),
    lenderId: v.string(),
    borrowerId: v.string(),
    borrowerName: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    status: v.union(
      v.literal("requested"),
      v.literal("approved"),
      v.literal("declined"),
      v.literal("returned"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
    returnedAt: v.optional(v.number()),
  })
    .index("by_tool", ["toolId"])
    .index("by_borrower", ["borrowerId"])
    .index("by_lender", ["lenderId"])
    .index("by_status", ["status"]),
  profiles: defineTable({
    clerkId: v.string(),
    displayName: v.string(),
    trustedLender: v.boolean(),
    updatedAt: v.number(),
  }).index("by_clerk_id", ["clerkId"]),
  automationEvents: defineTable({
    idempotencyKey: v.string(),
    loanId: v.id("loans"),
    kind: v.literal("overdue_reminder"),
    status: v.literal("sent"),
    sentAt: v.number(),
  }).index("by_idempotency_key", ["idempotencyKey"]).index("by_loan", ["loanId"]),
});
