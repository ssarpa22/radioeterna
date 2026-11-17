-- Radio Eterna · 0005 · Admin workflow: publish gate, audit triggers, approval/rejection, stats
-- Three distinct states: SUBMITTED (station_submissions) → VERIFIED (stations.verification_status) → PUBLISHED (stations.status).

create policy admin_profiles_staff_read on admin_profiles for select using (is_staff());

create or replace function slugify(t text) returns text language sql immutable as $$
  select trim(both '-' from regexp_replace(translate(lower(t), 'áéíóúüñàèìòùâêîôûäëïöç', 'aeiouunaeiouaeiouaeioc'), '[^a-z0-9]+', '-', 'g')) $$;

create or replace function unique_station_slug(base text) returns text language plpgsql set search_path = public as $$
declare s text := coalesce(nullif(slugify(base), ''), 'radio'); cand text; n int := 1;
begin
  cand := s;
  while exists (select 1 from stations where slug = cand) loop n := n + 1; cand := s || '-' || n; end loop;
  return cand;
end $$;

-- Publish gate (enforced in the database, so no code path can bypass it) + stream-change reset.
create or replace function stations_before_write() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.stream_url is distinct from old.stream_url and new.verification_status = old.verification_status then
    new.verification_status := 'unverified'; new.last_verified_at := null; new.last_verification_result := null;
    if old.status = 'published' and new.status = 'published' and not new.is_demo then new.status := 'pending_review'; end if;
  end if;
  if new.status = 'published' then
    if not new.is_demo and new.verification_status not in ('verified', 'manual') then
      raise exception 'No se puede publicar una radio cuyo enlace no está verificado.' using errcode = 'P0001';
    end if;
    if tg_op = 'INSERT' or old.status is distinct from 'published' then new.published_at := coalesce(new.published_at, now()); end if;
  end if;
  return new;
end $$;

-- Atomic, un-skippable audit trail for every change made by a logged-in user.
create or replace function audit_row_change() returns trigger language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); o jsonb; n jsonb; eid text; det jsonb;
begin
  if uid is null then return coalesce(new, old); end if;
  if tg_op = 'DELETE' then
    o := to_jsonb(old); eid := coalesce(o->>'id', o->>'key'); det := jsonb_build_object('old', o);
  else
    n := to_jsonb(new); eid := coalesce(n->>'id', n->>'key');
    if tg_op = 'UPDATE' then
      o := to_jsonb(old);
      select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into det from jsonb_each(n) e
        where o->e.key is distinct from e.value and e.key not in ('updated_at', 'last_verification_result');
      if det = '{}'::jsonb then return new; end if;
    else det := jsonb_build_object('new', n); end if;
  end if;
  insert into audit_logs (actor_id, action, entity_type, entity_id, details) values (uid, lower(tg_op), tg_table_name, eid, det);
  return coalesce(new, old);
end $$;
do $$ declare t text; begin
  foreach t in array array['stations','categories','countries','station_submissions','site_settings','admin_profiles']
  loop execute format('create trigger %I_audit after insert or update or delete on %I for each row execute function audit_row_change()', t, t); end loop;
end $$;

-- Approval creates a DRAFT, UNVERIFIED station. It never publishes.
create or replace function approve_submission(p_id uuid) returns uuid language plpgsql security invoker set search_path = public as $$
declare s station_submissions; sid uuid;
begin
  if not is_staff() then raise exception 'No autorizado' using errcode = '42501'; end if;
  select * into s from station_submissions where id = p_id for update;
  if not found then raise exception 'Solicitud no encontrada'; end if;
  if s.status <> 'pending' then raise exception 'Esta solicitud ya fue revisada.'; end if;
  insert into stations (name, slug, short_description, description, country_id, city, primary_category_id, stream_url, logo_url, website_url, status)
  values (s.station_name, unique_station_slug(s.station_name), left(s.description, 200), s.description, s.country_id, s.city,
          s.primary_category_id, s.stream_url, s.logo_url, s.website_url, 'draft') returning id into sid;
  update station_submissions set status = 'approved', station_id = sid, reviewed_at = now(),
    reviewed_by = (select id from admin_profiles where id = auth.uid()) where id = p_id;
  return sid;
end $$;

create or replace function reject_submission(p_id uuid, p_notes text default null) returns void language plpgsql security invoker set search_path = public as $$
begin
  if not is_staff() then raise exception 'No autorizado' using errcode = '42501'; end if;
  update station_submissions set status = 'rejected', reviewed_at = now(),
    reviewed_by = (select id from admin_profiles where id = auth.uid()),
    internal_notes = coalesce(nullif(trim(p_notes), ''), internal_notes)
  where id = p_id and status = 'pending';
  if not found then raise exception 'La solicitud no existe o ya fue revisada.'; end if;
end $$;

create or replace function admin_stats() returns jsonb language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'stations_total', (select count(*) from stations where deleted_at is null),
    'published', (select count(*) from stations where status = 'published' and deleted_at is null),
    'draft', (select count(*) from stations where status = 'draft' and deleted_at is null),
    'pending', (select count(*) from stations where status = 'pending_review' and deleted_at is null),
    'suspended', (select count(*) from stations where status = 'suspended' and deleted_at is null),
    'unverified', (select count(*) from stations where verification_status = 'unverified' and deleted_at is null),
    'countries', (select count(*) from countries where is_active),
    'categories', (select count(*) from categories where is_active),
    'submissions_pending', (select count(*) from station_submissions where status = 'pending')) $$;

revoke execute on function approve_submission(uuid), reject_submission(uuid, text), admin_stats() from public, anon;
grant execute on function approve_submission(uuid), reject_submission(uuid, text), admin_stats() to authenticated;
