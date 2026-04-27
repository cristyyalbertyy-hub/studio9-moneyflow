const { createExpense, getBootstrapData } = require("../../lib/repository");
const { json, requireUser, handleError } = require("../../lib/http");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Metodo nao permitido" });
  }

  try {
    const user = requireUser(req);
    await createExpense(req.body || {}, user.profile);
    const payload = await getBootstrapData();
    return json(res, 200, payload);
  } catch (error) {
    return handleError(res, error);
  }
};
