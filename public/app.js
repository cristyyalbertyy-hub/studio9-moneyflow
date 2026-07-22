const state = {
  expenses: [],
  incomes: [],
  documents: [],
  charityAllocations: [],
  charityDisbursements: [],
  expenseInvoices: [],
  profitDistributions: [],
  categories: [],
  clients: [],
  activities: [],
  summary: {
    accountBalance: 0,
    accountBalances: { EUR: 0, USD: 0, QAR: 0 },
    charityBalance: 0,
    charityBalances: { EUR: 0, USD: 0, QAR: 0 },
    nextExpenseSeq: 1,
  },
  session: null,
  socket: null,
};

const i18n = window.MoneyFlowI18n;
const t = (key) => i18n.t(key);
const locale = () => i18n.locale();

const sessionCacheKey = "studio9-session-v1";
const periodStorageKey = "studio9-period-month-v1";
const profitSplitsStorageKey = "studio9-profit-splits-v1";
const profitCurrencyStorageKey = "studio9-profit-currency-v1";
const bootstrapPollMs = 15000;
const MAX_INVOICE_BYTES = 3 * 1024 * 1024;
let bootstrapPollTimer = null;

const refs = {
  totalEntradas: document.getElementById("totalEntradas"),
  monthStudio9Payments: document.getElementById("monthStudio9Payments"),
  monthReimbursements: document.getElementById("monthReimbursements"),
  monthTotalOutflow: document.getElementById("monthTotalOutflow"),
  accountBalanceTotal: document.getElementById("accountBalanceTotal"),
  charityBalanceTotal: document.getElementById("charityBalanceTotal"),
  expenseSeqPreview: document.getElementById("expenseSeqPreview"),
  balanceAlertOverlay: document.getElementById("balanceAlertOverlay"),
  balanceAlertOk: document.getElementById("balanceAlertOk"),
  pendingReimbursementsAlertOverlay: document.getElementById("pendingReimbursementsAlertOverlay"),
  pendingReimbursementsAlertOk: document.getElementById("pendingReimbursementsAlertOk"),
  studio9PaymentConfirmOverlay: document.getElementById("studio9PaymentConfirmOverlay"),
  studio9PaymentConfirmMessage: document.getElementById("studio9PaymentConfirmMessage"),
  studio9PaymentConfirmBalance: document.getElementById("studio9PaymentConfirmBalance"),
  studio9PaymentConfirmOk: document.getElementById("studio9PaymentConfirmOk"),
  studio9PaymentConfirmCancel: document.getElementById("studio9PaymentConfirmCancel"),
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
  expenseInvoiceFileInput: document.getElementById("expenseInvoiceFileInput"),
  expenseRegisterFilterPayer: document.getElementById("expenseRegisterFilterPayer"),
  expenseRegisterFilterCategory: document.getElementById("expenseRegisterFilterCategory"),
  expenseRegisterFilterStartDate: document.getElementById("expenseRegisterFilterStartDate"),
  expenseRegisterFilterEndDate: document.getElementById("expenseRegisterFilterEndDate"),
  expenseRegisterPeriodTotal: document.getElementById("expenseRegisterPeriodTotal"),
  expenseRegisterAccountBalance: document.getElementById("expenseRegisterAccountBalance"),
  expenseRegisterClearFilters: document.getElementById("expenseRegisterClearFilters"),
  exportExpenseRegisterPdfBtn: document.getElementById("exportExpenseRegisterPdfBtn"),
  expenseRegisterRows: document.getElementById("expenseRegisterRows"),
  incomeForm: document.getElementById("incomeForm"),
  incomeDate: document.getElementById("incomeDate"),
  incomeAmount: document.getElementById("incomeAmount"),
  incomeCurrency: document.getElementById("incomeCurrency"),
  incomeClientSelect: document.getElementById("incomeClientSelect"),
  incomeFilterClient: document.getElementById("incomeFilterClient"),
  incomeFilterStartDate: document.getElementById("incomeFilterStartDate"),
  incomeFilterEndDate: document.getElementById("incomeFilterEndDate"),
  incomeClearFilters: document.getElementById("incomeClearFilters"),
  exportIncomePdfBtn: document.getElementById("exportIncomePdfBtn"),
  incomeRows: document.getElementById("incomeRows"),
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
  profitCurrency: document.getElementById("profitCurrency"),
  profitAmountDisplay: document.getElementById("profitAmountDisplay"),
  profitPctCris: document.getElementById("profitPctCris"),
  profitPctAlex: document.getElementById("profitPctAlex"),
  profitPctStudio9: document.getElementById("profitPctStudio9"),
  profitPctCharity: document.getElementById("profitPctCharity"),
  profitAmtCris: document.getElementById("profitAmtCris"),
  profitAmtAlex: document.getElementById("profitAmtAlex"),
  profitAmtStudio9: document.getElementById("profitAmtStudio9"),
  profitAmtCharity: document.getElementById("profitAmtCharity"),
  profitTotalHint: document.getElementById("profitTotalHint"),
  profitActionBtn: document.getElementById("profitActionBtn"),
  profitActionConfirmOverlay: document.getElementById("profitActionConfirmOverlay"),
  profitActionConfirmMessage: document.getElementById("profitActionConfirmMessage"),
  profitActionConfirmBalance: document.getElementById("profitActionConfirmBalance"),
  profitActionConfirmAfterBalance: document.getElementById("profitActionConfirmAfterBalance"),
  profitActionConfirmOk: document.getElementById("profitActionConfirmOk"),
  profitActionConfirmCancel: document.getElementById("profitActionConfirmCancel"),
  profitMigrationNotice: document.getElementById("profitMigrationNotice"),
  profitMigrationOverlay: document.getElementById("profitMigrationOverlay"),
  profitMigrationOk: document.getElementById("profitMigrationOk"),
  profitFilterStartDate: document.getElementById("profitFilterStartDate"),
  profitFilterEndDate: document.getElementById("profitFilterEndDate"),
  profitClearFilters: document.getElementById("profitClearFilters"),
  profitDistributionRows: document.getElementById("profitDistributionRows"),
  profitListPeriodTotal: document.getElementById("profitListPeriodTotal"),
  charityEntryAmount: document.getElementById("charityEntryAmount"),
  charityFilterStartDate: document.getElementById("charityFilterStartDate"),
  charityFilterEndDate: document.getElementById("charityFilterEndDate"),
  charityClearFilters: document.getElementById("charityClearFilters"),
  charityRows: document.getElementById("charityRows"),
  charityListPeriodTotal: document.getElementById("charityListPeriodTotal"),
  charityDisbursementForm: document.getElementById("charityDisbursementForm"),
  charityDisburseDate: document.getElementById("charityDisburseDate"),
  charityDisburseCurrency: document.getElementById("charityDisburseCurrency"),
  charityDisburseAmount: document.getElementById("charityDisburseAmount"),
  charityDisburseDescription: document.getElementById("charityDisburseDescription"),
  charityDisbursementMigrationNotice: document.getElementById("charityDisbursementMigrationNotice"),
  charityDisburseConfirmOverlay: document.getElementById("charityDisburseConfirmOverlay"),
  charityDisburseConfirmMessage: document.getElementById("charityDisburseConfirmMessage"),
  charityDisburseConfirmCharityBalance: document.getElementById("charityDisburseConfirmCharityBalance"),
  charityDisburseConfirmCharityAfter: document.getElementById("charityDisburseConfirmCharityAfter"),
  charityDisburseConfirmAccountBalance: document.getElementById("charityDisburseConfirmAccountBalance"),
  charityDisburseConfirmAccountAfter: document.getElementById("charityDisburseConfirmAccountAfter"),
  charityDisburseConfirmOk: document.getElementById("charityDisburseConfirmOk"),
  charityDisburseConfirmCancel: document.getElementById("charityDisburseConfirmCancel"),
  charityDisburseMigrationOverlay: document.getElementById("charityDisburseMigrationOverlay"),
  charityDisburseMigrationOk: document.getElementById("charityDisburseMigrationOk"),
  charityOutflowFilterStartDate: document.getElementById("charityOutflowFilterStartDate"),
  charityOutflowFilterEndDate: document.getElementById("charityOutflowFilterEndDate"),
  charityOutflowClearFilters: document.getElementById("charityOutflowClearFilters"),
  charityOutflowRows: document.getElementById("charityOutflowRows"),
  charityOutflowListPeriodTotal: document.getElementById("charityOutflowListPeriodTotal"),
  invoiceUploadForm: document.getElementById("invoiceUploadForm"),
  invoiceExpenseSelect: document.getElementById("invoiceExpenseSelect"),
  invoiceFileInput: document.getElementById("invoiceFileInput"),
  invoiceMigrationNotice: document.getElementById("invoiceMigrationNotice"),
  invoiceFilterStartDate: document.getElementById("invoiceFilterStartDate"),
  invoiceFilterEndDate: document.getElementById("invoiceFilterEndDate"),
  invoiceClearFilters: document.getElementById("invoiceClearFilters"),
  invoiceRows: document.getElementById("invoiceRows"),
  invoiceListPeriodTotal: document.getElementById("invoiceListPeriodTotal"),
};

