-- Preserve structured TLS diagnostics and correct the verified canonical URL for Catolica Radio.
alter table public.website_verification_events
  add column if not exists error_code text;

-- The www hostname presents a certificate for a different name. The apex hostname
-- was independently verified with a valid certificate and returns HTTP 200.
-- Match both the station name and old hostname so unrelated stations are untouched.
update public.stations
set website_url = 'https://catolicaradiopr.com/'
where lower(name) = 'catolica radio'
  and website_url ~* '^https://www\.catolicaradiopr\.com/?$';

-- Radio Cristiana 88.3 intentionally remains unchanged: its domain redirects to
-- Radio Cristiana 92.5, and we have not established that they are the same station.
