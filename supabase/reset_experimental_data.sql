-- Repor dados experimentais e comecar de novo (IRREVERSIVEL).
-- Correr no SQL Editor do Supabase quando a fase de testes terminar.

truncate table public.activities restart identity cascade;
truncate table public.expenses restart identity cascade;
truncate table public.incomes restart identity cascade;
truncate table public.documents restart identity cascade;
truncate table public.charity_allocations restart identity cascade;

insert into public.categories(name)
values
  ('Papelaria'),
  ('Transporte'),
  ('Almoco'),
  ('Software')
on conflict do nothing;

insert into public.clients(name)
values ('Lemon Squeezy')
on conflict do nothing;
