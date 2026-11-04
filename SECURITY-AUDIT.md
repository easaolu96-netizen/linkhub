# LinkHub — Security Audit

**Date:** 7 October 2026
**Scope:** The entire repository:
- Next.js 16 app: pages, server actions, route handlers, proxy
- Supabase: Postgres schema, RLS, functions, Storage policies, Auth usage
- configuration: `next.config.ts`, `vercel.json`, env handling
- dependencies

**Method:**
1. Manual code review of every server entry point.
2. **Live attack probes** against the real Supabase project, using throw-away test users, acting as a malicious signed-in user who talks to the database API directly with the public key and their own JWT, bypassing the app.
3. Browser-driven tests (headless Chrome) against a production build.

This review reduces risk; it does **not** make the application "100% secure". See [Remaining risks](#remaining-risks).

---

## Summary

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | Server-side request forgery (SSRF) through `avatar_url` + profile share-image route | **High** | Fixed |
| 2 | No app-level rate limiting on login / sign-up / code verify / code resend (brute force, email bombing, shared-IP lockout) | **High** | Fixed |
| 3 | Open redirect after login via control characters (`?next=/%09/evil.com`) | **Medium** | Fixed |
| 4 | Database checks bypassable through the direct database API: unlimited links, multi-MB theme/socials JSON | **Medium** | Fixed |
| 5 | Unpublished profiles (real names + Google photos of users who never chose a username) readable by anyone | **Medium** | Fixed |
| 6 | No security audit logging | **Medium** | Fixed |
| 7 | Storage: any file name and unlimited files in a user's own avatar folder | Low–Medium | Fixed |
| 8 | Content spoofing: `/login?error=` displayed attacker-supplied text on our domain | Low–Medium | Fixed |
| 9 | Account deletion possible from an old/forgotten session (no re-authentication) | Low–Medium | Fixed |
| 10 | Users could delete/insert their own `profiles` row directly (breaks their account; integrity) | Low | Fixed |
| 11 | Weak headers: CSP limited to `frame-ancestors`; `X-Powered-By` exposed; HSTS without `includeSubDomains` | Low | Fixed |
| 12 | Auth cookies without the `Secure` flag | Low | Fixed |
| 13 | Unthrottled public username-availability check (scraping / DB load) | Low | Fixed |
| 14 | Email confirmation link built from the request's `Origin` header | Low | Fixed |
| 15 | Auth callback accepted unused email-link types (recovery, magic link, invite) | Low | Fixed |
| 16 | Impersonation-prone usernames not reserved (`support`, `security`, `linkhub`, …) | Low | Fixed |
| 17 | Dependency advisory: `braces` stack-exhaustion DoS (dev tooling only, no patched version exists) | Low | Fixed (gone after the 1 Nov 2026 update) |

**No secrets were found** in the source code or anywhere in the git history:
- Scanned for Supabase keys, JWTs, Resend keys, Google OAuth secrets, private keys and database passwords.
- `.env.local` has never been committed.
- No credentials need rotating as a result of this audit.

---

## Findings and fixes

### 1. SSRF via `avatar_url` → share-image route (High)
- **Files:** `app/[username]/opengraph-image.tsx`, database (`profiles` policies)
- **Issue:**
  - The RLS update policy let a signed-in user write *any* value to their own `avatar_url` directly through the database API.
  - The probe confirmed that `http://169.254.169.254/latest/meta-data/` was accepted.
  - The share-image route then **fetched that URL from the server**, following redirects, with no size limit.
- **Why it matters:** an attacker could make our server send requests to internal or cloud-metadata addresses or other hosts (blind SSRF). It could also serve tracking pixels to every visitor of their page.
- **Fix (defence in depth):**
  1. **Database constraint `profiles_avatar_url_allowed`:** only the owner's own upload in this project's `avatars` bucket (`<own-user-id>/<timestamp>.<ext>`) or a `https://lh3.googleusercontent.com/…` photo is allowed.
  2. **`lib/avatar.ts` → `safeAvatarUrl()`:** the same allowlist is applied before any avatar is rendered (dashboard, public page) or fetched.
  3. **Share-image fetch hardening:** only allowlisted URLs are fetched, with `redirect: "error"`, a 3 s timeout, a 1 MB cap, and PNG/JPEG only.

### 2. Missing rate limiting on authentication (High)
- **Files:** `app/auth/actions.ts`, new `lib/security/limits.ts`, migration (`consume_rate_limit`)
- **Issue:**
  - Sign-in, sign-up and code verification run through our server, so Supabase's built-in per-IP limits see **the server's IP for every user**.
  - An attacker could brute-force passwords or the email code at Supabase's full rate.
  - The same flows allowed repeated code emails to any address (email bombing).
  - Once Supabase's IP limit tripped, **all** users would be locked out.
- **Fix:**
  - A shared, database-backed limiter (`public.consume_rate_limit`, atomic upsert, service-role only) so the limits hold across all serverless instances.
  - Limits apply **per client IP and per email**. Subjects are HMAC-hashed, never stored raw.

  | Action | Per IP | Per email / user |
  |---|---|---|
  | Login | 20 / 10 min | 8 / 10 min |
  | Sign-up | 10 / hour | 3 / hour |
  | Verify email code | 30 / 15 min | 8 / 15 min |
  | Resend code | 10 / hour | 4 / hour |
  | Change username | — | 10 / hour |
  | Change avatar | — | 20 / hour |
  | Delete account | — | 5 / hour |

  - The click and page-view endpoints keep their existing in-memory per-IP limits.
  - New in-memory limits on the auth callback (30 / 10 min per IP) and the username check (90 / min per IP).

### 3. Open redirect via control characters (Medium)
- **File:** `lib/safe-redirect.ts`
- **Issue:** `safeRedirectPath` only rejected paths starting with `//` or `/\`. Browsers strip tab and newline characters while parsing URLs, so `?next=/%09/evil.com` passed the check and then resolved to `//evil.com`. A login link could therefore send users to a phishing site afterwards. This was confirmed with the URL parser.
- **Fix:** reject control characters and backslashes outright, parse the path with the WHATWG URL parser (as browsers do), require the origin to be unchanged, and cap the length at 2 KB.

### 4. Database rules bypassable via the direct API (Medium)
- **Files:** migrations
- **Issue:** the 100-link limit lived only in the app's `create_link` function; a direct insert stored 105 links. `theme` and `socials` accepted a 200 KB blob (storage and render-time abuse).
- **Fix:**
  - A `BEFORE INSERT` trigger (`enforce_link_limit`) with a per-user advisory lock enforces the 100-link limit.
  - CHECK constraints limit `theme` to 2 KB and `socials` to 4 KB, and both must be JSON objects.
  - **Column-level privileges:**
    - `profiles`: users can update only `username, display_name, bio, avatar_url, theme, socials`.
    - `links`: users can update only `title, url, position, is_visible`.
    - So `id`, `user_id` and timestamps can no longer be rewritten.

### 5. Unpublished profiles were public (Medium)
- **Issue:** `profiles` had `SELECT using (true)`. Anyone with the public key could list the display names and Google photos of people who signed up but never published a page.
- **Fix:** the public policy is now `using (username is not null)`, plus an "owner can read own row" policy.

### 6. No security audit log (Medium)
- **Fix:** a new `public.audit_logs` table:
  - no client access at all (RLS on, every privilege revoked from `anon`/`authenticated`)
  - written server-side only, after the response is sent, via `lib/security/audit.ts`
- **Events:** `login.succeeded`, `login.failed`, `login.unconfirmed`, `login.rate_limited`, `signup.requested`, `signup.rate_limited`, `email.verified`, `email.verify_failed`, `email.verify_rate_limited`, `email.code_resent`, `email.resend_rate_limited`, `oauth.login`, `oauth.failed`, `logout`, `username.changed`, `avatar.changed`, `account.deleted`, `account.delete_reauth_required`.
- **Each row stores:** event, user id, email, IP, user agent (truncated) and small metadata (e.g. failure reason, old/new username).
- **Never logged:** passwords, codes, tokens or keys (verified by test).
- **Retention:** `public.purge_old_audit_logs(days)` (service role) deletes rows older than 180 days by default.

### 7. Storage abuse (Low–Medium)
- **Issue:** users could upload any file name (e.g. `notes.png`) and unlimited files into their own folder. Uploads aren't served as HTML, because the bucket only allows JPEG/PNG/WebP and serves them with that content type.
- **Fix:** the insert/update policies now require `^[0-9]{10,16}\.(jpg|jpeg|png|webp)$` names, exactly one folder level, and at most 3 objects per user (`my_avatar_object_count()`). The app keeps one file and deletes the rest.
- **Existing controls verified:** 2 MB bucket limit; MIME allowlist (HTML and SVG rejected); owner-folder-only writes; path traversal rejected.
- **Change:** avatars are now saved as JPEG, cropped and re-encoded in the browser, so any embedded payload or metadata is dropped.

### 8. Content spoofing on the login page (Low–Medium)
- **Files:** `app/(auth)/login/page.tsx`, `app/auth/callback/route.ts`
- **Fix:** the page only shows messages for known codes (`link_invalid`, `signin_failed`, `rate_limited`) and never echoes URL text.

### 9. Re-authentication for account deletion (Low–Medium)
- **Files:** `lib/actions/account.ts`, `lib/auth.ts`, `components/dashboard/settings/delete-account.tsx`
- **Fix:**
  - Deleting the account now requires a sign-in within the last **2 hours**. The time is read from the JWT's `amr` timestamps, which token refreshes don't change.
  - Otherwise the user gets a "Log in again" prompt. This signs them out and returns them to Settings after logging in.
  - The deletion itself is also rate-limited and audit-logged.

### 10. Clients inserting/deleting `profiles` rows (Low)
- **Fix:** the insert and delete policies were dropped and the privileges revoked. Profiles are created only by the sign-up trigger, and removed only by deleting the auth user (cascade).

### 11. Security headers (Low)
- **File:** `next.config.ts`
- **Content-Security-Policy:**
  - `default-src 'self'`; scripts and styles from self (see risk R1)
  - `img-src` self, data, blob, the Supabase project and Google photos
  - `connect-src` self and the Supabase project
  - `object-src 'none'`, `frame-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`
- **Other headers:**
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains`
  - `Cross-Origin-Opener-Policy: same-origin`
  - a stricter `Permissions-Policy`
  - `X-Powered-By` removed
  - existing `X-Frame-Options: DENY`, `nosniff` and `Referrer-Policy` kept
- **CORS:** none is configured, so there's no cross-origin access. Verified that a foreign `Origin` receives no `Access-Control-Allow-Origin`.

### 12. Cookie flags (Low)
- **File:** `lib/supabase/cookie-options.ts`
- **Fix:** auth cookies use `Secure` on HTTPS deployments and `SameSite=Lax`. `httpOnly` isn't possible, because Supabase's browser client must read the session (see risk R2).

### 13–16. Smaller fixes
- **Username check:** per-IP throttle, and input truncated before validation.
- **Confirmation links:** `emailRedirectTo` is built from the configured `NEXT_PUBLIC_SITE_URL`, never from request headers.
- **Auth callback:** accepts only the `signup` and `email` link types the app actually sends.
- **Reserved usernames:** 23 more names reserved (`support`, `security`, `linkhub`, `admin`-likes, route-like names), in both the database and the app.
- **Trigger functions:** `handle_new_user` and `set_updated_at` can no longer be called by clients.

### 17. Dependencies (Low)
- `npm audit` reported 9 "high" entries, **all** the same `braces` advisory (GHSA-vfj7-8cjw-p6xm, stack exhaustion from deeply nested glob patterns).
- They reach the project only via the shadcn CLI and the ESLint config: developer tools fed developer-written patterns, never user input.
- No fixed version of `braces` exists (3.0.3 is both the latest release and inside the vulnerable range). npm's suggested "fix" is a major *downgrade* of both tools, so it wasn't applied.
- `shadcn` was moved to `devDependencies`. **`npm audit --omit=dev` now reports 0 vulnerabilities.**

---

## Verified as already secure (tested, unchanged)

- **Protected pages:** `/dashboard/*` and `/onboarding` redirect signed-out users at the proxy, and each page checks the session again on the server.
- **Server actions:** every state-changing action verifies the session server-side (`getClaims()`, which checks the JWT signature) and validates input with Zod. Next.js rejects cross-origin server-action posts (Origin/Host check), so there's no CSRF.
- **IDOR (one user acting on another's data):**
  - Other users' profiles and links can't be read or modified: 0 rows returned or changed.
  - Hidden links aren't readable.
  - A link can't be moved to another user.
  - Analytics are isolated: `get_analytics` only returns the caller's data, direct reads of others' rows return nothing, and anonymous calls are rejected.
- **Analytics writes:** impossible from clients; they come only from the server (service role) after bot, prefetch and rate-limit filtering.
- **Link URLs:** only `http`, `https` and `mailto`, enforced by Zod, a Postgres CHECK, and again at render and redirect time. `javascript:` was rejected by the database during the probe.
- **XSS:** all user content is rendered as text by React. The only raw-HTML use is a QR-code SVG generated locally from our own URL. Theme values are strictly parsed (hex colours, enums).
- **SQL injection:** all queries go through the parameterised Supabase client. SQL functions use `search_path = ''` and no dynamic SQL.
- **Service-role key:** used only in `server-only` modules (`lib/supabase/admin.ts`) and CLI scripts. It is never sent to the browser and never `NEXT_PUBLIC_`.
- **No debug, admin or test endpoints** exist in the deployed app.

---

## Final review of the changes

After the fixes, the modified code was reviewed again specifically for problems **introduced by this hardening pass**:

| Found in review | Impact | Fix |
|---|---|---|
| The new avatar-URL constraint also applies to the sign-up trigger. An OAuth photo URL outside the allowlist would make the profile insert, and so **the whole sign-up**, fail. | Availability: Google sign-ups could break | Migration `20261007010000_safe_signup_avatar.sql`: the trigger keeps the provider photo only if it passes the allowlist, otherwise null. Tested with a Google URL (kept), a hostile URL (dropped, sign-up OK) and no photo. |
| "Log in again" for account deletion used a global sign-out (all devices). | Usability | Changed to sign out this browser only (`scope: "local"`). |
| An earlier draft migration was corrupted by an editing mistake before it was applied | None (it failed to apply) | Rewritten cleanly; all statements made idempotent (`if exists` / `if not exists`). |

Also re-checked:
- New tables and functions are unreachable by clients (tested).
- The rate limiter cannot be used to read or forge data.
- The audit logger never receives secrets (tested).
- The redirect sanitiser still allows legitimate paths and query strings (tested).
- The CSP doesn't block Supabase uploads, Google sign-in or charts (regression suite).

## Tests performed

| Test | Result |
|---|---|
| Secret scan of the working tree **and full git history** | 0 findings |
| Direct-database-API attack probe, 21 checks (before fixes) | 7 weaknesses confirmed |
| Same probe after fixes | **21 / 21 secure** |
| Unit tests: redirect sanitiser (13 vectors incl. tab, newline, CR, backslash, `//`, `https:`, `javascript:`, oversize) | All pass |
| Unit tests: avatar allowlist (11 vectors incl. metadata IP, other user's folder, `..`, SVG, http, port, credentials) | All pass |
| E2E: security headers on page, login, public profile, API route | All present |
| E2E: CORS from a foreign origin | No grant |
| E2E: real login with `next=/%09/evil.example` | Stays on site |
| E2E: `/login?error=<attacker text>` | Not displayed |
| E2E: 10 wrong passwords for one email | Blocked from attempt #8 (limit 8 / 10 min, incl. one earlier success) |
| Audit log after the above | Success, failures and rate-limit events recorded with IP/UA; **no password present** |
| Anonymous / signed-in access to `audit_logs`, `rate_limit_buckets`, `consume_rate_limit` | Permission denied |
| Rate-limiter function (limit 3) | `true, true, true, false, false` |
| Regression: links, profile + avatar upload, appearance, analytics, settings (username change, QR, account deletion), landing, email-code flow, public page + click tracking | See results in the change log below |
| Accessibility audit (axe-core, 15 page variants) | 0 violations |
| `npm run typecheck`, `npm run lint`, `npm run build` | Pass |
| `npm audit --omit=dev` | 0 vulnerabilities |

No destructive tests were run against external systems. All probes used temporary `@example.com` users, which were deleted afterwards along with their data.

---

## Follow-up review (1 Nov 2026)

| # | Finding | Severity | Status |
|---|---|---|---|
| F1 | Image optimizer usable as a proxy for remote images | Medium | Fixed (`remotePatterns: []`) |
| F2 | Share images rendered uncached on every request | Medium | Fixed (cached, plus 60/min per-IP limit in `proxy.ts`) |
| F3 | Supabase minimum password length below the app's | Low | Fixed (dashboard: 8) |
| F4 | No CAPTCHA on email auth | Medium | Fixed (Cloudflare Turnstile, enforced by Supabase) |
| F5 | Click and share-image limits only per server instance | Low | Mitigated (Vercel Firewall rule) |
| F6 | No limit on how often a signed-in user writes links/profile, including directly through the database API | Low–Medium | Fixed: statement-level triggers in `20261101000000_write_rate_limits.sql`, 300 link writes and 120 profile updates per 10 min per user. Verified: update 121 is rejected with hint `rate_limited`; service-role writes are not limited |
| F7 | Shared DB rate limiter failed open on errors | Low | Fixed (fails closed; errors logged) |
| F8 | Seed script defaulted to a known demo password | Low | Fixed (random password unless `SEED_PASSWORD` is set) |
| F9 | Dependency advisories, including **critical** Next.js RCE advisories (GHSA-2464-fhr4-w9xw, GHSA-673q-mjm6-r5xr), a Server Actions DoS (GHSA-p3m5-59mp-jv5r) and a zod memory DoS (GHSA-mrhx-c7xc-m3w5) | **Critical** | Fixed: `next` 16.4.3, `zod` 4.6.6, `npm audit fix`. Critical/high: 0; `npm audit --omit=dev`: 0 |

LinkHub was not affected by the two Next.js RCEs in practice: the image optimizer accepts no remote images and SVG isn't enabled, and `use cache` isn't used. The upgrade was applied anyway.

---

## Third audit: full assessment (4 Nov 2026)

Scope: the whole codebase on `main` (plus the unmerged `redesign-3d` landing code, which is client-only 3D with no user input), the Supabase database and storage rules, and the live deployment's transport security.

### Tools run
| Tool | What it checks | Result |
|---|---|---|
| Gitleaks 8.30.1 | Secrets in the whole git history (all branches) and the working folder | History: **0 leaks**. Working folder: only `.env.local` (git-ignored, never committed) |
| OSV-Scanner 2.7.0 | Known vulnerabilities in every locked dependency | 3 packages, all **dev-only** (ESLint, shadcn CLI): deepmerge 4.3.1, minimatch 3.1.5 / 10.2.6; no fixed versions upstream |
| npm audit | Same, npm advisory database | Production dependencies: **0**. All: 21 low/moderate, dev-only |
| Semgrep 1.183 | Static analysis, 8 rule sets (JS, TS, React, Next.js, OWASP Top 10, secrets, SQL injection, XSS), 119 files | **0 findings** |
| Custom DAST suite 1 | 34 attacks on the Supabase API with two throwaway users | 33 blocked; FU6 → S1 below |
| Custom DAST suite 2 | 24 attacks on a production build (server actions called directly, as an attacker would) | 22 passed; the other 2 are test artefacts (explained below) |
| Bundle secret scan | Server-only key and DB password searched in all 85 browser files | **0** |
| OWASP ZAP | Dynamic crawl | **Not run**: needs Java or Docker, neither available. The custom suites cover the listed attacks, not a full crawl |

### Findings
| # | Finding | Severity | Status |
|---|---|---|---|
| S1 | Avatar files were checked only by the content type the browser *declared*: HTML labelled `image/jpeg` was accepted and could be set as a profile photo | Low–Medium | **Fixed**: `setAvatar` reads the first bytes and accepts only real JPEG/PNG/WebP signatures; impostors are deleted. Storage still accepts the upload itself (Supabase can't inspect content) but it can never be linked from a profile |
| S2 | `kashdigit.com` serves a separate site that could plant a `Domain=kashdigit.com` cookie and fix a victim into an attacker's session (cookie tossing / session fixation) | Low–Medium | **Fixed**: on HTTPS the session cookie is `__Host-linkhub-auth`, which browsers only accept from this exact host (Secure, Path=/, no Domain). Everyone is signed out once when this ships |
| S3 | Password policy was length-only (8+): `password1`, `qwertyuiop` were accepted. Supabase's leaked-password check needs the Pro plan | Medium | **Fixed**: sign-up and reset refuse ~75 of the most-breached 8+ character passwords, single repeated characters, and passwords containing the email's name (browser and server) |
| S4 | Audit log (emails, IPs) was never purged automatically | Low | **Fixed**: `pg_cron` deletes entries older than 180 days on the 1st of each month (`20261104000000_audit_log_retention.sql`) |
| S5 | No downloadable backups on the free plan: data loss would be unrecoverable | Medium | **Mitigated**: `npm run db:backup` exports every table and the account list to git-ignored `backups/`. Must be run regularly |
| S6 | Patch releases available (Next.js 16.4.5, supabase-js 2.118.0); no known vulnerabilities in the installed versions | Info | **Updated** |
| S7 | Some limits are per server instance (click, view, username check, OG image, auth callback) | Low | Accepted; clicks and share images are also limited by the Vercel Firewall rule |
| S8 | `style-src 'unsafe-inline'` in the CSP | Info | Accepted (React `style` props); scripts are nonce-only |
| S9 | Session cookies are readable by JavaScript (Supabase SSR design) | Info | Accepted; the strict nonce CSP is the mitigation |
| S10 | `/api/click/<id>` redirects to whatever URL a user saved, so a malicious page can point anywhere (phishing) | Low | Accepted: it is the product. Only http/https/mailto; links resolve by id; abuse is a policy matter |
| S11 | Dev-only dependency advisories (tools table) | Low | Accepted: never shipped; no upstream fix |

**Totals: 11 findings. Critical 0, High 0, Medium 2 (S3, S5), Low–Medium 2 (S1, S2), Low 4, Info 3. Fixed or mitigated: 6. Accepted with rationale: 5. Unresolved: 0.**

### Attack scenarios tested (PASS = attack blocked)
- **Access control / IDOR:** another user's hidden link, editing, deleting, creating links as them, editing their profile, reordering their links, reading their analytics, analytics function scope: **8/8 PASS**.
- **Mass assignment / privilege escalation:** changing `id`, `created_at`, a link's owner; inserting profiles; forging analytics or audit entries; reading audit and rate-limit tables; calling the rate-limit and log-purge functions; claiming `admin`: **11/11 PASS**.
- **Injection:** SQL in filters and function arguments (stored as text), `javascript:` URLs, foreign avatar URLs: **4/4 PASS**. Stored XSS in name, bio, link titles and socials, on the public page and share image: **PASS** (0 dialogs, 0 injected elements).
- **Anonymous access:** hidden links, writes, analytics, listing avatars: **4/4 PASS**.
- **File upload:** other user's folder, HTML, SVG, path traversal, >2 MB: **5/5 PASS**; HTML disguised as JPEG: blocked at the app layer by S1.
- **CSRF:** cross-site server-action call rejected (HTTP 500, invalid origin). A forged logout is also stopped by `SameSite=Lax`; the suite's own logout probe was redirected before reaching the action, so it is inconclusive on its own.
- **Brute force / stuffing / flooding:** 9th guess on one account, 21st account from one IP, 6th sign-up, 6th reset email, 9th email-code guess all refused: **5/5 PASS**.
- **Account enumeration:** password reset answers identically for existing and unknown emails (verified separately; the suite's check hit CAPTCHA first).
- **Open redirect:** 9 known bypass payloads; auth callback with `next=//evil.com`: **PASS**.
- **Path traversal / file disclosure:** `.env`, `.env.local`, `.git/config`, `package.json`, migrations, encoded `../`: **PASS** (none served).
- **DoS inputs:** 2.5 MB action body refused in 21 ms; 20,000-character id refused (431): **PASS**.
- **Information disclosure:** malformed action call returns a bare 400 (details only in server logs); no `X-Powered-By`: **PASS**.
- **Headers / clickjacking / CORS:** CSP with nonce and `frame-ancestors 'none'`, HSTS, XFO, nosniff, Referrer-Policy, Permissions-Policy, COOP on pages and API; framing refused; no CORS for other origins: **PASS**.
- **Live transport:** HTTP → HTTPS 308; HSTS 2 years incl. subdomains; TLS ≤ 1.1 refused: **PASS**.
- **Sessions:** old refresh token rejected after logout; password reset signs out other devices; 2FA enforced in the database: **PASS**.
- **Fix verification: 8/8 PASS** (disguised HTML refused and deleted, real JPEG still accepted, common and email-based passwords refused on sign-up and reset, strong password accepted, `__Host-` cookie settings). **Functional regression:** dashboard (5 tabs), public page, login, reset and landing all load correctly.

### Security checklist
| Area | Status |
|---|---|
| SQL injection | PASS |
| XSS (stored, reflected, DOM) | PASS |
| CSRF | PASS (framework origin check + SameSite=Lax) |
| Broken authentication (CAPTCHA, limits, OTP expiry, 2FA) | PASS |
| Broken access control / IDOR | PASS |
| SSRF | PASS (avatar allow-list in app and DB; no other server fetches of user URLs) |
| RCE / command injection | PASS (no eval, shell or dynamic code; Semgrep clean) |
| Path / directory traversal | PASS |
| Brute force / credential stuffing | PASS |
| Session hijacking (Secure, SameSite, nonce CSP, 1 h JWT) | PASS |
| Session fixation / cookie tossing | PASS after S2 (deployed 4 Nov; owner confirmed login works on the live site) |
| Clickjacking | PASS |
| Open redirects | PASS |
| Insecure file uploads | PASS after S1 |
| API abuse / rate limits | PASS (some per instance, S7) |
| Privilege escalation / mass assignment | PASS |
| Sensitive information disclosure (bundle, errors, headers, files) | PASS |
| Race conditions (link-limit lock, unique username, atomic limiter) | PASS (code review; lock tested in an earlier audit) |
| Business logic (limits, reserved names, unique analytics) | PASS |
| DoS vectors (body size, id length, per-user write limits) | PASS; volumetric DDoS is Vercel's layer: NOT TESTED |
| Password hashing | Supabase Auth (bcrypt), not configurable: NOT TESTED by us |
| Password policy | PASS after S3 (leaked-password API needs Pro) |
| Secrets in git / browser bundle | PASS |
| Dependencies | PASS for production; dev-only advisories accepted |
| Backups | PARTIAL (manual export, S5) |
| Supabase redirect-URL allow-list | PASS (owner checked 4 Nov: only `https://linktree.kashdigit.com/**` and `http://localhost:3000/**`) |
| Supabase JWT expiry / refresh-token reuse window | NOT TESTED: no Management API access |
| OWASP ZAP crawl | NOT TESTED: tool unavailable |

### OWASP Top 10 (2021)
- **A01 Broken Access Control:** RLS, column grants, restrictive 2FA policies; IDOR and mass-assignment tests.
- **A02 Cryptographic Failures:** TLS 1.2+, HSTS, Supabase-managed password hashing, HMAC-hashed limiter keys and visitor ids.
- **A03 Injection:** parameterised API, DB check constraints, React escaping, nonce CSP.
- **A04 Insecure Design:** per-user DB write limits, reserved names, CAPTCHA, re-auth for deletion.
- **A05 Security Misconfiguration:** headers, no framework banner, image optimizer closed.
- **A06 Vulnerable Components:** scanners above; patch updates (S6).
- **A07 Identification & Authentication Failures:** limits, CAPTCHA, OTP, optional TOTP 2FA, password policy (S3), `__Host-` cookie (S2).
- **A08 Software & Data Integrity:** lockfile, checksum-verified tools, migrations in git.
- **A09 Logging & Monitoring:** audit log with retention (S4); no alerting yet.
- **A10 SSRF:** avatar allow-list in app and DB; no other outbound fetches of user input.
- **OWASP API Top 10:** API1/API3 object- and property-level authorization (IDOR, mass assignment), API2 authentication, API4 resource consumption (limits, body size), API5 function-level authorization (privileged RPCs revoked), API8 misconfiguration.

### Limitations
- No OWASP ZAP crawl (no Java/Docker). The custom suites test the attacks listed, not every possible input.
- Supabase settings that need the dashboard or Management API (redirect-URL allow-list, JWT expiry, refresh-token rotation window) were not checked from here.
- No load or DDoS testing (inappropriate against shared production services).
- Tests ran against the production Supabase project with throwaway accounts, deleted afterwards (shared database, R10).

---

## Remaining risks

| # | Risk | Notes / mitigation |
|---|---|---|
| R1 | **CSP still allows inline `style` attributes** (`style-src 'unsafe-inline'`). | Scripts are now nonce-only with `'strict-dynamic'` (no `'unsafe-inline'`; verified: 0 violations on every page type, and Turnstile, hydration and the dashboard work). Inline styles are needed for React `style` props and theme colours; style injection can't run code. |
| R2 | **Session cookies are readable by JavaScript** (Supabase design). | An XSS bug would expose the session. Mitigated by R1's controls, `Secure`, `SameSite=Lax`, and short-lived access tokens (1 h). |
| R3 | **JWTs stay valid until expiry** (≤ 1 h) after logout or deletion. | Standard stateless JWT behaviour; RLS still applies and a deleted user's rows are gone. |
| R4 | **The Supabase Auth API can be called directly** with the public key, bypassing the app's limits. | Supabase's own per-IP limits apply to the caller's real IP. Recommended dashboard settings are below. |
| R5 | **The click/view/callback/username-check limiters are per server instance.** | The shared DB limiter now fails closed (see the follow-up review). Clicks and share images are also limited by a Vercel Firewall rule. |
| R6 | **Per-email login limit can be used to lock an email out of password login** for ≤ 10 min. | Trade-off of brute-force protection; Google sign-in still works. |
| R7 | **Counts can still be inflated by a botnet with many IPs.** | Counts are now unique per visitor (anonymous daily IP + user-agent hash) per profile/link per day, enforced by unique indexes, on top of bot filtering, per-IP limits and the Vercel Firewall rule. One machine can add at most one view per profile and one click per link per day. |
| R8 | **2FA is optional, and there are no backup codes.** | Password reset (CAPTCHA, per-IP/per-email limits, audit events, signs out other devices) and optional TOTP 2FA (per-user/per-IP limits, audit events, enforced by RLS) are in place. A user who loses their authenticator needs an admin to remove the factor (Supabase dashboard → Authentication → Users → the user → remove the MFA factor). |
| R9 | **The audit log contains personal data** (emails, IPs). | Restricted to the service role; purge with `purge_old_audit_logs(180)` (schedule it). |
| R10 | **Development and production share one Supabase project** (free plan: 2 projects, both slots used). | Accepted for a one-person project. The seed script refuses to run against a hosted project without `SEED_ALLOW_REMOTE=yes` and uses a random password; tests use throwaway users that are deleted afterwards; migrations are dry-run first. Move to a local Supabase (`npx supabase start`, needs Docker) or a second project when more people work on it. |
| R11 | **The stale-session path of the re-authentication check is not tested end to end** (it would need a session over 2 h old). | The logic is small and code-reviewed; the fresh-session path is tested. |
| R12 | **Low/moderate advisories in dev-only tooling** (ESLint plugins, shadcn CLI). | Not shipped to the site; `npm audit --omit=dev` reports 0. npm's suggested fix is a major ESLint downgrade, so it's not applied. |

---

## Production recommendations

1. **Supabase Auth settings** (dashboard → Authentication → Sign In / Providers → Email):
   - ✅ **Done (1 Nov 2026):** minimum password length **8**, matching the app. Verified: direct API sign-ups with 6- or 7-character passwords are rejected as weak.
   - ✅ **Done:** **Secure email change**, **Secure password change** and **Require current password when updating** are all on, so a hijacked session can't silently change the account's email or password through the API.
   - ⏳ **Leaked-password protection:** needs the Pro plan.
   - ✅ **CAPTCHA** (Cloudflare Turnstile) on email sign-up, login and resend-code. The widget (`components/auth/turnstile.tsx`) sends a single-use token with each request, and Supabase verifies it against Cloudflare using the secret key (stored only in the Supabase dashboard). The CSP allows `https://challenges.cloudflare.com` for `script-src` and `frame-src` only. Google sign-in is unaffected. Supabase's CAPTCHA protection must stay switched on, because without it the tokens are not checked. **Done (1 Nov 2026):** verified that direct API logins and sign-ups without a token, or with a fake one, are rejected with `captcha_failed`.
   - ✅ **Done:** **email OTP expiry** is short. It's set to **15 minutes (900 s)**, which is short enough to limit a code read later from a compromised inbox and long enough for slow email delivery. Brute force is already covered by the 8-digit code and the app's 8-attempts-per-15-minutes limit.
2. **Schedule audit-log retention:** run `select public.purge_old_audit_logs(180);` monthly, e.g. from Supabase scheduled jobs / `pg_cron`.
3. **Monitor `audit_logs`** for spikes in `login.failed`, `*.rate_limited` and `email.verify_failed`.
4. **Separate environments:** use a second Supabase project for development and testing.
5. **Vercel:**
   - keep Deployment Protection on preview URLs
   - ✅ **Done:** Vercel Firewall rate rule: 60 requests per 60 s per IP on `/api/click/*` and `*/opengraph-image` (verified: request 61 gets `429`, `x-vercel-mitigated: deny`)
   - enable 2FA on the Vercel, Supabase, GitHub, Google Cloud and Resend accounts
6. **Rotate keys** if a laptop or any of those accounts is ever compromised. There's no known exposure today.
7. **Keep dependencies current** (Next.js, Supabase libraries), and run `npm audit --omit=dev` in CI.
8. **Re-run this audit's probes** (`attack` / `e2e-security` scripts) after any schema or auth change.

---

## Change log (this hardening pass)

- **New:**
  - `supabase/migrations/20261007000000_security_hardening.sql`, `supabase/migrations/20261007010000_safe_signup_avatar.sql`
  - `lib/security/limits.ts`, `lib/security/audit.ts`
  - `lib/avatar.ts`, `lib/supabase/cookie-options.ts`
  - `SECURITY-AUDIT.md`
- **Changed:**
  - `lib/safe-redirect.ts`, `lib/auth.ts`
  - `app/auth/actions.ts`, `app/auth/callback/route.ts`, `app/(auth)/login/page.tsx`
  - `lib/actions/{account,profile,username}.ts`
  - `app/[username]/opengraph-image.tsx`, `lib/dashboard.ts`, `lib/public-profile.ts`
  - `lib/supabase/{client,server,proxy}.ts`
  - `lib/validation/username.ts`, `components/dashboard/settings/delete-account.tsx`
  - `next.config.ts`, `package.json` / `package-lock.json` (shadcn → devDependencies)
  - `lib/supabase/database.types.ts` (regenerated)
