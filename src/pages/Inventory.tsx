import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/hooks/use-business";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package, Plus, MapPin, Truck, AlertTriangle, Search,
  ArrowRightLeft, Users, ShoppingBag, BarChart3
} from "lucide-react";
import { motion } from "framer-motion";

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
}

const PRODUCT_CATEGORIES = [
  "Electronics", "Food & Beverages", "Clothing", "Health & Beauty",
  "Home & Garden", "Office Supplies", "Raw Materials", "Packaging", "Other"
];

export default function Inventory() {
  const { user } = useAuth();
  const { data: business, isLoading: bizLoading } = useBusiness();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("products");
  const [searchTerm, setSearchTerm] = useState("");

  const businessId = business?.id;

  // Products
  const { data: products = [], isLoading: prodLoading } = useQuery({
    queryKey: ["products", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("business_id", businessId!).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  // Locations
  const { data: locations = [], isLoading: locLoading } = useQuery({
    queryKey: ["inventory_locations", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from("inventory_locations").select("*").eq("business_id", businessId!).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  // Stock levels
  const { data: stockLevels = [] } = useQuery({
    queryKey: ["stock_levels", businessId],
    queryFn: async () => {
      const prodIds = products.map(p => p.id);
      if (prodIds.length === 0) return [];
      const { data, error } = await supabase.from("stock_levels").select("*, products(name), inventory_locations(name)").in("product_id", prodIds);
      if (error) throw error;
      return data;
    },
    enabled: !!businessId && products.length > 0,
  });

  // Suppliers
  const { data: suppliers = [], isLoading: suppLoading } = useQuery({
    queryKey: ["suppliers", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*").eq("business_id", businessId!).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  // Stock movements
  const { data: movements = [] } = useQuery({
    queryKey: ["stock_movements", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from("stock_movements").select("*, products(name)").eq("business_id", businessId!).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  // Summary calculations
  const totalProducts = products.length;
  const totalStockValue = products.reduce((s, p) => {
    const qty = stockLevels.filter(sl => sl.product_id === p.id).reduce((q, sl) => q + sl.quantity, 0);
    return s + qty * Number(p.cost_price);
  }, 0);
  const lowStockProducts = products.filter(p => {
    const qty = stockLevels.filter(sl => sl.product_id === p.id).reduce((q, sl) => q + sl.quantity, 0);
    return qty <= (p.low_stock_threshold || 10);
  });

  const filteredProducts = products.filter(p =>
    !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (bizLoading) return <div className="space-y-4 max-w-7xl"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;

  if (!business) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Package className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold">No Business Found</h2>
        <p className="text-muted-foreground mt-2">Register your business in Settings first.</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Smart Inventory</h1>
          <p className="text-muted-foreground mt-1">Track products, stock levels, and suppliers.</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Total Products", value: totalProducts.toString(), icon: Package, sub: `${locations.length} locations` },
          { title: "Stock Value", value: formatNaira(totalStockValue), icon: BarChart3, sub: "At cost price" },
          { title: "Low Stock Alerts", value: lowStockProducts.length.toString(), icon: AlertTriangle, sub: "Need restocking", alert: lowStockProducts.length > 0 },
          { title: "Suppliers", value: suppliers.length.toString(), icon: Users, sub: "Active suppliers" },
        ].map(kpi => (
          <Card key={kpi.title} className={kpi.alert ? "border-amber-300 bg-amber-50/50" : ""}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{kpi.title}</p>
                <kpi.icon className={`h-4 w-4 ${kpi.alert ? "text-amber-500" : "text-primary"}`} />
              </div>
              <p className="text-2xl font-bold mt-2">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Low stock alert banner */}
      {lowStockProducts.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/50">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Low Stock Alert</p>
              <p className="text-sm text-muted-foreground mt-1">
                {lowStockProducts.map(p => p.name).join(", ")} — {lowStockProducts.length === 1 ? "needs" : "need"} restocking.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="movements">Stock Movements</TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          <ProductsManager businessId={businessId!} products={filteredProducts} isLoading={prodLoading} stockLevels={stockLevels} searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        </TabsContent>

        {/* Locations Tab */}
        <TabsContent value="locations" className="space-y-4">
          <LocationsManager businessId={businessId!} locations={locations} isLoading={locLoading} />
        </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers" className="space-y-4">
          <SuppliersManager businessId={businessId!} suppliers={suppliers} isLoading={suppLoading} />
        </TabsContent>

        {/* Stock Movements Tab */}
        <TabsContent value="movements" className="space-y-4">
          <StockMovementsView businessId={businessId!} movements={movements} products={products} locations={locations} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

// ---- Products Manager ----
function ProductsManager({ businessId, products, isLoading, stockLevels, searchTerm, setSearchTerm }: any) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", sku: "", category: "", description: "", unit_price: "", cost_price: "", unit_of_measure: "pcs", low_stock_threshold: "10" });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("products").insert({
        business_id: businessId,
        name: form.name, sku: form.sku || null, category: form.category || null,
        description: form.description || null,
        unit_price: parseFloat(form.unit_price) || 0,
        cost_price: parseFloat(form.cost_price) || 0,
        unit_of_measure: form.unit_of_measure,
        low_stock_threshold: parseInt(form.low_stock_threshold) || 10,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setShowAdd(false);
      setForm({ name: "", sku: "", category: "", description: "", unit_price: "", cost_price: "", unit_of_measure: "pcs", low_stock_threshold: "10" });
      toast({ title: "Product added" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Product deleted" });
    },
  });

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search products..." className="pl-9" value={searchTerm} onChange={(e: any) => setSearchTerm(e.target.value)} />
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Add Product</Button></DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Add Product</DialogTitle><DialogDescription>Add a new product to your inventory.</DialogDescription></DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Product Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div><Label>SKU</Label><Input value={form.sku} onChange={e => setForm(p => ({ ...p, sku: e.target.value }))} placeholder="e.g. PRD-001" /></div>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{PRODUCT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Selling Price (₦)</Label><Input type="number" value={form.unit_price} onChange={e => setForm(p => ({ ...p, unit_price: e.target.value }))} /></div>
                <div><Label>Cost Price (₦)</Label><Input type="number" value={form.cost_price} onChange={e => setForm(p => ({ ...p, cost_price: e.target.value }))} /></div>
                <div><Label>Low Stock Alert</Label><Input type="number" value={form.low_stock_threshold} onChange={e => setForm(p => ({ ...p, low_stock_threshold: e.target.value }))} /></div>
              </div>
              <div>
                <Label>Unit of Measure</Label>
                <Select value={form.unit_of_measure} onValueChange={v => setForm(p => ({ ...p, unit_of_measure: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["pcs","kg","litres","meters","boxes","packs","cartons","dozen"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={() => addMutation.mutate()} disabled={!form.name || addMutation.isPending}>{addMutation.isPending ? "Saving..." : "Add Product"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-3">{[1,2,3].map((i: number) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <Package className="h-12 w-12 mb-3 text-muted-foreground/30" />
              <p className="font-medium">No products yet</p>
              <p className="text-sm mt-1">Add your first product to start tracking inventory.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p: any) => {
                  const qty = stockLevels.filter((sl: any) => sl.product_id === p.id).reduce((q: number, sl: any) => q + sl.quantity, 0);
                  const isLow = qty <= (p.low_stock_threshold || 10);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">{p.sku || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{p.category || "—"}</Badge></TableCell>
                      <TableCell className="text-right text-sm">{formatNaira(Number(p.cost_price))}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{formatNaira(Number(p.unit_price))}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={isLow ? "destructive" : "default"} className={isLow ? "" : "bg-emerald-100 text-emerald-700 border-emerald-200"}>
                          {qty} {p.unit_of_measure}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteMutation.mutate(p.id)}>Delete</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// ---- Locations Manager ----
function LocationsManager({ businessId, locations, isLoading }: any) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", type: "warehouse" });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("inventory_locations").insert({ business_id: businessId, name: form.name, address: form.address || null, type: form.type });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory_locations"] });
      setShowAdd(false);
      setForm({ name: "", address: "", type: "warehouse" });
      toast({ title: "Location added" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <>
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Manage your warehouses, stores, and storage locations.</p>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild><Button variant="outline" size="sm" className="gap-2"><Plus className="h-4 w-4" /> Add Location</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Location</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2">
              <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Main Warehouse" /></div>
              <div><Label>Address</Label><Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["warehouse","store","office","other"].map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button onClick={() => addMutation.mutate()} disabled={!form.name || addMutation.isPending}>{addMutation.isPending ? "Saving..." : "Add Location"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardContent className="p-0">
          {isLoading ? <div className="p-8"><Skeleton className="h-32 w-full" /></div> : locations.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <MapPin className="h-12 w-12 mb-3 text-muted-foreground/30" />
              <p className="font-medium">No locations yet</p>
              <p className="text-sm mt-1">Add your first location to track stock levels.</p>
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Address</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {locations.map((loc: any) => (
                  <TableRow key={loc.id}>
                    <TableCell className="font-medium">{loc.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{loc.address || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{loc.type}</Badge></TableCell>
                    <TableCell><Badge variant={loc.is_active ? "default" : "secondary"}>{loc.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// ---- Suppliers Manager ----
function SuppliersManager({ businessId, suppliers, isLoading }: any) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", contact_person: "" });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("suppliers").insert({
        business_id: businessId, name: form.name,
        email: form.email || null, phone: form.phone || null,
        address: form.address || null, contact_person: form.contact_person || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setShowAdd(false);
      setForm({ name: "", email: "", phone: "", address: "", contact_person: "" });
      toast({ title: "Supplier added" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <>
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Manage your product suppliers and vendors.</p>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild><Button variant="outline" size="sm" className="gap-2"><Plus className="h-4 w-4" /> Add Supplier</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Supplier</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2">
              <div><Label>Company Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div><Label>Contact Person</Label><Input value={form.contact_person} onChange={e => setForm(p => ({ ...p, contact_person: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
              </div>
              <div><Label>Address</Label><Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
            </div>
            <DialogFooter><Button onClick={() => addMutation.mutate()} disabled={!form.name || addMutation.isPending}>{addMutation.isPending ? "Saving..." : "Add Supplier"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardContent className="p-0">
          {isLoading ? <div className="p-8"><Skeleton className="h-32 w-full" /></div> : suppliers.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <Truck className="h-12 w-12 mb-3 text-muted-foreground/30" />
              <p className="font-medium">No suppliers yet</p>
              <p className="text-sm mt-1">Add suppliers to manage your supply chain.</p>
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead></TableRow></TableHeader>
              <TableBody>
                {suppliers.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-sm">{s.contact_person || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.email || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.phone || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// ---- Stock Movements View ----
function StockMovementsView({ businessId, movements, products, locations }: any) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ product_id: "", to_location_id: "", quantity: "", movement_type: "receipt", notes: "" });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("stock_movements").insert({
        business_id: businessId,
        product_id: form.product_id,
        to_location_id: form.to_location_id || null,
        quantity: parseInt(form.quantity),
        movement_type: form.movement_type,
        notes: form.notes || null,
        created_by: user!.id,
      });
      if (error) throw error;

      // Update stock level
      if (form.to_location_id) {
        const qty = parseInt(form.quantity);
        const adjustment = form.movement_type === "receipt" ? qty : form.movement_type === "sale" ? -qty : qty;
        const { data: existing } = await supabase.from("stock_levels").select("*").eq("product_id", form.product_id).eq("location_id", form.to_location_id).maybeSingle();
        if (existing) {
          await supabase.from("stock_levels").update({ quantity: existing.quantity + adjustment }).eq("id", existing.id);
        } else {
          await supabase.from("stock_levels").insert({ product_id: form.product_id, location_id: form.to_location_id, quantity: Math.max(0, adjustment) });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock_movements"] });
      queryClient.invalidateQueries({ queryKey: ["stock_levels"] });
      setShowAdd(false);
      setForm({ product_id: "", to_location_id: "", quantity: "", movement_type: "receipt", notes: "" });
      toast({ title: "Stock movement recorded" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <>
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Track stock receipts, sales, and adjustments.</p>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild><Button variant="outline" size="sm" className="gap-2"><Plus className="h-4 w-4" /> Record Movement</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Record Stock Movement</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2">
              <div>
                <Label>Movement Type</Label>
                <Select value={form.movement_type} onValueChange={v => setForm(p => ({ ...p, movement_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receipt">Receipt (Stock In)</SelectItem>
                    <SelectItem value="sale">Sale (Stock Out)</SelectItem>
                    <SelectItem value="adjustment">Adjustment</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Product *</Label>
                <Select value={form.product_id} onValueChange={v => setForm(p => ({ ...p, product_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>{products.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Location</Label>
                <Select value={form.to_location_id} onValueChange={v => setForm(p => ({ ...p, to_location_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                  <SelectContent>{locations.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Quantity *</Label><Input type="number" min="1" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} /></div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
            </div>
            <DialogFooter><Button onClick={() => addMutation.mutate()} disabled={!form.product_id || !form.quantity || addMutation.isPending}>{addMutation.isPending ? "Saving..." : "Record"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardContent className="p-0">
          {movements.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <ArrowRightLeft className="h-12 w-12 mb-3 text-muted-foreground/30" />
              <p className="font-medium">No stock movements yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Product</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Qty</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
              <TableBody>
                {movements.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm">{new Date(m.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{(m as any).products?.name || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={m.movement_type === "receipt" ? "text-emerald-600 border-emerald-200" : m.movement_type === "sale" ? "text-red-500 border-red-200" : ""}>
                        {m.movement_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{m.quantity}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.notes || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
