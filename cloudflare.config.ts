import { bindings, defineConfig } from "cf/config";

export default defineConfig({
	worker: {
		name: "tink",
		compatibilityDate: "2026-10-01",
		entrypoint: "src/index.ts",
		observability: { enabled: true },
		assets: { runWorkerFirst: true },
		domains: ["tink.tung.ai.vn"],
		env: {
			DB: bindings.d1({ name: "tink" }),
			ASSETS: bindings.assets(),
			ADMIN_USER: bindings.secret(),
			ADMIN_PASS: bindings.secret(),
		},
	},
});
