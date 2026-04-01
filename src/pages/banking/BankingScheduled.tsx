import { useState } from "react";
import { Clock, Plus, Calendar } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function BankingScheduled() {
  const { data: business } = useBusiness();
  const queryClient = useQueryClient();
  const businessId = business?.id;

  const [open, setOpen] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");

  const { data: accounts = [] } = useQuery({
    queryKey: ["bank-accounts", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from("bank_accounts").select("*").eq("business_id", businessId!).eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["payment-schedules", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from("payment_schedules").select("*").eq("business_id", businessId!).order("scheduled_date");
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const createSchedule = useMutation({
    mutationFn: async () => {
      const amt = parseFloat(amount);
      if (!date || isNaN(amt)) throw new Error("Invalid schedule");
      const { error } = await supabase.from("payment_schedules").insert({
        business_id: businessId!, amount: amt, scheduled_date: date, notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-schedules"] });
      setOpen(false); setAmount(""); setDate(""); setNotes("");
      toast.success("Payment scheduled");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payment_schedules").update({ is_paid: true, paid_date: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-schedules"] });
      toast.success("Marked as paid");
    },
  });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Scheduled Payments</h2>
          <p className="text-sm text-muted-foreground">Manage upcoming and recurring payments</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Schedule Payment</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Schedule a Payment</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Amount (₦)</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} /></div>
              <div><Label>Scheduled Date</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
              <div><Label>Notes</Label><Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Monthly rent" /></div>
              <Button className="w-full" onClick={() => createSchedule.mutate()} disabled={createSchedule.isPending || !amount || !date}>
                {createSchedule.isPending ? "Scheduling..." : "Schedule Payment"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : schedules.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No scheduled payments</TableCell></TableRow>
              ) : (
                schedules.map(s => (
                  <TableRow key={s.id}>
                    <TableCell>{new Date(s.scheduled_date).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">₦{s.amount.toLocaleString()}</TableCell>
                    <TableCell>{s.notes || "—"}</TableCell>
                    <TableCell><Badge variant={s.is_paid ? "default" : "outline"}>{s.is_paid ? "Paid" : "Upcoming"}</Badge></TableCell>
                    <TableCell className="text-right">
                      {!s.is_paid && <Button variant="outline" size="sm" onClick={() => markPaid.mutate(s.id)}>Mark Paid</Button>}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>
  );
}
