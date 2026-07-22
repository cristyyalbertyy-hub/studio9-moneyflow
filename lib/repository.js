const crypto = require("crypto");
const { getDb } = require("./db");
const { deleteAllExpenseInvoiceFiles, isMissingExpenseInvoicesTable, mapExpenseInvoices } = require("./invoices");

const PAYER_OPTIONS = new Set(["Cris", "Alex", "Studio9"]);
const CURRENCY_OPTIONS = new Set(["EUR", "USD", "QAR"]);
const DEFAULT_CURRENCY = "USD";
const CURRENCY_CODES = ["USD", "EUR", "QAR"];

function resolveCurrency(row) {
  const currency = String(row?.currency || DEFAULT_CURRENCY).trim().toUpperCase();
  return CURRENCY_OPTIONS.has(currency) ? currency : DEFAULT_CURRENCY;
}

function emptyCurrencyBalances() {
  return { EUR: 0, USD: 0, QAR: 0 };
}

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

function formatMoney(amount, currency = DEFAULT_CURRENCY) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: resolveCurrency({ currency }),
  }).format(Number(amount) || 0);
}

function computeAccountBalancesByCurrency(
  incomes,
  expenses,
  documents,
  charityAllocations = [],
  profitDistributions = [],
  charityDisbursements = []
) {
  const balances = emptyCurrencyBalances();
  for (const item of incomes) {
    balances[resolveCurrency(item)] += Number(item.amount || 0);
  }
  for (const item of expenses) {
    if (!item.paid) continue;
    balances[resolveCurrency(item)] -= Number(item.amount || 0);
  }
  for (const item of documents) {
    if (!item.paid) continue;
    balances[DEFAULT_CURRENCY] -= Number(item.amount || 0);
  }
  for (const item of profitDistributions) {
    balances[resolveCurrency(item)] -= getProfitDistributionAccountOutflow(item);
  }
  for (const item of charityAllocations) {
    balances[resolveCurrency(item)] -= Number(item.amount || 0);
  }
  for (const item of charityDisbursements) {
    balances[resolveCurrency(item)] += Number(item.amount || 0);
  }
  return balances;
}

function computeCharityBalancesByCurrency(
  charityAllocations = [],
  profitDistributions = [],
  charityDisbursements = []
) {
  const balances = emptyCurrencyBalances();
  for (const item of charityAllocations) {
    balances[resolveCurrency(item)] += Number(item.amount || 0);
  }
  for (const item of profitDistributions) {
    balances[resolveCurrency(item)] += Number(item.amtCharity || item.amt_charity || 0);
  }
  for (const item of charityDisbursements) {
    balances[resolveCurrency(item)] -= Number(item.amount || 0);
  }
  return balances;
}

function computeAccountBalance(
  incomes,
  expenses,
  documents,
  charityAllocations = [],
  profitDistributions = [],
  charityDisbursements = []
) {
  return computeAccountBalancesByCurrency(
    incomes,
    expenses,
    documents,
    charityAllocations,
    profitDistributions,
    charityDisbursements
  )[DEFAULT_CURRENCY];
}

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

function getProfitDistributionAccountOutflow(item) {
  const amtCris = Number(item.amtCris ?? item.amt_cris ?? 0);
  const amtAlex = Number(item.amtAlex ?? item.amt_alex ?? 0);
  const amtCharity = Number(item.amtCharity ?? item.amt_charity ?? 0);
  const outflow = roundMoney(amtCris + amtAlex + amtCharity);
  if (outflow > 0) return outflow;

  const profitAmount = Number(item.profitAmount ?? item.profit_amount ?? 0);
  const amtStudio9 = Number(item.amtStudio9 ?? item.amt_studio9 ?? 0);
  if (amtStudio9 > 0) return roundMoney(Math.max(0, profitAmount - amtStudio9));
  return profitAmount;
}

