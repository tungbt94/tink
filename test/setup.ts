import { env } from "cloudflare:workers";
import { beforeEach } from "vitest";
import migration from "../migrations/0001_init.sql?raw";

// D1 exec() requires one statement per line.
const statements = migration
  .split(";")
  .map((s) => s.replace(/\s+/g, " ").trim())
  .filter(Boolean);

beforeEach(async () => {
  await env.DB.exec("DROP TABLE IF EXISTS links");
  for (const sql of statements) await env.DB.exec(sql);
});
