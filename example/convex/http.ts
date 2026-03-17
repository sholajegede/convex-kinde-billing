import { httpRouter } from "convex/server";
import { components } from "./_generated/api";
import { KindeBilling } from "../../src/client/index.js";

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