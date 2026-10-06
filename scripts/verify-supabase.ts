/**
 * Phase 2 sanity check: confirms .env.local is filled in and the migration
 * created every table, function and the avatars bucket.
 *
 *   npm run db:verify
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/supabase/database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let failures = 0;
function report(ok: boolean, label: string, detail?: string) {
  if (!ok) failures++;
  console.log(`${ok ? "✔" : "✘"} ${label}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  report(Boolean(url), "NEXT_PUBLIC_SUPABASE_URL is set");
  report(Boolean(anonKey), "NEXT_PUBLIC_SUPABASE_ANON_KEY is set");
  report(Boolean(serviceKey), "SUPABASE_SERVICE_ROLE_KEY is set");
  if (!url || !anonKey || !serviceKey) return;

  const admin = createClient<Database>(url, serviceKey, { auth: { persistSession: false } });
  const anon = createClient<Database>(url, anonKey, { auth: { persistSession: false } });

  for (const table of ["profiles", "links", "page_views", "link_clicks"] as const) {
    const { error } = await admin.from(table).select("*", { head: true, count: "exact" });
    report(!error, `table "${table}" exists`, error?.message);
  }

  // RLS check: anonymous users must NOT be able to write analytics.
  const { error: insertError } = await anon
    .from("page_views")
    .insert({ profile_id: "00000000-0000-0000-0000-000000000000" });
  report(Boolean(insertError), "RLS blocks anonymous analytics inserts", insertError?.message);

  const { data: reserved, error: fnError } = await admin.rpc("is_reserved_username", {
    name: "admin",
  });
  report(reserved === true, "function is_reserved_username works", fnError?.message);

  const { data: bucket, error: bucketError } = await admin.storage.getBucket("avatars");
  report(
    Boolean(bucket?.public),
    'storage bucket "avatars" exists and is public',
    bucketError?.message,
  );
}

main()
  .catch((err: unknown) => {
    failures++;
    console.error(err);
  })
  .finally(() => {
    console.log(failures === 0 ? "\nAll checks passed 🎉" : `\n${failures} check(s) failed.`);
    process.exit(failures === 0 ? 0 : 1);
  });
