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

Useful app targets:

```bash
npm run ios
npm run web
```

`npm run ios` is the default iOS path on this machine. It boots an iOS simulator, starts Expo on an open port, and opens the matching older Expo Go build directly with `simctl`.

Native iOS tooling helpers:

```bash
npm run doctor
npm run ios:native
```

`npm run doctor` runs Expo Doctor with the local portable Ruby / CocoaPods toolchain on `PATH`.

`npm run ios:native` runs `expo run:ios` with that same toolchain. This project is pinned to Expo SDK 51 / React Native 0.74 so it stays compatible with Xcode 15.2.
The first native run can spend several minutes inside CocoaPods while it downloads and caches pods.

`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and `EXPO_PUBLIC_APP_URL` are required. The app is now live-only and will block auth plus public submissions until those values point at the real project.

Physical iPhone note:

Current App Store Expo Go targets the latest Expo SDK line, not SDK 51. For this repo, the supported dev path is iOS Simulator or a native development build, not Expo Go on a physical iPhone.

## Supabase

Apply the launch schema and functions from the `supabase/` directory to a Supabase project. The scaffold includes:

- launch schema migration
- prompt seed data
- `claim-username`
- `complete-onboarding`
- `seed-starter-items`
- `submit-anonymous-message`
- `block-sender`
- `unblock-sender`
- `report-message`
- `track-link-event`
- `track-public-event`
- `register-push-token`
- `send-message-push`
- `send-growth-nudges`

Recommended schedules after deploy:

- trigger `send-growth-nudges` hourly

## Current status

Implemented in this repo:

- launch-mode app shell and route structure
- OTP auth UI wired for live Supabase
- onboarding flow
- share tab with prompt selection and share confirmation modal
- public submission page with sender session persistence
- inbox ordering and detail actions
- settings for theme and hidden words
- Expo push token registration, Android channel setup, and generic push batching
- zero-message recovery nudge function
- public profile view/open tracking for anonymous share funnel analytics
- Supabase schema and launch Edge Functions

Still expected before production:

- direct Instagram Story asset sharing instead of generic share fallback
- richer analytics dashboards
- subscriptions and post-launch automation milestones
