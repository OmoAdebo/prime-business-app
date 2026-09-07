-- Prime: admin-controlled plan feature registry
-- Run against the Prime Supabase project.

CREATE TABLE IF NOT EXISTS public.plan_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  feature_group text NOT NULL DEFAULT 'General',
  enabled boolean NOT NULL DEFAULT true,
  starter boolean NOT NULL DEFAULT true,
  growth boolean NOT NULL DEFAULT true,
  business boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.plan_features TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_features TO authenticated;
GRANT ALL ON public.plan_features TO service_role;

ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plan_features_read" ON public.plan_features;
CREATE POLICY "plan_features_read" ON public.plan_features
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "plan_features_admin_write" ON public.plan_features;
CREATE POLICY "plan_features_admin_write" ON public.plan_features
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'support_admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'support_admin')
  );

DROP TRIGGER IF EXISTS plan_features_updated_at ON public.plan_features;
CREATE TRIGGER plan_features_updated_at
  BEFORE UPDATE ON public.plan_features
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed registry -------------------------------------------------------------
INSERT INTO public.plan_features (feature_key, label, description, feature_group, starter, growth, business, display_order)
VALUES
  ('module.banking',          'Banking',              'Bank accounts, transfers and reconciliation', 'Modules', true,  true,  true,  10),
  ('module.bookkeeping',      'Bookkeeping',          'Ledger, journals and financial statements',   'Modules', true,  true,  true,  20),
  ('module.invoicing',        'Invoicing',            'Create and send invoices',                    'Modules', true,  true,  true,  30),
  ('module.pos',              'POS',                  'Point of sale terminal',                      'Modules', true,  true,  true,  40),
  ('module.inventory',        'Inventory',            'Products, stock and suppliers',               'Modules', true,  true,  true,  50),
  ('module.customers',        'Customers',            'Customer records and segments',               'Modules', true,  true,  true,  60),
  ('module.payroll',          'Payroll & HR',         'Employees, payroll runs and leave',           'Modules', false, true,  true,  70),
  ('module.debt-credit',      'Debt & Credit',        'Receivables and payables ageing',             'Modules', false, true,  true,  80),
  ('module.store',            'Online Store',         'Public storefront and orders',                'Modules', false, true,  true,  90),
  ('module.store-management', 'Store Management',     'Multiple locations and store staffing',       'Modules', false, false, true,  100),
  ('module.budgeting',        'Budgeting',            'Budgets and spend tracking',                  'Modules', false, true,  true,  110),
  ('module.capital',          'Capital Access',       'Loan applications and repayments',            'Modules', false, true,  true,  120),
  ('module.reports',          'Reports',              'Business and financial reports',              'Modules', true,  true,  true,  130),
  ('module.voice',            'Voice Command',        'Hands-free voice control',                    'Modules', true,  true,  true,  140),
  ('insights.growth',         'Growth Opportunities', 'AI-style opportunity finder from live data',  'Insights', false, true, true,  200),
  ('insights.financial-health','Financial Health',    'Business health score and diagnostics',       'Insights', false, true, true,  210),
  ('insights.inventory-alerts','Inventory Alerts',    'Low stock warnings on the dashboard',         'Insights', true,  true, true,  220),
  ('tools.export',            'Data export',          'CSV / Excel / PDF exports',                   'Tools',   false, true,  true,  300),
  ('tools.import',            'Data import',          'Bulk import from spreadsheets',               'Tools',   false, true,  true,  310),
  ('tools.payments',          'Payments & settlement','Collect customer payments to a settlement account', 'Tools', false, true, true, 320),
  ('tools.multi-location',    'Multi-location',       'Run more than one location',                  'Tools',   false, false, true,  330)
ON CONFLICT (feature_key) DO NOTHING;
