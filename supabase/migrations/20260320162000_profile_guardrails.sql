do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_adult_dob_check'
  ) then
    alter table public.profiles
      add constraint profiles_adult_dob_check
      check (dob is null or dob <= current_date - interval '18 years');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_username_format_check'
  ) then
    alter table public.profiles
      add constraint profiles_username_format_check
      check (username is null or username::text ~ '^[a-z0-9_]{3,}$');
  end if;
end
$$;
