/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    lib: {
      getActivePlan: FunctionReference<
        "query",
        "internal",
        { customerId: string },
        null | {
          currentPeriodEnd?: number;
          planId?: string;
          planName?: string;
          status: "active" | "cancelled" | "past_due" | "unpaid" | "unknown";
        },
        Name
      >;
      getSubscription: FunctionReference<
        "query",
        "internal",
        { customerId: string },
        null | {
          _creationTime: number;
          _id: string;
          agreementId?: string;
          cancelledAt?: number;
          currentPeriodEnd?: number;
          customerId: string;
          customerType: "user" | "org";
          planId?: string;
          planName?: string;
          status: "active" | "cancelled" | "past_due" | "unpaid" | "unknown";
          updatedAt: number;
        },
        Name
      >;
      getUsage: FunctionReference<
        "query",
        "internal",
        { customerId: string; limit?: number; meterId: string },
        Array<{
          _creationTime: number;
          _id: string;
          customerId: string;
          meterId: string;
          quantity: number;
          recordedAt: number;
        }>,
        Name
      >;
      handleWebhookEvent: FunctionReference<
        "mutation",
        "internal",
        {
          agreementId?: string;
          currentPeriodEnd?: number;
          customerId: string;
          customerType: "user" | "org";
          eventType: string;
          meterId?: string;
          payload: string;
          planId?: string;
          planName?: string;
          quantity?: number;
        },
        null,
        Name
      >;
      hasActivePlan: FunctionReference<
        "query",
        "internal",
        { customerId: string },
        boolean,
        Name
      >;
      listBillingEvents: FunctionReference<
        "query",
        "internal",
        { customerId: string; limit?: number },
        Array<{
          _creationTime: number;
          _id: string;
          customerId: string;
          eventType: string;
          payload: string;
          receivedAt: number;
        }>,
        Name
      >;
    };
  };
