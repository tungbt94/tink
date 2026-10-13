import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      miniflare: {
        compatibilityDate: "2026-10-01",
        bindings: { ADMIN_USER: "admin", ADMIN_PASS: "test-pass" },
        d1Databases: ["DB"],
        // Real Static Assets: `pnpm test` builds web/ first.
        assets: { directory: "./web/dist", binding: "ASSETS" },
      },
    }),
  ],
  test: { setupFiles: ["./test/setup.ts"], fsModuleCache: false },
});
