#!/usr/bin/env bash
# ============================================================
# Deploy all edge functions to your Supabase project
# ------------------------------------------------------------
# Prereqs (one-time):
#   1. npm i -g supabase
#   2. supabase login
#   3. supabase link --project-ref zoukfdfpbmcyapkbujnr
#   4. In Supabase dashboard → Edge Functions → Secrets, set:
#        RESEND_API_KEY
#        PAYSTACK_SECRET_KEY
#        GEMINI_API_KEY        (voice-agent — free tier OK)
#      SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
#      are auto-injected by the platform — do not add them yourself.
# ============================================================
set -euo pipefail

PROJECT_REF="zoukfdfpbmcyapkbujnr"

FUNCTIONS=(
  "activate-free-plan"
  "create-admin-user"
  "paystack-init"
  "send-email"
  "toggle-user-status"
  "voice-agent"
)

for fn in "${FUNCTIONS[@]}"; do
  echo "→ Deploying $fn"
  supabase functions deploy "$fn" --project-ref "$PROJECT_REF"
done

echo "✓ All functions deployed."
