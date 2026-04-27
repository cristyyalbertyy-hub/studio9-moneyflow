const state = {
  expenses: [],
  incomes: [],
  documents: [],
  categories: [],
  activities: [],
  session: null,
  socket: null,
};

const sessionCacheKey = "studio9-session-v1";
const periodStorageKey = "studio9-period-month-v1";

const refs = {
  totalPorPagar: document.getElementById("totalPorPagar"),
  totalPago: document.getElementById("totalPago"),
  totalEntradas: document.getElementById("totalEntradas"),
  disponibilidadeAtual: document.getElementById("disponibilidadeAtual"),
  documentForm: document.getElementById("documentForm"),
  documentDate: document.getElementById("documentDate"),
  documentAmount: document.getElementById("documentAmount"),
  documentLabel: document.getElementById("documentLabel"),
  paymentDocsList: document.getElementById("paymentDocsList"),
  documentsPendingTotal: document.getElementById("documentsPendingTotal"),
  authOverlay: document.getElementById("authOverlay"),
  activeProfile: document.getElementById("activeProfile"),
  logoutBtn: document.getElementById("logoutBtn"),
  exportExcelBtn: document.getElementById("exportExcelBtn"),
  exportPdfBtn: document.getElementById("exportPdfBtn"),
  statusLabel: document.getElementById("statusLabel"),
  expenseCategorySelect: document.getElementById("expenseCategorySelect"),
  newCategoryBtn: document.getElementById("newCategoryBtn"),
  expenseRows: document.getElementById("expenseRows"),
  expenseForm: document.getElementById("expenseForm"),
  expensePerson: document.getElementById("expensePerson"),
  expenseDate: document.getElementById("expenseDate"),
  expenseAmount: document.getElementById("expenseAmount"),
  expenseDescription: document.getElementById("expenseDescription"),
  expensePaid: document.getElementById("expensePaid"),
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
};

boot().catch((error) => {
  console.error(error);
  window.alert("Nao foi possivel iniciar a aplicacao.");
});

async function boot() {
  const now = todayISO();
  refs.expenseDate.value = now;
  refs.incomeDate.value = now;
  if (refs.documentDate) refs.documentDate.value = now;
  initPeriodMonth();
  refs.expensePaid.addEventListener("change", updatePaidLabel);
  refs.newCategoryBtn.addEventListener("click", handleNewCategory);
  refs.expenseForm.addEventListener("submit", handleExpenseSubmit);
  refs.incomeForm.addEventListener("submit", handleIncomeSubmit);
  if (refs.documentForm) refs.documentForm.addEventListener("submit", handleDocumentSubmit);
  refs.clearFilters.addEventListener("click", clearFilters);
  refs.logoutBtn.addEventListener("click", () => logout(true));
  refs.exportExcelBtn.addEventListener("click", exportExcel);
  refs.exportPdfBtn.addEventListener("click", exportPdf);
  if (refs.authForm) refs.authForm.addEventListener("submit", handleAuthSubmit);

  [refs.filterPerson, refs.filterStatus, refs.filterStartDate, refs.filterEndDate].forEach(
    (el) => el.addEventListener("change", render)
  );

  if (refs.periodMonth) {
    refs.periodMonth.addEventListener("change", () => {
      persistPeriodMonth(refs.periodMonth.value);
      applyPeriodMonthToDateFilters();
      render();
    });
  }

  updatePaidLabel();
  renderPeriodHeader();

  const cached = readSessionCache();
  if (cached) {
    state.session = cached;
    showAuthedUi();
    connectSocket();
    try {
      await fetchBootstrap();
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
      showAuthError(data.error || "Nao foi possivel entrar.");
      return;
    }
    state.session = { token: data.token, profile: data.profile };
    persistSessionCache();
    showAuthedUi();
    connectSocket();
    await fetchBootstrap();
  } catch (error) {
    console.error(error);
    showAuthError("Erro de ligacao. Tenta de novo.");
  }
}

function logout(showOverlay) {
  state.session = null;
  if (state.socket) {
    state.socket.disconnect();
    state.socket = null;
  }
  window.localStorage.removeItem(sessionCacheKey);
  if (showOverlay) showAuthUi();
}

function showAuthUi() {
  refs.authOverlay.classList.remove("hidden");
  refs.activeProfile.textContent = "Perfil: -";
  if (refs.authForm) refs.authForm.reset();
  if (refs.authPassword) refs.authPassword.value = "";
  hideAuthError();
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
    showAuthError("Indica quem entra (Cris ou Alex).");
    return;
  }
  await loginWithPassword(profile, refs.authPassword ? refs.authPassword.value : "");
}

function showAuthedUi() {
  refs.authOverlay.classList.add("hidden");
  refs.activeProfile.textContent = `Perfil: ${state.session.profile}`;
  refs.expensePerson.value = state.session.profile;
}

function connectSocket() {
  if (state.socket || !state.session) return;
  state.socket = io({ auth: { token: state.session.token } });
  state.socket.on("data:update", (payload) => {
    state.expenses = payload.expenses;
    state.incomes = payload.incomes;
    state.categories = payload.categories;
    state.documents = Array.isArray(payload.documents) ? payload.documents : [];
    state.activities = Array.isArray(payload.activities) ? payload.activities : [];
    render();
  });
}

