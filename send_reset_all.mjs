<<<<<<< HEAD
#!/usr/bin/env node
/**
 * send_reset_emails.mjs
 * 
 * Generates password reset links for Supabase users and sends them via Resend.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const TARGET_EMAIL = process.env.TARGET_EMAIL;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

if (!RESEND_API_KEY) {
  console.error("❌ Missing RESEND_API_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const EMAIL_TEMPLATE = (actionLink) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset your Prime password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 40px 20px; text-align: center;">
              <div style="width: 60px; height: 60px; background-color: #ffffff; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: #059669; font-size: 32px; font-weight: bold;">P</div>
              <h1 style="color: #ffffff; margin: 20px 0 0; font-size: 24px;">Reset Your Password</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px; color: #3f3f46; font-size: 16px; line-height: 1.6;">
              <p>Hi there,</p>
              <p>We received a request to reset the password for your Prime account.</p>
              <p>Click the button below to choose a new password. This link will expire in 24 hours.</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${actionLink}" style="background-color: #059669; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
                  </td>
                </tr>
              </table>
              <p>If you didn't request this, you can safely ignore this email and your password will remain unchanged.</p>
              <p>Thanks,<br>The Prime Team</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; color: #71717a; font-size: 12px;">
              <p>&copy; 2026 Prime Business App. All rights reserved.</p>
              <p><a href="https://getprime.app" style="color: #059669; text-decoration: none;">getprime.app</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

async function sendEmail(to, subject, html) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "Prime <onboarding@resend.dev>", 
      to: [to],
      subject: subject,
      html: html,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Resend API error: ${response.status} - ${err}`);
  }
  return response.json();
}

async function main() {
  console.log("🚀 Starting password reset process...\n");
  
  if (TARGET_EMAIL) {
    console.log(`🎯 TARGET EMAIL MODE: Processing ONLY ${TARGET_EMAIL}\n`);
  } else {
    console.log("⚠️  BROADCAST MODE: Processing ALL users.\n");
  }

  let users = [];
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;
  
  if (TARGET_EMAIL) {
    users = data.users.filter(u => u.email.toLowerCase() === TARGET_EMAIL.toLowerCase());
    if (users.length === 0) {
      console.error(`❌ User ${TARGET_EMAIL} not found in Supabase.`);
      process.exit(1);
    }
  } else {
    users = data.users;
  }

  console.log(`Found ${users.length} user(s) to process.\n`);

  let successCount = 0;
  let failCount = 0;

  for (const user of users) {
    process.stdout.write(`→ ${user.email.padEnd(35)} `);
    
    try {
      // ✅ FIX: Added options.redirectTo to force the link to go to the reset page
      const { data, error } = await supabase.auth.admin.generateLink({
        type: "recovery",
        email: user.email,
        options: {
          redirectTo: "https://getprime.app/reset-password"
        }
      });

      if (error) throw error;

      const actionLink = data.properties.action_link;
      const html = EMAIL_TEMPLATE(actionLink);
      
      await sendEmail(user.email, "Reset your Prime password", html);
      
      console.log("✓ Sent");
      successCount++;
      
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (err) {
      console.log(`✗ Failed: ${err.message}`);
      failCount++;
    }
  }

  console.log(`\n✅ Done! Success: ${successCount}, Failed: ${failCount}`);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
=======
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
>>>>>>> 907f2cdc31ef60212ff476b49524d862563f31c6
