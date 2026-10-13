import { bindings, defineConfig } from "cf/config";

export default defineConfig({
	// Owns the tung.ai.vn zone and the tink D1 database (login has multiple accounts).
	accountId: "15e4d475b7fa039ecf9cae9f9481e48a",
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
