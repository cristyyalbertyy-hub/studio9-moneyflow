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
      "hero.unpaidExpenses": "Reembolsos por pagar (no mes)",
      "hero.totalPaid": "Reembolsos pagos (no mes)",
      "hero.incomes": "Entradas (no mes)",
      "hero.availability": "Disponibilidade (no mes)",
      "hero.availabilityHint":
        "Disponibilidade = entradas do mes menos reembolsos (despesas) ja pagos menos documentos ja pagos no painel Pagamentos.",
      "hero.accountBalance": "Saldo acumulado (conta)",
      "hero.accountBalanceHint":
        "Saldo acumulado por moeda = entradas menos reembolsos e pagamentos ja efectuados (documentos em euros). Cada moeda tem saldo independente.",
      "currency.label": "Moeda",
      "currency.EUR": "Euro (EUR)",
      "currency.USD": "Dolar (USD)",
      "currency.QAR": "Dirham Qatar (QAR)",
      "status.unpaid": "Por pagar",
      "status.paid": "Pago",
      "list.title": "Reembolsos Cris / Alex",
      "list.desc":
        "Despesas em que Cris ou Alex pagou e aguardam reembolso pela Studio9. O interruptor vermelho passa a verde quando o reembolso e efectuado.",
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
        "Documentos e despesas pagas directamente pela Studio9. Filtra por estado e datas. Ao marcar como pago verifica-se o saldo disponivel.",
      "payments.dateMonth": "Data (mes)",
      "payments.amount": "Valor",
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
      "expense.new": "Registo de Despesa",
      "expense.seqNumber": "Numero",
      "expense.subtitle": "Registar despesa e indicar quem a vai pagar",
      "expense.registeredBy": "Registado por",
      "expense.payer": "Quem paga",
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
      "category.deleteConfirm": "Vais apagar a categoria «{name}».",
      "category.noneSelected": "Escolhe uma categoria primeiro.",
      "manage.selectClient": "Cliente",
      "manage.selectCategory": "Categoria",
      "manage.name": "Nome",
      "manage.save": "Guardar",
      "manage.deleteAction": "Apagar",
      "manage.emptyClients": "Ainda nao ha clientes para editar ou apagar.",
      "manage.emptyCategories": "Ainda nao ha categorias para editar ou apagar.",
      "manage.newClientTitle": "Novo cliente",
      "manage.editClientTitle": "Editar cliente",
      "manage.deleteClientTitle": "Apagar cliente",
      "manage.newCategoryTitle": "Nova categoria",
      "manage.editCategoryTitle": "Editar categoria",
      "manage.deleteCategoryTitle": "Apagar categoria",
      "income.new": "Nova entrada",
      "income.subtitle": "Registar dinheiro que entrou na Studio9",
      "income.client": "Cliente",
      "income.save": "Guardar entrada",
      "client.newBtn": "+ Novo cliente",
      "client.editBtn": "Editar cliente",
      "client.deleteBtn": "Apagar cliente",
      "client.prompt": "Nome do novo cliente:",
      "client.editPrompt": "Novo nome do cliente:",
      "client.deleteConfirm": "Vais apagar o cliente «{name}».",
      "client.noneSelected": "Escolhe um cliente primeiro.",
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
      "admin.experimental.title": "Fase experimental",
      "admin.experimental.desc":
        "Durante os testes podes apagar todos os registos e comecar de novo. Esta accao e irreversivel.",
      "admin.experimental.button": "Repor dados experimentais",
      "admin.reset.title": "Repor dados experimentais",
      "admin.reset.warning":
        "Isto apaga despesas, entradas, pagamentos, documentos e actividade. Categorias e clientes voltam ao estado inicial. Nao ha forma de recuperar os dados.",
      "admin.reset.confirmLabel": "Escreve REPOS para confirmar",
      "admin.reset.passwordLabel": "Palavra-passe",
      "admin.reset.cancel": "Cancelar",
      "admin.reset.submit": "Repor tudo",
      "admin.reset.invalidPhrase": "Escreve REPOS (maiusculas) para confirmar.",
      "admin.reset.finalConfirm":
        "Ultima confirmacao: tens a certeza absoluta que queres apagar todos os dados?",
      "admin.reset.success": "Dados repostos. Podes comecar de novo.",
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
      "api.clientExists": "Cliente ja existe",
      "api.clientInUse": "Cliente em uso em entradas existentes",
      "api.clientNotFound": "Cliente nao encontrado",
      "api.clientRequired": "Cliente obrigatorio",
      "api.clientsTableMissing":
        "Tabela de clientes em falta. Abre o Supabase SQL Editor e corre migration_clients.sql.",
      "api.invalidCurrency": "Moeda invalida",
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
      "hero.unpaidExpenses": "Reimbursements due (this month)",
      "hero.totalPaid": "Reimbursements paid (this month)",
      "hero.incomes": "Income (this month)",
      "hero.availability": "Available balance (this month)",
      "hero.availabilityHint":
        "Available balance = income this month minus reimbursed expenses already paid minus documents marked paid in Payments.",
      "hero.accountBalance": "Running account balance",
      "hero.accountBalanceHint":
        "Running balance per currency = income minus reimbursements and payments made (documents in euros). Each currency has an independent balance.",
      "currency.label": "Currency",
      "currency.EUR": "Euro (EUR)",
      "currency.USD": "US Dollar (USD)",
      "currency.QAR": "Qatar Dirham (QAR)",
      "status.unpaid": "Unpaid",
      "status.paid": "Paid",
      "list.title": "Cris / Alex reimbursements",
      "list.desc":
        "Expenses paid by Cris or Alex awaiting reimbursement from Studio9. Red switch turns green when reimbursed.",
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
        "Documents and expenses paid directly by Studio9. Filter by status and dates. Marking as paid checks available balance.",
      "payments.dateMonth": "Date (month)",
      "payments.amount": "Amount",
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
      "expense.new": "Expense record",
      "expense.seqNumber": "No.",
      "expense.subtitle": "Record an expense and choose who will pay",
      "expense.registeredBy": "Recorded by",
      "expense.payer": "Who pays",
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
      "category.deleteConfirm": "You are about to delete category «{name}».",
      "category.noneSelected": "Choose a category first.",
      "manage.selectClient": "Client",
      "manage.selectCategory": "Category",
      "manage.name": "Name",
      "manage.save": "Save",
      "manage.deleteAction": "Delete",
      "manage.emptyClients": "No clients to edit or delete yet.",
      "manage.emptyCategories": "No categories to edit or delete yet.",
      "manage.newClientTitle": "New client",
      "manage.editClientTitle": "Edit client",
      "manage.deleteClientTitle": "Delete client",
      "manage.newCategoryTitle": "New category",
      "manage.editCategoryTitle": "Edit category",
      "manage.deleteCategoryTitle": "Delete category",
      "income.new": "New income",
      "income.subtitle": "Record money received by Studio9",
      "income.client": "Client",
      "income.save": "Save income",
      "client.newBtn": "+ New client",
      "client.editBtn": "Edit client",
      "client.deleteBtn": "Delete client",
      "client.prompt": "New client name:",
      "client.editPrompt": "New client name:",
      "client.deleteConfirm": "You are about to delete client «{name}».",
      "client.noneSelected": "Choose a client first.",
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
      "admin.experimental.title": "Experimental phase",
      "admin.experimental.desc":
        "During testing you can wipe all records and start again. This action is irreversible.",
      "admin.experimental.button": "Reset experimental data",
      "admin.reset.title": "Reset experimental data",
      "admin.reset.warning":
        "This deletes expenses, income, payments, documents and activity. Categories and clients return to defaults. Data cannot be recovered.",
      "admin.reset.confirmLabel": "Type REPOS to confirm",
      "admin.reset.passwordLabel": "Password",
      "admin.reset.cancel": "Cancel",
      "admin.reset.submit": "Reset everything",
      "admin.reset.invalidPhrase": "Type REPOS (uppercase) to confirm.",
      "admin.reset.finalConfirm":
        "Final confirmation: are you absolutely sure you want to delete all data?",
      "admin.reset.success": "Data reset. You can start fresh.",
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
      "api.clientExists": "Client already exists",
      "api.clientInUse": "Client is used by existing income records",
      "api.clientNotFound": "Client not found",
      "api.clientRequired": "Client is required",
      "api.clientsTableMissing":
        "Clients table is missing. Open the Supabase SQL Editor and run migration_clients.sql.",
      "api.invalidCurrency": "Invalid currency",
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
    "Cliente ja existe": "api.clientExists",
    "Cliente em uso em entradas existentes": "api.clientInUse",
    "Cliente nao encontrado": "api.clientNotFound",
    "Cliente obrigatorio": "api.clientRequired",
    "Moeda invalida": "api.invalidCurrency",
    "Tabela de clientes em falta. Corre migration_clients.sql no Supabase SQL Editor.":
      "api.clientsTableMissing",
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
