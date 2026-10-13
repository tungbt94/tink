import { defineConfig } from "astro/config";

// Static build served by the Worker (Static Assets) behind Basic Auth at /admin.
export default defineConfig({
  output: "static",
  build: { inlineStylesheets: "always" },
});
