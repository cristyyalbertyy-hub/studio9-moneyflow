const state = {
  expenses: [],
  incomes: [],
  documents: [],
  categories: [],
  clients: [],
  activities: [],
  summary: { accountBalance: 0, accountBalances: { EUR: 0, USD: 0, QAR: 0 }, nextExpenseSeq: 1 },
  session: null,
  socket: null,
};

const i18n = window.MoneyFlowI18n;
const t = (key) => i18n.t(key);
const locale = () => i18n.locale();

const sessionCacheKey = "studio9-session-v1";
const periodStorageKey = "studio9-period-month-v1";
const profitSplitsStorageKey = "studio9-profit-splits-v1";
const bootstrapPollMs = 15000;
let bootstrapPollTimer = null;

const refs = {
  totalEntradas: document.getElementById("totalEntradas"),
  monthStudio9Payments: document.getElementById("monthStudio9Payments"),
  monthReimbursements: document.getElementById("monthReimbursements"),
  monthTotalOutflow: document.getElementById("monthTotalOutflow"),
  accountBalanceTotal: document.getElementById("accountBalanceTotal"),
  expenseSeqPreview: document.getElementById("expenseSeqPreview"),
  documentForm: document.getElementById("documentForm"),
  documentDate: document.getElementById("documentDate"),
  documentAmount: document.getElementById("documentAmount"),
  documentLabel: document.getElementById("documentLabel"),
  documentSubmitBtn: document.getElementById("documentSubmitBtn"),
  clearPaymentFormBtn: document.getElementById("clearPaymentFormBtn"),
  paymentFormStatus: document.getElementById("paymentFormStatus"),
  paymentsPanel: document.querySelector(".payments-panel"),
  paymentRows: document.getElementById("paymentRows"),
  paymentFilterStartDate: document.getElementById("paymentFilterStartDate"),
  paymentFilterEndDate: document.getElementById("paymentFilterEndDate"),
  paymentClearFilters: document.getElementById("paymentClearFilters"),
  documentsPendingTotal: document.getElementById("documentsPendingTotal"),
  paymentsAccountBalance: document.getElementById("paymentsAccountBalance"),
  exportPendingPdfBtn: document.getElementById("exportPendingPdfBtn"),
  balanceAlertOverlay: document.getElementById("balanceAlertOverlay"),
  balanceAlertOk: document.getElementById("balanceAlertOk"),
  resetExperimentalBtn: document.getElementById("resetExperimentalBtn"),
  resetExperimentalOverlay: document.getElementById("resetExperimentalOverlay"),
  resetExperimentalForm: document.getElementById("resetExperimentalForm"),
  resetConfirmPhrase: document.getElementById("resetConfirmPhrase"),
  resetConfirmPassword: document.getElementById("resetConfirmPassword"),
  resetExperimentalError: document.getElementById("resetExperimentalError"),
  resetExperimentalCancel: document.getElementById("resetExperimentalCancel"),
  listManageOverlay: document.getElementById("listManageOverlay"),
  listManageTitle: document.getElementById("listManageTitle"),
  listManageMessage: document.getElementById("listManageMessage"),
  listManageForm: document.getElementById("listManageForm"),
  listManageSelectWrap: document.getElementById("listManageSelectWrap"),
  listManageSelectLabel: document.getElementById("listManageSelectLabel"),
  listManageSelect: document.getElementById("listManageSelect"),
  listManageInputWrap: document.getElementById("listManageInputWrap"),
  listManageInputLabel: document.getElementById("listManageInputLabel"),
  listManageInput: document.getElementById("listManageInput"),
  listManageError: document.getElementById("listManageError"),
  listManageCancel: document.getElementById("listManageCancel"),
  listManageSubmit: document.getElementById("listManageSubmit"),
  authOverlay: document.getElementById("authOverlay"),
  activeProfile: document.getElementById("activeProfile"),
  logoutBtn: document.getElementById("logoutBtn"),
  exportExcelBtn: document.getElementById("exportExcelBtn"),
  exportPdfBtn: document.getElementById("exportPdfBtn"),
  expenseCategorySelect: document.getElementById("expenseCategorySelect"),
  newCategoryBtn: document.getElementById("newCategoryBtn"),
  editCategoryBtn: document.getElementById("editCategoryBtn"),
  deleteCategoryBtn: document.getElementById("deleteCategoryBtn"),
  expenseRows: document.getElementById("expenseRows"),
  expenseForm: document.getElementById("expenseForm"),
  expensePerson: document.getElementById("expensePerson"),
  expensePayer: document.getElementById("expensePayer"),
  expenseDate: document.getElementById("expenseDate"),
  expenseAmount: document.getElementById("expenseAmount"),
  expenseCurrency: document.getElementById("expenseCurrency"),
  expenseDescription: document.getElementById("expenseDescription"),
  incomeForm: document.getElementById("incomeForm"),
  incomeDate: document.getElementById("incomeDate"),
  incomeAmount: document.getElementById("incomeAmount"),
  incomeCurrency: document.getElementById("incomeCurrency"),
  incomeClientSelect: document.getElementById("incomeClientSelect"),
  newClientBtn: document.getElementById("newClientBtn"),
  editClientBtn: document.getElementById("editClientBtn"),
  deleteClientBtn: document.getElementById("deleteClientBtn"),
  filterPerson: document.getElementById("filterPerson"),
  filterStatus: document.getElementById("filterStatus"),
  filterStartDate: document.getElementById("filterStartDate"),
  filterEndDate: document.getElementById("filterEndDate"),
  clearFilters: document.getElementById("clearFilters"),
  activityList: document.getElementById("activityList"),
  periodMonth: document.getElementById("periodMonth"),
  periodMonthDisplay: document.getElementById("periodMonthDisplay"),
  authForm: document.getElementById("authForm"),
  loginProfile: document.getElementById("loginProfile"),
  authPassword: document.getElementById("authPassword"),
  authError: document.getElementById("authError"),
  profitAmount: document.getElementById("profitAmount"),
  profitPctCris: document.getElementById("profitPctCris"),
  profitPctAlex: document.getElementById("profitPctAlex"),
  profitPctStudio9: document.getElementById("profitPctStudio9"),
  profitPctCharity: document.getElementById("profitPctCharity"),
  profitAmtCris: document.getElementById("profitAmtCris"),
  profitAmtAlex: document.getElementById("profitAmtAlex"),
  profitAmtStudio9: document.getElementById("profitAmtStudio9"),
  profitAmtCharity: document.getElementById("profitAmtCharity"),
  profitTotalHint: document.getElementById("profitTotalHint"),
};

const defaultProfitSplits = {
  cris: 30,
  alex: 30,
  studio9: 30,
  charity: 10,
};

const defaultIncomeClient = "Lemon Squeezy";
const CURRENCY_CODES = ["EUR", "USD", "QAR"];
const DEFAULT_CURRENCY = "EUR";

let listManageState = null;
let paymentFormStudio9Locked = false;

function initProfitDistribution() {
  if (!refs.profitAmount) return;

  const stored = readProfitSplits();
  if (refs.profitPctCris) refs.profitPctCris.value = stored.cris;
  if (refs.profitPctAlex) refs.profitPctAlex.value = stored.alex;
  if (refs.profitPctStudio9) refs.profitPctStudio9.value = stored.studio9;
  if (refs.profitPctCharity) refs.profitPctCharity.value = stored.charity;

  const inputs = [
    refs.profitAmount,
    refs.profitPctCris,
    refs.profitPctAlex,
    refs.profitPctStudio9,
    refs.profitPctCharity,
  ].filter(Boolean);

  inputs.forEach((input) => {
    input.addEventListener("input", () => {
      persistProfitSplits();
      renderProfitDistribution();
    });
  });

  renderProfitDistribution();
}

