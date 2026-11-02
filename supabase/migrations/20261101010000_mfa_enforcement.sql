-- =====================================================================
-- Two-factor sign-in (TOTP) enforcement in the database.
--
-- A user who has turned on 2FA gets an "aal1" session after the password
-- (or Google, or an email code) and "aal2" only after the authenticator
-- code. These RESTRICTIVE policies are AND-ed with the existing ones, so
-- with only aal1 such a user can't read or change their links, analytics
-- or avatar files, even by calling the API directly with a stolen password.
-- Users without 2FA are unaffected.
-- =====================================================================

-- True if this session has passed 2FA, or the user hasn't turned 2FA on.
-- security definer: clients can't read auth.mfa_factors themselves.
create or replace function public.mfa_satisfied()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
      or not exists (
        select 1
          from auth.mfa_factors f
         where f.user_id = (select auth.uid())
           and f.status = 'verified'
      );
$$;

revoke execute on function public.mfa_satisfied() from public, anon;
grant execute on function public.mfa_satisfied() to authenticated;

-- `(select …)` makes Postgres evaluate it once per query, not once per row.

drop policy if exists "Require 2FA when enabled" on public.links;
create policy "Require 2FA when enabled"
  on public.links as restrictive for all to authenticated
  using ((select public.mfa_satisfied()))
  with check ((select public.mfa_satisfied()));

drop policy if exists "Require 2FA when enabled" on public.profiles;
create policy "Require 2FA when enabled"
  on public.profiles as restrictive for update to authenticated
  using ((select public.mfa_satisfied()))
  with check ((select public.mfa_satisfied()));

drop policy if exists "Require 2FA when enabled" on public.page_views;
create policy "Require 2FA when enabled"
  on public.page_views as restrictive for select to authenticated
  using ((select public.mfa_satisfied()));

drop policy if exists "Require 2FA when enabled" on public.link_clicks;
create policy "Require 2FA when enabled"
  on public.link_clicks as restrictive for select to authenticated
  using ((select public.mfa_satisfied()));

drop policy if exists "Require 2FA for avatar uploads" on storage.objects;
create policy "Require 2FA for avatar uploads"
  on storage.objects as restrictive for insert to authenticated
  with check (bucket_id <> 'avatars' or (select public.mfa_satisfied()));

drop policy if exists "Require 2FA for avatar changes" on storage.objects;
create policy "Require 2FA for avatar changes"
  on storage.objects as restrictive for update to authenticated
  using (bucket_id <> 'avatars' or (select public.mfa_satisfied()))
  with check (bucket_id <> 'avatars' or (select public.mfa_satisfied()));

drop policy if exists "Require 2FA for avatar deletes" on storage.objects;
create policy "Require 2FA for avatar deletes"
  on storage.objects as restrictive for delete to authenticated
  using (bucket_id <> 'avatars' or (select public.mfa_satisfied()));
