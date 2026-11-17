-- DEV ONLY (runs on `supabase db reset` locally). NEVER run against production.
-- All stations are DEMO placeholders: fictional names, non-resolvable stream URLs (.invalid TLD).
update site_settings set value = 'true' where key = 'allow_demo_data';
insert into stations (name, slug, short_description, country_id, city, primary_category_id, stream_url, stream_format, status, is_featured, is_demo)
select 'DEMO · '||c.name||' '||k.name, 'demo-'||c.slug||'-'||k.slug, 'Registro de demostración. No es una radio real.',
       c.id, 'Ciudad demo', k.id, 'https://demo.invalid/'||c.slug||'/'||k.slug, 'mp3', 'published', (c.display_order <= 2), true
from countries c join categories k on k.slug in ('alabanza-y-adoracion','ensenanza-biblica','gospel')
where c.slug in ('argentina','mexico','colombia','chile') on conflict (slug) do nothing;
