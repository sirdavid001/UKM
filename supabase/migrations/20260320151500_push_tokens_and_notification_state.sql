create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  token text not null unique,
  platform text not null default 'expo',
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_state (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  last_push_sent_at timestamptz,
  last_notified_count integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.push_tokens enable row level security;
alter table public.notification_state enable row level security;

create policy "push tokens owner read"
on public.push_tokens for select
to authenticated
using (auth.uid() = user_id);

create policy "notification state owner read"
on public.notification_state for select
to authenticated
using (auth.uid() = user_id);
