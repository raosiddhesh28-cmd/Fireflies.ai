import { createApp } from "./app.js";
import { loadServerEnv } from "./loadEnv.js";

const loaded = loadServerEnv();
if (loaded.length) {
  console.log(`[server] loaded env from ${loaded.join(", ")}`);
}

const port = Number(process.env.PORT ?? 3001);
const app = createApp();
app.listen(port, "0.0.0.0", () => {
  console.log(`Commitment API on :${port}`);
});
