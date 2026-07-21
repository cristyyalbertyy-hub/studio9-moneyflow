const crypto = require("crypto");
const { getDb } = require("./db");

const PAYER_OPTIONS = new Set(["Cris", "Alex", "Studio9"]);

function resolveExpensePayer(row) {
  const payer = String(row?.payer || "").trim();
  if (PAYER_OPTIONS.has(payer)) return payer;
  const person = String(row?.person || "").trim();
  return person === "Alex" ? "Alex" : "Cris";
}

function isReimbursementPayer(payer) {
  return payer === "Cris" || payer === "Alex";
}
const DEFAULT_CATEGORIES = ["Papelaria", "Transporte", "Almoco", "Software"];
const DEFAULT_CLIENTS = ["Lemon Squeezy"];
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

  const [expensesRes, incomesRes, documentsRes, categoriesRes, clientsRes, activitiesRes] = await Promise.all([
    db.from("expenses").select("*").order("created_at", { ascending: false }),
    db.from("incomes").select("*").order("created_at", { ascending: false }),
    db.from("documents").select("*").order("created_at", { ascending: false }),
    db.from("categories").select("*").order("name", { ascending: true }),
    db.from("clients").select("*").order("name", { ascending: true }),
    db.from("activities").select("*").order("at", { ascending: false }).limit(MAX_ACTIVITIES),
  ]);

  throwIfError(expensesRes.error);
  throwIfError(incomesRes.error);
  throwIfError(documentsRes.error);
  throwIfError(categoriesRes.error);
  if (clientsRes.error && !isMissingClientsTable(clientsRes.error)) {
    throwIfError(clientsRes.error);
  }
  throwIfError(activitiesRes.error);

  const categories = normalizeCategories(categoriesRes.data || []);
  if (categories.length === 0) {
    for (const name of DEFAULT_CATEGORIES) {
      await upsertCategory(name);
    }
    categories.push(...DEFAULT_CATEGORIES);
  }

  const incomeRows = incomesRes.data || [];
  const clientsTableMissing = Boolean(clientsRes.error && isMissingClientsTable(clientsRes.error));
  let clients;
  if (clientsTableMissing) {
    clients = deriveClientsFromIncomes(incomeRows);
  } else {
    clients = normalizeClients(clientsRes.data || []);
    if (clients.length === 0) {
      for (const name of DEFAULT_CLIENTS) {
        await upsertClient(name);
      }
      clients = [...DEFAULT_CLIENTS];
    }
  }
  clients = mergeDefaultClients(clients);

  const expenses = mapExpenses(expensesRes.data || []);
  const incomes = mapIncomes(incomeRows);
  const documents = mapDocuments(documentsRes.data || []);

  return {
    expenses,
    incomes,
    documents,
    categories,
    clients,
    activities: mapActivities(activitiesRes.data || []),
    summary: {
      accountBalance: computeAccountBalance(incomes, expenses, documents),
      nextExpenseSeq: await getNextExpenseSeqNumber(db),
    },
  };
}

function computeAccountBalance(incomes, expenses, documents) {
  const totalIn = incomes.reduce((sum, item) => sum + item.amount, 0);
  const totalReimbursed = expenses
    .filter((item) => item.paid)
    .reduce((sum, item) => sum + item.amount, 0);
  const totalDocsPaid = documents
    .filter((item) => item.paid)
    .reduce((sum, item) => sum + item.amount, 0);
  return totalIn - totalReimbursed - totalDocsPaid;
}

async function getAccountBalance(db) {
  const [incomesRes, expensesRes, documentsRes] = await Promise.all([
    db.from("incomes").select("amount"),
    db.from("expenses").select("amount, paid"),
    db.from("documents").select("amount, paid"),
  ]);
  throwIfError(incomesRes.error);
  throwIfError(expensesRes.error);
  throwIfError(documentsRes.error);

  const incomes = (incomesRes.data || []).map((row) => ({ amount: Number(row.amount || 0) }));
  const expenses = (expensesRes.data || []).map((row) => ({
    amount: Number(row.amount || 0),
    paid: Boolean(row.paid),
  }));
  const documents = (documentsRes.data || []).map((row) => ({
    amount: Number(row.amount || 0),
    paid: Boolean(row.paid),
  }));
  return computeAccountBalance(incomes, expenses, documents);
}

