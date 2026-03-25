import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import { useAuth } from "@/contexts/AuthContext";
import { Store, Plus, Eye, EyeOff, Star, Package, ShoppingCart, Truck, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function OnlineStore() {
  const { user } = useAuth();
  const { data: business } = useBusiness();
  const queryClient = useQueryClient();
  const [storeOpen, setStoreOpen] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");

  // Storefront
  const { data: storefront, isLoading: storeLoading } = useQuery({
    queryKey: ["storefront", business?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("storefronts")
        .select("*")
        .eq("business_id", business!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!business,
  });

  // Products in store
  const { data: storeProducts = [] } = useQuery({
    queryKey: ["store-products", storefront?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_products")
        .select("*, products(*)")
        .eq("storefront_id", storefront!.id)
        .order("display_order");
      if (error) throw error;
      return data;
    },
    enabled: !!storefront,
  });

  // All inventory products (for adding to store)
  const { data: allProducts = [] } = useQuery({
    queryKey: ["products-for-store", business?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("business_id", business!.id)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!business,
  });

  // Orders
  const { data: orders = [] } = useQuery({
    queryKey: ["store-orders", business?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("business_id", business!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!business,
  });

  // Create storefront
  const createStore = useMutation({
    mutationFn: async (formData: FormData) => {
      const { error } = await supabase.from("storefronts").insert({
        business_id: business!.id,
        store_name: formData.get("store_name") as string,
        subdomain: (formData.get("subdomain") as string).toLowerCase().replace(/[^a-z0-9-]/g, ""),
        description: formData.get("description") as string || null,
        contact_email: formData.get("contact_email") as string || null,
        contact_phone: formData.get("contact_phone") as string || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storefront"] });
      setStoreOpen(false);
      toast({ title: "Store created successfully" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Toggle publish
  const togglePublish = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("storefronts")
        .update({ is_published: !storefront?.is_published })
        .eq("id", storefront!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storefront"] });
      toast({ title: storefront?.is_published ? "Store unpublished" : "Store published!" });
    },
  });

  // Add product to store
  const addProduct = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase.from("store_products").insert({
        storefront_id: storefront!.id,
        product_id: productId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-products"] });
      setAddProductOpen(false);
      toast({ title: "Product added to store" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Toggle product visibility
  const toggleVisibility = useMutation({
    mutationFn: async ({ id, visible }: { id: string; visible: boolean }) => {
      const { error } = await supabase
        .from("store_products")
        .update({ is_visible: visible })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["store-products"] }),
  });

  // Toggle featured
  const toggleFeatured = useMutation({
    mutationFn: async ({ id, featured }: { id: string; featured: boolean }) => {
      const { error } = await supabase
        .from("store_products")
        .update({ is_featured: featured })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["store-products"] }),
  });

  // Update order status
  const updateOrderStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-orders"] });
      toast({ title: "Order status updated" });
    },
  });

  if (!business) {
    return (
      <div className="p-6">
        <Card><CardContent className="p-12 text-center text-muted-foreground">Register your business first to set up an online store.</CardContent></Card>
      </div>
    );
  }

  const existingProductIds = storeProducts.map((sp: any) => sp.product_id);
  const availableProducts = allProducts.filter((p: any) => !existingProductIds.includes(p.id));
  const filteredOrders = orders.filter((o: any) =>
    !orderSearch || o.customer_name?.toLowerCase().includes(orderSearch.toLowerCase()) || o.order_number?.toLowerCase().includes(orderSearch.toLowerCase())
  );

  const statusColor = (s: string) => {
    const map: Record<string, string> = { pending: "secondary", confirmed: "default", processing: "default", shipped: "default", delivered: "default", cancelled: "destructive" };
    return (map[s] || "secondary") as "secondary" | "default" | "destructive";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Online Store</h1>
          <p className="text-muted-foreground">Manage your digital storefront and orders</p>
        </div>
      </div>

      {!storefront ? (
        <Card>
          <CardContent className="p-12 text-center space-y-4">
            <Store className="h-16 w-16 mx-auto text-muted-foreground" />
            <h3 className="text-lg font-semibold">Set Up Your Online Store</h3>
            <p className="text-muted-foreground max-w-md mx-auto">Create your digital storefront to sell products online, synced with your inventory.</p>
            <Dialog open={storeOpen} onOpenChange={setStoreOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Create Store</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Your Store</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); createStore.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
                  <div><Label>Store Name</Label><Input name="store_name" required /></div>
                  <div><Label>Subdomain</Label><Input name="subdomain" placeholder="my-store" required /><p className="text-xs text-muted-foreground mt-1">your-store.prime.app</p></div>
                  <div><Label>Description</Label><Textarea name="description" rows={3} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Contact Email</Label><Input name="contact_email" type="email" /></div>
                    <div><Label>Contact Phone</Label><Input name="contact_phone" /></div>
                  </div>
                  <Button type="submit" className="w-full" disabled={createStore.isPending}>Create Store</Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="products">
          <TabsList>
            <TabsTrigger value="products"><Package className="h-4 w-4 mr-1" />Products</TabsTrigger>
            <TabsTrigger value="orders"><ShoppingCart className="h-4 w-4 mr-1" />Orders ({orders.length})</TabsTrigger>
            <TabsTrigger value="settings"><Store className="h-4 w-4 mr-1" />Store Settings</TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{storeProducts.length} products in store</p>
              <Dialog open={addProductOpen} onOpenChange={setAddProductOpen}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Product</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Product to Store</DialogTitle></DialogHeader>
                  {availableProducts.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">All products are already in your store. Add more from Inventory.</p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {availableProducts.map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{p.name}</p>
                            <p className="text-xs text-muted-foreground">₦{Number(p.unit_price).toLocaleString()}</p>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => addProduct.mutate(p.id)}>Add</Button>
                        </div>
                      ))}
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {storeProducts.map((sp: any) => (
                <Card key={sp.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{sp.products?.name}</p>
                        <p className="text-sm text-muted-foreground">₦{Number(sp.products?.unit_price || 0).toLocaleString()}</p>
                      </div>
                      <div className="flex gap-1">
                        {sp.is_featured && <Badge variant="default" className="text-xs">Featured</Badge>}
                        {!sp.is_visible && <Badge variant="secondary" className="text-xs">Hidden</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => toggleVisibility.mutate({ id: sp.id, visible: !sp.is_visible })}>
                        {sp.is_visible ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                        {sp.is_visible ? "Hide" : "Show"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleFeatured.mutate({ id: sp.id, featured: !sp.is_featured })}>
                        <Star className={`h-3 w-3 mr-1 ${sp.is_featured ? "fill-primary text-primary" : ""}`} />
                        {sp.is_featured ? "Unfeature" : "Feature"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {storeProducts.length === 0 && (
                <Card className="col-span-full"><CardContent className="p-8 text-center text-muted-foreground">No products yet. Add products from your inventory.</CardContent></Card>
              )}
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search orders..." value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} className="pl-9" />
              </div>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order: any) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-sm">{order.order_number || order.id.slice(0, 8)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{order.customer_name}</p>
                          <p className="text-xs text-muted-foreground">{order.customer_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{order.order_items?.length || 0}</TableCell>
                      <TableCell>₦{Number(order.total_amount).toLocaleString()}</TableCell>
                      <TableCell><Badge variant={statusColor(order.status)}>{order.status}</Badge></TableCell>
                      <TableCell><Badge variant={order.payment_status === "paid" ? "default" : "secondary"}>{order.payment_status}</Badge></TableCell>
                      <TableCell className="text-sm">{format(new Date(order.created_at), "MMM dd, yyyy")}</TableCell>
                      <TableCell>
                        <Select value={order.status} onValueChange={(s) => updateOrderStatus.mutate({ id: order.id, status: s })}>
                          <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"].map(s => (
                              <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredOrders.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No orders yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Store Status
                  <Badge variant={storefront.is_published ? "default" : "secondary"}>
                    {storefront.is_published ? "Published" : "Draft"}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {storefront.is_published
                    ? `Your store is live at ${storefront.subdomain}.prime.app`
                    : "Your store is not yet visible to the public"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => togglePublish.mutate()} variant={storefront.is_published ? "outline" : "default"}>
                  {storefront.is_published ? <><EyeOff className="h-4 w-4 mr-2" />Unpublish Store</> : <><Eye className="h-4 w-4 mr-2" />Publish Store</>}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Store Details</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-muted-foreground text-xs">Store Name</Label><p className="font-medium">{storefront.store_name}</p></div>
                  <div><Label className="text-muted-foreground text-xs">Subdomain</Label><p className="font-medium">{storefront.subdomain}.prime.app</p></div>
                  <div><Label className="text-muted-foreground text-xs">Contact Email</Label><p className="font-medium">{storefront.contact_email || "—"}</p></div>
                  <div><Label className="text-muted-foreground text-xs">Contact Phone</Label><p className="font-medium">{storefront.contact_phone || "—"}</p></div>
                </div>
                {storefront.description && (
                  <div><Label className="text-muted-foreground text-xs">Description</Label><p className="text-sm">{storefront.description}</p></div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Integration</CardTitle>
                <CardDescription>Connect payment gateways to accept payments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div><p className="font-medium">Paystack</p><p className="text-sm text-muted-foreground">Accept card payments, bank transfers & USSD</p></div>
                  <Badge variant="secondary">Coming Soon</Badge>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div><p className="font-medium">Flutterwave</p><p className="text-sm text-muted-foreground">Multi-currency payment processing</p></div>
                  <Badge variant="secondary">Coming Soon</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
