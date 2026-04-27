const { loadEnvFile, requireEnv } = require("./env");
const { createSessionToken, passwordMatches, verifyToken } = require("./auth");

const PROFILES = new Set(["Cris", "Alex"]);

function json(res, status, body) {
  res.status(status).json(body);
}

function getAuthConfig() {
  loadEnvFile();
  const authDisabled =
    String(process.env.STUDIO9_AUTH_DISABLED || "").toLowerCase() === "1" ||
    String(process.env.STUDIO9_AUTH_DISABLED || "").toLowerCase() === "true";
  const password = String(process.env.STUDIO9_PASSWORD || "").trim();
  const jwtSecret = requireEnv("JWT_SECRET");
  return { authDisabled, password, jwtSecret };
}

function issueLogin(profile, password) {
  if (!PROFILES.has(profile)) {
    const err = new Error("Perfil invalido");
    err.status = 400;
    throw err;
  }

  const { authDisabled, password: sharedPassword, jwtSecret } = getAuthConfig();
  if (!authDisabled) {
    if (!sharedPassword) {
      const err = new Error("Palavra-passe partilhada em falta (STUDIO9_PASSWORD).");
      err.status = 503;
      throw err;
    }
    if (!passwordMatches(sharedPassword, password || "")) {
      const err = new Error("Palavra-passe incorrecta.");
      err.status = 401;
      throw err;
    }
  }

  const token = createSessionToken(profile, jwtSecret);
  return { token, profile };
}

function readBearerToken(req) {
  const header = String(req.headers.authorization || "");
  if (!header.startsWith("Bearer ")) return null;
  return header.slice(7).trim();
}

function requireUser(req) {
  const token = readBearerToken(req);
  if (!token) {
    const err = new Error("Sem token");
    err.status = 401;
    throw err;
  }
  const { jwtSecret } = getAuthConfig();
  const session = verifyToken(token, jwtSecret);
  if (!session?.profile || !PROFILES.has(session.profile)) {
    const err = new Error("Token invalido");
    err.status = 401;
    throw err;
  }
  return { profile: session.profile };
}

function handleError(res, error) {
  const status = Number(error?.status || 400);
  return json(res, status, { error: error?.message || "Erro" });
}

module.exports = {
  json,
  issueLogin,
  requireUser,
  handleError,
};
