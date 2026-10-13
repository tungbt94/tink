# tink

Personal URL shortener on Cloudflare (Workers + D1 + Static Assets), served at `tink.tung.ai.vn`.

- `GET /:code` public, 302 redirect, counts clicks
- `/admin` Astro UI, `/api/*` JSON API: both behind HTTP Basic Auth (Worker secrets)
- Stack: Hono, D1, Astro (static, `web/`), pnpm, Vitest (`@cloudflare/vitest-plugin`)

## Local dev

```sh
pnpm install
cp .dev.vars.example .dev.vars   # set ADMIN_USER / ADMIN_PASS
pnpm db:migrate:local
pnpm dev                         # builds web/ then wrangler dev
pnpm test                        # builds web/ then runs vitest in workerd
```

## First deploy (one time)

```sh
pnpm exec wrangler login
pnpm exec wrangler d1 create tink            # paste database_id into wrangler.jsonc d1_databases[0]
pnpm db:migrate:remote
pnpm exec wrangler secret put ADMIN_USER
pnpm exec wrangler secret put ADMIN_PASS     # use a long random value: openssl rand -base64 24
pnpm deploy                                  # also attaches the tink.tung.ai.vn custom domain
```

Later deploys: `pnpm deploy`. New migrations: add `migrations/NNNN_*.sql`, then `pnpm db:migrate:remote`.

Recommended: Cloudflare WAF rate-limiting rule on `/admin` and `/api` to slow Basic Auth brute force.
