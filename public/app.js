const state = {
  expenses: [],
  incomes: [],
  documents: [],
  categories: [],
  activities: [],
  summary: { accountBalance: 0, nextExpenseSeq: 1 },
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
  totalPorPagar: document.getElementById("totalPorPagar"),
  totalPago: document.getElementById("totalPago"),
  totalEntradas: document.getElementById("totalEntradas"),
  disponibilidadeAtual: document.getElementById("disponibilidadeAtual"),
  accountBalanceTotal: document.getElementById("accountBalanceTotal"),
  expenseSeqPreview: document.getElementById("expenseSeqPreview"),
  documentForm: document.getElementById("documentForm"),
  documentDate: document.getElementById("documentDate"),
  documentAmount: document.getElementById("documentAmount"),
  documentLabel: document.getElementById("documentLabel"),
  paymentRows: document.getElementById("paymentRows"),
  paymentFilterStatus: document.getElementById("paymentFilterStatus"),
  paymentFilterStartDate: document.getElementById("paymentFilterStartDate"),
  paymentFilterEndDate: document.getElementById("paymentFilterEndDate"),
  paymentClearFilters: document.getElementById("paymentClearFilters"),
  documentsPendingTotal: document.getElementById("documentsPendingTotal"),
  paymentsAccountBalance: document.getElementById("paymentsAccountBalance"),
  exportPendingPdfBtn: document.getElementById("exportPendingPdfBtn"),
  balanceAlertOverlay: document.getElementById("balanceAlertOverlay"),
  balanceAlertOk: document.getElementById("balanceAlertOk"),
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
  expenseDate: document.getElementById("expenseDate"),
  expenseAmount: document.getElementById("expenseAmount"),
  expenseDescription: document.getElementById("expenseDescription"),
  incomeForm: document.getElementById("incomeForm"),
  incomeDate: document.getElementById("incomeDate"),
  incomeAmount: document.getElementById("incomeAmount"),
  incomeSource: document.getElementById("incomeSource"),
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
  refs.expenseForm.addEventListener("submit", handleExpenseSubmit);
  refs.incomeForm.addEventListener("submit", handleIncomeSubmit);
  if (refs.documentForm) refs.documentForm.addEventListener("submit", handleDocumentSubmit);
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
  if (refs.authForm) refs.authForm.addEventListener("submit", handleAuthSubmit);

  [refs.filterPerson, refs.filterStatus, refs.filterStartDate, refs.filterEndDate].forEach(
    (el) => el.addEventListener("change", render)
  );
  [
    refs.paymentFilterStatus,
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
  refs.expensePerson.value = state.session.profile;
}

async function fetchBootstrap() {
  const response = await apiFetch("/api/bootstrap");
  applyBootstrapPayload(response);
}

function applyBootstrapPayload(response) {
  state.expenses = Array.isArray(response.expenses) ? response.expenses : [];
  state.incomes = Array.isArray(response.incomes) ? response.incomes : [];
  state.categories = Array.isArray(response.categories) ? response.categories : [];
  state.documents = Array.isArray(response.documents) ? response.documents : [];
  state.activities = Array.isArray(response.activities) ? response.activities : [];
  state.summary = response.summary || { accountBalance: 0, nextExpenseSeq: 1 };
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
  return Number(state.summary?.accountBalance) || 0;
}

function canAffordPayment(amount) {
  return Math.round(getAccountBalance() * 100) >= Math.round(Number(amount) * 100);
}

function showBalanceAlert() {
  if (!refs.balanceAlertOverlay) return;
  refs.balanceAlertOverlay.classList.remove("hidden");
}

function hideBalanceAlert() {
  if (!refs.balanceAlertOverlay) return;
  refs.balanceAlertOverlay.classList.add("hidden");
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
  if (paying && !canAffordPayment(expense.amount)) {
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
  const status = refs.paymentFilterStatus ? refs.paymentFilterStatus.value : "unpaid";
  const startDate = refs.paymentFilterStartDate ? refs.paymentFilterStartDate.value : "";
  const endDate = refs.paymentFilterEndDate ? refs.paymentFilterEndDate.value : "";
  return (state.documents || []).filter((item) => {
    const statusOk =
      status === "all" ||
      (status === "paid" && item.paid) ||
      (status === "unpaid" && !item.paid);
    const startOk = !startDate || item.date >= startDate;
    const endOk = !endDate || item.date <= endDate;
    return statusOk && startOk && endOk;
  });
}

function getPendingDocumentsInRange(startDate, endDate) {
  return (state.documents || []).filter((item) => {
    if (item.paid) return false;
    const startOk = !startDate || item.date >= startDate;
    const endOk = !endDate || item.date <= endDate;
    return startOk && endOk;
  });
}

function getSelectedCategory() {
  return refs.expenseCategorySelect ? refs.expenseCategorySelect.value.trim() : "";
}

async function runCategoryMutation(request, selectedAfter) {
  try {
    const response = await request();
    applyBootstrapPayload(response);
    if (selectedAfter && refs.expenseCategorySelect && state.categories.includes(selectedAfter)) {
      refs.expenseCategorySelect.value = selectedAfter;
    }
  } catch (error) {
    window.alert(parseApiErrorMessage(error));
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
  const value = window.prompt(t("category.prompt"));
  if (!value) return;
  const category = value.trim();
  if (!category) return;
  await runCategoryMutation(
    () =>
      apiFetch("/api/categories", {
        method: "POST",
        body: JSON.stringify({ category }),
      }),
    category
  );
}

async function handleEditCategory() {
  const current = getSelectedCategory();
  if (!current) {
    window.alert(t("category.noneSelected"));
    return;
  }
  const value = window.prompt(t("category.editPrompt"), current);
  if (!value) return;
  const next = value.trim();
  if (!next || next === current) return;
  await runCategoryMutation(
    () =>
      apiFetch("/api/categories", {
        method: "PATCH",
        body: JSON.stringify({ oldName: current, newName: next }),
      }),
    next
  );
}

async function handleDeleteCategory() {
  const current = getSelectedCategory();
  if (!current) {
    window.alert(t("category.noneSelected"));
    return;
  }
  const confirmed = window.confirm(t("category.deleteConfirm").replace("{name}", current));
  if (!confirmed) return;
  await runCategoryMutation(
    () =>
      apiFetch("/api/categories", {
        method: "DELETE",
        body: JSON.stringify({ category: current }),
      }),
    null
  );
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
  if (!category || !description || !amount || !date) return;

  const ok = await mutateAndRefresh(() =>
    apiFetch("/api/expenses", {
      method: "POST",
      body: JSON.stringify({
        person: refs.expensePerson.value,
        date,
        amount,
        category,
        description,
        paid: false,
      }),
    })
  );
  if (!ok) return;

  refs.expenseForm.reset();
  refs.expenseDate.value = todayISO();
  refs.expensePerson.value = state.session.profile;
}

async function handleIncomeSubmit(event) {
  event.preventDefault();
  const amount = Number(refs.incomeAmount.value);
  const date = refs.incomeDate.value;
  const source = refs.incomeSource.value.trim();
  if (!amount || !date || !source) return;

  const ok = await mutateAndRefresh(() =>
    apiFetch("/api/incomes", {
      method: "POST",
      body: JSON.stringify({ amount, date, source }),
    })
  );
  if (!ok) return;

  refs.incomeForm.reset();
  refs.incomeDate.value = todayISO();
}

async function handleDocumentSubmit(event) {
  event.preventDefault();
  const label = refs.documentLabel.value.trim();
  const amount = Number(refs.documentAmount.value);
  const date = refs.documentDate.value;
  if (!label || !amount || !date) return;

  const ok = await mutateAndRefresh(() =>
    apiFetch("/api/documents", {
      method: "POST",
      body: JSON.stringify({ label, amount, date }),
    })
  );
  if (!ok) return;

  refs.documentForm.reset();
  refs.documentDate.value = todayISO();
}

function clearFilters() {
  refs.filterPerson.value = "all";
  refs.filterStatus.value = "unpaid";
  applyPeriodMonthToDateFilters();
  render();
}

function clearPaymentFilters() {
  if (refs.paymentFilterStatus) refs.paymentFilterStatus.value = "unpaid";
  applyPeriodMonthToDateFilters();
  render();
}

function render() {
  renderPeriodHeader();
  renderCategories();
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

function renderTotals() {
  const bounds = getSelectedMonthBounds();
  const inMonth = (isoDate) => {
    if (!bounds || !isoDate) return false;
    return isoDate >= bounds.start && isoDate <= bounds.end;
  };

  const totalPorPagar = state.expenses
    .filter((item) => !item.paid && inMonth(item.date))
    .reduce((sum, item) => sum + item.amount, 0);
  const totalPago = state.expenses
    .filter((item) => item.paid && inMonth(item.date))
    .reduce((sum, item) => sum + item.amount, 0);
  const totalEntradas = state.incomes
    .filter((item) => inMonth(item.date))
    .reduce((sum, item) => sum + item.amount, 0);
  const totalDocsPagos = (state.documents || [])
    .filter((item) => item.paid && inMonth(item.date))
    .reduce((sum, item) => sum + item.amount, 0);
  const disponibilidade = totalEntradas - totalPago - totalDocsPagos;

  refs.totalPorPagar.textContent = formatEUR(totalPorPagar);
  refs.totalPago.textContent = formatEUR(totalPago);
  refs.totalEntradas.textContent = formatEUR(totalEntradas);
  if (refs.disponibilidadeAtual) {
    refs.disponibilidadeAtual.textContent = formatEUR(disponibilidade);
  }
  if (refs.accountBalanceTotal) {
    const balance = Number(state.summary?.accountBalance) || 0;
    refs.accountBalanceTotal.textContent = formatEUR(balance);
    refs.accountBalanceTotal.classList.toggle("negative", balance < 0);
  }
}

function renderPaymentPanel() {
  if (!refs.paymentRows || !refs.documentsPendingTotal) return;

  const startDate = refs.paymentFilterStartDate ? refs.paymentFilterStartDate.value : "";
  const endDate = refs.paymentFilterEndDate ? refs.paymentFilterEndDate.value : "";
  const pendingInRange = getPendingDocumentsInRange(startDate, endDate);
  const pendingSum = pendingInRange.reduce((sum, item) => sum + item.amount, 0);

  refs.documentsPendingTotal.textContent = `${t("payments.pendingPrefix")} ${formatEUR(pendingSum)} (${pendingInRange.length})`;
  if (refs.paymentsAccountBalance) {
    refs.paymentsAccountBalance.textContent = `${t("payments.accountBalance")} ${formatEUR(getAccountBalance())}`;
  }

  const rows = getFilteredDocuments();
  if (rows.length === 0) {
    refs.paymentRows.innerHTML = `<tr><td colspan="4" class="empty">${escapeHtml(t("table.empty"))}</td></tr>`;
    return;
  }

  refs.paymentRows.innerHTML = rows
    .map((item) => {
      const by = item.createdBy ? escapeHtml(item.createdBy) : t("misc.system");
      return `
      <tr class="${item.paid ? "paid-row" : ""}">
        <td>${formatDate(item.date)}</td>
        <td>
          <span class="payment-table-label">${escapeHtml(item.label)}</span>
          <span class="owner-badge owner-badge--small">${by}</span>
        </td>
        <td>${formatEUR(item.amount)}</td>
        <td class="td-reembolso">
          ${renderPaymentSwitch(item.paid, "data-doc-toggle", item.id, t("payments.statusAria"), "payment-switch--table")}
        </td>
      </tr>
    `;
    })
    .join("");

  refs.paymentRows.querySelectorAll("[data-doc-toggle]").forEach((input) => {
    input.addEventListener("change", async () => {
      const docId = input.getAttribute("data-doc-toggle");
      await toggleDocumentPayment(docId, input);
    });
  });
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
      return `
      <tr>
        <td class="td-seq">${seq}</td>
        <td>${formatDate(item.date)}</td>
        <td>${escapeHtml(item.person)}</td>
        <td>${escapeHtml(item.category)}</td>
        <td>${escapeHtml(item.description)}</td>
        <td>${formatEUR(item.amount)}</td>
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
    const personOk = person === "all" || item.person === person;
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
    [t("table.person")]: item.person,
    [t("table.category")]: item.category,
    [t("table.description")]: item.description,
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
    item.person,
    item.category,
    item.description,
    formatEUR(item.amount),
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
        t("table.person"),
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
  const pending = getPendingDocumentsInRange(startDate, endDate);
  if (pending.length === 0) {
    window.alert(t("errors.exportEmpty"));
    return;
  }
  const totalPending = pending.reduce((sum, item) => sum + item.amount, 0);
  const balance = getAccountBalance();
  const rows = pending.map((item) => [
    formatDate(item.date),
    item.label,
    formatEUR(item.amount),
    t("status.unpaid"),
  ]);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(t("payments.pendingPdfTitle"), 14, 14);
  doc.setFontSize(10);
  doc.text(`${t("payments.pendingPdfBalance")}: ${formatEUR(balance)}`, 14, 22);
  doc.text(`${t("payments.pendingPdfTotal")}: ${formatEUR(totalPending)}`, 14, 28);
  doc.autoTable({
    head: [[t("table.date"), t("payments.description"), t("table.amount"), t("filter.status")]],
    body: rows,
    startY: 34,
    styles: { fontSize: 9 },
  });
  doc.save("studio9-pagamentos-pendentes.pdf");
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

function formatEUR(value) {
  return new Intl.NumberFormat(locale(), {
    style: "currency",
    currency: "EUR",
  }).format(value || 0);
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
  if (refs.paymentFilterStatus) refs.paymentFilterStatus.value = "unpaid";
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
