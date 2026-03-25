
-- =============================================
-- Phase 4A: Online Store tables
-- =============================================

CREATE TABLE public.storefronts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  store_name text NOT NULL,
  subdomain text UNIQUE,
  description text,
  logo_url text,
  banner_url text,
  primary_color text DEFAULT '#22c55e',
  is_published boolean NOT NULL DEFAULT false,
  currency text NOT NULL DEFAULT 'NGN',
  contact_email text,
  contact_phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.store_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storefront_id uuid NOT NULL REFERENCES public.storefronts(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  is_featured boolean NOT NULL DEFAULT false,
  display_order integer DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(storefront_id, product_id)
);

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storefront_id uuid NOT NULL REFERENCES public.storefronts(id),
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  customer_id uuid REFERENCES public.customers(id),
  order_number text,
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text,
  shipping_address text,
  subtotal numeric NOT NULL DEFAULT 0,
  vat_amount numeric DEFAULT 0,
  shipping_fee numeric DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  amount_paid numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  payment_status text NOT NULL DEFAULT 'unpaid',
  payment_method text,
  payment_reference text,
  notes text,
  currency text NOT NULL DEFAULT 'NGN',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  product_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.shipping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  carrier text,
  tracking_number text,
  shipping_method text DEFAULT 'standard',
  estimated_delivery date,
  actual_delivery date,
  status text NOT NULL DEFAULT 'pending',
  cost numeric DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- Phase 4B: Capital Access / Loans tables
-- =============================================

CREATE TABLE public.loan_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  requested_amount numeric NOT NULL DEFAULT 0,
  purpose text,
  term_months integer NOT NULL DEFAULT 12,
  monthly_revenue numeric DEFAULT 0,
  total_assets numeric DEFAULT 0,
  existing_debt numeric DEFAULT 0,
  risk_score numeric,
  risk_assessment text,
  ai_recommendation text,
  status text NOT NULL DEFAULT 'draft',
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid,
  rejection_reason text,
  currency text NOT NULL DEFAULT 'NGN',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  application_id uuid REFERENCES public.loan_applications(id),
  principal_amount numeric NOT NULL DEFAULT 0,
  interest_rate numeric NOT NULL DEFAULT 0,
  term_months integer NOT NULL DEFAULT 12,
  monthly_payment numeric NOT NULL DEFAULT 0,
  total_repayable numeric NOT NULL DEFAULT 0,
  amount_repaid numeric NOT NULL DEFAULT 0,
  outstanding_balance numeric NOT NULL DEFAULT 0,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  status text NOT NULL DEFAULT 'active',
  currency text NOT NULL DEFAULT 'NGN',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.loan_repayments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  payment_method text,
  reference text,
  status text NOT NULL DEFAULT 'completed',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- RLS for all new tables
-- =============================================

ALTER TABLE public.storefronts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_repayments ENABLE ROW LEVEL SECURITY;

-- Storefronts
CREATE POLICY "Business owners can manage storefronts" ON public.storefronts FOR ALL TO authenticated USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "Business members can view storefronts" ON public.storefronts FOR SELECT TO authenticated USING (user_belongs_to_business(auth.uid(), business_id));
CREATE POLICY "Public can view published storefronts" ON public.storefronts FOR SELECT TO anon USING (is_published = true);
CREATE POLICY "Super admin views all storefronts" ON public.storefronts FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- Store products
CREATE POLICY "Business owners can manage store products" ON public.store_products FOR ALL TO authenticated USING (storefront_id IN (SELECT s.id FROM storefronts s WHERE s.business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())));
CREATE POLICY "Business members can view store products" ON public.store_products FOR SELECT TO authenticated USING (storefront_id IN (SELECT s.id FROM storefronts s WHERE user_belongs_to_business(auth.uid(), s.business_id)));
CREATE POLICY "Public can view visible store products" ON public.store_products FOR SELECT TO anon USING (is_visible = true AND storefront_id IN (SELECT id FROM storefronts WHERE is_published = true));

-- Orders
CREATE POLICY "Business owners can manage orders" ON public.orders FOR ALL TO authenticated USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "Business members can view orders" ON public.orders FOR SELECT TO authenticated USING (user_belongs_to_business(auth.uid(), business_id));
CREATE POLICY "Anyone can insert orders" ON public.orders FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Super admin views all orders" ON public.orders FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- Order items
CREATE POLICY "Business owners can manage order items" ON public.order_items FOR ALL TO authenticated USING (order_id IN (SELECT o.id FROM orders o WHERE o.business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())));
CREATE POLICY "Business members can view order items" ON public.order_items FOR SELECT TO authenticated USING (order_id IN (SELECT o.id FROM orders o WHERE user_belongs_to_business(auth.uid(), o.business_id)));
CREATE POLICY "Anyone can insert order items" ON public.order_items FOR INSERT TO anon WITH CHECK (true);

-- Shipping
CREATE POLICY "Business owners can manage shipping" ON public.shipping FOR ALL TO authenticated USING (order_id IN (SELECT o.id FROM orders o WHERE o.business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())));
CREATE POLICY "Business members can view shipping" ON public.shipping FOR SELECT TO authenticated USING (order_id IN (SELECT o.id FROM orders o WHERE user_belongs_to_business(auth.uid(), o.business_id)));

-- Loan applications
CREATE POLICY "Business owners can manage own applications" ON public.loan_applications FOR ALL TO authenticated USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "Super admin views all applications" ON public.loan_applications FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- Loans
CREATE POLICY "Business owners can view own loans" ON public.loans FOR SELECT TO authenticated USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "Super admin manages all loans" ON public.loans FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- Loan repayments
CREATE POLICY "Business owners can manage own repayments" ON public.loan_repayments FOR ALL TO authenticated USING (loan_id IN (SELECT l.id FROM loans l WHERE l.business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())));
CREATE POLICY "Super admin views all repayments" ON public.loan_repayments FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- Updated_at triggers
CREATE TRIGGER set_updated_at_storefronts BEFORE UPDATE ON public.storefronts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_orders BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_shipping BEFORE UPDATE ON public.shipping FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_loan_applications BEFORE UPDATE ON public.loan_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_loans BEFORE UPDATE ON public.loans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
