
-- Create the trigger for auto-creating profiles and roles on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
      'business_owner'::public.app_role
    )
  );

  RETURN NEW;
END;
$$;

-- Create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create get_all_users_with_roles function
CREATE OR REPLACE FUNCTION public.get_all_users_with_roles()
RETURNS TABLE(user_id uuid, email text, full_name text, company_name text, role app_role, created_at timestamp with time zone)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    p.id as user_id,
    u.email::text,
    p.full_name,
    p.company_name,
    ur.role,
    p.created_at
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  ORDER BY p.created_at DESC
$$;

-- Create get_invitation_by_token function
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(_token text)
RETURNS TABLE(id uuid, email text, role app_role, invited_by uuid, status text, expires_at timestamp with time zone)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT id, email, role, invited_by, status, expires_at
  FROM public.team_invitations
  WHERE token = _token AND status = 'pending' AND expires_at > now()
$$;

-- Create accept_invitation function
CREATE OR REPLACE FUNCTION public.accept_invitation(_token text, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE inv RECORD;
BEGIN
  SELECT * INTO inv FROM public.team_invitations WHERE token = _token AND status = 'pending' AND expires_at > now();
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE public.team_invitations SET status = 'accepted' WHERE id = inv.id;
  DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'business_owner';
  INSERT INTO public.user_roles (user_id, role, invited_by)
  VALUES (_user_id, inv.role, inv.invited_by)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN true;
END;
$$;

-- Create update_updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
