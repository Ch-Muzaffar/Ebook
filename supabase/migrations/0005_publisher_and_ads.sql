-- Publisher facts (shown on About + legal pages) and advertising configuration (PRD §10.5, §11).
-- Ads are OFF by default and must stay off until Google AdSense approves the site.
alter table public.site_settings
  add column publisher_name   text not null default '' check (char_length(publisher_name) <= 120),
  add column business_country text not null default '' check (char_length(business_country) <= 60),
  add column ads_enabled      boolean not null default false,
  add column adsense_client_id text not null default '' check (adsense_client_id = '' or adsense_client_id ~ '^ca-pub-[0-9]{10,20}$'),
  add column ad_slot_home     text not null default '' check (ad_slot_home = '' or ad_slot_home ~ '^[0-9]{6,20}$'),
  add column ad_slot_article  text not null default '' check (ad_slot_article = '' or ad_slot_article ~ '^[0-9]{6,20}$'),
  add column ad_slot_sidebar  text not null default '' check (ad_slot_sidebar = '' or ad_slot_sidebar ~ '^[0-9]{6,20}$');

-- Owner-provided facts (2026-11-11).
update public.site_settings
set brand_name = 'Digital Traffic',
    publisher_name = 'Alexander Rahman',
    business_country = 'United States',
    contact_email = 'sochkaloop@gmail.com'
where id = 1;
