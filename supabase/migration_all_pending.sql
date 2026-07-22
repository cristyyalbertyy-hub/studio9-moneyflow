-- Correr UMA VEZ no SQL Editor do Supabase (projecto ligado a studio9-moneyflow).
-- Aplica todas as migrations pendentes da app.

-- 1) Numero sequencial nas despesas
alter table public.expenses
  add column if not exists seq_number integer;

with ordered as (
  select
    id,
    row_number() over (order by coalesce(created_at, now()), id) as rn
  from public.expenses
  where seq_number is null
)
update public.expenses e
set seq_number = ordered.rn
from ordered
where e.id = ordered.id;

create unique index if not exists expenses_seq_number_key
  on public.expenses (seq_number);

create index if not exists expenses_seq_number_idx
  on public.expenses (seq_number desc);

-- 2) Clientes nas entradas
create table if not exists public.clients (
  name text primary key
);

alter table public.incomes
  add column if not exists client text;

update public.incomes
set client = coalesce(nullif(trim(client), ''), nullif(trim(source), ''))
where client is null or trim(client) = '';

update public.incomes
set client = 'Lemon Squeezy'
where client is null or trim(client) = '';

insert into public.clients(name)
values ('Lemon Squeezy')
on conflict do nothing;

insert into public.clients(name)
select distinct client
from public.incomes
where client is not null and trim(client) <> ''
on conflict do nothing;

-- 3) Quem paga a despesa (Cris / Alex = reembolso, Studio9 = pagamento directo)
alter table public.expenses
  add column if not exists payer text;

update public.expenses
set payer = person
where payer is null or trim(payer) = '';

update public.expenses
set payer = 'Cris'
where payer is null or payer not in ('Cris', 'Alex', 'Studio9');

-- 4) Moeda nas entradas e despesas (EUR / USD / QAR)
alter table public.expenses
  add column if not exists currency text;

alter table public.incomes
  add column if not exists currency text;

update public.expenses
set currency = 'EUR'
where currency is null or trim(currency) = '' or currency not in ('EUR', 'USD', 'QAR');

update public.incomes
set currency = 'EUR'
where currency is null or trim(currency) = '' or currency not in ('EUR', 'USD', 'QAR');

-- 5) Data de pagamento nas despesas (distinta da data da compra)
alter table public.expenses
  add column if not exists paid_at date;

update public.expenses
set paid_at = (created_at at time zone 'UTC')::date
where paid = true and paid_at is null;

create index if not exists expenses_paid_at_idx on public.expenses (paid_at desc);

-- 6) Alocacoes para caridade (Caridade Saldo)
create table if not exists public.charity_allocations (
  id uuid primary key default gen_random_uuid(),
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'EUR' check (currency in ('EUR', 'USD', 'QAR')),
  profit_amount numeric(12,2),
  charity_pct numeric(5,2),
  date date not null,
  created_by text not null check (created_by in ('Cris', 'Alex')),
  created_at timestamptz not null default now()
);

create index if not exists charity_allocations_created_at_idx
  on public.charity_allocations (created_at desc);

create index if not exists charity_allocations_date_idx
  on public.charity_allocations (date desc);

-- 7) Distribuicoes de lucro (Acao na distribuicao de lucro)
create table if not exists public.profit_distributions (
  id uuid primary key default gen_random_uuid(),
  profit_amount numeric(12,2) not null check (profit_amount > 0),
  currency text not null default 'USD' check (currency in ('EUR', 'USD', 'QAR')),
  pct_cris numeric(5,2) not null default 0,
  pct_alex numeric(5,2) not null default 0,
  pct_studio9 numeric(5,2) not null default 0,
  pct_charity numeric(5,2) not null default 0,
  amt_cris numeric(12,2) not null default 0 check (amt_cris >= 0),
  amt_alex numeric(12,2) not null default 0 check (amt_alex >= 0),
  amt_studio9 numeric(12,2) not null default 0 check (amt_studio9 >= 0),
  amt_charity numeric(12,2) not null default 0 check (amt_charity >= 0),
  date date not null,
  created_by text not null check (created_by in ('Cris', 'Alex')),
  created_at timestamptz not null default now()
);

create index if not exists profit_distributions_created_at_idx
  on public.profit_distributions (created_at desc);

create index if not exists profit_distributions_date_idx
  on public.profit_distributions (date desc);

-- 8) Saidas de caridade (compra de pacotes para oferecer)
create table if not exists public.charity_disbursements (
  id uuid primary key default gen_random_uuid(),
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'USD' check (currency in ('EUR', 'USD', 'QAR')),
  description text not null,
  date date not null,
  created_by text not null check (created_by in ('Cris', 'Alex')),
  created_at timestamptz not null default now()
);

create index if not exists charity_disbursements_created_at_idx
  on public.charity_disbursements (created_at desc);

create index if not exists charity_disbursements_date_idx
  on public.charity_disbursements (date desc);

-- 9) Faturas PDF das despesas (Storage bucket + metadados)
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
