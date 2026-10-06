-- Follow-up to 20261007000000_security_hardening.sql (found in the final review):
-- the new profiles_avatar_url_allowed constraint also applies to the sign-up
-- trigger. If an OAuth provider ever returned a photo URL outside the allowlist,
-- the profile insert — and therefore the whole sign-up — would fail.
-- Keep the provider photo only when it passes the same allowlist; otherwise
-- sign the user up without a photo.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  picture text := left(coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'), 2048);
begin
  if picture is not null and picture !~ '^https://lh3[.]googleusercontent[.]com/[A-Za-z0-9/_=.+-]+$' then
    picture := null;
  end if;

  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), 60),
    picture
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
