import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { GitCompare, CheckCircle2, Circle } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
}

export default function Reconciliation() {
  const { data: business } = useBusiness();
  const queryClient = useQueryClient();
  const businessId = business?.id;

  const { data: bankTransactions = [], isLoading } = useQuery({
    queryKey: ["bank_transactions", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_transactions")
        .select("*, bank_accounts(account_name)")
        .eq("business_id", businessId!)
        .order("transaction_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const reconcileMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bank_transactions").update({ is_reconciled: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank_transactions"] });
      toast({ title: "Transaction reconciled" });
    },
  });

  const unreconciled = bankTransactions.filter(t => !t.is_reconciled);
  const reconciled = bankTransactions.filter(t => t.is_reconciled);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-display text-foreground">Reconciliation</h1>
        <p className="text-muted-foreground mt-1 text-sm">Match bank transactions to your bookkeeping records.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 sm:p-5">
            <p className="text-xs sm:text-sm text-muted-foreground">Total Transactions</p>
            <p className="text-xl sm:text-2xl font-bold mt-1">{bankTransactions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-5">
            <p className="text-xs sm:text-sm text-muted-foreground">Unreconciled</p>
            <p className="text-xl sm:text-2xl font-bold mt-1 text-amber-600">{unreconciled.length}</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="p-4 sm:p-5">
            <p className="text-xs sm:text-sm text-muted-foreground">Reconciled</p>
            <p className="text-xl sm:text-2xl font-bold mt-1 text-emerald-600">{reconciled.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Unreconciled Transactions</CardTitle>
          <CardDescription>Review and mark transactions as reconciled</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : unreconciled.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <GitCompare className="h-12 w-12 mb-3 text-muted-foreground/30" />
              <p className="font-medium">All transactions are reconciled</p>
              <p className="text-sm mt-1">No pending transactions to review.</p>
            </div>
          ) : (
            <ResponsiveTable>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="hidden sm:table-cell">Account</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unreconciled.map(tx => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm whitespace-nowrap">{format(new Date(tx.transaction_date), "dd MMM yyyy")}</TableCell>
                      <TableCell className="text-sm hidden sm:table-cell">{(tx as any).bank_accounts?.account_name || "—"}</TableCell>
                      <TableCell className="font-medium">{tx.description || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={tx.type === "credit" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}>
                          {tx.type}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${tx.type === "credit" ? "text-emerald-600" : "text-red-500"}`}>
                        {formatNaira(Number(tx.amount))}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" className="gap-1 h-9 min-h-[44px]" onClick={() => reconcileMutation.mutate(tx.id)}>
                          <CheckCircle2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Reconcile</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ResponsiveTable>
          )}
        </CardContent>
      </Card>

      {reconciled.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recently Reconciled</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ResponsiveTable>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="hidden sm:table-cell">Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reconciled.slice(0, 10).map(tx => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm whitespace-nowrap">{format(new Date(tx.transaction_date), "dd MMM yyyy")}</TableCell>
                      <TableCell className="font-medium">{tx.description || "—"}</TableCell>
                      <TableCell className="hidden sm:table-cell"><Badge variant="outline">{tx.type}</Badge></TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatNaira(Number(tx.amount))}</TableCell>
                      <TableCell><Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Reconciled</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ResponsiveTable>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
