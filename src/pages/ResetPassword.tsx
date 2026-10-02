import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, AlertCircle } from 'lucide-react';
import { PublicLayout } from '@/components/PublicLayout';
import { explainAuthError } from '@/lib/auth-errors';
import { logFailure } from '@/lib/monitoring';

type State = 'checking' | 'ready' | 'invalid';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<State>('checking');
  const [reason, setReason] = useState<{ title: string; description: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let settled = false;
    const ok = () => { settled = true; setState('ready'); };
    const fail = (title: string, description: string, raw?: string) => {
      if (settled) return;
      settled = true;
      setReason({ title, description });
      setState('invalid');
      logFailure({ category: 'auth', action: 'reset_link', message: raw || title, code: 'link_invalid', severity: 'warning' });
    };

    // 1. The auth server reports problems (expired / already used) in the URL.
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const queryParams = new URLSearchParams(window.location.search);
    const errDesc = hashParams.get('error_description') || queryParams.get('error_description');
    if (errDesc) {
      const f = explainAuthError({ message: errDesc, code: hashParams.get('error_code') || queryParams.get('error_code') || undefined }, 'reset-update');
      fail(f.title, f.description, errDesc);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) ok();
    });

    (async () => {
      // 2. Newer links arrive with ?code= and must be exchanged for a session.
      const code = queryParams.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          const f = explainAuthError(error, 'reset-update');
          fail(f.title, f.description, error.message);
          return;
        }
        ok();
        return;
      }
      // 3. Implicit links (#access_token=…&type=recovery) or a session already set.
      if (hashParams.get('type') === 'recovery') { ok(); return; }
      const { data } = await supabase.auth.getSession();
      if (data.session) { ok(); return; }
    })();

    const timeout = setTimeout(() => {
      fail(
        'This reset link is not valid',
        'Open the newest reset email and click its button. Links work once and expire after a short time.',
        'no recovery token after 6s'
      );
    }, 6000);

    return () => { subscription.unsubscribe(); clearTimeout(timeout); };
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      const f = explainAuthError(error, 'reset-update');
      toast.error(f.title, { description: f.description, duration: 8000 });
      logFailure({ category: 'auth', action: 'reset_update', message: error.message, code: f.code });
      setLoading(false);
      return;
    }
    await supabase.auth.signOut();
    toast.success('Password updated', { description: 'Sign in with your new password.' });
    navigate('/login');
    setLoading(false);
  };

  if (state === 'checking') {
    return (
      <PublicLayout variant="centered">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm">Verifying reset link…</p>
        </div>
      </PublicLayout>
    );
  }

  if (state === 'invalid') {
    return (
      <PublicLayout variant="centered">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 space-y-4 text-center">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
            <div>
              <h1 className="text-xl font-bold font-display">{reason?.title}</h1>
              <p className="text-sm text-muted-foreground mt-2">{reason?.description}</p>
            </div>
            <Button asChild className="w-full"><Link to="/login">Request a new link</Link></Button>
          </CardContent>
        </Card>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout variant="centered">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold font-display text-foreground">Reset Password</h1>
          <p className="text-muted-foreground mt-1">Enter your new password below</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" placeholder="Min. 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input id="confirmPassword" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}
