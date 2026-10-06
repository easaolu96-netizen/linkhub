-- =====================================================================
-- Security hardening (see SECURITY-AUDIT.md)
-- Signed-in users can talk to PostgREST directly with the public anon key
-- and their own JWT, bypassing the app's Zod validation. Everything the app
-- relies on must therefore be enforced here, in the database.
-- Written to be re-runnable (idempotent).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Profiles: hide unpublished profiles, lock down writable columns,
--    constrain avatar URLs (SSRF) and JSON sizes (storage abuse).
-- ---------------------------------------------------------------------
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
drop policy if exists "Published profiles are viewable by everyone" on public.profiles;
create policy "Published profiles are viewable by everyone"
  on public.profiles for select
  using (username is not null);

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

-- Profiles are created by the on_auth_user_created trigger and removed by
-- deleting the auth user (cascade). Clients never insert or delete them.
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can delete their own profile" on public.profiles;
revoke insert, delete, truncate on public.profiles from anon, authenticated;

-- Only these columns are user-editable (id/created_at/updated_at are not).
revoke update on public.profiles from anon, authenticated;
grant update (username, display_name, bio, avatar_url, theme, socials)
  on public.profiles to authenticated;

-- Avatars may only be the owner's own upload in this project's storage
-- ("<user id>/<timestamp>.<ext>") or a Google profile photo.
alter table public.profiles drop constraint if exists profiles_avatar_url_allowed;
alter table public.profiles drop constraint if exists profiles_theme_size;
alter table public.profiles drop constraint if exists profiles_socials_size;
alter table public.profiles drop constraint if exists profiles_theme_is_object;
alter table public.profiles drop constraint if exists profiles_socials_is_object;

alter table public.profiles add constraint profiles_avatar_url_allowed check (
  avatar_url is null
  or avatar_url ~ ('^https://[a-z0-9]{20}[.]supabase[.]co/storage/v1/object/public/avatars/'
                   || id::text || '/[0-9]{10,16}[.](jpg|jpeg|png|webp)$')
  or avatar_url ~ '^https://lh3[.]googleusercontent[.]com/[A-Za-z0-9/_=.+-]+$'
);
alter table public.profiles add constraint profiles_theme_size check (octet_length(theme::text) <= 2048);
alter table public.profiles add constraint profiles_socials_size check (octet_length(socials::text) <= 4096);
alter table public.profiles add constraint profiles_theme_is_object check (jsonb_typeof(theme) = 'object');
alter table public.profiles add constraint profiles_socials_is_object check (jsonb_typeof(socials) = 'object');

-- ---------------------------------------------------------------------
-- 2. Links: enforce the per-user limit for direct inserts too, and lock
--    down writable columns.
-- ---------------------------------------------------------------------
create or replace function public.enforce_link_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Serialise inserts per user so concurrent requests can't race past the limit.
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
  if (select count(*) from public.links where user_id = new.user_id) >= 100 then
    raise exception 'link limit reached' using errcode = 'P0001', hint = 'max_links';
  end if;
  return new;
end;
$$;
revoke execute on function public.enforce_link_limit() from public, anon, authenticated;

drop trigger if exists links_enforce_limit on public.links;
create trigger links_enforce_limit
  before insert on public.links
  for each row execute function public.enforce_link_limit();

revoke insert, update, delete, truncate on public.links from anon;
revoke update, truncate on public.links from authenticated;
grant update (title, url, position, is_visible) on public.links to authenticated;

-- ---------------------------------------------------------------------
-- 3. Analytics: belt-and-braces — clients have no write privileges at all
--    (RLS already had no insert policy).
-- ---------------------------------------------------------------------
revoke insert, update, delete, truncate on public.page_views from anon, authenticated;
revoke insert, update, delete, truncate on public.link_clicks from anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. Storage: only "<uid>/<timestamp>.<ext>" names, and at most a few
--    files per user (the app keeps one and deletes the rest).
-- ---------------------------------------------------------------------
create or replace function public.my_avatar_object_count()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
    from storage.objects
   where bucket_id = 'avatars'
     and (storage.foldername(name))[1] = (select auth.uid())::text;
