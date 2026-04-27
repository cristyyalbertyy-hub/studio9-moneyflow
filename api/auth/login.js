const { issueLogin, json, handleError } = require("../../lib/http");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Metodo nao permitido" });
  }

  try {
    const profile = String(req.body?.profile || "");
    const password = String(req.body?.password ?? req.body?.pin ?? "");
    const session = issueLogin(profile, password);
    return json(res, 200, session);
  } catch (error) {
    return handleError(res, error);
  }
};