async function fetchBootstrap() {
  const response = await apiFetch("/api/bootstrap");
  state.expenses = Array.isArray(response.expenses) ? response.expenses : [];
  state.incomes = Array.isArray(response.incomes) ? response.incomes : [];
  state.categories = Array.isArray(response.categories) ? response.categories : [];
  state.documents = Array.isArray(response.documents) ? response.documents : [];
  state.activities = Array.isArray(response.activities) ? response.activities : [];
  render();
}

async function handleExpenseSubmit(event) {
  event.preventDefault();
  const category = refs.expenseCategorySelect.value.trim();
  const description = refs.expenseDescription.value.trim();
  const amount = Number(refs.expenseAmount.value);
  const date = refs.expenseDate.value;
  if (!category || !description || !amount || !date) return;

  await apiFetch("/api/expenses", {
    method: "POST",
    body: JSON.stringify({
      person: refs.expensePerson.value,
      date,
      amount,
      category,
      description,
      paid: refs.expensePaid.checked,
    }),
  });

  refs.expenseForm.reset();
  refs.expenseDate.value = todayISO();
  refs.expensePerson.value = state.session.profile;
  refs.expensePaid.checked = false;
  updatePaidLabel();
}

async function handleIncomeSubmit(event) {
  event.preventDefault();
  const amount = Number(refs.incomeAmount.value);
  const date = refs.incomeDate.value;
  const source = refs.incomeSource.value.trim();
  if (!amount || !date || !source) return;

  await apiFetch("/api/incomes", {
    method: "POST",
    body: JSON.stringify({ amount, date, source }),
  });

  refs.incomeForm.reset();
  refs.incomeDate.value = todayISO();
}

async function handleDocumentSubmit(event) {
  event.preventDefault();
  const label = refs.documentLabel.value.trim();
  const amount = Number(refs.documentAmount.value);
  const date = refs.documentDate.value;
  if (!label || !amount || !date) return;

  await apiFetch("/api/documents", {
    method: "POST",
    body: JSON.stringify({ label, amount, date }),
  });

  refs.documentForm.reset();
  refs.documentDate.value = todayISO();
}

async function handleNewCategory() {
  const value = window.prompt("Nome da nova categoria:");
  if (!value) return;
  const category = value.trim();
  if (!category) return;
  await apiFetch("/api/categories", {
    method: "POST",
    body: JSON.stringify({ category }),
  });
  refs.expenseCategorySelect.value = category;
}

function updatePaidLabel() {
  const paid = refs.expensePaid.checked;
  refs.statusLabel.textContent = paid ? "Pago" : "Por pagar";
  refs.statusLabel.classList.toggle("on", paid);
  refs.statusLabel.classList.toggle("off", !paid);
}

function clearFilters() {
  refs.filterPerson.value = "Todas";
  refs.filterStatus.value = "Por pagar";
  applyPeriodMonthToDateFilters();
  render();
}

function render() {
  renderPeriodHeader();
  renderCategories();
  renderTotals();
  renderPaymentPanel();
  renderTable();
  renderActivities();
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
}

