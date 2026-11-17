-- Radio Eterna · 0007 · Require an explicit HTTPS check before exposing official websites.
alter table stations
  add column website_is_secure boolean not null default false;
