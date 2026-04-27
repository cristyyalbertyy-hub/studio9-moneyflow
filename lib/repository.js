const crypto = require("crypto");
const { getDb } = require("./db");

const DEFAULT_CATEGORIES = ["Papelaria", "Transporte", "Almoco", "Software"];
const MAX_ACTIVITIES = 500;

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function formatMoney(amount) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(Number(amount) || 0);
}

async function getBootstrapData() {
  const db = getDb();

  const [expensesRes, incomesRes, documentsRes, categoriesRes, activitiesRes] = await Promise.all([
    db.from("expenses").select("*").order("created_at", { ascending: false }),
    db.from("incomes").select("*").order("created_at", { ascending: false }),
    db.from("documents").select("*").order("created_at", { ascending: false }),
    db.from("categories").select("*").order("name", { ascending: true }),
    db.from("activities").select("*").order("at", { ascending: false }).limit(MAX_ACTIVITIES),
  ]);

  throwIfError(expensesRes.error);
  throwIfError(incomesRes.error);
  throwIfError(documentsRes.error);
  throwIfError(categoriesRes.error);
  throwIfError(activitiesRes.error);

  const categories = normalizeCategories(categoriesRes.data || []);
  if (categories.length === 0) {
    for (const name of DEFAULT_CATEGORIES) {
      await upsertCategory(name);
    }
    categories.push(...DEFAULT_CATEGORIES);
  }

  return {
    expenses: mapExpenses(expensesRes.data || []),
    incomes: mapIncomes(incomesRes.data || []),
    documents: mapDocuments(documentsRes.data || []),
    categories,
    activities: mapActivities(activitiesRes.data || []),
  };
}

async function createExpense(payload, actorProfile) {
  const db = getDb();
  const person = String(payload.person || "").trim();
  const date = String(payload.date || "");
  const amount = Number(payload.amount || 0);
  const category = String(payload.category || "").trim();
  const description = String(payload.description || "").trim();
  const paid = Boolean(payload.paid);

  if (!["Cris", "Alex"].includes(person)) throw new Error("Pessoa invalida");
  if (!isValidDate(date)) throw new Error("Data invalida");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Valor invalido");
  if (!category || !description) throw new Error("Dados incompletos");

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const insertRes = await db.from("expenses").insert({
    id,
    person,
    date,
    amount,
    category,
    description,
    paid,
    created_by: actorProfile,
    created_at: createdAt,
  });
  throwIfError(insertRes.error);

  await upsertCategory(category);
  await addActivity({
    type: "expense",
    at: createdAt,
    by: actorProfile,
    summary: paid
      ? `Despesa registada (ja paga): ${person} — ${formatMoney(amount)} — ${description}`
      : `Nova despesa (por pagar): ${person} — ${formatMoney(amount)} — ${description}`,
    meta: { expenseId: id, person, amount, category, paid },
  });
}

async function toggleExpensePaid(id, actorProfile) {
  const db = getDb();
  const existing = await db.from("expenses").select("*").eq("id", id).maybeSingle();
  throwIfError(existing.error);
  if (!existing.data) throw new Error("Despesa nao encontrada");

  const target = existing.data;
  const nextPaid = !target.paid;
  const updateRes = await db.from("expenses").update({ paid: nextPaid }).eq("id", id);
  throwIfError(updateRes.error);

  const at = new Date().toISOString();
  if (!target.paid && nextPaid) {
    await addActivity({
      type: "payment",
      at,
      by: actorProfile,
      summary: `Reembolso / despesa paga: ${target.person} recebeu ${formatMoney(target.amount)} — ${target.description}`,
      meta: { expenseId: target.id, person: target.person, amount: target.amount, category: target.category },
    });
  } else if (target.paid && !nextPaid) {
    await addActivity({
      type: "reopen",
      at,
      by: actorProfile,
      summary: `Despesa voltou a «por pagar»: ${target.person} — ${formatMoney(target.amount)} — ${target.description}`,
      meta: { expenseId: target.id, person: target.person, amount: target.amount },
    });
  }
}

async function createIncome(payload, actorProfile) {
  const db = getDb();
  const date = String(payload.date || "");
  const amount = Number(payload.amount || 0);
  const source = String(payload.source || "").trim();

  if (!isValidDate(date)) throw new Error("Data invalida");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Valor invalido");
  if (!source) throw new Error("Origem obrigatoria");

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const insertRes = await db.from("incomes").insert({
    id,
    date,
    amount,
    source,
    created_by: actorProfile,
    created_at: createdAt,
  });
  throwIfError(insertRes.error);

  await addActivity({
    type: "income",
    at: createdAt,
    by: actorProfile,
    summary: `Entrada de dinheiro: ${formatMoney(amount)} — ${source}`,
    meta: { incomeId: id, amount, source },
  });
}

