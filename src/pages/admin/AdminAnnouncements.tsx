import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminAnnouncements() {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [severity, setSeverity] = useState('info');

  const load = async () => {
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!title.trim() || !body.trim()) return toast.error('Title and body are required');
    const { error } = await supabase.from('announcements').insert({ title, body, severity });
    if (error) return toast.error(error.message);
    toast.success('Announcement published');
    setOpen(false); setTitle(''); setBody(''); setSeverity('info');
    load();
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from('announcements').update({ active }).eq('id', id);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from('announcements').delete().eq('id', id);
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Announcements</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> New</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Announcement</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Textarea placeholder="Message body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
              <select className="w-full border rounded-md p-2 bg-background" value={severity} onChange={(e) => setSeverity(e.target.value)}>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
              <Button className="w-full" onClick={create}>Publish</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 && <p className="text-muted-foreground">No announcements yet.</p>}
        {rows.map((a) => (
          <div key={a.id} className="border rounded-lg p-4 flex items-start gap-3">
            <div className="flex-1">
              <div className="font-medium">{a.title}</div>
              <div className="text-sm text-muted-foreground mt-1">{a.body}</div>
              <div className="text-xs text-muted-foreground mt-2">{a.severity} · {new Date(a.created_at).toLocaleString()}</div>
            </div>
            <Switch checked={a.active} onCheckedChange={(v) => toggleActive(a.id, v)} />
            <Button variant="ghost" size="icon" onClick={() => remove(a.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
