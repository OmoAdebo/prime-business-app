import {
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Users,
  MoreHorizontal,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

const revenueData = [
  { month: "Jan", revenue: 18500, expenses: 12400 },
  { month: "Feb", revenue: 22300, expenses: 14100 },
  { month: "Mar", revenue: 19800, expenses: 13200 },
  { month: "Apr", revenue: 27600, expenses: 15800 },
  { month: "May", revenue: 31200, expenses: 17200 },
  { month: "Jun", revenue: 28900, expenses: 16100 },
  { month: "Jul", revenue: 34500, expenses: 18400 },
];

const weeklyData = [
  { day: "Mon", sales: 42 },
  { day: "Tue", sales: 58 },
  { day: "Wed", sales: 35 },
  { day: "Thu", sales: 67 },
  { day: "Fri", sales: 73 },
  { day: "Sat", sales: 48 },
  { day: "Sun", sales: 29 },
];

const recentActivity = [
  { id: 1, type: "invoice", desc: "Invoice #1024 paid by Acme Corp", amount: "+$3,250.00", time: "2 min ago", positive: true },
  { id: 2, type: "expense", desc: "Office supplies purchased", amount: "-$182.50", time: "1 hour ago", positive: false },
  { id: 3, type: "payroll", desc: "March payroll processed", amount: "-$24,500.00", time: "3 hours ago", positive: false },
  { id: 4, type: "sale", desc: "Online store order #892", amount: "+$459.99", time: "5 hours ago", positive: true },
  { id: 5, type: "invoice", desc: "Invoice #1023 sent to Blue Ltd", amount: "$1,800.00", time: "Yesterday", positive: true },
];

const kpiCards = [
  {
    title: "Total Revenue",
    value: "$182,800",
    change: "+12.5%",
    trend: "up" as const,
    icon: DollarSign,
    desc: "vs last month",
  },
  {
    title: "Net Profit",
    value: "$47,320",
    change: "+8.2%",
    trend: "up" as const,
    icon: TrendingUp,
    desc: "vs last month",
  },
  {
    title: "Total Orders",
    value: "1,284",
    change: "+23.1%",
    trend: "up" as const,
    icon: ShoppingCart,
    desc: "vs last month",
  },
  {
    title: "Active Clients",
    value: "342",
    change: "-2.4%",
    trend: "down" as const,
    icon: Users,
    desc: "vs last month",
  },
];

export default function Dashboard() {
  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back — here's what's happening today.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title} className="group hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <kpi.icon className="h-5 w-5 text-primary" />
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium ${kpi.trend === "up" ? "text-success" : "text-destructive"}`}>
                  {kpi.trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {kpi.change}
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{kpi.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-display">Revenue & Expenses</CardTitle>
              <CardDescription>Monthly financial overview</CardDescription>
            </div>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(168, 55%, 32%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(168, 55%, 32%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(36, 90%, 55%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(36, 90%, 55%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(160, 12%, 89%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(200, 10%, 45%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(200, 10%, 45%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid hsl(160, 12%, 89%)", fontSize: 13 }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                />
                <Area type="monotone" dataKey="revenue" stroke="hsl(168, 55%, 32%)" fill="url(#revenueGrad)" strokeWidth={2} name="Revenue" />
                <Area type="monotone" dataKey="expenses" stroke="hsl(36, 90%, 55%)" fill="url(#expenseGrad)" strokeWidth={2} name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Weekly Sales */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display">Weekly Sales</CardTitle>
            <CardDescription>This week's order count</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(160, 12%, 89%)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "hsl(200, 10%, 45%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(200, 10%, 45%)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(160, 12%, 89%)", fontSize: 13 }} />
                <Bar dataKey="sales" fill="hsl(168, 55%, 32%)" radius={[6, 6, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg font-display">Recent Activity</CardTitle>
            <CardDescription>Latest transactions and events</CardDescription>
          </div>
          <Button variant="outline" size="sm">View All</Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${item.positive ? "bg-success" : "bg-destructive"}`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.desc}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </div>
                <span className={`text-sm font-semibold ${item.positive ? "text-success" : "text-destructive"}`}>
                  {item.amount}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
