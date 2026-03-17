# convex-kinde-billing

**Sync Kinde billing events into your Convex database in real-time.** Subscribe to plan changes, payment events, and metered usage — all reactive, all queryable, zero boilerplate.

[![npm version](https://img.shields.io/npm/v/convex-kinde-billing)](https://www.npmjs.com/package/convex-kinde-billing)
[![Convex Component](https://www.convex.dev/components/badge/sholajegede/convex-kinde-billing)](https://www.convex.dev/components/sholajegede/convex-kinde-billing)
[![npm downloads](https://img.shields.io/npm/dw/convex-kinde-billing)](https://www.npmjs.com/package/convex-kinde-billing)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](./LICENSE)
```ts
const kindeBilling = new KindeBilling(components.convexKindeBilling, {
  KINDE_ISSUER_URL: process.env.KINDE_ISSUER_URL!,
});

// Is this user on an active plan?
const active = await kindeBilling.hasActivePlan(ctx, { customerId: "kp_abc123" });

// What plan are they on?
const plan = await kindeBilling.getActivePlan(ctx, { customerId: "kp_abc123" });

// Full billing history
const events = await kindeBilling.listBillingEvents(ctx, { customerId: "kp_abc123" });
```

## What this does

Kinde fires webhook events every time a billing action occurs — plan assigned, payment succeeded, subscription cancelled. Without this component, you have to write and maintain your own webhook handler, JWT verification, database schema, and reactive queries.

This component owns all of that. Drop it in, mount the webhook, and your Convex app immediately has reactive billing state — live-updating everywhere Convex data is used. No polling, no boilerplate.

> **Webhook timing:** After a billing action occurs in Kinde, there is a short delay — usually a few seconds — before the webhook arrives and your Convex data updates. Once the webhook arrives, Convex's real-time reactivity propagates the change to all subscribers instantly.

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

## Install
```bash
npm install convex-kinde-billing
```

**Requirements:** Convex v1.33.1 or later, Node.js 18+

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

### 2. Set your environment variable
```bash
npx convex env set KINDE_ISSUER_URL https://yourdomain.kinde.com
```

Your Kinde issuer URL is your Kinde domain — find it in Kinde → **Settings → Applications → your app → Details**.

### 3. Mount the webhook handler

In `convex/http.ts`:
```ts
import { httpRouter } from "convex/server";
import { components } from "./_generated/api";
import { KindeBilling } from "convex-kinde-billing";

const kindeBilling = new KindeBilling(components.convexKindeBilling, {
  KINDE_ISSUER_URL: process.env.KINDE_ISSUER_URL!,
});

const http = httpRouter();

http.route({
  path: "/webhooks/kinde/billing",
  method: "POST",
  handler: kindeBilling.webhookHandler,
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

In `convex/billing.ts`:
```ts
import { components } from "./_generated/api";
import { KindeBilling } from "convex-kinde-billing";

export const kindeBilling = new KindeBilling(components.convexKindeBilling, {
  KINDE_ISSUER_URL: process.env.KINDE_ISSUER_URL!,
});
```

Import `kindeBilling` from this file in any Convex function that needs billing queries.

## Setup

**`convex/billing.ts`** — your central billing module:
```ts
import { components } from "./_generated/api";
import { KindeBilling } from "convex-kinde-billing";
import { query } from "./_generated/server";
import { v } from "convex/values";

export const kindeBilling = new KindeBilling(components.convexKindeBilling, {
  KINDE_ISSUER_URL: process.env.KINDE_ISSUER_URL!,
});

// Gate features — use this in queries and mutations
export const checkAccess = query({
  args: { customerId: v.string() },
  handler: async (ctx, { customerId }) =>
    kindeBilling.hasActivePlan(ctx, { customerId }),
});
```

**`convex/http.ts`** — webhook entry point:
```ts
import { httpRouter } from "convex/server";
import { components } from "./_generated/api";
import { KindeBilling } from "convex-kinde-billing";

const kindeBilling = new KindeBilling(components.convexKindeBilling, {
  KINDE_ISSUER_URL: process.env.KINDE_ISSUER_URL!,
});

const http = httpRouter();

http.route({
  path: "/webhooks/kinde/billing",
  method: "POST",
  handler: kindeBilling.webhookHandler,
});

export default http;
```

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
```

### List billing events for a customer
```ts
export const getBillingHistory = query({
  args: { customerId: v.string() },
  handler: async (ctx, args) => {
    return await kindeBilling.listBillingEvents(ctx, {
      customerId: args.customerId,
      limit: 20,
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
      meterId: "api_calls",
      limit: 100,
    });
  },
});
// Returns: UsageRecord[] ordered newest first
```

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

## API Reference

### `KindeBilling` class
```ts
import { KindeBilling } from "convex-kinde-billing";

const kindeBilling = new KindeBilling(components.convexKindeBilling, {
  KINDE_ISSUER_URL: process.env.KINDE_ISSUER_URL!,
});
```

#### Constructor options

| Option | Type | Description |
||||
| `KINDE_ISSUER_URL` | `string` | Your Kinde issuer URL e.g. `https://yourdomain.kinde.com` |

#### Methods

| Method | Args | Returns | Description |
|||||
| `getSubscription` | `{ customerId: string }` | `Subscription \| null` | Full subscription record |
| `hasActivePlan` | `{ customerId: string }` | `boolean` | Whether customer has `status === "active"` |
| `getActivePlan` | `{ customerId: string }` | `PlanSummary \| null` | Current plan name, ID, and period end |
| `listBillingEvents` | `{ customerId: string, limit?: number }` | `BillingEvent[]` | Billing webhook audit log, newest first |
| `getUsage` | `{ customerId: string, meterId: string, limit?: number }` | `UsageRecord[]` | Metered usage records, newest first |

> All methods return `null`, `false`, or `[]` (never throw) when a customer has no data.

#### `kindeBilling.webhookHandler`

HTTP action to mount in `convex/http.ts`. Verifies and processes all incoming Kinde billing webhooks automatically.

## Type Reference

### `Subscription`
```ts
type Subscription = {
  _id: Id<"subscriptions">;
  _creationTime: number;
  customerId: string;
  customerType: "user" | "org";
  planId?: string;
  planName?: string;
  status: "active" | "cancelled" | "past_due" | "unpaid" | "unknown";
  agreementId?: string;
  currentPeriodEnd?: number;
  cancelledAt?: number;
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
  eventType: string;
  payload: string;
  receivedAt: number;
};
```

### `UsageRecord`
```ts
type UsageRecord = {
  _id: Id<"usageRecords">;
  _creationTime: number;
  customerId: string;
  meterId: string;
  quantity: number;
  recordedAt: number;
};
```

## Webhook Events

All 8 Kinde billing webhook events are handled automatically. Every event is written to the `billingEvents` table — a full queryable audit log.

| Event | What triggers it | Subscription result |
||||
| `customer.plan_assigned` | Customer is associated with a plan | Created or updated → `active` |
| `customer.agreement_created` | Customer signs up to a plan | Created or updated → `active` |
| `customer.plan_changed` | Customer upgrades or downgrades | Updated → `active`, plan refreshed |
| `customer.agreement_cancelled` | Subscription cancelled | Updated → `cancelled`, `cancelledAt` recorded |
| `customer.payment_succeeded` | Payment processed successfully | Updated → `active` |
| `customer.payment_failed` | Payment attempt fails | Updated → `past_due` |
| `customer.invoice_overdue` | Invoice becomes overdue | Updated → `unpaid` |
| `customer.meter_usage_updated` | Kinde reports usage change | Usage record inserted into `usageRecords` |

> **Cancellation behaviour:** `customer.agreement_cancelled` sets `status` to `"cancelled"` and records `cancelledAt`, but `currentPeriodEnd` is preserved. Check `currentPeriodEnd` if you want to grant access until the end of the paid period.

### How webhook verification works

Kinde billing webhooks are RS256-signed JWTs. The component uses your `KINDE_ISSUER_URL` to fetch Kinde's public keys from `{KINDE_ISSUER_URL}/.well-known/jwks.json` and verifies the signature using `jose`. No webhook secret to configure, rotate, or leak.

## Database Schema

Three isolated tables, prefixed with `convexKindeBilling:` in the Convex dashboard.

### `subscriptions`

| Field | Type | Description |
||||
| `customerId` | `string` | Kinde `customer_id` or `org_code` |
| `customerType` | `"user" \| "org"` | B2C user or B2B organisation |
| `planId` | `string?` | Kinde plan key e.g. `customer_pro_plan` |
| `planName` | `string?` | Human-readable plan name e.g. `Pro` |
| `status` | `string` | `active`, `cancelled`, `past_due`, `unpaid`, or `unknown` |
| `agreementId` | `string?` | Kinde `agreement_id` |
| `currentPeriodEnd` | `number?` | Unix ms timestamp of next billing date |
| `cancelledAt` | `number?` | Unix ms timestamp when cancellation was received |
| `updatedAt` | `number` | Unix ms timestamp of last write |

### `billingEvents`

| Field | Type | Description |
||||
| `customerId` | `string` | Kinde `customer_id` or `org_code` |
| `eventType` | `string` | e.g. `customer.plan_assigned` |
| `payload` | `string` | Full verified JWT payload, JSON stringified |
| `receivedAt` | `number` | Unix ms timestamp |

### `usageRecords`

| Field | Type | Description |
||||
| `customerId` | `string` | Kinde `customer_id` or `org_code` |
| `meterId` | `string` | Feature key e.g. `api_calls` |
| `quantity` | `number` | Usage quantity |
| `recordedAt` | `number` | Unix ms timestamp |

## Customer IDs

Kinde billing uses `customer_id` — a separate identifier from the auth `user_id` (`kp_xxx`). The component detects the correct ID automatically from the webhook payload:

- Payload contains `org_code` → `customerType: "org"`
- Otherwise uses `customer_id` → `customerType: "user"`

When calling query methods pass the Kinde `customer_id` e.g. `customer_019865139a9b96b5bb666f8441f2d73c`. You can find it in Kinde → **Billing → Users → your user → Customer ID**.

## Using with `kinde-sync`

If you're also using [`@sholajegede/kinde-sync`](https://www.npmjs.com/package/@sholajegede/kinde-sync) note that `kinde-sync` uses the Kinde auth `user_id` (`kp_xxx`) while this component uses the Kinde billing `customer_id`. You can join them via the `user_id` field present in billing webhook payloads:
```ts
export const getUserWithBilling = query({
  args: { customerId: v.string() },
  handler: async (ctx, args) => {
    const plan = await kindeBilling.getActivePlan(ctx, { customerId: args.customerId });
    const subscription = await kindeBilling.getSubscription(ctx, { customerId: args.customerId });
    return { plan, subscription };
  },
});
```

## Testing
```ts
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema.js";

const modules = import.meta.glob("./**/*.ts");

test("no active plan before any billing events", async () => {
  const t = convexTest(schema, modules);
  const result = await t.query(api.lib.hasActivePlan, { customerId: "kp_user123" });
  expect(result).toBe(false);
});

test("active plan after plan_assigned event", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(api.lib.handleWebhookEvent, {
    eventType: "customer.plan_assigned",
    customerId: "kp_user123",
    customerType: "user",
    payload: "{}",
    planId: "plan_pro",
    planName: "Pro",
  });
  const result = await t.query(api.lib.hasActivePlan, { customerId: "kp_user123" });
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
  const result = await t.query(api.lib.hasActivePlan, { customerId: "kp_user123" });
  expect(result).toBe(false);
});
```

## Limitations

**No initial sync.** Customers who subscribed before this component was installed will not appear until a new billing event fires for them.

**Webhook-driven only.** All data comes from incoming Kinde webhooks. The component does not poll the Kinde API.

**One subscription row per customer.** The `subscriptions` table stores one row per `customerId`, updated in place.

**Billing customer ID vs auth user ID.** Kinde uses separate IDs for billing (`customer_xxx`) and auth (`kp_xxx`). Always pass the billing `customer_id` to query methods.

## Troubleshooting

**Webhook returns 401 "Invalid token"**
JWT verification failed. Make sure `KINDE_ISSUER_URL` is set correctly in your Convex dashboard under **Settings → Environment Variables** and matches your Kinde domain exactly.

**Webhook returns 400 "Missing event data"**
Check you've pointed Kinde's billing webhooks (not auth webhooks) at this endpoint.

**Webhook returns 400 "Missing customer ID"**
The payload doesn't contain `customer_id`, `org_code`, or `user_id`. Check the event type is a billing event and the webhook is correctly configured in Kinde.

**Webhook returns 500**
Check your Convex function logs:
```bash
npx convex logs
```

**`hasActivePlan` returns false immediately after assigning a plan**
Normal webhook delay — Kinde takes a few seconds. The UI updates automatically once the webhook arrives.

**Subscription not updating after plan change**
Confirm all 8 billing events are selected in Kinde's webhook settings.

**Plan name shows as undefined**
Make sure you're on the latest version — earlier versions didn't extract plan name from the nested `data.plan` object in Kinde's payload.

**Component tables not visible in the Convex dashboard**
Use the component selector dropdown at the top of the Data tab to switch to the `convexKindeBilling` namespace.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

## License

Apache-2.0
