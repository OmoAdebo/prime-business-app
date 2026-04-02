import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Receipt, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
}

export default function Tax() {
  const { data: business } = useBusiness();
  const businessId = business?.id;

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from("transactions").select("*").eq("business_id", businessId!).order("transaction_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const vatTransactions = transactions.filter(t => Number(t.vat_amount) > 0);
  const totalVatCollected = vatTransactions.filter(t => t.type === "income").reduce((s, t) => s + Number(t.vat_amount), 0);
  const totalVatPaid = vatTransactions.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.vat_amount), 0);
  const netVatPayable = totalVatCollected - totalVatPaid;
  const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);

  // Group by month
  const byMonth = vatTransactions.reduce<Record<string, { collected: number; paid: number; count: number }>>((acc, t) => {
    const month = format(new Date(t.transaction_date), "yyyy-MM");
    if (!acc[month]) acc[month] = { collected: 0, paid: 0, count: 0 };
    if (t.type === "income") acc[month].collected += Number(t.vat_amount);
    else acc[month].paid += Number(t.vat_amount);
    acc[month].count++;
    return acc;
  }, {});

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">Tax Management</h1>
        <p className="text-muted-foreground mt-1">Track VAT liability and prepare for tax filings.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">VAT Collected (Output)</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{formatNaira(totalVatCollected)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">VAT Paid (Input)</p>
            <p className="text-2xl font-bold mt-1 text-red-500">{formatNaira(totalVatPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Net VAT Payable</p>
            <p className={`text-2xl font-bold mt-1 ${netVatPayable >= 0 ? "text-amber-600" : "text-emerald-600"}`}>{formatNaira(Math.abs(netVatPayable))}</p>
            <p className="text-xs text-muted-foreground mt-1">{netVatPayable >= 0 ? "Due to FIRS" : "Refund expected"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Effective Tax Rate</p>
            <p className="text-2xl font-bold mt-1 text-primary">{totalIncome > 0 ? ((totalVatCollected / totalIncome) * 100).toFixed(1) : "0.0"}%</p>
          </CardContent>
        </Card>
      </div>

      {/* VAT Notice */}
      {netVatPayable > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">VAT Payment Reminder</p>
              <p className="text-sm text-muted-foreground mt-1">You have {formatNaira(netVatPayable)} in net VAT payable. VAT returns are due by the 21st of the following month to the Federal Inland Revenue Service (FIRS).</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly VAT Summary</CardTitle>
          <CardDescription>VAT collected and paid by month</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : Object.keys(byMonth).length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <Receipt className="h-12 w-12 mb-3 text-muted-foreground/30" />
              <p className="font-medium">No VAT transactions yet</p>
              <p className="text-sm mt-1">Record transactions with VAT to see your tax summary.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Transactions</TableHead>
                  <TableHead className="text-right">Output VAT (₦)</TableHead>
                  <TableHead className="text-right">Input VAT (₦)</TableHead>
                  <TableHead className="text-right">Net Payable (₦)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(byMonth).sort((a, b) => b[0].localeCompare(a[0])).map(([month, data]) => {
                  const net = data.collected - data.paid;
                  return (
                    <TableRow key={month}>
                      <TableCell className="font-medium">{format(new Date(month + "-01"), "MMMM yyyy")}</TableCell>
                      <TableCell>{data.count}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-emerald-600">{formatNaira(data.collected)}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-red-500">{formatNaira(data.paid)}</TableCell>
                      <TableCell className={`text-right font-mono text-sm font-semibold ${net >= 0 ? "text-amber-600" : "text-emerald-600"}`}>{formatNaira(Math.abs(net))}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent VAT Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent VAT Transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {vatTransactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No VAT transactions</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">VAT (7.5%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vatTransactions.slice(0, 15).map(tx => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-sm">{format(new Date(tx.transaction_date), "dd MMM yyyy")}</TableCell>
                    <TableCell className="font-medium">{tx.description || tx.category || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={tx.type === "income" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}>
                        {tx.type === "income" ? "Output" : "Input"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatNaira(Number(tx.amount))}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">{formatNaira(Number(tx.vat_amount))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
