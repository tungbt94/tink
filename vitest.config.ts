import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: { ADMIN_USER: "admin", ADMIN_PASS: "test-pass" },
        // Real Static Assets binding is used: `pnpm test` builds web/ first.
      },
    }),
  ],
  test: { setupFiles: ["./test/setup.ts"], fsModuleCache: false },
});
