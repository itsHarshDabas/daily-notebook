# Daily Notebook

A daily life tracker inspired by paper journals. Log 7 things a day in under a minute, see your year as a GitHub-style contribution grid, and keep it in sync across phone and browser.

**Trackers:** mood and mental health, calories, a monthly target goal, water, sleep, exercise, expenses. Period tracking is an 8th tracker shown only to users whose profile gender is female (they can hide it in settings).

## Features

- **Today:** a card per tracker with a progress ring, plus a 7-day strip showing how complete each day was.
- **Logging:** a screen per tracker, with previous/next day buttons to fill in missed days. Calories can be found by name search, barcode scan, or typed in.
- **History:** a GitHub-style grid for everything or for one tracker at a time, with days logged, current and best streak, and average. Toggle to a 3D skyline you can drag to rotate. Tap a day to see it and edit it.
- **Settings:** profile and photo, light/dark/system theme, daily targets, currency, sync status, sign out and delete account.
- **Offline:** reads are cached on the device and writes are queued, then sent automatically when the connection comes back.

## Architecture

| Part | Tech | Holds |
| --- | --- | --- |
| `apps/app` | Expo (React Native + TypeScript), Expo Router | One app for iOS, Android and web |
| Supabase | Postgres + Auth | Email OTP login, profiles, targets and every tracker value, protected by Row Level Security |
| `apps/api` | Node + TypeScript, Fastify | Gateway to MongoDB; verifies Supabase access tokens |
| MongoDB Atlas | GridFS + collections | Profile photos, free-text notes, food nutrition data (Open Food Facts cache), activity log |
| `packages/shared` | TypeScript | Tracker list, grid shading, streaks and averages, 3D skyline maths, period prediction |

Structured, numeric data goes to Postgres; free-form and binary data goes to MongoDB. The two link by ID only, and the dashboard reads from Postgres alone.

## Setup

Requires Node 22+.

```bash
npm install
```

### 1. Supabase

1. Create a project, then run every file in `supabase/migrations/` in name order in the SQL editor (or `supabase db push` with the Supabase CLI). The second file adds `delete_my_account()`, used by Settings > Delete account.
2. **Make login emails send a code instead of a link:** Authentication > Emails > Templates > *Magic Link*, and put `{{ .Token }}` in the body, e.g. `Your Daily Notebook code is {{ .Token }}`.
3. The built-in email sender has a low hourly limit; for anything beyond testing, set up custom SMTP (Resend, Amazon SES) under Authentication > Emails > SMTP.

### 2. MongoDB Atlas

Create a cluster (the free tier is fine), a database user, and allow your API host's IP under Network Access.

### 3. API

```bash
cp apps/api/.env.example apps/api/.env   # fill in MONGODB_URI and SUPABASE_URL
npm run api                              # http://localhost:4000/health
```

### 4. App

```bash
cp apps/app/.env.example apps/app/.env   # Supabase URL + publishable key, API URL
npm run web     # browser
npm run app     # then press i / a, or scan the QR code with Expo Go
```

When testing on a phone, set `EXPO_PUBLIC_API_URL` to your computer's LAN IP, not `localhost`.

## Tests

```bash
npm test                                         # shared logic + API
MONGODB_TEST_URI=mongodb://localhost:27017 npm test -w @daily-notebook/api   # use an existing MongoDB
```

Without `MONGODB_TEST_URI`, the API tests download and start an in-memory MongoDB.

## Roadmap

1. ~~Repo scaffold, Supabase schema with RLS, MongoDB API~~
2. ~~Email OTP login and profile (name, gender, photo)~~
3. ~~Daily check-in for the 7 trackers plus period tracking (with barcode scan for calories)~~
4. ~~Redesigned UI with light and dark mode~~
5. ~~Per-tracker contribution grids, streaks and averages~~
6. ~~Food search by name~~
7. ~~Offline use with queued sync~~
8. ~~3D skyline view of the grid~~
9. Next ideas: reminders/notifications, CSV export, weekly summary
