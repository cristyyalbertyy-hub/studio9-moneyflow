const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

loadEnvFile();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 5500;
const dataFilePath = path.join(__dirname, "data.json");
const profiles = new Set(["Cris", "Alex"]);
const sessionByToken = new Map();

const authDisabled = String(process.env.STUDIO9_AUTH_DISABLED || "").toLowerCase() === "1" || String(process.env.STUDIO9_AUTH_DISABLED || "").toLowerCase() === "true";
const sharedPassword = String(process.env.STUDIO9_PASSWORD || "").trim();

if (authDisabled) {
  console.warn("[MoneyFlow] STUDIO9_AUTH_DISABLED activo — login sem password (apenas para desenvolvimento).");
} else if (!sharedPassword) {
  console.warn(
    "[MoneyFlow] STUDIO9_PASSWORD em falta no .env. Define uma palavra-passe partilhada ate la o login falha."
  );
}

app.use(express.json());
app.use("/public", express.static(path.join(__dirname, "public")));
app.use(express.static(__dirname));

const defaultData = {
  expenses: [],
  incomes: [],
  documents: [],
  categories: ["Papelaria", "Transporte", "Almoco", "Software"],
  activities: [],
};

let db = loadData();
if (!Array.isArray(db.documents)) db.documents = [];

app.post("/api/auth/login", (req, res) => {
  const profile = String(req.body?.profile || "");
  const password = String(req.body?.password ?? req.body?.pin ?? "");
  if (!profiles.has(profile)) {
    return res.status(400).json({ error: "Perfil invalido" });
  }
  if (!authDisabled) {
    if (!sharedPassword) {
      return res.status(503).json({
        error: "Palavra-passe partilhada ainda nao foi configurada no servidor (STUDIO9_PASSWORD).",
      });
    }
    if (!pinMatches(sharedPassword, password)) {
      return res.status(401).json({ error: "Palavra-passe incorrecta." });
    }
  }
  const token = crypto.randomUUID();
  sessionByToken.set(token, { profile });
  return res.json({ token, profile });
});

app.get("/api/bootstrap", authMiddleware, (req, res) => {
  res.json(getPayload());
});

app.post("/api/categories", authMiddleware, (req, res) => {
  const category = String(req.body?.category || "").trim();
  if (!category) return res.status(400).json({ error: "Categoria obrigatoria" });
  const exists = db.categories.some((item) => item.toLowerCase() === category.toLowerCase());
  if (!exists) {
    db.categories.push(category);
    persistAndBroadcast();
  }
  return res.json(getPayload());
});

app.post("/api/expenses", authMiddleware, (req, res) => {
  const person = String(req.body?.person || "").trim();
  const date = String(req.body?.date || "");
  const amount = Number(req.body?.amount || 0);
  const category = String(req.body?.category || "").trim();
  const description = String(req.body?.description || "").trim();
  const paid = Boolean(req.body?.paid);

  if (!profiles.has(person)) return res.status(400).json({ error: "Pessoa invalida" });
  if (!isValidDate(date)) return res.status(400).json({ error: "Data invalida" });
  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: "Valor invalido" });
  if (!category || !description) return res.status(400).json({ error: "Dados incompletos" });

  const expenseId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  db.expenses.unshift({
    id: expenseId,
    person,
    date,
    amount,
    category,
    description,
    paid,
    createdBy: req.user.profile,
    createdAt,
  });

  addActivity({
    type: "expense",
    at: createdAt,
    by: req.user.profile,
    summary: paid
      ? `Despesa registada (ja paga): ${person} — ${formatMoney(amount)} — ${description}`
      : `Nova despesa (por pagar): ${person} — ${formatMoney(amount)} — ${description}`,
    meta: { expenseId, person, amount, category, paid },
  });

  const exists = db.categories.some((item) => item.toLowerCase() === category.toLowerCase());
  if (!exists) db.categories.push(category);
  persistAndBroadcast();
  return res.json(getPayload());
});

app.patch("/api/expenses/:id/toggle", authMiddleware, (req, res) => {
  const target = db.expenses.find((item) => item.id === req.params.id);
  if (!target) return res.status(404).json({ error: "Despesa nao encontrada" });
  const wasPaid = target.paid;
  target.paid = !target.paid;
  const at = new Date().toISOString();
  if (!wasPaid && target.paid) {
    addActivity({
      type: "payment",
      at,
      by: req.user.profile,
      summary: `Reembolso / despesa paga: ${target.person} recebeu ${formatMoney(target.amount)} — ${target.description}`,
      meta: {
        expenseId: target.id,
        person: target.person,
        amount: target.amount,
        category: target.category,
      },
    });
  } else if (wasPaid && !target.paid) {
    addActivity({
      type: "reopen",
      at,
      by: req.user.profile,
      summary: `Despesa voltou a «por pagar»: ${target.person} — ${formatMoney(target.amount)} — ${target.description}`,
      meta: {
        expenseId: target.id,
        person: target.person,
        amount: target.amount,
      },
    });
  }
  persistAndBroadcast();
  return res.json(getPayload());
});

