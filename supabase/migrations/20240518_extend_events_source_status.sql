alter table public.events
  add column if not exists source text not null default 'user'
    check (source in ('user', 'arnaldo')),
  add column if not exists status text not null default 'confirmed'
    check (status in ('confirmed', 'suggested', 'dismissed')),
  add column if not exists suggestion_reason text,
  add column if not exists suggested_at timestamp with time zone,
  add column if not exists confirmed_at timestamp with time zone;
