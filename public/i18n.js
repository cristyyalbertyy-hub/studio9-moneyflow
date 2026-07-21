(function () {
  const storageKey = "studio9-lang-v1";

  const messages = {
    pt: {
      "auth.title": "Entrar no MoneyFlow",
      "auth.intro":
        "Uma entrada: indica quem es e a palavra-passe partilhada da equipa.",
      "auth.iAm": "Sou",
      "auth.choose": "Escolher…",
      "auth.password": "Palavra-passe",
      "auth.passwordPlaceholder": "Password partilhada",
      "auth.submit": "Entrar",
      "session.profile": "Perfil",
      "session.logout": "Terminar sessao",
      "lang.label": "Idioma",
      "hero.title": "Gestao de Fluxo de Caixa",
      "hero.referenceMonth": "Mes de referencia",
      "hero.subtitle":
        "Visao mensal: os valores dos cartoes e da atividade seguem o mes de referencia. A listagem usa tambem «De/Ate» (pre-preenchidos ao mudar o mes; podes ajustar se precisares).",
      "hero.unpaidExpenses": "Despesas por pagar (no mes)",
      "hero.totalPaid": "Total pago (no mes)",
      "hero.incomes": "Entradas (no mes)",
      "hero.availability": "Disponibilidade (no mes)",
      "hero.availabilityHint":
        "Disponibilidade = entradas do mes menos reembolsos (despesas) ja pagos menos documentos ja pagos no painel Pagamentos.",
      "hero.accountBalance": "Saldo acumulado (conta)",
      "hero.accountBalanceHint":
        "Saldo acumulado = todas as entradas menos reembolsos e pagamentos ja efectuados, desde o inicio (como conta bancaria).",
      "status.unpaid": "Por pagar",
      "status.paid": "Pago",
      "list.title": "Reembolsos Cris / Alex",
      "list.desc":
        "Por defeito esta a ver o que falta pagar neste mes. O pagamento faz-se aqui: interruptor vermelho (por pagar) passa a verde quando a Studio9 efectua o reembolso.",
      "filter.person": "Pessoa",
      "filter.status": "Estado",
      "filter.from": "De",
      "filter.to": "Ate",
      "filter.allPeople": "Todas",
      "filter.allStatus": "Todos",
      "filter.clear": "Limpar filtros",
      "export.excel": "Exportar Excel",
      "export.pdf": "Exportar PDF",
      "table.date": "Data",
      "table.person": "Pessoa",
      "table.category": "Categoria",
      "table.description": "Descricao",
      "table.amount": "Valor",
      "table.reimbursement": "Reembolso",
      "table.empty": "Sem resultados para os filtros escolhidos.",
      "payments.title": "Pagamentos",
      "payments.desc":
        "Documentos da Studio9 (fornecedores, servicos, etc.). Filtra por estado e intervalo de datas como nos reembolsos. Interruptor vermelho = por pagar; verde = pago (reduz o saldo).",
      "payments.dateMonth": "Data (mes)",
      "payments.amount": "Valor (EUR)",
      "payments.description": "Descricao / referencia",
      "payments.descriptionPlaceholder": "Ex: Fatura electricidade Abril",
      "payments.add": "Adicionar documento",
      "payments.pendingPrefix": "Pendentes (periodo):",
      "payments.pendingMonthPrefix": "Pendentes neste mes:",
      "payments.noPending": "Sem pagamentos por efectuar.",
      "payments.paidThisMonth": "Pagos neste mes (podes reverter)",
      "payments.statusAria": "Estado do pagamento",
      "payments.paymentColumn": "Pagamento",
      "payments.exportPendingPdf": "Exportar PDF pendentes",
      "payments.accountBalance": "Saldo disponivel:",
      "payments.insufficientBalanceTitle": "Atencao",
      "payments.insufficientBalanceMsg":
        "Saldo inferior ao montante a pagar. O pagamento nao foi efectuado.",
      "payments.pendingPdfTitle": "Studio9 - Pagamentos em falta",
      "payments.pendingPdfBalance": "Saldo actual",
      "payments.pendingPdfTotal": "Total pendente",
      "expense.new": "Nova despesa",
      "expense.seqNumber": "Numero",
      "expense.subtitle": "Registar compra feita por Cris ou Alex",
      "expense.reimbursement": "Reembolso pela Studio9",
      "expense.switchHint": "Vermelho = ainda por reembolsar. Verde = ja pago.",
      "expense.save": "Guardar despesa",
      "expense.newCategory": "+ Nova categoria",
      "expense.description": "Descricao",
      "expense.descriptionPlaceholder": "Ex: Compra de dossiers e canetas",
      "expense.reimbursementAria": "Estado do reembolso",
      "category.prompt": "Nome da nova categoria:",
      "category.editBtn": "Editar categoria",
      "category.deleteBtn": "Apagar categoria",
      "category.editPrompt": "Novo nome da categoria:",
      "category.deleteConfirm": "Apagar a categoria «{name}»?",
      "category.noneSelected": "Escolhe uma categoria primeiro.",
      "income.new": "Nova entrada",
      "income.subtitle": "Registar dinheiro que entrou na Studio9",
      "income.source": "Origem / Nota",
      "income.sourcePlaceholder": "Ex: Pagamento cliente X",
      "income.save": "Guardar entrada",
      "profit.title": "Distribuicao de lucro",
      "profit.desc":
        "Introduz o lucro total e ajusta as percentagens. Os valores atribuidos calculam-se automaticamente.",
      "profit.amount": "Lucro a distribuir (EUR)",
      "profit.percent": "Percentagem",
      "profit.assigned": "Valor atribuido",
      "profit.charity": "Caridade",
      "profit.totalLabel": "Total das percentagens:",
      "profit.totalOk": "100% — distribuicao completa.",
      "profit.totalWarn": "Atencao: as percentagens somam {total}%. Ajusta para 100%.",
      "activity.title": "Atividade recente",
      "activity.desc":
        "Gastos, entradas e reembolsos (quando uma despesa «por pagar» passa a paga).",
      "activity.emptyMonth": "Sem atividade neste mes (ou ainda nao ha registos).",
      "activity.emptyAll": "Ainda nao ha atividade registada.",
      "misc.system": "Sistema",
      "misc.ok": "OK",
      "errors.boot": "Nao foi possivel iniciar a aplicacao.",
      "errors.login": "Nao foi possivel entrar.",
      "errors.connection": "Erro de ligacao. Tenta de novo.",
      "errors.pickProfile": "Indica quem entra (Cris ou Alex).",
      "errors.exportEmpty": "Nao existem registos para exportar.",
      "export.pdfTitle": "Studio9 - Listagem de despesas",
      "export.sheetName": "Listagem",
      "api.wrongPassword": "Palavra-passe incorrecta.",
      "api.missingPassword": "Palavra-passe partilhada em falta (STUDIO9_PASSWORD).",
      "api.invalidProfile": "Perfil invalido",
      "api.categoryExists": "Categoria ja existe",
      "api.categoryInUse": "Categoria em uso em despesas existentes",
      "api.categoryNotFound": "Categoria nao encontrada",
      "api.insufficientBalance": "Saldo insuficiente para efectuar este pagamento.",
    },
    en: {
      "auth.title": "Sign in to MoneyFlow",
      "auth.intro":
        "Single sign-in: choose who you are and enter the team shared password.",
      "auth.iAm": "I am",
      "auth.choose": "Choose…",
      "auth.password": "Password",
      "auth.passwordPlaceholder": "Shared password",
      "auth.submit": "Sign in",
      "session.profile": "Profile",
      "session.logout": "Sign out",
      "lang.label": "Language",
      "hero.title": "Cash Flow Management",
      "hero.referenceMonth": "Reference month",
      "hero.subtitle":
        "Monthly view: card totals and activity follow the reference month. The list also uses From/To (pre-filled when you change month; adjust if needed).",
      "hero.unpaidExpenses": "Unpaid expenses (this month)",
      "hero.totalPaid": "Total paid (this month)",
      "hero.incomes": "Income (this month)",
      "hero.availability": "Available balance (this month)",
      "hero.availabilityHint":
        "Available balance = income this month minus reimbursed expenses already paid minus documents marked paid in Payments.",
      "hero.accountBalance": "Running account balance",
      "hero.accountBalanceHint":
        "Running balance = all income minus all reimbursements and payments made, from the start (like a bank account).",
      "status.unpaid": "Unpaid",
      "status.paid": "Paid",
      "list.title": "Cris / Alex reimbursements",
      "list.desc":
        "By default you see what is still unpaid this month. Toggle red (unpaid) to green when Studio9 completes the reimbursement.",
      "filter.person": "Person",
      "filter.status": "Status",
      "filter.from": "From",
      "filter.to": "To",
      "filter.allPeople": "All",
      "filter.allStatus": "All",
      "filter.clear": "Clear filters",
      "export.excel": "Export Excel",
      "export.pdf": "Export PDF",
      "table.date": "Date",
      "table.person": "Person",
      "table.category": "Category",
      "table.description": "Description",
      "table.amount": "Amount",
      "table.reimbursement": "Reimbursement",
      "table.empty": "No results for the selected filters.",
      "payments.title": "Payments",
      "payments.desc":
        "Studio9 documents (suppliers, services, etc.). Filter by status and date range like reimbursements. Red toggle = unpaid; green = paid (reduces balance).",
      "payments.dateMonth": "Date (month)",
      "payments.amount": "Amount (EUR)",
      "payments.description": "Description / reference",
      "payments.descriptionPlaceholder": "E.g. April electricity bill",
      "payments.add": "Add document",
      "payments.pendingPrefix": "Pending (period):",
      "payments.pendingMonthPrefix": "Pending this month:",
      "payments.noPending": "No payments outstanding.",
      "payments.paidThisMonth": "Paid this month (can revert)",
      "payments.statusAria": "Payment status",
      "payments.paymentColumn": "Payment",
      "payments.exportPendingPdf": "Export pending PDF",
      "payments.accountBalance": "Available balance:",
      "payments.insufficientBalanceTitle": "Attention",
      "payments.insufficientBalanceMsg":
        "Balance is lower than the payment amount. Payment was not processed.",
      "payments.pendingPdfTitle": "Studio9 - Outstanding payments",
      "payments.pendingPdfBalance": "Current balance",
      "payments.pendingPdfTotal": "Total pending",
      "expense.new": "New expense",
      "expense.seqNumber": "No.",
      "expense.subtitle": "Record a purchase made by Cris or Alex",
      "expense.reimbursement": "Reimbursed by Studio9",
      "expense.switchHint": "Red = still to reimburse. Green = already paid.",
      "expense.save": "Save expense",
      "expense.newCategory": "+ New category",
      "expense.description": "Description",
      "expense.descriptionPlaceholder": "E.g. Folders and pens purchase",
      "expense.reimbursementAria": "Reimbursement status",
      "category.prompt": "New category name:",
      "category.editBtn": "Edit category",
      "category.deleteBtn": "Delete category",
      "category.editPrompt": "New category name:",
      "category.deleteConfirm": "Delete category «{name}»?",
      "category.noneSelected": "Choose a category first.",
      "income.new": "New income",
      "income.subtitle": "Record money received by Studio9",
      "income.source": "Source / note",
      "income.sourcePlaceholder": "E.g. Client X payment",
      "income.save": "Save income",
      "profit.title": "Profit distribution",
      "profit.desc":
        "Enter total profit and adjust the percentages. Assigned amounts are calculated automatically.",
      "profit.amount": "Profit to distribute (EUR)",
      "profit.percent": "Percentage",
      "profit.assigned": "Assigned amount",
      "profit.charity": "Charity",
      "profit.totalLabel": "Total percentages:",
      "profit.totalOk": "100% — full distribution.",
      "profit.totalWarn": "Note: percentages add up to {total}%. Adjust to 100%.",
      "activity.title": "Recent activity",
      "activity.desc":
        "Expenses, income and reimbursements (when an unpaid expense becomes paid).",
      "activity.emptyMonth": "No activity this month (or no records yet).",
      "activity.emptyAll": "No activity recorded yet.",
      "misc.system": "System",
      "misc.ok": "OK",
      "errors.boot": "Could not start the application.",
      "errors.login": "Could not sign in.",
      "errors.connection": "Connection error. Please try again.",
      "errors.pickProfile": "Choose who is signing in (Cris or Alex).",
      "errors.exportEmpty": "There are no records to export.",
      "export.pdfTitle": "Studio9 - Expense listing",
      "export.sheetName": "Listing",
      "api.wrongPassword": "Incorrect password.",
      "api.missingPassword": "Shared password missing (STUDIO9_PASSWORD).",
      "api.invalidProfile": "Invalid profile",
      "api.categoryExists": "Category already exists",
      "api.categoryInUse": "Category is used by existing expenses",
      "api.categoryNotFound": "Category not found",
      "api.insufficientBalance": "Insufficient balance to process this payment.",
    },
  };

  const apiErrorMap = {
    "Palavra-passe incorrecta.": "api.wrongPassword",
    "Palavra-passe partilhada em falta (STUDIO9_PASSWORD).": "api.missingPassword",
    "Perfil invalido": "api.invalidProfile",
    "Categoria ja existe": "api.categoryExists",
    "Categoria em uso em despesas existentes": "api.categoryInUse",
    "Categoria nao encontrada": "api.categoryNotFound",
    "Saldo insuficiente para efectuar este pagamento.": "api.insufficientBalance",
  };

  let currentLang = readLang();
  const listeners = new Set();

  function readLang() {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored === "en" || stored === "pt") return stored;
    } catch {
      /* ignore */
    }
    const browser = (navigator.language || "pt").toLowerCase();
    return browser.startsWith("en") ? "en" : "pt";
  }

  function persistLang(lang) {
    try {
      window.localStorage.setItem(storageKey, lang);
    } catch {
      /* ignore */
    }
  }

  function t(key) {
    return messages[currentLang][key] ?? messages.pt[key] ?? key;
  }

  function locale() {
    return currentLang === "en" ? "en-GB" : "pt-PT";
  }

  function getLang() {
    return currentLang;
  }

  function setLang(lang) {
    if (lang !== "pt" && lang !== "en") return;
    currentLang = lang;
    persistLang(lang);
    document.documentElement.lang = lang;
    applyPageTranslations();
    updateLangButtons();
    listeners.forEach((fn) => fn(lang));
  }

  function onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function applyPageTranslations() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
    });
    document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
      el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
    });
  }

  function updateLangButtons() {
    document.querySelectorAll("[data-lang]").forEach((btn) => {
      const active = btn.getAttribute("data-lang") === currentLang;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function initLangSwitchers() {
    document.querySelectorAll("[data-lang]").forEach((btn) => {
      btn.addEventListener("click", () => setLang(btn.getAttribute("data-lang")));
    });
    updateLangButtons();
  }

  function translateApiError(message) {
    const key = apiErrorMap[String(message || "").trim()];
    return key ? t(key) : message;
  }

  document.documentElement.lang = currentLang;

  window.MoneyFlowI18n = {
    t,
    locale,
    getLang,
    setLang,
    onChange,
    applyPageTranslations,
    initLangSwitchers,
    translateApiError,
  };
})();
