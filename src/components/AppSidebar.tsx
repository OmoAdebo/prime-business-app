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
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppRole } from "@/lib/supabase";
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

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  allowedRoles: AppRole[];
}

const allRoles: AppRole[] = ['super_admin', 'business_owner', 'store_manager', 'accountant', 'employee'];

const mainItems: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, allowedRoles: allRoles },
  { title: "Banking", url: "/banking", icon: Landmark, allowedRoles: ['super_admin', 'business_owner', 'accountant'] },
  { title: "Bookkeeping", url: "/bookkeeping", icon: BookOpen, allowedRoles: ['super_admin', 'business_owner', 'accountant'] },
  { title: "Invoicing", url: "/invoicing", icon: FileText, allowedRoles: ['super_admin', 'business_owner', 'store_manager', 'accountant'] },
];

const operationsItems: NavItem[] = [
  { title: "Inventory", url: "/inventory", icon: Package, allowedRoles: ['super_admin', 'business_owner', 'store_manager', 'employee'] },
  { title: "Payroll & HR", url: "/payroll", icon: Users, allowedRoles: ['super_admin', 'business_owner', 'employee'] },
  { title: "Debt & Credit", url: "/debt-credit", icon: CreditCard, allowedRoles: ['super_admin', 'business_owner', 'accountant'] },
  { title: "Online Store", url: "/store", icon: Store, allowedRoles: ['super_admin', 'business_owner', 'store_manager'] },
];

const insightItems: NavItem[] = [
  { title: "Capital Access", url: "/capital", icon: PiggyBank, allowedRoles: ['super_admin', 'business_owner'] },
  { title: "Reports", url: "/reports", icon: BarChart3, allowedRoles: ['super_admin', 'business_owner', 'store_manager', 'accountant'] },
];

const bottomItems: NavItem[] = [
  { title: "Settings", url: "/settings", icon: Settings, allowedRoles: allRoles },
  { title: "Help & Support", url: "/help", icon: HelpCircle, allowedRoles: allRoles },
];

function filterByRole(items: NavItem[], userRoles: AppRole[]): NavItem[] {
  if (userRoles.length === 0) return items.filter(i => i.allowedRoles.includes('employee'));
  return items.filter(item => userRoles.some(r => item.allowedRoles.includes(r)));
}

interface NavGroupProps {
  label: string;
  items: NavItem[];
  collapsed: boolean;
  userRoles: AppRole[];
}

function NavGroup({ label, items, collapsed, userRoles }: NavGroupProps) {
  const filtered = filterByRole(items, userRoles);
  if (filtered.length === 0) return null;

  return (
    <SidebarGroup>
      {!collapsed && <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {filtered.map((item) => (
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
  const { signOut, profile, roles } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const filteredBottom = filterByRole(bottomItems, roles);

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
              <p className="text-xs text-sidebar-foreground/50">
                {profile?.company_name || 'Business Suite'}
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <Separator className="bg-sidebar-border" />

      <SidebarContent className="px-2 py-2">
        <NavGroup label="Overview" items={mainItems} collapsed={collapsed} userRoles={roles} />
        <NavGroup label="Operations" items={operationsItems} collapsed={collapsed} userRoles={roles} />
        <NavGroup label="Insights" items={insightItems} collapsed={collapsed} userRoles={roles} />
      </SidebarContent>

      <Separator className="bg-sidebar-border" />

      <SidebarFooter className="px-2 py-2">
        <SidebarMenu>
          {filteredBottom.map((item) => (
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
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground/50 transition-all hover:bg-destructive/10 hover:text-destructive cursor-pointer"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="text-sm">Sign Out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
