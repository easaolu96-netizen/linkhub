# LinkHub

A "link in bio" app in the style of Linktree. People sign up, claim a username, and get a public page such as `linktree.kashdigit.com/jane` with their photo, bio, social icons and a list of links, styled with their own theme. The dashboard shows a live phone preview and analytics for views and clicks.

**Stack:** Next.js 16 (App Router) · TypeScript (strict) · Tailwind CSS v4 · shadcn/ui · Supabase (Auth, Postgres, Storage) · @dnd-kit · Zod · react-hook-form · Recharts · deployed on Vercel.

---

## Contents

1. [Features](#features)
2. [Project structure](#project-structure)
3. [Run it locally](#run-it-locally)
4. [Environment variables](#environment-variables)
5. [Database and migrations](#database-and-migrations)
6. [Demo data (seed script)](#demo-data-seed-script)
7. [Scripts](#scripts)
8. [Deploy to Vercel](#deploy-to-vercel)
9. [Security notes](#security-notes)
10. [Troubleshooting](#troubleshooting)

---

## Features

- **Auth:** email + password (with email confirmation) and Google sign-in through Supabase Auth. `proxy.ts` protects `/dashboard` and `/onboarding`.
- **Username onboarding:** 3–30 characters (`a–z 0–9 _ -`), checked live as you type, with reserved words blocked. The rules are enforced in the browser, in the server actions and in Postgres.
- **Dashboard:** a two-column editor with a live phone preview that collapses to a "Preview" button on mobile. It has five tabs:
  - **Links:** add (`https://` added automatically, only `http`, `https` and `mailto` allowed), inline edit, delete with confirmation, show/hide, drag-and-drop reordering (mouse, touch and keyboard), and a click count on each link.
  - **Profile:** display name, bio (160 characters with a counter), avatar upload (2 MB max, JPG/PNG/WebP, cropped to a square in the browser), and 8 social links.
  - **Appearance:** 8 preset themes plus custom background (solid or gradient), text colour, button style and colours, and font, with warnings when contrast is too low.
  - **Analytics:** views, clicks and click-through rate for the last 7 or 30 days, a daily chart with a table view, and clicks per link.
  - **Settings:** change username, copy your public link, download a QR code (PNG or SVG), and delete your account with a typed confirmation.
- **Public page `/[username]`:**
  - Rendered on the server, using the owner's theme.
  - Every link goes through `/api/click/[id]`, which records the click and redirects with a 302.
  - Page views are recorded after the response is sent. Bots, prefetches, the owner's own visits and rapid repeats are not counted.
  - Each page has its own title, description, canonical URL and a share image generated with `next/og`.
  - Unknown usernames get a custom 404.
- **Landing page** with a "claim your link" box that checks usernames live.
- **Production details:**
  - rate limiting on the click and view endpoints
  - security headers
  - `robots.txt` and `sitemap.xml`
  - error pages
  - accessibility checked with axe-core (0 violations across 15 page variants)

## Project structure

```
app/
  (auth)/login, (auth)/signup     Auth pages
  auth/callback/route.ts          OAuth and email-link landing (exchanges the code for a session)
  auth/actions.ts                 login / signup / signOut server actions
  onboarding/                     Claim-username page
  dashboard/                      Layout (loads data once) + links, profile, appearance, analytics, settings
  [username]/                     Public profile page, its OG image and its 404
  api/click/[linkId]/route.ts     Click tracking + redirect
  page.tsx                        Landing page
  sitemap.ts, robots.ts, opengraph-image.tsx, icon.svg, not-found.tsx, error.tsx
components/
  ui/                             shadcn/ui primitives
  dashboard/                      Dashboard features (links, profile, appearance, analytics, settings)
  profile/                        ProfileView (public page and preview), PhoneFrame, SocialIcon
  auth/, username/, landing/
lib/
  supabase/                       client.ts (browser), server.ts (cookies), admin.ts (service role, server-only),
                                  public.ts (anonymous), proxy.ts (session refresh), database.types.ts (generated)
  actions/                        Server actions: links, profile, theme, username, account
  validation/                     Zod schemas shared by client and server
  theme.ts, socials.ts, analytics.ts, rate-limit.ts, request-info.ts, ...
proxy.ts                          Next.js 16 "proxy" (formerly middleware): session refresh + route guards
supabase/migrations/              SQL migrations (schema, RLS, storage, triggers, functions)
scripts/                          seed.ts, verify-supabase.ts
```

## Run it locally

**You need:** Node.js 20.9 or newer (developed on Node 24), npm, and a free [Supabase](https://supabase.com) account.

```bash
# 1. Install dependencies
npm install

# 2. Create your env file and fill it in (see the next section)
cp .env.local.example .env.local        # Windows: copy .env.local.example .env.local

# 3. Create the database tables (see "Database and migrations")
npx supabase login
npx supabase link --project-ref <your-project-ref>
npm run db:push
npm run db:verify                        # should end with "All checks passed"

# 4. (Optional) Add a demo account with sample data
npm run db:seed

# 5. Start the dev server
npm run dev                              # http://localhost:3000
```

### Turn on Google sign-in (optional locally)

1. In [Google Cloud Console](https://console.cloud.google.com), open **Google Auth Platform**, click **Get started** and choose **External**. Under **Audience**, add your Gmail address as a test user.
2. Go to **Clients → Create client → Web application** and set:
   - **Authorized JavaScript origins:** `http://localhost:3000`
   - **Authorized redirect URIs:** `https://<your-project-ref>.supabase.co/auth/v1/callback`
3. Copy the Client ID and Client Secret into **Supabase → Authentication → Sign In / Providers → Google**, turn it on, and click **Save**.
4. In **Supabase → Authentication → URL Configuration**, set **Site URL** to `http://localhost:3000` and add `http://localhost:3000/**` under **Redirect URLs**.

> Test Google sign-in in a normal Chrome or Edge window. Previews embedded in VS Code can't open Google's sign-in page.

## Environment variables

| Variable | Where it's used | Where to find it |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Absolute URLs (share images, sitemap, copy-link, QR code) | `http://localhost:3000` locally; `https://linktree.kashdigit.com` in production |
| `NEXT_PUBLIC_SUPABASE_URL` | Every Supabase client | Supabase → Project Settings → API (or the **Connect** button) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser and server clients (RLS applies) | The **anon** or **publishable** key (`sb_publishable_…`) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only**: analytics inserts, click lookups, account deletion, seed | The **service_role** or **secret** key (`sb_secret_…`). Never expose it to the browser |
| `SUPABASE_DB_PASSWORD` | Local only, for `supabase link` and `db push` | The password you set when creating the project. **Don't** add it to Vercel |

`lib/supabase/admin.ts` imports `server-only`, so the build fails if browser code ever imports the service-role client.

## Database and migrations

The schema lives in `supabase/migrations/` and is applied in filename order:

| Migration | What it does |
|---|---|
| `20261005000000_init_schema.sql` | `profiles`, `links`, `page_views` and `link_clicks` tables, plus the indexes, `updated_at` triggers, the trigger that creates a profile for each new user, **Row Level Security** on every table, RPC helpers, and the `avatars` storage bucket and its policies |
| `20261005010000_create_link_fn.sql` | `create_link()`: limit check, "add to top" and insert in one round trip |
| `20261005020000_analytics_fn.sql` | `get_analytics(days)`: all dashboard analytics in one round trip |

**Row Level Security summary**
- `profiles`: anyone can read; only the owner can insert, update or delete.
- `links`: anyone can read visible links; the owner can do everything with their own links.
- `page_views` and `link_clicks`: no insert policy, so only the server (service role) can write; owners can read their own rows.
- Storage `avatars`: files are publicly readable by URL; users can only write inside a folder named with their own user ID.

**Applying migrations**, either way:
- **CLI (recommended):** run `npm run db:push`. It applies any new migration files to the linked project. After changing the schema, run `npm run db:types` to regenerate `lib/supabase/database.types.ts`.
- **Dashboard:** open **Supabase → SQL Editor**, paste each file's contents in order, and click **Run**.

To add a schema change, create a new file `supabase/migrations/<timestamp>_<name>.sql`, run `npm run db:push`, then `npm run db:types`.

## Demo data (seed script)

```bash
npm run db:seed
```

This creates (or recreates) a confirmed account:

- **Login:** `demo@example.com` / `linkhub-demo-123`
- **Public page:** `/demo`, with a gradient theme, socials and 6 links (one hidden)
- **Analytics:** about 35 days of page views and clicks, so the Analytics tab has data

The script is safe to re-run. You can override the details with `SEED_EMAIL`, `SEED_PASSWORD` and `SEED_USERNAME`.

> ⚠️ Local development and production share **the same Supabase project**. Before launch, either delete the demo user (**Supabase → Authentication → Users**) or re-seed it with a private `SEED_PASSWORD`. Otherwise anyone could log in and edit `/demo`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server on http://localhost:3000 |
| `npm run build` / `npm start` | Make a production build / serve it |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript checks |
| `npm run db:push` | Apply new SQL migrations to the linked Supabase project |
| `npm run db:types` | Regenerate the TypeScript types from the live database |
| `npm run db:verify` | Check env vars, tables, RLS and the storage bucket |
| `npm run db:seed` | Create the demo account with sample data |

---

## Deploy to Vercel

The live site will be **https://linktree.kashdigit.com**. Do these steps in order.

### 1. Put the code on GitHub

Create an **empty private repository** on [github.com/new](https://github.com/new), for example `linkhub`, without a README. Then, from the project folder:

```bash
git add .
git commit -m "LinkHub MVP"
git branch -M main
git remote add origin https://github.com/<your-github-username>/linkhub.git
git push -u origin main
```

`.env.local` is git-ignored, so your keys are **not** uploaded. Before pushing, you can confirm this with `git status`: `.env.local` should not appear.

### 2. Import the project into Vercel

1. Sign in at [vercel.com](https://vercel.com) with GitHub, then click **Add New… → Project** and **Import** your `linkhub` repo.
2. **Framework Preset:** Next.js is detected automatically. Leave the build settings as they are.
3. Open **Environment Variables** and add these four, for all environments:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SITE_URL` | `https://linktree.kashdigit.com` |
   | `NEXT_PUBLIC_SUPABASE_URL` | same as your `.env.local` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same as your `.env.local` |
   | `SUPABASE_SERVICE_ROLE_KEY` | same as your `.env.local` |

   Do **not** add `SUPABASE_DB_PASSWORD`; the website doesn't need it.
4. Click **Deploy**. After about 2 minutes you'll get a `https://linkhub-xxxx.vercel.app` URL.

`vercel.json` pins the server to **Dublin (`dub1`)**, next to the Supabase database in Ireland (`eu-west-1`), so each database call takes milliseconds. If you move the database to another region, change this setting to match.

### 3. Connect `linktree.kashdigit.com`

**kashdigit.com's DNS is managed by Vercel**, so this is mostly automatic:

1. In Vercel, open **Project → Settings → Domains** and click **Add**. Enter `linktree.kashdigit.com`.
2. **If kashdigit.com is in the same Vercel team as this project**, Vercel creates the DNS record itself. Wait for **Valid Configuration**, which usually takes a minute or two. HTTPS is issued automatically.
   **If it's in a different team**, Vercel asks you to verify ownership. Either move the domain (**Domains → kashdigit.com → ⋯ → Move**) or add the record Vercel shows under **Domains → kashdigit.com → DNS Records**.
3. If you deployed before setting `NEXT_PUBLIC_SITE_URL`, go to **Deployments → ⋯ → Redeploy**. `NEXT_PUBLIC_*` values are built into the app, so they only take effect after a rebuild.

> If you ever move kashdigit.com's DNS somewhere else, you'll need to add a `CNAME` record yourself: name `linktree`, value as shown by Vercel (usually `cname.vercel-dns.com`).

### 4. Point Supabase Auth at the live site

**Supabase → Authentication → URL Configuration:**
- **Site URL:** `https://linktree.kashdigit.com`
- **Redirect URLs:** keep `http://localhost:3000/**` for local development, and add:
  - `https://linktree.kashdigit.com/**`
  - `https://*-<your-vercel-team>.vercel.app/**` *(optional, makes sign-in work on Vercel preview deployments)*

### 5. Update Google sign-in for production

In **Google Cloud Console → Google Auth Platform**:
1. **Clients → your web client → Authorized JavaScript origins:** add `https://linktree.kashdigit.com`. The redirect URI stays the Supabase one: `https://<project-ref>.supabase.co/auth/v1/callback`.
2. **Branding:** set the app name, support email and logo. Add the homepage `https://linktree.kashdigit.com`, and a privacy policy URL if you have one.
3. **Audience → Publish app**, to move it from "Testing" to "In production". Until you do, only listed test users can sign in. LinkHub only asks for the basic `email`, `profile` and `openid` scopes, which don't need Google's full verification review.

### 6. Set up a real email sender (important)

Supabase's built-in email service is only for testing. It sends very few emails per hour, and only to your own team's addresses. **Without this step, real users won't receive their confirmation email.** Resend's free tier is enough:

1. Create an account at [resend.com](https://resend.com). Go to **Domains → Add Domain** and enter `kashdigit.com`. Resend lists a few DNS records (SPF, DKIM and MX). Add each one in **Vercel → Domains → kashdigit.com → DNS Records → Add**. Enter the name exactly as Resend shows it (e.g. `send` or `resend._domainkey`) without `.kashdigit.com`, since Vercel adds that. Then click **Verify** in Resend and wait until it says **Verified**.
2. Go to **API Keys → Create API Key** with "Sending access", and copy it.
3. In **Supabase → Authentication → Emails → SMTP Settings**, turn on **custom SMTP**:
   - Host `smtp.resend.com`, port `465`, username `resend`, password = the API key
   - Sender email `no-reply@kashdigit.com`, sender name `LinkHub`
4. Optional: in **Authentication → Rate Limits**, raise the email limit, and in **Emails → Templates**, personalise the confirmation email.

### 7. Check the live site

- [ ] Open `https://linktree.kashdigit.com` and claim a username from the landing page.
- [ ] Sign up with email, receive the confirmation email, click it, and land on onboarding.
- [ ] Sign in with Google.
- [ ] Add links, change the theme, then open your public page in a private window and click a link. Views and clicks should appear in Analytics; your own logged-in visits aren't counted.
- [ ] Paste your profile URL into WhatsApp or X and check the preview card. You can also use [opengraph.xyz](https://www.opengraph.xyz).
- [ ] Open `https://linktree.kashdigit.com/sitemap.xml` and `/robots.txt`.
- [ ] Optional: submit the sitemap in [Google Search Console](https://search.google.com/search-console).
- [ ] Delete or re-password the demo user (see the warning in [Demo data](#demo-data-seed-script)).

From now on, every `git push` to `main` redeploys automatically, and pull requests get preview URLs.

---

## Security notes

- The service-role key is only used in server code: `lib/supabase/admin.ts`, which is guarded by `server-only`, and the seed and verify scripts.
- Every server action validates its input with Zod and checks the session (`getClaims()` verifies the JWT locally). Database writes are also limited by RLS.
- URLs are normalised. Only `http`, `https` and `mailto` are allowed, checked by Zod, by a Postgres `CHECK` constraint, and again when a link is rendered and redirected.
- Click and view endpoints are rate-limited per IP and per link or profile. The limiter is in memory (per server instance); for strict global limits, swap `lib/rate-limit.ts` for Upstash Redis.
- Redirect targets after login are restricted to same-site paths, so login links can't send people to another website.
- Security headers in `next.config.ts`: frame blocking (`X-Frame-Options` and CSP `frame-ancestors`), `nosniff`, `Referrer-Policy` and `Permissions-Policy`.

## Troubleshooting

| Problem | Fix |
|---|---|
| "Continue with Google" does nothing | You're in an embedded preview (VS Code). Use a normal browser. |
| Google: "Access blocked / app not verified" | Add yourself as a test user, or publish the app (Deploy step 5). |
| After Google sign-in you land on the home page with `?code=` in the URL | Add the site to **Supabase → URL Configuration → Redirect URLs** (Deploy step 4). |
| No confirmation email arrives | Set up custom SMTP (Deploy step 6), and check spam. |
| `Missing environment variable …` | Fill in `.env.local` locally, or the Vercel env vars, then redeploy. |
| Bulk inserts fail with `null value in column "is_visible"` | In multi-row inserts, Supabase fills missing columns with NULL, not the default. Give every row the same set of keys. |
| Share images show initials instead of the photo | The share-image renderer can't read WebP. New uploads are JPEG; re-upload older photos. |
| Types out of date after a schema change | Run `npm run db:types`. |
