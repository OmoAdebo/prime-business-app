import {
  LayoutDashboard,
  Landmark,
  BookOpen,
  Package,
  Users,
  CreditCard,
  FileText,
  Store,
  PiggyBank,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Banking", url: "/banking", icon: Landmark },
  { title: "Bookkeeping", url: "/bookkeeping", icon: BookOpen },
  { title: "Invoicing", url: "/invoicing", icon: FileText },
];

const operationsItems = [
  { title: "Inventory", url: "/inventory", icon: Package },
  { title: "Payroll & HR", url: "/payroll", icon: Users },
  { title: "Debt & Credit", url: "/debt-credit", icon: CreditCard },
  { title: "Online Store", url: "/store", icon: Store },
];

const insightItems = [
  { title: "Capital Access", url: "/capital", icon: PiggyBank },
  { title: "Reports", url: "/reports", icon: BarChart3 },
];

const bottomItems = [
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Help & Support", url: "/help", icon: HelpCircle },
];

interface NavGroupProps {
  label: string;
  items: typeof mainItems;
  collapsed: boolean;
}

function NavGroup({ label, items, collapsed }: NavGroupProps) {
  return (
    <SidebarGroup>
      {!collapsed && <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink
                  to={item.url}
                  end
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/70 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold text-sm">
            P
          </div>
          {!collapsed && (
            <div>
              <h2 className="text-sm font-semibold text-sidebar-foreground font-display">Prime</h2>
              <p className="text-xs text-sidebar-foreground/50">Business Suites</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <Separator className="bg-sidebar-border" />

      <SidebarContent className="px-2 py-2">
        <NavGroup label="Overview" items={mainItems} collapsed={collapsed} />
        <NavGroup label="Operations" items={operationsItems} collapsed={collapsed} />
        <NavGroup label="Insights" items={insightItems} collapsed={collapsed} />
      </SidebarContent>

      <Separator className="bg-sidebar-border" />

      <SidebarFooter className="px-2 py-2">
        <SidebarMenu>
          {bottomItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink
                  to={item.url}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/50 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  activeClassName="text-sidebar-primary"
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="text-sm">{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
