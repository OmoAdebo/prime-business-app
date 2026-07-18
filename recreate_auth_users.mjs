#!/usr/bin/env node
/**
 * Recreate auth.users in the new Supabase project, preserving UUIDs so all FKs stay valid.
 *
 * Prereqs:
 *   npm i @supabase/supabase-js
 *   Set env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   (Service role key: Supabase dashboard → Project Settings → API → service_role — SECRET, never ship in the app.)
 *
 * Run:
 *   node recreate_auth_users.mjs
 *
 * What it does:
 *   - Reads auth_users.csv (exported from Cloud)
 *   - For each row, calls admin.createUser with the SAME id (uuid), email, full_name, company_name
 *   - email_confirm: true (skips confirmation email)
 *   - Sets a random temp password; each user must use "Forgot password" to set their own
 *   - Idempotent: skips users that already exist
 *
 * After running: trigger a password-reset email for each user (optional loop at bottom is commented out).
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars first.");
  process.exit(1);
}
const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

// Naive CSV parser (fields have no embedded commas/quotes in our export except company_name — handle quotes)
function parseCsv(text) {
  const rows = [];
  let i = 0, field = "", row = [], inQ = false;
  while (i < text.length) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i += 2; continue; }
      if (c === '"') { inQ = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { inQ = true; i++; continue; }
    if (c === ",") { row.push(field); field = ""; i++; continue; }
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
    if (c === "\r") { i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const csv = readFileSync(new URL("./auth_users.csv", import.meta.url), "utf8");
const [header, ...rows] = parseCsv(csv).filter(r => r.length > 1);
const idx = Object.fromEntries(header.map((h, i) => [h, i]));

let created = 0, skipped = 0, failed = 0;
for (const r of rows) {
  const id = r[idx.user_id];
  const email = r[idx.email];
  const full_name = r[idx.full_name];
  const company_name = r[idx.company_name];
  const role = r[idx.role];
  if (!id || !email) continue;

  const { data, error } = await admin.auth.admin.createUser({
    id,                                    // <-- preserves the UUID so FKs still resolve
    email,
    password: randomUUID() + "Aa1!",       // throwaway; user resets via email
    email_confirm: true,
    user_metadata: { full_name, company_name, requested_role: role },
  });

  if (error) {
    if (String(error.message).toLowerCase().includes("already")) { skipped++; continue; }
    console.error("FAIL", email, error.message);
    failed++;
    continue;
  }
  created++;
  console.log("OK  ", email, "→", data.user.id);
}

console.log(`\nDone. created=${created} skipped=${skipped} failed=${failed}`);

// OPTIONAL: send password reset emails to everyone (uncomment if you want)
// for (const r of rows) {
//   const email = r[idx.email];
//   if (!email) continue;
//   await admin.auth.resetPasswordForEmail(email, { redirectTo: "https://www.getprime.app/reset-password" });
// }
