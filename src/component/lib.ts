import { v } from "convex/values";
import {
  mutation,
  query,
} from "./_generated/server.js";

const statusValidator = v.union(
  v.literal("active"),
  v.literal("cancelled"),
  v.literal("past_due"),
  v.literal("unpaid"),
  v.literal("unknown"),
);

const subscriptionValidator = v.object({
  _id: v.id("subscriptions"),
  _creationTime: v.number(),
  customerId: v.string(),
  customerType: v.union(v.literal("user"), v.literal("org")),
  planId: v.optional(v.string()),
  planName: v.optional(v.string()),
  status: statusValidator,
  agreementId: v.optional(v.string()),
  currentPeriodEnd: v.optional(v.number()),
  cancelledAt: v.optional(v.number()),
  updatedAt: v.number(),
});

const billingEventValidator = v.object({
  _id: v.id("billingEvents"),
  _creationTime: v.number(),
  customerId: v.string(),
  eventType: v.string(),
  payload: v.string(),
  receivedAt: v.number(),
});

const usageRecordValidator = v.object({
  _id: v.id("usageRecords"),
  _creationTime: v.number(),
  customerId: v.string(),
  meterId: v.string(),
  quantity: v.number(),
  recordedAt: v.number(),
});

// ─── Public queries ───────────────────────────────────────────────────────────

export const getSubscription = query({
  args: { customerId: v.string() },
  returns: v.union(v.null(), subscriptionValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_customerId", (q) => q.eq("customerId", args.customerId))
      .first();
  },
});

export const hasActivePlan = query({
  args: { customerId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_customerId", (q) => q.eq("customerId", args.customerId))
      .first();
    return sub?.status === "active";
  },
});

export const getActivePlan = query({
  args: { customerId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      planId: v.optional(v.string()),
      planName: v.optional(v.string()),
      status: statusValidator,
      currentPeriodEnd: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_customerId", (q) => q.eq("customerId", args.customerId))
      .first();
    if (!sub) return null;
    return {
      planId: sub.planId,
      planName: sub.planName,
      status: sub.status,
      currentPeriodEnd: sub.currentPeriodEnd,
    };
  },
});

export const listBillingEvents = query({
  args: {
    customerId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(billingEventValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("billingEvents")
      .withIndex("by_customerId", (q) => q.eq("customerId", args.customerId))
      .order("desc")
      .take(args.limit ?? 50);
  },
});

export const getUsage = query({
  args: {
    customerId: v.string(),
    meterId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(usageRecordValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("usageRecords")
      .withIndex("by_customerId_meterId", (q) =>
        q.eq("customerId", args.customerId).eq("meterId", args.meterId),
      )
      .order("desc")
      .take(args.limit ?? 100);
  },
});

// ─── Public mutations ─────────────────────────────────────────────────────────

export const handleWebhookEvent = mutation({
  args: {
    eventType: v.string(),
    customerId: v.string(),
    customerType: v.union(v.literal("user"), v.literal("org")),
    payload: v.string(),
    planId: v.optional(v.string()),
    planName: v.optional(v.string()),
    agreementId: v.optional(v.string()),
    currentPeriodEnd: v.optional(v.number()),
    quantity: v.optional(v.number()),
    meterId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("billingEvents", {
      customerId: args.customerId,
      eventType: args.eventType,
      payload: args.payload,
      receivedAt: Date.now(),
    });

    switch (args.eventType) {
      case "customer.plan_assigned":
      case "customer.agreement_created":
      case "customer.payment_succeeded": {
        const existing = await ctx.db
          .query("subscriptions")
          .withIndex("by_customerId", (q) => q.eq("customerId", args.customerId))
          .first();
        if (existing) {
          await ctx.db.patch(existing._id, {
            status: "active",
            planId: args.planId ?? existing.planId,
            planName: args.planName ?? existing.planName,
            agreementId: args.agreementId ?? existing.agreementId,
            currentPeriodEnd: args.currentPeriodEnd ?? existing.currentPeriodEnd,
            updatedAt: Date.now(),
          });
        } else {
          await ctx.db.insert("subscriptions", {
            customerId: args.customerId,
            customerType: args.customerType,
            status: "active",
            planId: args.planId,
            planName: args.planName,
            agreementId: args.agreementId,
            currentPeriodEnd: args.currentPeriodEnd,
            updatedAt: Date.now(),
          });
        }
        break;
      }
      case "customer.plan_changed": {
        const existing = await ctx.db
          .query("subscriptions")
          .withIndex("by_customerId", (q) => q.eq("customerId", args.customerId))
          .first();
        if (existing) {
          await ctx.db.patch(existing._id, {
            planId: args.planId ?? existing.planId,
            planName: args.planName ?? existing.planName,
            agreementId: args.agreementId ?? existing.agreementId,
            currentPeriodEnd: args.currentPeriodEnd ?? existing.currentPeriodEnd,
            status: "active",
            updatedAt: Date.now(),
          });
        }
        break;
      }
      case "customer.agreement_cancelled": {
        const existing = await ctx.db
          .query("subscriptions")
          .withIndex("by_customerId", (q) => q.eq("customerId", args.customerId))
          .first();
        if (existing) {
          await ctx.db.patch(existing._id, {
            status: "cancelled",
            cancelledAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
        break;
      }
      case "customer.payment_failed":
      case "customer.invoice_overdue": {
        const existing = await ctx.db
          .query("subscriptions")
          .withIndex("by_customerId", (q) => q.eq("customerId", args.customerId))
          .first();
        if (existing) {
          await ctx.db.patch(existing._id, {
            status: args.eventType === "customer.invoice_overdue" ? "unpaid" : "past_due",
            updatedAt: Date.now(),
          });
        }
        break;
      }
      case "customer.meter_usage_updated": {
        if (args.meterId && args.quantity !== undefined) {
          await ctx.db.insert("usageRecords", {
            customerId: args.customerId,
            meterId: args.meterId,
            quantity: args.quantity,
            recordedAt: Date.now(),
          });
        }
        break;
      }
    }

    return null;
  },
});
