const { createClient } = require("@supabase/supabase-js");
const { loadEnvFile, requireEnv } = require("./env");

let supabase = null;

function getDb() {
  if (supabase) return supabase;
  loadEnvFile();
  const url = requireEnv("SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return supabase;
}

module.exports = {
  getDb,
};
