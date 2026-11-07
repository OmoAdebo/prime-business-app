-- Admin-managed Industry / Sector profiles and industry-specific feature access.
-- Run against the Prime Supabase project. Existing business_category values remain valid.

CREATE TABLE IF NOT EXISTS public.industry_profiles (
  category text PRIMARY KEY,
  hint text NOT NULL DEFAULT '',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT industry_profiles_category_length CHECK (length(category) BETWEEN 1 AND 100),
  CONSTRAINT industry_profiles_config_object CHECK (jsonb_typeof(config) = 'object')
);

GRANT SELECT ON public.industry_profiles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.industry_profiles TO authenticated;
GRANT ALL ON public.industry_profiles TO service_role;
ALTER TABLE public.industry_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "industry_profiles_read_active" ON public.industry_profiles;
CREATE POLICY "industry_profiles_read_active" ON public.industry_profiles
  FOR SELECT TO anon, authenticated USING (is_active OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support_admin'));

DROP POLICY IF EXISTS "industry_profiles_admin_write" ON public.industry_profiles;
CREATE POLICY "industry_profiles_admin_write" ON public.industry_profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support_admin'));

DROP TRIGGER IF EXISTS industry_profiles_updated_at ON public.industry_profiles;
CREATE TRIGGER industry_profiles_updated_at BEFORE UPDATE ON public.industry_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.industry_feature_access (
  industry_category text NOT NULL REFERENCES public.industry_profiles(category) ON UPDATE CASCADE ON DELETE CASCADE,
  feature_key text NOT NULL REFERENCES public.plan_features(feature_key) ON UPDATE CASCADE ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (industry_category, feature_key)
);

GRANT SELECT ON public.industry_feature_access TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.industry_feature_access TO authenticated;
GRANT ALL ON public.industry_feature_access TO service_role;
ALTER TABLE public.industry_feature_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "industry_feature_access_read" ON public.industry_feature_access;
CREATE POLICY "industry_feature_access_read" ON public.industry_feature_access
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "industry_feature_access_admin_write" ON public.industry_feature_access;
CREATE POLICY "industry_feature_access_admin_write" ON public.industry_feature_access
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support_admin'));

-- These initial rows provide existing sectors in the registration/onboarding selector.
-- Dashboard settings start from the matching built-in profile and become fully editable in Admin.
INSERT INTO public.industry_profiles (category, hint, display_order) VALUES
  ('MSMEs', 'Micro, small & medium businesses — retail, wholesale & services', 10),
  ('Healthcare', 'Clinics, pharmacies, hospitals & medical suppliers', 20),
  ('Agriculture', 'Farming, livestock, agro-processing & agri-inputs', 30),
  ('Technology', 'Software, IT services, hardware & digital products', 40),
  ('Finance', 'Fintech, microfinance, insurance & advisory firms', 50),
  ('Consultant', 'Professional services & advisory firms', 60),
  ('Manufacturing', 'Production, assembly & industrial goods', 70)
ON CONFLICT (category) DO NOTHING;

-- By default, each sector can use the existing catalog; retain industry defaults that hide
-- modules which do not fit the built-in experience. Subscription-plan access is still separate.
INSERT INTO public.industry_feature_access (industry_category, feature_key, enabled)
SELECT ip.category, pf.feature_key,
  CASE
    WHEN ip.category IN ('Healthcare', 'Agriculture') AND pf.feature_key = 'module.store' THEN false
    WHEN ip.category = 'Technology' AND pf.feature_key = 'module.pos' THEN false
    WHEN ip.category = 'Finance' AND pf.feature_key IN ('module.pos', 'module.store') THEN false
    WHEN ip.category = 'Consultant' AND pf.feature_key IN ('module.pos', 'module.store', 'module.store-management') THEN false
    ELSE true
  END
FROM public.industry_profiles ip
CROSS JOIN public.plan_features pf
ON CONFLICT (industry_category, feature_key) DO NOTHING;