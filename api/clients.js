const {
  getBootstrapData,
  upsertClient,
  renameClient,
  deleteClient,
} = require("../lib/repository");
const { json, requireUser, handleError } = require("../lib/http");

module.exports = async function handler(req, res) {
  try {
    requireUser(req);

    if (req.method === "POST") {
      await upsertClient(req.body?.client);
    } else if (req.method === "PATCH") {
      await renameClient(req.body?.oldName, req.body?.newName);
    } else if (req.method === "DELETE") {
      const client = req.body?.client || req.query?.client;
      await deleteClient(client);
    } else {
      return json(res, 405, { error: "Metodo nao permitido" });
    }

    const payload = await getBootstrapData();
    return json(res, 200, payload);
  } catch (error) {
    return handleError(res, error);
  }
};
