import { useState, useMemo, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  FileText, Save, Printer, Copy, Trash2, BarChart3, Plus, RotateCcw,
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

interface Row {
  account_id: string;
  description: string;
  debit: string;
  credit: string;
  job: string;       // free text
  job_id: string;    // optional reference to jobs table
}

const EMPTY_ROW: Row = { account_id: "", description: "", debit: "", credit: "", job: "", job_id: "" };

function naira(n: number) {
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function JournalEntryGridMSME() {
  const { user } = useAuth();
  const { data: business } = useBusiness();
  const businessId = business?.id;
  const qc = useQueryClient();

  const [entryDate, setEntryDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [reference, setReference] = useState("");
  const [isReversing, setIsReversing] = useState(false);
  const [rows, setRows] = useState<Row[]>(() => Array.from({ length: 8 }, () => ({ ...EMPTY_ROW })));
  const [newJobName, setNewJobName] = useState("");
  const [showJobInput, setShowJobInput] = useState(false);

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts-msme", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts").select("id, name, code, type")
        .eq("business_id", businessId!).eq("is_active", true).order("code");
      if (error) throw error;
      return data;
    },
  });

  const { data: jobs = [], refetch: refetchJobs } = useQuery({
    queryKey: ["jobs", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs" as any).select("id, name, code")
        .eq("business_id", businessId!).eq("status", "active").order("name");
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string; code: string | null }>;
    },
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["journal_entries_msme", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("*, journal_entry_lines(*, accounts(name, code))")
        .eq("business_id", businessId!)
        .order("entry_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const totalDebit = useMemo(() => rows.reduce((s, r) => s + (parseFloat(r.debit) || 0), 0), [rows]);
  const totalCredit = useMemo(() => rows.reduce((s, r) => s + (parseFloat(r.credit) || 0), 0), [rows]);
  const outOfBalance = totalDebit - totalCredit;
  const isBalanced = totalDebit > 0 && Math.abs(outOfBalance) < 0.005;

  function setRow(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() { setRows((rs) => [...rs, { ...EMPTY_ROW }]); }
  function deleteRow(i: number) {
    setRows((rs) => (rs.length > 2 ? rs.filter((_, idx) => idx !== i) : rs.map((r, idx) => (idx === i ? { ...EMPTY_ROW } : r))));
  }
  function resetGrid() {
    setRows(Array.from({ length: 8 }, () => ({ ...EMPTY_ROW })));
    setReference("");
    setIsReversing(false);
    setEntryDate(format(new Date(), "yyyy-MM-dd"));
  }

  const addJob = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.from("jobs" as any).insert({
        business_id: businessId!,
        name,
        created_by: user!.id,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { refetchJobs(); setNewJobName(""); setShowJobInput(false); toast({ title: "Job added" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const saveEntry = useMutation({
    mutationFn: async () => {
      const filled = rows.filter((r) => r.account_id && ((parseFloat(r.debit) || 0) + (parseFloat(r.credit) || 0) > 0));
      if (filled.length < 2) throw new Error("At least two lines required");
      if (!isBalanced) throw new Error("Entry is out of balance");

      const { data: entry, error: e1 } = await supabase
        .from("journal_entries")
        .insert({
          business_id: businessId!,
          entry_date: entryDate,
          reference: reference || null,
          description: filled[0]?.description || "Journal entry",
          total_debit: totalDebit,
          total_credit: totalCredit,
          status: "posted",
          is_reversing: isReversing,
          created_by: user!.id,
        } as any)
        .select().single();
      if (e1) throw e1;

      const lineInserts = filled.map((r) => ({
        journal_entry_id: entry.id,
        account_id: r.account_id,
        debit: parseFloat(r.debit) || 0,
        credit: parseFloat(r.credit) || 0,
        description: r.description || null,
        job: r.job || null,
        job_id: r.job_id || null,
      }));
      const { error: e2 } = await supabase.from("journal_entry_lines").insert(lineInserts as any);
      if (e2) throw e2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journal_entries_msme"] });
      toast({ title: "Journal entry saved" });
      resetGrid();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const copyLastRow = () => {
    const lastFilled = [...rows].reverse().find((r) => r.account_id);
    if (lastFilled) setRows((rs) => [...rs, { ...lastFilled, debit: "", credit: "" }]);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-foreground">Journal Entries</h1>
          <p className="text-muted-foreground mt-1 text-sm">Quick double-entry posting for your business.</p>
        </div>
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="p-3 flex flex-wrap items-center gap-2 border-b">
          <Button size="sm" variant="outline" onClick={resetGrid} className="gap-1"><FileText className="h-4 w-4" /> New</Button>
          <Button size="sm" onClick={() => saveEntry.mutate()} disabled={saveEntry.isPending || !isBalanced} className="gap-1">
            <Save className="h-4 w-4" /> {saveEntry.isPending ? "Saving..." : "Save"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()} className="gap-1"><Printer className="h-4 w-4" /> Print</Button>
          <Button size="sm" variant="outline" onClick={copyLastRow} className="gap-1"><Copy className="h-4 w-4" /> Copy Row</Button>
          <Button size="sm" variant="outline" onClick={() => setRows(Array.from({ length: 8 }, () => ({ ...EMPTY_ROW })))} className="gap-1">
            <Trash2 className="h-4 w-4" /> Clear
          </Button>
          <Button size="sm" variant="outline" onClick={() => setIsReversing((v) => !v)} className="gap-1">
            <RotateCcw className="h-4 w-4" /> {isReversing ? "Reversing ✓" : "Reversing"}
          </Button>
          <Button size="sm" variant="ghost" className="gap-1 ml-auto" disabled>
            <BarChart3 className="h-4 w-4" /> Reports
          </Button>
        </CardContent>

        {/* Header fields */}
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 border-b bg-muted/30">
          <div>
            <Label className="text-xs">Date</Label>
            <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Reference</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="JE-001" />
          </div>
          <div className="flex items-end">
            <Badge variant={isBalanced ? "default" : "destructive"} className="ml-auto">
              {isBalanced ? "Balanced" : `Out of balance: ${naira(outOfBalance)}`}
            </Badge>
          </div>
        </CardContent>

        {/* Grid */}
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-2 w-10">#</th>
                <th className="text-left p-2 min-w-[180px]">GL Account</th>
                <th className="text-left p-2 min-w-[180px]">Description</th>
                <th className="text-right p-2 w-32">Debit (₦)</th>
                <th className="text-right p-2 w-32">Credit (₦)</th>
                <th className="text-left p-2 min-w-[160px]">Job</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t hover:bg-muted/20">
                  <td className="p-1 text-center text-muted-foreground">{i + 1}</td>
                  <td className="p-1">
                    <Select value={r.account_id} onValueChange={(v) => setRow(i, { account_id: v })}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select account" /></SelectTrigger>
                      <SelectContent>
                        {accounts.map((a: any) => (
                          <SelectItem key={a.id} value={a.id}>{a.code ? `${a.code} – ` : ""}{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-1"><Input className="h-9" value={r.description} onChange={(e) => setRow(i, { description: e.target.value })} /></td>
                  <td className="p-1"><Input className="h-9 text-right font-mono" type="number" min="0" step="0.01" value={r.debit} onChange={(e) => setRow(i, { debit: e.target.value, credit: e.target.value ? "" : r.credit })} /></td>
                  <td className="p-1"><Input className="h-9 text-right font-mono" type="number" min="0" step="0.01" value={r.credit} onChange={(e) => setRow(i, { credit: e.target.value, debit: e.target.value ? "" : r.debit })} /></td>
                  <td className="p-1">
                    <div className="flex gap-1">
                      <Select value={r.job_id || "__none"} onValueChange={(v) => setRow(i, { job_id: v === "__none" ? "" : v, job: v === "__none" ? r.job : (jobs.find(j => j.id === v)?.name || "") })}>
                        <SelectTrigger className="h-9 text-xs flex-1"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">— None —</SelectItem>
                          {jobs.map((j) => <SelectItem key={j.id} value={j.id}>{j.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input className="h-9 w-24 text-xs" placeholder="or text" value={r.job} onChange={(e) => setRow(i, { job: e.target.value })} />
                    </div>
                  </td>
                  <td className="p-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteRow(i)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted/40 font-medium">
              <tr className="border-t">
                <td className="p-2" colSpan={3}>
                  <Button size="sm" variant="outline" onClick={addRow} className="gap-1 h-8"><Plus className="h-3 w-3" /> Add row</Button>
                </td>
                <td className="p-2 text-right font-mono">{naira(totalDebit)}</td>
                <td className="p-2 text-right font-mono">{naira(totalCredit)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </CardContent>

        {/* Jobs quick-add */}
        <CardContent className="p-3 border-t flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Jobs ({jobs.length}):</span>
          {showJobInput ? (
            <div className="flex gap-1 items-center">
              <Input className="h-8 w-48" placeholder="New job name" value={newJobName} onChange={(e) => setNewJobName(e.target.value)} />
              <Button size="sm" className="h-8" onClick={() => newJobName && addJob.mutate(newJobName)} disabled={addJob.isPending}>Add</Button>
              <Button size="sm" variant="ghost" className="h-8" onClick={() => { setShowJobInput(false); setNewJobName(""); }}>Cancel</Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => setShowJobInput(true)}><Plus className="h-3 w-3" /> New Job</Button>
          )}
        </CardContent>
      </Card>

      {/* Recent entries */}
      <Card>
        <CardContent className="p-4">
          <div className="text-sm font-semibold mb-2">Recent Entries</div>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : entries.length === 0 ? (
            <div className="text-sm text-muted-foreground">No entries yet. Fill the grid above and click Save.</div>
          ) : (
            <div className="divide-y">
              {entries.slice(0, 10).map((e: any) => (
                <div key={e.id} className="py-2 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">{e.description || e.reference || "Entry"}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(e.entry_date), "dd MMM yyyy")} · {e.reference || "—"} · {e.journal_entry_lines?.length || 0} lines
                      {e.is_reversing && <Badge variant="outline" className="ml-2 text-[10px]">Reversing</Badge>}
                    </div>
                  </div>
                  <div className="font-mono text-right">{naira(Number(e.total_debit))}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
