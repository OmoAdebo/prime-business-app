import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/hooks/use-business";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShoppingCart, Search, Plus, Minus, Trash2, CreditCard, Banknote,
  Receipt, X, Clock, DollarSign, Package, BarChart3
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface CartItem {
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  discount: number;
  total_price: number;
}

const VAT_RATE = 7.5;

export default function POS() {
  const { user } = useAuth();
  const { data: business } = useBusiness();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("pos");

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["pos-products", business?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("business_id", business!.id)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!business?.id,
  });

  const { data: sales } = useQuery({
    queryKey: ["sales-history", business?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .eq("business_id", business!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!business?.id,
  });

  const { data: shifts } = useQuery({
    queryKey: ["shifts", business?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shifts")
        .select("*, cash_registers(name)")
        .eq("business_id", business!.id)
        .order("opened_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!business?.id,
  });

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!search) return products;
    const s = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        p.sku?.toLowerCase().includes(s) ||
        p.barcode?.toLowerCase().includes(s) ||
        p.category?.toLowerCase().includes(s)
    );
  }, [products, search]);

  const subtotal = cart.reduce((sum, item) => sum + item.total_price, 0);
  const vatAmount = subtotal * (VAT_RATE / 100);
  const totalAmount = subtotal + vatAmount;
  const changeDue = parseFloat(amountPaid || "0") - totalAmount;

  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product_id === product.id
            ? { ...i, quantity: i.quantity + 1, total_price: (i.quantity + 1) * i.unit_price - i.discount }
            : i
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          unit_price: product.unit_price,
          quantity: 1,
          discount: 0,
          total_price: product.unit_price,
        },
      ];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.product_id !== productId) return i;
          const newQty = i.quantity + delta;
          if (newQty <= 0) return null as any;
          return { ...i, quantity: newQty, total_price: newQty * i.unit_price - i.discount };
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product_id !== productId));
  };

  const completeSale = useMutation({
    mutationFn: async () => {
      if (!business || !user) throw new Error("Not ready");

      const saleNum = `SALE-${Date.now().toString(36).toUpperCase()}`;
      const { data: sale, error: saleErr } = await supabase
        .from("sales")
        .insert({
          business_id: business.id,
          sale_number: saleNum,
          subtotal,
          vat_rate: VAT_RATE,
          vat_amount: vatAmount,
          total_amount: totalAmount,
          amount_paid: parseFloat(amountPaid || "0"),
          change_amount: Math.max(0, changeDue),
          payment_method: paymentMethod,
          status: "completed",
          created_by: user.id,
        })
        .select()
        .single();
      if (saleErr) throw saleErr;

      const items = cart.map((item) => ({
        sale_id: sale.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount,
        total_price: item.total_price,
      }));
      const { error: itemsErr } = await supabase.from("sale_items").insert(items);
      if (itemsErr) throw itemsErr;

      return sale;
    },
    onSuccess: (sale) => {
      setLastSale(sale);
      setCart([]);
      setAmountPaid("");
      setCheckoutOpen(false);
      setReceiptOpen(true);
      queryClient.invalidateQueries({ queryKey: ["sales-history"] });
      queryClient.invalidateQueries({ queryKey: ["pos-products"] });
      toast({ title: "Sale completed!", description: `Receipt #${sale.sale_number}` });
    },
    onError: (err: any) => {
      toast({ title: "Sale failed", description: err.message, variant: "destructive" });
    },
  });

  const fmt = (n: number) => `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

  if (!business) {
    return (
      <div className="max-w-7xl">
        <h1 className="text-2xl font-bold font-display text-foreground mb-4">Point of Sale</h1>
        <Card><CardContent className="py-12 text-center text-muted-foreground">Register a business to use POS.</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Point of Sale</h1>
          <p className="text-muted-foreground text-sm">Process sales and generate receipts</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pos"><ShoppingCart className="h-4 w-4 mr-1" />POS</TabsTrigger>
          <TabsTrigger value="history"><Receipt className="h-4 w-4 mr-1" />Sales History</TabsTrigger>
          <TabsTrigger value="shifts"><Clock className="h-4 w-4 mr-1" />Shifts</TabsTrigger>
        </TabsList>

        <TabsContent value="pos" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Product Grid */}
            <div className="lg:col-span-3 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products by name, SKU, or barcode..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {productsLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-2 sm:gap-3">
                  {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 sm:h-28 rounded-lg" />)}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 max-h-[50vh] lg:max-h-[60vh] overflow-y-auto pr-1">
                  {filteredProducts.map((product) => (
                    <motion.div
                      key={product.id}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => addToCart(product)}
                      className="cursor-pointer"
                    >
                      <Card className="hover:border-primary/50 transition-colors h-full">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-foreground truncate">{product.name}</p>
                              <p className="text-xs text-muted-foreground">{product.sku || "No SKU"}</p>
                            </div>
                            <Package className="h-4 w-4 text-muted-foreground shrink-0 ml-1" />
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-sm font-semibold text-primary">{fmt(product.unit_price)}</span>
                            {product.category && (
                              <Badge variant="secondary" className="text-[10px]">{product.category}</Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                  {filteredProducts.length === 0 && (
                    <p className="col-span-full text-center text-muted-foreground py-8">No products found</p>
                  )}
                </div>
              )}
            </div>

            {/* Cart */}
            <Card className="lg:col-span-2 h-fit lg:sticky top-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Cart ({cart.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {cart.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Add products to cart</p>
                ) : (
                  <>
                    <div className="max-h-[35vh] overflow-y-auto space-y-2">
                      <AnimatePresence>
                        {cart.map((item) => (
                          <motion.div
                            key={item.product_id}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: 50 }}
                            className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.product_name}</p>
                              <p className="text-xs text-muted-foreground">{fmt(item.unit_price)} each</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateQuantity(item.product_id, -1)}>
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateQuantity(item.product_id, 1)}>
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <span className="text-sm font-semibold w-20 text-right">{fmt(item.total_price)}</span>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeFromCart(item.product_id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>

                    <Separator />
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{fmt(subtotal)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">VAT (7.5%)</span><span>{fmt(vatAmount)}</span></div>
                      <Separator />
                      <div className="flex justify-between font-bold text-base"><span>Total</span><span className="text-primary">{fmt(totalAmount)}</span></div>
                    </div>

                    <div className="flex gap-2">
                      <Button className="flex-1" onClick={() => { setAmountPaid(totalAmount.toFixed(2)); setCheckoutOpen(true); }}>
                        <CreditCard className="h-4 w-4 mr-1" /> Checkout
                      </Button>
                      <Button variant="outline" onClick={() => setCart([])}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Recent Sales</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveTable>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sale #</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales?.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-mono text-sm">{sale.sale_number}</TableCell>
                      <TableCell className="hidden sm:table-cell">{format(new Date(sale.created_at), "MMM d, yyyy HH:mm")}</TableCell>
                      <TableCell><Badge variant="outline">{sale.payment_method}</Badge></TableCell>
                      <TableCell><Badge variant={sale.status === "completed" ? "default" : "secondary"}>{sale.status}</Badge></TableCell>
                      <TableCell className="text-right font-semibold">{fmt(sale.total_amount)}</TableCell>
                    </TableRow>
                  ))}
                  {(!sales || sales.length === 0) && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No sales recorded yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              </ResponsiveTable>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shifts" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Shift History</CardTitle></CardHeader>
            <CardContent>
              {shifts && shifts.length > 0 ? (
                <ResponsiveTable>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Register</TableHead>
                      <TableHead>Opened</TableHead>
                      <TableHead className="hidden sm:table-cell">Closed</TableHead>
                      <TableHead className="hidden md:table-cell">Opening</TableHead>
                      <TableHead className="hidden md:table-cell">Closing</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shifts.map((shift: any) => (
                      <TableRow key={shift.id}>
                        <TableCell>{shift.cash_registers?.name || "—"}</TableCell>
                        <TableCell className="whitespace-nowrap">{format(new Date(shift.opened_at), "MMM d, HH:mm")}</TableCell>
                        <TableCell className="hidden sm:table-cell">{shift.closed_at ? format(new Date(shift.closed_at), "MMM d, HH:mm") : "—"}</TableCell>
                        <TableCell className="hidden md:table-cell">{fmt(shift.opening_amount)}</TableCell>
                        <TableCell className="hidden md:table-cell">{shift.closing_amount != null ? fmt(shift.closing_amount) : "—"}</TableCell>
                        <TableCell><Badge variant={shift.status === "open" ? "default" : "secondary"}>{shift.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </ResponsiveTable>
              ) : (
                <p className="text-center text-muted-foreground py-8">No shifts recorded yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader><DialogTitle>Complete Sale</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-3xl font-bold text-primary">{fmt(totalAmount)}</p>
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash"><div className="flex items-center gap-2"><Banknote className="h-4 w-4" />Cash</div></SelectItem>
                  <SelectItem value="card"><div className="flex items-center gap-2"><CreditCard className="h-4 w-4" />Card</div></SelectItem>
                  <SelectItem value="transfer"><div className="flex items-center gap-2"><DollarSign className="h-4 w-4" />Transfer</div></SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount Received</Label>
              <Input type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder="0.00" />
            </div>
            {changeDue > 0 && (
              <div className="p-3 bg-primary/10 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Change Due</p>
                <p className="text-xl font-bold text-primary">{fmt(changeDue)}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>Cancel</Button>
            <Button
              onClick={() => completeSale.mutate()}
              disabled={completeSale.isPending || parseFloat(amountPaid || "0") < totalAmount}
            >
              {completeSale.isPending ? "Processing..." : "Complete Sale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-center">Receipt</DialogTitle></DialogHeader>
          {lastSale && (
            <div className="space-y-3 text-sm font-mono">
              <div className="text-center border-b border-dashed pb-2">
                <p className="font-bold text-base">{business?.company_name}</p>
                <p className="text-muted-foreground text-xs">{business?.business_address}</p>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{lastSale.sale_number}</span>
                <span>{format(new Date(lastSale.created_at), "dd/MM/yyyy HH:mm")}</span>
              </div>
              <Separator className="border-dashed" />
              <div className="space-y-1">
                <div className="flex justify-between"><span>Subtotal</span><span>{fmt(lastSale.subtotal)}</span></div>
                <div className="flex justify-between"><span>VAT (7.5%)</span><span>{fmt(lastSale.vat_amount)}</span></div>
                <Separator className="border-dashed" />
                <div className="flex justify-between font-bold"><span>Total</span><span>{fmt(lastSale.total_amount)}</span></div>
                <div className="flex justify-between"><span>Paid</span><span>{fmt(lastSale.amount_paid)}</span></div>
                {lastSale.change_amount > 0 && (
                  <div className="flex justify-between"><span>Change</span><span>{fmt(lastSale.change_amount)}</span></div>
                )}
              </div>
              <Separator className="border-dashed" />
              <p className="text-center text-xs text-muted-foreground">Thank you for your purchase!</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="w-full" onClick={() => setReceiptOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
