-- ============================================================
-- Paystack subaccounts for business owners
-- Run on YOUR Supabase project (zoukfdfpbmcyapkbujnr)
--   Dashboard → SQL Editor → paste → Run
--   or: psql "$DB_URL" -1 -f db/paystack_subaccounts.sql
-- Idempotent: safe to re-run.
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.payment_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'paystack',
  subaccount_code text,
  subaccount_id text,
  business_display_name text,
  settlement_bank_code text,
  settlement_bank_name text,
  settlement_account_number text,
  settlement_account_name text,
  percentage_charge numeric NOT NULL DEFAULT 1.0,
  settlement_schedule text NOT NULL DEFAULT 'auto',
  status text NOT NULL DEFAULT 'pending', -- pending | active | disabled
  is_live boolean NOT NULL DEFAULT false,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_accounts_business_provider_idx
  ON public.payment_accounts (business_id, provider);

GRANT SELECT ON public.payment_accounts TO authenticated;
GRANT ALL ON public.payment_accounts TO service_role;

ALTER TABLE public.payment_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business members read payment accounts" ON public.payment_accounts;
CREATE POLICY "Business members read payment accounts"
  ON public.payment_accounts FOR SELECT TO authenticated
  USING (public.user_belongs_to_business(auth.uid(), business_id));

DROP POLICY IF EXISTS "Admins read all payment accounts" ON public.payment_accounts;
CREATE POLICY "Admins read all payment accounts"
  ON public.payment_accounts FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'support_admin')
  );

DROP TRIGGER IF EXISTS set_updated_at_payment_accounts ON public.payment_accounts;
CREATE TRIGGER set_updated_at_payment_accounts
  BEFORE UPDATE ON public.payment_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------
-- Payments received through Paystack (split to the subaccount)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'paystack',
  reference text NOT NULL,
  amount numeric NOT NULL,
  fees numeric NOT NULL DEFAULT 0,
  subaccount_share numeric,
  currency text NOT NULL DEFAULT 'NGN',
  status text NOT NULL DEFAULT 'pending', -- pending | success | failed | abandoned
  channel text,
  customer_email text,
  customer_name text,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  authorization_url text,
  paid_at timestamptz,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_transactions_reference_idx
  ON public.payment_transactions (reference);
CREATE INDEX IF NOT EXISTS payment_transactions_business_idx
  ON public.payment_transactions (business_id, created_at DESC);

GRANT SELECT ON public.payment_transactions TO authenticated;
GRANT ALL ON public.payment_transactions TO service_role;

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business members read payments" ON public.payment_transactions;
CREATE POLICY "Business members read payments"
  ON public.payment_transactions FOR SELECT TO authenticated
  USING (public.user_belongs_to_business(auth.uid(), business_id));

DROP POLICY IF EXISTS "Admins read all payments" ON public.payment_transactions;
CREATE POLICY "Admins read all payments"
  ON public.payment_transactions FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'support_admin')
  );

DROP TRIGGER IF EXISTS set_updated_at_payment_transactions ON public.payment_transactions;
CREATE TRIGGER set_updated_at_payment_transactions
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------
-- Tag bank transactions with their source so Paystack settlements
-- can be filtered / reconciled in the existing Banking module.
-- ------------------------------------------------------------
ALTER TABLE public.bank_transactions
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';
ALTER TABLE public.bank_transactions
  ADD COLUMN IF NOT EXISTS provider_reference text;

CREATE UNIQUE INDEX IF NOT EXISTS bank_transactions_provider_reference_idx
  ON public.bank_transactions (provider_reference)
  WHERE provider_reference IS NOT NULL;

ALTER TABLE public.bank_accounts
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

COMMIT;
