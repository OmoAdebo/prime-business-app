import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import { BarChart3, Download, TrendingUp, TrendingDown, DollarSign, Package, Users, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2, 150 60% 50%))", "hsl(var(--chart-3, 30 80% 55%))", "hsl(var(--chart-4, 280 60% 55%))", "hsl(var(--chart-5, 0 70% 55%))"];

export default function Reports() {
  const { data: business } = useBusiness();
  const [period, setPeriod] = useState("6");

  // Transactions
  const { data: transactions = [] } = useQuery({
    queryKey: ["report-transactions", business?.id, period],
    queryFn: async () => {
      const since = subMonths(new Date(), Number(period)).toISOString();
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("business_id", business!.id)
        .gte("transaction_date", since.split("T")[0])
        .order("transaction_date");
      if (error) throw error;
      return data;
    },
    enabled: !!business,
  });

  // Sales
  const { data: sales = [] } = useQuery({
    queryKey: ["report-sales", business?.id, period],
    queryFn: async () => {
      const since = subMonths(new Date(), Number(period)).toISOString();
      const { data, error } = await supabase
        .from("sales")
        .select("*, sale_items(*)")
        .eq("business_id", business!.id)
        .gte("created_at", since)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!business,
  });

  // Products
  const { data: products = [] } = useQuery({
    queryKey: ["report-products", business?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("business_id", business!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!business,
  });

  // Employees
  const { data: employees = [] } = useQuery({
    queryKey: ["report-employees", business?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees_hr")
        .select("*")
        .eq("business_id", business!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!business,
  });

  // Invoices
  const { data: invoices = [] } = useQuery({
    queryKey: ["report-invoices", business?.id, period],
    queryFn: async () => {
      const since = subMonths(new Date(), Number(period)).toISOString();
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("business_id", business!.id)
        .gte("issue_date", since.split("T")[0]);
      if (error) throw error;
      return data;
    },
    enabled: !!business,
  });

  if (!business) {
    return <div className="p-6"><Card><CardContent className="p-12 text-center text-muted-foreground">Register your business to view reports.</CardContent></Card></div>;
  }

  // P&L calculations
  const totalIncome = transactions.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + Number(t.amount), 0);
  const totalExpenses = transactions.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + Number(t.amount), 0);
  const netProfit = totalIncome - totalExpenses;
  const totalVat = transactions.reduce((s: number, t: any) => s + Number(t.vat_amount || 0), 0);

  // Monthly revenue chart data
  const monthlyData: Record<string, { month: string; income: number; expenses: number }> = {};
  for (let i = Number(period) - 1; i >= 0; i--) {
    const d = subMonths(new Date(), i);
    const key = format(d, "yyyy-MM");
    monthlyData[key] = { month: format(d, "MMM yy"), income: 0, expenses: 0 };
  }
  transactions.forEach((t: any) => {
    const key = t.transaction_date.slice(0, 7);
    if (monthlyData[key]) {
      if (t.type === "income") monthlyData[key].income += Number(t.amount);
      else monthlyData[key].expenses += Number(t.amount);
    }
  });
  const monthlyChartData = Object.values(monthlyData);

  // Expense by category
  const categoryMap: Record<string, number> = {};
  transactions.filter((t: any) => t.type === "expense").forEach((t: any) => {
    const cat = t.category || "Uncategorized";
    categoryMap[cat] = (categoryMap[cat] || 0) + Number(t.amount);
  });
  const categoryData = Object.entries(categoryMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Sales summary
  const totalSalesRevenue = sales.reduce((s: number, sale: any) => s + Number(sale.total_amount), 0);
  const totalSalesCount = sales.length;

  // Top products by sales
  const productSales: Record<string, { name: string; qty: number; revenue: number }> = {};
  sales.forEach((s: any) => {
    (s.sale_items || []).forEach((si: any) => {
      if (!productSales[si.product_name]) productSales[si.product_name] = { name: si.product_name, qty: 0, revenue: 0 };
      productSales[si.product_name].qty += Number(si.quantity);
      productSales[si.product_name].revenue += Number(si.total_price);
    });
  });
  const topProducts = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  // Export CSV helper
  const exportCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csv = [headers.join(","), ...data.map(r => headers.map(h => `"${r[h] ?? ""}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${filename}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const chartConfig = {
    income: { label: "Income", color: "hsl(var(--primary))" },
    expenses: { label: "Expenses", color: "hsl(var(--destructive))" },
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground">Comprehensive business insights and performance metrics</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Last 3 months</SelectItem>
            <SelectItem value="6">Last 6 months</SelectItem>
            <SelectItem value="12">Last 12 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">Total Income</p>
                <p className="text-xl font-bold">₦{totalIncome.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-8 w-8 text-destructive" />
              <div>
                <p className="text-xs text-muted-foreground">Total Expenses</p>
                <p className="text-xl font-bold">₦{totalExpenses.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className={`h-8 w-8 ${netProfit >= 0 ? "text-green-600" : "text-destructive"}`} />
              <div>
                <p className="text-xs text-muted-foreground">Net Profit</p>
                <p className="text-xl font-bold">₦{netProfit.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Sales Revenue</p>
                <p className="text-xl font-bold">₦{totalSalesRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="financial">
        <div className="overflow-x-auto scrollbar-thin">
          <TabsList className="flex-nowrap w-max sm:w-auto">
            <TabsTrigger value="financial" className="min-h-[44px]"><DollarSign className="h-4 w-4 mr-1" />Financial</TabsTrigger>
            <TabsTrigger value="sales" className="min-h-[44px]"><BarChart3 className="h-4 w-4 mr-1" />Sales</TabsTrigger>
            <TabsTrigger value="inventory" className="min-h-[44px]"><Package className="h-4 w-4 mr-1" />Inventory</TabsTrigger>
            <TabsTrigger value="employees" className="min-h-[44px]"><Users className="h-4 w-4 mr-1" />Employees</TabsTrigger>
          </TabsList>
        </div>

        {/* Financial Reports */}
        <TabsContent value="financial" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => exportCSV(transactions.map((t: any) => ({
              Date: t.transaction_date, Type: t.type, Category: t.category, Description: t.description, Amount: t.amount, VAT: t.vat_amount
            })), "financial-report")}>
              <Download className="h-4 w-4 mr-1" />Export CSV
            </Button>
          </div>

          {/* Revenue vs Expenses Chart */}
          <Card>
            <CardHeader><CardTitle>Revenue vs Expenses</CardTitle></CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Expense Breakdown */}
            <Card>
              <CardHeader><CardTitle>Expense Breakdown</CardTitle></CardHeader>
              <CardContent>
                {categoryData.length > 0 ? (
                  <div className="space-y-3">
                    {categoryData.slice(0, 8).map((cat, i) => (
                      <div key={cat.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-sm">{cat.name}</span>
                        </div>
                        <span className="font-medium text-sm">₦{cat.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No expense data</p>
                )}
              </CardContent>
            </Card>

            {/* P&L Summary */}
            <Card>
              <CardHeader><CardTitle>Profit & Loss Summary</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    <TableRow><TableCell className="font-medium">Total Revenue</TableCell><TableCell className="text-right font-medium text-green-600">₦{totalIncome.toLocaleString()}</TableCell></TableRow>
                    <TableRow><TableCell className="font-medium">Total Expenses</TableCell><TableCell className="text-right font-medium text-destructive">₦{totalExpenses.toLocaleString()}</TableCell></TableRow>
                    <TableRow><TableCell className="font-medium">VAT Collected</TableCell><TableCell className="text-right">₦{totalVat.toLocaleString()}</TableCell></TableRow>
                    <TableRow className="border-t-2">
                      <TableCell className="font-bold">Net Profit / Loss</TableCell>
                      <TableCell className={`text-right font-bold ${netProfit >= 0 ? "text-green-600" : "text-destructive"}`}>₦{netProfit.toLocaleString()}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-muted-foreground">Profit Margin</TableCell>
                      <TableCell className="text-right">{totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : 0}%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Invoice Summary */}
          <Card>
            <CardHeader><CardTitle>Invoice Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {["draft", "sent", "paid", "overdue"].map(status => {
                  const count = invoices.filter((i: any) => i.status === status).length;
                  const total = invoices.filter((i: any) => i.status === status).reduce((s: number, i: any) => s + Number(i.total_amount), 0);
                  return (
                    <div key={status} className="p-3 border rounded-lg">
                      <p className="text-xs text-muted-foreground capitalize">{status}</p>
                      <p className="font-bold">{count}</p>
                      <p className="text-sm text-muted-foreground">₦{total.toLocaleString()}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales Reports */}
        <TabsContent value="sales" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => exportCSV(sales.map((s: any) => ({
              Date: format(new Date(s.created_at), "yyyy-MM-dd"), SaleNumber: s.sale_number, Items: s.sale_items?.length || 0,
              Subtotal: s.subtotal, VAT: s.vat_amount, Total: s.total_amount, PaymentMethod: s.payment_method, Status: s.status
            })), "sales-report")}>
              <Download className="h-4 w-4 mr-1" />Export CSV
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Sales</p><p className="text-2xl font-bold">{totalSalesCount}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Revenue</p><p className="text-2xl font-bold">₦{totalSalesRevenue.toLocaleString()}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Avg Order Value</p><p className="text-2xl font-bold">₦{totalSalesCount > 0 ? Math.round(totalSalesRevenue / totalSalesCount).toLocaleString() : 0}</p></CardContent></Card>
          </div>

          {/* Top Products */}
          <Card>
            <CardHeader><CardTitle>Top Selling Products</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty Sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.map((p, i) => (
                    <TableRow key={p.name}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-right">{p.qty}</TableCell>
                      <TableCell className="text-right">₦{p.revenue.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {topProducts.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No sales data</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Reports */}
        <TabsContent value="inventory" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => exportCSV(products.map((p: any) => ({
              Name: p.name, SKU: p.sku, Category: p.category, CostPrice: p.cost_price, UnitPrice: p.unit_price, Active: p.is_active
            })), "inventory-report")}>
              <Download className="h-4 w-4 mr-1" />Export CSV
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Products</p><p className="text-2xl font-bold">{products.length}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Active Products</p><p className="text-2xl font-bold">{products.filter((p: any) => p.is_active).length}</p></CardContent></Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Inventory Value</p>
                <p className="text-2xl font-bold">₦{products.reduce((s: number, p: any) => s + Number(p.cost_price), 0).toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>

          {/* Products by category */}
          <Card>
            <CardHeader><CardTitle>Products by Category</CardTitle></CardHeader>
            <CardContent>
              {(() => {
                const cats: Record<string, number> = {};
                products.forEach((p: any) => { cats[p.category || "Uncategorized"] = (cats[p.category || "Uncategorized"] || 0) + 1; });
                const catArr = Object.entries(cats).sort((a, b) => b[1] - a[1]);
                return catArr.length > 0 ? (
                  <div className="space-y-2">
                    {catArr.map(([cat, count], i) => (
                      <div key={cat} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-sm">{cat}</span>
                        </div>
                        <span className="font-medium text-sm">{count} products</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-center text-muted-foreground py-4">No products</p>;
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Employee Reports */}
        <TabsContent value="employees" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => exportCSV(employees.map((e: any) => ({
              Name: e.full_name, Position: e.position, Department: e.department_id, EmploymentType: e.employment_type, Salary: e.basic_salary, Status: e.status, HireDate: e.hire_date
            })), "employee-report")}>
              <Download className="h-4 w-4 mr-1" />Export CSV
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Employees</p><p className="text-2xl font-bold">{employees.length}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Active</p><p className="text-2xl font-bold">{employees.filter((e: any) => e.status === "active").length}</p></CardContent></Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total Monthly Payroll</p>
                <p className="text-2xl font-bold">₦{employees.filter((e: any) => e.status === "active").reduce((s: number, e: any) => s + Number(e.basic_salary), 0).toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Employee Directory</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Salary</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp: any) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.full_name}</TableCell>
                      <TableCell>{emp.position || "—"}</TableCell>
                      <TableCell className="capitalize">{emp.employment_type?.replace("_", " ")}</TableCell>
                      <TableCell className="text-right">₦{Number(emp.basic_salary).toLocaleString()}</TableCell>
                      <TableCell className="capitalize">{emp.status}</TableCell>
                    </TableRow>
                  ))}
                  {employees.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No employees</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
