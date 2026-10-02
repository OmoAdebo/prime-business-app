import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PublicLayout } from '@/components/PublicLayout';
import { explainAuthError } from '@/lib/auth-errors';
import { logFailure } from '@/lib/monitoring';

const ADMIN_ROLES = ['super_admin', 'admin', 'support_admin'];

async function resolveLandingPath(userId: string): Promise<string> {
  // Roles
  const { data: rolesData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);
  const roles = (rolesData ?? []).map((r: any) => r.role as string);

  if (roles.some((r) => ADMIN_ROLES.includes(r))) return '/admin';

  // Onboarding check for BO / individual
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', userId)
    .maybeSingle();
  const needsOnboarding =
    (roles.includes('business_owner') || roles.includes('individual')) &&
    profile?.onboarding_completed === false;

  return needsOnboarding ? '/onboarding' : '/dashboard';
}

export default function Login() {
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) {
      resolveLandingPath(user.id).then((path) => navigate(path, { replace: true }));
    }
  }, [user, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      const f = explainAuthError(error, 'login');
      toast.error(f.title, { description: f.description, duration: 8000 });
      logFailure({ category: 'auth', action: 'sign_in', message: error?.message || 'no user', code: f.code, email, severity: f.code === 'invalid_credentials' ? 'warning' : 'error' });
      setLoading(false);
      return;
    }

    toast.success('Welcome back!');
    const path = await resolveLandingPath(data.user.id);
    navigate(path, { replace: true });
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error('Enter your email first', { description: 'Type your email in the box above, then click "Forgot password?" again.' });
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      const f = explainAuthError(error, 'reset-request');
      toast.error(f.title, { description: f.description, duration: 8000 });
      logFailure({ category: 'auth', action: 'reset_request', message: error.message, code: f.code, email });
    } else {
      toast.success('Reset email sent', {
        description: `If an account exists for ${email}, a link is on its way. It can take a few minutes — check spam too. Use only the newest email.`,
        duration: 10000,
      });
    }
  };

  return (
    <PublicLayout variant="centered">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg mb-4">
            P
          </div>
          <h1 className="text-2xl font-bold font-display text-foreground">Welcome back to Prime</h1>
          <p className="text-muted-foreground mt-1">Sign in to your business suite</p>
        </div>

        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
          <p className="font-medium">We upgraded Prime</p>
          <p className="mt-1 text-muted-foreground">
            Your account and all your data moved to our new, faster platform. Passwords could not be carried
            over — if your old one no longer works, click <span className="font-medium">Forgot password?</span> to set a new one.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <span className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                ) : (
                  <>
                    <LogIn className="h-4 w-4 mr-2" /> Sign In
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/signup" className="text-primary font-medium hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </PublicLayout>
  );
}