async function assertCanPay(db, amount) {
  const balance = await getAccountBalance(db);
  const balanceCents = Math.round(balance * 100);
  const amountCents = Math.round(Number(amount) * 100);
  if (balanceCents < amountCents) {
    const err = new Error("Saldo insuficiente para efectuar este pagamento.");
    err.status = 409;
    err.code = "INSUFFICIENT_BALANCE";
    throw err;
  }
}

async function getNextExpenseSeqNumber(db) {
  const res = await db
    .from("expenses")
    .select("seq_number")
    .order("seq_number", { ascending: false })
    .limit(1);
  if (res.error && isMissingSeqNumberColumn(res.error)) {
    const countRes = await db.from("expenses").select("id", { count: "exact", head: true });
    throwIfError(countRes.error);
    return Number(countRes.count || 0) + 1;
  }
  throwIfError(res.error);
  const max = (res.data || []).reduce((m, row) => Math.max(m, Number(row.seq_number) || 0), 0);
  return max + 1;
}

async function createExpense(payload, actorProfile) {
  const db = getDb();
  const person = String(payload.person || "").trim();
  const payer = String(payload.payer || person || "").trim();
  const date = String(payload.date || "");
  const amount = Number(payload.amount || 0);
  const category = String(payload.category || "").trim();
  const description = String(payload.description || "").trim();
  const paid = Boolean(payload.paid);

  if (!["Cris", "Alex"].includes(person)) throw new Error("Pessoa invalida");
  if (!PAYER_OPTIONS.has(payer)) throw new Error("Pagador invalido");
  if (!isValidDate(date)) throw new Error("Data invalida");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Valor invalido");
  if (!category || !description) throw new Error("Dados incompletos");

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  let seqNumber = await getNextExpenseSeqNumber(db);
  const baseRow = {
    id,
    person,
    date,
    amount,
    category,
    description,
    paid,
    created_by: actorProfile,
    created_at: createdAt,
  };
  let row = { ...baseRow, seq_number: seqNumber, payer };
  let insertRes = await db.from("expenses").insert(row);
  if (insertRes.error) {
    if (isMissingPayerColumn(insertRes.error)) delete row.payer;
    if (isMissingSeqNumberColumn(insertRes.error)) {
      delete row.seq_number;
      seqNumber = null;
    }
    insertRes = await db.from("expenses").insert(row);
  }
  throwIfError(insertRes.error);

  await upsertCategory(category);
  const seqLabel = seqNumber != null ? `#${seqNumber} ` : "";
  const payerLabel = payer === "Studio9" ? "Studio9" : `${payer} (reembolso)`;
  await addActivity({
    type: "expense",
    at: createdAt,
    by: actorProfile,
    summary: paid
      ? `Despesa ${seqLabel}registada (ja paga) — ${payerLabel}: ${formatMoney(amount)} — ${description}`
      : `Despesa ${seqLabel}(por pagar) — ${payerLabel}: ${formatMoney(amount)} — ${description}`,
    meta: { expenseId: id, seqNumber, person, payer, amount, category, paid },
  });
}

async function toggleExpensePaid(id, actorProfile) {
  const db = getDb();
  const existing = await db.from("expenses").select("*").eq("id", id).maybeSingle();
  throwIfError(existing.error);
  if (!existing.data) throw new Error("Despesa nao encontrada");

  const target = existing.data;
  const payer = resolveExpensePayer(target);
  const nextPaid = !target.paid;
  if (!target.paid && nextPaid) {
    await assertCanPay(db, target.amount);
  }
  const updateRes = await db.from("expenses").update({ paid: nextPaid }).eq("id", id);
  throwIfError(updateRes.error);

  const at = new Date().toISOString();
  if (!target.paid && nextPaid) {
    const summary =
      payer === "Studio9"
        ? `Pagamento Studio9: ${formatMoney(target.amount)} — ${target.description}`
        : `Reembolso / despesa paga: ${payer} recebeu ${formatMoney(target.amount)} — ${target.description}`;
    await addActivity({
      type: payer === "Studio9" ? "document_paid" : "payment",
      at,
      by: actorProfile,
      summary,
      meta: { expenseId: target.id, person: target.person, payer, amount: target.amount, category: target.category },
    });
  } else if (target.paid && !nextPaid) {
    await addActivity({
      type: "reopen",
      at,
      by: actorProfile,
      summary: `Despesa voltou a «por pagar»: ${target.description} — ${formatMoney(target.amount)}`,
      meta: { expenseId: target.id, person: target.person, payer, amount: target.amount },
    });
  }
}

