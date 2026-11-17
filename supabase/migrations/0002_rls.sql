-- Radio Eterna · 0002 · Row Level Security
-- Principle: public = read published/active data only. Staff = by role. Service-role key is never used in the browser.

create or replace function admin_role_of_user() returns admin_role language sql stable security definer set search_path = public as $$
  select role from admin_profiles where id = auth.uid() and is_active $$;
create or replace function is_staff() returns boolean language sql stable security definer set search_path = public as $$
  select admin_role_of_user() is not null $$;
create or replace function is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select admin_role_of_user() in ('super_admin','admin') $$;
create or replace function is_super_admin() returns boolean language sql stable security definer set search_path = public as $$
  select admin_role_of_user() = 'super_admin' $$;
-- DEMO rows are invisible to the public unless this flag is explicitly enabled (dev only).
create or replace function demo_allowed() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select (value)::text = 'true' from site_settings where key = 'allow_demo_data'), false) $$;

alter table countries enable row level security;
alter table categories enable row level security;
alter table stations enable row level security;
alter table station_categories enable row level security;
alter table admin_profiles enable row level security;
alter table station_submissions enable row level security;
alter table station_status_logs enable row level security;
alter table favorites enable row level security;
alter table site_settings enable row level security;
alter table audit_logs enable row level security;

-- Countries / categories
create policy countries_public_read on countries for select using (is_active);
create policy countries_staff_read on countries for select using (is_staff());
create policy countries_admin_write on countries for all using (is_admin()) with check (is_admin());
create policy categories_public_read on categories for select using (is_active);
create policy categories_staff_read on categories for select using (is_staff());
create policy categories_admin_write on categories for all using (is_admin()) with check (is_admin());

-- Stations
create policy stations_public_read on stations for select
  using (status = 'published' and deleted_at is null and (not is_demo or demo_allowed()));
create policy stations_staff_read on stations for select using (is_staff());
create policy stations_staff_insert on stations for insert with check (is_staff());
create policy stations_staff_update on stations for update using (is_staff()) with check (is_staff());
create policy stations_admin_delete on stations for delete using (is_admin());

create policy station_cats_public_read on station_categories for select
  using (exists (select 1 from stations s where s.id = station_id));  -- inherits stations RLS
create policy station_cats_staff_write on station_categories for all using (is_staff()) with check (is_staff());

-- Submissions: anyone may INSERT a pending one; only staff can read/modify. Never auto-published.
create policy submissions_public_insert on station_submissions for insert to anon, authenticated
  with check (status = 'pending' and reviewed_by is null and station_id is null and internal_notes is null);
create policy submissions_staff_read on station_submissions for select using (is_staff());
create policy submissions_staff_update on station_submissions for update using (is_staff()) with check (is_staff());

-- Logs: staff read; writes happen via triggers (security definer) or server actions.
create policy status_logs_staff_read on station_status_logs for select using (is_staff());
create policy audit_staff_read on audit_logs for select using (is_staff());
create policy audit_staff_insert on audit_logs for insert with check (is_staff() and actor_id = auth.uid());

-- Favorites (logged-in users; anonymous favorites live in localStorage)
create policy favorites_owner on favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Settings
create policy settings_public_read on site_settings for select using (is_public);
create policy settings_staff_read on site_settings for select using (is_staff());
create policy settings_admin_write on site_settings for all using (is_admin()) with check (is_admin());

-- Admin profiles: self-read; only super admins manage
create policy admin_profiles_self on admin_profiles for select using (id = auth.uid());
create policy admin_profiles_super on admin_profiles for all using (is_super_admin()) with check (is_super_admin());

-- Public search RPC: SECURITY INVOKER, so every RLS policy above still applies.
create or replace function search_stations(
  p_query text default null, p_country text default null, p_category text default null,
  p_featured boolean default null, p_page int default 1, p_page_size int default 24, p_sort text default 'name'
) returns jsonb language sql stable security invoker set search_path = public as $$
  with params as (
    select least(greatest(coalesce(p_page_size,24),1),60) as sz, greatest(coalesce(p_page,1),1) as pg,
           nullif(trim(p_query),'') as q
  ), filtered as (
    select s.id, s.name, s.slug, s.short_description, s.city, s.logo_url, s.stream_url, s.stream_format,
           s.is_featured, s.verification_status, s.published_at, s.display_order,
           c.name as country_name, c.slug as country_slug, k.name as category_name, k.slug as category_slug
    from stations s
    join countries c on c.id = s.country_id
    join categories k on k.id = s.primary_category_id
    cross join params
    where s.status = 'published' and s.deleted_at is null
      and (params.q is null or s.name ilike '%' || replace(replace(replace(params.q,'\','\\'),'%','\%'),'_','\_') || '%')
      and (p_country is null or c.slug = p_country)
      and (p_featured is null or s.is_featured = p_featured)
      and (p_category is null or exists (
            select 1 from categories kk where kk.slug = p_category and (kk.id = s.primary_category_id
              or exists (select 1 from station_categories sc where sc.station_id = s.id and sc.category_id = kk.id))))
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'page', (select pg from params), 'page_size', (select sz from params),
    'items', coalesce((select jsonb_agg(to_jsonb(x)) from (
        select * from filtered
        order by case when p_sort='recent' then published_at end desc nulls last,
                 is_featured desc, display_order, name
        limit (select sz from params) offset ((select pg from params)-1)*(select sz from params)) x), '[]'::jsonb));
$$;
grant execute on function search_stations to anon, authenticated;
