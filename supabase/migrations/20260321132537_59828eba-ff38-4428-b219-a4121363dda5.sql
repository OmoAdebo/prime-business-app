
-- 1.5A: Recreate the trigger (function already exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 1.5B: Create businesses table for verification
CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  cac_number TEXT,
  cac_document_url TEXT,
  utility_bill_url TEXT,
  business_address TEXT,
  state TEXT,
  lga TEXT,
  industry TEXT,
  tin_number TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  verified_at TIMESTAMPTZ,
  verified_by UUID,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own business" ON public.businesses FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Owners can insert own business" ON public.businesses FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners can update own business" ON public.businesses FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Super admins can view all businesses" ON public.businesses FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can update all businesses" ON public.businesses FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- Trigger for updated_at
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 1.5C: Create business_settings table for branding
CREATE TABLE IF NOT EXISTS public.business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#22c55e',
  secondary_color TEXT DEFAULT '#f59e0b',
  brand_name TEXT,
  email_format TEXT DEFAULT 'first.last@domain',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id)
);

ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage own settings" ON public.business_settings FOR ALL TO authenticated USING (
  business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
);
CREATE POLICY "Super admins can view all settings" ON public.business_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_business_settings_updated_at BEFORE UPDATE ON public.business_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for business documents
INSERT INTO storage.buckets (id, name, public) VALUES ('business-documents', 'business-documents', false) ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Owners can upload business docs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'business-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owners can view own business docs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'business-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Super admins can view all business docs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'business-documents' AND public.has_role(auth.uid(), 'super_admin'));
