import { createRequire } from "node:module";
import { createApp } from "./app.js";

try {
  createRequire(import.meta.url)("dotenv/config");
} catch (err) {
  console.warn(
    "[server] dotenv not loaded; set ANTHROPIC_API_KEY in the environment.",
    err instanceof Error ? err.message : err,
  );
}

const port = Number(process.env.PORT ?? 3001);
const app = createApp();
app.listen(port, "0.0.0.0", () => {
  console.log(`Commitment API on :${port}`);
});
