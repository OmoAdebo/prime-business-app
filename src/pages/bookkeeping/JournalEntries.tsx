import { useState, useEffect } from "react";
import { onAction } from "@/lib/action-bus";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/hooks/use-business";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { FileEdit, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
}

interface JournalLine {
  account_id: string;
  debit: string;
  credit: string;
  description: string;
}

export default function JournalEntries() {
  const { user } = useAuth();
  const { data: business } = useBusiness();
  const queryClient = useQueryClient();
  const businessId = business?.id;
  const [showAdd, setShowAdd] = useState(false);
  const [entryForm, setEntryForm] = useState({ description: "", reference: "", entry_date: format(new Date(), "yyyy-MM-dd") });
  const [lines, setLines] = useState<JournalLine[]>([
    { account_id: "", debit: "", credit: "", description: "" },
    { account_id: "", debit: "", credit: "", description: "" },
  ]);

  useEffect(() => {
    return onAction("open-record-expense", (p) => {
      setEntryForm((f) => ({ ...f, description: p?.description || p?.category || "" }));
      if (p?.amount) {
        setLines([
          { account_id: "", debit: String(p.amount), credit: "", description: p?.description || "" },
          { account_id: "", debit: "", credit: String(p.amount), description: "" },
        ]);
      }
      setShowAdd(true);
    });
  }, []);

  useEffect(() => {
    return onAction("open-journal-entry", (p) => {
      setEntryForm((f) => ({ ...f, description: p?.description || "" }));
      if (p?.amount) {
        setLines([
          { account_id: "", debit: String(p.amount), credit: "", description: p?.debit_account || "" },
          { account_id: "", debit: "", credit: String(p.amount), description: p?.credit_account || "" },
        ]);
      }
      setShowAdd(true);
    });
  }, []);


  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["journal_entries", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("*, journal_entry_lines(*, accounts(name, code))")
        .eq("business_id", businessId!)
        .order("entry_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from("accounts").select("*").eq("business_id", businessId!).eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const isBalanced = totalDebit > 0 && totalDebit === totalCredit;

  const addMutation = useMutation({
    mutationFn: async () => {
      const { data: entry, error: entryErr } = await supabase
        .from("journal_entries")
        .insert({
          business_id: businessId!, description: entryForm.description, reference: entryForm.reference || null,
          entry_date: entryForm.entry_date, total_debit: totalDebit, total_credit: totalCredit,
          status: "posted", created_by: user!.id,
        })
        .select()
        .single();
      if (entryErr) throw entryErr;

      const lineInserts = lines.filter(l => l.account_id && (parseFloat(l.debit) || parseFloat(l.credit))).map(l => ({
        journal_entry_id: entry.id, account_id: l.account_id,
        debit: parseFloat(l.debit) || 0, credit: parseFloat(l.credit) || 0,
        description: l.description || null,
      }));
      if (lineInserts.length > 0) {
        const { error: lineErr } = await supabase.from("journal_entry_lines").insert(lineInserts);
        if (lineErr) throw lineErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal_entries"] });
      setShowAdd(false);
      setEntryForm({ description: "", reference: "", entry_date: format(new Date(), "yyyy-MM-dd") });
      setLines([{ account_id: "", debit: "", credit: "", description: "" }, { account_id: "", debit: "", credit: "", description: "" }]);
      toast({ title: "Journal entry created" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const addLine = () => setLines(p => [...p, { account_id: "", debit: "", credit: "", description: "" }]);
  const removeLine = (i: number) => { if (lines.length > 2) setLines(p => p.filter((_, idx) => idx !== i)); };
  const updateLine = (i: number, field: keyof JournalLine, value: string) => {
    setLines(p => p.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-foreground">Journal Entries</h1>
          <p className="text-muted-foreground mt-1 text-sm">Create and manage double-entry journal entries.</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button className="gap-2 h-10 min-h-[44px]"><Plus className="h-4 w-4" /> New Entry</Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Journal Entry</DialogTitle>
              <DialogDescription>Debits must equal credits for a balanced entry.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>Date</Label><Input type="date" value={entryForm.entry_date} onChange={e => setEntryForm(p => ({ ...p, entry_date: e.target.value }))} /></div>
                <div><Label>Reference</Label><Input value={entryForm.reference} onChange={e => setEntryForm(p => ({ ...p, reference: e.target.value }))} placeholder="JE-001" /></div>
              </div>
              <div><Label>Description</Label><Textarea value={entryForm.description} onChange={e => setEntryForm(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="Entry description" /></div>

              <div className="space-y-2">
                <Label>Entry Lines</Label>
                {lines.map((line, i) => (
                  <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                    <div className="sm:col-span-4">
                      <Select value={line.account_id} onValueChange={v => updateLine(i, "account_id", v)}>
                        <SelectTrigger className="text-xs"><SelectValue placeholder="Account" /></SelectTrigger>
                        <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.code ? `${a.code} - ` : ""}{a.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-3"><Input type="number" min="0" step="0.01" placeholder="Debit" value={line.debit} onChange={e => updateLine(i, "debit", e.target.value)} /></div>
                    <div className="sm:col-span-3"><Input type="number" min="0" step="0.01" placeholder="Credit" value={line.credit} onChange={e => updateLine(i, "credit", e.target.value)} /></div>
                    <div className="sm:col-span-2 flex gap-1">
                      <Button variant="ghost" size="icon" className="h-9 w-9 min-h-[44px] text-destructive" onClick={() => removeLine(i)} disabled={lines.length <= 2}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addLine} className="gap-1"><Plus className="h-3 w-3" /> Add Line</Button>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3 rounded-lg bg-muted/50 border">
                <div className="text-sm"><span className="text-muted-foreground">Debit: </span><span className="font-semibold">{formatNaira(totalDebit)}</span></div>
                <div className="text-sm"><span className="text-muted-foreground">Credit: </span><span className="font-semibold">{formatNaira(totalCredit)}</span></div>
                <Badge variant={isBalanced ? "default" : "destructive"}>{isBalanced ? "Balanced" : "Unbalanced"}</Badge>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={() => addMutation.mutate()} disabled={!isBalanced || !entryForm.description || addMutation.isPending}>
                {addMutation.isPending ? "Saving..." : "Create Entry"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <FileEdit className="h-12 w-12 mb-3 text-muted-foreground/30" />
              <p className="font-medium">No journal entries yet</p>
              <p className="text-sm mt-1">Create your first journal entry to get started.</p>
            </div>
          ) : (
            <ResponsiveTable>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="hidden sm:table-cell">Reference</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Debit (₦)</TableHead>
                    <TableHead className="text-right">Credit (₦)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry: any) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-sm whitespace-nowrap">{format(new Date(entry.entry_date), "dd MMM yyyy")}</TableCell>
                      <TableCell className="font-mono text-sm hidden sm:table-cell">{entry.reference || "—"}</TableCell>
                      <TableCell className="font-medium">{entry.description || "—"}</TableCell>
                      <TableCell><Badge variant={entry.status === "posted" ? "default" : "secondary"}>{entry.status}</Badge></TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatNaira(Number(entry.total_debit))}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatNaira(Number(entry.total_credit))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ResponsiveTable>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
