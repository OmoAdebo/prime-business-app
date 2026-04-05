import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Search, Filter, BookMarked } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
}

export default function GeneralLedger() {
  const { data: business } = useBusiness();
  const businessId = business?.id;
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("business_id", businessId!)
        .order("transaction_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const { data: journalEntries = [] } = useQuery({
    queryKey: ["journal_entries", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("*, journal_entry_lines(*, accounts(name, code))")
        .eq("business_id", businessId!)
        .order("entry_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const ledgerEntries = transactions
    .filter(t => {
      const matchSearch = !searchTerm || t.description?.toLowerCase().includes(searchTerm.toLowerCase()) || t.category?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = filterType === "all" || t.type === filterType;
      return matchSearch && matchType;
    })
    .map(t => ({
      id: t.id,
      date: t.transaction_date,
      description: t.description || t.category || "Transaction",
      reference: t.reference_number || "—",
      debit: t.type === "expense" ? Number(t.amount) : 0,
      credit: t.type === "income" ? Number(t.amount) : 0,
      type: t.type,
    }));

  let runningBalance = 0;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-display text-foreground">General Ledger</h1>
        <p className="text-muted-foreground mt-1 text-sm">Complete record of all financial transactions.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search entries..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-[140px]"><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : ledgerEntries.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <BookMarked className="h-12 w-12 mb-3 text-muted-foreground/30" />
              <p className="font-medium">No ledger entries yet</p>
              <p className="text-sm mt-1">Record transactions in the Overview to populate the ledger.</p>
            </div>
          ) : (
            <ResponsiveTable>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="hidden sm:table-cell">Reference</TableHead>
                    <TableHead className="text-right">Debit (₦)</TableHead>
                    <TableHead className="text-right">Credit (₦)</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Balance (₦)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerEntries.map(entry => {
                    runningBalance += entry.credit - entry.debit;
                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="text-sm whitespace-nowrap">{format(new Date(entry.date), "dd MMM yyyy")}</TableCell>
                        <TableCell className="font-medium">{entry.description}</TableCell>
                        <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">{entry.reference}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{entry.debit > 0 ? formatNaira(entry.debit) : "—"}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{entry.credit > 0 ? formatNaira(entry.credit) : "—"}</TableCell>
                        <TableCell className={`text-right font-mono text-sm font-semibold hidden sm:table-cell ${runningBalance >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                          {formatNaira(Math.abs(runningBalance))}
                          {runningBalance < 0 ? " DR" : " CR"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ResponsiveTable>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 sm:p-5">
            <p className="text-xs sm:text-sm text-muted-foreground">Total Debits</p>
            <p className="text-lg sm:text-xl font-bold mt-1 text-red-500">{formatNaira(ledgerEntries.reduce((s, e) => s + e.debit, 0))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-5">
            <p className="text-xs sm:text-sm text-muted-foreground">Total Credits</p>
            <p className="text-lg sm:text-xl font-bold mt-1 text-emerald-600">{formatNaira(ledgerEntries.reduce((s, e) => s + e.credit, 0))}</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="p-4 sm:p-5">
            <p className="text-xs sm:text-sm text-muted-foreground">Net Balance</p>
            <p className={`text-lg sm:text-xl font-bold mt-1 ${runningBalance >= 0 ? "text-emerald-600" : "text-red-500"}`}>{formatNaira(Math.abs(runningBalance))}</p>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
