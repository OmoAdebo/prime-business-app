import { NavLink, Outlet, Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, Building2, Users, Shield, Activity, Megaphone, CreditCard, LogOut, Home, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/admin', end: true, icon: LayoutDashboard, label: 'Overview' },
  { to: '/admin/users', icon: Users, label: 'Users & Businesses' },
  { to: '/admin/subscriptions', icon: CreditCard, label: 'Subscriptions' },
  { to: '/admin/admins', icon: Shield, label: 'Admin Management' },
  { to: '/admin/activity', icon: Activity, label: 'Activity Logs' },
  { to: '/admin/announcements', icon: Megaphone, label: 'Announcements' },
];

export default function AdminLayout() {
  const { roles, loading, signOut, profile } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const isAdmin = roles.some((r) => ['super_admin', 'admin', 'support_admin'].includes(r));
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="p-6 border-b">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">P</div>
            <div>
              <div className="font-bold font-display">Prime Admin</div>
              <div className="text-xs text-muted-foreground">Control center</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t space-y-2">
          <div className="px-3 py-2 text-xs">
            <div className="font-medium text-foreground truncate">{profile?.full_name ?? 'Admin'}</div>
            <div className="text-muted-foreground truncate">{roles.join(', ')}</div>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto flex flex-col">
        <header className="h-12 border-b bg-card/50 backdrop-blur flex items-center justify-end gap-2 px-4 sticky top-0 z-10">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/"><Home className="h-4 w-4 mr-1.5" /> Home</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/about">About</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/pricing">Pricing</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/contact">Contact</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="/" target="_blank" rel="noreferrer">
              View site <ExternalLink className="h-3 w-3 ml-1.5" />
            </a>
          </Button>
        </header>
        <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </div>
        <footer className="mt-auto border-t bg-card/50 py-4 px-6 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} Prime · Admin Console</span>
          <div className="flex items-center gap-3">
            <Link to="/help" className="hover:text-foreground">Help</Link>
            <Link to="/contact" className="hover:text-foreground">Support</Link>
            <Link to="/" className="hover:text-foreground">Marketing site</Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
