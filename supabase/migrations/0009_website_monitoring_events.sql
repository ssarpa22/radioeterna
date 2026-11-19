-- Radio Eterna · 0009 · Persistent log for automated official-website checks.
create table public.website_verification_events (
  id uuid primary key default gen_random_uuid(),
  station_id uuid references public.stations(id) on delete set null,
  station_name text not null,
  outcome text not null check (outcome in (
    'invalid_certificate',
    'insecure_redirect',
    'insecure_url',
    'unreachable',
    'recovered'
  )),
  detail text not null,
  http_status integer,
  final_url text,
  duration_ms integer not null default 0,
  checked_at timestamptz not null default now()
);

create index website_verification_events_checked_at_idx
  on public.website_verification_events (checked_at desc);
create index website_verification_events_station_checked_at_idx
  on public.website_verification_events (station_id, checked_at desc);

alter table public.website_verification_events enable row level security;
revoke all on public.website_verification_events from anon, authenticated;
grant all on public.website_verification_events to service_role;
