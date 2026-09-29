import { createHmac, timingSafeEqual } from "node:crypto";

const mmsTokenLifetimeMs = 10 * 60 * 1000;
function signature(value: string, secret: string) { return createHmac("sha256", secret).update(value).digest("base64url"); }

export function createMmsContentToken(message: string, secret: string, now = Date.now()) {
  const unsigned = `${now + mmsTokenLifetimeMs}.${Buffer.from(message, "utf8").toString("base64url")}`;
  return `${unsigned}.${signature(unsigned, secret)}`;
}

export function readMmsContentToken(token: string, secret: string, now = Date.now()) {
  const [expiresAt, payload, receivedSignature] = token.split(".");
  if (!expiresAt || !payload || !receivedSignature || Number(expiresAt) < now) return undefined;
  const expected = Buffer.from(signature(`${expiresAt}.${payload}`, secret));
  const received = Buffer.from(receivedSignature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return undefined;
  try { return Buffer.from(payload, "base64url").toString("utf8"); } catch { return undefined; }
}
