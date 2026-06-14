// JWT (HS256 via Web Crypto) + helpers for the GuardGuys Worker API.

export interface TokenPayload {
  sub: number; // user id
  username: string;
  isAdmin: boolean;
  exp: number; // unix seconds
}

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

const enc = new TextEncoder();

function base64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlEncodeStr(s: string): string {
  return base64urlEncode(enc.encode(s));
}

function base64urlDecodeToStr(s: string): string {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  return bin;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signToken(
  data: Omit<TokenPayload, "exp">,
  secret: string,
  nowSeconds: number,
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const payload: TokenPayload = { ...data, exp: nowSeconds + TOKEN_TTL_SECONDS };
  const headerB64 = base64urlEncodeStr(JSON.stringify(header));
  const payloadB64 = base64urlEncodeStr(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(signingInput));
  return `${signingInput}.${base64urlEncode(new Uint8Array(sig))}`;
}

export async function verifyToken(
  token: string,
  secret: string,
  nowSeconds: number,
): Promise<TokenPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;
  const signingInput = `${headerB64}.${payloadB64}`;
  const key = await hmacKey(secret);

  let sigBytes: Uint8Array;
  try {
    const bin = base64urlDecodeToStr(sigB64);
    sigBytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }

  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes,
    enc.encode(signingInput),
  );
  if (!ok) return null;

  try {
    const payload = JSON.parse(base64urlDecodeToStr(payloadB64)) as TokenPayload;
    if (typeof payload.exp !== "number" || payload.exp < nowSeconds) return null;
    return payload;
  } catch {
    return null;
  }
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}