const defaultProfitSplits = {
  cris: 30,
  alex: 30,
  studio9: 30,
  charity: 10,
};

const defaultIncomeClient = "Lemon Squeezy";
const CURRENCY_CODES = ["USD", "EUR", "QAR"];
const DEFAULT_CURRENCY = "USD";

let listManageState = null;
let pendingStudio9Expense = null;
let pendingProfitDistribution = null;
let pendingCharityDisbursement = null;

function getSelectedProfitCurrency() {
  const code = refs.profitCurrency?.value || DEFAULT_CURRENCY;
  return CURRENCY_CODES.includes(code) ? code : DEFAULT_CURRENCY;
}

function readProfitCurrency() {
  try {
    const raw = window.localStorage.getItem(profitCurrencyStorageKey);
    if (raw && CURRENCY_CODES.includes(raw)) return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_CURRENCY;
}

function persistProfitCurrency() {
  if (!refs.profitCurrency) return;
  try {
    window.localStorage.setItem(profitCurrencyStorageKey, getSelectedProfitCurrency());
  } catch {
    /* ignore */
  }
}

function getProfitAmountForCurrency(currency = getSelectedProfitCurrency()) {
  return Math.max(0, getAccountBalances()[currency] || 0);
}

function syncProfitDisplayFromBalance() {
  if (!refs.profitAmountDisplay) return;
  const currency = getSelectedProfitCurrency();
  refs.profitAmountDisplay.textContent = formatMoney(getProfitAmountForCurrency(currency), currency);
}

function initProfitDistribution() {
  if (!refs.profitAmountDisplay) return;

  if (refs.profitCurrency) {
    refs.profitCurrency.value = readProfitCurrency();
    refs.profitCurrency.addEventListener("change", () => {
      persistProfitCurrency();
      syncProfitDisplayFromBalance();
      renderProfitDistribution();
    });
  }

  const stored = readProfitSplits();
  if (refs.profitPctCris) refs.profitPctCris.value = stored.cris;
  if (refs.profitPctAlex) refs.profitPctAlex.value = stored.alex;
  if (refs.profitPctStudio9) refs.profitPctStudio9.value = stored.studio9;
  if (refs.profitPctCharity) refs.profitPctCharity.value = stored.charity;

  [
    refs.profitPctCris,
    refs.profitPctAlex,
    refs.profitPctStudio9,
    refs.profitPctCharity,
  ]
    .filter(Boolean)
    .forEach((input) => {
      input.addEventListener("input", () => {
        persistProfitSplits();
        renderProfitDistribution();
      });
    });

  syncProfitDisplayFromBalance();
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

function getProfitDistributionSnapshot() {
  const currency = getSelectedProfitCurrency();
  const profitAmount = getProfitAmountForCurrency(currency);
  const pctCris = clampPercent(refs.profitPctCris?.value, 0);
  const pctAlex = clampPercent(refs.profitPctAlex?.value, 0);
  const pctStudio9 = clampPercent(refs.profitPctStudio9?.value, 0);
  const pctCharity = clampPercent(refs.profitPctCharity?.value, 0);
  const totalPct = pctCris + pctAlex + pctStudio9 + pctCharity;
  return {
    profitAmount,
    currency,
    pctCris,
    pctAlex,
    pctStudio9,
    pctCharity,
    totalPct,
    amtCris: roundMoney((profitAmount * pctCris) / 100),
    amtAlex: roundMoney((profitAmount * pctAlex) / 100),
    amtStudio9: roundMoney((profitAmount * pctStudio9) / 100),
    amtCharity: roundMoney((profitAmount * pctCharity) / 100),
  };
}

function getProfitDistributionOutflow(snapshot) {
  return roundMoney(snapshot.amtCris + snapshot.amtAlex + snapshot.amtCharity);
}

function getProfitBalanceAfterAction(snapshot) {
  return roundMoney(snapshot.amtStudio9);
}

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

function renderProfitDistribution() {
  if (!refs.profitAmountDisplay) return;

  const snapshot = getProfitDistributionSnapshot();
  const profit = snapshot.profitAmount;
  const currency = snapshot.currency;
  const splits = [
    { pctEl: refs.profitPctCris, amtEl: refs.profitAmtCris },
    { pctEl: refs.profitPctAlex, amtEl: refs.profitAmtAlex },
    { pctEl: refs.profitPctStudio9, amtEl: refs.profitAmtStudio9 },
    { pctEl: refs.profitPctCharity, amtEl: refs.profitAmtCharity },
  ];

  syncProfitDisplayFromBalance();

  splits.forEach(({ pctEl, amtEl }) => {
    if (!pctEl || !amtEl) return;
    const pct = clampPercent(pctEl.value, 0);
    amtEl.textContent = formatMoney((profit * pct) / 100, currency);
  });

  if (refs.profitMigrationNotice) {
    refs.profitMigrationNotice.classList.toggle("hidden", isProfitDistributionTableReady());
  }

  if (refs.profitActionBtn) {
    const outflow = getProfitDistributionOutflow(snapshot);
    const canAfford = canAffordPayment(outflow, snapshot.currency);
    refs.profitActionBtn.disabled =
      snapshot.profitAmount <= 0 ||
      Math.abs(snapshot.totalPct - 100) > 0.05 ||
      !canAfford;
    refs.profitActionBtn.title =
      !isProfitDistributionTableReady()
        ? t("profit.migrationNotice")
        : snapshot.profitAmount <= 0
          ? t("profit.actionDisabledNoAmount")
          : Math.abs(snapshot.totalPct - 100) > 0.05
            ? t("profit.actionDisabledPct")
            : !canAfford
              ? t("payments.insufficientBalanceMsg")
              : "";
  }

  if (!refs.profitTotalHint) return;
  const totalLabel = `${t("profit.totalLabel")} ${snapshot.totalPct.toFixed(1)}%`;
  refs.profitTotalHint.classList.remove("is-warning", "is-ok");

  if (Math.abs(snapshot.totalPct - 100) < 0.05) {
    refs.profitTotalHint.textContent = `${totalLabel} — ${t("profit.totalOk")}`;
    refs.profitTotalHint.classList.add("is-ok");
    return;
  }

  refs.profitTotalHint.textContent = `${totalLabel} — ${t("profit.totalWarn").replace("{total}", snapshot.totalPct.toFixed(1))}`;
  refs.profitTotalHint.classList.add("is-warning");
}

function isCharityDisbursementTableReady() {
  return state.summary?.charityDisbursementTableReady !== false;
}

function getCharityBalanceForCurrency(currency = DEFAULT_CURRENCY) {
  return getCharityBalances()[resolveCurrency({ currency })] || 0;
}

function canAffordCharityDisbursement(amount, currency = DEFAULT_CURRENCY) {
  const code = resolveCurrency({ currency });
  const balance = getCharityBalanceForCurrency(code);
  return Math.round(balance * 100) >= Math.round(Number(amount) * 100);
}

function getFilteredCharityDisbursements() {
  const startDate = refs.charityOutflowFilterStartDate ? refs.charityOutflowFilterStartDate.value : "";
  const endDate = refs.charityOutflowFilterEndDate ? refs.charityOutflowFilterEndDate.value : "";
  return (state.charityDisbursements || [])
    .filter((item) => {
      const date = item.date || (item.createdAt ? String(item.createdAt).slice(0, 10) : "");
      if (!date) return true;
      const startOk = !startDate || date >= startDate;
      const endOk = !endDate || date <= endDate;
      return startOk && endOk;
    })
    .sort((a, b) => {
      const dateA = a.date || String(a.createdAt || "").slice(0, 10);
      const dateB = b.date || String(b.createdAt || "").slice(0, 10);
      return dateB.localeCompare(dateA);
    });
}

function renderCharityOutflowTable() {
  if (!refs.charityOutflowRows) return;
  const rows = getFilteredCharityDisbursements();
  if (refs.charityOutflowListPeriodTotal) {
    const sums = emptyCurrencyBalances();
    for (const item of rows) {
      sums[resolveCurrency(item)] += Number(item.amount || 0);
    }
    const parts = CURRENCY_CODES.map((code) => formatMoney(sums[code] || 0, code)).join(" · ");
    refs.charityOutflowListPeriodTotal.textContent = `${t("charity.periodPrefix")} ${parts} (${rows.length})`;
  }
  if (rows.length === 0) {
    refs.charityOutflowRows.innerHTML = `<tr><td colspan="5" class="empty">${escapeHtml(t("table.empty"))}</td></tr>`;
    return;
  }
  refs.charityOutflowRows.innerHTML = rows
    .map((item) => {
      const date = item.date || (item.createdAt ? String(item.createdAt).slice(0, 10) : "");
      const currency = resolveCurrency(item);
      return `
      <tr>
        <td>${date ? formatDate(date) : "—"}</td>
        <td>${escapeHtml(item.description || "—")}</td>
        <td>${formatMoney(item.amount, currency)}</td>
        <td>${escapeHtml(currency)}</td>
        <td>${escapeHtml(item.createdBy || "—")}</td>
      </tr>
    `;
    })
    .join("");
}

function clearCharityOutflowFilters() {
  const bounds = getSelectedMonthBounds();
  if (bounds && refs.charityOutflowFilterStartDate && refs.charityOutflowFilterEndDate) {
    refs.charityOutflowFilterStartDate.value = bounds.start;
    refs.charityOutflowFilterEndDate.value = bounds.end;
  }
  renderCharityOutflowTable();
}

function isExpenseInvoicesTableReady() {
  return state.summary?.expenseInvoicesTableReady !== false;
}

function getExpenseInvoiceIds() {
  return new Set((state.expenseInvoices || []).map((item) => item.expenseId));
}

function findExpenseById(expenseId) {
  return (state.expenses || []).find((item) => item.id === expenseId) || null;
}

function buildExpenseInvoiceOptionLabel(expense) {
  const seq = expense.seqNumber != null ? `#${expense.seqNumber}` : "—";
  const label = buildExpensePaymentLabel(expense.category, expense.description);
  return `${seq} · ${formatDate(expense.date)} · ${label} · ${formatMoney(expense.amount, expense.currency)}`;
}

function getExpensesWithoutInvoice() {
  const invoiced = getExpenseInvoiceIds();
  return (state.expenses || [])
    .filter((item) => !invoiced.has(item.id))
    .sort((a, b) => {
      const dateCmp = (b.date || "").localeCompare(a.date || "");
      if (dateCmp !== 0) return dateCmp;
      return (Number(b.seqNumber) || 0) - (Number(a.seqNumber) || 0);
    });
}

function renderInvoiceExpenseSelect() {
  if (!refs.invoiceExpenseSelect) return;
  const current = refs.invoiceExpenseSelect.value;
  const items = getExpensesWithoutInvoice();
  if (items.length === 0) {
    refs.invoiceExpenseSelect.innerHTML = `<option value="" disabled selected>${escapeHtml(t("invoices.noExpensesWithoutInvoice"))}</option>`;
    refs.invoiceExpenseSelect.disabled = true;
    return;
  }
  refs.invoiceExpenseSelect.disabled = false;
  refs.invoiceExpenseSelect.innerHTML = items
    .map(
      (expense) =>
        `<option value="${escapeHtml(expense.id)}">${escapeHtml(buildExpenseInvoiceOptionLabel(expense))}</option>`
    )
    .join("");
  if (current && items.some((item) => item.id === current)) {
    refs.invoiceExpenseSelect.value = current;
  }
}

function getFilteredExpenseInvoices() {
  const startDate = refs.invoiceFilterStartDate ? refs.invoiceFilterStartDate.value : "";
  const endDate = refs.invoiceFilterEndDate ? refs.invoiceFilterEndDate.value : "";
  return (state.expenseInvoices || [])
    .map((invoice) => {
      const expense = findExpenseById(invoice.expenseId);
      if (!expense) return null;
      return { invoice, expense };
    })
    .filter(Boolean)
    .filter(({ expense }) => {
      const date = expense.date || "";
      if (!date) return true;
      const startOk = !startDate || date >= startDate;
      const endOk = !endDate || date <= endDate;
      return startOk && endOk;
    })
    .sort((a, b) => (b.expense.date || "").localeCompare(a.expense.date || ""));
}

function renderInvoicePanel() {
  if (refs.invoiceMigrationNotice) {
    refs.invoiceMigrationNotice.classList.toggle("hidden", isExpenseInvoicesTableReady());
  }
  renderInvoiceExpenseSelect();
  renderInvoiceTable();
}

function renderInvoiceTable() {
  if (!refs.invoiceRows) return;
  const rows = getFilteredExpenseInvoices();
  if (refs.invoiceListPeriodTotal) {
    refs.invoiceListPeriodTotal.textContent = `${t("invoices.periodPrefix")} ${rows.length}`;
  }
  if (rows.length === 0) {
    refs.invoiceRows.innerHTML = `<tr><td colspan="6" class="empty">${escapeHtml(t("table.empty"))}</td></tr>`;
    return;
  }
  refs.invoiceRows.innerHTML = rows
    .map(({ invoice, expense }) => {
      const seq = expense.seqNumber != null ? escapeHtml(String(expense.seqNumber)) : "—";
      return `
      <tr>
        <td class="td-seq">${seq}</td>
        <td>${formatDate(expense.date)}</td>
        <td>${escapeHtml(expense.category)}</td>
        <td>${escapeHtml(expense.description)}</td>
        <td>${formatMoney(expense.amount, expense.currency)}</td>
        <td>
          <button type="button" class="btn-ghost btn-invoice-view" data-invoice-view="${escapeHtml(invoice.id)}">
            ${escapeHtml(t("invoices.viewPdf"))}
          </button>
        </td>
      </tr>
    `;
    })
    .join("");

  refs.invoiceRows.querySelectorAll("[data-invoice-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const invoiceId = button.getAttribute("data-invoice-view");
      if (invoiceId) openExpenseInvoicePdf(invoiceId);
    });
  });
}

