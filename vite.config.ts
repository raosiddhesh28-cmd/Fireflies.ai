import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: "src/ui",
  build: {
    outDir: "../../dist",
    emptyDir: true,
  },
  server: {
    port: 5173,
    host: "0.0.0.0",
    proxy: {
      "/api/": {
        target: "http://127.0.0.1:3001",
        configure(proxy) {
          proxy.on("error", (err, _req, res) => {
            console.error("[vite-proxy]", err.message);
            if (res && "writeHead" in res && !res.headersSent) {
              res.writeHead(502, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  error:
                    "API server is not running on port 3001. Restart with npm run dev.",
                }),
              );
            }
          });
        },
      },
    },
  },
});
