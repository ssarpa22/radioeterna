-- Radio Eterna · 0004 · Station counts per country/category (SECURITY INVOKER: RLS still applies)
create or replace function country_station_counts() returns table(slug text, station_count bigint)
language sql stable security invoker set search_path = public as $$
  select c.slug, (select count(*) from stations s where s.country_id = c.id and s.status = 'published' and s.deleted_at is null)
  from countries c $$;
create or replace function category_station_counts() returns table(slug text, station_count bigint)
language sql stable security invoker set search_path = public as $$
  select k.slug, (select count(*) from stations s where s.status = 'published' and s.deleted_at is null
    and (s.primary_category_id = k.id or exists (select 1 from station_categories sc where sc.station_id = s.id and sc.category_id = k.id)))
  from categories k $$;
grant execute on function country_station_counts(), category_station_counts() to anon, authenticated;
