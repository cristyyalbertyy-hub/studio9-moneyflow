create extension if not exists "pgcrypto";

create table if not exists public.categories (
  name text primary key
);

create table if not exists public.clients (
  name text primary key
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  seq_number integer unique,
  person text not null check (person in ('Cris', 'Alex')),
  payer text not null check (payer in ('Cris', 'Alex', 'Studio9')) default 'Cris',
  date date not null,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null check (currency in ('EUR', 'USD', 'QAR')) default 'USD',
  category text not null,
  description text not null,
  paid boolean not null default false,
  paid_at date,
  created_by text not null check (created_by in ('Cris', 'Alex')),
  created_at timestamptz not null default now()
);

create index if not exists expenses_created_at_idx on public.expenses (created_at desc);
create index if not exists expenses_date_idx on public.expenses (date desc);
create index if not exists expenses_seq_number_idx on public.expenses (seq_number desc);

create table if not exists public.incomes (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null check (currency in ('EUR', 'USD', 'QAR')) default 'USD',
  client text not null,
  source text,
  created_by text not null check (created_by in ('Cris', 'Alex')),
  created_at timestamptz not null default now()
);

create index if not exists incomes_created_at_idx on public.incomes (created_at desc);
create index if not exists incomes_date_idx on public.incomes (date desc);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  amount numeric(12,2) not null check (amount > 0),
  date date not null,
  paid boolean not null default false,
  created_by text not null check (created_by in ('Cris', 'Alex')),
  created_at timestamptz not null default now()
);

create index if not exists documents_created_at_idx on public.documents (created_at desc);
create index if not exists documents_date_idx on public.documents (date desc);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  at timestamptz not null default now(),
  by text not null check (by in ('Cris', 'Alex')),
  summary text not null,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists activities_at_idx on public.activities (at desc);

create table if not exists public.charity_allocations (
  id uuid primary key default gen_random_uuid(),
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'USD' check (currency in ('EUR', 'USD', 'QAR')),
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

insert into public.categories(name)
values
  ('Papelaria'),
  ('Transporte'),
  ('Almoco'),
  ('Software')
on conflict do nothing;

insert into public.clients(name)
values ('Lemon Squeezy')
on conflict do nothing;
