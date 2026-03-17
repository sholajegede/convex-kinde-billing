import { httpActionGeneric } from "convex/server";
import * as jose from "jose";
import type { GenericActionCtx, GenericDataModel } from "convex/server";
import type { ComponentApi } from "../component/_generated/component.js";

export type KindeBillingOptions = {
  KINDE_ISSUER_URL: string;
};

function formatPlanName(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  return raw
    .replace(/^customer_/, "")
    .replace(/_plan$/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

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

      const plan = data.plan as Record<string, unknown> | undefined;
      const rawPlanId =
        (data.plan_id as string) ||
        (plan?.code as string) ||
        (plan?.key as string) ||
        undefined;
      const planName = formatPlanName(rawPlanId);

      const rawPeriodEnd = data.invoice_due_on || data.next_billing_date;
      const currentPeriodEnd = rawPeriodEnd
        ? new Date((rawPeriodEnd as string).replace(/([+-]\d{2})$/, "$1:00")).getTime() || undefined
        : undefined;

      await ctx.runMutation(component_.lib.handleWebhookEvent, {
        eventType,
        customerId,
        customerType: customerType as "user" | "org",
        payload: JSON.stringify(payload),
        planId: rawPlanId,
        planName,
        agreementId: (data.agreement_id as string) || undefined,
        currentPeriodEnd,
        meterId: (data.meter_id as string) || undefined,
        quantity: (data.quantity as number) || undefined,
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
  }

  getCheckoutUrl(args: {
    clientId: string;
    redirectUri: string;
    planKey?: string;
    pricingTableKey?: string;
    isCreateOrg?: boolean;
  }): string {
    const domain = this.options.KINDE_ISSUER_URL;
    const params = new URLSearchParams({
      response_type: "code",
      client_id: args.clientId,
      redirect_uri: args.redirectUri,
      scope: "openid profile email",
    });
    if (args.planKey) params.set("plan_interest", args.planKey);
    if (args.pricingTableKey) params.set("pricing_table_key", args.pricingTableKey);
    if (args.isCreateOrg) params.set("is_create_org", "true");
    return `${domain}/oauth2/auth?${params.toString()}`;
  }

  /**
   * Get a self-serve portal URL using the logged-in user's Kinde access token.
   * Call this client-side.
   *
   * @example
   * const url = await kindeBilling.getPortalUrl(userAccessToken, {
   *   returnUrl: "https://yourapp.com/settings",
   * });
   * window.location.href = url;
   */
  async getPortalUrl(
    userAccessToken: string,
    options?: { returnUrl?: string; subNav?: string },
  ): Promise<string> {
    const params = new URLSearchParams();
    if (options?.returnUrl) params.set("return_url", options.returnUrl);
    if (options?.subNav) params.set("sub_nav", options.subNav);
    const url = `${this.options.KINDE_ISSUER_URL}/account_api/v1/portal_link${params.toString() ? "?" + params.toString() : ""}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${userAccessToken}` },
    });
    if (!res.ok) {
      throw new Error(`Failed to get portal link: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as { url: string };
    return data.url;
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

  async hasFeature(ctx: RunQueryCtx, args: { customerId: string; featureKey: string }): Promise<boolean> {
    return await ctx.runQuery(this.component.lib.hasFeature, args);
  }

  async listBillingEvents(ctx: RunQueryCtx, args: { customerId: string; limit?: number }) {
    return await ctx.runQuery(this.component.lib.listBillingEvents, args);
  }

  async getUsage(ctx: RunQueryCtx, args: { customerId: string; meterId: string; limit?: number }) {
    return await ctx.runQuery(this.component.lib.getUsage, args);
  }
}

type RunQueryCtx = {
  runQuery: GenericActionCtx<GenericDataModel>["runQuery"];
};
