import { Landmark, ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function BankingOverview() {
  const { data: business } = useBusiness();
  const navigate = useNavigate();
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

  const { data: transactions = [] } = useQuery({
    queryKey: ["bank-transactions", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from("bank_transactions").select("*, bank_accounts(account_name, bank_name)").eq("business_id", businessId!).order("transaction_date", { ascending: false }).limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const totalBalance = accounts.reduce((s, a) => s + a.current_balance, 0);
  const totalIncome = transactions.filter(t => t.type === "credit").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === "debit").reduce((s, t) => s + t.amount, 0);

  if (!business) {
    return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">Please set up your business profile first.</p></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2"><CardDescription>Total Balance</CardDescription></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">₦{totalBalance.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{accounts.length} account(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Income (Recent)</CardDescription></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <p className="text-2xl font-bold text-green-600">₦{totalIncome.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Expenses (Recent)</CardDescription></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <p className="text-2xl font-bold text-destructive">₦{totalExpenses.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Pending Reconciliation</CardDescription></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{transactions.filter(t => !t.is_reconciled).length}</p>
            <p className="text-xs text-muted-foreground">transactions</p>
          </CardContent>
        </Card>
      </div>

      {/* Accounts Quick View */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Accounts</CardTitle>
          <Button variant="outline" size="sm" onClick={() => navigate("/banking/accounts")}>View All</Button>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No accounts yet. Go to Accounts to add one.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {accounts.slice(0, 6).map(a => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Wallet className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{a.account_name}</p>
                    <p className="text-xs text-muted-foreground">{a.bank_name}</p>
                  </div>
                  <p className="font-semibold text-sm">₦{a.current_balance.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Transactions</CardTitle>
          <Button variant="outline" size="sm" onClick={() => navigate("/banking/transactions")}>View All</Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No transactions yet</TableCell></TableRow>
              ) : (
                transactions.map(t => (
                  <TableRow key={t.id}>
                    <TableCell>{new Date(t.transaction_date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-sm">{(t as any).bank_accounts?.account_name}</TableCell>
                    <TableCell>{t.description || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {t.type === "credit" ? <ArrowDownRight className="h-4 w-4 text-green-600" /> : <ArrowUpRight className="h-4 w-4 text-destructive" />}
                        <span className="capitalize">{t.type}</span>
                      </div>
                    </TableCell>
                    <TableCell className={t.type === "credit" ? "text-green-600 font-medium" : "text-destructive font-medium"}>
                      {t.type === "credit" ? "+" : "-"}₦{t.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.is_reconciled ? "default" : "outline"}>
                        {t.is_reconciled ? "Reconciled" : "Pending"}
                      </Badge>
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
