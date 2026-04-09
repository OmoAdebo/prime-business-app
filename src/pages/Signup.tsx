import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Eye, EyeOff, UserPlus, Building2, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

type AccountType = 'business_owner' | 'individual';

export default function Signup() {
  const { user, loading: authLoading } = useAuth();
  const [accountType, setAccountType] = useState<AccountType>('business_owner');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);

    const metadata: Record<string, string> = {
      full_name: fullName,
      requested_role: accountType,
    };

    if (accountType === 'business_owner') {
      metadata.company_name = companyName;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: metadata,
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // Supabase returns a user with empty identities if email already exists
    if (data?.user && data.user.identities && data.user.identities.length === 0) {
      toast.error('An account with this email already exists. Please sign in instead.');
      setLoading(false);
      return;
    }

    toast.success('Account created! Check your email to confirm.');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg mb-4">
            P
          </div>
          <h1 className="text-2xl font-bold font-display text-foreground">Create your account</h1>
          <p className="text-muted-foreground mt-1">Get started with Prime Business Suite</p>
        </div>

        {/* Account Type Selector */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setAccountType('business_owner')}
            className={cn(
              'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all text-sm font-medium',
              accountType === 'business_owner'
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border bg-card text-muted-foreground hover:border-primary/40'
            )}
          >
            <Building2 className="h-6 w-6" />
            Business Owner
          </button>
          <button
            type="button"
            onClick={() => setAccountType('individual')}
            className={cn(
              'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all text-sm font-medium',
              accountType === 'individual'
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border bg-card text-muted-foreground hover:border-primary/40'
            )}
          >
            <User className="h-6 w-6" />
            Individual
          </button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              {accountType === 'business_owner' && (
                <div className="space-y-2">
                  <Label htmlFor="company">Company Name</Label>
                  <Input
                    id="company"
                    placeholder="Acme Inc."
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 6 characters"
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

              <p className="text-xs text-muted-foreground">
                {accountType === 'business_owner' ? (
                  <>You'll be registered as a <span className="font-medium text-primary">Business Owner</span>. You can invite team members after setup.</>
                ) : (
                  <>You'll be registered as an <span className="font-medium text-primary">Individual</span>. You can connect with businesses from your dashboard.</>
                )}
              </p>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <span className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    {accountType === 'business_owner' ? 'Create Business Account' : 'Create Individual Account'}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
