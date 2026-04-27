const { getBootstrapData, upsertCategory } = require("../lib/repository");
const { json, requireUser, handleError } = require("../lib/http");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Metodo nao permitido" });
  }

  try {
    requireUser(req);
    await upsertCategory(req.body?.category);
    const payload = await getBootstrapData();
    return json(res, 200, payload);
  } catch (error) {
    return handleError(res, error);
  }
};
