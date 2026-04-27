const { toggleExpensePaid, getBootstrapData } = require("../../../lib/repository");
const { json, requireUser, handleError } = require("../../../lib/http");

module.exports = async function handler(req, res) {
  if (req.method !== "PATCH") {
    return json(res, 405, { error: "Metodo nao permitido" });
  }

  try {
    const user = requireUser(req);
    const id = String(req.query?.id || "");
    await toggleExpensePaid(id, user.profile);
    const payload = await getBootstrapData();
    return json(res, 200, payload);
  } catch (error) {
    return handleError(res, error);
  }
};
