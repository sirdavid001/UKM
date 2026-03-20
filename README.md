# UKM

UKM is a prompt-first anonymous inbox app built with Expo Router and Supabase. The repo is wired for the Day-7 launch cut from the plan: OTP login, age gate, username claim, share loop, public prompt page, inbox, settings, and launch-mode safety.

## Stack

- Expo Router + TypeScript
- NativeWind + design tokens
- Zustand + TanStack Query
- Supabase auth, Postgres, RLS, and Edge Functions

## Local development

1. Install dependencies:

```bash
npm install
```

2. Copy env vars:

```bash
cp .env.example .env
```

3. Start the app:

```bash
npm start
```

If `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are missing, the app runs in local mock mode. Mock mode is intentional so the flow is immediately testable even before a Supabase project is wired.

## Supabase

Apply the launch schema and functions from the `supabase/` directory to a Supabase project. The scaffold includes:

- launch schema migration
- prompt seed data
- `claim-username`
- `complete-onboarding`
- `seed-starter-items`
- `submit-anonymous-message`
- `block-sender`
- `report-message`
- `track-link-event`
- `track-public-event`
- `register-push-token`
- `send-message-push`

## Current status

Implemented in this repo:

- launch-mode app shell and route structure
- OTP auth UI with mock fallback
- onboarding flow
- share tab with prompt selection and share confirmation modal
- public submission page with sender session persistence
- inbox ordering and detail actions
- settings for theme and hidden words
- push token registration scaffold and generic push batching hook
- public profile view/open tracking for anonymous share funnel analytics
- Supabase schema and launch Edge Functions

Still expected before production:

- real Expo push token registration and batching
- direct Instagram Story asset sharing instead of generic share fallback
- richer analytics dashboards
- subscriptions and post-launch automation milestones
