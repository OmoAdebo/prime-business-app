// send_reset_all.mjs
// Bulk password-reset / activation email for all migrated users on the NEW Supabase project.
//
// Usage:
//   SUPABASE_URL="https://<ref>.supabase.co" \
//   SUPABASE_SERVICE_ROLE_KEY="sb_secret_..." \
//   RESEND_API_KEY="re_..." \
//   node send_reset_all.mjs
//
// Optional:
//   REDIRECT_TO="https://getprime.app/reset-password"   (default below)
//   FROM_EMAIL="Prime <noreply@getprime.app>"
//   DRY_RUN=1        -> list users only, don't send
//   ONLY_EMAIL=foo@bar.com  -> send to only this address (for testing)

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_KEY   = process.env.RESEND_API_KEY;
const REDIRECT_TO  = process.env.REDIRECT_TO || 'https://getprime.app/reset-password';
const FROM_EMAIL   = process.env.FROM_EMAIL  || 'Prime <noreply@getprime.app>';
const DRY_RUN      = !!process.env.DRY_RUN;
const ONLY_EMAIL   = process.env.ONLY_EMAIL?.toLowerCase();

if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
if (!RESEND_KEY && !DRY_RUN)       { console.error('Missing RESEND_API_KEY (or set DRY_RUN=1)');       process.exit(1); }

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const TEMPLATE = fs.readFileSync(new URL('./email_templates/reset-password.html', import.meta.url), 'utf8');

function render(link, email) {
  return TEMPLATE
    .replaceAll('{{ .ConfirmationURL }}', link)
    .replaceAll('{{ .Email }}', email)
    .replaceAll('{{ .SiteURL }}', 'https://getprime.app');
}

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

async function generateRecoveryLink(email) {
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
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject: 'Set your new Prime password',
      html,
    }),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Resend ${r.status}: ${JSON.stringify(body)}`);
  return body.id;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const users = (await listAllUsers()).filter(u => u.email);
  const target = ONLY_EMAIL ? users.filter(u => u.email.toLowerCase() === ONLY_EMAIL) : users;

  console.log(`Found ${users.length} users, sending to ${target.length}${DRY_RUN ? ' (DRY RUN)' : ''}`);

  let ok = 0, fail = 0;
  for (const u of target) {
    try {
      const link = await generateRecoveryLink(u.email);
      if (DRY_RUN) {
        console.log(`DRY  ${u.email}  ->  ${link.slice(0, 80)}...`);
      } else {
        const id = await sendViaResend(u.email, render(link, u.email));
        console.log(`SENT ${u.email}  (resend id: ${id})`);
      }
      ok++;
      await sleep(120); // gentle throttle: ~8/sec, well under Resend/Supabase limits
    } catch (e) {
      fail++;
      console.error(`FAIL ${u.email}: ${e.message || e}`);
    }
  }
  console.log(`\nDone. Sent: ${ok}, Failed: ${fail}`);
})();
