const crypto = require("crypto");
const { getDb } = require("./db");

const INVOICE_BUCKET = "expense-invoices";
const MAX_INVOICE_BYTES = 3 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 3600;

function sanitizeFileName(name) {
  const base = String(name || "fatura.pdf").trim();
  const cleaned = base.replace(/[^\w.\-() ]+/g, "_").slice(0, 120);
  return cleaned.toLowerCase().endsWith(".pdf") ? cleaned : `${cleaned}.pdf`;
}

function storagePathForInvoice(expenseId, invoiceId, fileName) {
  const safeName = sanitizeFileName(fileName);
  return `${expenseId}/${invoiceId}-${safeName}`;
}

function isMissingExpenseInvoicesTable(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return (
    message.includes("expense_invoices") &&
    (message.includes("does not exist") ||
      message.includes("could not find") ||
      message.includes("schema cache"))
  );
}

function mapExpenseInvoices(rows) {
  return (rows || []).map((row) => ({
    id: row.id,
    expenseId: row.expense_id,
    fileName: row.file_name,
    mimeType: row.mime_type || "application/pdf",
    fileSize: row.file_size != null ? Number(row.file_size) : null,
    createdBy: row.created_by || "",
    createdAt: row.created_at || "",
  }));
}

async function fetchExpenseInvoices(db) {
  const res = await db.from("expense_invoices").select("*").order("created_at", { ascending: false });
  if (res.error && isMissingExpenseInvoicesTable(res.error)) {
    return { rows: [], tableReady: false };
  }
  if (res.error) throw res.error;
  return { rows: mapExpenseInvoices(res.data || []), tableReady: true };
}

async function getExpenseById(db, expenseId) {
  const res = await db.from("expenses").select("id, seq_number, date, amount, currency, category, description").eq("id", expenseId).maybeSingle();
  if (res.error) throw res.error;
  return res.data;
}

async function uploadExpenseInvoice(payload, actorProfile) {
  const db = getDb();
  const expenseId = String(payload.expenseId || "").trim();
  const fileName = sanitizeFileName(payload.fileName);
  const mimeType = String(payload.mimeType || "application/pdf").trim().toLowerCase();
  const fileBase64 = String(payload.fileBase64 || "");

  if (!expenseId) throw new Error("Despesa obrigatoria");
  if (mimeType !== "application/pdf") throw new Error("Apenas ficheiros PDF sao permitidos");
  if (!fileBase64) throw new Error("Ficheiro em falta");

  const expense = await getExpenseById(db, expenseId);
  if (!expense) throw new Error("Despesa nao encontrada");

  const existingRes = await db.from("expense_invoices").select("id, storage_path").eq("expense_id", expenseId).maybeSingle();
  if (existingRes.error && !isMissingExpenseInvoicesTable(existingRes.error)) throw existingRes.error;
  if (existingRes.error && isMissingExpenseInvoicesTable(existingRes.error)) {
    throw new Error(
      "Tabela de faturas em falta. Abre o Supabase SQL Editor e corre migration_expense_invoices.sql (ou a seccao 9 de migration_all_pending.sql)."
    );
  }
  if (existingRes.data) {
    throw new Error("Ja existe uma fatura para esta despesa");
  }

  let buffer;
  try {
    buffer = Buffer.from(fileBase64, "base64");
  } catch {
    throw new Error("Ficheiro invalido");
  }
  if (!buffer.length) throw new Error("Ficheiro vazio");
  if (buffer.length > MAX_INVOICE_BYTES) {
    throw new Error("Ficheiro demasiado grande (max. 3 MB)");
  }

  const id = crypto.randomUUID();
  const storagePath = storagePathForInvoice(expenseId, id, fileName);
  const createdAt = new Date().toISOString();

  const uploadRes = await db.storage.from(INVOICE_BUCKET).upload(storagePath, buffer, {
    contentType: mimeType,
    upsert: false,
  });
  if (uploadRes.error) {
    const msg = String(uploadRes.error.message || uploadRes.error).toLowerCase();
    if (msg.includes("bucket") && msg.includes("not found")) {
      throw new Error(
        "Bucket expense-invoices em falta no Supabase Storage. Corre migration_expense_invoices.sql (seccao 9 de migration_all_pending.sql)."
      );
    }
    throw uploadRes.error;
  }

  const insertRes = await db.from("expense_invoices").insert({
    id,
    expense_id: expenseId,
    storage_path: storagePath,
    file_name: fileName,
    mime_type: mimeType,
    file_size: buffer.length,
    created_by: actorProfile,
    created_at: createdAt,
  });
  if (insertRes.error) {
    await db.storage.from(INVOICE_BUCKET).remove([storagePath]);
    if (isMissingExpenseInvoicesTable(insertRes.error)) {
      throw new Error(
        "Tabela de faturas em falta. Abre o Supabase SQL Editor e corre migration_expense_invoices.sql (ou a seccao 9 de migration_all_pending.sql)."
      );
    }
    throw insertRes.error;
  }

  return { id, expenseId, fileName };
}

async function getExpenseInvoiceDownloadUrl(invoiceId) {
  const db = getDb();
  const id = String(invoiceId || "").trim();
  if (!id) throw new Error("Fatura invalida");

  const res = await db.from("expense_invoices").select("storage_path, file_name, mime_type").eq("id", id).maybeSingle();
  if (res.error && isMissingExpenseInvoicesTable(res.error)) {
    throw new Error("Tabela de faturas em falta no Supabase.");
  }
  if (res.error) throw res.error;
  if (!res.data) throw new Error("Fatura nao encontrada");

  const signed = await db.storage.from(INVOICE_BUCKET).createSignedUrl(res.data.storage_path, SIGNED_URL_TTL_SECONDS, {
    download: res.data.file_name || "fatura.pdf",
  });
  if (signed.error) throw signed.error;

  return {
    url: signed.data.signedUrl,
    fileName: res.data.file_name,
    mimeType: res.data.mime_type || "application/pdf",
  };
}

async function deleteAllExpenseInvoiceFiles(db) {
  const listRes = await db.from("expense_invoices").select("storage_path");
  if (listRes.error) {
    if (isMissingExpenseInvoicesTable(listRes.error)) return;
    throw listRes.error;
  }
  const paths = (listRes.data || []).map((row) => row.storage_path).filter(Boolean);
  if (paths.length > 0) {
    const removeRes = await db.storage.from(INVOICE_BUCKET).remove(paths);
    if (removeRes.error) throw removeRes.error;
  }
  await db.from("expense_invoices").delete().not("id", "is", null);
}

module.exports = {
  INVOICE_BUCKET,
  MAX_INVOICE_BYTES,
  isMissingExpenseInvoicesTable,
  mapExpenseInvoices,
  fetchExpenseInvoices,
  uploadExpenseInvoice,
  getExpenseInvoiceDownloadUrl,
  deleteAllExpenseInvoiceFiles,
};
