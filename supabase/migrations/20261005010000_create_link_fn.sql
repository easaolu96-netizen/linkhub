-- Add a link in a single round trip: enforces the per-user limit and puts the
-- new link at the top of the list (lowest position). Runs as the caller
-- (security invoker), so RLS still applies.
create or replace function public.create_link(p_title text, p_url text)
returns public.links
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid        uuid := (select auth.uid());
  link_count integer;
  min_pos    integer;
  new_row    public.links;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select count(*), min(position)
    into link_count, min_pos
    from public.links
   where user_id = uid;

  if link_count >= 100 then
    raise exception 'link limit reached' using errcode = 'P0001', hint = 'max_links';
  end if;

  insert into public.links (user_id, title, url, position)
  values (uid, p_title, p_url, coalesce(min_pos - 1, 0))
  returning * into new_row;

  return new_row;
end;
$$;

revoke execute on function public.create_link(text, text) from anon, public;
grant execute on function public.create_link(text, text) to authenticated;
