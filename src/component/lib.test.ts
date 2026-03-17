import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema.js";

const modules = import.meta.glob("./**/*.ts");

test("getSubscription returns null for unknown customer", async () => {
  const t = convexTest(schema, modules);
  const result = await t.query(api.lib.getSubscription, {
    customerId: "user_test123",
  });
  expect(result).toBe(null);
});

test("hasActivePlan returns false for unknown customer", async () => {
  const t = convexTest(schema, modules);
  const result = await t.query(api.lib.hasActivePlan, {
    customerId: "user_test123",
  });
  expect(result).toBe(false);
});

test("handleWebhookEvent creates subscription on plan_assigned", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(api.lib.handleWebhookEvent, {
    eventType: "customer.plan_assigned",
    customerId: "user_test123",
    customerType: "user",
    payload: "{}",
    planId: "plan_pro",
    planName: "Pro",
  });
  const result = await t.query(api.lib.hasActivePlan, {
    customerId: "user_test123",
  });
  expect(result).toBe(true);
});

test("handleWebhookEvent cancels subscription on agreement_cancelled", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(api.lib.handleWebhookEvent, {
    eventType: "customer.plan_assigned",
    customerId: "user_test123",
    customerType: "user",
    payload: "{}",
    planId: "plan_pro",
    planName: "Pro",
  });
  await t.mutation(api.lib.handleWebhookEvent, {
    eventType: "customer.agreement_cancelled",
    customerId: "user_test123",
    customerType: "user",
    payload: "{}",
  });
  const result = await t.query(api.lib.hasActivePlan, {
    customerId: "user_test123",
  });
  expect(result).toBe(false);
});

test("listBillingEvents returns events for customer", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(api.lib.handleWebhookEvent, {
    eventType: "customer.payment_succeeded",
    customerId: "user_test123",
    customerType: "user",
    payload: "{}",
  });
  const events = await t.query(api.lib.listBillingEvents, {
    customerId: "user_test123",
  });
  expect(events.length).toBe(1);
  expect(events[0].eventType).toBe("customer.payment_succeeded");
});
