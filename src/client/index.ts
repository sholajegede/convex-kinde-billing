import type { GenericActionCtx, GenericDataModel } from "convex/server";
import type { ComponentApi } from "../component/_generated/component.js";

export class KindeBilling {
  constructor(private component: ComponentApi) {}

  async getSubscription(ctx: RunQueryCtx, args: { customerId: string }) {
    return await ctx.runQuery(this.component.lib.getSubscription, args);
  }

  async hasActivePlan(ctx: RunQueryCtx, args: { customerId: string }): Promise<boolean> {
    return await ctx.runQuery(this.component.lib.hasActivePlan, args);
  }

  async getActivePlan(ctx: RunQueryCtx, args: { customerId: string }) {
    return await ctx.runQuery(this.component.lib.getActivePlan, args);
  }

  async listBillingEvents(ctx: RunQueryCtx, args: { customerId: string; limit?: number }) {
    return await ctx.runQuery(this.component.lib.listBillingEvents, args);
  }

  async getUsage(
    ctx: RunQueryCtx,
    args: { customerId: string; meterId: string; limit?: number },
  ) {
    return await ctx.runQuery(this.component.lib.getUsage, args);
  }

  async recordMeterUsage(
    ctx: RunActionCtx,
    args: { agreementId: string; featureCode: string; quantity: number },
  ): Promise<{ success: boolean }> {
    return await ctx.runAction(this.component.lib.recordMeterUsage, args);
  }
}

type RunQueryCtx = {
  runQuery: GenericActionCtx<GenericDataModel>["runQuery"];
};

type RunActionCtx = {
  runAction: GenericActionCtx<GenericDataModel>["runAction"];
};