import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function AdminActivity() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(100)
      .then(({ data }) => { setRows(data ?? []); setLoading(false); });
  }, []);

  return (
    <Card>
      <CardHeader><CardTitle>Recent Activity (latest 100)</CardTitle></CardHeader>
      <CardContent>
        {loading ? <p className="text-muted-foreground">Loading…</p> : rows.length === 0 ? (
          <p className="text-muted-foreground">No activity logged yet.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={r.id} className="flex items-start gap-3 border-b pb-3 last:border-0">
                <Badge variant="outline" className="shrink-0">{r.action}</Badge>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{r.entity_type}{r.entity_id ? ` · ${String(r.entity_id).slice(0, 8)}` : ''}</div>
                  <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
