# Paystack Subaccounts for Business Owners

Give every onboarded business a real Paystack subaccount so customers can pay them directly, with settlement to their own bank account, while Prime records and reconciles everything.

## Current state (verified)

- `/banking` has Overview, Accounts, Transactions, Transfers, Analytics, Scheduled, Beneficiaries, Admin, Alerts, Settings.
- `bank_accounts` and `bank_transactions` are manual-entry only — no payment provider link.
- The only Paystack code is `paystack-init` (subscription checkout for Prime's own plans, with a dummy fallback). No webhook, no verify, no subaccount, no transfers.
- Banking Settings is cosmetic local state (nothing persisted).
- Online Store shows a Paystack card but no live checkout wiring.

## What we build

### 1. Bank account verification + subaccount creation
New page `/banking/payments` (Paystack Payments):
- Fetch Nigerian bank list from Paystack, pick bank + enter 10-digit NUBAN.
- Resolve account name via Paystack account-resolution (name shown before saving — no blind entry).
- Create the Paystack subaccount with business name, settlement bank, account number and the platform percentage charge.
- Store `subaccount_code`, verified account name/bank, settlement schedule and status on the business.
- Show status card: Not connected / Pending / Active, with edit + re-verify.

### 2. Receiving money
- **Payment links / invoice payments:** an edge function creates a Paystack transaction with `subaccount` set, so funds split to the business and settle to their own bank. Pay button added to invoices and to Online Store checkout.
- **Dedicated virtual account (optional, phase 2):** for customers who prefer bank transfer, create a Paystack Dedicated Virtual Account per business/customer. Requires the business to be a registered entity on Paystack; we surface eligibility instead of failing silently.

### 3. Reconciliation into existing banking module
- A `paystack-webhook` edge function (signature-verified, public, no JWT) handles `charge.success`, `transfer.*`, `subaccount.*` and settlement events.
- Each successful charge writes a `bank_transactions` credit row against the business's Paystack account, marks the matching invoice/order paid, and fires a notification.
- Transactions page gains a "Paystack" source filter and settlement view; statement download (already using ExportMenu) then reflects real money movement.

### 4. Settings + admin
- Banking Settings gains a persisted Payments section (subaccount status, settlement bank, percentage charge, webhook health).
- Admin gets a read-only list of all business subaccounts and their verification status.

## What Oreone Inc must provide on Paystack

To move the platform out of Test Mode and use subaccounts/splits live:
- CAC certificate of incorporation and RC number, plus status report / MEMART.
- Directors' BVN and a valid government ID.
- Oreone Inc's own settlement bank account (for the platform's percentage share).
- Business address, website (getprime.app) and a description of the split-payment model.
- 2FA enabled on the Paystack account (currently flagged in your dashboard).

Each business owner only needs: their business/personal bank account number + bank. Paystack's name-resolution verifies it; no BVN needed for a plain subaccount. Dedicated virtual accounts, if enabled later, do require the business's own KYC.

## Environment variables you enter

Server-side secrets (Supabase Edge Function secrets, added via the secrets form):
- `PAYSTACK_SECRET_KEY` — test value `sk_test_...` (already exists; you'll replace it)
- `PAYSTACK_WEBHOOK_SECRET` — not needed; Paystack signs with the secret key, so the same key is used to verify

Client-side (`.env`, safe to expose):
- `VITE_PAYSTACK_PUBLIC_KEY` — `pk_test_...`

After deploy, set the webhook URL in the Paystack dashboard to the deployed `paystack-webhook` function URL on your Supabase project.

## Technical notes

- New columns on `businesses` (or a `payment_accounts` table): `paystack_subaccount_code`, `settlement_bank_code`, `settlement_account_number`, `settlement_account_name`, `percentage_charge`, `subaccount_status`. RLS: owner + business members read, owner write via edge function only; admins read all.
- New edge functions: `paystack-banks`, `paystack-resolve-account`, `paystack-subaccount` (create/update), `paystack-charge` (init with `subaccount`), `paystack-webhook` (`verify_jwt = false`, HMAC-SHA512 signature check).
- All Paystack calls happen server-side; the secret key never reaches the browser.
- Amounts handled in kobo server-side, Naira in the UI.
- Since this project's backend is your own Supabase, migrations and function deploys go through the Supabase CLI (`scripts/deploy-functions.sh`), not Lovable Cloud.
