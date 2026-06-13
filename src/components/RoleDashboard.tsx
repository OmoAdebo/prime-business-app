import { useAuth } from '@/contexts/AuthContext';
import { AppRole } from '@/contexts/AuthContext';
import Dashboard from '@/pages/Dashboard';
import {
  BookOpen, Package, Users, CreditCard, FileText, Store, BarChart3, Landmark, PiggyBank,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { ActivityFeed } from '@/components/ActivityFeed';

interface QuickAction {
  title: string;
  icon: React.ElementType;
  path: string;
  color: string;
}

// Admin roles are redirected to /admin by AppLayout — we no longer render
// admin-only quick actions or panels here. The dashboard is for operators.
const roleQuickActions: Partial<Record<AppRole, QuickAction[]>> = {
  business_owner: [
    { title: 'Bookkeeping', icon: BookOpen, path: '/bookkeeping', color: 'bg-primary/10 text-primary' },
    { title: 'Invoicing', icon: FileText, path: '/invoicing', color: 'bg-accent text-accent-foreground' },
    { title: 'Payroll & HR', icon: Users, path: '/payroll', color: 'bg-secondary/20 text-secondary-foreground' },
    { title: 'Capital Access', icon: PiggyBank, path: '/capital', color: 'bg-muted text-muted-foreground' },
  ],
  store_manager: [
    { title: 'Inventory', icon: Package, path: '/inventory', color: 'bg-primary/10 text-primary' },
    { title: 'Online Store', icon: Store, path: '/store', color: 'bg-accent text-accent-foreground' },
    { title: 'Sales Reports', icon: BarChart3, path: '/reports', color: 'bg-secondary/20 text-secondary-foreground' },
    { title: 'Invoicing', icon: FileText, path: '/invoicing', color: 'bg-muted text-muted-foreground' },
  ],
  accountant: [
    { title: 'Bookkeeping', icon: BookOpen, path: '/bookkeeping', color: 'bg-primary/10 text-primary' },
    { title: 'Banking', icon: Landmark, path: '/banking', color: 'bg-accent text-accent-foreground' },
    { title: 'Reports', icon: BarChart3, path: '/reports', color: 'bg-secondary/20 text-secondary-foreground' },
    { title: 'Debt & Credit', icon: CreditCard, path: '/debt-credit', color: 'bg-muted text-muted-foreground' },
  ],
  employee: [
    { title: 'My Payroll', icon: Users, path: '/payroll', color: 'bg-primary/10 text-primary' },
    { title: 'Inventory', icon: Package, path: '/inventory', color: 'bg-accent text-accent-foreground' },
  ],
  individual: [
    { title: 'Browse Businesses', icon: Store, path: '/dashboard', color: 'bg-primary/10 text-primary' },
    { title: 'My Profile', icon: Users, path: '/settings', color: 'bg-accent text-accent-foreground' },
    { title: 'Reports', icon: BarChart3, path: '/reports', color: 'bg-secondary/20 text-secondary-foreground' },
  ],
};

const roleGreetings: Partial<Record<AppRole, string>> = {
  business_owner: 'Your business at a glance — finances, sales & operations.',
  store_manager: 'Store operations overview — inventory, sales & orders.',
  accountant: 'Financial overview — books, reports & reconciliation.',
  employee: 'Welcome — here are your tasks and payroll info.',
  individual: 'Welcome — discover and connect with businesses on the platform.',
};

export default function RoleDashboard() {
  const { roles, profile } = useAuth();
  const navigate = useNavigate();
  const primaryRole = (roles[0] as AppRole) || 'employee';
  const greeting = roleGreetings[primaryRole] || 'Welcome.';
  const actions = roleQuickActions[primaryRole] || [];

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">
          {profile?.full_name ? `Welcome, ${profile.full_name}` : 'Dashboard'}
        </h1>
        <p className="text-muted-foreground mt-1">{greeting}</p>
        <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
          {primaryRole.replace('_', ' ')}
        </span>
      </div>

      {/* Quick Actions - hidden for business_owner since sidebar + industry Dashboard cover navigation */}
      {primaryRole !== 'business_owner' && actions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {actions.map((action) => (
            <Card
              key={action.title}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(action.path)}
            >
              <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${action.color}`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-foreground">{action.title}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Full industry-tailored dashboard for business owners */}
      {primaryRole === 'business_owner' && <Dashboard />}

      {/* Activity feed — visible to business owners */}
      {primaryRole === 'business_owner' && <ActivityFeed />}
    </div>
  );
}
