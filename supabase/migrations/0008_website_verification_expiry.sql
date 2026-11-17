-- Radio Eterna · 0008 · Expire official website checks after 30 days.
-- A NULL timestamp intentionally fails closed until the site is checked again.
alter table public.stations
  add column website_verified_at timestamptz;
