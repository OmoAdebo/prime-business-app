import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/hooks/use-business";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CreditCard, Plus, ArrowDownRight, ArrowUpRight, Clock, AlertTriangle,
  TrendingUp, DollarSign, Calendar, Users
} from "lucide-react";
import { format, differenceInDays } from "date-fns";

export default function DebtCredit() {
  const { user } = useAuth();
  const { data: business } = useBusiness();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("receivables");
  const [receivableOpen, setReceivableOpen] = useState(false);
  const [payableOpen, setPayableOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const [recForm, setRecForm] = useState({ customer_id: "", description: "", amount: "", due_date: "" });
  const [payForm, setPayForm] = useState({ supplier_id: "", description: "", amount: "", due_date: "" });
  const [schedForm, setSchedForm] = useState({ payable_id: "", scheduled_date: "", amount: "", notes: "" });

  const fmt = (n: number) => `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

  const { data: receivables } = useQuery({
    queryKey: ["receivables", business?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("receivables").select("*, customers(name)").eq("business_id", business!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!business?.id,
  });

  const { data: payables } = useQuery({
    queryKey: ["payables", business?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("payables").select("*, suppliers(name)").eq("business_id", business!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!business?.id,
  });

  const { data: schedules } = useQuery({
    queryKey: ["payment-schedules", business?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("payment_schedules").select("*, payables(description, suppliers(name))").eq("business_id", business!.id).order("scheduled_date");
      if (error) throw error;
      return data;
    },
    enabled: !!business?.id,
  });

  const { data: customers } = useQuery({
    queryKey: ["customers-list", business?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("id, name").eq("business_id", business!.id).eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!business?.id,
  });

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers-list", business?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("id, name").eq("business_id", business!.id).eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!business?.id,
  });

  const addReceivable = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("receivables").insert({
        business_id: business!.id,
        customer_id: recForm.customer_id || null,
        description: recForm.description || null,
        amount: parseFloat(recForm.amount),
        due_date: recForm.due_date || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
      setReceivableOpen(false);
      setRecForm({ customer_id: "", description: "", amount: "", due_date: "" });
      toast({ title: "Receivable added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addPayable = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("payables").insert({
        business_id: business!.id,
        supplier_id: payForm.supplier_id || null,
        description: payForm.description || null,
        amount: parseFloat(payForm.amount),
        due_date: payForm.due_date || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payables"] });
      setPayableOpen(false);
      setPayForm({ supplier_id: "", description: "", amount: "", due_date: "" });
      toast({ title: "Payable added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addSchedule = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("payment_schedules").insert({
        business_id: business!.id,
        payable_id: schedForm.payable_id || null,
        scheduled_date: schedForm.scheduled_date,
        amount: parseFloat(schedForm.amount),
        notes: schedForm.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-schedules"] });
      setScheduleOpen(false);
      setSchedForm({ payable_id: "", scheduled_date: "", amount: "", notes: "" });
      toast({ title: "Payment scheduled" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const markSchedulePaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payment_schedules").update({ is_paid: true, paid_date: new Date().toISOString().split("T")[0] }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-schedules"] });
      toast({ title: "Marked as paid" });
    },
  });

  if (!business) {
    return (
      <div className="max-w-7xl">
        <h1 className="text-2xl font-bold font-display text-foreground mb-4">Debt & Credit</h1>
        <Card><CardContent className="py-12 text-center text-muted-foreground">Register a business first.</CardContent></Card>
      </div>
    );
  }

  const totalReceivable = receivables?.reduce((s, r) => s + (r.amount - r.amount_paid), 0) || 0;
  const totalPayable = payables?.reduce((s, p) => s + (p.amount - p.amount_paid), 0) || 0;
  const overdueReceivables = receivables?.filter((r) => r.due_date && new Date(r.due_date) < new Date() && r.status === "outstanding") || [];
  const overduePayables = payables?.filter((p) => p.due_date && new Date(p.due_date) < new Date() && p.status === "outstanding") || [];

  const getAgingBadge = (dueDate: string | null) => {
    if (!dueDate) return <Badge variant="secondary">No due date</Badge>;
    const days = differenceInDays(new Date(), new Date(dueDate));
    if (days < 0) return <Badge variant="outline">{Math.abs(days)}d remaining</Badge>;
    if (days === 0) return <Badge className="bg-yellow-500">Due today</Badge>;
    if (days <= 30) return <Badge variant="destructive">Overdue {days}d</Badge>;
    if (days <= 60) return <Badge variant="destructive">Overdue {days}d</Badge>;
    return <Badge variant="destructive">Overdue {days}d ⚠️</Badge>;
  };

  return (
    <div className="max-w-7xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Debt & Credit Tracking</h1>
          <p className="text-muted-foreground text-sm">Monitor receivables, payables, and payment schedules</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-green-500/10"><ArrowDownRight className="h-5 w-5 text-green-500" /></div><div><p className="text-xs text-muted-foreground">Total Receivable</p><p className="text-xl font-bold text-green-600">{fmt(totalReceivable)}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-red-500/10"><ArrowUpRight className="h-5 w-5 text-red-500" /></div><div><p className="text-xs text-muted-foreground">Total Payable</p><p className="text-xl font-bold text-red-600">{fmt(totalPayable)}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="h-5 w-5 text-primary" /></div><div><p className="text-xs text-muted-foreground">Net Position</p><p className="text-xl font-bold">{fmt(totalReceivable - totalPayable)}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-yellow-500/10"><AlertTriangle className="h-5 w-5 text-yellow-500" /></div><div><p className="text-xs text-muted-foreground">Overdue Items</p><p className="text-xl font-bold">{overdueReceivables.length + overduePayables.length}</p></div></div></CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto scrollbar-thin">
          <TabsList className="w-max sm:w-auto">
            <TabsTrigger value="receivables" className="min-h-[44px]"><ArrowDownRight className="h-4 w-4 mr-1" />Receivables</TabsTrigger>
            <TabsTrigger value="payables" className="min-h-[44px]"><ArrowUpRight className="h-4 w-4 mr-1" />Payables</TabsTrigger>
            <TabsTrigger value="schedules" className="min-h-[44px]"><Calendar className="h-4 w-4 mr-1" />Schedules</TabsTrigger>
            <TabsTrigger value="aging" className="min-h-[44px]"><Clock className="h-4 w-4 mr-1" />Aging</TabsTrigger>
          </TabsList>
        </div>

        {/* Receivables */}
        <TabsContent value="receivables" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Accounts Receivable</CardTitle>
              <Button size="sm" onClick={() => setReceivableOpen(true)}><Plus className="h-4 w-4 mr-1" />Add</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Aging</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivables?.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.customers?.name || "—"}</TableCell>
                      <TableCell>{r.description || "—"}</TableCell>
                      <TableCell>{fmt(r.amount)}</TableCell>
                      <TableCell>{fmt(r.amount_paid)}</TableCell>
                      <TableCell className="font-semibold">{fmt(r.amount - r.amount_paid)}</TableCell>
                      <TableCell>{getAgingBadge(r.due_date)}</TableCell>
                      <TableCell><Badge variant={r.status === "paid" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {(!receivables || receivables.length === 0) && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No receivables</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payables */}
        <TabsContent value="payables" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Accounts Payable</CardTitle>
              <Button size="sm" onClick={() => setPayableOpen(true)}><Plus className="h-4 w-4 mr-1" />Add</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Aging</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payables?.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.suppliers?.name || "—"}</TableCell>
                      <TableCell>{p.description || "—"}</TableCell>
                      <TableCell>{fmt(p.amount)}</TableCell>
                      <TableCell>{fmt(p.amount_paid)}</TableCell>
                      <TableCell className="font-semibold">{fmt(p.amount - p.amount_paid)}</TableCell>
                      <TableCell>{getAgingBadge(p.due_date)}</TableCell>
                      <TableCell><Badge variant={p.status === "paid" ? "default" : "secondary"}>{p.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {(!payables || payables.length === 0) && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No payables</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Schedules */}
        <TabsContent value="schedules" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Payment Schedules</CardTitle>
              <Button size="sm" onClick={() => setScheduleOpen(true)}><Plus className="h-4 w-4 mr-1" />Schedule</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payable</TableHead>
                    <TableHead>Scheduled Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules?.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.payables?.suppliers?.name || s.payables?.description || "—"}</TableCell>
                      <TableCell>{format(new Date(s.scheduled_date), "MMM d, yyyy")}</TableCell>
                      <TableCell className="font-semibold">{fmt(s.amount)}</TableCell>
                      <TableCell>
                        {s.is_paid ? (
                          <Badge variant="default">Paid {s.paid_date && format(new Date(s.paid_date), "MMM d")}</Badge>
                        ) : (
                          <Badge variant={new Date(s.scheduled_date) < new Date() ? "destructive" : "secondary"}>
                            {new Date(s.scheduled_date) < new Date() ? "Overdue" : "Pending"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {!s.is_paid && (
                          <Button size="sm" variant="outline" onClick={() => markSchedulePaid.mutate(s.id)}>Mark Paid</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!schedules || schedules.length === 0) && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No scheduled payments</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aging Report */}
        <TabsContent value="aging" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Receivables Aging</CardTitle>
                <CardDescription>Outstanding amounts by age</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  const outstanding = receivables?.filter((r) => r.status === "outstanding" && r.due_date) || [];
                  const buckets = { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
                  outstanding.forEach((r) => {
                    const days = differenceInDays(new Date(), new Date(r.due_date!));
                    const bal = r.amount - r.amount_paid;
                    if (days < 0) buckets.current += bal;
                    else if (days <= 30) buckets["1-30"] += bal;
                    else if (days <= 60) buckets["31-60"] += bal;
                    else if (days <= 90) buckets["61-90"] += bal;
                    else buckets["90+"] += bal;
                  });
                  const total = Object.values(buckets).reduce((s, v) => s + v, 0) || 1;
                  return Object.entries(buckets).map(([label, amount]) => (
                    <div key={label} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{label === "current" ? "Not yet due" : `${label} days`}</span>
                        <span className="font-medium">{fmt(amount)}</span>
                      </div>
                      <Progress value={(amount / total) * 100} className="h-2" />
                    </div>
                  ));
                })()}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payables Aging</CardTitle>
                <CardDescription>Outstanding amounts by age</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  const outstanding = payables?.filter((p) => p.status === "outstanding" && p.due_date) || [];
                  const buckets = { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
                  outstanding.forEach((p) => {
                    const days = differenceInDays(new Date(), new Date(p.due_date!));
                    const bal = p.amount - p.amount_paid;
                    if (days < 0) buckets.current += bal;
                    else if (days <= 30) buckets["1-30"] += bal;
                    else if (days <= 60) buckets["31-60"] += bal;
                    else if (days <= 90) buckets["61-90"] += bal;
                    else buckets["90+"] += bal;
                  });
                  const total = Object.values(buckets).reduce((s, v) => s + v, 0) || 1;
                  return Object.entries(buckets).map(([label, amount]) => (
                    <div key={label} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{label === "current" ? "Not yet due" : `${label} days`}</span>
                        <span className="font-medium">{fmt(amount)}</span>
                      </div>
                      <Progress value={(amount / total) * 100} className="h-2" />
                    </div>
                  ));
                })()}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Receivable Dialog */}
      <Dialog open={receivableOpen} onOpenChange={setReceivableOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Receivable</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Customer</Label>
              <Select value={recForm.customer_id} onValueChange={(v) => setRecForm({ ...recForm, customer_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>{customers?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Input value={recForm.description} onChange={(e) => setRecForm({ ...recForm, description: e.target.value })} /></div>
            <div><Label>Amount (₦) *</Label><Input type="number" value={recForm.amount} onChange={(e) => setRecForm({ ...recForm, amount: e.target.value })} /></div>
            <div><Label>Due Date</Label><Input type="date" value={recForm.due_date} onChange={(e) => setRecForm({ ...recForm, due_date: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceivableOpen(false)}>Cancel</Button>
            <Button onClick={() => addReceivable.mutate()} disabled={!recForm.amount || addReceivable.isPending}>{addReceivable.isPending ? "Adding..." : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Payable Dialog */}
      <Dialog open={payableOpen} onOpenChange={setPayableOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Payable</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Supplier</Label>
              <Select value={payForm.supplier_id} onValueChange={(v) => setPayForm({ ...payForm, supplier_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>{suppliers?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Input value={payForm.description} onChange={(e) => setPayForm({ ...payForm, description: e.target.value })} /></div>
            <div><Label>Amount (₦) *</Label><Input type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} /></div>
            <div><Label>Due Date</Label><Input type="date" value={payForm.due_date} onChange={(e) => setPayForm({ ...payForm, due_date: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayableOpen(false)}>Cancel</Button>
            <Button onClick={() => addPayable.mutate()} disabled={!payForm.amount || addPayable.isPending}>{addPayable.isPending ? "Adding..." : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Payment Dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule Payment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Linked Payable</Label>
              <Select value={schedForm.payable_id} onValueChange={(v) => setSchedForm({ ...schedForm, payable_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select payable (optional)" /></SelectTrigger>
                <SelectContent>{payables?.filter((p) => p.status === "outstanding").map((p: any) => <SelectItem key={p.id} value={p.id}>{p.suppliers?.name || p.description || fmt(p.amount)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Scheduled Date *</Label><Input type="date" value={schedForm.scheduled_date} onChange={(e) => setSchedForm({ ...schedForm, scheduled_date: e.target.value })} /></div>
            <div><Label>Amount (₦) *</Label><Input type="number" value={schedForm.amount} onChange={(e) => setSchedForm({ ...schedForm, amount: e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea value={schedForm.notes} onChange={(e) => setSchedForm({ ...schedForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>Cancel</Button>
            <Button onClick={() => addSchedule.mutate()} disabled={!schedForm.scheduled_date || !schedForm.amount || addSchedule.isPending}>{addSchedule.isPending ? "Scheduling..." : "Schedule"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
