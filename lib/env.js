const fs = require("fs");
const path = require("path");

let loaded = false;

function loadEnvFile() {
  if (loaded) return;
  loaded = true;

  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIdx = trimmed.indexOf("=");
    if (separatorIdx === -1) continue;

    const key = trimmed.slice(0, separatorIdx).trim();
    let value = trimmed.slice(separatorIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function requireEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) {
    throw new Error(`Variavel obrigatoria em falta: ${name}`);
  }
  return value;
}

module.exports = {
  loadEnvFile,
  requireEnv,
};
