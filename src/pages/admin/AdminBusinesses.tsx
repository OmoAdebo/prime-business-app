import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function AdminBusinesses() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('businesses').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      setRows(data ?? []);
      setLoading(false);
    });
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Businesses</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-muted-foreground">Loading…</p> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell>{b.industry ?? '—'}</TableCell>
                  <TableCell>{b.state ?? '—'}</TableCell>
                  <TableCell>{new Date(b.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No businesses yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
