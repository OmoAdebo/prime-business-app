-- Prime: performance & failure monitoring
-- Run against the Prime Supabase project (zoukfdfpbmcyapkbujnr).

CREATE TABLE IF NOT EXISTS public.system_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  action text NOT NULL,
  message text,
  code text,
  severity text NOT NULL DEFAULT 'error',
  user_id uuid,
  email text,
  path text,
  user_agent text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS system_events_created_idx ON public.system_events (created_at DESC);
CREATE INDEX IF NOT EXISTS system_events_category_idx ON public.system_events (category, action);

-- Signed-out visitors (failed logins / resets) must be able to report events.
GRANT INSERT ON public.system_events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_events TO authenticated;
GRANT ALL ON public.system_events TO service_role;

ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_events_insert_any" ON public.system_events;
CREATE POLICY "system_events_insert_any" ON public.system_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    category IN ('auth','data','function','payment','client')
    AND severity IN ('info','warning','error')
    AND length(action) <= 120
    AND (message IS NULL OR length(message) <= 1000)
    AND resolved = false
    AND (user_id IS NULL OR user_id = auth.uid())
  );

DROP POLICY IF EXISTS "system_events_admin_read" ON public.system_events;
CREATE POLICY "system_events_admin_read" ON public.system_events
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'support_admin')
  );

DROP POLICY IF EXISTS "system_events_admin_update" ON public.system_events;
CREATE POLICY "system_events_admin_update" ON public.system_events
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'support_admin')
  );

DROP POLICY IF EXISTS "system_events_admin_delete" ON public.system_events;
CREATE POLICY "system_events_admin_delete" ON public.system_events
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));
