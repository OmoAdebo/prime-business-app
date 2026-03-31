import { ModuleLayout, ModuleNavItem } from "@/components/ModuleLayout";
import {
  Package, ShoppingBag, Layers, ClipboardList, Truck,
  Tags, BarChart3, Settings,
} from "lucide-react";

const inventoryNav: ModuleNavItem[] = [
  { title: "Overview", path: "/inventory", icon: Package },
  { title: "Products", path: "/inventory/products", icon: ShoppingBag },
  { title: "Stock Management", path: "/inventory/stock", icon: Layers },
  { title: "Purchase Orders", path: "/inventory/purchase-orders", icon: ClipboardList },
  { title: "Suppliers", path: "/inventory/suppliers", icon: Truck },
  { title: "Categories", path: "/inventory/categories", icon: Tags },
  { title: "Reports", path: "/inventory/reports", icon: BarChart3 },
  { title: "Settings", path: "/inventory/settings", icon: Settings },
];

export default function InventoryLayout() {
  return <ModuleLayout title="Inventory" icon={Package} navItems={inventoryNav} />;
}
