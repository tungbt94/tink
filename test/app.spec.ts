import { env } from "cloudflare:workers";
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import app from "../src";

const BASE = "https://tink.tung.ai.vn";
const AUTH = { Authorization: `Basic ${btoa("admin:test-pass")}` };

// Never follows redirects; waits for ctx.waitUntil work (click counting) before returning.
async function call(path: string, init: RequestInit = {}) {
  const ctx = createExecutionContext();
  const res = await app.request(BASE + path, init, env, ctx);
  await waitOnExecutionContext(ctx);
  return res;
}

const create = (body: unknown, headers: Record<string, string> = {}) =>
  call("/api/links", {
    method: "POST",
    headers: { ...AUTH, "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

describe("auth", () => {
  it("rejects API and admin without credentials, but keeps redirects public", async () => {
    expect((await call("/api/links")).status).toBe(401);
    expect((await call("/admin")).status).toBe(401);
    expect((await call("/api/links", { headers: { Authorization: `Basic ${btoa("admin:wrong")}` } })).status).toBe(401);
    expect((await call("/nope")).status).toBe(404);
  });

  it("serves the admin UI with credentials", async () => {
    const res = await call("/admin", { headers: AUTH });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("<title>tink</title>");
  });
});

describe("create + redirect", () => {
  it("creates a random 7-char code and redirects with 302, counting the click", async () => {
    const res = await create({ url: "https://example.com/a?b=1" });
    expect(res.status).toBe(201);
    const link = (await res.json()) as { code: string; shortUrl: string };
    expect(link.code).toMatch(/^[0-9A-Za-z]{7}$/);
    expect(link.shortUrl).toBe(`${BASE}/${link.code}`);

    const hit = await call(`/${link.code}`);
    expect(hit.status).toBe(302);
    expect(hit.headers.get("Location")).toBe("https://example.com/a?b=1");

    const list = (await (await call("/api/links", { headers: AUTH })).json()) as { clickCount: number }[];
    expect(list[0].clickCount).toBe(1);
  });

  it("supports custom alias and rejects duplicates with 409", async () => {
    expect((await create({ url: "https://example.com", alias: "my-link" })).status).toBe(201);
    expect((await create({ url: "https://other.com", alias: "my-link" })).status).toBe(409);
    const hit = await call("/my-link");
    expect(hit.headers.get("Location")).toBe("https://example.com/");
  });

  it.each(["admin", "API", "a", "has space", "x".repeat(33)])("rejects alias %j", async (alias) => {
    expect((await create({ url: "https://example.com", alias })).status).toBe(400);
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html,hi",
    "ftp://example.com",
    "not a url",
    "",
    `${BASE}/loop`,
    "https://example.com/" + "a".repeat(2100),
  ])("rejects target %j", async (url) => {
    expect((await create({ url })).status).toBe(400);
  });
});

describe("delete", () => {
  it("removes the link so the code 404s", async () => {
    await create({ url: "https://example.com", alias: "gone" });
    expect((await call("/api/links/gone", { method: "DELETE", headers: AUTH })).status).toBe(204);
    expect((await call("/gone")).status).toBe(404);
    expect((await call("/api/links/gone", { method: "DELETE", headers: AUTH })).status).toBe(404);
  });
});

describe("csrf guard", () => {
  it("rejects cross-origin writes and non-JSON posts", async () => {
    expect((await create({ url: "https://example.com" }, { Origin: "https://evil.example" })).status).toBe(403);
    const form = await call("/api/links", {
      method: "POST",
      headers: { ...AUTH, "Content-Type": "text/plain" },
      body: "url=https://example.com",
    });
    expect(form.status).toBe(415);
    const del = await call("/api/links/x", { method: "DELETE", headers: { ...AUTH, Origin: "https://evil.example" } });
    expect(del.status).toBe(403);
    const { results } = await env.DB.prepare("SELECT code FROM links").all();
    expect(results).toHaveLength(0);
  });
});