async function upsertCategory(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) throw new Error("Categoria obrigatoria");
  const db = getDb();
  const res = await db
    .from("categories")
    .upsert({ name: trimmed }, { onConflict: "name", ignoreDuplicates: true });
  throwIfError(res.error);
}

async function createDocument(payload, actorProfile) {
  const db = getDb();
  const label = String(payload.label || "").trim();
  const amount = Number(payload.amount || 0);
  const date = String(payload.date || "");

  if (!label) throw new Error("Descricao obrigatoria");
  if (!isValidDate(date)) throw new Error("Data invalida");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Valor invalido");

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const res = await db.from("documents").insert({
    id,
    label,
    amount,
    date,
    paid: false,
    created_by: actorProfile,
    created_at: createdAt,
  });
  throwIfError(res.error);

  await addActivity({
    type: "document",
    at: createdAt,
    by: actorProfile,
    summary: `Documento por pagar: ${formatMoney(amount)} — ${label}`,
    meta: { documentId: id, amount },
  });
}

async function toggleDocumentPaid(id, actorProfile) {
  const db = getDb();
  const existing = await db.from("documents").select("*").eq("id", id).maybeSingle();
  throwIfError(existing.error);
  if (!existing.data) throw new Error("Documento nao encontrado");
  const target = existing.data;
  const nextPaid = !target.paid;
  const updateRes = await db.from("documents").update({ paid: nextPaid }).eq("id", id);
  throwIfError(updateRes.error);

  const at = new Date().toISOString();
  if (!target.paid && nextPaid) {
    await addActivity({
      type: "document_paid",
      at,
      by: actorProfile,
      summary: `Pagamento processado (documento): ${formatMoney(target.amount)} — ${target.label}`,
      meta: { documentId: target.id, amount: target.amount },
    });
  } else if (target.paid && !nextPaid) {
    await addActivity({
      type: "document_reopen",
      at,
      by: actorProfile,
      summary: `Documento voltou a «por pagar»: ${formatMoney(target.amount)} — ${target.label}`,
      meta: { documentId: target.id, amount: target.amount },
    });
  }
}

async function addActivity(entry) {
  const db = getDb();
  const res = await db.from("activities").insert({
    id: crypto.randomUUID(),
    type: entry.type,
    at: entry.at,
    by: entry.by,
    summary: entry.summary,
    meta: entry.meta || {},
  });
  throwIfError(res.error);

  const countRes = await db.from("activities").select("id", { count: "exact", head: true });
  throwIfError(countRes.error);
  const total = Number(countRes.count || 0);
  if (total <= MAX_ACTIVITIES) return;

  const extra = total - MAX_ACTIVITIES;
  const oldRes = await db
    .from("activities")
    .select("id")
    .order("at", { ascending: true })
    .limit(extra);
  throwIfError(oldRes.error);
  if (!oldRes.data || oldRes.data.length === 0) return;
  const ids = oldRes.data.map((row) => row.id);
  const deleteRes = await db.from("activities").delete().in("id", ids);
  throwIfError(deleteRes.error);
}

function mapExpenses(rows) {
  return rows.map((row) => ({
    id: row.id,
    person: row.person,
    date: row.date,
    amount: Number(row.amount || 0),
    category: row.category,
    description: row.description,
    paid: Boolean(row.paid),
    createdBy: row.created_by || "",
    createdAt: row.created_at || "",
  }));
}

function mapIncomes(rows) {
  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    amount: Number(row.amount || 0),
    source: row.source,
    createdBy: row.created_by || "",
    createdAt: row.created_at || "",
  }));
}

function mapDocuments(rows) {
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    amount: Number(row.amount || 0),
    date: row.date,
    paid: Boolean(row.paid),
    createdBy: row.created_by || "",
    createdAt: row.created_at || "",
  }));
}

function mapActivities(rows) {
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    at: row.at,
    by: row.by,
    summary: row.summary,
    meta: row.meta || {},
  }));
}

function normalizeCategories(rows) {
  return rows
    .map((item) => String(item.name || "").trim())
    .filter((value) => value.length > 0);
}

function throwIfError(error) {
  if (error) {
    throw new Error(error.message || "Erro de base de dados");
  }
}

module.exports = {
  getBootstrapData,
  createExpense,
  toggleExpensePaid,
  createIncome,
  upsertCategory,
  createDocument,
  toggleDocumentPaid,
};
