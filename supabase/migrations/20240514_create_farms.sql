-- 1. Creazione tabella public.farms
create table public.farms (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  main_crop text,
  latitude numeric,
  longitude numeric,
  plants_count integer default 0,
  layout_type text
);

-- 2. Abilitazione RLS
alter table public.farms enable row level security;

-- 3. Policy RLS
create policy "Gli utenti possono vedere i propri terreni"
  on public.farms for select
  using ( auth.uid() = user_id );

create policy "Gli utenti possono creare i propri terreni"
  on public.farms for insert
  with check ( auth.uid() = user_id );

create policy "Gli utenti possono aggiornare i propri terreni"
  on public.farms for update
  using ( auth.uid() = user_id );

create policy "Gli utenti possono eliminare i propri terreni"
  on public.farms for delete
  using ( auth.uid() = user_id );
