import { expect, test } from "vitest";
import { KindeBilling } from "./index.js";

test("KindeBilling class can be instantiated", () => {
  const mockComponent = {} as any;
  const billing = new KindeBilling(mockComponent);
  expect(billing).toBeDefined();
});
