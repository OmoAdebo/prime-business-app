import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--destructive))", "#f59e0b", "#10b981", "#6366f1", "#ec4899"];

export default function BankingAnalytics() {
  const { data: business } = useBusiness();
  const businessId = business?.id;

  const { data: transactions = [] } = useQuery({
    queryKey: ["bank-transactions", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from("bank_transactions").select("*").eq("business_id", businessId!).order("transaction_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  // Monthly income vs expenses
  const monthlyData = transactions.reduce((acc: Record<string, { month: string; income: number; expenses: number }>, t) => {
    const month = new Date(t.transaction_date).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    if (!acc[month]) acc[month] = { month, income: 0, expenses: 0 };
    if (t.type === "credit") acc[month].income += t.amount;
    else acc[month].expenses += t.amount;
    return acc;
  }, {});
  const chartData = Object.values(monthlyData).reverse().slice(-6);

  // Category breakdown
  const categoryData = transactions.reduce((acc: Record<string, number>, t) => {
    const cat = t.category || "Uncategorized";
    acc[cat] = (acc[cat] || 0) + t.amount;
    return acc;
  }, {});
  const pieData = Object.entries(categoryData).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);

  const totalIncome = transactions.filter(t => t.type === "credit").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === "debit").reduce((s, t) => s + t.amount, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Analytics</h2>
        <p className="text-sm text-muted-foreground">Income vs expenses and category breakdown</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Total Income</CardDescription></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">₦{totalIncome.toLocaleString()}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Total Expenses</CardDescription></CardHeader><CardContent><p className="text-2xl font-bold text-destructive">₦{totalExpenses.toLocaleString()}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Net Cash Flow</CardDescription></CardHeader><CardContent><p className={`text-2xl font-bold ${totalIncome - totalExpenses >= 0 ? "text-green-600" : "text-destructive"}`}>₦{(totalIncome - totalExpenses).toLocaleString()}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Income vs Expenses</CardTitle><CardDescription>Monthly comparison</CardDescription></CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="income" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Income" />
                  <Bar dataKey="expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Spending by Category</CardTitle><CardDescription>Top categories</CardDescription></CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name }) => name}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `₦${v.toLocaleString()}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
