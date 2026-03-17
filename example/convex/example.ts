import { query, mutation } from "./_generated/server.js";
import { components } from "./_generated/api.js";
import { KindeBilling } from "../../src/client/index.js";
import { v } from "convex/values";

const kindeBilling = new KindeBilling(components.convexKindeBilling, {
  KINDE_ISSUER_URL: process.env.KINDE_ISSUER_URL!,
});

export const getSubscription = query({
  args: { customerId: v.string() },
  handler: async (ctx, args) => {
    return await kindeBilling.getSubscription(ctx, args);
  },
});

export const hasActivePlan = query({
  args: { customerId: v.string() },
  handler: async (ctx, args) => {
    return await kindeBilling.hasActivePlan(ctx, args);
  },
});

export const getActivePlan = query({
  args: { customerId: v.string() },
  handler: async (ctx, args) => {
    return await kindeBilling.getActivePlan(ctx, args);
  },
});

export const listBillingEvents = query({
  args: { customerId: v.string() },
  handler: async (ctx, args) => {
    return await kindeBilling.listBillingEvents(ctx, args);
  },
});

export const getUsage = query({
  args: { customerId: v.string(), meterId: v.string() },
  handler: async (ctx, args) => {
    return await kindeBilling.getUsage(ctx, args);
  },
});

export const simulateEvent = mutation({
  args: {
    eventType: v.string(),
    customerId: v.string(),
    customerType: v.union(v.literal("user"), v.literal("org")),
    planId: v.optional(v.string()),
    planName: v.optional(v.string()),
    agreementId: v.optional(v.string()),
    quantity: v.optional(v.number()),
    meterId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(components.convexKindeBilling.lib.handleWebhookEvent, {
      eventType: args.eventType,
      customerId: args.customerId,
      customerType: args.customerType,
      payload: JSON.stringify({ simulated: true, ts: Date.now() }),
      planId: args.planId,
      planName: args.planName,
      agreementId: args.agreementId,
      quantity: args.quantity,
      meterId: args.meterId,
    });
    return null;
  },
});