function readProfitSplits() {
  try {
    const raw = window.localStorage.getItem(profitSplitsStorageKey);
    if (!raw) return { ...defaultProfitSplits };
    const parsed = JSON.parse(raw);
    return {
      cris: clampPercent(parsed.cris, defaultProfitSplits.cris),
      alex: clampPercent(parsed.alex, defaultProfitSplits.alex),
      studio9: clampPercent(parsed.studio9, defaultProfitSplits.studio9),
      charity: clampPercent(parsed.charity, defaultProfitSplits.charity),
    };
  } catch {
    return { ...defaultProfitSplits };
  }
}

function persistProfitSplits() {
  if (!refs.profitPctCris) return;
  const payload = {
    cris: clampPercent(refs.profitPctCris.value, defaultProfitSplits.cris),
    alex: clampPercent(refs.profitPctAlex.value, defaultProfitSplits.alex),
    studio9: clampPercent(refs.profitPctStudio9.value, defaultProfitSplits.studio9),
    charity: clampPercent(refs.profitPctCharity.value, defaultProfitSplits.charity),
  };
  try {
    window.localStorage.setItem(profitSplitsStorageKey, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

function clampPercent(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(n, 100);
}

function renderProfitDistribution() {
  if (!refs.profitAmount) return;

  const profit = Math.max(0, Number(refs.profitAmount.value) || 0);
  const splits = [
    { pctEl: refs.profitPctCris, amtEl: refs.profitAmtCris },
    { pctEl: refs.profitPctAlex, amtEl: refs.profitAmtAlex },
    { pctEl: refs.profitPctStudio9, amtEl: refs.profitAmtStudio9 },
    { pctEl: refs.profitPctCharity, amtEl: refs.profitAmtCharity },
  ];

  let totalPct = 0;
  splits.forEach(({ pctEl, amtEl }) => {
    if (!pctEl || !amtEl) return;
    const pct = clampPercent(pctEl.value, 0);
    totalPct += pct;
    amtEl.textContent = formatEUR((profit * pct) / 100);
  });

  if (!refs.profitTotalHint) return;
  const totalLabel = `${t("profit.totalLabel")} ${totalPct.toFixed(1)}%`;
  refs.profitTotalHint.classList.remove("is-warning", "is-ok");

  if (Math.abs(totalPct - 100) < 0.05) {
    refs.profitTotalHint.textContent = `${totalLabel} — ${t("profit.totalOk")}`;
    refs.profitTotalHint.classList.add("is-ok");
    return;
  }

  refs.profitTotalHint.textContent = `${totalLabel} — ${t("profit.totalWarn").replace("{total}", totalPct.toFixed(1))}`;
  refs.profitTotalHint.classList.add("is-warning");
}

boot().catch((error) => {
  console.error(error);
  window.alert(t("errors.boot"));
});

async function boot() {
  i18n.applyPageTranslations();
  i18n.initLangSwitchers();
  i18n.onChange(() => {
    i18n.applyPageTranslations();
    refreshProfileLabel();
    renderProfitDistribution();
    render();
  });

  initProfitDistribution();

  const now = todayISO();
  refs.expenseDate.value = now;
  refs.incomeDate.value = now;
  if (refs.documentDate) refs.documentDate.value = now;
  initPeriodMonth();
  refs.newCategoryBtn.addEventListener("click", handleNewCategory);
  if (refs.editCategoryBtn) refs.editCategoryBtn.addEventListener("click", handleEditCategory);
  if (refs.deleteCategoryBtn) refs.deleteCategoryBtn.addEventListener("click", handleDeleteCategory);
  if (refs.newClientBtn) refs.newClientBtn.addEventListener("click", handleNewClient);
  if (refs.editClientBtn) refs.editClientBtn.addEventListener("click", handleEditClient);
  if (refs.deleteClientBtn) refs.deleteClientBtn.addEventListener("click", handleDeleteClient);
  refs.expenseForm.addEventListener("submit", handleExpenseSubmit);
  refs.incomeForm.addEventListener("submit", handleIncomeSubmit);
  if (refs.documentForm) refs.documentForm.addEventListener("submit", handleDocumentSubmit);
  if (refs.clearPaymentFormBtn) refs.clearPaymentFormBtn.addEventListener("click", clearPaymentForm);
  initExpensePaymentSync();
  refs.clearFilters.addEventListener("click", clearFilters);
  refs.logoutBtn.addEventListener("click", () => logout(true));
  refs.exportExcelBtn.addEventListener("click", exportExcel);
  refs.exportPdfBtn.addEventListener("click", exportPdf);
  if (refs.exportPendingPdfBtn) refs.exportPendingPdfBtn.addEventListener("click", exportPendingPaymentsPdf);
  if (refs.balanceAlertOk) refs.balanceAlertOk.addEventListener("click", hideBalanceAlert);
  if (refs.balanceAlertOverlay) {
    refs.balanceAlertOverlay.addEventListener("click", (event) => {
      if (event.target === refs.balanceAlertOverlay) hideBalanceAlert();
    });
  }
  if (refs.resetExperimentalBtn) {
    refs.resetExperimentalBtn.addEventListener("click", showResetExperimentalModal);
  }
  if (refs.resetExperimentalCancel) {
    refs.resetExperimentalCancel.addEventListener("click", hideResetExperimentalModal);
  }
  if (refs.resetExperimentalOverlay) {
    refs.resetExperimentalOverlay.addEventListener("click", (event) => {
      if (event.target === refs.resetExperimentalOverlay) hideResetExperimentalModal();
    });
  }
  if (refs.resetExperimentalForm) {
    refs.resetExperimentalForm.addEventListener("submit", handleResetExperimentalSubmit);
  }
  if (refs.listManageCancel) refs.listManageCancel.addEventListener("click", closeListManageModal);
  if (refs.listManageOverlay) {
    refs.listManageOverlay.addEventListener("click", (event) => {
      if (event.target === refs.listManageOverlay) closeListManageModal();
    });
  }
  if (refs.listManageSelect) {
    refs.listManageSelect.addEventListener("change", syncListManageFromSelect);
  }
  if (refs.listManageForm) {
    refs.listManageForm.addEventListener("submit", handleListManageSubmit);
  }
  if (refs.authForm) refs.authForm.addEventListener("submit", handleAuthSubmit);

  [refs.filterPerson, refs.filterStatus, refs.filterStartDate, refs.filterEndDate].forEach(
    (el) => el.addEventListener("change", render)
  );
  [
    refs.paymentFilterStartDate,
    refs.paymentFilterEndDate,
  ]
    .filter(Boolean)
    .forEach((el) => el.addEventListener("change", render));
  if (refs.paymentClearFilters) refs.paymentClearFilters.addEventListener("click", clearPaymentFilters);

  if (refs.periodMonth) {
    refs.periodMonth.addEventListener("change", () => {
      persistPeriodMonth(refs.periodMonth.value);
      applyPeriodMonthToDateFilters();
      render();
    });
  }

  renderPeriodHeader();

  const cached = readSessionCache();
  if (cached) {
    state.session = cached;
    showAuthedUi();
    try {
      await fetchBootstrap();
      ensureBootstrapPolling();
      return;
    } catch {
      logout(false);
    }
  }
  showAuthUi();
}

async function loginWithPassword(profile, password) {
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile, password: password ?? "" }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      showAuthError(i18n.translateApiError(data.error) || t("errors.login"));
      return;
    }
    state.session = { token: data.token, profile: data.profile };
    persistSessionCache();
    showAuthedUi();
    await fetchBootstrap();
    ensureBootstrapPolling();
  } catch (error) {
    console.error(error);
    showAuthError(t("errors.connection"));
  }
}

