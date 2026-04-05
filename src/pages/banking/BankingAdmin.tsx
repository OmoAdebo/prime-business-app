import { useState } from "react";
import { Shield, Plus, Wallet, UserPlus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { motion } from "framer-motion";

export default function BankingAdmin() {
  const { user } = useAuth();
  const { data: business } = useBusiness();
  const businessId = business?.id;
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [walletName, setWalletName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [spendingLimit, setSpendingLimit] = useState("");

  const { data: wallets = [] } = useQuery({
    queryKey: ["staff-wallets", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_wallets")
        .select("*, employees_hr(full_name)")
        .eq("business_id", businessId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-for-wallets", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees_hr")
        .select("id, full_name")
        .eq("business_id", businessId!)
        .eq("status", "active");
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bank-accounts", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("business_id", businessId!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const createWallet = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("staff_wallets").insert({
        business_id: businessId!,
        wallet_name: walletName,
        employee_id: employeeId || null,
        spending_limit: spendingLimit ? parseFloat(spendingLimit) : null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-wallets"] });
      setShowCreate(false);
      setWalletName("");
      setEmployeeId("");
      setSpendingLimit("");
      toast({ title: "Wallet created successfully" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleWallet = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("staff_wallets").update({ is_active: !is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-wallets"] });
      toast({ title: "Wallet status updated" });
    },
  });

  const activeWallets = wallets.filter((w: any) => w.is_active);
  const totalBalance = wallets.reduce((s: number, w: any) => s + Number(w.balance), 0);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Banking Administration</h2>
        <p className="text-sm text-muted-foreground">Manage staff wallets, permissions, and spending controls</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Total Wallets</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold">{wallets.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Active Wallets</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold">{activeWallets.length}</p></CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardHeader className="pb-2"><CardDescription>Total Wallet Balance</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold">₦{totalBalance.toLocaleString()}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" />Staff Wallets</CardTitle>
            <CardDescription>Sub-accounts created for employees</CardDescription>
          </div>
          <Button size="sm" className="h-10 min-h-[44px]" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />Create Wallet
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <ResponsiveTable>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Wallet Name</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead className="hidden md:table-cell">Spending Limit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wallets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No staff wallets yet. Click "Create Wallet" to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  wallets.map((w: any) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-medium">{w.wallet_name}</TableCell>
                      <TableCell>{w.employees_hr?.full_name || "Unassigned"}</TableCell>
                      <TableCell>₦{Number(w.balance).toLocaleString()}</TableCell>
                      <TableCell className="hidden md:table-cell">{w.spending_limit ? `₦${Number(w.spending_limit).toLocaleString()}` : "No limit"}</TableCell>
                      <TableCell>
                        <Badge variant={w.is_active ? "default" : "secondary"}>
                          {w.is_active ? "Active" : "Frozen"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 min-h-[44px]"
                          onClick={() => toggleWallet.mutate({ id: w.id, is_active: w.is_active })}
                        >
                          {w.is_active ? "Freeze" : "Activate"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ResponsiveTable>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Bank Accounts</CardTitle>
          <CardDescription>Overview of all business bank accounts</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ResponsiveTable>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bankAccounts.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.account_name}</TableCell>
                    <TableCell>{a.bank_name}</TableCell>
                    <TableCell className="hidden sm:table-cell"><Badge variant="outline" className="capitalize">{a.account_type}</Badge></TableCell>
                    <TableCell>₦{Number(a.current_balance).toLocaleString()}</TableCell>
                    <TableCell><Badge variant={a.is_active ? "default" : "secondary"}>{a.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ResponsiveTable>
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader><DialogTitle>Create Staff Wallet</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Wallet Name</Label>
              <Input value={walletName} onChange={(e) => setWalletName(e.target.value)} placeholder="e.g. Petty Cash - John" />
            </div>
            <div>
              <Label>Assign Employee (optional)</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Spending Limit (optional)</Label>
              <Input type="number" value={spendingLimit} onChange={(e) => setSpendingLimit(e.target.value)} placeholder="Leave empty for no limit" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createWallet.mutate()} disabled={!walletName.trim() || createWallet.isPending}>
              {createWallet.isPending ? "Creating..." : "Create Wallet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
