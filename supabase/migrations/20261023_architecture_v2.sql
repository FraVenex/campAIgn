-- Architettura v2: Diario, Interventi, Raccolta, Contabilità, Galleria, anagrafica piante estesa.
-- Idempotente: può essere rieseguita senza errori.
-- Finché questa migrazione non è applicata l'app usa un fallback locale (localStorage).

-- 1. Anagrafica piante estesa
alter table public.plants
  add column if not exists variety text,
  add column if not exists planting_year integer,
  add column if not exists description text;

-- 2. Stato operativo degli interventi (da svolgere / in corso / svolta / saltata)
alter table public.events
  add column if not exists work_status text not null default 'todo'
    check (work_status in ('todo', 'in_progress', 'done', 'skipped'));

update public.events
  set work_status = 'done'
  where description like '[STATUS:completata%' and work_status = 'todo';

-- 3. Note generali (bacheca) e note rapide per pianta
create table if not exists public.notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  farm_id uuid references public.farms(id) on delete cascade,
  plant_id uuid references public.plants(id) on delete cascade,
  title text,
  content text not null,
  color text not null default 'yellow',
  pinned boolean not null default false,
  reminder_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.notes enable row level security;
drop policy if exists "Note: lettura propria" on public.notes;
drop policy if exists "Note: inserimento proprio" on public.notes;
drop policy if exists "Note: modifica propria" on public.notes;
drop policy if exists "Note: eliminazione propria" on public.notes;
create policy "Note: lettura propria" on public.notes for select using (auth.uid() = user_id);
create policy "Note: inserimento proprio" on public.notes for insert with check (auth.uid() = user_id);
create policy "Note: modifica propria" on public.notes for update using (auth.uid() = user_id);
create policy "Note: eliminazione propria" on public.notes for delete using (auth.uid() = user_id);

-- 4. Archivio raccolte con report salvato
create table if not exists public.harvests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  farm_id uuid references public.farms(id) on delete cascade,
  date date not null,
  quintals numeric not null default 0,
  liters numeric not null default 0,
  cost numeric not null default 0,
  plant_ids uuid[],
  notes text,
  report jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.harvests enable row level security;
drop policy if exists "Raccolte: lettura propria" on public.harvests;
drop policy if exists "Raccolte: inserimento proprio" on public.harvests;
drop policy if exists "Raccolte: modifica propria" on public.harvests;
drop policy if exists "Raccolte: eliminazione propria" on public.harvests;
create policy "Raccolte: lettura propria" on public.harvests for select using (auth.uid() = user_id);
create policy "Raccolte: inserimento proprio" on public.harvests for insert with check (auth.uid() = user_id);
create policy "Raccolte: modifica propria" on public.harvests for update using (auth.uid() = user_id);
create policy "Raccolte: eliminazione propria" on public.harvests for delete using (auth.uid() = user_id);

-- 5. Contabilità
create table if not exists public.expenses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  farm_id uuid references public.farms(id) on delete cascade,
  date date not null,
  category text not null default 'other'
    check (category in ('products', 'tools', 'maintenance', 'labour', 'fuel', 'water', 'services', 'other')),
  description text not null,
  amount numeric not null default 0,
  supplier text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.expenses enable row level security;
drop policy if exists "Spese: lettura propria" on public.expenses;
drop policy if exists "Spese: inserimento proprio" on public.expenses;
drop policy if exists "Spese: modifica propria" on public.expenses;
drop policy if exists "Spese: eliminazione propria" on public.expenses;
create policy "Spese: lettura propria" on public.expenses for select using (auth.uid() = user_id);
create policy "Spese: inserimento proprio" on public.expenses for insert with check (auth.uid() = user_id);
create policy "Spese: modifica propria" on public.expenses for update using (auth.uid() = user_id);
create policy "Spese: eliminazione propria" on public.expenses for delete using (auth.uid() = user_id);

-- 6. Foto di piante e galleria (crea tabella e bucket se mancano; plant_id opzionale per le foto generali)
create table if not exists public.plant_photos (
  id uuid default gen_random_uuid() primary key,
  plant_id uuid references public.plants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade not null,
  storage_path text not null,
  public_url text not null,
  caption text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.plant_photos alter column plant_id drop not null;
alter table public.plant_photos enable row level security;
drop policy if exists "Gli utenti possono vedere le proprie foto" on public.plant_photos;
drop policy if exists "Gli utenti possono inserire le proprie foto" on public.plant_photos;
drop policy if exists "Gli utenti possono aggiornare le proprie foto" on public.plant_photos;
drop policy if exists "Gli utenti possono eliminare le proprie foto" on public.plant_photos;
create policy "Gli utenti possono vedere le proprie foto" on public.plant_photos for select using (auth.uid() = user_id);
create policy "Gli utenti possono inserire le proprie foto" on public.plant_photos for insert with check (auth.uid() = user_id);
create policy "Gli utenti possono aggiornare le proprie foto" on public.plant_photos for update using (auth.uid() = user_id);
create policy "Gli utenti possono eliminare le proprie foto" on public.plant_photos for delete using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('plant-photos', 'plant-photos', true)
on conflict (id) do nothing;

drop policy if exists "Gli utenti autenticati possono caricare le proprie foto" on storage.objects;
drop policy if exists "Le foto sono visibili pubblicamente" on storage.objects;
drop policy if exists "Gli utenti possono eliminare le proprie foto" on storage.objects;
create policy "Gli utenti autenticati possono caricare le proprie foto"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'plant-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Le foto sono visibili pubblicamente"
  on storage.objects for select to public
  using (bucket_id = 'plant-photos');
create policy "Gli utenti possono eliminare le proprie foto"
  on storage.objects for delete to authenticated
  using (bucket_id = 'plant-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Aggiorna la cache dello schema di PostgREST
notify pgrst, 'reload schema';
