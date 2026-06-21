import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Search, CheckCircle2, Ban, PlusCircle, Pencil } from "lucide-react";

type Plan = "starter" | "growth" | "business";
type Period = "monthly" | "quarterly" | "annually";
type Status = "active" | "trialing" | "past_due" | "canceled" | "pending";

interface Business {
  id: string;
  company_name: string;
  owner_id: string;
}
interface Sub {
  id: string;
  business_id: string;
  plan: Plan;
  period: Period;
  status: Status;
  current_period_end: string | null;
  amount: number | null;
  updated_at: string;
}
interface Row {
  business: Business;
  ownerEmail: string;
  ownerName: string | null;
  subscription: Sub | null;
}

const statusColor = (s?: Status | null) => {
  switch (s) {
    case "active":
      return "bg-primary/10 text-primary";
    case "trialing":
      return "bg-blue-500/10 text-blue-600";
    case "past_due":
      return "bg-warning/10 text-warning";
    case "canceled":
      return "bg-destructive/10 text-destructive";
    case "pending":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export default function AdminSubscriptions() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState({
    plan: "starter" as Plan,
    period: "monthly" as Period,
    status: "active" as Status,
    durationDays: 30,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async (): Promise<Row[]> => {
      const [{ data: businesses }, { data: subs }, { data: users }] = await Promise.all([
        supabase.from("businesses").select("id, company_name, owner_id"),
        (supabase as any).from("subscriptions").select("*"),
        supabase.rpc("get_all_users_with_roles"),
      ]);
      const subMap = new Map<string, Sub>((subs ?? []).map((s: any) => [s.business_id, s]));
      const userMap = new Map<string, any>((users ?? []).map((u: any) => [u.user_id, u]));
      return (businesses ?? []).map((b: any) => {
        const u = userMap.get(b.owner_id);
        return {
          business: b,
          ownerEmail: u?.email ?? "—",
          ownerName: u?.full_name ?? null,
          subscription: subMap.get(b.id) ?? null,
        };
      });
    },
  });

  const upsert = useMutation({
    mutationFn: async ({
      row,
      plan,
      period,
      status,
      durationDays,
    }: {
      row: Row;
      plan: Plan;
      period: Period;
      status: Status;
      durationDays: number;
    }) => {
      const endDate =
        status === "active" || status === "trialing"
          ? new Date(Date.now() + durationDays * 86400_000).toISOString()
          : null;
      const payload: any = {
        business_id: row.business.id,
        plan,
        period,
        status,
        current_period_end: endDate,
        amount: 0,
      };
      if (row.subscription) {
        const { error } = await (supabase as any)
          .from("subscriptions")
          .update(payload)
          .eq("id", row.subscription.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("subscriptions").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_d, v) => {
      toast({ title: "Subscription updated" });
      (supabase as any).rpc("log_activity", {
        _business_id: v.row.business.id,
        _action: "subscription_updated",
        _entity_type: "subscriptions",
        _entity_id: v.row.subscription?.id ?? null,
        _details: { plan: v.plan, period: v.period, status: v.status, duration_days: v.durationDays },
      });
      qc.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      setEditing(null);
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const quickToggle = useMutation({
    mutationFn: async ({ row, activate }: { row: Row; activate: boolean }) => {
      if (activate) {
        const payload = {
          business_id: row.business.id,
          plan: row.subscription?.plan ?? "starter",
          period: row.subscription?.period ?? "monthly",
          status: "active" as Status,
          current_period_end: new Date(Date.now() + 30 * 86400_000).toISOString(),
          amount: row.subscription?.amount ?? 0,
        };
        if (row.subscription) {
          const { error } = await (supabase as any)
            .from("subscriptions")
            .update(payload)
            .eq("id", row.subscription.id);
          if (error) throw error;
        } else {
          const { error } = await (supabase as any).from("subscriptions").insert(payload);
          if (error) throw error;
        }
      } else {
        if (!row.subscription) return;
        const { error } = await (supabase as any)
          .from("subscriptions")
          .update({ status: "canceled" })
          .eq("id", row.subscription.id);
        if (error) throw error;
      }
    },
    onSuccess: (_, v) => {
      toast({ title: v.activate ? "Subscription activated" : "Subscription disabled" });
      (supabase as any).rpc("log_activity", {
        _business_id: v.row.business.id,
        _action: v.activate ? "subscription_granted" : "subscription_disabled",
        _entity_type: "subscriptions",
        _entity_id: v.row.subscription?.id ?? null,
        _details: { by: "admin" },
      });
      qc.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const rows = (data ?? []).filter((r) => {
    const q = search.toLowerCase();
    return (
      r.business.company_name?.toLowerCase().includes(q) ||
      r.ownerEmail.toLowerCase().includes(q) ||
      (r.ownerName ?? "").toLowerCase().includes(q)
    );
  });

  const stats = {
    total: data?.length ?? 0,
    active: data?.filter((r) => r.subscription?.status === "active").length ?? 0,
    none: data?.filter((r) => !r.subscription).length ?? 0,
    canceled: data?.filter((r) => r.subscription?.status === "canceled").length ?? 0,
  };

  const openEdit = (row: Row) => {
    setForm({
      plan: row.subscription?.plan ?? "starter",
      period: row.subscription?.period ?? "monthly",
      status: row.subscription?.status ?? "active",
      durationDays: 30,
    });
    setEditing(row);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Subscriptions</h1>
        <p className="text-sm text-muted-foreground">
          Manually grant or revoke plan access for business owners while payment integration is in
          development.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Businesses", value: stats.total, color: "bg-primary/10 text-primary" },
          { label: "Active Plans", value: stats.active, color: "bg-primary/10 text-primary" },
          { label: "No Subscription", value: stats.none, color: "bg-muted text-muted-foreground" },
          {
            label: "Canceled",
            value: stats.canceled,
            color: "bg-destructive/10 text-destructive",
          },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg font-display">Business Subscriptions</CardTitle>
            <CardDescription>
              Activate gives the owner 30 days of access. Use Edit for custom plans.
            </CardDescription>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search business or owner..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground text-sm">No businesses found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const s = r.subscription;
                  const active = s?.status === "active" || s?.status === "trialing";
                  return (
                    <TableRow key={r.business.id}>
                      <TableCell className="font-medium">{r.business.company_name}</TableCell>
                      <TableCell className="text-sm">
                        <div>{r.ownerName ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{r.ownerEmail}</div>
                      </TableCell>
                      <TableCell className="capitalize text-sm">{s?.plan ?? "—"}</TableCell>
                      <TableCell className="capitalize text-sm">{s?.period ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`capitalize text-xs ${statusColor(s?.status)}`}>
                          {s?.status ?? "none"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {s?.current_period_end
                          ? new Date(s.current_period_end).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {active ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => quickToggle.mutate({ row: r, activate: false })}
                              disabled={quickToggle.isPending}
                            >
                              <Ban className="h-3.5 w-3.5 mr-1" /> Disable
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-primary hover:text-primary"
                              onClick={() => quickToggle.mutate({ row: r, activate: true })}
                              disabled={quickToggle.isPending}
                            >
                              {s ? (
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              ) : (
                                <PlusCircle className="h-3.5 w-3.5 mr-1" />
                              )}
                              {s ? "Activate" : "Grant"}
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
                            <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Subscription</DialogTitle>
            <DialogDescription>{editing?.business.company_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v as Plan })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Billing Period</Label>
              <Select value={form.period} onValueChange={(v) => setForm({ ...form, period: v as Period })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annually">Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Status })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trialing">Trialing</SelectItem>
                  <SelectItem value="past_due">Past Due</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Access duration (days)</Label>
              <Input
                type="number"
                min={1}
                value={form.durationDays}
                onChange={(e) => setForm({ ...form, durationDays: parseInt(e.target.value) || 30 })}
              />
              <p className="text-xs text-muted-foreground">
                Only applies to Active/Trialing. Other statuses clear the expiry.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button
              onClick={() => editing && upsert.mutate({ row: editing, ...form })}
              disabled={upsert.isPending}
            >
              {upsert.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
