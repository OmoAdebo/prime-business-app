import { ModuleLayout, ModuleNavItem } from "@/components/ModuleLayout";
import {
  Landmark, Wallet, ArrowLeftRight, ArrowUpDown, BarChart3,
  Clock, Users, Shield, Bell, Settings, CreditCard,
} from "lucide-react";

const bankingNav: ModuleNavItem[] = [
  { title: "Overview", path: "/banking", icon: Landmark },
  { title: "Accounts", path: "/banking/accounts", icon: Wallet },
  { title: "Payments", path: "/banking/payments", icon: CreditCard },
  { title: "Transactions", path: "/banking/transactions", icon: ArrowLeftRight },
  { title: "Transfers", path: "/banking/transfers", icon: ArrowUpDown },
  { title: "Analytics", path: "/banking/analytics", icon: BarChart3 },
  { title: "Scheduled", path: "/banking/scheduled", icon: Clock },
  { title: "Beneficiaries", path: "/banking/beneficiaries", icon: Users },
  { title: "Admin", path: "/banking/admin", icon: Shield },
  { title: "Alerts", path: "/banking/alerts", icon: Bell },
  { title: "Settings", path: "/banking/settings", icon: Settings },
];


export default function BankingLayout() {
  return <ModuleLayout title="Banking" icon={Landmark} navItems={bankingNav} />;
}
