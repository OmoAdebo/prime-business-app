#!/usr/bin/env node
/**
 * fix_uuids.mjs
 * Fixes the UUID mismatch caused by Supabase Auth generating new UUIDs.
 * It maps old UUIDs to new UUIDs based on the user's email, and updates all CSV files.
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("❌ Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars first.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const DATA_DIR = "./prime_data_export";
const AUTH_CSV = "./auth_users.csv";

async function main() {
  console.log("🔍 Fetching current users from Supabase...\n");

  // 1. Fetch all users from Supabase to get their NEW UUIDs
  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersError) {
    console.error("❌ Failed to fetch users:", usersError.message);
    process.exit(1);
  }

  const newUsers = usersData.users;
  const emailToNewId = new Map();
  for (const user of newUsers) {
    if (user.email) {
      emailToNewId.set(user.email.toLowerCase(), user.id);
    }
  }

  console.log(`Found ${newUsers.length} users in Supabase.\n`);

  // 2. Read the old auth_users.csv to get the OLD UUIDs
  console.log(`📖 Reading ${AUTH_CSV}...\n`);
  const authCsvContent = readFileSync(AUTH_CSV, "utf8");
  const authRows = parse(authCsvContent, { columns: true, skip_empty_lines: true });

  const oldIdToNewId = new Map();
  let mappedCount = 0;

  for (const row of authRows) {
    const oldId = row.user_id;
    const email = row.email?.toLowerCase();

    if (oldId && email && emailToNewId.has(email)) {
      const newId = emailToNewId.get(email);
      if (oldId !== newId) {
        oldIdToNewId.set(oldId, newId);
        mappedCount++;
      }
    }
  }

  console.log(`Mapped ${mappedCount} old UUIDs to new UUIDs.\n`);

  if (mappedCount === 0) {
    console.log("✅ UUIDs already match! No changes needed.");
    return;
  }

  // 3. Update all CSV files in the data directory
  console.log(`📂 Updating CSV files in ${DATA_DIR}...\n`);
  const files = readdirSync(DATA_DIR).filter(f => f.endsWith(".csv"));

  for (const file of files) {
    const filePath = join(DATA_DIR, file);
    let content = readFileSync(filePath, "utf8");
    let changed = false;

    for (const [oldId, newId] of oldIdToNewId.entries()) {
      if (content.includes(oldId)) {
        // Use a global regex to replace all occurrences of the old UUID
        const regex = new RegExp(oldId, "g");
        content = content.replace(regex, newId);
        changed = true;
      }
    }

    if (changed) {
      writeFileSync(filePath, content, "utf8");
      console.log(`  ✓ Updated ${file}`);
    }
  }

  console.log("\n✅ Done! All CSV files have been updated with the new UUIDs.");
  console.log("You can now run: node import_all_data.mjs");
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});