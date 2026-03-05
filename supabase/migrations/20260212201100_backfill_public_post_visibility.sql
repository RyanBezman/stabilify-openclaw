update public.posts as p
set visibility = 'public'::public.share_visibility
where exists (
  select 1
  from public.profiles as pr
  where pr.id = p.author_user_id
    and pr.account_visibility = 'public'::public.account_visibility
)
and p.visibility <> 'public'::public.share_visibility;
