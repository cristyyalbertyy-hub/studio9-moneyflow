const {
  getBootstrapData,
  upsertCategory,
  renameCategory,
  deleteCategory,
} = require("../lib/repository");
const { json, requireUser, handleError } = require("../lib/http");

module.exports = async function handler(req, res) {
  try {
    requireUser(req);

    if (req.method === "POST") {
      await upsertCategory(req.body?.category);
    } else if (req.method === "PATCH") {
      await renameCategory(req.body?.oldName, req.body?.newName);
    } else if (req.method === "DELETE") {
      const category = req.body?.category || req.query?.category;
      await deleteCategory(category);
    } else {
      return json(res, 405, { error: "Metodo nao permitido" });
    }

    const payload = await getBootstrapData();
    return json(res, 200, payload);
  } catch (error) {
    return handleError(res, error);
  }
};
