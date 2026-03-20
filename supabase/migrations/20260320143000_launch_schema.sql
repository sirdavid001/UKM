create extension if not exists "pgcrypto";
create extension if not exists "citext";

create table if not exists public.prompt_templates (
  id text primary key,
  slug text not null unique,
  title text not null,
  base_rank integer not null default 0,
  is_active boolean not null default true,
  suggested_replies jsonb not null default '[]'::jsonb,
  copy_variants jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  username citext unique,
  display_name text,
  avatar_url text,
  theme_preference text not null default 'system' check (theme_preference in ('light', 'dark', 'system')),
  dob date,
  onboarding_complete boolean not null default false,
  active_prompt_id text references public.prompt_templates (id),
  onboarding_boost_expires_at timestamptz,
  last_inbox_opened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sender_identities (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  session_fingerprint_hash text not null,
  network_fingerprint_hash text not null,
  behavior_signature_hash text not null,
  fingerprint_confidence_score numeric not null default 1,
  abuse_score numeric not null default 0,
  abuse_score_last_updated_at timestamptz not null default now(),
  shadow_limited_until timestamptz,
  created_at timestamptz not null default now(),
  unique (recipient_id, session_fingerprint_hash)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  prompt_id text not null references public.prompt_templates (id),
  sender_identity_id uuid references public.sender_identities (id) on delete set null,
  content text not null,
  status text not null default 'visible' check (status in ('visible', 'filtered', 'archived', 'flagged')),
  moderation_score numeric not null default 0,
  abuse_score numeric not null default 0,
  is_seeded boolean not null default false,
  source text not null default 'web' check (source in ('web', 'app')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.hidden_words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  word text not null,
  created_at timestamptz not null default now(),
  unique (user_id, word)
);

create table if not exists public.blocked_senders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  sender_identity_id uuid not null references public.sender_identities (id) on delete cascade,
  reason text not null default 'manual_block',
  created_at timestamptz not null default now(),
  unique (user_id, sender_identity_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.link_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_type text not null,
  channel text not null default 'unknown',
  copy_variant_key text check (copy_variant_key in ('a', 'b')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.submission_events (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  prompt_id text not null references public.prompt_templates (id),
  sender_identity_id uuid references public.sender_identities (id) on delete set null,
  outcome text not null,
  source text not null default 'web',
  abuse_score numeric not null default 0,
  captcha_required boolean not null default false,
  copy_variant_key text check (copy_variant_key in ('a', 'b')),
  created_at timestamptz not null default now()
);

create table if not exists public.app_flags (
  id integer primary key default 1,
  launch_mode boolean not null default true,
  curiosity_hints_enabled boolean not null default false,
  growth_automation_enabled boolean not null default false,
  global_optimization_enabled boolean not null default false,
  constraint app_flags_singleton check (id = 1)
);

insert into public.app_flags (id) values (1) on conflict (id) do nothing;

insert into public.prompt_templates (id, slug, title, base_rank, suggested_replies, copy_variants)
values
  (
    'prompt-ama',
    'ask-me-anything',
    'Ask me anything',
    100,
    '["What are you obsessed with lately?","What should people ask you about?","What always makes you laugh?"]'::jsonb,
    '{"a":"Ask me anything on UKM. No names, just honesty.","b":"Anonymous Q&A time. Drop me something unexpected on UKM."}'::jsonb
  ),
  (
    'prompt-honest',
    'be-honest-about-me',
    'Be honest about me',
    96,
    '["First impression?","What vibe do I give off?","What would you change about me?"]'::jsonb,
    '{"a":"Be honest about me on UKM. Say what you actually think.","b":"No names. No filters. Tell me the truth on UKM."}'::jsonb
  ),
  (
    'prompt-opinion',
    'what-do-you-think-of-me',
    'What do you think of me?',
    92,
    '["What stands out about me?","What should I lean into more?","What do you notice first?"]'::jsonb,
    '{"a":"What do you really think of me? Answer on UKM.","b":"Give me your honest read. UKM link below."}'::jsonb
  ),
  (
    'prompt-know',
    'tell-me-something-i-should-know',
    'Tell me something I should know',
    89,
    '["What do I miss about myself?","What should I try next?","What energy am I giving off?"]'::jsonb,
    '{"a":"Tell me something I should know. Anonymous replies only.","b":"Say the thing you’d never text me directly. UKM below."}'::jsonb
  )
on conflict (id) do nothing;

create or replace function public.handle_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, active_prompt_id)
  values (new.id, coalesce(new.email, ''), 'prompt-ama')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_auth_user();

create or replace function public.get_public_profile(target_username text)
returns table (
  id uuid,
  username citext,
  display_name text,
  avatar_url text,
  active_prompt_id text,
  organic_submissions_7d bigint
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.active_prompt_id,
    (
      select count(*)
      from public.messages m
      where m.recipient_id = p.id
        and m.is_seeded = false
        and m.status = 'visible'
        and m.created_at >= now() - interval '7 days'
    ) as organic_submissions_7d
  from public.profiles p
  where p.username = target_username
  limit 1;
$$;

alter table public.prompt_templates enable row level security;
alter table public.profiles enable row level security;
alter table public.sender_identities enable row level security;
alter table public.messages enable row level security;
alter table public.hidden_words enable row level security;
alter table public.blocked_senders enable row level security;
alter table public.reports enable row level security;
alter table public.link_events enable row level security;
alter table public.submission_events enable row level security;
alter table public.app_flags enable row level security;

create policy "prompt_templates readable by anyone"
on public.prompt_templates for select
using (true);

create policy "app_flags readable by authenticated users"
on public.app_flags for select
to authenticated
using (true);

create policy "profiles owner read"
on public.profiles for select
to authenticated
using (auth.uid() = id);

create policy "profiles owner upsert"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "messages owner read"
on public.messages for select
to authenticated
using (auth.uid() = recipient_id);

create policy "messages owner update"
on public.messages for update
to authenticated
using (auth.uid() = recipient_id)
with check (auth.uid() = recipient_id);

create policy "messages owner delete"
on public.messages for delete
to authenticated
using (auth.uid() = recipient_id);

create policy "hidden words owner read"
on public.hidden_words for select
to authenticated
using (auth.uid() = user_id);

create policy "hidden words owner write"
on public.hidden_words for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "blocked senders owner read"
on public.blocked_senders for select
to authenticated
using (auth.uid() = user_id);

create policy "blocked senders owner write"
on public.blocked_senders for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "reports owner read"
on public.reports for select
to authenticated
using (auth.uid() = reporter_id);

create policy "link events owner read"
on public.link_events for select
to authenticated
using (auth.uid() = user_id);

grant execute on function public.get_public_profile(text) to anon, authenticated;
