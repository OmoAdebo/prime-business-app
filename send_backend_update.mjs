// send_backend_update.mjs
// One-off: notify every existing user about the platform move and give them a
// password-reset link so they can sign in again on the new database.
//
// Usage:
//   SUPABASE_URL="https://zoukfdfpbmcyapkbujnr.supabase.co" \
//   SUPABASE_SERVICE_ROLE_KEY="sb_secret_..." \
//   RESEND_API_KEY="re_..." \
//   node send_backend_update.mjs
//
// Options:
//   DRY_RUN=1                 list users + links, send nothing
//   ONLY_EMAIL=you@mail.com   send to a single address first (recommended test)
//   REDIRECT_TO=...           default https://www.getprime.app/reset-password
//   FROM_EMAIL="Prime <noreply@getprime.app>"

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_KEY = process.env.RESEND_API_KEY;
const REDIRECT_TO = process.env.REDIRECT_TO || 'https://www.getprime.app/reset-password';
const FROM_EMAIL = process.env.FROM_EMAIL || 'Prime <noreply@getprime.app>';
const SUBJECT = process.env.SUBJECT || 'Important: set your new Prime password';
const DRY_RUN = !!process.env.DRY_RUN;
const ONLY_EMAIL = process.env.ONLY_EMAIL?.toLowerCase();

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!RESEND_KEY && !DRY_RUN) {
  console.error('Missing RESEND_API_KEY (or set DRY_RUN=1)');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const TEMPLATE = fs.readFileSync(new URL('./email_templates/backend-update.html', import.meta.url), 'utf8');

const render = (link, email) =>
  TEMPLATE.replaceAll('{{ .ConfirmationURL }}', link)
    .replaceAll('{{ .Email }}', email)
    .replaceAll('{{ .SiteURL }}', 'https://www.getprime.app');

async function listAllUsers() {
  const all = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    all.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return all;
}

async function recoveryLink(email) {
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: REDIRECT_TO },
  });
  if (error) throw error;
  return data.properties.action_link;
}

async function sendViaResend(to, html) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_KEY}` },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject: SUBJECT, html }),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Resend ${r.status}: ${JSON.stringify(body)}`);
  return body.id;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const users = (await listAllUsers()).filter((u) => u.email);
  const target = ONLY_EMAIL ? users.filter((u) => u.email.toLowerCase() === ONLY_EMAIL) : users;
  console.log(`Found ${users.length} users — sending to ${target.length}${DRY_RUN ? ' (DRY RUN)' : ''}`);

  let ok = 0,
    fail = 0;
  const failures = [];
  for (const u of target) {
    try {
      if (USE_SUPABASE_MAILER) {
        // Supabase sends its own "Reset password" email using the template
        // configured in Authentication → Email Templates. No Resend needed.
        const { error } = await admin.auth.resetPasswordForEmail(u.email, { redirectTo: REDIRECT_TO });
        if (error) throw error;
        console.log(`SENT ${u.email} (via Supabase mailer)`);
      } else {
        const link = await recoveryLink(u.email);
        if (DRY_RUN) console.log(`DRY  ${u.email} -> ${link.slice(0, 90)}...`);
        else console.log(`SENT ${u.email} (${await sendViaResend(u.email, render(link, u.email))})`);
      }
      ok++;
      await sleep(600); // stay well under Supabase's hourly auth-email/link limits
    } catch (e) {
      fail++;
      failures.push(`${u.email}: ${e.message || e}`);
      console.error(`FAIL ${u.email}: ${e.message || e}`);
    }
  }
  console.log(`\nDone. Sent: ${ok}, Failed: ${fail}`);
  if (failures.length) fs.writeFileSync('email_failures.txt', failures.join('\n'));
})();
