import { httpRouter } from "convex/server";
import { components } from "./_generated/api";
import { createWebhookHandler } from "../../src/client/httpHandler.js";

const http = httpRouter();

http.route({
  path: "/webhooks/kinde/billing",
  method: "POST",
  handler: createWebhookHandler(components.convexKindeBilling),
});

export default http;