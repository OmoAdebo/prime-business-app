
-- ============ SUBSCRIPTIONS ============
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('starter','growth','business')),
  period TEXT NOT NULL DEFAULT 'monthly' CHECK (period IN ('monthly','quarterly','annually')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','trialing','past_due','canceled','pending')),
  current_period_end TIMESTAMP WITH TIME ZONE,
  paystack_reference TEXT,
  paystack_customer_code TEXT,
  amount NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business members can view their subscription"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (public.user_belongs_to_business(auth.uid(), business_id));

CREATE POLICY "Business owners can insert their subscription"
  ON public.subscriptions FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_business(auth.uid(), business_id));

CREATE POLICY "Business owners can update their subscription"
  ON public.subscriptions FOR UPDATE TO authenticated
  USING (public.user_belongs_to_business(auth.uid(), business_id))
  WITH CHECK (public.user_belongs_to_business(auth.uid(), business_id));

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ JOBS ============
CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','archived')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business members can view jobs"
  ON public.jobs FOR SELECT TO authenticated
  USING (public.user_belongs_to_business(auth.uid(), business_id));

CREATE POLICY "Business members can create jobs"
  ON public.jobs FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_business(auth.uid(), business_id));

CREATE POLICY "Business members can update jobs"
  ON public.jobs FOR UPDATE TO authenticated
  USING (public.user_belongs_to_business(auth.uid(), business_id))
  WITH CHECK (public.user_belongs_to_business(auth.uid(), business_id));

CREATE POLICY "Business members can delete jobs"
  ON public.jobs FOR DELETE TO authenticated
  USING (public.user_belongs_to_business(auth.uid(), business_id));

CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ JOURNAL ENTRY COLUMNS ============
ALTER TABLE public.journal_entry_lines
  ADD COLUMN IF NOT EXISTS job TEXT,
  ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL;

ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS is_reversing BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reverses_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL;