function logout(showOverlay) {
  state.session = null;
  stopBootstrapPolling();
  if (state.socket) {
    state.socket.disconnect();
    state.socket = null;
  }
  window.localStorage.removeItem(sessionCacheKey);
  if (showOverlay) showAuthUi();
}

function showAuthUi() {
  refs.authOverlay.classList.remove("hidden");
  refreshProfileLabel(true);
  if (refs.authForm) refs.authForm.reset();
  if (refs.authPassword) refs.authPassword.value = "";
  hideAuthError();
}

function refreshProfileLabel(signedOut = false) {
  if (!refs.activeProfile) return;
  if (signedOut || !state.session?.profile) {
    refs.activeProfile.textContent = `${t("session.profile")}: -`;
    return;
  }
  refs.activeProfile.textContent = `${t("session.profile")}: ${state.session.profile}`;
}

function showAuthError(message) {
  if (!refs.authError) return;
  refs.authError.textContent = message;
  refs.authError.classList.remove("hidden");
}

function hideAuthError() {
  if (!refs.authError) return;
  refs.authError.textContent = "";
  refs.authError.classList.add("hidden");
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  hideAuthError();
  const profile = refs.loginProfile ? refs.loginProfile.value : "";
  if (!profile) {
    showAuthError(t("errors.pickProfile"));
    return;
  }
  await loginWithPassword(profile, refs.authPassword ? refs.authPassword.value : "");
}

function showAuthedUi() {
  refs.authOverlay.classList.add("hidden");
  refreshProfileLabel();
  if (refs.expensePerson) refs.expensePerson.value = state.session.profile;
  if (refs.expensePayer) refs.expensePayer.value = state.session.profile;
  if (refs.expenseCurrency) refs.expenseCurrency.value = DEFAULT_CURRENCY;
  if (refs.incomeCurrency) refs.incomeCurrency.value = DEFAULT_CURRENCY;
}

function resolveCurrency(item) {
  const currency = String(item?.currency || DEFAULT_CURRENCY).trim().toUpperCase();
  return CURRENCY_CODES.includes(currency) ? currency : DEFAULT_CURRENCY;
}

function emptyCurrencyBalances() {
  return { EUR: 0, USD: 0, QAR: 0 };
}

function sumAmountsByCurrency(items, predicate) {
  const sums = emptyCurrencyBalances();
  for (const item of items) {
    if (!predicate(item)) continue;
    sums[resolveCurrency(item)] += Number(item.amount || 0);
  }
  return sums;
}

function addCurrencyBalances(a, b) {
  const out = emptyCurrencyBalances();
  for (const code of CURRENCY_CODES) {
    out[code] = (a[code] || 0) + (b[code] || 0);
  }
  return out;
}

function getAccountBalances() {
  const raw = state.summary?.accountBalances;
  if (raw && typeof raw === "object") {
    return {
      EUR: Number(raw.EUR) || 0,
      USD: Number(raw.USD) || 0,
      QAR: Number(raw.QAR) || 0,
    };
  }
  return { EUR: Number(state.summary?.accountBalance) || 0, USD: 0, QAR: 0 };
}

function renderCurrencySummary(el, sums, options = {}) {
  if (!el) return;
  const hideZero = Boolean(options.hideZero);
  const codes = hideZero ? CURRENCY_CODES.filter((code) => (sums[code] || 0) !== 0) : CURRENCY_CODES;
  const displayCodes = codes.length > 0 ? codes : [DEFAULT_CURRENCY];
  el.innerHTML = displayCodes
    .map((code) => {
      const value = sums[code] || 0;
      const negative = value < 0 ? " negative" : "";
      return `<span class="summary-currency-line${negative}">${escapeHtml(formatMoney(value, code))}</span>`;
    })
    .join("");
}

function formatPendingByCurrency(items) {
  const sums = sumAmountsByCurrency(items, () => true);
  const parts = CURRENCY_CODES.filter((code) => sums[code] > 0).map((code) =>
    formatMoney(sums[code], code)
  );
  return parts.length > 0 ? parts.join(" · ") : formatMoney(0, DEFAULT_CURRENCY);
}

function resolveExpensePayer(expense) {
  const payer = String(expense?.payer || "").trim();
  if (payer === "Cris" || payer === "Alex" || payer === "Studio9") return payer;
  return expense?.person === "Alex" ? "Alex" : "Cris";
}

function isReimbursementExpense(expense) {
  const payer = resolveExpensePayer(expense);
  return payer === "Cris" || payer === "Alex";
}

function buildPaymentItems() {
  const docs = (state.documents || [])
    .filter((item) => item.paid)
    .map((item) => ({
      kind: "document",
      id: item.id,
      date: item.date,
      label: item.label,
      amount: item.amount,
      currency: DEFAULT_CURRENCY,
    }));
  const studio9 = (state.expenses || [])
    .filter((item) => resolveExpensePayer(item) === "Studio9" && item.paid)
    .map((item) => ({
      kind: "expense",
      id: item.id,
      date: item.date,
      label: `${item.category} — ${item.description}`,
      amount: item.amount,
      currency: resolveCurrency(item),
    }));
  return [...docs, ...studio9];
}

function filterPaymentItemsByDate(items, startDate, endDate) {
  return items.filter((item) => {
    const startOk = !startDate || item.date >= startDate;
    const endOk = !endDate || item.date <= endDate;
    return startOk && endOk;
  });
}

function getFilteredPaymentItems() {
  const startDate = refs.paymentFilterStartDate ? refs.paymentFilterStartDate.value : "";
  const endDate = refs.paymentFilterEndDate ? refs.paymentFilterEndDate.value : "";
  return filterPaymentItemsByDate(buildPaymentItems(), startDate, endDate);
}

function getPaymentItemsInRange(startDate, endDate) {
  return filterPaymentItemsByDate(buildPaymentItems(), startDate, endDate);
}

function buildExpensePaymentLabel(category, description) {
  const cat = String(category || "").trim();
  const desc = String(description || "").trim();
  if (cat && desc) return `${cat} — ${desc}`;
  return desc || cat;
}

function isStudio9PayerSelected() {
  return Boolean(refs.expensePayer && refs.expensePayer.value === "Studio9");
}

function setPaymentFormReadonly(readonly) {
  [refs.documentDate, refs.documentAmount, refs.documentLabel].forEach((el) => {
    if (el) el.readOnly = readonly;
  });
  if (refs.documentForm) refs.documentForm.classList.toggle("payment-form--readonly", readonly);
}

function showPaymentFormStatus(message, mode = "completed") {
  if (!refs.paymentFormStatus) return;
  refs.paymentFormStatus.textContent = message;
  refs.paymentFormStatus.classList.remove("hidden", "preview", "completed");
  refs.paymentFormStatus.classList.add(mode === "preview" ? "preview" : "completed");
}

function hidePaymentFormStatus() {
  if (!refs.paymentFormStatus) refs.paymentFormStatus.classList.add("hidden");
}