function clearInvoiceFilters() {
  const bounds = getSelectedMonthBounds();
  if (bounds && refs.invoiceFilterStartDate && refs.invoiceFilterEndDate) {
    refs.invoiceFilterStartDate.value = bounds.start;
    refs.invoiceFilterEndDate.value = bounds.end;
  }
  renderInvoiceTable();
}

function initInvoicePanel() {
  if (!refs.invoiceUploadForm) return;
  refs.invoiceUploadForm.addEventListener("submit", handleInvoiceUploadSubmit);
  if (refs.invoiceClearFilters) refs.invoiceClearFilters.addEventListener("click", clearInvoiceFilters);
  if (refs.invoiceFilterStartDate) refs.invoiceFilterStartDate.addEventListener("change", renderInvoiceTable);
  if (refs.invoiceFilterEndDate) refs.invoiceFilterEndDate.addEventListener("change", renderInvoiceTable);
}

function resetInvoiceUploadForm() {
  if (!refs.invoiceUploadForm) return;
  refs.invoiceUploadForm.reset();
  renderInvoiceExpenseSelect();
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error || new Error("Ficheiro invalido"));
    reader.readAsDataURL(file);
  });
}

function isInvoiceMigrationError(message) {
  const text = String(message || "").toLowerCase();
  return text.includes("faturas em falta") || text.includes("expense_invoices") || text.includes("invoice table");
}

function getSelectedExpenseInvoiceFile() {
  return refs.expenseInvoiceFileInput?.files?.[0] || null;
}

function validateExpenseInvoiceFile(file) {
  if (!file) return null;
  const mimeType = String(file.type || "").toLowerCase();
  const name = String(file.name || "").toLowerCase();
  if (mimeType !== "application/pdf" && !name.endsWith(".pdf")) {
    return t("invoices.invalidFile");
  }
  if (file.size > MAX_INVOICE_BYTES) {
    return t("invoices.fileTooLarge");
  }
  return null;
}

async function uploadExpenseInvoiceForExpense(expenseId, file) {
  const fileBase64 = await readFileAsBase64(file);
  const response = await apiFetch("/api/invoices", {
    method: "POST",
    body: JSON.stringify({
      action: "upload",
      expenseId,
      fileName: file.name,
      mimeType: "application/pdf",
      fileBase64,
    }),
  });
  applyBootstrapPayload(response);
}

async function attachExpenseInvoiceIfSelected(expenseId) {
  const file = getSelectedExpenseInvoiceFile();
  if (!file || !expenseId) return true;
  if (!isExpenseInvoicesTableReady()) {
    if (refs.invoiceMigrationNotice) refs.invoiceMigrationNotice.classList.remove("hidden");
    window.alert(t("invoices.migrationNotice"));
    return false;
  }

  const validationError = validateExpenseInvoiceFile(file);
  if (validationError) {
    window.alert(validationError);
    return false;
  }

  try {
    await uploadExpenseInvoiceForExpense(expenseId, file);
    return true;
  } catch (error) {
    const message = parseApiErrorMessage(error);
    if (isInvoiceMigrationError(message) && refs.invoiceMigrationNotice) {
      refs.invoiceMigrationNotice.classList.remove("hidden");
    }
    window.alert(message);
    return false;
  }
}

async function handleInvoiceUploadSubmit(event) {
  event.preventDefault();
  if (!isExpenseInvoicesTableReady()) {
    if (refs.invoiceMigrationNotice) refs.invoiceMigrationNotice.classList.remove("hidden");
    return;
  }

  const expenseId = refs.invoiceExpenseSelect?.value;
  const file = refs.invoiceFileInput?.files?.[0];
  if (!expenseId || !file) return;

  const validationError = validateExpenseInvoiceFile(file);
  if (validationError) {
    window.alert(validationError);
    return;
  }

  try {
    await uploadExpenseInvoiceForExpense(expenseId, file);
    resetInvoiceUploadForm();
    renderInvoicePanel();
  } catch (error) {
    const message = parseApiErrorMessage(error);
    if (isInvoiceMigrationError(message) && refs.invoiceMigrationNotice) {
      refs.invoiceMigrationNotice.classList.remove("hidden");
    } else {
      window.alert(message);
    }
  }
}

