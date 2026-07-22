const {
  createCharityAllocation,
  createProfitDistribution,
  getBootstrapData,
} = require("../lib/repository");
const { json, requireUser, handleError } = require("../lib/http");

function isProfitDistributionPayload(body) {
  return body?.profitAmount != null && body?.pctCris != null;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Metodo nao permitido" });
  }

  try {
    const user = requireUser(req);
    const body = req.body || {};
    if (isProfitDistributionPayload(body)) {
      await createProfitDistribution(body, user.profile);
    } else {
      await createCharityAllocation(body, user.profile);
    }
    const payload = await getBootstrapData();
    return json(res, 200, payload);
  } catch (error) {
    return handleError(res, error);
  }
};
