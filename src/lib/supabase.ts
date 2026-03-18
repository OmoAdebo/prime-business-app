import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zoukfdfpbmcyapkbujnr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvdWtmZGZwYm1jeWFwa2J1am5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NjQyMjMsImV4cCI6MjA4OTA0MDIyM30.TULtiyRNKxQQckM347mTwmt2oNDsiUpd70ydRDHmNeo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type AppRole = 'super_admin' | 'business_owner' | 'store_manager' | 'accountant' | 'employee';