async function deleteAllRows(db, table, idColumn = "id") {
  const res = await db.from(table).delete().not(idColumn, "is", null);
  throwIfError(res.error);
}

async function resetExperimentalData(actorProfile) {
  const db = getDb();

  await deleteAllRows(db, "activities");
  await deleteAllRows(db, "expenses");
  await deleteAllRows(db, "incomes");
  await deleteAllRows(db, "documents");

  await deleteAllRows(db, "categories", "name");
  for (const name of DEFAULT_CATEGORIES) {
    await upsertCategory(name);
  }

  try {
    await deleteAllRows(db, "clients", "name");
    for (const name of DEFAULT_CLIENTS) {
      await upsertClient(name);
    }
  } catch (error) {
    if (error?.code !== "MISSING_CLIENTS_TABLE" && !isMissingClientsTable(error)) throw error;
  }

  const at = new Date().toISOString();
  await addActivity({
    type: "reset",
    at,
    by: actorProfile,
    summary: "Dados experimentais repostos — base de dados limpa para comecar de novo.",
    meta: { reset: true },
  });
}

async function createIncome(payload, actorProfile) {
  const db = getDb();
  const date = String(payload.date || "");
  const amount = Number(payload.amount || 0);
  const client = String(payload.client || payload.source || "").trim();

  if (!isValidDate(date)) throw new Error("Data invalida");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Valor invalido");
  if (!client) throw new Error("Cliente obrigatorio");

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const baseRow = {
    id,
    date,
    amount,
    source: client,
    created_by: actorProfile,
    created_at: createdAt,
  };
  let insertRes = await db.from("incomes").insert({ ...baseRow, client });
  if (insertRes.error && isMissingClientColumn(insertRes.error)) {
    insertRes = await db.from("incomes").insert(baseRow);
  }
  throwIfError(insertRes.error);

  try {
    await upsertClient(client);
  } catch (error) {
    if (error?.code !== "MISSING_CLIENTS_TABLE" && !isMissingClientsTable(error)) throw error;
  }
  await addActivity({
    type: "income",
    at: createdAt,
    by: actorProfile,
    summary: `Entrada de dinheiro: ${formatMoney(amount)} — ${client}`,
    meta: { incomeId: id, amount, client },
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

async function renameCategory(oldName, newName) {
  const oldTrim = String(oldName || "").trim();
  const newTrim = String(newName || "").trim();
  if (!oldTrim || !newTrim) throw new Error("Categoria invalida");
  if (oldTrim === newTrim) return;

  const db = getDb();
  const duplicate = await db.from("categories").select("name").eq("name", newTrim).maybeSingle();
  throwIfError(duplicate.error);
  if (duplicate.data) {
    const err = new Error("Categoria ja existe");
    err.status = 409;
    throw err;
  }

  const existing = await db.from("categories").select("name").eq("name", oldTrim).maybeSingle();
  throwIfError(existing.error);
  if (!existing.data) throw new Error("Categoria nao encontrada");

  const expenseUpdate = await db.from("expenses").update({ category: newTrim }).eq("category", oldTrim);
  throwIfError(expenseUpdate.error);

  const categoryUpdate = await db.from("categories").update({ name: newTrim }).eq("name", oldTrim);
  throwIfError(categoryUpdate.error);
}

async function deleteCategory(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) throw new Error("Categoria invalida");

  const db = getDb();
  const existing = await db.from("categories").select("name").eq("name", trimmed).maybeSingle();
  throwIfError(existing.error);
  if (!existing.data) throw new Error("Categoria nao encontrada");

  const inUse = await db.from("expenses").select("id").eq("category", trimmed).limit(1);
  throwIfError(inUse.error);
  if ((inUse.data || []).length > 0) {
    const err = new Error("Categoria em uso em despesas existentes");
    err.status = 409;
    throw err;
  }

  const res = await db.from("categories").delete().eq("name", trimmed);
  throwIfError(res.error);
}

async function upsertClient(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) throw new Error("Cliente obrigatorio");
  const db = getDb();
  const res = await db
    .from("clients")
    .upsert({ name: trimmed }, { onConflict: "name", ignoreDuplicates: true });
  if (res.error) {
    throwClientStorageError(res.error);
  }
}

function throwClientStorageError(error) {
  if (isMissingClientsTable(error)) {
    const err = new Error(
      "Tabela de clientes em falta. Corre migration_clients.sql no Supabase SQL Editor."
    );
    err.status = 503;
    err.code = "MISSING_CLIENTS_TABLE";
    throw err;
  }
  throwIfError(error);
}

async function renameClient(oldName, newName) {
  const oldTrim = String(oldName || "").trim();
  const newTrim = String(newName || "").trim();
  if (!oldTrim || !newTrim) throw new Error("Cliente invalido");
  if (oldTrim === newTrim) return;

  const db = getDb();
  const duplicate = await db.from("clients").select("name").eq("name", newTrim).maybeSingle();
  if (duplicate.error) throwClientStorageError(duplicate.error);
  if (duplicate.data) {
    const err = new Error("Cliente ja existe");
    err.status = 409;
    throw err;
  }

  const existing = await db.from("clients").select("name").eq("name", oldTrim).maybeSingle();
  if (existing.error) throwClientStorageError(existing.error);
  if (!existing.data) throw new Error("Cliente nao encontrado");

  let incomeUpdate = await db.from("incomes").update({ client: newTrim, source: newTrim }).eq("client", oldTrim);
  if (incomeUpdate.error && isMissingClientColumn(incomeUpdate.error)) {
    incomeUpdate = await db.from("incomes").update({ source: newTrim }).eq("source", oldTrim);
  }
  throwIfError(incomeUpdate.error);

  const clientUpdate = await db.from("clients").update({ name: newTrim }).eq("name", oldTrim);
  if (clientUpdate.error) throwClientStorageError(clientUpdate.error);
}

async function deleteClient(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) throw new Error("Cliente invalido");

  const db = getDb();
  const existing = await db.from("clients").select("name").eq("name", trimmed).maybeSingle();
  if (existing.error) throwClientStorageError(existing.error);
  if (!existing.data) throw new Error("Cliente nao encontrado");

  let inUse = await db.from("incomes").select("id").eq("client", trimmed).limit(1);
  if (inUse.error && isMissingClientColumn(inUse.error)) {
    inUse = await db.from("incomes").select("id").eq("source", trimmed).limit(1);
  }
  throwIfError(inUse.error);
  if ((inUse.data || []).length > 0) {
    const err = new Error("Cliente em uso em entradas existentes");
    err.status = 409;
    throw err;
  }

  const res = await db.from("clients").delete().eq("name", trimmed);
  if (res.error) throwClientStorageError(res.error);
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
  if (!target.paid && nextPaid) {
    await assertCanPay(db, target.amount);
  }
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
    seqNumber: row.seq_number != null ? Number(row.seq_number) : null,
    person: row.person,
    payer: resolveExpensePayer(row),
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
    client: String(row.client || row.source || "").trim(),
    source: String(row.source || row.client || "").trim(),
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

function normalizeClients(rows) {
  return rows
    .map((item) => String(item.name || "").trim())
    .filter((value) => value.length > 0);
}

function deriveClientsFromIncomes(rows) {
  const names = new Set();
  for (const row of rows) {
    const client = String(row.client || row.source || "").trim();
    if (client) names.add(client);
  }
  return [...names].sort((a, b) => a.localeCompare(b, "pt"));
}

function mergeDefaultClients(clients) {
  const merged = new Set([...DEFAULT_CLIENTS, ...clients]);
  return [...merged].sort((a, b) => a.localeCompare(b, "pt"));
}

function isMissingClientsTable(error) {
  if (error?.code === "MISSING_CLIENTS_TABLE") return true;
  const message = String(error?.message || error || "").toLowerCase();
  return (
    message.includes("clients") &&
    (message.includes("does not exist") ||
      message.includes("could not find") ||
      message.includes("schema cache"))
  );
}

function isMissingClientColumn(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return message.includes("client") && (message.includes("column") || message.includes("schema cache"));
}

function isMissingSeqNumberColumn(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return message.includes("seq_number") && (message.includes("column") || message.includes("schema cache"));
}

function isMissingPayerColumn(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return message.includes("payer") && (message.includes("column") || message.includes("schema cache"));
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
  renameCategory,
  deleteCategory,
  upsertClient,
  renameClient,
  deleteClient,
  createDocument,
  toggleDocumentPaid,
  resetExperimentalData,
};
