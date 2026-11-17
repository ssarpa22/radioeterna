-- Radio Eterna · 0001 · Core schema
create extension if not exists pg_trgm;
create extension if not exists citext;

create type station_status as enum ('draft','pending_review','published','suspended','archived');
create type verification_status as enum ('unverified','verified','failed','manual');
create type submission_status as enum ('pending','approved','rejected');
create type admin_role as enum ('super_admin','admin','editor');
-- Future-proofing: podcasts, sermons, video, etc. reuse the same catalog table.
create type content_type as enum ('radio','podcast','sermon','program','video');

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create table countries (
  id uuid primary key default gen_random_uuid(),
  code char(2) not null unique check (code = upper(code)),
  name text not null check (length(name) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  is_active boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text check (length(description) <= 500),
  is_active boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table stations (
  id uuid primary key default gen_random_uuid(),
  content_type content_type not null default 'radio',
  name text not null check (length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  short_description text check (length(short_description) <= 200),
  description text check (length(description) <= 5000),
  country_id uuid not null references countries(id) on delete restrict,
  city text check (length(city) <= 80),
  primary_category_id uuid not null references categories(id) on delete restrict,
  language text not null default 'es' check (length(language) between 2 and 8),
  stream_url text not null check (stream_url ~* '^https?://[^\s]+$' and length(stream_url) <= 2048),
  stream_format text check (stream_format in ('mp3','aac','ogg','hls','unknown')),
  logo_url text check (logo_url is null or logo_url ~* '^https?://'),
  website_url text check (website_url is null or website_url ~* '^https?://'),
  social_links jsonb not null default '{}'::jsonb check (jsonb_typeof(social_links) = 'object'),
  status station_status not null default 'draft',
  verification_status verification_status not null default 'unverified',
  is_featured boolean not null default false,
  display_order int not null default 0,
  is_demo boolean not null default false,
  last_verified_at timestamptz,
  last_verification_result jsonb,
  published_at timestamptz,
  deleted_at timestamptz,                       -- logical deletion
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index stations_public_idx on stations (country_id, primary_category_id) where status='published' and deleted_at is null;
create index stations_featured_idx on stations (display_order) where is_featured and status='published' and deleted_at is null;
create index stations_recent_idx on stations (published_at desc) where status='published' and deleted_at is null;
create index stations_name_trgm on stations using gin (name gin_trgm_ops);
create index stations_status_idx on stations (status) where deleted_at is null;

create table station_categories (
  station_id uuid not null references stations(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  primary key (station_id, category_id)
);
create index station_categories_cat_idx on station_categories (category_id);

create table admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role admin_role not null default 'editor',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table station_submissions (
  id uuid primary key default gen_random_uuid(),
  station_name text not null check (length(station_name) between 2 and 120),
  country_id uuid not null references countries(id),
  city text not null check (length(city) <= 80),
  contact_name text not null check (length(contact_name) between 2 and 120),
  contact_email citext not null check (contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  website_url text not null check (website_url ~* '^https?://'),
  stream_url text not null check (stream_url ~* '^https?://[^\s]+$' and length(stream_url) <= 2048),
  primary_category_id uuid not null references categories(id),
  description text not null check (length(description) between 10 and 2000),
  logo_url text check (logo_url is null or logo_url ~* '^https?://'),
  authorized_confirmed boolean not null check (authorized_confirmed),
  status submission_status not null default 'pending',
  internal_notes text,
  station_id uuid references stations(id) on delete set null,
  reviewed_by uuid references admin_profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index submissions_status_idx on station_submissions (status, created_at desc);

create table station_status_logs (
  id bigint generated always as identity primary key,
  station_id uuid not null references stations(id) on delete cascade,
  from_status station_status,
  to_status station_status not null,
  changed_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index status_logs_station_idx on station_status_logs (station_id, created_at desc);

create table favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  station_id uuid not null references stations(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, station_id)
);

create table site_settings (
  key text primary key check (key ~ '^[a-z0-9_.]+$'),
  value jsonb not null,
  is_public boolean not null default false,
  updated_at timestamptz not null default now()
);

create table audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_recent_idx on audit_logs (created_at desc);

-- updated_at triggers
do $$ declare t text; begin
  foreach t in array array['countries','categories','stations','admin_profiles','station_submissions','site_settings']
  loop execute format('create trigger %I_updated before update on %I for each row execute function set_updated_at()', t, t); end loop;
end $$;

-- Publication rules + status history
create or replace function stations_before_write() returns trigger language plpgsql as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    new.published_at = coalesce(new.published_at, now());
  end if;
  return new;
end $$;
create trigger stations_before_write before insert or update on stations for each row execute function stations_before_write();

create or replace function stations_log_status() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or old.status is distinct from new.status then
    insert into station_status_logs(station_id, from_status, to_status, changed_by)
    values (new.id, case when tg_op='UPDATE' then old.status end, new.status, auth.uid());
  end if;
  return new;
end $$;
create trigger stations_log_status after insert or update on stations for each row execute function stations_log_status();