async function getBootstrapData() {
  const db = getDb();

  const [expensesRes, incomesRes, documentsRes, categoriesRes, clientsRes, activitiesRes, charityRes, profitRes, disbursementRes, invoicesRes] =
    await Promise.all([
    db.from("expenses").select("*").order("created_at", { ascending: false }),
    db.from("incomes").select("*").order("created_at", { ascending: false }),
    db.from("documents").select("*").order("created_at", { ascending: false }),
    db.from("categories").select("*").order("name", { ascending: true }),
    db.from("clients").select("*").order("name", { ascending: true }),
    db.from("activities").select("*").order("at", { ascending: false }).limit(MAX_ACTIVITIES),
    db.from("charity_allocations").select("*").order("created_at", { ascending: false }),
    db.from("profit_distributions").select("*").order("created_at", { ascending: false }),
    db.from("charity_disbursements").select("*").order("created_at", { ascending: false }),
    db.from("expense_invoices").select("*").order("created_at", { ascending: false }),
  ]);

  throwIfError(expensesRes.error);
  throwIfError(incomesRes.error);
  throwIfError(documentsRes.error);
  throwIfError(categoriesRes.error);
  if (charityRes.error && !isMissingCharityTable(charityRes.error)) {
    throwIfError(charityRes.error);
  }
  if (profitRes.error && !isMissingProfitDistributionTable(profitRes.error)) {
    throwIfError(profitRes.error);
  }
  if (disbursementRes.error && !isMissingCharityDisbursementTable(disbursementRes.error)) {
    throwIfError(disbursementRes.error);
  }
  if (invoicesRes.error && !isMissingExpenseInvoicesTable(invoicesRes.error)) {
    throwIfError(invoicesRes.error);
  }
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
  const charityAllocations = mapCharityAllocations(
    charityRes.error && isMissingCharityTable(charityRes.error) ? [] : charityRes.data || []
  );
  const profitDistributions = mapProfitDistributions(
    profitRes.error && isMissingProfitDistributionTable(profitRes.error) ? [] : profitRes.data || []
  );
  const charityDisbursements = mapCharityDisbursements(
    disbursementRes.error && isMissingCharityDisbursementTable(disbursementRes.error)
      ? []
      : disbursementRes.data || []
  );
  const charityTableReady = !(charityRes.error && isMissingCharityTable(charityRes.error));
  const profitDistributionTableReady = !(
    profitRes.error && isMissingProfitDistributionTable(profitRes.error)
  );
  const charityDisbursementTableReady = !(
    disbursementRes.error && isMissingCharityDisbursementTable(disbursementRes.error)
  );
  const expenseInvoicesTableReady = !(
    invoicesRes.error && isMissingExpenseInvoicesTable(invoicesRes.error)
  );
  const expenseInvoices =
    invoicesRes.error && isMissingExpenseInvoicesTable(invoicesRes.error)
      ? []
      : mapExpenseInvoices(invoicesRes.data || []);
  const charityBalances = computeCharityBalancesByCurrency(
    charityAllocations,
    profitDistributions,
    charityDisbursements
  );

  return {
    expenses,
    incomes,
    documents,
    charityAllocations,
    profitDistributions,
    charityDisbursements,
    expenseInvoices,
    categories,
    clients,
    activities: mapActivities(activitiesRes.data || []),
    summary: {
      accountBalance: computeAccountBalance(
        incomes,
        expenses,
        documents,
        charityAllocations,
        profitDistributions,
        charityDisbursements
      ),
      accountBalances: computeAccountBalancesByCurrency(
        incomes,
        expenses,
        documents,
        charityAllocations,
        profitDistributions,
        charityDisbursements
      ),
      charityBalance: charityBalances[DEFAULT_CURRENCY],
      charityBalances,
      charityTableReady,
      profitDistributionTableReady,
      charityDisbursementTableReady,
      expenseInvoicesTableReady,
      nextExpenseSeq: await getNextExpenseSeqNumber(db),
    },
  };
}