function renderPaymentPanel() {
  if (!refs.paymentDocsList || !refs.documentsPendingTotal) return;
  const bounds = getSelectedMonthBounds();
  const inMonth = (isoDate) => {
    if (!bounds || !isoDate) return false;
    return isoDate >= bounds.start && isoDate <= bounds.end;
  };

  const docs = (state.documents || []).filter((item) => inMonth(item.date));
  const pending = docs.filter((item) => !item.paid).sort((a, b) => (a.date < b.date ? 1 : -1));
  const paid = docs.filter((item) => item.paid).sort((a, b) => (a.date < b.date ? 1 : -1));
  const pendingSum = pending.reduce((sum, item) => sum + item.amount, 0);
  refs.documentsPendingTotal.textContent = `Pendentes no mes: ${formatEUR(pendingSum)}`;

  const rowHtml = (item, isPaid) => {
    const id = escapeHtml(item.id);
    const checked = isPaid ? "checked" : "";
    const spanClass = isPaid ? "on" : "off";
    const spanText = isPaid ? "Pago" : "Por pagar";
    const by = item.createdBy ? escapeHtml(item.createdBy) : "Sistema";
    return `
      <li class="payment-row ${isPaid ? "paid-row" : ""}" data-doc-id="${id}">
        <div class="payment-row-main">
          <div class="payment-row-date">${formatDate(item.date)}</div>
          <p class="payment-row-title">${escapeHtml(item.label)}</p>
          <div class="owner-badge-row">
            <span class="owner-badge">${by}</span>
          </div>
        </div>
        <div class="payment-row-amount">${formatEUR(item.amount)}</div>
        <label class="payment-switch">
          <span class="${spanClass}">${spanText}</span>
          <input type="checkbox" data-doc-toggle="${id}" ${checked} aria-label="Estado do pagamento" />
        </label>
      </li>
    `;
  };

  let html = "";
  if (pending.length === 0) {
    html += '<li class="empty">Sem documentos por pagar neste mes.</li>';
  } else {
    html += pending.map((item) => rowHtml(item, false)).join("");
  }

  if (paid.length > 0) {
    html += `<li class="payments-subheading" style="list-style:none;">Pagos neste mes (podes reverter)</li>`;
    html += paid.map((item) => rowHtml(item, true)).join("");
  }

  refs.paymentDocsList.innerHTML = html;

  refs.paymentDocsList.querySelectorAll("[data-doc-toggle]").forEach((input) => {
    input.addEventListener("change", async () => {
      const docId = input.getAttribute("data-doc-toggle");
      await apiFetch(`/api/documents/${docId}/toggle-paid`, { method: "PATCH" });
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
    const hint = bounds
      ? "Sem atividade neste mes (ou ainda nao ha registos)."
      : "Ainda nao ha atividade registada.";
    refs.activityList.innerHTML = `<li class="empty" style="padding:16px;">${hint}</li>`;
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
    refs.expenseRows.innerHTML =
      '<tr><td colspan="6" class="empty">Sem resultados para os filtros escolhidos.</td></tr>';
    return;
  }

  refs.expenseRows.innerHTML = rows
    .map((item) => {
      const id = escapeHtml(item.id);
      const spanClass = item.paid ? "on" : "off";
      const spanText = item.paid ? "Pago" : "Por pagar";
      const checked = item.paid ? "checked" : "";
      return `
      <tr>
        <td>${formatDate(item.date)}</td>
        <td>${escapeHtml(item.person)}</td>
        <td>${escapeHtml(item.category)}</td>
        <td>${escapeHtml(item.description)}</td>
        <td>${formatEUR(item.amount)}</td>
        <td class="td-reembolso">
          <label class="payment-switch payment-switch--table">
            <span class="${spanClass}">${spanText}</span>
            <input type="checkbox" data-expense-toggle="${id}" ${checked} aria-label="Estado do reembolso" />
          </label>
        </td>
      </tr>
    `;
    })
    .join("");

  refs.expenseRows.querySelectorAll("[data-expense-toggle]").forEach((input) => {
    input.addEventListener("change", async () => {
      const expenseId = input.getAttribute("data-expense-toggle");
      await apiFetch(`/api/expenses/${expenseId}/toggle`, { method: "PATCH" });
    });
  });
}

function getFilteredExpenses() {
  const person = refs.filterPerson.value;
  const status = refs.filterStatus.value;
  const startDate = refs.filterStartDate.value;
  const endDate = refs.filterEndDate.value;
  return state.expenses.filter((item) => {
    const personOk = person === "Todas" || item.person === person;
    const statusOk =
      status === "Todos" ||
      (status === "Pago" && item.paid) ||
      (status === "Por pagar" && !item.paid);
    const startOk = !startDate || item.date >= startDate;
    const endOk = !endDate || item.date <= endDate;
    return personOk && statusOk && startOk && endOk;
  });
}

function exportExcel() {
  const rows = getFilteredExpenses().map((item) => ({
    Data: formatDate(item.date),
    Pessoa: item.person,
    Categoria: item.category,
    Descricao: item.description,
    Valor: item.amount,
    Reembolso: item.paid ? "Pago" : "Por pagar",
  }));
  if (rows.length === 0) {
    window.alert("Nao existem registos para exportar.");
    return;
  }
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Listagem");
  XLSX.writeFile(workbook, "studio9-listagem.xlsx");
}

function exportPdf() {
  const rows = getFilteredExpenses().map((item) => [
    formatDate(item.date),
    item.person,
    item.category,
    item.description,
    formatEUR(item.amount),
    item.paid ? "Pago" : "Por pagar",
  ]);
  if (rows.length === 0) {
    window.alert("Nao existem registos para exportar.");
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text("Studio9 - Listagem de despesas", 14, 14);
  doc.autoTable({
    head: [["Data", "Pessoa", "Categoria", "Descricao", "Valor", "Reembolso"]],
    body: rows,
    startY: 20,
    styles: { fontSize: 9 },
  });
  doc.save("studio9-listagem.pdf");
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
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(value || 0);
}

function formatDate(isoDate) {
  return new Intl.DateTimeFormat("pt-PT").format(new Date(isoDate));
}

function formatDateTime(iso) {
  return new Intl.DateTimeFormat("pt-PT", {
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
  if (!bounds || !refs.filterStartDate || !refs.filterEndDate) return;
  refs.filterStartDate.value = bounds.start;
  refs.filterEndDate.value = bounds.end;
  if (refs.filterStatus) refs.filterStatus.value = "Por pagar";
}

function renderPeriodHeader() {
  if (!refs.periodMonthDisplay || !refs.periodMonth) return;
  const ym = refs.periodMonth.value || currentMonthYM();
  const b = monthBoundsFromYM(ym);
  if (!b) {
    refs.periodMonthDisplay.textContent = "";
    return;
  }
  const label = new Intl.DateTimeFormat("pt-PT", {
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
