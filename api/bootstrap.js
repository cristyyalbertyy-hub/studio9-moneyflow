const { getDb } = require("../lib/db");
const { getBootstrapData } = require("../lib/repository");
const { json, requireUser, handleError } = require("../lib/http");

async function handleKeepalive(req, res) {
  const secret = String(process.env.KEEPALIVE_SECRET || "").trim();
  if (!secret) {
    return json(res, 503, { error: "Keepalive nao configurado (KEEPALIVE_SECRET)." });
  }

  const provided =
    String(req.query?.secret || "").trim() ||
    String(req.headers["x-keepalive-secret"] || "").trim();

  if (provided !== secret) {
    return json(res, 401, { error: "Secret invalido" });
  }

  const db = getDb();
  const result = await db.from("categories").select("name").limit(1);
  if (result.error) throw result.error;

  return json(res, 200, {
    ok: true,
    at: new Date().toISOString(),
    categories: (result.data || []).length,
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return json(res, 405, { error: "Metodo nao permitido" });
  }

  try {
    if (String(req.query?.keepalive || "").trim() === "1") {
      return handleKeepalive(req, res);
    }

    requireUser(req);
    const payload = await getBootstrapData();
    return json(res, 200, payload);
  } catch (error) {
    return handleError(res, error);
  }
};
