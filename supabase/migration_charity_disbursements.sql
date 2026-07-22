-- Saidas de caridade (compra de pacotes para oferecer)
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
