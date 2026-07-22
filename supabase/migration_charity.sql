-- Alocacoes de lucro para caridade (sai do saldo da conta, fica em Caridade Saldo).

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
