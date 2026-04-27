const crypto = require("crypto");

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30;

function base64UrlEncode(input) {
  return Buffer.from(input).toString("base64url");
}

function base64UrlDecode(input) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function signPayload(payload, secret) {
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function verifyToken(token, secret) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64url");

  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSignature);
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;

  const payload = JSON.parse(base64UrlDecode(body));
  if (!payload?.profile || !payload?.exp || Date.now() > Number(payload.exp)) return null;
  return payload;
}

function createSessionToken(profile, secret) {
  const now = Date.now();
  return signPayload(
    {
      profile,
      iat: now,
      exp: now + TOKEN_TTL_MS,
    },
    secret
  );
}

function passwordMatches(expectedPlain, receivedPlain) {
  const a = hashPassword(expectedPlain);
  const b = hashPassword(String(receivedPlain));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function hashPassword(value) {
  return crypto.createHash("sha256").update(String(value), "utf8").digest();
}

module.exports = {
  createSessionToken,
  verifyToken,
  passwordMatches,
};
