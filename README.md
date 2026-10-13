# tink

Personal URL shortener on Cloudflare (Workers + D1 + Static Assets), live at `https://tink.tung.ai.vn`.

- `GET /:code` public, 302 redirect, counts clicks
- `/admin` Astro UI (`web/`), `/api/*` JSON API: both behind HTTP Basic Auth (Worker secrets)
- Stack: Hono, D1, Astro (static), pnpm, Vitest (`@cloudflare/vitest-plugin`), deployed with the `cf` CLI
- Config lives in `cloudflare.config.ts`; `web/` is a separate pnpm project (so `cf` does not mistake the root for an Astro app)

## Local dev

```sh
pnpm install                      # also installs web/ (postinstall)
cp .dev.vars.example .dev.vars    # set ADMIN_USER / ADMIN_PASS
pnpm dev                          # builds web/ then cf dev
pnpm test                         # builds web/ then runs vitest in workerd
pnpm typecheck
```

## Deploy

The zone `tung.ai.vn` is in a multi-account login, so pick the account explicitly:

```sh
export CLOUDFLARE_ACCOUNT_ID=<account that owns tung.ai.vn>
pnpm run deploy                                  # build web/, upload Worker, attach tink.tung.ai.vn
# change credentials: put ADMIN_USER / ADMIN_PASS in .secrets.prod (gitignored), then
pnpm run deploy -- --secrets-file .secrets.prod
# new D1 migration: add migrations/NNNN_*.sql, then
cf d1 migrations apply <DATABASE_ID> --dir migrations   # id: cf d1 list --name tink
```

The D1 database `tink` was auto-provisioned on first deploy; no id is needed in the config.

Recommended: Cloudflare WAF rate-limiting rule on `/admin` and `/api` to slow Basic Auth brute force.
