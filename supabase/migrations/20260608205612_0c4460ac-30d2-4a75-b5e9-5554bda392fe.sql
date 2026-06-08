ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS business_category TEXT,
  ADD COLUMN IF NOT EXISTS business_subcategory TEXT;