async function getAccountBalance(db, currency = DEFAULT_CURRENCY) {
  let [incomesRes, expensesRes, documentsRes, charityRes, profitRes, disbursementRes] = await Promise.all([
    db.from("incomes").select("amount, currency"),
    db.from("expenses").select("amount, paid, currency"),
    db.from("documents").select("amount, paid"),
    db.from("charity_allocations").select("amount, currency"),
    db.from("profit_distributions").select("profit_amount, currency, amt_cris, amt_alex, amt_studio9, amt_charity"),
    db.from("charity_disbursements").select("amount, currency"),
  ]);
  if (incomesRes.error && isMissingCurrencyColumn(incomesRes.error)) {
    incomesRes = await db.from("incomes").select("amount");
  }
  if (expensesRes.error && isMissingCurrencyColumn(expensesRes.error)) {
    expensesRes = await db.from("expenses").select("amount, paid");
  }
  throwIfError(incomesRes.error);
  throwIfError(expensesRes.error);
  throwIfError(documentsRes.error);
  if (charityRes.error && !isMissingCharityTable(charityRes.error)) {
    throwIfError(charityRes.error);
  }
  if (profitRes.error && !isMissingProfitDistributionTable(profitRes.error)) {
    throwIfError(profitRes.error);
  }
  if (disbursementRes.error && !isMissingCharityDisbursementTable(disbursementRes.error)) {
    throwIfError(disbursementRes.error);
  }

  const incomes = (incomesRes.data || []).map((row) => ({
    amount: Number(row.amount || 0),
    currency: resolveCurrency(row),
  }));
  const expenses = (expensesRes.data || []).map((row) => ({
    amount: Number(row.amount || 0),
    paid: Boolean(row.paid),
    currency: resolveCurrency(row),
  }));
  const documents = (documentsRes.data || []).map((row) => ({
    amount: Number(row.amount || 0),
    paid: Boolean(row.paid),
  }));
  const charityAllocations = (charityRes.error ? [] : charityRes.data || []).map((row) => ({
    amount: Number(row.amount || 0),
    currency: resolveCurrency(row),
  }));
  const profitDistributions = (profitRes.error ? [] : profitRes.data || []).map((row) => ({
    profitAmount: Number(row.profit_amount || 0),
    currency: resolveCurrency(row),
    amtCris: Number(row.amt_cris || 0),
    amtAlex: Number(row.amt_alex || 0),
    amtStudio9: Number(row.amt_studio9 || 0),
    amtCharity: Number(row.amt_charity || 0),
  }));
  const charityDisbursements = (disbursementRes.error ? [] : disbursementRes.data || []).map((row) => ({
    amount: Number(row.amount || 0),
    currency: resolveCurrency(row),
  }));
  const balances = computeAccountBalancesByCurrency(
    incomes,
    expenses,
    documents,
    charityAllocations,
    profitDistributions,
    charityDisbursements
  );
  return balances[resolveCurrency({ currency })] || 0;
}