function fillPaymentFormFromExpense({ date, amount, category, description, currency }, options = {}) {
  const { readonly = false, completed = false } = options;
  if (refs.documentDate) refs.documentDate.value = date || "";
  if (refs.documentAmount) refs.documentAmount.value = amount != null && amount !== "" ? String(amount) : "";
  if (refs.documentLabel) refs.documentLabel.value = buildExpensePaymentLabel(category, description);

  setPaymentFormReadonly(readonly);

  if (refs.documentSubmitBtn) refs.documentSubmitBtn.classList.toggle("hidden", readonly);
  if (refs.clearPaymentFormBtn) refs.clearPaymentFormBtn.classList.toggle("hidden", !completed);

  if (completed) {
    showPaymentFormStatus(
      t("payments.studio9Completed").replace("{amount}", formatMoney(amount, currency || DEFAULT_CURRENCY)),
      "completed"
    );
  } else if (readonly) {
    const money = amount ? formatMoney(amount, currency || DEFAULT_CURRENCY) : "";
    const preview = money
      ? t("payments.studio9PreviewAmount").replace("{amount}", money)
      : t("payments.studio9Preview");
    showPaymentFormStatus(preview, "preview");
  } else {
    hidePaymentFormStatus();
  }
}

function resetPaymentFormEditable() {
  setPaymentFormReadonly(false);
  if (refs.documentSubmitBtn) refs.documentSubmitBtn.classList.remove("hidden");
  if (refs.clearPaymentFormBtn) refs.clearPaymentFormBtn.classList.add("hidden");
  hidePaymentFormStatus();
}

function clearPaymentForm() {
  paymentFormStudio9Locked = false;
  if (refs.documentForm) refs.documentForm.reset();
  if (refs.documentDate) refs.documentDate.value = todayISO();
  resetPaymentFormEditable();
}

function syncPaymentFormFromExpenseForm() {
  if (paymentFormStudio9Locked) return;
  if (!isStudio9PayerSelected()) {
    resetPaymentFormEditable();
    return;
  }
  fillPaymentFormFromExpense(
    {
      date: refs.expenseDate ? refs.expenseDate.value : "",
      amount: refs.expenseAmount ? refs.expenseAmount.value : "",
      category: refs.expenseCategorySelect ? refs.expenseCategorySelect.value : "",
      description: refs.expenseDescription ? refs.expenseDescription.value : "",
      currency: refs.expenseCurrency ? refs.expenseCurrency.value : DEFAULT_CURRENCY,
    },
    { readonly: true, completed: false }
  );
}

function ensurePaymentDateFilterIncludes(isoDate) {
  if (!isoDate || !refs.paymentFilterStartDate || !refs.paymentFilterEndDate) return;
  const start = refs.paymentFilterStartDate.value;
  const end = refs.paymentFilterEndDate.value;
  if (!start || isoDate < start) refs.paymentFilterStartDate.value = isoDate;
  if (!end || isoDate > end) refs.paymentFilterEndDate.value = isoDate;
}

function initExpensePaymentSync() {
  if (refs.expensePayer) refs.expensePayer.addEventListener("change", syncPaymentFormFromExpenseForm);
  if (refs.expenseCategorySelect) {
    refs.expenseCategorySelect.addEventListener("change", syncPaymentFormFromExpenseForm);
  }
  [refs.expenseDate, refs.expenseAmount, refs.expenseDescription].filter(Boolean).forEach((el) => {
    el.addEventListener("input", syncPaymentFormFromExpenseForm);
  });
  if (refs.expenseCurrency) refs.expenseCurrency.addEventListener("change", syncPaymentFormFromExpenseForm);
}

async function fetchBootstrap() {
  const response = await apiFetch("/api/bootstrap");
  applyBootstrapPayload(response);
}

function applyBootstrapPayload(response) {
  state.expenses = Array.isArray(response.expenses) ? response.expenses : [];
  state.incomes = Array.isArray(response.incomes) ? response.incomes : [];
  state.categories = Array.isArray(response.categories) ? response.categories : [];
  state.clients = Array.isArray(response.clients) ? response.clients : [];
  state.documents = Array.isArray(response.documents) ? response.documents : [];
  state.activities = Array.isArray(response.activities) ? response.activities : [];
  state.summary = response.summary || {
    accountBalance: 0,
    accountBalances: emptyCurrencyBalances(),
    nextExpenseSeq: 1,
  };
  const balances = state.summary.accountBalances || {};
  state.summary.accountBalances = {
    EUR: Number(balances.EUR) || 0,
    USD: Number(balances.USD) || 0,
    QAR: Number(balances.QAR) || 0,
  };
  state.summary.accountBalance = Number(state.summary.accountBalances.EUR) || 0;
  render();
}

async function mutateAndRefresh(request) {
  try {
    const response = await request();
    applyBootstrapPayload(response);
    return true;
  } catch (error) {
    window.alert(parseApiErrorMessage(error));
    return false;
  }
}

function getAccountBalance() {
  return getAccountBalances().EUR;
}

function canAffordPayment(amount, currency = DEFAULT_CURRENCY) {
  const code = resolveCurrency({ currency });
  const balance = getAccountBalances()[code] || 0;
  return Math.round(balance * 100) >= Math.round(Number(amount) * 100);
}

function showBalanceAlert() {
  if (!refs.balanceAlertOverlay) return;
  refs.balanceAlertOverlay.classList.remove("hidden");
}

function hideBalanceAlert() {
  if (!refs.balanceAlertOverlay) return;
  refs.balanceAlertOverlay.classList.add("hidden");
}

function showResetExperimentalModal() {
  if (!refs.resetExperimentalOverlay) return;
  if (refs.resetExperimentalForm) refs.resetExperimentalForm.reset();
  if (refs.resetExperimentalError) {
    refs.resetExperimentalError.textContent = "";
    refs.resetExperimentalError.classList.add("hidden");
  }
  refs.resetExperimentalOverlay.classList.remove("hidden");
  if (refs.resetConfirmPhrase) refs.resetConfirmPhrase.focus();
}

function hideResetExperimentalModal() {
  if (!refs.resetExperimentalOverlay) return;
  refs.resetExperimentalOverlay.classList.add("hidden");
  if (refs.resetExperimentalForm) refs.resetExperimentalForm.reset();
  if (refs.resetExperimentalError) {
    refs.resetExperimentalError.textContent = "";
    refs.resetExperimentalError.classList.add("hidden");
  }
}

function resetLocalPreferences() {
  try {
    window.localStorage.removeItem(profitSplitsStorageKey);
  } catch {
    /* ignore */
  }
  if (refs.profitPctCris) refs.profitPctCris.value = defaultProfitSplits.cris;
  if (refs.profitPctAlex) refs.profitPctAlex.value = defaultProfitSplits.alex;
  if (refs.profitPctStudio9) refs.profitPctStudio9.value = defaultProfitSplits.studio9;
  if (refs.profitPctCharity) refs.profitPctCharity.value = defaultProfitSplits.charity;
  if (refs.profitAmount) refs.profitAmount.value = "";
  renderProfitDistribution();
}

async function handleResetExperimentalSubmit(event) {
  event.preventDefault();
  if (!refs.resetConfirmPhrase || !refs.resetConfirmPassword) return;

  const confirmPhrase = refs.resetConfirmPhrase.value.trim();
  const password = refs.resetConfirmPassword.value;
  if (confirmPhrase.toUpperCase() !== "REPOS") {
    if (refs.resetExperimentalError) {
      refs.resetExperimentalError.textContent = t("admin.reset.invalidPhrase");
      refs.resetExperimentalError.classList.remove("hidden");
    }
    return;
  }

  const secondConfirm = window.confirm(t("admin.reset.finalConfirm"));
  if (!secondConfirm) return;

  if (refs.resetExperimentalError) {
    refs.resetExperimentalError.textContent = "";
    refs.resetExperimentalError.classList.add("hidden");
  }

  const ok = await mutateAndRefresh(() =>
    apiFetch("/api/admin/reset-data", {
      method: "POST",
      body: JSON.stringify({ confirmPhrase, password }),
    })
  );
  if (!ok) return;

  resetLocalPreferences();
  hideResetExperimentalModal();
  window.alert(t("admin.reset.success"));
}

