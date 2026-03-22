
-- ============================================
-- PHASE 2A: BOOKKEEPING MODULE
-- ============================================

-- Chart of Accounts
CREATE TABLE public.accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  type TEXT NOT NULL DEFAULT 'expense',
  parent_id UUID REFERENCES public.accounts(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transactions (income/expense records)
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id),
  type TEXT NOT NULL DEFAULT 'expense',
  category TEXT,
  description TEXT,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NGN',
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_number TEXT,
  payment_method TEXT,
  is_reconciled BOOLEAN NOT NULL DEFAULT false,
  vat_amount NUMERIC(15,2) DEFAULT 0,
  vat_rate NUMERIC(5,2) DEFAULT 7.50,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Journal Entries
CREATE TABLE public.journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference TEXT,
  description TEXT,
  total_debit NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_credit NUMERIC(15,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.journal_entry_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id),
  debit NUMERIC(15,2) NOT NULL DEFAULT 0,
  credit NUMERIC(15,2) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- PHASE 2B: SMART INVENTORY MODULE
-- ============================================

-- Products
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  barcode TEXT,
  description TEXT,
  category TEXT,
  unit_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  cost_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NGN',
  unit_of_measure TEXT DEFAULT 'pcs',
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  low_stock_threshold INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inventory Locations
CREATE TABLE public.inventory_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  type TEXT DEFAULT 'warehouse',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stock Levels (per product per location)
CREATE TABLE public.stock_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.inventory_locations(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, location_id)
);

-- Stock Movements (transfers, adjustments, receipts)
CREATE TABLE public.stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  from_location_id UUID REFERENCES public.inventory_locations(id),
  to_location_id UUID REFERENCES public.inventory_locations(id),
  quantity INTEGER NOT NULL,
  movement_type TEXT NOT NULL DEFAULT 'adjustment',
  reference TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Suppliers
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  contact_person TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Purchase Orders
CREATE TABLE public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id),
  order_number TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery DATE,
  total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NGN',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.purchase_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  received_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Helper: check if user belongs to a business
CREATE OR REPLACE FUNCTION public.user_belongs_to_business(_user_id UUID, _business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses WHERE id = _business_id AND owner_id = _user_id
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.invited_by IN (
      SELECT owner_id FROM public.businesses WHERE id = _business_id
    )
  )
$$;

-- Bookkeeping RLS (accounts, transactions, journal_entries, journal_entry_lines)
CREATE POLICY "Business members can view accounts" ON public.accounts FOR SELECT TO authenticated
  USING (user_belongs_to_business(auth.uid(), business_id));
CREATE POLICY "Business owners can manage accounts" ON public.accounts FOR ALL TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business members can view transactions" ON public.transactions FOR SELECT TO authenticated
  USING (user_belongs_to_business(auth.uid(), business_id));
CREATE POLICY "Business members can insert transactions" ON public.transactions FOR INSERT TO authenticated
  WITH CHECK (user_belongs_to_business(auth.uid(), business_id));
CREATE POLICY "Business owners can manage transactions" ON public.transactions FOR ALL TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business members can view journal entries" ON public.journal_entries FOR SELECT TO authenticated
  USING (user_belongs_to_business(auth.uid(), business_id));
CREATE POLICY "Business owners can manage journal entries" ON public.journal_entries FOR ALL TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business members can view journal lines" ON public.journal_entry_lines FOR SELECT TO authenticated
  USING (journal_entry_id IN (SELECT id FROM journal_entries WHERE user_belongs_to_business(auth.uid(), business_id)));
CREATE POLICY "Business owners can manage journal lines" ON public.journal_entry_lines FOR ALL TO authenticated
  USING (journal_entry_id IN (SELECT id FROM journal_entries je WHERE je.business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())));

-- Inventory RLS
CREATE POLICY "Business members can view products" ON public.products FOR SELECT TO authenticated
  USING (user_belongs_to_business(auth.uid(), business_id));
CREATE POLICY "Business owners can manage products" ON public.products FOR ALL TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business members can view locations" ON public.inventory_locations FOR SELECT TO authenticated
  USING (user_belongs_to_business(auth.uid(), business_id));
CREATE POLICY "Business owners can manage locations" ON public.inventory_locations FOR ALL TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business members can view stock levels" ON public.stock_levels FOR SELECT TO authenticated
  USING (product_id IN (SELECT id FROM products WHERE user_belongs_to_business(auth.uid(), business_id)));
CREATE POLICY "Business owners can manage stock levels" ON public.stock_levels FOR ALL TO authenticated
  USING (product_id IN (SELECT id FROM products p WHERE p.business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())));

CREATE POLICY "Business members can view stock movements" ON public.stock_movements FOR SELECT TO authenticated
  USING (user_belongs_to_business(auth.uid(), business_id));
CREATE POLICY "Business members can insert stock movements" ON public.stock_movements FOR INSERT TO authenticated
  WITH CHECK (user_belongs_to_business(auth.uid(), business_id));
CREATE POLICY "Business owners can manage stock movements" ON public.stock_movements FOR ALL TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business members can view suppliers" ON public.suppliers FOR SELECT TO authenticated
  USING (user_belongs_to_business(auth.uid(), business_id));
CREATE POLICY "Business owners can manage suppliers" ON public.suppliers FOR ALL TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business members can view purchase orders" ON public.purchase_orders FOR SELECT TO authenticated
  USING (user_belongs_to_business(auth.uid(), business_id));
CREATE POLICY "Business members can insert purchase orders" ON public.purchase_orders FOR INSERT TO authenticated
  WITH CHECK (user_belongs_to_business(auth.uid(), business_id));
CREATE POLICY "Business owners can manage purchase orders" ON public.purchase_orders FOR ALL TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business members can view PO items" ON public.purchase_order_items FOR SELECT TO authenticated
  USING (purchase_order_id IN (SELECT id FROM purchase_orders WHERE user_belongs_to_business(auth.uid(), business_id)));
CREATE POLICY "Business owners can manage PO items" ON public.purchase_order_items FOR ALL TO authenticated
  USING (purchase_order_id IN (SELECT id FROM purchase_orders po WHERE po.business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())));

-- Super admin can view everything
CREATE POLICY "Super admin views all accounts" ON public.accounts FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin views all transactions" ON public.transactions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin views all journal entries" ON public.journal_entries FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin views all journal lines" ON public.journal_entry_lines FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin views all products" ON public.products FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin views all locations" ON public.inventory_locations FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin views all stock levels" ON public.stock_levels FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin views all stock movements" ON public.stock_movements FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin views all suppliers" ON public.suppliers FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin views all purchase orders" ON public.purchase_orders FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin views all PO items" ON public.purchase_order_items FOR SELECT TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- Updated_at triggers
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_journal_entries_updated_at BEFORE UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_locations_updated_at BEFORE UPDATE ON public.inventory_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stock_levels_updated_at BEFORE UPDATE ON public.stock_levels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
