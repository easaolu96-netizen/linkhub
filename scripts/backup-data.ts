/**
 * Export LinkHub's data to ./backups/<timestamp>/ (git-ignored) as JSON:
 * every app table plus the account list (no password hashes: Supabase never
 * exposes them).
 *
 *   npm run db:backup
 *
 * The free Supabase plan has no downloadable backups, so run this regularly
 * (e.g. weekly) and keep the folder somewhere private: it contains users'
 * personal data. The schema itself is in supabase/migrations.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const TABLES = ["profiles", "links", "page_views", "link_clicks", "audit_logs"] as const;
const PAGE = 1000;
const dir = join("backups", new Date().toISOString().replace(/[:.]/g, "-"));
mkdirSync(dir, { recursive: true });

async function exportTable(table: (typeof TABLES)[number]) {
  const rows: unknown[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin.from(table).select("*").range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  writeFileSync(join(dir, `${table}.json`), JSON.stringify(rows, null, 2));
  return rows.length;
}

async function exportUsers() {
  const users: unknown[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAGE });
    if (error) throw new Error(`users: ${error.message}`);
    users.push(
      ...data.users.map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        email_confirmed_at: u.email_confirmed_at,
        last_sign_in_at: u.last_sign_in_at,
        providers: u.app_metadata?.providers ?? [],
      })),
    );
    if (data.users.length < PAGE) break;
  }
  writeFileSync(join(dir, "users.json"), JSON.stringify(users, null, 2));
  return users.length;
}

async function main() {
  for (const table of TABLES) console.log(`• ${table}: ${await exportTable(table)} rows`);
  console.log(`• users: ${await exportUsers()}`);
  console.log(`\nBackup written to ${dir}/ — keep it private (it contains personal data).`);
}

main().catch((error: unknown) => {
  console.error("\n❌ Backup failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
