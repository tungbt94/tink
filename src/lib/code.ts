const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
// Largest multiple of 62 below 256; bytes >= LIMIT are rejected to avoid modulo bias.
const LIMIT = 248;

export const CODE_LENGTH = 7;

export function generateCode(length = CODE_LENGTH): string {
  let out = "";
  while (out.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(length * 2));
    for (const b of bytes) {
      if (b < LIMIT) {
        out += ALPHABET[b % 62];
        if (out.length === length) break;
      }
    }
  }
  return out;
}

export const CODE_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
export const ALIAS_PATTERN = /^[A-Za-z0-9_-]{3,32}$/;

// Paths owned by the app; looked up lowercased.
export const RESERVED: Record<string, true> = { admin: true, api: true };
