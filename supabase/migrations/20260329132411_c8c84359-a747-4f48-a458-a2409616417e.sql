ALTER TABLE public.business_settings 
  ADD COLUMN IF NOT EXISTS font_family text DEFAULT 'DM Sans',
  ADD COLUMN IF NOT EXISTS accent_color text DEFAULT '#f59e0b',
  ADD COLUMN IF NOT EXISTS sidebar_style text DEFAULT 'default';