app.post("/api/incomes", authMiddleware, (req, res) => {
  const date = String(req.body?.date || "");
  const amount = Number(req.body?.amount || 0);
  const source = String(req.body?.source || "").trim();

  if (!isValidDate(date)) return res.status(400).json({ error: "Data invalida" });
  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: "Valor invalido" });
  if (!source) return res.status(400).json({ error: "Origem obrigatoria" });

  const incomeId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  db.incomes.unshift({
    id: incomeId,
    date,
    amount,
    source,
    createdBy: req.user.profile,
    createdAt,
  });
  addActivity({
    type: "income",
    at: createdAt,
    by: req.user.profile,
    summary: `Entrada de dinheiro: ${formatMoney(amount)} — ${source}`,
    meta: { incomeId, amount, source },
  });
  persistAndBroadcast();
  return res.json(getPayload());
});

app.post("/api/documents", authMiddleware, (req, res) => {
  const label = String(req.body?.label || "").trim();
  const amount = Number(req.body?.amount || 0);
  const date = String(req.body?.date || "");

  if (!label) return res.status(400).json({ error: "Descricao obrigatoria" });
  if (!isValidDate(date)) return res.status(400).json({ error: "Data invalida" });
  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: "Valor invalido" });

  const docId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  db.documents.unshift({
    id: docId,
    label,
    amount,
    date,
    paid: false,
    createdBy: req.user.profile,
    createdAt,
  });

  addActivity({
    type: "document",
    at: createdAt,
    by: req.user.profile,
    summary: `Documento por pagar: ${formatMoney(amount)} — ${label}`,
    meta: { documentId: docId, amount },
  });

  persistAndBroadcast();
  return res.json(getPayload());
});

app.patch("/api/documents/:id/toggle-paid", authMiddleware, (req, res) => {
  const target = db.documents.find((item) => item.id === req.params.id);
  if (!target) return res.status(404).json({ error: "Documento nao encontrado" });
  const wasPaid = target.paid;
  target.paid = !target.paid;
  const at = new Date().toISOString();
  if (!wasPaid && target.paid) {
    addActivity({
      type: "document_paid",
      at,
      by: req.user.profile,
      summary: `Pagamento processado (documento): ${formatMoney(target.amount)} — ${target.label}`,
      meta: { documentId: target.id, amount: target.amount },
    });
  } else if (wasPaid && !target.paid) {
    addActivity({
      type: "document_reopen",
      at,
      by: req.user.profile,
      summary: `Documento voltou a «por pagar»: ${formatMoney(target.amount)} — ${target.label}`,
      meta: { documentId: target.id, amount: target.amount },
    });
  }
  persistAndBroadcast();
  return res.json(getPayload());
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  const user = token ? sessionByToken.get(token) : null;
  if (!user) return next(new Error("unauthorized"));
  socket.user = user;
  return next();
});

io.on("connection", (socket) => {
  socket.emit("data:update", getPayload());
});

server.listen(PORT, () => {
  console.log(`Studio9 MoneyFlow backend em http://localhost:${PORT}`);
});

function authMiddleware(req, res, next) {
  const header = String(req.headers.authorization || "");
  if (!header.startsWith("Bearer ")) return res.status(401).json({ error: "Sem token" });
  const token = header.slice(7);
  const user = sessionByToken.get(token);
  if (!user) return res.status(401).json({ error: "Token invalido" });
  req.user = user;
  return next();
}

function getPayload() {
  return {
    expenses: db.expenses,
    incomes: db.incomes,
    documents: db.documents,
    categories: db.categories,
    activities: db.activities,
  };
}

function persistAndBroadcast() {
  saveData(db);
  io.emit("data:update", getPayload());
}

function loadData() {
  try {
    if (!fs.existsSync(dataFilePath)) {
      fs.writeFileSync(dataFilePath, JSON.stringify(defaultData, null, 2), "utf8");
      return { ...defaultData };
    }
    const raw = fs.readFileSync(dataFilePath, "utf8");
    const parsed = JSON.parse(raw);
    return {
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
      incomes: Array.isArray(parsed.incomes) ? parsed.incomes : [],
      documents: Array.isArray(parsed.documents) ? parsed.documents : [],
      categories:
        Array.isArray(parsed.categories) && parsed.categories.length > 0
          ? parsed.categories
          : [...defaultData.categories],
      activities: Array.isArray(parsed.activities) ? parsed.activities : [],
    };
  } catch {
    return { ...defaultData };
  }
}

function saveData(nextData) {
  fs.writeFileSync(dataFilePath, JSON.stringify(nextData, null, 2), "utf8");
}

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

const MAX_ACTIVITIES = 500;

function addActivity(entry) {
  if (!Array.isArray(db.activities)) db.activities = [];
  db.activities.unshift({
    id: crypto.randomUUID(),
    ...entry,
  });
  if (db.activities.length > MAX_ACTIVITIES) {
    db.activities.length = MAX_ACTIVITIES;
  }
}

function formatMoney(amount) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(Number(amount) || 0);
}

function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key && process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

function pinMatches(expectedPlain, receivedPlain) {
  const a = hashPin(expectedPlain);
  const b = hashPin(String(receivedPlain));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function hashPin(value) {
  return crypto.createHash("sha256").update(String(value), "utf8").digest();
}
