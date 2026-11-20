-- Official website enrichment suggestions. Extracted data never changes stations automatically.
create table public.station_website_suggestions (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  station_name text not null,
  source_url text not null,
  final_url text,
  suggestions jsonb not null default '{}'::jsonb check (jsonb_typeof(suggestions) = 'object'),
  confidence jsonb not null default '{}'::jsonb check (jsonb_typeof(confidence) = 'object'),
  status text not null default 'pending' check (status in ('pending','applied','dismissed','failed')),
  detail text,
  scanned_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index station_website_suggestions_status_idx on public.station_website_suggestions(status, scanned_at desc);
create index station_website_suggestions_station_idx on public.station_website_suggestions(station_id, scanned_at desc);
alter table public.station_website_suggestions enable row level security;
revoke all on public.station_website_suggestions from anon, authenticated;
grant all on public.station_website_suggestions to service_role;
