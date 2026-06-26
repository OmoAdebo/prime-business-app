import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Search, Download } from 'lucide-react';

interface Row {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  user_id: string | null;
  business_id: string | null;
  created_at: string;
  details?: any;
}

const TABS = [
  { key: 'all', label: 'All', match: (_: Row) => true },
  { key: 'auth', label: 'Authentication', match: (r: Row) => ['user', 'auth', 'session', 'profile'].includes(r.entity_type) || ['signed_in', 'signed_up', 'signed_out', 'password_reset'].includes(r.action) },
  { key: 'user', label: 'User Activity', match: (r: Row) => !['user', 'auth', 'session', 'subscription', 'admin'].includes(r.entity_type) },
  { key: 'admin', label: 'Admin Ops', match: (r: Row) => ['subscription', 'admin', 'announcement', 'user_roles'].includes(r.entity_type) },
];

export default function AdminActivity() {
  const [rows, setRows] = useState<Row[]>([]);
  const [userMap, setUserMap] = useState<Record<string, { email: string; full_name: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [action, setAction] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      setRows((data ?? []) as Row[]);

      const { data: users } = await supabase.rpc('get_all_users_with_roles');
      const map: Record<string, { email: string; full_name: string | null }> = {};
      (users ?? []).forEach((u: any) => { map[u.user_id] = { email: u.email, full_name: u.full_name }; });
      setUserMap(map);
      setLoading(false);
    })();
  }, []);

  const actions = useMemo(() => Array.from(new Set(rows.map((r) => r.action))).sort(), [rows]);

  const filtered = useMemo(() => {
    const tabDef = TABS.find((t) => t.key === tab) ?? TABS[0];
    return rows.filter((r) => {
      if (!tabDef.match(r)) return false;
      if (action !== 'all' && r.action !== action) return false;
      if (from && new Date(r.created_at) < new Date(from)) return false;
      if (to && new Date(r.created_at) > new Date(`${to}T23:59:59`)) return false;
      if (search) {
        const u = r.user_id ? userMap[r.user_id] : null;
        const hay = [r.action, r.entity_type, u?.email, u?.full_name].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [rows, tab, action, from, to, search, userMap]);

  const exportCsv = () => {
    const header = ['When', 'Action', 'Entity', 'User', 'Email'];
    const lines = filtered.map((r) => {
      const u = r.user_id ? userMap[r.user_id] : null;
      return [new Date(r.created_at).toISOString(), r.action, r.entity_type, u?.full_name || '', u?.email || ''].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `activity-${tab}-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <CardTitle>Activity Logs</CardTitle>
          <Button size="sm" variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-1.5" />Export CSV</Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex flex-wrap h-auto">
            {TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>
            ))}
          </TabsList>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search email, action, entity…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <select className="h-9 rounded-md border bg-background px-2 text-sm" value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="all">All actions</option>
              {actions.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <div className="flex gap-2">
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="text-xs" />
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="text-xs" />
            </div>
          </div>

          <TabsContent value={tab} className="mt-4">
            {loading ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">No activity matches these filters.</p>
            ) : (
              <ul className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                {filtered.map((r) => {
                  const u = r.user_id ? userMap[r.user_id] : null;
                  return (
                    <li key={r.id} className="flex items-start gap-3 border-b pb-3 last:border-0">
                      <Badge variant="outline" className="shrink-0 capitalize">{r.action}</Badge>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium capitalize">{String(r.entity_type).replace(/_/g, ' ')}</div>
                        <div className="text-xs text-muted-foreground">
                          {u ? <>by <span className="text-foreground font-medium">{u.full_name || u.email}</span> <span>({u.email})</span></> : 'by system'}
                          <span className="mx-1">·</span>
                          {new Date(r.created_at).toLocaleString()}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mt-3 text-xs text-muted-foreground">{filtered.length} of {rows.length} records</div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