async function openExpenseInvoicePdf(invoiceId) {
  try {
    const payload = await apiFetch(`/api/invoices?id=${encodeURIComponent(invoiceId)}`);
    if (!payload?.url) throw new Error("Fatura nao encontrada");
    window.open(payload.url, "_blank", "noopener,noreferrer");
  } catch (error) {
    window.alert(parseApiErrorMessage(error));
  }
}

function initCharityDisbursementForm() {
  if (!refs.charityDisbursementForm) return;
  if (refs.charityDisburseDate) refs.charityDisburseDate.value = todayISO();
  if (refs.charityDisburseCurrency) refs.charityDisburseCurrency.value = DEFAULT_CURRENCY;
  refs.charityDisbursementForm.addEventListener("submit", handleCharityDisbursementSubmit);
}

function resetCharityDisbursementForm() {
  if (!refs.charityDisbursementForm) return;
  refs.charityDisbursementForm.reset();
  if (refs.charityDisburseDate) refs.charityDisburseDate.value = todayISO();
  if (refs.charityDisburseCurrency) refs.charityDisburseCurrency.value = DEFAULT_CURRENCY;
}

function isProfitDistributionTableReady() {
  return state.summary?.profitDistributionTableReady !== false;
}

function renderCharityPanel() {
  if (refs.charityDisbursementMigrationNotice) {
    refs.charityDisbursementMigrationNotice.classList.toggle("hidden", isCharityDisbursementTableReady());
  }
  if (!refs.charityEntryAmount) return;
  const balances = getCharityBalances();
  const hasBalance = CURRENCY_CODES.some((code) => (balances[code] || 0) !== 0);
  if (!hasBalance) {
    refs.charityEntryAmount.textContent = t("charity.noBalance");
    refs.charityEntryAmount.classList.add("charity-entry-empty");
    return;
  }
  refs.charityEntryAmount.innerHTML = CURRENCY_CODES.map((code) => {
    const value = balances[code] || 0;
    return `<span class="summary-currency-line">${escapeHtml(formatMoney(value, code))}</span>`;
  }).join("");
  refs.charityEntryAmount.classList.remove("charity-entry-empty");
}

function getCharityHistoryEntries() {
  const fromDistributions = (state.profitDistributions || [])
    .filter((item) => Number(item.amtCharity || 0) > 0)
    .map((item) => ({
      date: item.date || (item.createdAt ? String(item.createdAt).slice(0, 10) : ""),
      amount: item.amtCharity,
      currency: resolveCurrency(item),
      charityPct: item.pctCharity,
      createdBy: item.createdBy || "",
    }));
  const legacy = (state.charityAllocations || []).map((item) => ({
    date: item.date || (item.createdAt ? String(item.createdAt).slice(0, 10) : ""),
    amount: item.amount,
    currency: resolveCurrency(item),
    charityPct: item.charityPct,
    createdBy: item.createdBy || "",
  }));
  return [...fromDistributions, ...legacy].sort((a, b) => {
    const dateA = a.date || "";
    const dateB = b.date || "";
    return dateB.localeCompare(dateA);
  });
}

function getFilteredCharityAllocations() {
  const startDate = refs.charityFilterStartDate ? refs.charityFilterStartDate.value : "";
  const endDate = refs.charityFilterEndDate ? refs.charityFilterEndDate.value : "";
  return getCharityHistoryEntries().filter((item) => {
    const date = item.date || "";
    if (!date) return true;
    const startOk = !startDate || date >= startDate;
    const endOk = !endDate || date <= endDate;
    return startOk && endOk;
  });
}

function getFilteredProfitDistributions() {
  const startDate = refs.profitFilterStartDate ? refs.profitFilterStartDate.value : "";
  const endDate = refs.profitFilterEndDate ? refs.profitFilterEndDate.value : "";
  return (state.profitDistributions || [])
    .filter((item) => {
      const date = item.date || (item.createdAt ? String(item.createdAt).slice(0, 10) : "");
      if (!date) return true;
      const startOk = !startDate || date >= startDate;
      const endOk = !endDate || date <= endDate;
      return startOk && endOk;
    })
    .sort((a, b) => {
      const dateA = a.date || String(a.createdAt || "").slice(0, 10);
      const dateB = b.date || String(b.createdAt || "").slice(0, 10);
      return dateB.localeCompare(dateA);
    });
}

function renderProfitDistributionTable() {
  if (!refs.profitDistributionRows) return;
  const rows = getFilteredProfitDistributions();
  if (refs.profitListPeriodTotal) {
    const sums = emptyCurrencyBalances();
    for (const item of rows) {
      sums[resolveCurrency(item)] += Number(item.profitAmount || 0);
    }
    const parts = CURRENCY_CODES.map((code) => formatMoney(sums[code] || 0, code)).join(" · ");
    refs.profitListPeriodTotal.textContent = `${t("profit.periodPrefix")} ${parts} (${rows.length})`;
  }
  if (rows.length === 0) {
    refs.profitDistributionRows.innerHTML = `<tr><td colspan="4" class="empty">${escapeHtml(t("table.empty"))}</td></tr>`;
    return;
  }
  refs.profitDistributionRows.innerHTML = rows
    .map((item) => {
      const date = item.date || (item.createdAt ? String(item.createdAt).slice(0, 10) : "");
      const breakdown = [
        `Cris ${formatMoney(item.amtCris, item.currency)}`,
        `Alex ${formatMoney(item.amtAlex, item.currency)}`,
        `Studio9 ${formatMoney(item.amtStudio9, item.currency)}`,
        `${t("profit.charity")} ${formatMoney(item.amtCharity, item.currency)}`,
      ].join(" · ");
      return `
      <tr>
        <td>${date ? formatDate(date) : "—"}</td>
        <td>${formatMoney(item.profitAmount, resolveCurrency(item))}</td>
        <td>${escapeHtml(breakdown)}</td>
        <td>${escapeHtml(item.createdBy || "—")}</td>
      </tr>
    `;
    })
    .join("");
}

function clearProfitFilters() {
  const bounds = getSelectedMonthBounds();
  if (bounds && refs.profitFilterStartDate && refs.profitFilterEndDate) {
    refs.profitFilterStartDate.value = bounds.start;
    refs.profitFilterEndDate.value = bounds.end;
  }
  renderProfitDistributionTable();
}

function renderCharityTable() {
  if (!refs.charityRows) return;
  const rows = getFilteredCharityAllocations();
  if (refs.charityListPeriodTotal) {
    const sums = sumAmountsByCurrency(rows, () => true);
    const parts = CURRENCY_CODES.map((code) => formatMoney(sums[code] || 0, code)).join(" · ");
    refs.charityListPeriodTotal.textContent = `${t("charity.periodPrefix")} ${parts} (${rows.length})`;
  }
  if (rows.length === 0) {
    refs.charityRows.innerHTML = `<tr><td colspan="4" class="empty">${escapeHtml(t("table.empty"))}</td></tr>`;
    return;
  }
  refs.charityRows.innerHTML = rows
    .map((item) => {
      const date = item.date || (item.createdAt ? String(item.createdAt).slice(0, 10) : "");
      const pct =
        item.charityPct != null && Number.isFinite(Number(item.charityPct))
          ? `${Number(item.charityPct).toFixed(1)}%`
          : "—";
      return `
      <tr>
        <td>${date ? formatDate(date) : "—"}</td>
        <td>${formatMoney(item.amount, resolveCurrency(item))}</td>
        <td>${escapeHtml(pct)}</td>
        <td>${escapeHtml(item.createdBy || "—")}</td>
      </tr>
    `;
    })
    .join("");
}

