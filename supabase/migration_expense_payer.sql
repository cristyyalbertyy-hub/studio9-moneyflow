-- Correr no SQL Editor do Supabase se ainda nao correu migration_all_pending.sql.

alter table public.expenses
  add column if not exists payer text;

update public.expenses
set payer = person
where payer is null or trim(payer) = '';

update public.expenses
set payer = 'Cris'
where payer is null or payer not in ('Cris', 'Alex', 'Studio9');