function isInsufficientBalanceError(error) {
  const msg = String(error?.message || "").trim();
  if (!msg) return false;
  try {
    const parsed = JSON.parse(msg);
    if (parsed?.error?.includes("Saldo insuficiente")) return true;
  } catch {
    /* not json */
  }
  return msg.includes("Saldo insuficiente");
}

function renderPaymentSwitch(checked, toggleAttr, toggleValue, ariaLabel, extraClass = "") {
  const checkedAttr = checked ? "checked" : "";
  const extra = extraClass ? ` ${extraClass}` : "";
  return `
    <label class="payment-switch payment-switch--rg${extra}">
      <span class="payment-switch-side off">${escapeHtml(t("status.unpaid"))}</span>
      <input type="checkbox" ${toggleAttr}="${escapeHtml(String(toggleValue))}" ${checkedAttr} aria-label="${escapeHtml(ariaLabel)}" />
      <span class="payment-switch-side on">${escapeHtml(t("status.paid"))}</span>
    </label>
  `;
}

async function toggleDocumentPayment(docId, input) {
  const doc = (state.documents || []).find((item) => item.id === docId);
  if (!doc) return;
  const paying = input.checked && !doc.paid;
  if (paying && !canAffordPayment(doc.amount)) {
    input.checked = false;
    showBalanceAlert();
    return;
  }
  try {
    const response = await apiFetch(`/api/documents/${docId}/toggle-paid`, { method: "PATCH" });
    applyBootstrapPayload(response);
  } catch (error) {
    input.checked = !input.checked;
    if (isInsufficientBalanceError(error)) {
      showBalanceAlert();
      return;
    }
    window.alert(parseApiErrorMessage(error));
  }
}

async function toggleExpensePayment(expenseId, input) {
  const expense = state.expenses.find((item) => item.id === expenseId);
  if (!expense) return;
  const paying = input.checked && !expense.paid;
  if (paying && !canAffordPayment(expense.amount, resolveCurrency(expense))) {
    input.checked = false;
    showBalanceAlert();
    return;
  }
  try {
    const response = await apiFetch(`/api/expenses/${expenseId}/toggle`, { method: "PATCH" });
    applyBootstrapPayload(response);
  } catch (error) {
    input.checked = !input.checked;
    if (isInsufficientBalanceError(error)) {
      showBalanceAlert();
      return;
    }
    window.alert(parseApiErrorMessage(error));
  }
}

function getFilteredDocuments() {
  return getFilteredPaymentItems().filter((item) => item.kind === "document");
}

function getPendingDocumentsInRange(startDate, endDate) {
  return getPaymentItemsInRange(startDate, endDate);
}

function getSelectedCategory() {
  return refs.expenseCategorySelect ? refs.expenseCategorySelect.value.trim() : "";
}

function getSelectedClient() {
  return refs.incomeClientSelect ? refs.incomeClientSelect.value.trim() : "";
}

function getListManageItems(kind) {
  return kind === "client" ? [...state.clients] : [...state.categories];
}

function getListManageSelection(kind) {
  const current = kind === "client" ? getSelectedClient() : getSelectedCategory();
  const items = getListManageItems(kind);
  if (current && items.includes(current)) return current;
  return items[0] || "";
}

function setListManageError(message) {
  if (!refs.listManageError) return;
  if (!message) {
    refs.listManageError.textContent = "";
    refs.listManageError.classList.add("hidden");
    return;
  }
  refs.listManageError.textContent = message;
  refs.listManageError.classList.remove("hidden");
}

function updateListManageDeleteMessage() {
  if (!listManageState || listManageState.action !== "delete" || !refs.listManageMessage) return;
  const selected = refs.listManageSelect ? refs.listManageSelect.value : "";
  const key = listManageState.kind === "client" ? "client.deleteConfirm" : "category.deleteConfirm";
  refs.listManageMessage.textContent = t(key).replace("{name}", selected);
}

function syncListManageFromSelect() {
  if (!listManageState || !refs.listManageSelect) return;
  const selected = refs.listManageSelect.value;
  if (listManageState.action === "edit" && refs.listManageInput) {
    refs.listManageInput.value = selected;
  }
  if (listManageState.action === "delete") {
    updateListManageDeleteMessage();
  }
}

function closeListManageModal() {
  if (!refs.listManageOverlay) return;
  refs.listManageOverlay.classList.add("hidden");
  listManageState = null;
  if (refs.listManageForm) refs.listManageForm.reset();
  setListManageError("");
  if (refs.listManageMessage) refs.listManageMessage.classList.add("hidden");
}

