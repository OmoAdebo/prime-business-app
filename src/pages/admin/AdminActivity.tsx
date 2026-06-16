import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface Row {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  user_id: string | null;
  created_at: string;
  details?: any;
}

export default function AdminActivity() {
  const [rows, setRows] = useState<Row[]>([]);
  const [userMap, setUserMap] = useState<Record<string, { email: string; full_name: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      const list = (data ?? []) as Row[];
      setRows(list);

      // Resolve user emails via the existing helper
      const { data: users } = await supabase.rpc('get_all_users_with_roles');
      const map: Record<string, { email: string; full_name: string | null }> = {};
      (users ?? []).forEach((u: any) => { map[u.user_id] = { email: u.email, full_name: u.full_name }; });
      setUserMap(map);
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const u = r.user_id ? userMap[r.user_id] : null;
    const hay = [r.action, r.entity_type, u?.email, u?.full_name].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(search.toLowerCase());
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity (latest 200)</CardTitle>
        <div className="relative mt-3 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email, action, or entity…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground">No activity matches your filter.</p>
        ) : (
          <ul className="space-y-3">
            {filtered.map((r) => {
              const u = r.user_id ? userMap[r.user_id] : null;
              return (
                <li key={r.id} className="flex items-start gap-3 border-b pb-3 last:border-0">
                  <Badge variant="outline" className="shrink-0 capitalize">{r.action}</Badge>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium capitalize">
                      {String(r.entity_type).replace(/_/g, ' ')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {u ? (
                        <span>
                          by <span className="text-foreground font-medium">{u.full_name || u.email}</span>{' '}
                          <span className="text-muted-foreground">({u.email})</span>
                        </span>
                      ) : (
                        <span>by system</span>
                      )}
                      <span className="mx-1">·</span>
                      {new Date(r.created_at).toLocaleString()}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
