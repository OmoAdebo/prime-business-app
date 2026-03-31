import { ModuleLayout, ModuleNavItem } from "@/components/ModuleLayout";
import {
  BookOpen, BookMarked, FileEdit, ListTree, FileBarChart,
  GitCompare, Receipt, Settings,
} from "lucide-react";

const bookkeepingNav: ModuleNavItem[] = [
  { title: "Overview", path: "/bookkeeping", icon: BookOpen },
  { title: "General Ledger", path: "/bookkeeping/general-ledger", icon: BookMarked },
  { title: "Journal Entries", path: "/bookkeeping/journal-entries", icon: FileEdit },
  { title: "Chart of Accounts", path: "/bookkeeping/chart-of-accounts", icon: ListTree },
  { title: "Financial Statements", path: "/bookkeeping/financial-statements", icon: FileBarChart },
  { title: "Reconciliation", path: "/bookkeeping/reconciliation", icon: GitCompare },
  { title: "Tax", path: "/bookkeeping/tax", icon: Receipt },
  { title: "Settings", path: "/bookkeeping/settings", icon: Settings },
];

export default function BookkeepingLayout() {
  return <ModuleLayout title="Bookkeeping" icon={BookOpen} navItems={bookkeepingNav} />;
}
