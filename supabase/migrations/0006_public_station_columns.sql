-- Radio Eterna · 0006 · Restrict anonymous reads to public station columns.
-- RLS restricts rows, not columns. This closes direct PostgREST reads of internal
-- verification metadata while preserving the public directory and search RPC.
--
-- Apply only after deploying the matching explicit projection in
-- src/lib/data/stations.ts. Validate on a local Supabase database first.

begin;

revoke select on table public.stations from anon;

grant select (
  id, content_type, name, slug, short_description, description,
  country_id, city, primary_category_id, language,
  stream_url, stream_format, logo_url, website_url, social_links,
  status, verification_status, is_featured, display_order, is_demo,
  published_at, deleted_at, created_at, updated_at
) on table public.stations to anon;

commit;

-- Deliberately not granted to anon:
-- last_verified_at, last_verification_result.
