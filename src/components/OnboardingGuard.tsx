import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Redirects business_owner/individual users to /onboarding
 * if they have not completed onboarding yet.
 */
export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user, roles, loading } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!user) { setChecking(false); return; }
      const { data } = await supabase.from('profiles').select('onboarding_completed').eq('id', user.id).maybeSingle();
      if (cancelled) return;
      const eligible = roles.includes('business_owner') || roles.includes('individual');
      setNeedsOnboarding(eligible && data?.onboarding_completed === false);
      setChecking(false);
    }
    run();
    return () => { cancelled = true; };
  }, [user, roles]);

  if (loading || checking) return <>{children}</>;
  if (needsOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}
