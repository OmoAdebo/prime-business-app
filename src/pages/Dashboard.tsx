import {
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Users,
  MoreHorizontal,
  BarChart3,
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

// Placeholder data — will be replaced with real data from the database
const revenueData = [
  { month: "Jan", revenue: 0, expenses: 0 },
  { month: "Feb", revenue: 0, expenses: 0 },
  { month: "Mar", revenue: 0, expenses: 0 },
  { month: "Apr", revenue: 0, expenses: 0 },
  { month: "May", revenue: 0, expenses: 0 },
  { month: "Jun", revenue: 0, expenses: 0 },
  { month: "Jul", revenue: 0, expenses: 0 },
];

const weeklyData = [
  { day: "Mon", sales: 0 },
  { day: "Tue", sales: 0 },
  { day: "Wed", sales: 0 },
  { day: "Thu", sales: 0 },
  { day: "Fri", sales: 0 },
  { day: "Sat", sales: 0 },
  { day: "Sun", sales: 0 },
];

const kpiCards = [
  {
    title: "Total Revenue",
    value: "₦0.00",
    change: "—",
    trend: "up" as const,
    icon: DollarSign,
    desc: "No data yet",
  },
  {
    title: "Net Profit",
    value: "₦0.00",
    change: "—",
    trend: "up" as const,
    icon: TrendingUp,
    desc: "No data yet",
  },
  {
    title: "Total Orders",
    value: "0",
    change: "—",
    trend: "up" as const,
    icon: ShoppingCart,
    desc: "No data yet",
  },
  {
    title: "Active Clients",
    value: "0",
    change: "—",
    trend: "up" as const,
    icon: Users,
    desc: "No data yet",
  },
];

export default function Dashboard() {
  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome — here's your business overview.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title} className="group hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-5">
              <div className="flex items-center justify-between">
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-primary/10">
                  <kpi.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                {kpi.change !== "—" && (
                  <div className={`flex items-center gap-1 text-xs font-medium ${kpi.trend === "up" ? "text-success" : "text-destructive"}`}>
                    {kpi.trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {kpi.change}
                  </div>
                )}
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
            <div className="flex flex-col items-center justify-center h-[260px] text-muted-foreground">
              <BarChart3 className="h-12 w-12 mb-3 text-muted-foreground/40" />
              <p className="text-sm font-medium">No financial data yet</p>
              <p className="text-xs mt-1">Revenue and expense data will appear here once transactions are recorded.</p>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Sales */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display">Weekly Sales</CardTitle>
            <CardDescription>This week's order count</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center h-[260px] text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mb-3 text-muted-foreground/40" />
              <p className="text-sm font-medium">No sales data yet</p>
              <p className="text-xs mt-1">Sales will appear here once orders are processed.</p>
            </div>
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
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p className="text-sm font-medium">No recent activity</p>
            <p className="text-xs mt-1">Your latest transactions and events will show up here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
