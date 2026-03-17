# convex-kinde-billing

**Add Kinde billing to your Convex app.** Reactive subscriptions, checkout, self-serve portal, and feature gating.

[![npm version](https://img.shields.io/npm/v/convex-kinde-billing)](https://www.npmjs.com/package/convex-kinde-billing)
[![Convex Component](https://www.convex.dev/components/badge/sholajegede/convex-kinde-billing)](https://www.convex.dev/components/sholajegede/convex-kinde-billing)
[![npm downloads](https://img.shields.io/npm/dw/convex-kinde-billing)](https://www.npmjs.com/package/convex-kinde-billing)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](./LICENSE)

```ts
const kindeBilling = new KindeBilling(components.convexKindeBilling, {
  KINDE_ISSUER_URL: process.env.KINDE_ISSUER_URL!,
});

// Is this user on an active plan?
const active = await kindeBilling.hasActivePlan(ctx, { customerId: "customer_abc123" });

// Does this user have access to a specific feature?
const hasAccess = await kindeBilling.hasFeature(ctx, { customerId: "customer_abc123", featureKey: "pro" });

// Generate a checkout URL to send users to Kinde's hosted billing
const checkoutUrl = kindeBilling.getCheckoutUrl({
  clientId: process.env.KINDE_CLIENT_ID!,
  redirectUri: "https://yourapp.com/dashboard",
  planKey: "customer_pro_plan",
});

// Generate a one-time self-serve billing portal link (using user's access token)
const portalUrl = await kindeBilling.getPortalUrl(userAccessToken, {
  returnUrl: "https://yourapp.com/settings",
});
```

## What this does

Kinde fires webhook events every time a billing action occurs — plan assigned, payment succeeded, subscription cancelled. Without this component, you have to write and maintain your own webhook handler, JWT verification, database schema, and reactive queries.

This component owns all of that. Drop it in, mount the webhook, and your Convex app immediately has:

- **Reactive billing state** — subscription status, plan name, renewal date, live in Convex
- **Feature gating** — `hasFeature()` and `hasActivePlan()` to gate any feature or route
- **Checkout** — `getCheckoutUrl()` generates a Kinde-hosted checkout link with plan pre-selected
- **Self-serve portal** — `getPortalUrl()` generates a one-time billing portal URL using the user's access token.
- **Metered usage** — usage records stored and queryable in real time
- **React component** — `<ManageBillingButton>` drop-in portal button

> **Webhook timing:** After a billing action occurs in Kinde, there is a short delay — usually a few seconds — before the webhook arrives and your Convex data updates. Once the webhook arrives, Convex's real-time reactivity propagates the change to all subscribers instantly.

## Table of Contents

- [Install](#install)
- [Quick Start](#quick-start)
- [Setup](#setup)
- [Usage](#usage)
- [Checkout](#checkout)
- [Self-Serve Portal](#self-serve-portal)
- [React Components](#react-components)
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

Five steps to add Kinde billing to your Convex app.

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

```bash
npx convex env set KINDE_ISSUER_URL https://yourdomain.kinde.com
```

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

Import `kindeBilling` from this file in any Convex function that needs billing.

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

### Check if a customer has a specific feature

```ts
export const checkFeature = query({
  args: { customerId: v.string(), featureKey: v.string() },
  handler: async (ctx, args) => {
    return await kindeBilling.hasFeature(ctx, args);
  },
});
// Returns: true if customer is active and planId or planName contains featureKey
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

## Checkout

Kinde's checkout is hosted — you redirect users to a Kinde URL and they complete payment there. `getCheckoutUrl()` builds that URL with the plan pre-selected.

```ts
const checkoutUrl = kindeBilling.getCheckoutUrl({
  clientId: process.env.KINDE_CLIENT_ID!,
  redirectUri: "https://yourapp.com/dashboard",
  planKey: "customer_pro_plan",
});

window.location.href = checkoutUrl;
```

Show a pricing table instead of pre-selecting a plan:

```ts
const checkoutUrl = kindeBilling.getCheckoutUrl({
  clientId: process.env.KINDE_CLIENT_ID!,
  redirectUri: "https://yourapp.com/dashboard",
  pricingTableKey: "main_pricing_table",
});
```

For B2B org sign-up:

```ts
const checkoutUrl = kindeBilling.getCheckoutUrl({
  clientId: process.env.KINDE_CLIENT_ID!,
  redirectUri: "https://yourapp.com/dashboard",
  planKey: "customer_pro_plan",
  isCreateOrg: true,
});
```

After checkout, Kinde fires `customer.plan_assigned` and `customer.agreement_created` webhooks — your Convex billing state updates automatically.

## Self-Serve Portal

`getPortalUrl()` calls Kinde's Account API using the logged-in user's access token.

### Using Kinde's React SDK

```tsx
import { PortalLink } from "@kinde-oss/kinde-auth-react";

<PortalLink>Manage Billing</PortalLink>
```

### Without Kinde's React SDK

```ts
// Get the user's Kinde access token from your auth flow, then:
const portalUrl = await kindeBilling.getPortalUrl(userAccessToken, {
  returnUrl: "https://yourapp.com/settings",
});
window.location.href = portalUrl;
```

For B2B org billing portal:

```ts
const portalUrl = await kindeBilling.getPortalUrl(userAccessToken, {
  returnUrl: "https://yourapp.com/settings",
  subNav: "organization_billing",
});
window.location.href = portalUrl;
```

## React Components

### `<PortalLink>` — Kinde Auth SDK

If you use `@kinde-oss/kinde-auth-react`, use Kinde's built-in component. No backend call needed:

```tsx
import { PortalLink } from "@kinde-oss/kinde-auth-react";

<PortalLink>Manage Billing</PortalLink>
```

### `ManageBillingButton`

Drop-in button that calls `getPortalUrl` using the user's access token and redirects to the portal.

```tsx
import { ManageBillingButton } from "convex-kinde-billing/react";

function SettingsPage({ userAccessToken }: { userAccessToken: string }) {
  return (
    <ManageBillingButton
      kindeBilling={kindeBilling}
      userAccessToken={userAccessToken}
      returnUrl={window.location.href}
    >
      Manage Billing
    </ManageBillingButton>
  );
}
```

Props:

| Prop | Type | Required | Description |
|||||
| `kindeBilling` | `KindeBilling` | ✓ | Your `KindeBilling` instance |
| `userAccessToken` | `string` | ✓ | The logged-in user's Kinde access token |
| `returnUrl` | `string` | | URL to return to after the portal |
| `children` | `ReactNode` | | Button label (default: `"Manage Billing"`) |
| `className` | `string` | | CSS class name |

## API Reference

### `KindeBilling` class

```ts
import { KindeBilling } from "convex-kinde-billing";

const kindeBilling = new KindeBilling(components.convexKindeBilling, {
  KINDE_ISSUER_URL: process.env.KINDE_ISSUER_URL!,
});
```

#### Constructor options

| Option | Type | Required | Description |
|||||
| `KINDE_ISSUER_URL` | `string` | ✓ | Your Kinde issuer URL e.g. `https://yourdomain.kinde.com` |

#### Methods

| Method | Type | Args | Returns | Description |
||||||
| `webhookHandler` | HTTP action | — | — | Mount in `convex/http.ts` to receive Kinde billing webhooks |
| `getCheckoutUrl` | sync | `{ clientId, redirectUri, planKey?, pricingTableKey?, isCreateOrg? }` | `string` | Build a Kinde-hosted checkout URL |
| `getPortalUrl` | async | `(userAccessToken, { returnUrl?, subNav? })` | `string` | Generate a one-time self-serve portal URL using the user's access token |
| `getSubscription` | query | `{ customerId }` | `Subscription \| null` | Full subscription record |
| `hasActivePlan` | query | `{ customerId }` | `boolean` | Whether customer has `status === "active"` |
| `hasFeature` | query | `{ customerId, featureKey }` | `boolean` | Whether customer is active and on a plan matching featureKey |
| `getActivePlan` | query | `{ customerId }` | `PlanSummary \| null` | Current plan name, ID, and period end |
| `listBillingEvents` | query | `{ customerId, limit? }` | `BillingEvent[]` | Billing webhook audit log, newest first |
| `getUsage` | query | `{ customerId, meterId, limit? }` | `UsageRecord[]` | Metered usage records, newest first |

> All query methods return `null`, `false`, or `[]` (never throw) when a customer has no data.

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

Note that `getPortalUrl` uses the Kinde auth `user_id` (`kp_xxx`), not the billing `customer_id`, because the portal is a user-facing auth flow.

## Using with `kinde-sync`

If you're also using [`@sholajegede/kinde-sync`](https://www.npmjs.com/package/@sholajegede/kinde-sync) to sync Kinde users into Convex, the auth `user_id` from `kinde-sync` and the billing `customer_id` from this component are different identifiers. You can join them in one query:

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

This package exports a `src/test.ts` helper for use with [`convex-test`](https://www.npmjs.com/package/convex-test). It re-exports the component schema so you can write unit tests against your billing logic without a live Convex deployment.


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

**`getPortalUrl` requires a logged-in user's access token.** The user must be authenticated with Kinde.

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

**`getPortalUrl` returns 401**
The user's access token is expired or invalid. Re-authenticate the user with Kinde and retry.

**Component tables not visible in the Convex dashboard**
Use the component selector dropdown at the top of the Data tab to switch to the `convexKindeBilling` namespace.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

## License

Apache-2.0