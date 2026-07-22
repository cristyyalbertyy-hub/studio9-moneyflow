-- Faturas PDF ligadas a despesas + bucket Storage (correr no SQL Editor do Supabase).

-- Bucket privado para PDFs (service role da app faz upload/download).
insert into storage.buckets (id, name, public)
values ('expense-invoices', 'expense-invoices', false)
on conflict (id) do nothing;

create table if not exists public.expense_invoices (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null default 'application/pdf',
  file_size bigint,
  created_by text not null check (created_by in ('Cris', 'Alex')),
  created_at timestamptz not null default now(),
  unique (expense_id)
);

create index if not exists expense_invoices_created_at_idx
  on public.expense_invoices (created_at desc);

create index if not exists expense_invoices_expense_id_idx
  on public.expense_invoices (expense_id);
