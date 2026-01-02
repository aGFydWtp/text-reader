import { createHash, randomBytes } from "crypto";

function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function generateCodeVerifier(length = 64): string {
  const bytes = randomBytes(length);
  return base64UrlEncode(bytes).slice(0, 128);
}

export function generateCodeChallenge(verifier: string): string {
  const hash = createHash("sha256").update(verifier).digest();
  return base64UrlEncode(hash);
}

export function generateState(length = 32): string {
  const bytes = randomBytes(length);
  return base64UrlEncode(bytes);
}
