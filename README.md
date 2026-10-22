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
| Supabase | Postgres + Auth + Storage | Email OTP login, profiles, targets, every tracker value and notes (Row Level Security), profile photos (private `avatars` bucket) |
| Open Food Facts | Public API | Barcode and name lookups for calories, called straight from the app |
| `packages/shared` | TypeScript | Tracker list, grid shading, streaks and averages, 3D skyline maths, period prediction |

There is no custom backend: the app talks to Supabase directly, and RLS policies keep each user to their own rows and files.

## Setup

Requires Node 22+.

```bash
npm install
```

### 1. Supabase

1. Create a project, then run every file in `supabase/migrations/` in name order in the SQL editor (or `supabase db push` with the Supabase CLI). They create the tables, RLS policies, the `avatars` Storage bucket, and `delete_my_account()` (used by Settings > Delete account).
2. **Set up custom SMTP** (Authentication > Emails > SMTP). Supabase needs it before you can edit email templates, and the built-in sender only allows a few emails an hour. A Gmail app password works for testing (`smtp.gmail.com`, port 465).
3. **Make login emails send a code instead of a link:** Authentication > Emails > Templates > *Magic Link*, and put `{{ .Token }}` in the body, e.g. `Your Daily Notebook code is {{ .Token }}`. Keep the email OTP length at 6 (Authentication > Providers > Email).

### 2. App

```bash
cp apps/app/.env.example apps/app/.env   # Supabase URL + publishable key
npm run web     # browser
npm run app     # then press i / a, or scan the QR code with Expo Go
```

### Android test build

`.github/workflows/android-apk.yml` builds a release APK (signed with the debug key, for testing) on every push that touches the app, and publishes it as `daily-notebook.apk` on the [`android-latest` release](../../releases/tag/android-latest). No Expo account is needed.

## Tests

```bash
npm test    # shared logic
```

## Roadmap

1. ~~Repo scaffold, Supabase schema with RLS~~
2. ~~Email OTP login and profile (name, gender, photo)~~
3. ~~Daily check-in for the 7 trackers plus period tracking (with barcode scan for calories)~~
4. ~~Redesigned UI with light and dark mode~~
5. ~~Per-tracker contribution grids, streaks and averages~~
6. ~~Food search by name~~
7. ~~Offline use with queued sync~~
8. ~~3D skyline view of the grid~~
9. Next ideas: reminders/notifications, CSV export, weekly summary
