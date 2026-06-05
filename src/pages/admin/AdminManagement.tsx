import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, type AppRole } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

type AdminRole = Extract<AppRole, 'super_admin' | 'admin' | 'support_admin'>;

export default function AdminManagement() {
  const { roles, user } = useAuth();
  const isSuper = roles.includes('super_admin');

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ email: '', full_name: '', role: 'admin' as AdminRole });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.rpc('get_all_users_with_roles');
    const admins = (data ?? []).filter((u: any) => ['super_admin', 'admin', 'support_admin'].includes(u.role));
    setRows(admins);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.email || !form.full_name) return toast.error('Email and full name are required');
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('create-admin-user', { body: form });
    setBusy(false);
    if (error || (data as any)?.error) {
      return toast.error((data as any)?.error || error?.message || 'Failed to create admin');
    }
    toast.success('Admin created and welcome email sent');
    setOpen(false);
    setForm({ email: '', full_name: '', role: 'admin' });
    load();
  };

  const removeAdmin = async (userId: string, role: string) => {
    if (userId === user?.id) return toast.error("You can't remove yourself");
    if (!confirm('Revoke admin access for this user?')) return;
    const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', role as AdminRole);
    if (error) return toast.error(error.message);
    toast.success('Admin access revoked');
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display">Admin Management</h1>
          <p className="text-muted-foreground mt-1">Create and manage Prime Business admin accounts.</p>
        </div>
        {isSuper && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New Admin</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Admin Account</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Full Name</Label>
                  <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Jane Doe" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@oreon.com" />
                </div>
                <div>
                  <Label>Role</Label>
                  <select
                    className="w-full border rounded-md p-2 bg-background"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as AdminRole })}
                  >
                    <option value="admin">Admin</option>
                    <option value="support_admin">Support Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
                <p className="text-xs text-muted-foreground">
                  A temporary password is generated and the new admin receives a password reset email to set their own.
                </p>
                <Button className="w-full" onClick={submit} disabled={busy}>
                  {busy ? 'Creating…' : 'Create Admin'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!isSuper && (
        <div className="rounded-lg border bg-muted/30 p-4 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="text-sm">
            <div className="font-medium">Read-only access</div>
            <div className="text-muted-foreground">Only Super Admins can create or revoke admin accounts.</div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Current Admins</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground">Loading…</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((u) => (
                  <TableRow key={`${u.user_id}-${u.role}`}>
                    <TableCell className="font-medium">{u.full_name ?? '—'}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === 'super_admin' ? 'default' : 'secondary'}>{u.role}</Badge>
                    </TableCell>
                    <TableCell>{new Date(u.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {isSuper && u.user_id !== user?.id && (
                        <Button variant="ghost" size="icon" onClick={() => removeAdmin(u.user_id, u.role)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No admins yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
