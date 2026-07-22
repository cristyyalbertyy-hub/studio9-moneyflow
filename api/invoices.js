const { uploadExpenseInvoice, getExpenseInvoiceDownloadUrl } = require("../lib/invoices");
const { getBootstrapData } = require("../lib/repository");
const { json, requireUser, handleError } = require("../lib/http");

module.exports = async function handler(req, res) {
  try {
    const user = requireUser(req);

    if (req.method === "GET") {
      const invoiceId = String(req.query?.id || "").trim();
      if (!invoiceId) {
        return json(res, 400, { error: "Fatura invalida" });
      }
      const payload = await getExpenseInvoiceDownloadUrl(invoiceId);
      return json(res, 200, payload);
    }

    if (req.method === "POST") {
      const body = req.body || {};
      const action = String(body.action || "upload").trim().toLowerCase();
      if (action !== "upload") {
        return json(res, 400, { error: "Accao invalida" });
      }
      await uploadExpenseInvoice(body, user.profile);
      const payload = await getBootstrapData();
      return json(res, 200, payload);
    }

    return json(res, 405, { error: "Metodo nao permitido" });
  } catch (error) {
    return handleError(res, error);
  }
};
