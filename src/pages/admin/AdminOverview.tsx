import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, Shield, Activity, FileCheck } from 'lucide-react';
import { AdminUserManagement } from '@/components/AdminUserManagement';

interface Stats {
  businesses: number;
  users: number;
  admins: number;
  pending: number;
  recentActivity: number;
}

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats>({ businesses: 0, users: 0, admins: 0, pending: 0, recentActivity: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [biz, users, admins, pending, activity] = await Promise.all([
        supabase.from('businesses').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('user_roles').select('user_id', { count: 'exact', head: true }).in('role', ['super_admin', 'admin', 'support_admin']),
        supabase.from('businesses').select('id', { count: 'exact', head: true }).eq('verification_status', 'pending'),
        supabase.from('activity_logs').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
      ]);
      setStats({
        businesses: biz.count ?? 0,
        users: users.count ?? 0,
        admins: admins.count ?? 0,
        pending: pending.count ?? 0,
        recentActivity: activity.count ?? 0,
      });
      setLoading(false);
    })();
  }, []);

  const cards = [
    { label: 'Total Businesses', value: stats.businesses, icon: Building2, color: 'text-emerald-600' },
    { label: 'Registered Users', value: stats.users, icon: Users, color: 'text-blue-600' },
    { label: 'Admin Accounts', value: stats.admins, icon: Shield, color: 'text-amber-600' },
    { label: 'Pending Verifications', value: stats.pending, icon: FileCheck, color: 'text-orange-600' },
    { label: 'Activity (7d)', value: stats.recentActivity, icon: Activity, color: 'text-purple-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display">Welcome to the Admin Console</h1>
        <p className="text-muted-foreground mt-1">System overview — full control at your fingertips.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{loading ? '…' : c.value.toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* All Users + Business Verifications — admin-exclusive */}
      <AdminUserManagement />
    </div>
  );
}
