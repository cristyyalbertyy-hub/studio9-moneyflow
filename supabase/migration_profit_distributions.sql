-- Distribuicoes de lucro (sai do saldo da conta; parte caridade vai para Caridade Saldo).

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
