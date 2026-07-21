const { resetExperimentalData, getBootstrapData } = require("../../lib/repository");
const {
  json,
  requireUser,
  requireSharedPassword,
  requireResetConfirmation,
  handleError,
} = require("../../lib/http");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Metodo nao permitido" });
  }

  try {
    const user = requireUser(req);
    requireResetConfirmation(req.body?.confirmPhrase);
    requireSharedPassword(String(req.body?.password ?? ""));
    await resetExperimentalData(user.profile);
    const payload = await getBootstrapData();
    return json(res, 200, payload);
  } catch (error) {
    return handleError(res, error);
  }
};
