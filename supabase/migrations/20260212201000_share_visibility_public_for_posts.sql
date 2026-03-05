do $$ begin
  alter type public.share_visibility add value if not exists 'public';
exception
  when duplicate_object then null;
end $$;
