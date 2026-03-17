import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  subscriptions: defineTable({
    customerId: v.string(),
    customerType: v.union(v.literal("user"), v.literal("org")),
    planId: v.optional(v.string()),
    planName: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("cancelled"),
      v.literal("past_due"),
      v.literal("unpaid"),
      v.literal("unknown"),
    ),
    agreementId: v.optional(v.string()),
    currentPeriodEnd: v.optional(v.number()),
    cancelledAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_customerId", ["customerId"])
    .index("by_status", ["status"]),

  billingEvents: defineTable({
    customerId: v.string(),
    eventType: v.string(),
    payload: v.string(),
    receivedAt: v.number(),
  })
    .index("by_customerId", ["customerId"])
    .index("by_eventType", ["eventType"]),

  usageRecords: defineTable({
    customerId: v.string(),
    meterId: v.string(),
    quantity: v.number(),
    recordedAt: v.number(),
  })
    .index("by_customerId", ["customerId"])
    .index("by_customerId_meterId", ["customerId", "meterId"]),
});