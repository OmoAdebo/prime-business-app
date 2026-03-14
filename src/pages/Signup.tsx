import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { AppRole } from '@/lib/supabase';

const roleOptions: { value: AppRole; label: string; description: string }[] = [
  { value: 'business_owner', label: 'Business Owner', description: 'Full access to finances, sales & employees' },
  { value: 'store_manager', label: 'Store Manager', description: 'Manage store operations & inventory' },
  { value: 'accountant', label: 'Accountant', description: 'Bookkeeping, reports & tax management' },
  { value: 'employee', label: 'Employee', description: 'Limited access to assigned tasks' },
];

export default function Signup() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState<AppRole>('business_owner');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName, company_name: companyName, requested_role: role },
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // Update the default role if not employee
    if (data.user && role !== 'employee') {
      await supabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', data.user.id);
    }

    // Update company name in profile
    if (data.user && companyName) {
      await supabase
        .from('profiles')
        .update({ company_name: companyName })
        .eq('id', data.user.id);
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
              <div className="space-y-2">
                <Label htmlFor="company">Company Name</Label>
                <Input
                  id="company"
                  placeholder="Acme Inc."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
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
              <div className="space-y-2">
                <Label>Your Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div>
                          <span className="font-medium">{opt.label}</span>
                          <span className="text-muted-foreground ml-2 text-xs">— {opt.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <span className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" /> Create Account
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
