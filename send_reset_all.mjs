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