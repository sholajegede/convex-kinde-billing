import { defineApp } from "convex/server";
import convexKindeBilling from "../../src/component/convex.config.js";

const app = defineApp();
app.use(convexKindeBilling);

export default app;