create extension if not exists "pgcrypto";

create table if not exists public.categories (
  name text primary key
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  person text not null check (person in ('Cris', 'Alex')),
  date date not null,
  amount numeric(12,2) not null check (amount > 0),
  category text not null,
  description text not null,
  paid boolean not null default false,
  created_by text not null check (created_by in ('Cris', 'Alex')),
  created_at timestamptz not null default now()
);

create index if not exists expenses_created_at_idx on public.expenses (created_at desc);
create index if not exists expenses_date_idx on public.expenses (date desc);

create table if not exists public.incomes (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  amount numeric(12,2) not null check (amount > 0),
  source text not null,
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

insert into public.categories(name)
values
  ('Papelaria'),
  ('Transporte'),
  ('Almoco'),
  ('Software')
on conflict do nothing;
