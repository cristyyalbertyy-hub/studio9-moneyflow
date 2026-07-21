-- Moeda nas entradas e despesas (EUR / USD / QAR)
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