function openListManageModal(kind, action) {
  if (!refs.listManageOverlay) return;
  const items = getListManageItems(kind);
  listManageState = { kind, action };

  const titleKey =
    kind === "client"
      ? { new: "manage.newClientTitle", edit: "manage.editClientTitle", delete: "manage.deleteClientTitle" }
      : { new: "manage.newCategoryTitle", edit: "manage.editCategoryTitle", delete: "manage.deleteCategoryTitle" };
  if (refs.listManageTitle) refs.listManageTitle.textContent = t(titleKey[action]);

  const emptyKey = kind === "client" ? "manage.emptyClients" : "manage.emptyCategories";
  const needsItems = action === "edit" || action === "delete";
  if (needsItems && items.length === 0) {
    if (refs.listManageSelectWrap) refs.listManageSelectWrap.classList.add("hidden");
    if (refs.listManageInputWrap) refs.listManageInputWrap.classList.add("hidden");
    if (refs.listManageMessage) {
      refs.listManageMessage.textContent = t(emptyKey);
      refs.listManageMessage.classList.remove("hidden");
    }
    if (refs.listManageSubmit) {
      refs.listManageSubmit.disabled = true;
      refs.listManageSubmit.classList.remove("btn-primary--danger");
      refs.listManageSubmit.classList.add("btn-primary");
      refs.listManageSubmit.textContent = t("manage.save");
    }
    setListManageError("");
    refs.listManageOverlay.classList.remove("hidden");
    return;
  }

  if (refs.listManageSelectWrap) {
    refs.listManageSelectWrap.classList.toggle("hidden", action === "new");
  }
  if (refs.listManageInputWrap) {
    refs.listManageInputWrap.classList.toggle("hidden", action === "delete");
  }
  if (refs.listManageMessage) {
    refs.listManageMessage.classList.toggle("hidden", action !== "delete");
  }

  if (refs.listManageSelectLabel) {
    refs.listManageSelectLabel.textContent =
      kind === "client" ? t("manage.selectClient") : t("manage.selectCategory");
  }
  if (refs.listManageInputLabel) {
    refs.listManageInputLabel.textContent = t("manage.name");
  }

  if (refs.listManageSelect && action !== "new") {
    refs.listManageSelect.innerHTML = items
      .map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`)
      .join("");
    refs.listManageSelect.value = getListManageSelection(kind);
  }

  if (refs.listManageInput) {
    if (action === "new") {
      refs.listManageInput.value = "";
    } else if (action === "edit") {
      refs.listManageInput.value = refs.listManageSelect ? refs.listManageSelect.value : "";
    }
  }

  if (action === "delete") {
    updateListManageDeleteMessage();
  }

  if (refs.listManageSubmit) {
    refs.listManageSubmit.disabled = false;
    const isDelete = action === "delete";
    refs.listManageSubmit.textContent = isDelete ? t("manage.deleteAction") : t("manage.save");
    refs.listManageSubmit.classList.toggle("btn-primary--danger", isDelete);
    refs.listManageSubmit.classList.toggle("btn-primary", !isDelete);
  }

  setListManageError("");
  refs.listManageOverlay.classList.remove("hidden");
  if (action === "new" && refs.listManageInput) {
    refs.listManageInput.focus();
  } else if (action === "edit" && refs.listManageInput) {
    refs.listManageInput.focus();
    refs.listManageInput.select();
  } else if (refs.listManageSelect) {
    refs.listManageSelect.focus();
  }
}

async function handleListManageSubmit(event) {
  event.preventDefault();
  if (!listManageState) return;

  const { kind, action } = listManageState;
  const items = getListManageItems(kind);
  setListManageError("");

  if ((action === "edit" || action === "delete") && items.length === 0) {
    closeListManageModal();
    return;
  }

  if (action === "new") {
    const value = refs.listManageInput ? refs.listManageInput.value.trim() : "";
    if (!value) return;
    let ok = false;
    if (kind === "client") {
      ok = await runClientMutation(
        () =>
          apiFetch("/api/clients", {
            method: "POST",
            body: JSON.stringify({ client: value }),
          }),
        value,
        setListManageError
      );
    } else {
      ok = await runCategoryMutation(
        () =>
          apiFetch("/api/categories", {
            method: "POST",
            body: JSON.stringify({ category: value }),
          }),
        value,
        setListManageError
      );
    }
    if (ok) closeListManageModal();
    return;
  }

  const current = refs.listManageSelect ? refs.listManageSelect.value.trim() : "";
  if (!current) return;

  if (action === "edit") {
    const next = refs.listManageInput ? refs.listManageInput.value.trim() : "";
    if (!next || next === current) return;
    let ok = false;
    if (kind === "client") {
      ok = await runClientMutation(
        () =>
          apiFetch("/api/clients", {
            method: "PATCH",
            body: JSON.stringify({ oldName: current, newName: next }),
          }),
        next,
        setListManageError
      );
    } else {
      ok = await runCategoryMutation(
        () =>
          apiFetch("/api/categories", {
            method: "PATCH",
            body: JSON.stringify({ oldName: current, newName: next }),
          }),
        next,
        setListManageError
      );
    }
    if (ok) closeListManageModal();
    return;
  }

  if (action === "delete") {
    let ok = false;
    if (kind === "client") {
      ok = await runClientMutation(
        () =>
          apiFetch("/api/clients", {
            method: "DELETE",
            body: JSON.stringify({ client: current }),
          }),
        null,
        setListManageError
      );
    } else {
      ok = await runCategoryMutation(
        () =>
          apiFetch("/api/categories", {
            method: "DELETE",
            body: JSON.stringify({ category: current }),
          }),
        null,
        setListManageError
      );
    }
    if (ok) closeListManageModal();
  }
}

async function runCategoryMutation(request, selectedAfter, onError) {
  try {
    const response = await request();
    applyBootstrapPayload(response);
    if (selectedAfter && refs.expenseCategorySelect && state.categories.includes(selectedAfter)) {
      refs.expenseCategorySelect.value = selectedAfter;
    }
    return true;
  } catch (error) {
    const message = parseApiErrorMessage(error);
    if (onError) onError(message);
    else window.alert(message);
    return false;
  }
}

function parseApiErrorMessage(error) {
  const raw = String(error?.message || "").trim();
  if (!raw) return t("errors.connection");
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.error) return i18n.translateApiError(parsed.error) || parsed.error;
  } catch {
    /* not json */
  }
  return i18n.translateApiError(raw) || raw;
}

async function handleNewCategory() {
  openListManageModal("category", "new");
}

async function handleEditCategory() {
  openListManageModal("category", "edit");
}

async function handleDeleteCategory() {
  openListManageModal("category", "delete");
}

async function runClientMutation(request, selectedAfter, onError) {
  try {
    const response = await request();
    applyBootstrapPayload(response);
    if (selectedAfter && refs.incomeClientSelect && state.clients.includes(selectedAfter)) {
      refs.incomeClientSelect.value = selectedAfter;
    }
    return true;
  } catch (error) {
    const message = parseApiErrorMessage(error);
    if (onError) onError(message);
    else window.alert(message);
    return false;
  }
}

async function handleNewClient() {
  openListManageModal("client", "new");
}

async function handleEditClient() {
  openListManageModal("client", "edit");
}

async function handleDeleteClient() {
  openListManageModal("client", "delete");
}

function ensureBootstrapPolling() {
  stopBootstrapPolling();
  bootstrapPollTimer = window.setInterval(async () => {
    if (!state.session?.token) return;
    try {
      await fetchBootstrap();
    } catch (error) {
      console.error(error);
    }
  }, bootstrapPollMs);
}

function stopBootstrapPolling() {
  if (bootstrapPollTimer) {
    window.clearInterval(bootstrapPollTimer);
    bootstrapPollTimer = null;
  }
}

async function handleExpenseSubmit(event) {
  event.preventDefault();
  const category = refs.expenseCategorySelect.value.trim();
  const description = refs.expenseDescription.value.trim();
  const amount = Number(refs.expenseAmount.value);
  const date = refs.expenseDate.value;
  const payer = refs.expensePayer ? refs.expensePayer.value : "";
  const currency = refs.expenseCurrency ? refs.expenseCurrency.value : DEFAULT_CURRENCY;
  if (!category || !description || !amount || !date) return;

  if (payer === "Studio9" && !canAffordPayment(amount, currency)) {
    showBalanceAlert();
    return;
  }

  const ok = await mutateAndRefresh(() =>
    apiFetch("/api/expenses", {
      method: "POST",
      body: JSON.stringify({
        person: refs.expensePerson.value,
        payer,
        currency,
        date,
        amount,
        category,
        description,
        paid: payer === "Studio9",
      }),
    })
  );
  if (!ok) return;

  if (payer === "Studio9") {
    paymentFormStudio9Locked = true;
    fillPaymentFormFromExpense(
      { date, amount, category, description, currency },
      { readonly: true, completed: true }
    );
    ensurePaymentDateFilterIncludes(date);
    if (refs.paymentsPanel) {
      refs.paymentsPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  refs.expenseForm.reset();
  refs.expenseDate.value = todayISO();
  if (refs.expensePerson) refs.expensePerson.value = state.session.profile;
  if (refs.expensePayer) refs.expensePayer.value = state.session.profile;
  if (refs.expenseCurrency) refs.expenseCurrency.value = DEFAULT_CURRENCY;
}

async function handleIncomeSubmit(event) {
  event.preventDefault();
  const amount = Number(refs.incomeAmount.value);
  const date = refs.incomeDate.value;
  const client = getSelectedClient();
  const currency = refs.incomeCurrency ? refs.incomeCurrency.value : DEFAULT_CURRENCY;
  if (!amount || !date || !client) return;

  const ok = await mutateAndRefresh(() =>
    apiFetch("/api/incomes", {
      method: "POST",
      body: JSON.stringify({ amount, date, client, currency }),
    })
  );
  if (!ok) return;

  refs.incomeForm.reset();
  refs.incomeDate.value = todayISO();
  if (refs.incomeCurrency) refs.incomeCurrency.value = DEFAULT_CURRENCY;
  selectDefaultIncomeClient();
}

async function handleDocumentSubmit(event) {
  event.preventDefault();
  if (refs.documentDate?.readOnly) return;
  const label = refs.documentLabel.value.trim();
  const amount = Number(refs.documentAmount.value);
  const date = refs.documentDate.value;
  if (!label || !amount || !date) return;

  if (!canAffordPayment(amount, DEFAULT_CURRENCY)) {
    showBalanceAlert();
    return;
  }

  const ok = await mutateAndRefresh(() =>
    apiFetch("/api/documents", {
      method: "POST",
      body: JSON.stringify({ label, amount, date }),
    })
  );
  if (!ok) return;

  clearPaymentForm();
}

function clearFilters() {
  refs.filterPerson.value = "all";
  refs.filterStatus.value = "unpaid";
  applyPeriodMonthToDateFilters();
  render();
}

function clearPaymentFilters() {
  applyPeriodMonthToDateFilters();
  render();
}

function render() {
  renderPeriodHeader();
  renderCategories();
  renderClients();
  renderExpenseSeqPreview();
  renderTotals();
  renderPaymentPanel();
  renderTable();
  renderActivities();
}

function renderExpenseSeqPreview() {
  if (!refs.expenseSeqPreview) return;
  const next = Number(state.summary?.nextExpenseSeq) || 1;
  refs.expenseSeqPreview.value = String(next);
}

function renderCategories() {
  const current = refs.expenseCategorySelect.value;
  refs.expenseCategorySelect.innerHTML = state.categories
    .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
    .join("");

  if (current && state.categories.includes(current)) {
    refs.expenseCategorySelect.value = current;
    return;
  }
  if (state.categories.length > 0) {
    refs.expenseCategorySelect.value = state.categories[0];
  }
}

function selectDefaultIncomeClient() {
  if (!refs.incomeClientSelect || state.clients.length === 0) return;
  if (state.clients.includes(defaultIncomeClient)) {
    refs.incomeClientSelect.value = defaultIncomeClient;
    return;
  }
  refs.incomeClientSelect.value = state.clients[0];
}

function renderClients() {
  if (!refs.incomeClientSelect) return;
  const current = refs.incomeClientSelect.value;
  refs.incomeClientSelect.innerHTML = state.clients
    .map((client) => `<option value="${escapeHtml(client)}">${escapeHtml(client)}</option>`)
    .join("");

  if (current && state.clients.includes(current)) {
    refs.incomeClientSelect.value = current;
    return;
  }
  selectDefaultIncomeClient();
}

function renderTotals() {
  const bounds = getSelectedMonthBounds();
  const inMonth = (isoDate) => {
    if (!bounds || !isoDate) return false;
    return isoDate >= bounds.start && isoDate <= bounds.end;
  };

  const totalEntradas = sumAmountsByCurrency(state.incomes, (item) => inMonth(item.date));
  const docsAsEur = (state.documents || []).map((item) => ({ ...item, currency: DEFAULT_CURRENCY }));
  const studio9Expenses = sumAmountsByCurrency(
    state.expenses,
    (item) => resolveExpensePayer(item) === "Studio9" && item.paid && inMonth(item.date)
  );
  const studio9Documents = sumAmountsByCurrency(
    docsAsEur,
    (item) => item.paid && inMonth(item.date)
  );
  const pagamentosStudio9 = addCurrencyBalances(studio9Expenses, studio9Documents);
  const pagamentosReembolsar = sumAmountsByCurrency(
    state.expenses,
    (item) => isReimbursementExpense(item) && item.paid && inMonth(item.date)
  );
  const totalSaida = addCurrencyBalances(pagamentosStudio9, pagamentosReembolsar);

  renderCurrencySummary(refs.totalEntradas, totalEntradas);
  renderCurrencySummary(refs.monthStudio9Payments, pagamentosStudio9, { hideZero: true });
  renderCurrencySummary(refs.monthReimbursements, pagamentosReembolsar, { hideZero: true });
  renderCurrencySummary(refs.monthTotalOutflow, totalSaida, { hideZero: true });
  renderCurrencySummary(refs.accountBalanceTotal, getAccountBalances());
}

function renderPaymentPanel() {
  if (!refs.paymentRows || !refs.documentsPendingTotal) return;

  const startDate = refs.paymentFilterStartDate ? refs.paymentFilterStartDate.value : "";
  const endDate = refs.paymentFilterEndDate ? refs.paymentFilterEndDate.value : "";
  const itemsInRange = getPaymentItemsInRange(startDate, endDate);

  refs.documentsPendingTotal.textContent = `${t("payments.periodPrefix")} ${formatPendingByCurrency(itemsInRange)} (${itemsInRange.length})`;
  if (refs.paymentsAccountBalance) {
    const balances = CURRENCY_CODES.map((code) => formatMoney(getAccountBalances()[code], code)).join(" · ");
    refs.paymentsAccountBalance.textContent = `${t("payments.accountBalance")} ${balances}`;
  }

  const rows = getFilteredPaymentItems();
  if (rows.length === 0) {
    refs.paymentRows.innerHTML = `<tr><td colspan="3" class="empty">${escapeHtml(t("table.empty"))}</td></tr>`;
    return;
  }

  refs.paymentRows.innerHTML = rows
    .map((item) => {
      const typeBadge =
        item.kind === "expense"
          ? `<span class="owner-badge owner-badge--small">Studio9</span>`
          : "";
      return `
      <tr>
        <td>${formatDate(item.date)}</td>
        <td>
          <span class="payment-table-label">${escapeHtml(item.label)}</span>
          ${typeBadge}
        </td>
        <td>${formatMoney(item.amount, item.currency)}</td>
      </tr>
    `;
    })
    .join("");
}

function renderActivities() {
  if (!refs.activityList) return;
  const bounds = getSelectedMonthBounds();
  const ym = getSelectedYearMonth();
  const items = state.activities
    .filter((item) => {
      if (!bounds || !item.at) return true;
      return activityTimestampInMonth(item.at, ym.year, ym.month);
    })
    .slice(0, 80);
  if (items.length === 0) {
    const hint = bounds ? t("activity.emptyMonth") : t("activity.emptyAll");
    refs.activityList.innerHTML = `<li class="empty" style="padding:16px;">${escapeHtml(hint)}</li>`;
    return;
  }
  refs.activityList.innerHTML = items
    .map((item) => {
      const typeClass = escapeHtml(item.type || "expense");
      const when = item.at ? formatDateTime(item.at) : "";
      const by = item.by ? escapeHtml(item.by) : "";
      const summary = escapeHtml(item.summary || "");
      return `
        <li class="activity-item ${typeClass}">
          <div>
            <div class="activity-meta">
              ${when}
              ${by ? `<span class="owner-badge owner-badge--small">${by}</span>` : ""}
            </div>
            <p class="activity-summary">${summary}</p>
          </div>
        </li>
      `;
    })
    .join("");
}

function renderTable() {
  const rows = getFilteredExpenses();
  if (rows.length === 0) {
    refs.expenseRows.innerHTML = `<tr><td colspan="7" class="empty">${escapeHtml(t("table.empty"))}</td></tr>`;
    return;
  }

  refs.expenseRows.innerHTML = rows
    .map((item) => {
      const id = escapeHtml(item.id);
      const seq =
        item.seqNumber != null ? escapeHtml(String(item.seqNumber)) : "—";
      const payer = escapeHtml(resolveExpensePayer(item));
      return `
      <tr>
        <td class="td-seq">${seq}</td>
        <td>${formatDate(item.date)}</td>
        <td>${payer}</td>
        <td>${escapeHtml(item.category)}</td>
        <td>${escapeHtml(item.description)}</td>
        <td>${formatMoney(item.amount, item.currency)}</td>
        <td class="td-reembolso">
          ${renderPaymentSwitch(item.paid, "data-expense-toggle", item.id, t("expense.reimbursementAria"), "payment-switch--table")}
        </td>
      </tr>
    `;
    })
    .join("");

  refs.expenseRows.querySelectorAll("[data-expense-toggle]").forEach((input) => {
    input.addEventListener("change", async () => {
      const expenseId = input.getAttribute("data-expense-toggle");
      await toggleExpensePayment(expenseId, input);
    });
  });
}

function getFilteredExpenses() {
  const person = refs.filterPerson.value;
  const status = refs.filterStatus.value;
  const startDate = refs.filterStartDate.value;
  const endDate = refs.filterEndDate.value;
  return state.expenses.filter((item) => {
    if (!isReimbursementExpense(item)) return false;
    const personOk = person === "all" || resolveExpensePayer(item) === person;
    const statusOk =
      status === "all" ||
      (status === "paid" && item.paid) ||
      (status === "unpaid" && !item.paid);
    const startOk = !startDate || item.date >= startDate;
    const endOk = !endDate || item.date <= endDate;
    return personOk && statusOk && startOk && endOk;
  });
}

function exportExcel() {
  const rows = getFilteredExpenses().map((item) => ({
    [t("expense.seqNumber")]: item.seqNumber != null ? item.seqNumber : "",
    [t("table.date")]: formatDate(item.date),
    [t("expense.payer")]: resolveExpensePayer(item),
    [t("table.category")]: item.category,
    [t("table.description")]: item.description,
    [t("currency.label")]: resolveCurrency(item),
    [t("table.amount")]: item.amount,
    [t("table.reimbursement")]: item.paid ? t("status.paid") : t("status.unpaid"),
  }));
  if (rows.length === 0) {
    window.alert(t("errors.exportEmpty"));
    return;
  }
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, t("export.sheetName"));
  XLSX.writeFile(workbook, "studio9-listagem.xlsx");
}

function exportPdf() {
  const rows = getFilteredExpenses().map((item) => [
    item.seqNumber != null ? String(item.seqNumber) : "—",
    formatDate(item.date),
    resolveExpensePayer(item),
    item.category,
    item.description,
    formatMoney(item.amount, resolveCurrency(item)),
    item.paid ? t("status.paid") : t("status.unpaid"),
  ]);
  if (rows.length === 0) {
    window.alert(t("errors.exportEmpty"));
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(t("export.pdfTitle"), 14, 14);
  doc.autoTable({
    head: [
      [
        t("expense.seqNumber"),
        t("table.date"),
        t("expense.payer"),
        t("table.category"),
        t("table.description"),
        t("table.amount"),
        t("table.reimbursement"),
      ],
    ],
    body: rows,
    startY: 20,
    styles: { fontSize: 9 },
  });
  doc.save("studio9-listagem.pdf");
}

function exportPendingPaymentsPdf() {
  const startDate = refs.paymentFilterStartDate ? refs.paymentFilterStartDate.value : "";
  const endDate = refs.paymentFilterEndDate ? refs.paymentFilterEndDate.value : "";
  const items = getPaymentItemsInRange(startDate, endDate);
  if (items.length === 0) {
    window.alert(t("errors.exportEmpty"));
    return;
  }
  const total = formatPendingByCurrency(items);
  const balances = CURRENCY_CODES.map((code) => `${code}: ${formatMoney(getAccountBalances()[code], code)}`).join("  ");
  const rows = items.map((item) => [
    formatDate(item.date),
    item.label,
    formatMoney(item.amount, item.currency),
  ]);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(t("payments.pdfTitle"), 14, 14);
  doc.setFontSize(10);
  doc.text(`${t("payments.pendingPdfBalance")}: ${balances}`, 14, 22);
  doc.text(`${t("payments.periodPrefix")} ${total}`, 14, 28);
  doc.autoTable({
    head: [[t("table.date"), t("payments.description"), t("table.amount")]],
    body: rows,
    startY: 34,
    styles: { fontSize: 9 },
  });
  doc.save("studio9-pagamentos.pdf");
}

async function apiFetch(url, options = {}) {
  if (!state.session?.token) throw new Error("Sessao invalida");
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${state.session.token}`,
    ...(options.headers || {}),
  };
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    logout(true);
    throw new Error("Sessao expirada");
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Erro de API");
  }
  return response.json();
}

