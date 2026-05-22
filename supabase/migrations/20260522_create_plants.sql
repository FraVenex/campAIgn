create table public.plants (
  id uuid default gen_random_uuid() primary key,
  farm_id uuid references public.farms(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  species text not null,
  position_x numeric not null,
  position_y numeric not null,
  status text not null,
  last_treatment_at timestamp with time zone,
  last_treatment_type text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.plants enable row level security;

create policy "Gli utenti possono vedere le proprie piante"
  on public.plants for select
  using ( auth.uid() = user_id );

create policy "Gli utenti possono inserire le proprie piante"
  on public.plants for insert
  with check ( auth.uid() = user_id );

create policy "Gli utenti possono aggiornare le proprie piante"
  on public.plants for update
  using ( auth.uid() = user_id );

create policy "Gli utenti possono eliminare le proprie piante"
  on public.plants for delete
  using ( auth.uid() = user_id );
