import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ListTree, Plus, Search } from "lucide-react";
import { motion } from "framer-motion";

const ACCOUNT_TYPES = ["asset", "liability", "equity", "income", "expense"];
const TYPE_COLORS: Record<string, string> = {
  asset: "bg-blue-100 text-blue-700 border-blue-200",
  liability: "bg-red-100 text-red-700 border-red-200",
  equity: "bg-purple-100 text-purple-700 border-purple-200",
  income: "bg-emerald-100 text-emerald-700 border-emerald-200",
  expense: "bg-orange-100 text-orange-700 border-orange-200",
};

export default function ChartOfAccounts() {
  const { data: business } = useBusiness();
  const queryClient = useQueryClient();
  const businessId = business?.id;
  const [showAdd, setShowAdd] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [form, setForm] = useState({ name: "", code: "", type: "expense" });

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["accounts", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from("accounts").select("*").eq("business_id", businessId!).order("type").order("code");
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("accounts").insert({ business_id: businessId!, name: form.name, code: form.code || null, type: form.type });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setShowAdd(false);
      setForm({ name: "", code: "", type: "expense" });
      toast({ title: "Account created" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("accounts").update({ is_active: !is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast({ title: "Account updated" });
    },
  });

  const filtered = accounts.filter(a => {
    const matchSearch = !searchTerm || a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === "all" || a.type === filterType;
    return matchSearch && matchType;
  });

  // Group by type
  const grouped = ACCOUNT_TYPES.reduce<Record<string, typeof accounts>>((acc, type) => {
    acc[type] = filtered.filter(a => a.type === type);
    return acc;
  }, {});

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Chart of Accounts</h1>
          <p className="text-muted-foreground mt-1">Organize your financial accounts by type.</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Add Account</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Account</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2">
              <div><Label>Account Name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Office Rent" /></div>
              <div><Label>Account Code (optional)</Label><Input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="e.g. 5001" /></div>
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ACCOUNT_TYPES.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => addMutation.mutate()} disabled={!form.name || addMutation.isPending}>
                {addMutation.isPending ? "Saving..." : "Create Account"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search accounts..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {ACCOUNT_TYPES.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {ACCOUNT_TYPES.map(type => (
          <Card key={type}>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground capitalize">{type}</p>
              <p className="text-2xl font-bold mt-1">{accounts.filter(a => a.type === type).length}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-muted-foreground">
            <ListTree className="h-12 w-12 mb-3 text-muted-foreground/30" />
            <p className="font-medium">No accounts found</p>
            <p className="text-sm mt-1">Create accounts to organize your financial tracking.</p>
          </CardContent>
        </Card>
      ) : (
        ACCOUNT_TYPES.filter(type => grouped[type]?.length > 0).map(type => (
          <Card key={type}>
            <CardContent className="p-0">
              <div className="px-4 py-3 border-b bg-muted/30">
                <h3 className="font-semibold capitalize text-sm">{type} Accounts ({grouped[type].length})</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grouped[type].map(acc => (
                    <TableRow key={acc.id}>
                      <TableCell className="font-mono text-sm">{acc.code || "—"}</TableCell>
                      <TableCell className="font-medium">{acc.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={acc.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : ""}>{acc.is_active ? "Active" : "Inactive"}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => toggleMutation.mutate({ id: acc.id, is_active: acc.is_active })}>
                          {acc.is_active ? "Deactivate" : "Activate"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </motion.div>
  );
}
