-- =====================================================================
-- Unique-per-day analytics.
--
-- Each view/click now carries `visitor_hash`: an HMAC (computed by the app)
-- of the UTC day + visitor IP + user agent. The day is part of the hash, so
-- the same visitor gets an unrelated value tomorrow and visits can't be
-- linked across days; the raw IP is never stored.
--
-- The unique indexes make the database count each visitor at most once per
-- profile (views) or per link (clicks) per day, across every server instance.
-- Older rows have a NULL hash; NULLs never conflict, so they're kept as is.
-- =====================================================================

alter table public.page_views
  add column if not exists visitor_hash text check (char_length(visitor_hash) <= 64);
alter table public.link_clicks
  add column if not exists visitor_hash text check (char_length(visitor_hash) <= 64);

create unique index if not exists page_views_daily_unique_idx
  on public.page_views (profile_id, visitor_hash);
create unique index if not exists link_clicks_daily_unique_idx
  on public.link_clicks (link_id, visitor_hash);
