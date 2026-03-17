import { describe, it } from "vitest";
import { KindeBilling } from "./index.js";

const mockComponent = {
  lib: {
    getSubscription: {} as never,
    hasActivePlan: {} as never,
    getActivePlan: {} as never,
    hasFeature: {} as never,
    listBillingEvents: {} as never,
    getUsage: {} as never,
    handleWebhookEvent: {} as never,
  },
} as never;

describe("KindeBilling", () => {
  it("instantiates with options", () => {
    new KindeBilling(mockComponent, {
      KINDE_ISSUER_URL: "https://example.kinde.com",
    });
  });
});
