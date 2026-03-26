
-- Activity logs for audit trail
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb DEFAULT '{}',
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Super admin sees all logs
CREATE POLICY "Super admin views all logs" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Business owners see their business logs
CREATE POLICY "Business owners view own logs" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

-- Anyone authenticated can insert logs
CREATE POLICY "Authenticated can insert logs" ON public.activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Voice usage tracking
CREATE TABLE public.voice_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  command_text text,
  action_type text,
  success boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.voice_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own voice usage" ON public.voice_usage
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Super admin views all voice usage" ON public.voice_usage
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));
