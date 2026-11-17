-- PROPOSED, NOT APPLIED, NOT TESTED. Lives outside supabase/migrations on purpose.
-- Finding: RLS limits ROWS, but anonymous API readers can still read every COLUMN of published stations
-- (e.g. last_verification_result, which can include the staff name used for a manual verification, and is_demo).
-- Fix: grant anon only the public columns.
--
-- Before applying, you must (1) change getStationBySlug() in src/lib/data/stations.ts from select('*', ...) to an explicit
-- column list, and (2) test on a LOCAL database that search_stations(), the country/category counts and the public pages still
-- work for anon (columns used only inside RLS policies/WHERE clauses may also need to be granted).
revoke select on stations from anon;
grant select (id, content_type, name, slug, short_description, description, country_id, city, primary_category_id, language,
              stream_url, stream_format, logo_url, website_url, social_links, status, verification_status, is_featured,
              display_order, deleted_at, is_demo, published_at, created_at, updated_at) on stations to anon;
-- last_verification_result and last_verified_at are deliberately NOT granted to anon.
