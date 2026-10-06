/**
 * Seed a demo account with a themed profile, sample links and 30 days of
 * analytics, so you can explore every dashboard tab immediately.
 *
 *   npm run db:seed
 *
 * Safe to re-run: the demo user is deleted and recreated each time.
 * Optional env vars: SEED_EMAIL, SEED_PASSWORD, SEED_USERNAME.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/supabase/database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const EMAIL = process.env.SEED_EMAIL ?? "demo@example.com";
const PASSWORD = process.env.SEED_PASSWORD ?? "linkhub-demo-123";
const USERNAME = process.env.SEED_USERNAME ?? "demo";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const admin = createClient<Database>(url, serviceKey, { auth: { persistSession: false } });

async function findUserIdByEmail(email: string) {
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) return match.id;
    if (data.users.length < 1000) return null;
  }
  return null;
}

/** Small deterministic PRNG so every seed run produces the same-looking data. */
function random(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

async function insertInChunks<T>(table: "page_views" | "link_clicks", rows: T[]) {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await admin.from(table).insert(rows.slice(i, i + 500) as never);
    if (error) throw error;
  }
}

async function main() {
  // 1. Start fresh: deleting the auth user cascades to profile, links and analytics.
  const existingId = await findUserIdByEmail(EMAIL);
  if (existingId) {
    const { data: files } = await admin.storage.from("avatars").list(existingId);
    if (files?.length) await admin.storage.from("avatars").remove(files.map((f) => `${existingId}/${f.name}`));
    await admin.auth.admin.deleteUser(existingId);
    console.log(`• Removed previous demo user ${EMAIL}`);
  }

  const { data: taken } = await admin.from("profiles").select("id").eq("username", USERNAME).maybeSingle();
  if (taken) {
    throw new Error(`Username "${USERNAME}" belongs to another account. Re-run with SEED_USERNAME=something-else.`);
  }

  // 2. Create a confirmed user (the trigger creates their profile row).
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "Demo Creator" },
  });
  if (createError || !created.user) throw createError ?? new Error("Could not create demo user");
  const userId = created.user.id;
  console.log(`• Created ${EMAIL}`);

  // 3. Profile, socials and theme.
  const { error: profileError } = await admin
    .from("profiles")
    .update({
      username: USERNAME,
      display_name: "Demo Creator",
      bio: "Photographer and storyteller. Sharing my favourite gear, guides and latest projects.",
      socials: {
        instagram: "https://instagram.com/linkhubdemo",
        youtube: "https://www.youtube.com/@linkhubdemo",
        tiktok: "https://www.tiktok.com/@linkhubdemo",
        github: "https://github.com/linkhubdemo",
        email: "mailto:hello@example.com",
      },
      theme: {
        preset: "elegant",
        backgroundType: "solid",
        background: "#f5f0e8",
        backgroundTo: "#e7dcc8",
        textColor: "#3f2d20",
        buttonStyle: "filled",
        buttonColor: "#3f2d20",
        buttonTextColor: "#f5f0e8",
        font: "playfair",
      },
    })
    .eq("id", userId);
  if (profileError) throw profileError;

  // 4. Links (every row lists every column — see README "bulk insert" note).
  const linkSeeds = [
    { title: "My latest photo series", url: "https://example.com/series", weight: 5, is_visible: true },
    { title: "My camera gear", url: "https://example.com/gear", weight: 3, is_visible: true },
    { title: "Free editing presets", url: "https://example.com/presets", weight: 4, is_visible: true },
    { title: "Book a photoshoot", url: "https://example.com/book", weight: 2, is_visible: true },
    { title: "Newsletter", url: "https://example.com/newsletter", weight: 1, is_visible: true },
    { title: "Old giveaway (ended)", url: "https://example.com/giveaway", weight: 1, is_visible: false },
  ];
  const { data: links, error: linksError } = await admin
    .from("links")
    .insert(
      linkSeeds.map((l, position) => ({
        user_id: userId,
        title: l.title,
        url: l.url,
        position,
        is_visible: l.is_visible,
      })),
    )
    .select("id, title");
  if (linksError || !links) throw linksError ?? new Error("Could not create links");
  console.log(`• Added ${links.length} links`);

  // 5. ~30 days of page views and clicks with a gentle upward trend.
  const rand = random(42);
  const referrers = ["https://instagram.com", "https://www.tiktok.com", "https://x.com", "https://www.youtube.com", null];
  const countries = ["NG", "US", "GB", "GH", "CA", "DE", null];
  const weighted = linkSeeds.flatMap((seed, i) => Array.from({ length: seed.weight }, () => links[i]!.id));
  const views: Database["public"]["Tables"]["page_views"]["Insert"][] = [];
  const clicks: Database["public"]["Tables"]["link_clicks"]["Insert"][] = [];

  for (let daysAgo = 34; daysAgo >= 0; daysAgo--) {
    const dailyViews = Math.round(12 + (34 - daysAgo) * 0.9 + rand() * 14);
    for (let i = 0; i < dailyViews; i++) {
      const at = new Date(Date.now() - daysAgo * 86_400_000 - Math.floor(rand() * 86_400_000) + 60_000);
      const referrer = referrers[Math.floor(rand() * referrers.length)] ?? null;
      views.push({
        profile_id: userId,
        created_at: at.toISOString(),
        referrer,
        country: countries[Math.floor(rand() * countries.length)] ?? null,
      });
      if (rand() < 0.42) {
        clicks.push({
          link_id: weighted[Math.floor(rand() * weighted.length)]!,
          profile_id: userId,
          created_at: new Date(at.getTime() + 15_000).toISOString(),
          referrer,
        });
      }
    }
  }
  await insertInChunks("page_views", views);
  await insertInChunks("link_clicks", clicks);
  console.log(`• Added ${views.length} page views and ${clicks.length} link clicks`);

  console.log(`
✅ Demo account ready
   Log in:       ${SITE_URL}/login
   Email:        ${EMAIL}
   Password:     ${PASSWORD}
   Public page:  ${SITE_URL}/${USERNAME}
`);
}

main().catch((error: unknown) => {
  console.error("\n❌ Seed failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
