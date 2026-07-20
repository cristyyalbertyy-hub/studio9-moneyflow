const { getDb } = require("../lib/db");
const { json, handleError } = require("../lib/http");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return json(res, 405, { error: "Metodo nao permitido" });
  }

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

  try {
    const db = getDb();
    const result = await db.from("categories").select("name").limit(1);
    if (result.error) throw result.error;

    return json(res, 200, {
      ok: true,
      at: new Date().toISOString(),
      categories: (result.data || []).length,
    });
  } catch (error) {
    return handleError(res, error);
  }
};
