import { httpActionGeneric } from "convex/server";
import * as jose from "jose";
import type { GenericActionCtx, GenericDataModel } from "convex/server";
import type { ComponentApi } from "../component/_generated/component.js";

export type KindeBillingOptions = {
  KINDE_ISSUER_URL: string;
};

export class KindeBilling {
  webhookHandler: ReturnType<typeof httpActionGeneric>;

  constructor(
    private component: ComponentApi,
    private options: KindeBillingOptions,
  ) {
    const component_ = component;
    const domain = options.KINDE_ISSUER_URL;

    this.webhookHandler = httpActionGeneric(async (ctx, request) => {
      const token = await request.text();
      if (!token) {
        return new Response(JSON.stringify({ error: "Missing token" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const JWKS = jose.createRemoteJWKSet(
        new URL(`${domain}/.well-known/jwks.json`),
      );

      let payload: Record<string, unknown>;
      try {
        const result = await jose.jwtVerify(token, JWKS);
        payload = result.payload as Record<string, unknown>;
      } catch (err) {
        console.error("Kinde billing webhook JWT verification failed:", err);
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const eventType = (payload.type || payload.event_type) as string;
      const data = payload.data as Record<string, unknown> | undefined;

      if (!eventType || !data) {
        return new Response(JSON.stringify({ error: "Invalid payload" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const customerId =
        (data.org_code as string) ||
        (data.customer_id as string) ||
        (data.user_id as string) ||
        "";
      const customerType = (data.org_code as string) ? "org" : "user";

      if (!customerId) {
        return new Response(JSON.stringify({ error: "Missing customer ID" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      await ctx.runMutation(component_.lib.handleWebhookEvent, {
        eventType,
        customerId,
        customerType: customerType as "user" | "org",
        payload: JSON.stringify(payload),
        planId: (data.plan_id as string) || undefined,
        planName: (data.plan_name as string) || undefined,
        agreementId: (data.agreement_id as string) || undefined,
        currentPeriodEnd: (data.next_billing_date as number) || undefined,
        meterId: (data.meter_id as string) || undefined,
        quantity: (data.quantity as number) || undefined,
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
  }

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
}

type RunQueryCtx = {
  runQuery: GenericActionCtx<GenericDataModel>["runQuery"];
};
