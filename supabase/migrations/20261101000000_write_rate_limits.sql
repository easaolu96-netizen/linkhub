-- =====================================================================
-- Per-user rate limits on writes to links and profiles.
--
-- Signed-in users can write their own rows directly through the Supabase
-- API (RLS limits *which* rows, not *how often*), so the limit lives in the
-- database where every path — server actions or direct API calls — hits it.
--
-- Statement-level triggers: one INSERT/UPDATE/DELETE statement counts once,
-- so reordering 50 links (a single UPDATE) costs one write, not fifty.
-- Requests without a user (service role, migrations, the sign-up trigger)
-- are not limited.
-- =====================================================================

create or replace function public.enforce_write_rate_limit()
returns trigger
language plpgsql
security definer -- consume_rate_limit and its table are service-role only
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    return null;
  end if;

  -- TG_ARGV: [0] max writes, [1] window in seconds.
  if not public.consume_rate_limit(
    'write:' || tg_table_name || ':' || uid::text,
    tg_argv[0]::integer,
    tg_argv[1]::integer
  ) then
    -- The exception rolls back the counter increment too, so the bucket
    -- stays exactly at its limit until the window resets.
    raise exception 'too many changes, try again in a few minutes'
      using errcode = 'P0001', hint = 'rate_limited';
  end if;

  return null;
end;
$$;

revoke execute on function public.enforce_write_rate_limit() from public, anon, authenticated;

-- Links: 300 write statements per 10 minutes (far above normal editing).
drop trigger if exists links_write_rate_limit on public.links;
create trigger links_write_rate_limit
  before insert or update or delete on public.links
  for each statement
  execute function public.enforce_write_rate_limit('300', '600');

-- Profiles: 120 updates per 10 minutes (profile, appearance, avatar, username).
drop trigger if exists profiles_write_rate_limit on public.profiles;
create trigger profiles_write_rate_limit
  before update on public.profiles
  for each statement
  execute function public.enforce_write_rate_limit('120', '600');
