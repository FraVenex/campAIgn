create table public.events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  farm_id uuid references public.farms(id) on delete cascade not null,
  title text not null,
  description text,
  type text not null,
  "start" timestamp with time zone not null,
  "end" timestamp with time zone not null,
  all_day boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.events enable row level security;

create policy "Gli utenti possono vedere i propri eventi"
  on public.events for select
  using ( auth.uid() = user_id );

create policy "Gli utenti possono creare i propri eventi"
  on public.events for insert
  with check ( auth.uid() = user_id );

create policy "Gli utenti possono aggiornare i propri eventi"
  on public.events for update
  using ( auth.uid() = user_id );

create policy "Gli utenti possono eliminare i propri eventi"
  on public.events for delete
  using ( auth.uid() = user_id );