function readSessionCache() {
  try {
    const raw = window.localStorage.getItem(sessionCacheKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function persistSessionCache() {
  window.localStorage.setItem(sessionCacheKey, JSON.stringify(state.session));
}

function formatMoney(value, currency = DEFAULT_CURRENCY) {
  return new Intl.NumberFormat(locale(), {
    style: "currency",
    currency: resolveCurrency({ currency }),
  }).format(value || 0);
}

function formatEUR(value) {
  return formatMoney(value, DEFAULT_CURRENCY);
}

function formatDate(isoDate) {
  return new Intl.DateTimeFormat(locale()).format(new Date(isoDate));
}

function formatDateTime(iso) {
  return new Intl.DateTimeFormat(locale(), {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function currentMonthYM() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function initPeriodMonth() {
  if (!refs.periodMonth) return;
  const stored = readPeriodMonth();
  refs.periodMonth.value = stored || currentMonthYM();
  applyPeriodMonthToDateFilters();
}

function readPeriodMonth() {
  try {
    const raw = window.sessionStorage.getItem(periodStorageKey);
    if (!raw || !/^\d{4}-\d{2}$/.test(raw)) return null;
    return raw;
  } catch {
    return null;
  }
}

function persistPeriodMonth(value) {
  try {
    if (value && /^\d{4}-\d{2}$/.test(value)) {
      window.sessionStorage.setItem(periodStorageKey, value);
    }
  } catch {
    /* ignore */
  }
}

function monthBoundsFromYM(ym) {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return null;
  const [yStr, mStr] = ym.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return null;
  const start = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end, year: y, month: m };
}

function getSelectedMonthBounds() {
  if (!refs.periodMonth) return null;
  return monthBoundsFromYM(refs.periodMonth.value);
}

function getSelectedYearMonth() {
  const b = getSelectedMonthBounds();
  if (!b) return { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };
  return { year: b.year, month: b.month };
}

function applyPeriodMonthToDateFilters() {
  const bounds = getSelectedMonthBounds();
  if (!bounds) return;
  if (refs.filterStartDate && refs.filterEndDate) {
    refs.filterStartDate.value = bounds.start;
    refs.filterEndDate.value = bounds.end;
  }
  if (refs.filterStatus) refs.filterStatus.value = "unpaid";
  if (refs.paymentFilterStartDate && refs.paymentFilterEndDate) {
    refs.paymentFilterStartDate.value = bounds.start;
    refs.paymentFilterEndDate.value = bounds.end;
  }
}

function renderPeriodHeader() {
  if (!refs.periodMonthDisplay || !refs.periodMonth) return;
  const ym = refs.periodMonth.value || currentMonthYM();
  const b = monthBoundsFromYM(ym);
  if (!b) {
    refs.periodMonthDisplay.textContent = "";
    return;
  }
  const label = new Intl.DateTimeFormat(locale(), {
    month: "long",
    year: "numeric",
  }).format(new Date(b.year, b.month - 1, 1));
  const capitalized = label.charAt(0).toUpperCase() + label.slice(1);
  refs.periodMonthDisplay.textContent = capitalized;
}

function activityTimestampInMonth(iso, year, month) {
  const d = new Date(iso);
  return d.getFullYear() === year && d.getMonth() + 1 === month;
}
