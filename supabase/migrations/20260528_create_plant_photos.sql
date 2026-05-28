create table public.plant_photos (
  id uuid default gen_random_uuid() primary key,
  plant_id uuid references public.plants(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  storage_path text not null,
  public_url text not null,
  caption text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.plant_photos enable row level security;

create policy "Gli utenti possono vedere le proprie foto"
  on public.plant_photos for select
  using ( auth.uid() = user_id );

create policy "Gli utenti possono inserire le proprie foto"
  on public.plant_photos for insert
  with check ( auth.uid() = user_id );

create policy "Gli utenti possono eliminare le proprie foto"
  on public.plant_photos for delete
  using ( auth.uid() = user_id );

-- Policy per lo Storage bucket "plant-photos"
-- Da eseguire nella sezione Storage > Policies del tuo progetto Supabase,
-- oppure direttamente qui se usi la CLI con supabase db push.

insert into storage.buckets (id, name, public)
values ('plant-photos', 'plant-photos', true)
on conflict (id) do nothing;

create policy "Gli utenti autenticati possono caricare le proprie foto"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'plant-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Le foto sono visibili pubblicamente"
  on storage.objects for select
  to public
  using ( bucket_id = 'plant-photos' );

create policy "Gli utenti possono eliminare le proprie foto"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'plant-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
