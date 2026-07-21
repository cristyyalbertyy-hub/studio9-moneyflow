-- Data em que a despesa foi efectivamente paga (reembolso ou Studio9).
-- Diferente de date (data da compra / despesa).

alter table public.expenses
  add column if not exists paid_at date;

update public.expenses
set paid_at = (created_at at time zone 'UTC')::date
where paid = true and paid_at is null;

create index if not exists expenses_paid_at_idx on public.expenses (paid_at desc);
