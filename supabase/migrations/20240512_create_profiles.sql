-- 1. Creazione tabella public.profiles
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  full_name text,
  onboarding_completed boolean default false not null
);

-- 2. Abilitazione RLS
alter table public.profiles enable row level security;

-- 3. Policy RLS
-- Permetti agli utenti di leggere il proprio profilo
create policy "Gli utenti possono vedere il proprio profilo"
  on public.profiles for select
  using ( auth.uid() = id );

-- Permetti agli utenti di aggiornare il proprio profilo
create policy "Gli utenti possono aggiornare il proprio profilo"
  on public.profiles for update
  using ( auth.uid() = id );

-- 4. Funzione per creare automaticamente un profilo su nuova registrazione
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, onboarding_completed)
  values (new.id, new.raw_user_meta_data->>'full_name', false);
  return new;
end;
$$ language plpgsql security definer;

-- 5. Trigger per eseguire la funzione
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
