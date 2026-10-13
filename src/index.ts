import { Hono } from "hono";
import { basicAuth } from "hono/basic-auth";
import { createMiddleware } from "hono/factory";
import { ALIAS_PATTERN, CODE_PATTERN, RESERVED, generateCode } from "./lib/code";
import { validateTarget } from "./lib/url";

type LinkRow = {
  code: string;
  url: string;
  created_at: number;
  click_count: number;
  last_click_at: number | null;
};

const MAX_GENERATE_ATTEMPTS = 5;
const LIST_LIMIT = 500;

const app = new Hono<{ Bindings: Env }>();

// Credentials come from Worker secrets; fail closed when they are not configured.
const auth = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const { ADMIN_USER: username, ADMIN_PASS: password } = c.env;
  if (!username || !password) {
    return c.text("Server auth is not configured", 500);
  }
  return basicAuth({ username, password })(c, next);
});

// Browsers attach Basic credentials to cross-site requests automatically, so
// state-changing API calls must come from our own origin and carry JSON.
const sameOriginJson = createMiddleware(async (c, next) => {
  if (c.req.method === "GET" || c.req.method === "HEAD") return next();
  const origin = c.req.header("Origin");
  if (origin && origin !== new URL(c.req.url).origin) {
    return c.json({ error: "cross-origin request rejected" }, 403);
  }
  if (c.req.method === "POST" && !c.req.header("Content-Type")?.includes("application/json")) {
    return c.json({ error: "content-type must be application/json" }, 415);
  }
  return next();
});

app.get("/", (c) => c.redirect("/admin", 302));

app.use("/admin", auth);
app.use("/admin/*", auth);
app.get("/admin", (c) => c.env.ASSETS.fetch(c.req.raw));
app.get("/admin/*", (c) => c.env.ASSETS.fetch(c.req.raw));

app.use("/api/*", auth, sameOriginJson);

app.get("/api/links", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT code, url, created_at, click_count, last_click_at FROM links ORDER BY created_at DESC LIMIT ?",
  )
    .bind(LIST_LIMIT)
    .all<LinkRow>();
  const origin = new URL(c.req.url).origin;
  return c.json(results.map((row) => toDto(row, origin)));
});

app.post("/api/links", async (c) => {
  const body = await c.req.json<{ url?: unknown; alias?: unknown }>().catch(() => null);
  if (!body || typeof body !== "object") {
    return c.json({ error: "invalid JSON body" }, 400);
  }

  const target = validateTarget(body.url, new URL(c.req.url).host);
  if (!target.ok) return c.json({ error: target.error }, 400);

  const alias = typeof body.alias === "string" ? body.alias.trim() : "";
  if (alias && !ALIAS_PATTERN.test(alias)) {
    return c.json({ error: "alias must be 3-32 characters of A-Z a-z 0-9 _ -" }, 400);
  }
  if (alias && RESERVED[alias.toLowerCase()]) {
    return c.json({ error: "alias is reserved" }, 400);
  }

  const createdAt = Date.now();
  const insert = c.env.DB.prepare(
    "INSERT INTO links (code, url, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING",
  );

  const attempts = alias ? 1 : MAX_GENERATE_ATTEMPTS;
  for (let i = 0; i < attempts; i++) {
    const code = alias || generateCode();
    const { meta } = await insert.bind(code, target.url, createdAt).run();
    if (meta.changes === 1) {
      const row: LinkRow = {
        code,
        url: target.url,
        created_at: createdAt,
        click_count: 0,
        last_click_at: null,
      };
      return c.json(toDto(row, new URL(c.req.url).origin), 201);
    }
  }
  return alias
    ? c.json({ error: "alias already exists" }, 409)
    : c.json({ error: "could not allocate a unique code, try again" }, 503);
});

app.delete("/api/links/:code", async (c) => {
  const { meta } = await c.env.DB.prepare("DELETE FROM links WHERE code = ?")
    .bind(c.req.param("code"))
    .run();
  return meta.changes === 0 ? c.json({ error: "not found" }, 404) : c.body(null, 204);
});

app.get("/:code", async (c) => {
  const code = c.req.param("code");
  if (!CODE_PATTERN.test(code)) return c.notFound();

  const row = await c.env.DB.prepare("SELECT url FROM links WHERE code = ?")
    .bind(code)
    .first<{ url: string }>();
  if (!row) return c.notFound();

  c.executionCtx.waitUntil(
    c.env.DB.prepare("UPDATE links SET click_count = click_count + 1, last_click_at = ? WHERE code = ?")
      .bind(Date.now(), code)
      .run(),
  );
  // 302 (not 301): browsers must not cache it, so edits/deletes take effect and clicks count.
  return c.redirect(row.url, 302);
});

function toDto(row: LinkRow, origin: string) {
  return {
    code: row.code,
    url: row.url,
    shortUrl: `${origin}/${row.code}`,
    createdAt: row.created_at,
    clickCount: row.click_count,
    lastClickAt: row.last_click_at,
  };
}

export default app;
