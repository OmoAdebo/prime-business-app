import { useAuth } from '@/contexts/AuthContext';
import { AppRole } from '@/contexts/AuthContext';
import Dashboard from '@/pages/Dashboard';
import {
  BookOpen, Package, Users, CreditCard, FileText, Store, BarChart3, Landmark, PiggyBank, Settings,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { AdminUserManagement } from '@/components/AdminUserManagement';
import { ActivityFeed } from '@/components/ActivityFeed';

interface QuickAction {
  title: string;
  icon: React.ElementType;
  path: string;
  color: string;
}

const roleQuickActions: Record<AppRole, QuickAction[]> = {
  super_admin: [
    { title: 'Admin Console', icon: Settings, path: '/admin', color: 'bg-primary/10 text-primary' },
    { title: 'User Management', icon: Users, path: '/admin/users', color: 'bg-accent text-accent-foreground' },
    { title: 'All Reports', icon: BarChart3, path: '/reports', color: 'bg-secondary/20 text-secondary-foreground' },
    { title: 'System Settings', icon: Settings, path: '/settings', color: 'bg-muted text-muted-foreground' },
  ],
  admin: [
    { title: 'Admin Console', icon: Settings, path: '/admin', color: 'bg-primary/10 text-primary' },
    { title: 'Businesses', icon: Store, path: '/admin/businesses', color: 'bg-accent text-accent-foreground' },
    { title: 'Activity', icon: BarChart3, path: '/admin/activity', color: 'bg-secondary/20 text-secondary-foreground' },
  ],
  support_admin: [
    { title: 'Admin Console', icon: Settings, path: '/admin', color: 'bg-primary/10 text-primary' },
    { title: 'Users', icon: Users, path: '/admin/users', color: 'bg-accent text-accent-foreground' },
  ],
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

const roleGreetings: Record<AppRole, string> = {
  super_admin: 'System overview — full control at your fingertips.',
  admin: 'Platform admin overview — manage businesses and users.',
  support_admin: 'Support overview — assist users and review activity.',
  business_owner: 'Your business at a glance — finances, sales & operations.',
  store_manager: 'Store operations overview — inventory, sales & orders.',
  accountant: 'Financial overview — books, reports & reconciliation.',
  employee: 'Welcome — here are your tasks and payroll info.',
  individual: 'Welcome — discover and connect with businesses on the platform.',
};

export default function RoleDashboard() {
  const { roles, profile } = useAuth();
  const navigate = useNavigate();
  const primaryRole = roles[0] || 'employee';
  const greeting = roleGreetings[primaryRole];
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

      {/* Quick Actions - hidden for business_owner since sidebar covers navigation */}
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

      {/* Super Admin: show user management */}
      {primaryRole === 'super_admin' && <AdminUserManagement />}

      {/* Show full dashboard for admin/owner roles */}
      {(primaryRole === 'super_admin' || primaryRole === 'business_owner') && <Dashboard />}

      {/* Activity feed — visible to business owners */}
      {primaryRole === 'business_owner' && <ActivityFeed />}
    </div>
  );
}
