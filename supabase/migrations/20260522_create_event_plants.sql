create table public.event_plants (
  event_id uuid references public.events(id) on delete cascade not null,
  plant_id uuid references public.plants(id) on delete cascade not null,
  primary key (event_id, plant_id)
);

alter table public.event_plants enable row level security;

create policy "Gli utenti possono vedere le relazioni eventi-piante"
  on public.event_plants for select
  using (
    exists (
      select 1 from public.plants
      where id = plant_id
    )
  );

create policy "Gli utenti possono inserire le relazioni eventi-piante"
  on public.event_plants for insert
  with check (
    exists (
      select 1 from public.plants
      where id = plant_id
    )
  );

create policy "Gli utenti possono eliminare le relazioni eventi-piante"
  on public.event_plants for delete
  using (
    exists (
      select 1 from public.plants
      where id = plant_id
    )
  );
