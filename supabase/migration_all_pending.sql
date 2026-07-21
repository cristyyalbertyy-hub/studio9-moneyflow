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
