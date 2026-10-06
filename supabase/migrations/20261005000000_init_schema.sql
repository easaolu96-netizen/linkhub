-- =====================================================================
-- LinkHub — initial schema
-- Tables, indexes, triggers, Row Level Security, RPC helpers, storage.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------

-- Keep updated_at fresh on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Usernames that would collide with app routes. Keep in sync with
-- lib/validation/username.ts.
create or replace function public.is_reserved_username(name text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(name) = any (array[
    'admin', 'api', 'dashboard', 'login', 'signup', 'settings', 'about',
    'help', 'terms', 'privacy', 'www', 'app', 'auth', 'onboarding', 'logout'
  ]);
$$;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  -- NULL until the user claims one during onboarding.
  username     text unique
               check (username ~ '^[a-z0-9_-]{3,30}$' and not public.is_reserved_username(username)),
  display_name text check (char_length(display_name) <= 60),
  bio          text check (char_length(bio) <= 160),
  avatar_url   text check (char_length(avatar_url) <= 2048),
  theme        jsonb not null default '{}'::jsonb,
  socials      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- links
-- ---------------------------------------------------------------------
create table public.links (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  title      text not null check (char_length(title) between 1 and 100),
  url        text not null
             check (char_length(url) <= 2048 and url ~* '^(https?://|mailto:)'),
  position   integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index links_user_id_position_idx on public.links (user_id, position);

create trigger links_set_updated_at
  before update on public.links
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- analytics
-- ---------------------------------------------------------------------
create table public.page_views (
  id         bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  referrer   text,
  country    text
);

create index page_views_profile_id_created_at_idx
  on public.page_views (profile_id, created_at);

create table public.link_clicks (
  id         bigint generated always as identity primary key,
  link_id    uuid not null references public.links (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  referrer   text
);

create index link_clicks_link_id_created_at_idx
  on public.link_clicks (link_id, created_at);
create index link_clicks_profile_id_created_at_idx
  on public.link_clicks (profile_id, created_at);

-- ---------------------------------------------------------------------
-- Auto-create a profile row for every new auth user
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), 60),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles    enable row level security;
alter table public.links       enable row level security;
alter table public.page_views  enable row level security;
alter table public.link_clicks enable row level security;

-- profiles: public read, owner write
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Users can delete their own profile"
  on public.profiles for delete to authenticated
  using ((select auth.uid()) = id);

-- links: anyone sees visible links, owner sees and manages everything
create policy "Visible links are viewable by everyone"
  on public.links for select
  using (is_visible = true);

create policy "Owners can view all their links"
  on public.links for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Owners can insert links"
  on public.links for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Owners can update links"
  on public.links for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Owners can delete links"
  on public.links for delete to authenticated
  using ((select auth.uid()) = user_id);

-- analytics: owner can read; NO insert policies, so only the service role
-- (which bypasses RLS) can write rows — from our server code.
create policy "Owners can view their page views"
  on public.page_views for select to authenticated
  using ((select auth.uid()) = profile_id);

create policy "Owners can view their link clicks"
  on public.link_clicks for select to authenticated
  using ((select auth.uid()) = profile_id);

-- ---------------------------------------------------------------------
-- RPC helpers (security invoker => RLS still applies)
-- ---------------------------------------------------------------------

-- Atomically rewrite link positions from an ordered array of ids.
create or replace function public.reorder_links(link_ids uuid[])
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.links l
     set position = o.ord - 1
    from unnest(link_ids) with ordinality as o(id, ord)
   where l.id = o.id
     and l.user_id = (select auth.uid());
$$;

-- Click totals per link for the signed-in user.
create or replace function public.get_link_click_counts()
returns table (link_id uuid, clicks bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.link_id, count(*)::bigint
    from public.link_clicks c
   where c.profile_id = (select auth.uid())
   group by c.link_id;
$$;

-- Daily views/clicks for the last N days (UTC), zero-filled.
create or replace function public.get_daily_stats(days integer default 7)
returns table (day date, views bigint, clicks bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  with range as (
    select generate_series(
      (now() at time zone 'utc')::date - (least(greatest(days, 1), 365) - 1),
      (now() at time zone 'utc')::date,
      interval '1 day'
    )::date as day
  )
  select r.day,
         (select count(*) from public.page_views v
           where v.profile_id = (select auth.uid())
             and (v.created_at at time zone 'utc')::date = r.day)::bigint,
         (select count(*) from public.link_clicks c
           where c.profile_id = (select auth.uid())
             and (c.created_at at time zone 'utc')::date = r.day)::bigint
    from range r
   order by r.day;
$$;

revoke execute on function public.reorder_links(uuid[]) from anon, public;
revoke execute on function public.get_link_click_counts() from anon, public;
revoke execute on function public.get_daily_stats(integer) from anon, public;
grant execute on function public.reorder_links(uuid[]) to authenticated;
grant execute on function public.get_link_click_counts() to authenticated;
grant execute on function public.get_daily_stats(integer) to authenticated;

-- ---------------------------------------------------------------------
-- Storage: "avatars" bucket (public read, 2 MB, jpg/png/webp)
-- Files live at avatars/<user_id>/<filename>
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public buckets serve files via their public URL without any policy, so we
-- only let owners *list/select* their own folder (needed for upserts).
create policy "Users can view their own avatar files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can upload to their own avatar folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can update their own avatar files"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can delete their own avatar files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
