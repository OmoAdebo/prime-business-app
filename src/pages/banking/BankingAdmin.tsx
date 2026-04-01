import { useState } from "react";
import { Shield, Plus, Wallet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion } from "framer-motion";

export default function BankingAdmin() {
  const { data: business } = useBusiness();
  const businessId = business?.id;

  const { data: accounts = [] } = useQuery({
    queryKey: ["bank-accounts", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from("bank_accounts").select("*").eq("business_id", businessId!).order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  // Staff wallets = accounts with account_type containing 'wallet' or specific naming
  const staffWallets = accounts.filter(a => a.account_type === "wallet" || a.account_name.toLowerCase().includes("wallet"));
  const bankAccounts = accounts.filter(a => a.account_type !== "wallet" && !a.account_name.toLowerCase().includes("wallet"));

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Banking Administration</h2>
        <p className="text-sm text-muted-foreground">Manage staff wallets, permissions, and spending controls</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Total Accounts</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold">{accounts.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Staff Wallets</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold">{staffWallets.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Active Accounts</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold">{accounts.filter(a => a.is_active).length}</p></CardContent>
        </Card>
      </div>

      {/* Staff Wallets */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" />Staff Wallets</CardTitle>
            <CardDescription>Sub-accounts created for employees</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.location.href = "/banking/accounts"}>
            <Plus className="h-4 w-4 mr-2" />Create Wallet
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Wallet Name</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffWallets.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No staff wallets yet. Create a wallet account from the Accounts page with type "wallet".</TableCell></TableRow>
              ) : (
                staffWallets.map(w => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">{w.account_name}</TableCell>
                    <TableCell>₦{w.current_balance.toLocaleString()}</TableCell>
                    <TableCell>{w.currency}</TableCell>
                    <TableCell><Badge variant={w.is_active ? "default" : "secondary"}>{w.is_active ? "Active" : "Frozen"}</Badge></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* All Bank Accounts */}
      <Card>
        <CardHeader>
          <CardTitle>All Bank Accounts</CardTitle>
          <CardDescription>Overview of all business bank accounts</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bankAccounts.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.account_name}</TableCell>
                  <TableCell>{a.bank_name}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{a.account_type}</Badge></TableCell>
                  <TableCell>₦{a.current_balance.toLocaleString()}</TableCell>
                  <TableCell><Badge variant={a.is_active ? "default" : "secondary"}>{a.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>
  );
}
