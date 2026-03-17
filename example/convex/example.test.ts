import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "../../src/component/schema.js";

const modules = import.meta.glob("./**/*.ts");
const componentModules = import.meta.glob("../../src/component/**/*.ts");

function initConvexTest() {
  const t = convexTest(schema, modules);
  t.registerComponent("convexKindeBilling", schema, componentModules);
  return t;
}

test("hasActivePlan returns false for unknown customer", async () => {
  const t = initConvexTest();
  const result = await t.query(api.example.hasActivePlan, {
    customerId: "user_test123",
  });
  expect(result).toBe(false);
});

test("getSubscription returns null for unknown customer", async () => {
  const t = initConvexTest();
  const result = await t.query(api.example.getSubscription, {
    customerId: "user_test123",
  });
  expect(result).toBe(null);
});
