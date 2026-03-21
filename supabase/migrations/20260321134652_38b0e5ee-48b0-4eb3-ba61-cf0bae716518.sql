
-- Fix existing user role
UPDATE public.user_roles 
SET role = 'individual'::public.app_role 
WHERE user_id = '9fe0fc2d-2471-4041-9ed0-02662dc15b57' AND role = 'employee';

-- Update handle_new_user default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, company_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'company_name', '')
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE(
      (NEW.raw_user_meta_data->>'requested_role')::public.app_role,
      'individual'::public.app_role
    )
  );

  RETURN NEW;
END;
$$;
