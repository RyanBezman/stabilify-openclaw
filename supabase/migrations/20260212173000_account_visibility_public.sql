do $$ begin
  if exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'account_visibility'
      and e.enumlabel = 'followers'
  ) and not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'account_visibility'
      and e.enumlabel = 'public'
  ) then
    alter type public.account_visibility rename value 'followers' to 'public';
  end if;
end $$;
