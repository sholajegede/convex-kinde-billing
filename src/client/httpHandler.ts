import { httpActionGeneric } from "convex/server";
import * as jose from "jose";
import type { ComponentApi } from "../component/_generated/component.js";

export function createWebhookHandler(component: ComponentApi) {
  return httpActionGeneric(async (ctx, request) => {
    try {
      const token = await request.text();
      const decoded = jose.decodeJwt(token);
      const kindeDomain = decoded.iss as string;
      if (!kindeDomain) return new Response("Missing issuer", { status: 400 });

      const JWKS = jose.createRemoteJWKSet(
        new URL(`${kindeDomain}/.well-known/jwks.json`),
      );
      const { payload } = await jose.jwtVerify(token, JWKS);

      const eventType = (payload.type || payload.event_type) as string;
      const data = payload.data as Record<string, unknown> | undefined;
      if (!eventType || !data) return new Response("Missing event data", { status: 400 });

      const customerId =
        (data.org_code as string) ||
        (data.customer_id as string) ||
        (data.user_id as string) ||
        "";
      const customerType = (data.org_code as string) ? "org" : "user";
      if (!customerId) return new Response("Missing customer ID", { status: 400 });

      await ctx.runMutation(component.lib.handleWebhookEvent, {
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

      return new Response("OK", { status: 200 });
    } catch (err) {
      console.error("Kinde billing webhook error:", err);
      return new Response("Webhook processing failed", { status: 500 });
    }
  });
}