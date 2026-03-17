# convex-kinde-billing

**Sync Kinde billing events into your Convex database in real-time.** Subscribe to plan changes, payment events, and metered usage — all reactive, all queryable, zero boilerplate.

[![npm version](https://img.shields.io/npm/v/convex-kinde-billing)](https://www.npmjs.com/package/convex-kinde-billing)
[![Convex Component](https://www.convex.dev/components/badge/sholajegede/convex-kinde-billing)](https://www.convex.dev/components/sholajegede/convex-kinde-billing)

[![npm downloads](https://img.shields.io/npm/dw/convex-kinde-billing)](https://www.npmjs.com/package/convex-kinde-billing)
[![Build Status](https://github.com/sholajegede/convex-kinde-billing/actions/workflows/test.yml/badge.svg)](https://github.com/sholajegede/convex-kinde-billing/actions)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](./LICENSE)

```ts
const kindeBilling = new KindeBilling(components.convexKindeBilling);

// Is this user on an active plan?
const active = await kindeBilling.hasActivePlan(ctx, { customerId: "user_abc" });

// What plan are they on?
const plan = await kindeBilling.getActivePlan(ctx, { customerId: "user_abc" });

// Submit metered usage directly to Kinde — no external server needed
await kindeBilling.recordMeterUsage(ctx, {
  agreementId: "agr_xyz",
  featureCode: "api_calls",
  quantity: 100,
});
```

---

## What this does

Kinde fires webhook events every time a billing action occurs — plan assigned, payment succeeded, subscription cancelled. Without this component, you have to write and maintain your own webhook handler, JWT verification, database schema, and reactive queries.

This component owns all of that. Drop it in, mount the webhook, and your Convex app immediately has reactive billing state — live-updating everywhere Convex data is used.

**What makes this unique:** `recordMeterUsage` calls the Kinde Management API directly from your Convex backend, submitting usage data for metered billing features. Every other Convex billing component is receive-only. This one lets you write back to your billing provider too.

> **Webhook timing:** After a billing action occurs in Kinde (plan assigned, payment succeeded, etc.), there is a short delay — usually a few seconds — before the webhook arrives and your Convex data updates. During this window, `hasActivePlan()` may still reflect the previous state. Once the webhook arrives, Convex's real-time reactivity propagates the change to all subscribers instantly. No polling needed.

---

## Table of Contents

- [Install](#install)
- [Quick Start](#quick-start)
- [Setup](#setup)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Type Reference](#type-reference)
- [Webhook Events](#webhook-events)
- [Database Schema](#database-schema)
- [Customer IDs](#customer-ids)
- [Using with kinde-sync](#using-with-kinde-sync)
- [Testing](#testing)
- [Limitations](#limitations)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Changelog](#changelog)

---

## Install

```bash
npm install convex-kinde-billing
```

**Requirements:** Convex v1.33.1 or later, Node.js 18+

---

## Quick Start

Five steps to get billing state syncing into your Convex app.

### 1. Add the component

In `convex/convex.config.ts`:

```ts
import { defineApp } from "convex/server";
import convexKindeBilling from "convex-kinde-billing/convex.config";

const app = defineApp();
app.use(convexKindeBilling);

export default app;
```

### 2. Set environment variables

In your [Convex Dashboard](https://dashboard.convex.dev) → **Settings → Environment Variables**:

| Variable | Required | Description |
|---|---|---|
| `KINDE_DOMAIN` | Only for `recordMeterUsage` | Your Kinde domain, e.g. `https://yourbusiness.kinde.com` |
| `KINDE_M2M_CLIENT_ID` | Only for `recordMeterUsage` | Client ID from a Kinde M2M application |
| `KINDE_M2M_CLIENT_SECRET` | Only for `recordMeterUsage` | Client secret from a Kinde M2M application |

> The webhook handler requires **no** webhook secret. It verifies incoming JWTs automatically via Kinde's public JWKS endpoint (`{kindeDomain}/.well-known/jwks.json`). The three variables above are only needed if you use `recordMeterUsage`.

**How to get M2M credentials:**

1. In Kinde → **Applications → Add application → Machine to machine**
2. Go to the application's **Details** tab — copy the Client ID and Client Secret
3. Under **APIs**, enable the Kinde Management API and grant the `billing` scope

### 3. Mount the webhook handler

In `convex/http.ts`:

```ts
import { httpRouter } from "convex/server";
import { components } from "./_generated/api";
import { createWebhookHandler } from "convex-kinde-billing";

const http = httpRouter();

http.route({
  path: "/webhooks/kinde/billing",
  method: "POST",
  handler: createWebhookHandler(components.convexKindeBilling),
});

export default http;
```

### 4. Register the webhook in Kinde

1. In Kinde → **Webhooks → Add endpoint**
2. Set the URL: `https://your-deployment.convex.site/webhooks/kinde/billing`
3. Select all 8 billing events (listed in [Webhook Events](#webhook-events) below)
4. Save

Your Convex site URL is in the Convex dashboard under **Settings → URL & Deploy Key** — it ends in `.convex.site`.

### 5. Initialize the client

Create `convex/billing.ts`:

```ts
import { components } from "./_generated/api";
import { KindeBilling } from "convex-kinde-billing";

export const kindeBilling = new KindeBilling(components.convexKindeBilling);
```

Import `kindeBilling` from this module in any file that needs billing queries or actions.

---

## Setup

### Complete file examples

**`convex/billing.ts`** — your central billing module:

```ts
import { components } from "./_generated/api";
import { KindeBilling } from "convex-kinde-billing";
import { query, action } from "./_generated/server";
import { v } from "convex/values";

export const kindeBilling = new KindeBilling(components.convexKindeBilling);

// Gate features — use this in queries and mutations
export const checkAccess = query({
  args: { customerId: v.string() },
  handler: async (ctx, { customerId }) =>
    kindeBilling.hasActivePlan(ctx, { customerId }),
});

// Submit metered usage — must be an action (calls external API)
export const trackUsage = action({
  args: {
    agreementId: v.string(),
    featureCode: v.string(),
    quantity: v.number(),
  },
  handler: async (ctx, args) =>
    kindeBilling.recordMeterUsage(ctx, args),
});
```

**`convex/http.ts`** — webhook entry point:

```ts
import { httpRouter } from "convex/server";
import { components } from "./_generated/api";
import { createWebhookHandler } from "convex-kinde-billing";

const http = httpRouter();

http.route({
  path: "/webhooks/kinde/billing",
  method: "POST",
  handler: createWebhookHandler(components.convexKindeBilling),
});

export default http;
```

---

## Usage

### Check if a customer has an active plan

```ts
export const checkAccess = query({
  args: { customerId: v.string() },
  handler: async (ctx, args) => {
    return await kindeBilling.hasActivePlan(ctx, { customerId: args.customerId });
  },
});
// Returns: true | false
// Returns false (never throws) when customerId doesn't exist yet
```

### Get the customer's current plan

```ts
export const getPlan = query({
  args: { customerId: v.string() },
  handler: async (ctx, args) => {
    return await kindeBilling.getActivePlan(ctx, { customerId: args.customerId });
  },
});
// Returns: { planId, planName, status, currentPeriodEnd } | null
```

### Get the full subscription record

```ts
export const getSubscription = query({
  args: { customerId: v.string() },
  handler: async (ctx, args) => {
    return await kindeBilling.getSubscription(ctx, { customerId: args.customerId });
  },
});
// Returns: Subscription | null
// Includes agreementId, customerType, cancelledAt, updatedAt, etc.
```

### List billing events for a customer

```ts
export const getBillingHistory = query({
  args: { customerId: v.string() },
  handler: async (ctx, args) => {
    return await kindeBilling.listBillingEvents(ctx, {
      customerId: args.customerId,
      limit: 20, // optional, defaults to 50
    });
  },
});
// Returns: BillingEvent[] ordered newest first
```

### Query metered usage records

```ts
export const getApiUsage = query({
  args: { customerId: v.string() },
  handler: async (ctx, args) => {
    return await kindeBilling.getUsage(ctx, {
      customerId: args.customerId,
      meterId: "api_calls",   // must match the feature key in your Kinde plan
      limit: 100,             // optional, defaults to 100
    });
  },
});
// Returns: UsageRecord[] ordered newest first
```

### Submit metered usage to Kinde

Call this from an action whenever your user consumes a metered feature. This calls the Kinde Management API and records usage against the customer's current billing cycle:

```ts
export const trackApiCall = action({
  args: {
    agreementId: v.string(),
    callCount: v.number(),
  },
  handler: async (ctx, args) => {
    return await kindeBilling.recordMeterUsage(ctx, {
      agreementId: args.agreementId,
      featureCode: "api_calls", // must match the feature key in your Kinde plan
      quantity: args.callCount,
    });
  },
});
```

> **Where does `agreementId` come from?**
> The `agreementId` is stored on the subscription record when Kinde fires `customer.agreement_created`. Call `getSubscription` and read `subscription.agreementId`. It maps to Kinde's `customer_agreement_id` — a separate identifier from `user_id` or `org_code`.

### Gate a feature by plan status

```ts
export const generateReport = action({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const active = await kindeBilling.hasActivePlan(ctx, { customerId: userId });
    if (!active) throw new Error("Upgrade required to generate reports.");
    // ... generate report
  },
});
```

### Gate by plan name

```ts
export const accessAdvancedAnalytics = query({
  args: { customerId: v.string() },
  handler: async (ctx, { customerId }) => {
    const plan = await kindeBilling.getActivePlan(ctx, { customerId });
    if (!plan || plan.planName !== "Pro") {
      return { allowed: false, reason: "Pro plan required" };
    }
    return { allowed: true };
  },
});
```

---

## API Reference

### `KindeBilling` class

Instantiate once and export from a shared module:

```ts
import { KindeBilling } from "convex-kinde-billing";
const kindeBilling = new KindeBilling(components.convexKindeBilling);
```

#### Methods

| Method | Context | Args | Returns | Description |
|---|---|---|---|---|
| `getSubscription` | query or action | `{ customerId: string }` | `Subscription \| null` | Full subscription record for a customer |
| `hasActivePlan` | query or action | `{ customerId: string }` | `boolean` | Whether the customer has `status === "active"` |
| `getActivePlan` | query or action | `{ customerId: string }` | `PlanSummary \| null` | Current plan name, ID, and period end |
| `listBillingEvents` | query or action | `{ customerId: string, limit?: number }` | `BillingEvent[]` | Audit log of all billing webhook events, newest first |
| `getUsage` | query or action | `{ customerId: string, meterId: string, limit?: number }` | `UsageRecord[]` | Metered usage records for a specific feature, newest first |
| `recordMeterUsage` | **action only** | `{ agreementId: string, featureCode: string, quantity: number }` | `{ success: boolean }` | Submit metered usage to Kinde Management API |

> **Query behaviour:** All query methods return `null`, `false`, or `[]` (never throw) when a customer has no data. This makes it safe to call in loading states before any webhook has arrived.

#### `createWebhookHandler(component)`

Returns an HTTP action that verifies and processes all incoming Kinde billing webhooks.

```ts
import { createWebhookHandler } from "convex-kinde-billing";
```

---

## Type Reference

### `Subscription`

```ts
type Subscription = {
  _id: Id<"subscriptions">;
  _creationTime: number;
  customerId: string;           // Kinde user_id or org_code
  customerType: "user" | "org";
  planId?: string;
  planName?: string;
  status: "active" | "cancelled" | "past_due" | "unpaid" | "unknown";
  agreementId?: string;         // Kinde customer_agreement_id — required for recordMeterUsage
  currentPeriodEnd?: number;    // Unix timestamp in milliseconds
  cancelledAt?: number;         // Set when agreement_cancelled fires
  updatedAt: number;
};
```

### `PlanSummary`

```ts
type PlanSummary = {
  planId?: string;
  planName?: string;
  status: "active" | "cancelled" | "past_due" | "unpaid" | "unknown";
  currentPeriodEnd?: number;
};
```

### `BillingEvent`

```ts
type BillingEvent = {
  _id: Id<"billingEvents">;
  _creationTime: number;
  customerId: string;
  eventType: string;   // e.g. "customer.plan_assigned"
  payload: string;     // full verified JWT payload, JSON stringified — useful for debugging
  receivedAt: number;  // Unix timestamp in milliseconds
};
```

### `UsageRecord`

```ts
type UsageRecord = {
  _id: Id<"usageRecords">;
  _creationTime: number;
  customerId: string;
  meterId: string;     // matches the featureCode passed to recordMeterUsage
  quantity: number;
  recordedAt: number;  // Unix timestamp in milliseconds
};
```

---

## Webhook Events

All 8 Kinde billing webhook events are handled automatically. Every event is also written to the `billingEvents` table — giving you a full, queryable audit log.

| Event | What triggers it | Subscription result | Notes |
|---|---|---|---|
| `customer.plan_assigned` | Customer is associated with a plan in Kinde | Created or updated → `active` | |
| `customer.agreement_created` | Customer signs up to a plan (contract created in Stripe) | Created or updated → `active` | `agreementId` stored — required for metered usage |
| `customer.plan_changed` | Customer upgrades or downgrades their plan | Updated → `active`, plan details refreshed | |
| `customer.agreement_cancelled` | Subscription cancelled by customer or admin | Updated → `cancelled`, `cancelledAt` recorded | Access not immediately revoked — see note below |
| `customer.payment_succeeded` | Payment processed successfully | Updated → `active` | |
| `customer.payment_failed` | Payment attempt fails (card declined, etc.) | Updated → `past_due` | |
| `customer.invoice_overdue` | Invoice becomes overdue (manual payment) | Updated → `unpaid` | Only fires when payment is not automated |
| `customer.meter_usage_updated` | Kinde reports metered usage has changed | No subscription change | Usage record inserted into `usageRecords` |

> **Cancellation behaviour:** `customer.agreement_cancelled` sets `status` to `"cancelled"` and records `cancelledAt`, but `currentPeriodEnd` is preserved. If you need to grant access until the end of the paid period rather than the cancellation date, check `currentPeriodEnd` in addition to `status`.

### How webhook verification works

Kinde webhooks are RS256-signed JWTs. The component verifies every request without any static secret:

1. Decodes the JWT to extract the `iss` (issuer) claim — your Kinde domain
2. Fetches Kinde's public keys from `{iss}/.well-known/jwks.json`
3. Verifies the JWT signature using `jose`

There is no webhook secret to configure, rotate, or leak. The JWKS URL is derived from the token itself.

---

## Database Schema

Three isolated tables, prefixed with `convexKindeBilling:` in the Convex dashboard. They do not appear in or conflict with your app's own schema.

### `subscriptions`

One row per customer. Updated in-place on every billing event that changes status or plan.

| Field | Type | Description |
|---|---|---|
| `customerId` | `string` | Kinde `user_id` or `org_code` |
| `customerType` | `"user" \| "org"` | B2C user or B2B organisation |
| `planId` | `string?` | Kinde plan identifier |
| `planName` | `string?` | Human-readable plan name |
| `status` | `string` | `active`, `cancelled`, `past_due`, `unpaid`, or `unknown` |
| `agreementId` | `string?` | Kinde `customer_agreement_id` — required for `recordMeterUsage` |
| `currentPeriodEnd` | `number?` | Unix ms timestamp of next billing date |
| `cancelledAt` | `number?` | Unix ms timestamp when cancellation was received |
| `updatedAt` | `number` | Unix ms timestamp of last write |

### `billingEvents`

Append-only. One row per webhook received — never modified or deleted.

| Field | Type | Description |
|---|---|---|
| `customerId` | `string` | Kinde `user_id` or `org_code` |
| `eventType` | `string` | e.g. `customer.plan_assigned` |
| `payload` | `string` | Full verified JWT payload, JSON stringified |
| `receivedAt` | `number` | Unix ms timestamp |

### `usageRecords`

One row per `recordMeterUsage` call or `customer.meter_usage_updated` webhook.

| Field | Type | Description |
|---|---|---|
| `customerId` | `string` | Kinde `user_id` or `org_code` |
| `meterId` | `string` | Feature code (e.g. `api_calls`) |
| `quantity` | `number` | Usage quantity submitted |
| `recordedAt` | `number` | Unix ms timestamp |

---

## Customer IDs

Kinde billing supports both **B2C** (user-level) and **B2B** (org-level) customers. The component detects and handles both automatically from the webhook payload:

- Payload contains `org_code` → org billing, `customerType: "org"`
- Otherwise falls back to `customer_id` or `user_id` → user billing, `customerType: "user"`

When calling query methods, pass:
- B2C: Kinde `user_id` (e.g. `kp_abc123`)
- B2B: Kinde `org_code` (e.g. `org_abc123`)

---

## Using with `kinde-sync`

If you're also using [`@sholajegede/kinde-sync`](https://www.npmjs.com/package/@sholajegede/kinde-sync) to sync Kinde users into Convex, the `customerId` values are the same Kinde identifiers — you can join billing state to user profile data in one query:

```ts
import { query } from "./_generated/server";
import { v } from "convex/values";
import { kindeBilling } from "./billing";

export const getUserWithBilling = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // From kinde-sync
    const user = await ctx.db
      .query("users")
      .withIndex("by_kindeId", (q) => q.eq("kindeId", args.userId))
      .first();

    // From convex-kinde-billing
    const plan = await kindeBilling.getActivePlan(ctx, { customerId: args.userId });
    const subscription = await kindeBilling.getSubscription(ctx, { customerId: args.userId });

    return { user, plan, subscription };
  },
});
```

One `userId` ties together synced user profiles and live billing state — no extra mapping required.

---

## Testing

The component's internal mutations are exposed via the standard Convex test API. You can simulate webhook events arriving and assert on the resulting state:

```ts
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema.js";

const modules = import.meta.glob("./**/*.ts");

test("no active plan before any billing events", async () => {
  const t = convexTest(schema, modules);
  const result = await t.query(api.billing.checkAccess, {
    customerId: "kp_user123",
  });
  expect(result).toBe(false);
});

test("active plan after plan_assigned event", async () => {
  const t = convexTest(schema, modules);

  // Simulate a webhook arriving
  await t.mutation(api.lib.handleWebhookEvent, {
    eventType: "customer.plan_assigned",
    customerId: "kp_user123",
    customerType: "user",
    payload: "{}",
    planId: "plan_pro",
    planName: "Pro",
  });

  const result = await t.query(api.billing.checkAccess, {
    customerId: "kp_user123",
  });
  expect(result).toBe(true);
});

test("cancelled after agreement_cancelled", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(api.lib.handleWebhookEvent, {
    eventType: "customer.plan_assigned",
    customerId: "kp_user123",
    customerType: "user",
    payload: "{}",
    planId: "plan_pro",
    planName: "Pro",
  });

  await t.mutation(api.lib.handleWebhookEvent, {
    eventType: "customer.agreement_cancelled",
    customerId: "kp_user123",
    customerType: "user",
    payload: "{}",
  });

  const result = await t.query(api.billing.checkAccess, {
    customerId: "kp_user123",
  });
  expect(result).toBe(false);
});
```

> **Note on `recordMeterUsage` in tests:** This action calls the Kinde Management API externally. In a test environment without `KINDE_DOMAIN`, `KINDE_M2M_CLIENT_ID`, and `KINDE_M2M_CLIENT_SECRET` set, it will throw `"Missing required env vars: KINDE_DOMAIN, KINDE_M2M_CLIENT_ID, KINDE_M2M_CLIENT_SECRET"` — which is the expected and correct behaviour for an isolated test.

---

## Limitations

**No initial sync.** Customers who subscribed before this component was installed will not appear in the database until a new billing event fires for them (next payment, plan change, renewal, etc.). There is no backfill mechanism.

**Webhook-driven only.** All data comes exclusively from incoming Kinde webhooks. The component does not poll the Kinde API or fetch current state proactively.

**`agreementId` requires `agreement_created`.** The `agreementId` on a subscription is only set when Kinde sends `customer.agreement_created`. Subscriptions that existed before the component was installed will have `agreementId: undefined` until their next agreement event fires. Without `agreementId`, `recordMeterUsage` cannot be called for that customer.

**One subscription row per customer.** The `subscriptions` table stores one row per `customerId`, updated in place. Kinde's billing model does not commonly support simultaneous multiple active subscriptions per customer, so this is typically not a limitation in practice.

**Metered usage is fire-and-forget.** `recordMeterUsage` submits to Kinde and does not get the updated balance back in the same call. The `customer.meter_usage_updated` webhook from Kinde brings the updated state into Convex after the fact.

---

## Troubleshooting

**Webhook returns 400 "Missing issuer"**
The JWT from Kinde is missing the `iss` claim. Verify the Kinde webhook endpoint URL is correct and that Kinde billing is fully configured in your account.

**Webhook returns 400 "Missing event data"**
The JWT does not contain `type`/`event_type` or `data` claims. Check you've pointed Kinde's billing webhooks (not general auth webhooks) at this endpoint.

**Webhook returns 500 "Webhook processing failed"**
JWT verification failed or the internal mutation threw. Check your Convex function logs:

```bash
npx convex logs
```

Common causes: expired JWT (clock skew between Kinde and your server), JWT signature mismatch, or an unexpected payload shape.

**`hasActivePlan` returns false immediately after assigning a plan in Kinde**
This is normal webhook delay — Kinde takes a few seconds to dispatch the webhook. The UI will update automatically once it arrives. No manual refresh or polling needed.

**Subscription not updating after plan change**
Confirm all 8 billing events are selected in Kinde's webhook settings. In Kinde → **Webhooks** → edit your endpoint → verify `customer.plan_changed` is checked.

**`agreementId` is undefined on the subscription**
Only set when `customer.agreement_created` fires. If the customer subscribed before the component was installed, trigger any billing event (renewal, plan change) to populate it. You can also find the ID in the Kinde dashboard under the user or org's **Billing** tab.

**`recordMeterUsage` throws "Missing required env vars"**
Set `KINDE_DOMAIN`, `KINDE_M2M_CLIENT_ID`, and `KINDE_M2M_CLIENT_SECRET` in the Convex dashboard under **Settings → Environment Variables**. These are not read from `.env` files — they must be set in the dashboard.

**`recordMeterUsage` throws "Failed to obtain Kinde M2M token"**
Your M2M application doesn't have the right API access. In Kinde → your M2M app → **APIs** → enable the Kinde Management API and grant the `billing` scope. Redeploy after updating env vars:

```bash
npx convex deploy
```

**`recordMeterUsage` throws "Failed to record meter usage: 404"**
The `agreementId` or `featureCode` doesn't exist in Kinde. Confirm the `agreementId` matches a real value from `subscription.agreementId`, and that `featureCode` exactly matches a feature key defined in the customer's active Kinde plan.

**Component tables not visible in the Convex dashboard**
The tables live under the `convexKindeBilling` component namespace. In the Convex dashboard, use the component selector dropdown (top of the Data tab) to switch to the component's namespace.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup, running tests locally, and the publishing process.

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md)

---

## License

Apache-2.0