function clearCharityFilters() {
  const bounds = getSelectedMonthBounds();
  if (bounds && refs.charityFilterStartDate && refs.charityFilterEndDate) {
    refs.charityFilterStartDate.value = bounds.start;
    refs.charityFilterEndDate.value = bounds.end;
  }
  renderCharityTable();
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
    renderProfitDistributionTable();
    render();
  });

  initProfitDistribution();

  const now = todayISO();
  refs.expenseDate.value = now;
  refs.incomeDate.value = now;
  initPeriodMonth();
  refs.newCategoryBtn.addEventListener("click", handleNewCategory);
  if (refs.editCategoryBtn) refs.editCategoryBtn.addEventListener("click", handleEditCategory);
  if (refs.deleteCategoryBtn) refs.deleteCategoryBtn.addEventListener("click", handleDeleteCategory);
  if (refs.newClientBtn) refs.newClientBtn.addEventListener("click", handleNewClient);
  if (refs.editClientBtn) refs.editClientBtn.addEventListener("click", handleEditClient);
  if (refs.deleteClientBtn) refs.deleteClientBtn.addEventListener("click", handleDeleteClient);
  refs.expenseForm.addEventListener("submit", handleExpenseSubmit);
  refs.incomeForm.addEventListener("submit", handleIncomeSubmit);
  if (refs.profitActionBtn) refs.profitActionBtn.addEventListener("click", handleProfitAction);
  if (refs.profitActionConfirmOk) refs.profitActionConfirmOk.addEventListener("click", confirmProfitDistribution);
  if (refs.profitActionConfirmCancel) {
    refs.profitActionConfirmCancel.addEventListener("click", hideProfitActionConfirm);
  }
  if (refs.profitActionConfirmOverlay) {
    refs.profitActionConfirmOverlay.addEventListener("click", (event) => {
      if (event.target === refs.profitActionConfirmOverlay) hideProfitActionConfirm();
    });
  }
  if (refs.profitMigrationOk) refs.profitMigrationOk.addEventListener("click", hideProfitMigrationNotice);
  if (refs.profitMigrationOverlay) {
    refs.profitMigrationOverlay.addEventListener("click", (event) => {
      if (event.target === refs.profitMigrationOverlay) hideProfitMigrationNotice();
    });
  }
  if (refs.profitClearFilters) refs.profitClearFilters.addEventListener("click", clearProfitFilters);
  [refs.profitFilterStartDate, refs.profitFilterEndDate].filter(Boolean).forEach((input) => {
    input.addEventListener("change", renderProfitDistributionTable);
  });
  if (refs.charityClearFilters) refs.charityClearFilters.addEventListener("click", clearCharityFilters);
  [refs.charityFilterStartDate, refs.charityFilterEndDate].filter(Boolean).forEach((input) => {
    input.addEventListener("change", renderCharityTable);
  });
  if (refs.charityOutflowClearFilters) {
    refs.charityOutflowClearFilters.addEventListener("click", clearCharityOutflowFilters);
  }
  [refs.charityOutflowFilterStartDate, refs.charityOutflowFilterEndDate].filter(Boolean).forEach((input) => {
    input.addEventListener("change", renderCharityOutflowTable);
  });
  if (refs.charityDisburseConfirmOk) {
    refs.charityDisburseConfirmOk.addEventListener("click", confirmCharityDisbursement);
  }
  if (refs.charityDisburseConfirmCancel) {
    refs.charityDisburseConfirmCancel.addEventListener("click", hideCharityDisburseConfirm);
  }
  if (refs.charityDisburseConfirmOverlay) {
    refs.charityDisburseConfirmOverlay.addEventListener("click", (event) => {
      if (event.target === refs.charityDisburseConfirmOverlay) hideCharityDisburseConfirm();
    });
  }
  if (refs.charityDisburseMigrationOk) {
    refs.charityDisburseMigrationOk.addEventListener("click", hideCharityDisburseMigrationNotice);
  }
  if (refs.charityDisburseMigrationOverlay) {
    refs.charityDisburseMigrationOverlay.addEventListener("click", (event) => {
      if (event.target === refs.charityDisburseMigrationOverlay) hideCharityDisburseMigrationNotice();
    });
  }
  initCharityDisbursementForm();
  initInvoicePanel();
  refs.clearFilters.addEventListener("click", clearFilters);
  refs.logoutBtn.addEventListener("click", () => logout(true));
  refs.exportExcelBtn.addEventListener("click", exportExcel);
  refs.exportPdfBtn.addEventListener("click", exportPdf);
  if (refs.exportIncomePdfBtn) refs.exportIncomePdfBtn.addEventListener("click", exportIncomePdf);
  if (refs.exportExpenseRegisterPdfBtn) {
    refs.exportExpenseRegisterPdfBtn.addEventListener("click", exportExpenseRegisterPdf);
  }
  if (refs.balanceAlertOk) refs.balanceAlertOk.addEventListener("click", hideBalanceAlert);
  if (refs.balanceAlertOverlay) {
    refs.balanceAlertOverlay.addEventListener("click", (event) => {
      if (event.target === refs.balanceAlertOverlay) hideBalanceAlert();
    });
  }
  if (refs.pendingReimbursementsAlertOk) {
    refs.pendingReimbursementsAlertOk.addEventListener("click", hidePendingReimbursementsAlert);
  }
  if (refs.pendingReimbursementsAlertOverlay) {
    refs.pendingReimbursementsAlertOverlay.addEventListener("click", (event) => {
      if (event.target === refs.pendingReimbursementsAlertOverlay) hidePendingReimbursementsAlert();
    });
  }
  if (refs.studio9PaymentConfirmOk) {
    refs.studio9PaymentConfirmOk.addEventListener("click", confirmStudio9Payment);
  }
  if (refs.studio9PaymentConfirmCancel) {
    refs.studio9PaymentConfirmCancel.addEventListener("click", hideStudio9PaymentConfirm);
  }
  if (refs.studio9PaymentConfirmOverlay) {
    refs.studio9PaymentConfirmOverlay.addEventListener("click", (event) => {
      if (event.target === refs.studio9PaymentConfirmOverlay) hideStudio9PaymentConfirm();
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
  if (refs.incomeClearFilters) refs.incomeClearFilters.addEventListener("click", clearIncomeFilters);
  [
    refs.incomeFilterClient,
    refs.incomeFilterStartDate,
    refs.incomeFilterEndDate,
  ]
    .filter(Boolean)
    .forEach((el) => el.addEventListener("change", render));
  if (refs.expenseRegisterClearFilters) {
    refs.expenseRegisterClearFilters.addEventListener("click", clearExpenseRegisterFilters);
  }
  [
    refs.expenseRegisterFilterPayer,
    refs.expenseRegisterFilterCategory,
    refs.expenseRegisterFilterStartDate,
    refs.expenseRegisterFilterEndDate,
  ]
    .filter(Boolean)
    .forEach((el) => el.addEventListener("change", render));

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

function getCharityBalances() {
  const raw = state.summary?.charityBalances;
  if (raw && typeof raw === "object") {
    return {
      EUR: Number(raw.EUR) || 0,
      USD: Number(raw.USD) || 0,
      QAR: Number(raw.QAR) || 0,
    };
  }
  const legacy = Number(state.summary?.charityBalance) || 0;
  const out = emptyCurrencyBalances();
  out[DEFAULT_CURRENCY] = legacy;
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
  const legacy = Number(state.summary?.accountBalance) || 0;
  const out = emptyCurrencyBalances();
  out[DEFAULT_CURRENCY] = legacy;
  return out;
}

function renderCurrencySummary(el, sums, options = {}) {
  if (!el) return;
  const hideZero = Boolean(options.hideZero);
  const fixedOrder = Boolean(options.fixedOrder) || !hideZero;
  const codes = fixedOrder
    ? CURRENCY_CODES
    : CURRENCY_CODES.filter((code) => (sums[code] || 0) !== 0);
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

function resolveExpensePaidAt(expense) {
  const payer = resolveExpensePayer(expense);
  const isPaid = Boolean(expense?.paid) || payer === "Studio9";
  if (!isPaid) return null;
  if (expense?.paidAt) return expense.paidAt;
  if (expense?.createdAt) return String(expense.createdAt).slice(0, 10);
  return expense?.date || null;
}

function isExpensePaidInMonth(expense, inMonth) {
  const paidAt = resolveExpensePaidAt(expense);
  if (!paidAt) return false;
  return inMonth(paidAt);
}

function isReimbursementExpense(expense) {
  const payer = resolveExpensePayer(expense);
  return payer === "Cris" || payer === "Alex";
}

function getPendingReimbursements() {
  return state.expenses.filter((item) => isReimbursementExpense(item) && !item.paid);
}

function hasPendingReimbursements() {
  return getPendingReimbursements().length > 0;
}

function buildExpensePaymentLabel(category, description) {
  const cat = String(category || "").trim();
  const desc = String(description || "").trim();
  if (cat && desc) return `${cat} — ${desc}`;
  return desc || cat;
}

function expenseRegisterFilterDate(item) {
  const paidAt = resolveExpensePaidAt(item);
  if (paidAt) return paidAt;
  return item.date;
}

function mapLegacyDocumentToRegisterRow(doc) {
  return {
    kind: "document",
    id: doc.id,
    seqNumber: null,
    date: doc.date,
    payer: "Studio9",
    category: t("expense.legacyDocument"),
    description: doc.label,
    amount: doc.amount,
    currency: DEFAULT_CURRENCY,
    paid: true,
    paidAt: doc.date,
  };
}

function ensureExpenseRegisterDateFilterIncludes(isoDate) {
  if (!isoDate || !refs.expenseRegisterFilterStartDate || !refs.expenseRegisterFilterEndDate) return;
  const start = refs.expenseRegisterFilterStartDate.value;
  const end = refs.expenseRegisterFilterEndDate.value;
  if (!start || isoDate < start) refs.expenseRegisterFilterStartDate.value = isoDate;
  if (!end || isoDate > end) refs.expenseRegisterFilterEndDate.value = isoDate;
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
  state.charityAllocations = Array.isArray(response.charityAllocations) ? response.charityAllocations : [];
  state.charityDisbursements = Array.isArray(response.charityDisbursements) ? response.charityDisbursements : [];
  state.expenseInvoices = Array.isArray(response.expenseInvoices) ? response.expenseInvoices : [];
  state.profitDistributions = Array.isArray(response.profitDistributions) ? response.profitDistributions : [];
  state.activities = Array.isArray(response.activities) ? response.activities : [];
  state.summary = response.summary || {
    accountBalance: 0,
    accountBalances: emptyCurrencyBalances(),
    charityBalance: 0,
    charityBalances: emptyCurrencyBalances(),
    charityTableReady: true,
    nextExpenseSeq: 1,
  };
  const balances = state.summary.accountBalances || {};
  state.summary.accountBalances = {
    EUR: Number(balances.EUR) || 0,
    USD: Number(balances.USD) || 0,
    QAR: Number(balances.QAR) || 0,
  };
  state.summary.accountBalance = Number(state.summary.accountBalances[DEFAULT_CURRENCY]) || 0;
  const charityBalances = state.summary.charityBalances || {};
  state.summary.charityBalances = {
    EUR: Number(charityBalances.EUR) || 0,
    USD: Number(charityBalances.USD) || 0,
    QAR: Number(charityBalances.QAR) || 0,
  };
  state.summary.charityBalance = Number(state.summary.charityBalances[DEFAULT_CURRENCY]) || 0;
  syncProfitDisplayFromBalance();
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
  return getAccountBalances()[DEFAULT_CURRENCY];
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

function showPendingReimbursementsAlert() {
  if (!refs.pendingReimbursementsAlertOverlay) return;
  refs.pendingReimbursementsAlertOverlay.classList.remove("hidden");
}

function hidePendingReimbursementsAlert() {
  if (!refs.pendingReimbursementsAlertOverlay) return;
  refs.pendingReimbursementsAlertOverlay.classList.add("hidden");
}

function showStudio9PaymentConfirm(payload) {
  pendingStudio9Expense = payload;
  const label = buildExpensePaymentLabel(payload.category, payload.description);
  const amount = formatMoney(payload.amount, payload.currency);
  if (refs.studio9PaymentConfirmMessage) {
    refs.studio9PaymentConfirmMessage.textContent = t("expense.studio9ConfirmMessage")
      .replace("{amount}", amount)
      .replace("{description}", label);
  }
  if (refs.studio9PaymentConfirmBalance) {
    const balances = CURRENCY_CODES.map((code) => formatMoney(getAccountBalances()[code], code)).join(" · ");
    refs.studio9PaymentConfirmBalance.textContent = `${t("payments.accountBalance")} ${balances}`;
  }
  if (refs.studio9PaymentConfirmOverlay) refs.studio9PaymentConfirmOverlay.classList.remove("hidden");
}

function hideStudio9PaymentConfirm() {
  if (refs.studio9PaymentConfirmOverlay) refs.studio9PaymentConfirmOverlay.classList.add("hidden");
  pendingStudio9Expense = null;
}

function showProfitActionConfirm() {
  if (hasPendingReimbursements()) {
    showPendingReimbursementsAlert();
    return;
  }
  const snapshot = getProfitDistributionSnapshot();
  if (snapshot.profitAmount <= 0 || Math.abs(snapshot.totalPct - 100) > 0.05) return;
  const outflow = getProfitDistributionOutflow(snapshot);
  if (!canAffordPayment(outflow, snapshot.currency)) {
    showBalanceAlert();
    return;
  }
  pendingProfitDistribution = { ...snapshot };
  const amountLabel = formatMoney(snapshot.profitAmount, snapshot.currency);
  if (refs.profitActionConfirmMessage) {
    refs.profitActionConfirmMessage.textContent = t("profit.confirmMessage")
      .replace("{amount}", amountLabel)
      .replace("{cris}", formatMoney(snapshot.amtCris, snapshot.currency))
      .replace("{alex}", formatMoney(snapshot.amtAlex, snapshot.currency))
      .replace("{studio9}", formatMoney(snapshot.amtStudio9, snapshot.currency))
      .replace("{charity}", formatMoney(snapshot.amtCharity, snapshot.currency));
  }
  if (refs.profitActionConfirmBalance) {
    const currentBalance = getAccountBalances()[snapshot.currency] || 0;
    const afterBalance = getProfitBalanceAfterAction(snapshot);
    refs.profitActionConfirmBalance.textContent = t("profit.confirmBalanceBefore")
      .replace("{amount}", formatMoney(currentBalance, snapshot.currency));
    if (refs.profitActionConfirmAfterBalance) {
      refs.profitActionConfirmAfterBalance.textContent = t("profit.confirmBalanceAfter")
        .replace("{amount}", formatMoney(afterBalance, snapshot.currency));
    }
  }
  if (refs.profitActionConfirmOverlay) refs.profitActionConfirmOverlay.classList.remove("hidden");
}

function hideProfitActionConfirm() {
  if (refs.profitActionConfirmOverlay) refs.profitActionConfirmOverlay.classList.add("hidden");
  pendingProfitDistribution = null;
}

function showProfitMigrationNotice() {
  if (refs.profitMigrationOverlay) refs.profitMigrationOverlay.classList.remove("hidden");
}

function hideProfitMigrationNotice() {
  if (refs.profitMigrationOverlay) refs.profitMigrationOverlay.classList.add("hidden");
}

function showCharityDisburseConfirm() {
  if (!pendingCharityDisbursement) return;
  const payload = pendingCharityDisbursement;
  const currency = resolveCurrency(payload);
  const amountLabel = formatMoney(payload.amount, currency);
  const charityBefore = getCharityBalanceForCurrency(currency);
  const charityAfter = Math.max(0, roundMoney(charityBefore - payload.amount));
  const accountBefore = getAccountBalances()[currency] || 0;
  const accountAfter = roundMoney(accountBefore + payload.amount);

  if (refs.charityDisburseConfirmMessage) {
    refs.charityDisburseConfirmMessage.textContent = t("charity.disburseConfirmMessage")
      .replace("{amount}", amountLabel)
      .replace("{description}", payload.description);
  }
  if (refs.charityDisburseConfirmCharityBalance) {
    refs.charityDisburseConfirmCharityBalance.textContent = t("charity.disburseCharityBefore")
      .replace("{amount}", formatMoney(charityBefore, currency));
  }
  if (refs.charityDisburseConfirmCharityAfter) {
    refs.charityDisburseConfirmCharityAfter.textContent = t("charity.disburseCharityAfter")
      .replace("{amount}", formatMoney(charityAfter, currency));
  }
  if (refs.charityDisburseConfirmAccountBalance) {
    refs.charityDisburseConfirmAccountBalance.textContent = t("charity.disburseAccountBefore")
      .replace("{amount}", formatMoney(accountBefore, currency));
  }
  if (refs.charityDisburseConfirmAccountAfter) {
    refs.charityDisburseConfirmAccountAfter.textContent = t("charity.disburseAccountAfter")
      .replace("{amount}", formatMoney(accountAfter, currency));
  }
  if (refs.charityDisburseConfirmOverlay) refs.charityDisburseConfirmOverlay.classList.remove("hidden");
}

function hideCharityDisburseConfirm() {
  if (refs.charityDisburseConfirmOverlay) refs.charityDisburseConfirmOverlay.classList.add("hidden");
  pendingCharityDisbursement = null;
}

function showCharityDisburseMigrationNotice() {
  if (refs.charityDisburseMigrationOverlay) refs.charityDisburseMigrationOverlay.classList.remove("hidden");
}

function hideCharityDisburseMigrationNotice() {
  if (refs.charityDisburseMigrationOverlay) refs.charityDisburseMigrationOverlay.classList.add("hidden");
}

function isCharityDisburseMigrationError(message) {
  return String(message || "").toLowerCase().includes("saidas de caridade");
}

async function handleCharityDisbursementSubmit(event) {
  event.preventDefault();
  if (!isCharityDisbursementTableReady()) {
    showCharityDisburseMigrationNotice();
    return;
  }

  const amount = Number(refs.charityDisburseAmount?.value);
  const date = refs.charityDisburseDate?.value;
  const currency = refs.charityDisburseCurrency ? refs.charityDisburseCurrency.value : DEFAULT_CURRENCY;
  const description = refs.charityDisburseDescription?.value.trim();
  if (!amount || !date || !description) return;

  if (!canAffordCharityDisbursement(amount, currency)) {
    window.alert(t("charity.insufficientBalance"));
    return;
  }

  pendingCharityDisbursement = { amount, date, currency, description };
  showCharityDisburseConfirm();
}

async function confirmCharityDisbursement() {
  if (!pendingCharityDisbursement) return;
  const payload = pendingCharityDisbursement;
  hideCharityDisburseConfirm();
  if (!canAffordCharityDisbursement(payload.amount, payload.currency)) {
    window.alert(t("charity.insufficientBalance"));
    return;
  }
  try {
    const response = await apiFetch("/api/charity", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    applyBootstrapPayload(response);
    resetCharityDisbursementForm();
    renderCharityOutflowTable();
  } catch (error) {
    const message = parseApiErrorMessage(error);
    if (isCharityDisburseMigrationError(message)) showCharityDisburseMigrationNotice();
    else window.alert(message);
  }
}

function isProfitMigrationError(message) {
  return String(message || "").toLowerCase().includes("distribuicao de lucro");
}

function isPendingReimbursementsError(message) {
  const text = String(message || "").toLowerCase();
  return text.includes("reembolsos por efectuar") || text.includes("reimbursements still to be made");
}

function resetExpenseFormAfterSave() {
  refs.expenseForm.reset();
  refs.expenseDate.value = todayISO();
  if (refs.expensePerson) refs.expensePerson.value = state.session.profile;
  if (refs.expensePayer) refs.expensePayer.value = state.session.profile;
  if (refs.expenseCurrency) refs.expenseCurrency.value = DEFAULT_CURRENCY;
}

async function submitExpenseRecord(payload) {
  try {
    const response = await apiFetch("/api/expenses", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    applyBootstrapPayload(response);
    return response;
  } catch (error) {
    window.alert(parseApiErrorMessage(error));
    return null;
  }
}

async function finalizeExpenseSave(response, expenseDate) {
  const expenseId = response?.createdExpenseId;
  if (expenseId) {
    await attachExpenseInvoiceIfSelected(expenseId);
  }
  if (expenseDate) ensureExpenseRegisterDateFilterIncludes(expenseDate);
  resetExpenseFormAfterSave();
  renderInvoicePanel();
}

async function confirmStudio9Payment() {
  if (!pendingStudio9Expense) return;
  const payload = pendingStudio9Expense;
  if (!canAffordPayment(payload.amount, payload.currency)) {
    hideStudio9PaymentConfirm();
    showBalanceAlert();
    return;
  }
  hideStudio9PaymentConfirm();
  const response = await submitExpenseRecord(payload);
  if (!response) return;
  await finalizeExpenseSave(response, payload.date);
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
    window.localStorage.removeItem(profitCurrencyStorageKey);
  } catch {
    /* ignore */
  }
  if (refs.profitCurrency) refs.profitCurrency.value = DEFAULT_CURRENCY;
  if (refs.profitPctCris) refs.profitPctCris.value = defaultProfitSplits.cris;
  if (refs.profitPctAlex) refs.profitPctAlex.value = defaultProfitSplits.alex;
  if (refs.profitPctStudio9) refs.profitPctStudio9.value = defaultProfitSplits.studio9;
  if (refs.profitPctCharity) refs.profitPctCharity.value = defaultProfitSplits.charity;
  syncProfitDisplayFromBalance();
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

async function handleProfitAction() {
  if (!isProfitDistributionTableReady()) {
    showProfitMigrationNotice();
    return;
  }
  showProfitActionConfirm();
}

async function confirmProfitDistribution() {
  if (!pendingProfitDistribution) return;
  if (hasPendingReimbursements()) {
    hideProfitActionConfirm();
    showPendingReimbursementsAlert();
    return;
  }
  const payload = pendingProfitDistribution;
  hideProfitActionConfirm();
  if (!canAffordPayment(getProfitDistributionOutflow(payload), payload.currency)) {
    showBalanceAlert();
    return;
  }
  try {
    const response = await apiFetch("/api/profit", {
      method: "POST",
      body: JSON.stringify({
        profitAmount: payload.profitAmount,
        currency: payload.currency,
        pctCris: payload.pctCris,
        pctAlex: payload.pctAlex,
        pctStudio9: payload.pctStudio9,
        pctCharity: payload.pctCharity,
      }),
    });
    applyBootstrapPayload(response);
    syncProfitDisplayFromBalance();
    renderProfitDistribution();
    renderProfitDistributionTable();
  } catch (error) {
    const message = parseApiErrorMessage(error);
    if (isProfitMigrationError(message)) showProfitMigrationNotice();
    else if (isPendingReimbursementsError(message)) showPendingReimbursementsAlert();
    else window.alert(message);
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

  const payload = {
    person: refs.expensePerson.value,
    payer,
    currency,
    date,
    amount,
    category,
    description,
    paid: payer === "Studio9",
  };

  if (payer === "Studio9") {
    if (!canAffordPayment(amount, currency)) {
      showBalanceAlert();
      return;
    }
    showStudio9PaymentConfirm(payload);
    return;
  }

  const response = await submitExpenseRecord({ ...payload, paid: false });
  if (response) await finalizeExpenseSave(response, date);
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

function clearFilters() {
  refs.filterPerson.value = "all";
  refs.filterStatus.value = "unpaid";
  applyPeriodMonthToDateFilters();
  render();
}

function clearIncomeFilters() {
  const bounds = getSelectedMonthBounds();
  if (bounds && refs.incomeFilterStartDate && refs.incomeFilterEndDate) {
    refs.incomeFilterStartDate.value = bounds.start;
    refs.incomeFilterEndDate.value = bounds.end;
  }
  if (refs.incomeFilterClient) refs.incomeFilterClient.value = "all";
  render();
}

function clearExpenseRegisterFilters() {
  const bounds = getSelectedMonthBounds();
  if (bounds && refs.expenseRegisterFilterStartDate && refs.expenseRegisterFilterEndDate) {
    refs.expenseRegisterFilterStartDate.value = bounds.start;
    refs.expenseRegisterFilterEndDate.value = bounds.end;
  }
  if (refs.expenseRegisterFilterPayer) refs.expenseRegisterFilterPayer.value = "all";
  if (refs.expenseRegisterFilterCategory) refs.expenseRegisterFilterCategory.value = "all";
  render();
}

function render() {
  renderPeriodHeader();
  renderCategories();
  renderClients();
  renderExpenseSeqPreview();
  renderTotals();
  renderIncomeTable();
  renderExpenseRegisterTable();
  renderTable();
  renderActivities();
  renderCharityPanel();
  renderCharityTable();
  renderCharityOutflowTable();
  renderProfitDistribution();
  renderProfitDistributionTable();
  renderInvoicePanel();
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
  } else if (state.categories.length > 0) {
    refs.expenseCategorySelect.value = state.categories[0];
  }
  renderExpenseCategoryFilter();
}

function renderExpenseCategoryFilter() {
  if (!refs.expenseRegisterFilterCategory) return;
  const current = refs.expenseRegisterFilterCategory.value;
  refs.expenseRegisterFilterCategory.innerHTML = [
    `<option value="all">${escapeHtml(t("filter.allCategories"))}</option>`,
    ...state.categories.map(
      (category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`
    ),
  ].join("");
  if (current === "all" || state.categories.includes(current)) {
    refs.expenseRegisterFilterCategory.value = current;
    return;
  }
  refs.expenseRegisterFilterCategory.value = "all";
}

function resolveExpenseRegisterStatus(expense) {
  if (resolveExpensePayer(expense) === "Studio9") return t("status.paid");
  return expense.paid ? t("status.paid") : t("status.unpaid");
}

function getFilteredExpenseRegisterList() {
  const payer = refs.expenseRegisterFilterPayer ? refs.expenseRegisterFilterPayer.value : "all";
  const category = refs.expenseRegisterFilterCategory ? refs.expenseRegisterFilterCategory.value : "all";
  const startDate = refs.expenseRegisterFilterStartDate ? refs.expenseRegisterFilterStartDate.value : "";
  const endDate = refs.expenseRegisterFilterEndDate ? refs.expenseRegisterFilterEndDate.value : "";

  const expenseRows = state.expenses.filter((item) => {
    const payerOk = payer === "all" || resolveExpensePayer(item) === payer;
    const categoryOk = category === "all" || item.category === category;
    const filterDate = expenseRegisterFilterDate(item);
    const startOk = !startDate || filterDate >= startDate;
    const endOk = !endDate || filterDate <= endDate;
    return payerOk && categoryOk && startOk && endOk;
  });

  let documentRows = [];
  if ((payer === "all" || payer === "Studio9") && category === "all") {
    documentRows = (state.documents || [])
      .filter((item) => item.paid)
      .filter((item) => {
        const startOk = !startDate || item.date >= startDate;
        const endOk = !endDate || item.date <= endDate;
        return startOk && endOk;
      })
      .map(mapLegacyDocumentToRegisterRow);
  }

  return [...expenseRows, ...documentRows].sort((a, b) => {
    const dateA = expenseRegisterFilterDate(a);
    const dateB = expenseRegisterFilterDate(b);
    return dateB.localeCompare(dateA);
  });
}

function renderExpenseRegisterMeta() {
  const items = getFilteredExpenseRegisterList();
  if (refs.expenseRegisterPeriodTotal) {
    refs.expenseRegisterPeriodTotal.textContent = `${t("payments.periodPrefix")} ${formatPendingByCurrency(items)} (${items.length})`;
  }
  if (refs.expenseRegisterAccountBalance) {
    const balances = CURRENCY_CODES.map((code) => formatMoney(getAccountBalances()[code], code)).join(" · ");
    refs.expenseRegisterAccountBalance.textContent = `${t("payments.accountBalance")} ${balances}`;
  }
}

function renderExpenseRegisterTable() {
  if (!refs.expenseRegisterRows) return;
  renderExpenseRegisterMeta();
  const rows = getFilteredExpenseRegisterList();
  if (rows.length === 0) {
    refs.expenseRegisterRows.innerHTML = `<tr><td colspan="8" class="empty">${escapeHtml(t("table.empty"))}</td></tr>`;
    return;
  }

  refs.expenseRegisterRows.innerHTML = rows
    .map((item) => {
      const seq = item.seqNumber != null ? escapeHtml(String(item.seqNumber)) : "—";
      const payer = escapeHtml(resolveExpensePayer(item));
      const status = escapeHtml(resolveExpenseRegisterStatus(item));
      const statusClass = item.paid || resolveExpensePayer(item) === "Studio9" ? "status-paid" : "status-unpaid";
      const paidAt = resolveExpensePaidAt(item);
      const paymentDateCell = paidAt ? formatDate(paidAt) : "—";
      return `
      <tr>
        <td class="td-seq">${seq}</td>
        <td>${formatDate(item.date)}</td>
        <td>${payer}</td>
        <td>${escapeHtml(item.category)}</td>
        <td>${escapeHtml(item.description)}</td>
        <td>${formatMoney(item.amount, resolveCurrency(item))}</td>
        <td><span class="expense-status-badge ${statusClass}">${status}</span></td>
        <td>${paymentDateCell}</td>
      </tr>
    `;
    })
    .join("");
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
  } else {
    selectDefaultIncomeClient();
  }
  renderIncomeClientFilter();
}

function renderIncomeClientFilter() {
  if (!refs.incomeFilterClient) return;
  const current = refs.incomeFilterClient.value;
  refs.incomeFilterClient.innerHTML = [
    `<option value="all">${escapeHtml(t("filter.allClients"))}</option>`,
    ...state.clients.map(
      (client) => `<option value="${escapeHtml(client)}">${escapeHtml(client)}</option>`
    ),
  ].join("");
  if (current === "all" || state.clients.includes(current)) {
    refs.incomeFilterClient.value = current;
    return;
  }
  refs.incomeFilterClient.value = "all";
}

function resolveIncomeClient(income) {
  return String(income?.client || income?.source || "").trim();
}

function getFilteredIncomes() {
  const client = refs.incomeFilterClient ? refs.incomeFilterClient.value : "all";
  const startDate = refs.incomeFilterStartDate ? refs.incomeFilterStartDate.value : "";
  const endDate = refs.incomeFilterEndDate ? refs.incomeFilterEndDate.value : "";
  return state.incomes.filter((item) => {
    const clientName = resolveIncomeClient(item);
    const clientOk = client === "all" || clientName === client;
    const startOk = !startDate || item.date >= startDate;
    const endOk = !endDate || item.date <= endDate;
    return clientOk && startOk && endOk;
  });
}

function renderIncomeTable() {
  if (!refs.incomeRows) return;
  const rows = getFilteredIncomes();
  if (rows.length === 0) {
    refs.incomeRows.innerHTML = `<tr><td colspan="3" class="empty">${escapeHtml(t("table.empty"))}</td></tr>`;
    return;
  }

  refs.incomeRows.innerHTML = rows
    .map(
      (item) => `
      <tr>
        <td>${formatDate(item.date)}</td>
        <td>${escapeHtml(resolveIncomeClient(item))}</td>
        <td>${formatMoney(item.amount, resolveCurrency(item))}</td>
      </tr>
    `
    )
    .join("");
}

function renderTotals() {
  const bounds = getSelectedMonthBounds();
  const inMonth = (isoDate) => {
    if (!bounds || !isoDate) return false;
    return isoDate >= bounds.start && isoDate <= bounds.end;
  };

  const totalEntradas = sumAmountsByCurrency(state.incomes, (item) => inMonth(item.date));
  const docsAsPrimary = (state.documents || []).map((item) => ({ ...item, currency: DEFAULT_CURRENCY }));
  const studio9Expenses = sumAmountsByCurrency(
    state.expenses,
    (item) => resolveExpensePayer(item) === "Studio9" && item.paid && isExpensePaidInMonth(item, inMonth)
  );
  const studio9Documents = sumAmountsByCurrency(
    docsAsPrimary,
    (item) => item.paid && inMonth(item.date)
  );
  const pagamentosStudio9 = addCurrencyBalances(studio9Expenses, studio9Documents);
  const pagamentosReembolsar = sumAmountsByCurrency(
    state.expenses,
    (item) => isReimbursementExpense(item) && item.paid && isExpensePaidInMonth(item, inMonth)
  );
  const totalSaida = addCurrencyBalances(pagamentosStudio9, pagamentosReembolsar);

  renderCurrencySummary(refs.totalEntradas, totalEntradas, { fixedOrder: true });
  renderCurrencySummary(refs.monthStudio9Payments, pagamentosStudio9, { fixedOrder: true });
  renderCurrencySummary(refs.monthReimbursements, pagamentosReembolsar, { fixedOrder: true });
  renderCurrencySummary(refs.monthTotalOutflow, totalSaida, { fixedOrder: true });
  renderCurrencySummary(refs.charityBalanceTotal, getCharityBalances(), { fixedOrder: true });
  renderCurrencySummary(refs.accountBalanceTotal, getAccountBalances(), { fixedOrder: true });
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

function exportIncomePdf() {
  const items = getFilteredIncomes();
  if (items.length === 0) {
    window.alert(t("errors.exportEmpty"));
    return;
  }
  const total = formatPendingByCurrency(items);
  const rows = items.map((item) => [
    formatDate(item.date),
    resolveIncomeClient(item),
    formatMoney(item.amount, resolveCurrency(item)),
  ]);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(t("income.pdfTitle"), 14, 14);
  doc.setFontSize(10);
  doc.text(`${t("payments.periodPrefix")} ${total}`, 14, 22);
  doc.autoTable({
    head: [[t("table.date"), t("income.client"), t("table.amount")]],
    body: rows,
    startY: 28,
    styles: { fontSize: 9 },
  });
  doc.save("studio9-entradas.pdf");
}

function exportExpenseRegisterPdf() {
  const items = getFilteredExpenseRegisterList();
  if (items.length === 0) {
    window.alert(t("errors.exportEmpty"));
    return;
  }
  const total = formatPendingByCurrency(items);
  const rows = items.map((item) => {
    const paidAt = resolveExpensePaidAt(item);
    return [
      item.seqNumber != null ? String(item.seqNumber) : "—",
      formatDate(item.date),
      resolveExpensePayer(item),
      item.category,
      item.description,
      formatMoney(item.amount, resolveCurrency(item)),
      resolveExpenseRegisterStatus(item),
      paidAt ? formatDate(paidAt) : "—",
    ];
  });
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(t("expense.pdfTitle"), 14, 14);
  doc.setFontSize(10);
  doc.text(`${t("payments.periodPrefix")} ${total}`, 14, 22);
  doc.autoTable({
    head: [
      [
        t("expense.seqNumber"),
        t("expense.purchaseDate"),
        t("expense.payer"),
        t("table.category"),
        t("table.description"),
        t("table.amount"),
        t("filter.status"),
        t("expense.paymentDate"),
      ],
    ],
    body: rows,
    startY: 28,
    styles: { fontSize: 7 },
  });
  doc.save("studio9-despesas.pdf");
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

function formatPrimaryCurrency(value) {
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
  if (refs.incomeFilterStartDate && refs.incomeFilterEndDate) {
    refs.incomeFilterStartDate.value = bounds.start;
    refs.incomeFilterEndDate.value = bounds.end;
  }
  if (refs.incomeFilterClient) refs.incomeFilterClient.value = "all";
  if (refs.expenseRegisterFilterStartDate && refs.expenseRegisterFilterEndDate) {
    refs.expenseRegisterFilterStartDate.value = bounds.start;
    refs.expenseRegisterFilterEndDate.value = bounds.end;
  }
  if (refs.expenseRegisterFilterPayer) refs.expenseRegisterFilterPayer.value = "all";
  if (refs.expenseRegisterFilterCategory) refs.expenseRegisterFilterCategory.value = "all";
  if (refs.charityFilterStartDate && refs.charityFilterEndDate) {
    refs.charityFilterStartDate.value = bounds.start;
    refs.charityFilterEndDate.value = bounds.end;
  }
  if (refs.charityOutflowFilterStartDate && refs.charityOutflowFilterEndDate) {
    refs.charityOutflowFilterStartDate.value = bounds.start;
    refs.charityOutflowFilterEndDate.value = bounds.end;
  }
  if (refs.profitFilterStartDate && refs.profitFilterEndDate) {
    refs.profitFilterStartDate.value = bounds.start;
    refs.profitFilterEndDate.value = bounds.end;
  }
  if (refs.invoiceFilterStartDate && refs.invoiceFilterEndDate) {
    refs.invoiceFilterStartDate.value = bounds.start;
    refs.invoiceFilterEndDate.value = bounds.end;
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