async function assertCanPay(db, amount, currency = DEFAULT_CURRENCY) {
  const balance = await getAccountBalance(db, currency);
  const balanceCents = Math.round(balance * 100);
  const amountCents = Math.round(Number(amount) * 100);
  if (balanceCents < amountCents) {
    const err = new Error("Saldo insuficiente para este pagamento.");
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
  const currency = String(payload.currency || DEFAULT_CURRENCY).trim().toUpperCase();
  const category = String(payload.category || "").trim();
  const description = String(payload.description || "").trim();
  const paid = payer === "Studio9" ? true : Boolean(payload.paid);

  if (!["Cris", "Alex"].includes(person)) throw new Error("Pessoa invalida");
  if (!PAYER_OPTIONS.has(payer)) throw new Error("Pagador invalido");
  if (!isValidDate(date)) throw new Error("Data invalida");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Valor invalido");
  if (!CURRENCY_OPTIONS.has(currency)) throw new Error("Moeda invalida");
  if (!category || !description) throw new Error("Dados incompletos");
  if (payer === "Studio9") {
    await assertCanPay(db, amount, currency);
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const paidAt = paid ? todayISODate() : null;
  let seqNumber = await getNextExpenseSeqNumber(db);
  const baseRow = {
    id,
    person,
    date,
    amount,
    category,
    description,
    paid,
    paid_at: paidAt,
    created_by: actorProfile,
    created_at: createdAt,
  };
  let row = { ...baseRow, seq_number: seqNumber, payer, currency };
  let insertRes = await db.from("expenses").insert(row);
  if (insertRes.error) {
    if (isMissingCurrencyColumn(insertRes.error)) delete row.currency;
    if (isMissingPayerColumn(insertRes.error)) delete row.payer;
    if (isMissingPaidAtColumn(insertRes.error)) delete row.paid_at;
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
  const moneyLabel = formatMoney(amount, currency);
  const summary =
    payer === "Studio9"
      ? `Pagamento Studio9: ${moneyLabel} — ${description}`
      : paid
        ? `Despesa ${seqLabel}registada (ja paga) — ${payerLabel}: ${moneyLabel} — ${description}`
        : `Despesa ${seqLabel}(por pagar) — ${payerLabel}: ${moneyLabel} — ${description}`;
  await addActivity({
    type: payer === "Studio9" ? "document_paid" : "expense",
    at: createdAt,
    by: actorProfile,
    summary,
    meta: { expenseId: id, seqNumber, person, payer, amount, currency, category, paid },
  });
}

async function toggleExpensePaid(id, actorProfile) {
  const db = getDb();
  const existing = await db.from("expenses").select("*").eq("id", id).maybeSingle();
  throwIfError(existing.error);
  if (!existing.data) throw new Error("Despesa nao encontrada");

  const target = existing.data;
  const payer = resolveExpensePayer(target);
  if (payer === "Studio9") {
    throw new Error("Pagamento Studio9 nao pode ser revertido");
  }
  const currency = resolveCurrency(target);
  const nextPaid = !target.paid;
  if (!target.paid && nextPaid) {
    await assertCanPay(db, target.amount, currency);
  }
  const paidAt = nextPaid ? todayISODate() : null;
  await updateExpensePaidState(db, id, nextPaid, paidAt);

  const at = new Date().toISOString();
  if (!target.paid && nextPaid) {
    const summary =
      payer === "Studio9"
        ? `Pagamento Studio9: ${formatMoney(target.amount, currency)} — ${target.description}`
        : `Reembolso / despesa paga: ${payer} recebeu ${formatMoney(target.amount, currency)} — ${target.description}`;
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
      summary: `Despesa voltou a «por pagar»: ${target.description} — ${formatMoney(target.amount, currency)}`,
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
  try {
    await deleteAllExpenseInvoiceFiles(db);
  } catch (error) {
    if (!isMissingExpenseInvoicesTable(error)) throw error;
  }
  await deleteAllRows(db, "expenses");
  await deleteAllRows(db, "incomes");
  await deleteAllRows(db, "documents");

  try {
    await deleteAllRows(db, "charity_allocations");
  } catch (error) {
    if (!isMissingCharityTable(error)) throw error;
  }

  try {
    await deleteAllRows(db, "profit_distributions");
  } catch (error) {
    if (!isMissingProfitDistributionTable(error)) throw error;
  }

  try {
    await deleteAllRows(db, "charity_disbursements");
  } catch (error) {
    if (!isMissingCharityDisbursementTable(error)) throw error;
  }

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

async function createCharityAllocation(payload, actorProfile) {
  const db = getDb();
  const amount = Number(payload.amount || 0);
  const currency = String(payload.currency || DEFAULT_CURRENCY).trim().toUpperCase();
  const profitAmount = Number(payload.profitAmount || 0);
  const charityPct = Number(payload.charityPct || 0);
  const date = todayISODate();

  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Valor invalido");
  if (!CURRENCY_OPTIONS.has(currency)) throw new Error("Moeda invalida");

  await assertCanPay(db, amount, currency);

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const insertRes = await db.from("charity_allocations").insert({
    id,
    amount,
    currency,
    profit_amount: Number.isFinite(profitAmount) && profitAmount > 0 ? profitAmount : null,
    charity_pct: Number.isFinite(charityPct) && charityPct > 0 ? charityPct : null,
    date,
    created_by: actorProfile,
    created_at: createdAt,
  });
  if (insertRes.error && isMissingCharityTable(insertRes.error)) {
    throw new Error(
      "Tabela de caridade em falta. Abre o Supabase SQL Editor e corre migration_charity.sql."
    );
  }
  throwIfError(insertRes.error);

  await addActivity({
    type: "charity",
    at: createdAt,
    by: actorProfile,
    summary: `Caridade: ${formatMoney(amount, currency)} alocado do saldo da conta`,
    meta: { charityAllocationId: id, amount, currency, profitAmount, charityPct },
  });
}

async function assertNoPendingReimbursements(db) {
  const res = await db.from("expenses").select("id, person, payer, paid").eq("paid", false);
  throwIfError(res.error);
  const pending = (res.data || []).filter((row) => isReimbursementPayer(resolveExpensePayer(row)));
  if (pending.length > 0) {
    const err = new Error("Existem reembolsos por efectuar.");
    err.status = 409;
    err.code = "PENDING_REIMBURSEMENTS";
    throw err;
  }
}

async function createProfitDistribution(payload, actorProfile) {
  const db = getDb();
  const profitAmount = Number(payload.profitAmount || 0);
  const currency = String(payload.currency || DEFAULT_CURRENCY).trim().toUpperCase();
  const pctCris = Number(payload.pctCris || 0);
  const pctAlex = Number(payload.pctAlex || 0);
  const pctStudio9 = Number(payload.pctStudio9 || 0);
  const pctCharity = Number(payload.pctCharity || 0);
  const date = todayISODate();

  if (!Number.isFinite(profitAmount) || profitAmount <= 0) throw new Error("Valor invalido");
  if (!CURRENCY_OPTIONS.has(currency)) throw new Error("Moeda invalida");

  const totalPct = pctCris + pctAlex + pctStudio9 + pctCharity;
  if (Math.abs(totalPct - 100) > 0.05) {
    throw new Error("As percentagens devem somar 100%");
  }

  const amtCris = roundMoney((profitAmount * pctCris) / 100);
  const amtAlex = roundMoney((profitAmount * pctAlex) / 100);
  const amtStudio9 = roundMoney((profitAmount * pctStudio9) / 100);
  const amtCharity = roundMoney((profitAmount * pctCharity) / 100);
  const assignedTotal = roundMoney(amtCris + amtAlex + amtStudio9 + amtCharity);
  if (Math.abs(assignedTotal - profitAmount) > 0.05) {
    throw new Error("Valores atribuidos invalidos");
  }

  await assertNoPendingReimbursements(db);
  await assertCanPay(db, roundMoney(amtCris + amtAlex + amtCharity), currency);

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const insertRes = await db.from("profit_distributions").insert({
    id,
    profit_amount: profitAmount,
    currency,
    pct_cris: pctCris,
    pct_alex: pctAlex,
    pct_studio9: pctStudio9,
    pct_charity: pctCharity,
    amt_cris: amtCris,
    amt_alex: amtAlex,
    amt_studio9: amtStudio9,
    amt_charity: amtCharity,
    date,
    created_by: actorProfile,
    created_at: createdAt,
  });
  if (insertRes.error && isMissingProfitDistributionTable(insertRes.error)) {
    throw new Error(
      "Tabela de distribuicao de lucro em falta. Abre o Supabase SQL Editor e corre migration_profit_distributions.sql."
    );
  }
  throwIfError(insertRes.error);

  const parts = [
    `Cris ${formatMoney(amtCris, currency)}`,
    `Alex ${formatMoney(amtAlex, currency)}`,
    `Studio9 ${formatMoney(amtStudio9, currency)}`,
    `Caridade ${formatMoney(amtCharity, currency)}`,
  ].join(" · ");

  await addActivity({
    type: "profit_distribution",
    at: createdAt,
    by: actorProfile,
    summary: `Distribuicao de lucro: ${formatMoney(profitAmount, currency)} — ${parts}`,
    meta: {
      profitDistributionId: id,
      profitAmount,
      currency,
      pctCris,
      pctAlex,
      pctStudio9,
      pctCharity,
      amtCris,
      amtAlex,
      amtStudio9,
      amtCharity,
    },
  });
}

async function getCharityBalancesFromDb(db) {
  const [charityRes, profitRes, disbursementRes] = await Promise.all([
    db.from("charity_allocations").select("amount, currency"),
    db.from("profit_distributions").select("amt_charity, currency"),
    db.from("charity_disbursements").select("amount, currency"),
  ]);
  if (charityRes.error && !isMissingCharityTable(charityRes.error)) throwIfError(charityRes.error);
  if (profitRes.error && !isMissingProfitDistributionTable(profitRes.error)) throwIfError(profitRes.error);
  if (disbursementRes.error && !isMissingCharityDisbursementTable(disbursementRes.error)) {
    throwIfError(disbursementRes.error);
  }

  const charityAllocations = (charityRes.error ? [] : charityRes.data || []).map((row) => ({
    amount: Number(row.amount || 0),
    currency: resolveCurrency(row),
  }));
  const profitDistributions = (profitRes.error ? [] : profitRes.data || []).map((row) => ({
    amtCharity: Number(row.amt_charity || 0),
    currency: resolveCurrency(row),
  }));
  const charityDisbursements = (disbursementRes.error ? [] : disbursementRes.data || []).map((row) => ({
    amount: Number(row.amount || 0),
    currency: resolveCurrency(row),
  }));
  return computeCharityBalancesByCurrency(charityAllocations, profitDistributions, charityDisbursements);
}

async function createCharityDisbursement(payload, actorProfile) {
  const db = getDb();
  const amount = Number(payload.amount || 0);
  const currency = String(payload.currency || DEFAULT_CURRENCY).trim().toUpperCase();
  const date = String(payload.date || "").trim() || todayISODate();
  const description = String(payload.description || "").trim();

  if (!isValidDate(date)) throw new Error("Data invalida");
  if (!description) throw new Error("Descricao obrigatoria");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Valor invalido");
  if (!CURRENCY_OPTIONS.has(currency)) throw new Error("Moeda invalida");

  const charityBalances = await getCharityBalancesFromDb(db);
  const charityBalance = charityBalances[currency] || 0;
  if (Math.round(charityBalance * 100) < Math.round(amount * 100)) {
    throw new Error("Saldo de caridade insuficiente");
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const insertRes = await db.from("charity_disbursements").insert({
    id,
    amount,
    currency,
    description,
    date,
    created_by: actorProfile,
    created_at: createdAt,
  });
  if (insertRes.error && isMissingCharityDisbursementTable(insertRes.error)) {
    throw new Error(
      "Tabela de saidas de caridade em falta. Abre o Supabase SQL Editor e corre migration_charity_disbursements.sql."
    );
  }
  throwIfError(insertRes.error);

  await addActivity({
    type: "charity_disbursement",
    at: createdAt,
    by: actorProfile,
    summary: `Saida caridade: ${formatMoney(amount, currency)} — ${description}`,
    meta: { charityDisbursementId: id, amount, currency, description, date },
  });
}

async function createIncome(payload, actorProfile) {
  const db = getDb();
  const date = String(payload.date || "");
  const amount = Number(payload.amount || 0);
  const currency = String(payload.currency || DEFAULT_CURRENCY).trim().toUpperCase();
  const client = String(payload.client || payload.source || "").trim();

  if (!isValidDate(date)) throw new Error("Data invalida");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Valor invalido");
  if (!CURRENCY_OPTIONS.has(currency)) throw new Error("Moeda invalida");
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
  let insertRes = await db.from("incomes").insert({ ...baseRow, client, currency });
  if (insertRes.error && isMissingCurrencyColumn(insertRes.error)) {
    insertRes = await db.from("incomes").insert({ ...baseRow, client });
  }
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
    summary: `Entrada de dinheiro: ${formatMoney(amount, currency)} — ${client}`,
    meta: { incomeId: id, amount, currency, client },
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
  await assertCanPay(db, amount, DEFAULT_CURRENCY);

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const res = await db.from("documents").insert({
    id,
    label,
    amount,
    date,
    paid: true,
    created_by: actorProfile,
    created_at: createdAt,
  });
  throwIfError(res.error);

  await addActivity({
    type: "document_paid",
    at: createdAt,
    by: actorProfile,
    summary: `Pagamento processado (documento): ${formatMoney(amount)} — ${label}`,
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
    await assertCanPay(db, target.amount, DEFAULT_CURRENCY);
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
    currency: resolveCurrency(row),
    category: row.category,
    description: row.description,
    paid: Boolean(row.paid),
    paidAt: row.paid_at || null,
    createdBy: row.created_by || "",
    createdAt: row.created_at || "",
  }));
}

function mapIncomes(rows) {
  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    amount: Number(row.amount || 0),
    currency: resolveCurrency(row),
    client: String(row.client || row.source || "").trim(),
    source: String(row.source || row.client || "").trim(),
    createdBy: row.created_by || "",
    createdAt: row.created_at || "",
  }));
}

function mapCharityAllocations(rows) {
  return rows.map((row) => ({
    id: row.id,
    amount: Number(row.amount || 0),
    currency: resolveCurrency(row),
    profitAmount: row.profit_amount != null ? Number(row.profit_amount) : null,
    charityPct: row.charity_pct != null ? Number(row.charity_pct) : null,
    date: row.date,
    createdBy: row.created_by || "",
    createdAt: row.created_at || "",
  }));
}

function mapCharityDisbursements(rows) {
  return rows.map((row) => ({
    id: row.id,
    amount: Number(row.amount || 0),
    currency: resolveCurrency(row),
    description: row.description || "",
    date: row.date,
    createdBy: row.created_by || "",
    createdAt: row.created_at || "",
  }));
}

function mapProfitDistributions(rows) {
  return rows.map((row) => ({
    id: row.id,
    profitAmount: Number(row.profit_amount || 0),
    currency: resolveCurrency(row),
    pctCris: Number(row.pct_cris || 0),
    pctAlex: Number(row.pct_alex || 0),
    pctStudio9: Number(row.pct_studio9 || 0),
    pctCharity: Number(row.pct_charity || 0),
    amtCris: Number(row.amt_cris || 0),
    amtAlex: Number(row.amt_alex || 0),
    amtStudio9: Number(row.amt_studio9 || 0),
    amtCharity: Number(row.amt_charity || 0),
    date: row.date,
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

function isMissingCurrencyColumn(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return message.includes("currency") && (message.includes("column") || message.includes("schema cache"));
}

function isMissingPaidAtColumn(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return message.includes("paid_at") && (message.includes("column") || message.includes("schema cache"));
}

function isMissingProfitDistributionTable(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return (
    message.includes("profit_distributions") &&
    (message.includes("does not exist") ||
      message.includes("could not find") ||
      message.includes("schema cache"))
  );
}

function isMissingCharityDisbursementTable(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return (
    message.includes("charity_disbursements") &&
    (message.includes("does not exist") ||
      message.includes("could not find") ||
      message.includes("schema cache"))
  );
}

function isMissingCharityTable(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return (
    message.includes("charity_allocations") &&
    (message.includes("does not exist") ||
      message.includes("could not find") ||
      message.includes("schema cache"))
  );
}

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

async function updateExpensePaidState(db, id, nextPaid, paidAt) {
  let updateRes = await db.from("expenses").update({ paid: nextPaid, paid_at: paidAt }).eq("id", id);
  if (updateRes.error && isMissingPaidAtColumn(updateRes.error)) {
    updateRes = await db.from("expenses").update({ paid: nextPaid }).eq("id", id);
  }
  throwIfError(updateRes.error);
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
  createCharityAllocation,
  createCharityDisbursement,
  createProfitDistribution,
  resetExperimentalData,
};
