
-- 1. Drop and recreate trigger to ensure it's properly attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 2. Create team_invitations table
CREATE TABLE public.team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role public.app_role NOT NULL,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- RLS for team_invitations
CREATE POLICY "Users can view invitations they sent"
  ON public.team_invitations FOR SELECT TO authenticated
  USING (invited_by = auth.uid());

CREATE POLICY "Users can create invitations"
  ON public.team_invitations FOR INSERT TO authenticated
  WITH CHECK (
    invited_by = auth.uid() AND
    (public.has_role(auth.uid(), 'business_owner') OR public.has_role(auth.uid(), 'super_admin'))
  );

CREATE POLICY "Users can update their invitations"
  ON public.team_invitations FOR UPDATE TO authenticated
  USING (invited_by = auth.uid())
  WITH CHECK (invited_by = auth.uid());

CREATE POLICY "Anyone can read invitation by token"
  ON public.team_invitations FOR SELECT TO anon
  USING (true);

-- RLS additions for user_roles
CREATE POLICY "Super admins can insert roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Business owners can insert roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'business_owner'));

CREATE POLICY "Super admins can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Business owners can view team roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (invited_by = auth.uid());

-- RLS additions for profiles
CREATE POLICY "Super admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Business owners can view team profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'business_owner') AND
    id IN (SELECT ur.user_id FROM public.user_roles ur WHERE ur.invited_by = auth.uid())
  );

-- Functions for invitation flow
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(_token text)
RETURNS TABLE(id uuid, email text, role public.app_role, invited_by uuid, status text, expires_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT id, email, role, invited_by, status, expires_at
  FROM public.team_invitations
  WHERE token = _token AND status = 'pending' AND expires_at > now()
$$;

CREATE OR REPLACE FUNCTION public.accept_invitation(_token text, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
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

-- Function for super admin to get all users with roles
CREATE OR REPLACE FUNCTION public.get_all_users_with_roles()
RETURNS TABLE(user_id uuid, email text, full_name text, company_name text, role public.app_role, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
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
