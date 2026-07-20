-- Correr no SQL Editor do Supabase (projecto studio9-moneyflow).
-- Adiciona numero sequencial as despesas existentes e novas.

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
