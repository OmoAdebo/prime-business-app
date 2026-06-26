import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Search, Eye } from 'lucide-react';

type Row = {
  user_id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  role: string | null;
  created_at: string;
};

type Biz = {
  id: string;
  owner_id: string;
  name: string;
  industry?: string | null;
  business_subcategory?: string | null;
  state?: string | null;
  lga?: string | null;
  rc_number?: string | null;
  tin?: string | null;
  address?: string | null;
  created_at: string;
};

const FILTERS: { key: string; label: string; match: (r: Row) => boolean }[] = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'business_owner', label: 'Business owners', match: (r) => r.role === 'business_owner' },
  { key: 'individual', label: 'Individuals', match: (r) => !r.role || r.role === 'individual' },
  { key: 'team', label: 'Team members', match: (r) => ['accountant', 'store_manager', 'employee'].includes(r.role || '') },
  { key: 'admin', label: 'Admins', match: (r) => ['super_admin', 'admin', 'support_admin'].includes(r.role || '') },
];

export default function AdminUsers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [bizByOwner, setBizByOwner] = useState<Record<string, Biz>>({});
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Row | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: users }, { data: bizes }] = await Promise.all([
        supabase.rpc('get_all_users_with_roles'),
        supabase.from('businesses').select('*'),
      ]);
      setRows((users ?? []) as Row[]);
      const map: Record<string, Biz> = {};
      (bizes ?? []).forEach((b: any) => { map[b.owner_id] = b; });
      setBizByOwner(map);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter) ?? FILTERS[0];
    return rows.filter((r) => {
      if (!f.match(r)) return false;
      if (!q) return true;
      const biz = bizByOwner[r.user_id];
      const hay = [r.email, r.full_name, r.company_name, biz?.name].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q.toLowerCase());
    });
  }, [rows, q, filter, bizByOwner]);

  const selectedBiz = selected ? bizByOwner[selected.user_id] : null;

  return (
    <>
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle>Users &amp; Businesses</CardTitle>
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search name, email, company…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const count = rows.filter(f.match).length;
              return (
                <Button
                  key={f.key}
                  size="sm"
                  variant={filter === f.key ? 'default' : 'outline'}
                  onClick={() => setFilter(f.key)}
                  className="h-8"
                >
                  {f.label} <span className="ml-1.5 opacity-70">({count})</span>
                </Button>
              );
            })}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground">Loading…</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => {
                    const biz = bizByOwner[u.user_id];
                    return (
                      <TableRow key={`${u.user_id}-${u.role}`} className="cursor-pointer" onClick={() => setSelected(u)}>
                        <TableCell className="font-medium">{u.full_name || '—'}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>{biz?.name || u.company_name || '—'}</TableCell>
                        <TableCell><Badge variant="secondary">{u.role ?? 'individual'}</Badge></TableCell>
                        <TableCell>{new Date(u.created_at).toLocaleDateString()}</TableCell>
                        <TableCell><Eye className="h-4 w-4 text-muted-foreground" /></TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No users match these filters</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selected?.full_name || selected?.email}</SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="space-y-4 mt-4 text-sm">
              <Info label="Email" value={selected.email} />
              <Info label="Role" value={selected.role || 'individual'} />
              <Info label="Joined" value={new Date(selected.created_at).toLocaleString()} />
              {selectedBiz ? (
                <>
                  <div className="pt-3 border-t">
                    <h4 className="font-semibold mb-2">Business</h4>
                    <Info label="Name" value={selectedBiz.name} />
                    <Info label="Industry" value={selectedBiz.industry} />
                    <Info label="Subcategory" value={selectedBiz.business_subcategory} />
                    <Info label="State / LGA" value={[selectedBiz.state, selectedBiz.lga].filter(Boolean).join(' / ')} />
                    <Info label="RC #" value={selectedBiz.rc_number} />
                    <Info label="TIN" value={selectedBiz.tin} />
                    <Info label="Address" value={selectedBiz.address} />
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground italic">No business profile attached.</p>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4 py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value || '—'}</span>
    </div>
  );
}
