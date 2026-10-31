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

## Setup for cloud mode (about 15 minutes)

1. **Create a Supabase project** at <https://supabase.com> in an **EU region** (Paris `eu-west-3` or Frankfurt) for GDPR.
2. **Run the schema**: Supabase → SQL Editor → paste `supabase/migrations/0001_init.sql` → Run.
3. **Lock down sign-ups**: Authentication → Sign In / Providers → Email → turn **off** “Allow new users to sign up”. Accounts are created only through `/api/auth/signup`, which checks `ALLOWED_EMAILS`.
4. **Auth URLs**: Authentication → URL Configuration → Site URL = your Vercel URL; add `https://YOUR-APP.vercel.app/auth/callback` to Redirect URLs (password resets).
5. **Vercel environment variables** (Project → Settings → Environment Variables), see `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project Settings → API)
   - `ADMIN_EMAILS` = Ewan’s email, `ALLOWED_EMAILS` = Isabelle’s email
   - `APP_SECRET`, `REWARD_ENCRYPTION_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
6. **Redeploy.** Isabelle opens the site → “Première visite ? Crée ton compte” with her invited email. Ewan does the same with his, then opens **/admin**.

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
npm test           # game engine, odds, crypto, FR/EN parity, theme contrast
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
