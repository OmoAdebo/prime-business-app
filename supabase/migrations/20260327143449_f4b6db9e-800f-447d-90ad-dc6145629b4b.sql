
-- Add manager and contact fields to inventory_locations for store management
ALTER TABLE public.inventory_locations
  ADD COLUMN IF NOT EXISTS manager_id UUID,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS operating_hours TEXT;

-- Store staff assignments table
CREATE TABLE IF NOT EXISTS public.store_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.inventory_locations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees_hr(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'staff',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(location_id, employee_id)
);

ALTER TABLE public.store_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view store staff for their business"
  ON public.store_staff FOR SELECT TO authenticated
  USING (public.user_belongs_to_business(auth.uid(), business_id));

CREATE POLICY "Users can manage store staff for their business"
  ON public.store_staff FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_business(auth.uid(), business_id));

CREATE POLICY "Users can update store staff for their business"
  ON public.store_staff FOR UPDATE TO authenticated
  USING (public.user_belongs_to_business(auth.uid(), business_id));

CREATE POLICY "Users can delete store staff for their business"
  ON public.store_staff FOR DELETE TO authenticated
  USING (public.user_belongs_to_business(auth.uid(), business_id));
