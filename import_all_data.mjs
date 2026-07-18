#!/usr/bin/env node
/**
 * import_all_data.mjs
 * 
 * Migrates all CSV data from the prime_data_export folder into Supabase.
 * 
 * Prereqs:
 *   npm i @supabase/supabase-js csv-parse
 *   Set env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * 
 * Run:
 *   node import_all_data.mjs
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";

// --- 1. Configuration & Setup ---
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
const BATCH_SIZE = 500;

// Define the order of tables to respect foreign key constraints.
// Tables not in this list will be imported at the end in alphabetical order.
// If you get a "foreign key violation" error, move the failing table higher up in this list.
const IMPORT_ORDER = [
  "profiles",
  "user_roles",
  "businesses",
  "customers",
  "accounts",
  "bank_accounts",
  "products",
  "invoices",
  "bank_transactions",
  "activity_logs",
];

// Tables that should be UPSERTED (using 'id' as the conflict column)
const UPSERT_TABLES = ["profiles", "user_roles"];

// --- 2. Helper Functions ---

/**
 * Reads and parses a CSV file into an array of objects.
 */
function loadCsv(filePath) {
  const content = readFileSync(filePath, "utf8");
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  });
}

/**
 * Cleans a row of data to ensure compatibility with Supabase/PostgREST.
 * - Converts empty strings to null
 * - Converts 't'/'f' to true/false (standard Postgres CSV boolean export)
 * - Parses JSON strings into objects for jsonb columns
 */
function cleanRow(row) {
  const clean = {};
  for (const [key, value] of Object.entries(row)) {
    if (value === "") {
      clean[key] = null;
    } else if (value === "t") {
      clean[key] = true;
    } else if (value === "f") {
      clean[key] = false;
    } else if (
      typeof value === "string" &&
      ((value.startsWith("{") && value.endsWith("}")) ||
        (value.startsWith("[") && value.endsWith("]")))
    ) {
      try {
        clean[key] = JSON.parse(value);
      } catch {
        clean[key] = value; // Fallback to string if invalid JSON
      }
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * Inserts or upserts rows in batches to avoid payload size limits.
 */
async function batchProcess(tableName, rows, isUpsert) {
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE).map(cleanRow);
    
    let query;
    if (isUpsert) {
      query = supabase.from(tableName).upsert(batch, { onConflict: "id", ignoreDuplicates: false });
    } else {
      query = supabase.from(tableName).insert(batch);
    }

    const { error } = await query;

    if (error) {
      // If it's a duplicate key error on insert, we can safely skip it
      if (error.code === "23505") { 
         console.log(`\n  ↪ Skipping duplicates for ${tableName}...`);
         successCount += batch.length; 
      } else {
         console.error(`\n  ✗ Error in batch for ${tableName}:`, error.message);
         failCount += batch.length;
      }
    } else {
      successCount += batch.length;
    }
  }
  return { successCount, failCount };
}

// --- 3. Main Execution ---

async function main() {
  console.log("🚀 Starting data import...\n");

  // 1. Discover and parse all CSVs
  let files;
  try {
    files = readdirSync(DATA_DIR).filter(f => f.endsWith(".csv"));
  } catch (err) {
    console.error(`❌ Could not read directory ${DATA_DIR}. Make sure it exists.`);
    process.exit(1);
  }

  if (files.length === 0) {
    console.error(`❌ No CSV files found in ${DATA_DIR}.`);
    process.exit(1);
  }

  const tableMap = new Map();
  for (const file of files) {
    const tableName = file.replace(".csv", "");
    const filePath = join(DATA_DIR, file);
    try {
      const rows = loadCsv(filePath);
      tableMap.set(tableName, rows);
    } catch (err) {
      console.error(`❌ Failed to parse ${file}:`, err.message);
    }
  }

  // 2. Determine import order
  const orderedTables = [];
  const addedTables = new Set(); // Keep track of what we've added without deleting data
  
  // First, add tables from IMPORT_ORDER if they exist in the folder
  for (const t of IMPORT_ORDER) {
    if (tableMap.has(t)) {
      orderedTables.push(t);
      addedTables.add(t);
    }
  }
  
  // Then, add any remaining tables that weren't explicitly ordered
  for (const t of tableMap.keys()) {
    if (!addedTables.has(t)) {
      orderedTables.push(t);
    }
  }

  console.log(`Found ${orderedTables.length} tables to import.\n`);

  // 3. Process each table
  let totalCreated = 0;
  let totalFailed = 0;

  for (const tableName of orderedTables) {
    const rows = tableMap.get(tableName);
    const isUpsert = UPSERT_TABLES.includes(tableName);
    const action = isUpsert ? "upserting" : "inserting";
    
    process.stdout.write(`→ ${tableName.padEnd(30)} ${action} ${rows.length} rows... `);
    
    const { successCount, failCount } = await batchProcess(tableName, rows, isUpsert);
    
    if (failCount === 0) {
      console.log(`✓ ${successCount}`);
    } else {
      console.log(`✗ ${successCount} succeeded, ${failCount} failed`);
    }
    
    totalCreated += successCount;
    totalFailed += failCount;
  }

  console.log(`\n✅ Done! Total inserted/upserted: ${totalCreated}, Failed: ${totalFailed}`);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});