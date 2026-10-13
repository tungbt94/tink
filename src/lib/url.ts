export const MAX_URL_LENGTH = 2048;

export type UrlCheck = { ok: true; url: string } | { ok: false; error: string };

/** Accept only absolute http(s) URLs that do not point back at this service. */
export function validateTarget(input: unknown, selfHost: string): UrlCheck {
  if (typeof input !== "string" || input.trim() === "") {
    return { ok: false, error: "url is required" };
  }
  const raw = input.trim();
  if (raw.length > MAX_URL_LENGTH) {
    return { ok: false, error: `url must be at most ${MAX_URL_LENGTH} characters` };
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, error: "url is not a valid absolute URL" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "only http and https URLs are allowed" };
  }
  if (parsed.host.toLowerCase() === selfHost.toLowerCase()) {
    return { ok: false, error: "url must not point to this service" };
  }
  return { ok: true, url: parsed.toString() };
}
