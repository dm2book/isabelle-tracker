# Isabelle’s Hello Kitty World 🎀

A private, cozy little universe made for Isabelle: decorate rooms, dress up a companion, create her own themes, keep a gentle diary, complete tiny quests, catch floating hearts, and open surprises and gifts from Ewan.

Built with **Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Motion · Zustand · Supabase (Auth + Postgres + RLS) · Web Push**.
French is the default language; English is available in Settings.

> **About the name and artwork.** The companion is an **original** white kitten drawn in code — no Sanrio artwork is used. If you obtain a license for official Hello Kitty assets, register them in `src/lib/companion/skins.ts` (see the comments there). Keep the app private; the name is a personal nickname, not a commercial product.

## Two modes

| | Device mode (default) | Cloud mode (Supabase configured) |
|---|---|---|
| Data | Stays in this browser (localStorage) | Synced across devices, protected by Row Level Security |
| Sign-in | None | Invite-only accounts (email + password) |
| Coins / XP / rewards | Computed on the device (demo) | **Server-authoritative**, every action validated |
| Floating hearts | Demo; a golden heart gives an ultra-rare item only | Server-signed tickets, crypto RNG, single-use, daily caps |
| Real Robux gifts | ✗ (demo gifts only) | ✓ encrypted codes, Ewan’s admin panel |
| Push notifications | ✗ | ✓ (opt-in, VAPID) |

The app switches to cloud mode automatically when the Supabase variables **and** `APP_SECRET` are set.

## Setup for cloud mode

Full phone-friendly walkthrough: see the steps Claude gave in the chat, summarised here.

1. **Supabase project** in an **EU region** (West EU – Paris, or Central EU – Frankfurt).
2. **SQL Editor** → run `supabase/migrations/0001_init.sql`, then `0002_explicit_grants.sql`, then `0003_invitations_imports.sql`, then `0004_password_resets.sql` (each is safe to re-run).
3. **Authentication → Sign In / Providers** → turn **off** "Allow new users to sign up".
4. **Authentication → URL Configuration** → Site URL = your production URL; add `<site>/auth/callback` to Redirect URLs.
5. **Authentication → Users → Add user** → create **Ewan's** account (email + password, auto-confirm). Admin accounts are never created from the app.
6. **SQL Editor** → grant Ewan the admin role (the `/setup` page shows the exact line to copy):
   `update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb) || '{"role":"admin"}'::jsonb where lower(email) = 'ewan@…';`
7. **Vercel → Settings → Environment Variables** (see `.env.example`), first for **Preview only**.
8. Open the Preview deployment's **`/setup`** page: every item must be ✅ and the live tests must pass.
9. **/admin → Invitations** → create Isabelle's single-use link (7 days) and send it to her. She opens it, picks a password, and is offered to **import her world** from that device.
10. Only after the Preview checks pass, add the same variables to **Production**.

Security model for accounts: no public sign-up; Isabelle joins only through a hashed, single-use, expiring invitation for an address in `ALLOWED_EMAILS`; admin rights need **both** an address in `ADMIN_EMAILS` **and** the `admin` role in the account's server-only `app_metadata`.

**Importing her device world.** After signing in on the device she has been using, Isabelle sees "On a trouvé ton monde sur cet appareil". The import is validated on the server, capped at what is realistically earnable since launch, merged without duplicates (safe to retry), and never deletes the copy on her device. Coins are carried over only by the first import. A backup file (Settings → Export) can also be imported.

**Forgotten password.** The app sends no e-mail (Supabase's built-in mail only reaches members of your Supabase organisation). Instead, **/admin → Password** creates a single-use reset link (24 hours, a newer link cancels older ones) that Ewan sends to Isabelle by message; after the reset her other sessions are signed out. Admin accounts can't be reset this way: Ewan resets his own password from Supabase → Authentication → Users.

**Hourly reminders.** Vercel Hobby allows one cron per day (`vercel.json`, 08:00 UTC). For morning/afternoon/evening reminders, add repository secrets `APP_URL` and `CRON_SECRET` to enable `.github/workflows/reminders.yml`, or switch to Vercel Pro and make the cron hourly.

**Push on iPhone.** iOS supports web push only for sites added to the Home Screen (iOS 16.4+). Open the app from its icon → Réglages → Notifications push.

## The Robux reward flow (Ewan)

1. Each floating heart is a **server-signed ticket** (HMAC) rolled with `crypto.randomInt`: 1 % golden, 6 % rainbow, 93 % sweet. Tickets are single-use (unique DB key), expire after 5 minutes, and are capped per day.
2. Real Robux are **off by default**. In `/admin → Réglages`, Ewan turns on the Robux program and sets a weekly cap (default 1 per week). Isabelle sees the exact odds in Surprises → “Les chances”.
3. When she pops an eligible golden heart, a **pending reward** appears in `/admin → Récompenses` and Ewan is notified. Isabelle is only told “Ewan has been told about your discovery” — nothing is promised.
4. Ewan clicks **Préparer le cadeau**, pastes the code, writes a message, picks an animation, can **preview** the whole experience, then sends. The code is encrypted (AES-256-GCM) before storage, sends are idempotent, and status is tracked *sent → opened → revealed* with timestamps.
5. Isabelle gets a notification (never containing the code) and opens the gift: the world blurs, the companion walks in with a present, it opens, hugs her, shows Ewan’s message, and **Révéler mon code** calls `/api/gifts/reveal`, which checks she is the recipient and decrypts in memory. The code is never stored in the browser, in notifications or in logs.

Without a real code, Ewan can send a clearly labeled **demo gift** or a message-only **surprise**. In device mode, `/admin` lets you test a demo gift locally.

## Wellbeing principles
- Food and water tracking are optional (toggles in Settings) and never required for quests or rewards.
- No calorie limits, no red warnings, no shame — only an optional “personal reference”.
- Food search shows Open Food Facts data as published; values are never invented.
- This is a personal diary, not a medical tool.

## Privacy & GDPR
Owner-only RLS on every personal table; server-only tables for codes, settings and audit; JSON export and full deletion in Settings; privacy page at `/privacy`; notifications never contain personal information.

## Development
```bash
npm install
npm run dev        # http://localhost:3000 — device mode unless .env.local has Supabase variables
npm test           # game engine, odds, crypto, import caps, database RLS (PGlite), FR/EN parity, contrast
npm run typecheck
npm run lint
npm run build
```

## Project map
```
src/app/(world)/…   pages inside the world shell: home, world map, rooms + editor, studio, companion,
                    food, water, calendar, scrapbook, quests, inventory, surprises, notifications, settings
src/app/admin       Ewan’s panel            src/app/login     invite-only sign-in
src/app/api/…       rpc (data ops), state, admin, gifts/reveal, food/search, cron, auth, account export
src/lib/game        engine shared by server and device (quests, XP, coins, chests, hearts, achievements)
src/lib/catalog     ~70 original SVG furniture items, wallpapers/floors, wardrobe, collectibles
src/lib/i18n        fr.ts (default) and en.ts — identical keys, checked by tests
src/lib/server      Supabase clients, zod schemas, crypto, push, game runner
supabase/migrations schema + Row Level Security
```
