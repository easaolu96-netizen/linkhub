-- Everything the Analytics tab needs in ONE round trip, for the signed-in user:
--   daily        : [{ day, views, clicks }] for the last N days (UTC), zero-filled
--   links        : [{ link_id, clicks }] clicks per link within the range
--   range_views / range_clicks : totals within the range
--   total_views / total_clicks : all-time totals
-- security invoker => RLS applies; the explicit profile_id filter keeps it fast.
create or replace function public.get_analytics(days integer default 7)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with params as (
    select (select auth.uid()) as uid,
           (now() at time zone 'utc')::date as today,
           least(greatest(coalesce(days, 7), 1), 365) as n
  ),
  bounds as (
    select uid, today, n,
           ((today - (n - 1))::timestamp at time zone 'utc') as since
      from params
  ),
  calendar as (
    select generate_series(b.today - (b.n - 1), b.today, interval '1 day')::date as day
      from bounds b
  ),
  daily_views as (
    select (v.created_at at time zone 'utc')::date as day, count(*) as total
      from public.page_views v, bounds b
     where v.profile_id = b.uid and v.created_at >= b.since
     group by 1
  ),
  daily_clicks as (
    select (c.created_at at time zone 'utc')::date as day, count(*) as total
      from public.link_clicks c, bounds b
     where c.profile_id = b.uid and c.created_at >= b.since
     group by 1
  ),
  per_link as (
    select c.link_id, count(*) as total
      from public.link_clicks c, bounds b
     where c.profile_id = b.uid and c.created_at >= b.since
     group by c.link_id
  )
  select jsonb_build_object(
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'day', cal.day,
               'views', coalesce(dv.total, 0),
               'clicks', coalesce(dc.total, 0)
             ) order by cal.day), '[]'::jsonb)
        from calendar cal
        left join daily_views dv on dv.day = cal.day
        left join daily_clicks dc on dc.day = cal.day
    ),
    'links', (
      select coalesce(jsonb_agg(jsonb_build_object('link_id', pl.link_id, 'clicks', pl.total)), '[]'::jsonb)
        from per_link pl
    ),
    'range_views',  (select coalesce(sum(total), 0) from daily_views),
    'range_clicks', (select coalesce(sum(total), 0) from daily_clicks),
    'total_views',  (select count(*) from public.page_views v, bounds b where v.profile_id = b.uid),
    'total_clicks', (select count(*) from public.link_clicks c, bounds b where c.profile_id = b.uid)
  );
$$;

revoke execute on function public.get_analytics(integer) from anon, public;
grant execute on function public.get_analytics(integer) to authenticated;

-- Superseded by get_analytics().
drop function if exists public.get_daily_stats(integer);
