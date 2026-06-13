import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load VITE_* (and the proxy target) from .env files for this mode.
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.VITE_FLOWABLE_API_URL || "http://localhost:8090";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      // Dev-only proxy: forward /flowable-api/* to the Flowable backend so the
      // browser never makes a cross-origin request in development (avoids CORS).
      // In src/lib/flowableClient.ts set the base path to "/flowable-api" when
      // VITE_USE_DEV_PROXY=true. Remove or adjust per deployment.
      proxy: {
        "/flowable-api": {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/flowable-api/, ""),
        },
      },
    },
  };
});