$$;
revoke execute on function public.my_avatar_object_count() from public, anon;
grant execute on function public.my_avatar_object_count() to authenticated;

drop policy if exists "Users can upload to their own avatar folder" on storage.objects;
create policy "Users can upload to their own avatar folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and array_length(storage.foldername(name), 1) = 1
    and storage.filename(name) ~ '^[0-9]{10,16}[.](jpg|jpeg|png|webp)$'
    and public.my_avatar_object_count() < 3
  );

drop policy if exists "Users can update their own avatar files" on storage.objects;
create policy "Users can update their own avatar files"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and storage.filename(name) ~ '^[0-9]{10,16}[.](jpg|jpeg|png|webp)$'
  );

-- ---------------------------------------------------------------------
-- 5. Rate limiting (shared across all server instances).
--    Keys are SHA-256 hashes computed by the app, never raw emails/IPs.
-- ---------------------------------------------------------------------
create table if not exists public.rate_limit_buckets (
  key      text primary key check (char_length(key) <= 200),
  count    integer not null,
  reset_at timestamptz not null
);
alter table public.rate_limit_buckets enable row level security;
revoke all on public.rate_limit_buckets from anon, authenticated;

create or replace function public.consume_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_count integer;
begin
  insert into public.rate_limit_buckets as b (key, count, reset_at)
  values (p_key, 1, now() + make_interval(secs => p_window_seconds))
  on conflict (key) do update
    set count    = case when b.reset_at <= now() then 1 else b.count + 1 end,
        reset_at = case when b.reset_at <= now()
                        then now() + make_interval(secs => p_window_seconds)
                        else b.reset_at end
  returning count into current_count;

  -- Occasional housekeeping instead of a cron job.
  if random() < 0.01 then
    delete from public.rate_limit_buckets where reset_at < now() - interval '1 day';
  end if;

  return current_count <= p_limit;
end;
$$;
revoke execute on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

-- ---------------------------------------------------------------------
-- 6. Security audit log (written by the server with the service role only;
--    no client can read or write it).
-- ---------------------------------------------------------------------
create table if not exists public.audit_logs (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  event      text not null check (char_length(event) <= 64),
  user_id    uuid,
  email      text check (char_length(email) <= 254),
  ip         text check (char_length(ip) <= 64),
  user_agent text check (char_length(user_agent) <= 300),
  metadata   jsonb not null default '{}'::jsonb check (octet_length(metadata::text) <= 4096)
);
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_user_id_idx on public.audit_logs (user_id, created_at desc);
create index if not exists audit_logs_event_idx on public.audit_logs (event, created_at desc);
alter table public.audit_logs enable row level security;
revoke all on public.audit_logs from anon, authenticated;

-- Retention: call periodically (or from a scheduled job) to drop old entries.
create or replace function public.purge_old_audit_logs(keep_days integer default 180)
returns integer
language sql
security invoker
set search_path = ''
as $$
  with deleted as (
    delete from public.audit_logs
     where created_at < now() - make_interval(days => greatest(keep_days, 30))
    returning 1
  )
  select count(*)::integer from deleted;
$$;
revoke execute on function public.purge_old_audit_logs(integer) from public, anon, authenticated;
grant execute on function public.purge_old_audit_logs(integer) to service_role;

-- ---------------------------------------------------------------------
-- 7. Reserved usernames: block impersonation / route-like names too.
--    Keep in sync with lib/validation/username.ts.
-- ---------------------------------------------------------------------
create or replace function public.is_reserved_username(name text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(name) = any (array[
    'admin', 'api', 'dashboard', 'login', 'signup', 'settings', 'about',
    'help', 'terms', 'privacy', 'www', 'app', 'auth', 'onboarding', 'logout',
    'administrator', 'root', 'support', 'security', 'linkhub', 'official',
    'staff', 'moderator', 'billing', 'status', 'contact', 'legal', 'abuse',
    'postmaster', 'webmaster', 'noreply', 'no-reply', '_next', 'icon',
    'apple-icon', 'opengraph-image', 'robots', 'sitemap', 'favicon'
  ]);
$$;

-- ---------------------------------------------------------------------
-- 8. Trigger functions are never callable directly.
-- ---------------------------------------------------------------------
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
