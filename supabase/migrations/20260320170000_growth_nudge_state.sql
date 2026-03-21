create table if not exists public.growth_nudge_state (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  zero_message_nudged_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.growth_nudge_state enable row level security;

create policy "growth nudge state owner read"
on public.growth_nudge_state for select
to authenticated
using (auth.uid() = user_id);
