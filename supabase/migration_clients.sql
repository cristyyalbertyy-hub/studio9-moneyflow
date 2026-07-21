-- Correr no SQL Editor do Supabase (projecto studio9-moneyflow).

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
