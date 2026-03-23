
-- =============================================
-- PHASE 2C: INVOICING SYSTEM
-- =============================================

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id uuid,
  invoice_number text,
  status text NOT NULL DEFAULT 'draft',
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  subtotal numeric NOT NULL DEFAULT 0,
  vat_rate numeric DEFAULT 7.50,
  vat_amount numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  amount_paid numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'NGN',
  notes text,
  terms text,
  is_recurring boolean DEFAULT false,
  recurring_interval text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text,
  reference text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- PHASE 2D: BANKING & BUDGETING
-- =============================================

CREATE TABLE public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  account_name text NOT NULL,
  bank_name text NOT NULL,
  account_number text,
  account_type text DEFAULT 'current',
  currency text NOT NULL DEFAULT 'NGN',
  current_balance numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id uuid NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'debit',
  amount numeric NOT NULL DEFAULT 0,
  description text,
  reference text,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  is_reconciled boolean NOT NULL DEFAULT false,
  category text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  spent_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.budget_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  category text NOT NULL,
  allocated_amount numeric NOT NULL DEFAULT 0,
  spent_amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- PHASE 2E: CUSTOMER MANAGEMENT (CRM)
-- =============================================

CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  address text,
  company_name text,
  customer_type text DEFAULT 'individual',
  credit_limit numeric DEFAULT 0,
  outstanding_balance numeric DEFAULT 0,
  segment text,
  loyalty_points integer DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.customer_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'note',
  subject text,
  description text,
  interaction_date timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.customer_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  criteria text,
  color text DEFAULT '#22c55e',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add foreign key from invoices to customers
ALTER TABLE public.invoices ADD CONSTRAINT invoices_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);

-- =============================================
-- UPDATED_AT TRIGGERS
-- =============================================

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_segments ENABLE ROW LEVEL SECURITY;

-- INVOICES
CREATE POLICY "Business members can view invoices" ON public.invoices FOR SELECT TO authenticated USING (user_belongs_to_business(auth.uid(), business_id));
CREATE POLICY "Business owners can manage invoices" ON public.invoices FOR ALL TO authenticated USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "Super admin views all invoices" ON public.invoices FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Business members can insert invoices" ON public.invoices FOR INSERT TO authenticated WITH CHECK (user_belongs_to_business(auth.uid(), business_id));

-- INVOICE ITEMS
CREATE POLICY "Business members can view invoice items" ON public.invoice_items FOR SELECT TO authenticated USING (invoice_id IN (SELECT id FROM invoices WHERE user_belongs_to_business(auth.uid(), business_id)));
CREATE POLICY "Business owners can manage invoice items" ON public.invoice_items FOR ALL TO authenticated USING (invoice_id IN (SELECT i.id FROM invoices i WHERE i.business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())));
CREATE POLICY "Super admin views all invoice items" ON public.invoice_items FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- INVOICE PAYMENTS
CREATE POLICY "Business members can view invoice payments" ON public.invoice_payments FOR SELECT TO authenticated USING (invoice_id IN (SELECT id FROM invoices WHERE user_belongs_to_business(auth.uid(), business_id)));
CREATE POLICY "Business owners can manage invoice payments" ON public.invoice_payments FOR ALL TO authenticated USING (invoice_id IN (SELECT i.id FROM invoices i WHERE i.business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())));
CREATE POLICY "Super admin views all invoice payments" ON public.invoice_payments FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- BANK ACCOUNTS
CREATE POLICY "Business members can view bank accounts" ON public.bank_accounts FOR SELECT TO authenticated USING (user_belongs_to_business(auth.uid(), business_id));
CREATE POLICY "Business owners can manage bank accounts" ON public.bank_accounts FOR ALL TO authenticated USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "Super admin views all bank accounts" ON public.bank_accounts FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- BANK TRANSACTIONS
CREATE POLICY "Business members can view bank transactions" ON public.bank_transactions FOR SELECT TO authenticated USING (user_belongs_to_business(auth.uid(), business_id));
CREATE POLICY "Business owners can manage bank transactions" ON public.bank_transactions FOR ALL TO authenticated USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "Business members can insert bank transactions" ON public.bank_transactions FOR INSERT TO authenticated WITH CHECK (user_belongs_to_business(auth.uid(), business_id));
CREATE POLICY "Super admin views all bank transactions" ON public.bank_transactions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- BUDGETS
CREATE POLICY "Business members can view budgets" ON public.budgets FOR SELECT TO authenticated USING (user_belongs_to_business(auth.uid(), business_id));
CREATE POLICY "Business owners can manage budgets" ON public.budgets FOR ALL TO authenticated USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "Super admin views all budgets" ON public.budgets FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- BUDGET ITEMS
CREATE POLICY "Business members can view budget items" ON public.budget_items FOR SELECT TO authenticated USING (budget_id IN (SELECT id FROM budgets WHERE user_belongs_to_business(auth.uid(), business_id)));
CREATE POLICY "Business owners can manage budget items" ON public.budget_items FOR ALL TO authenticated USING (budget_id IN (SELECT b.id FROM budgets b WHERE b.business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())));
CREATE POLICY "Super admin views all budget items" ON public.budget_items FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- CUSTOMERS
CREATE POLICY "Business members can view customers" ON public.customers FOR SELECT TO authenticated USING (user_belongs_to_business(auth.uid(), business_id));
CREATE POLICY "Business owners can manage customers" ON public.customers FOR ALL TO authenticated USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "Business members can insert customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (user_belongs_to_business(auth.uid(), business_id));
CREATE POLICY "Super admin views all customers" ON public.customers FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- CUSTOMER INTERACTIONS
CREATE POLICY "Business members can view interactions" ON public.customer_interactions FOR SELECT TO authenticated USING (user_belongs_to_business(auth.uid(), business_id));
CREATE POLICY "Business owners can manage interactions" ON public.customer_interactions FOR ALL TO authenticated USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "Business members can insert interactions" ON public.customer_interactions FOR INSERT TO authenticated WITH CHECK (user_belongs_to_business(auth.uid(), business_id));
CREATE POLICY "Super admin views all interactions" ON public.customer_interactions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- CUSTOMER SEGMENTS
CREATE POLICY "Business members can view segments" ON public.customer_segments FOR SELECT TO authenticated USING (user_belongs_to_business(auth.uid(), business_id));
CREATE POLICY "Business owners can manage segments" ON public.customer_segments FOR ALL TO authenticated USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "Super admin views all segments" ON public.customer_segments FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));
