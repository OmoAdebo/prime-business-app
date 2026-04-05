import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/hooks/use-business";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Textarea } from "@/components/ui/textarea";
import {
  Store, Plus, MapPin, Phone, Mail, Clock, Users, Edit2, Trash2,
  Building2, UserPlus, ToggleLeft, ToggleRight, Package
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

interface StoreForm {
  name: string;
  address: string;
  type: string;
  phone: string;
  email: string;
  operating_hours: string;
}

const emptyForm: StoreForm = { name: "", address: "", type: "branch", phone: "", email: "", operating_hours: "" };

export default function StoreManagement() {
  const { user } = useAuth();
  const { data: business } = useBusiness();
  const queryClient = useQueryClient();
  const [storeDialogOpen, setStoreDialogOpen] = useState(false);
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<any>(null);
  const [form, setForm] = useState<StoreForm>(emptyForm);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [staffEmployeeId, setStaffEmployeeId] = useState("");
  const [staffRole, setStaffRole] = useState("staff");

  // Fetch stores/locations
  const { data: stores, isLoading } = useQuery({
    queryKey: ["store-locations", business?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_locations")
        .select("*")
        .eq("business_id", business!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!business?.id,
  });

  // Fetch staff assignments
  const { data: storeStaff } = useQuery({
    queryKey: ["store-staff", business?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_staff")
        .select("*, employees_hr(full_name, position, email), inventory_locations(name)")
        .eq("business_id", business!.id)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!business?.id,
  });

  // Fetch employees for assignment
  const { data: employees } = useQuery({
    queryKey: ["employees-for-stores", business?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees_hr")
        .select("id, full_name, position")
        .eq("business_id", business!.id)
        .eq("status", "active");
      if (error) throw error;
      return data;
    },
    enabled: !!business?.id,
  });

  // Fetch product counts per location (from stock_movements or products)
  const { data: productCounts } = useQuery({
    queryKey: ["store-product-counts", business?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, business_id")
        .eq("business_id", business!.id);
      if (error) throw error;
      return data?.length || 0;
    },
    enabled: !!business?.id,
  });

  // Create/update store
  const saveStore = useMutation({
    mutationFn: async () => {
      if (!business) throw new Error("No business");
      const payload = {
        business_id: business.id,
        name: form.name,
        address: form.address || null,
        type: form.type || "branch",
        phone: form.phone || null,
        email: form.email || null,
        operating_hours: form.operating_hours || null,
      };

      if (editingStore) {
        const { error } = await supabase
          .from("inventory_locations")
          .update(payload)
          .eq("id", editingStore.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("inventory_locations")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-locations"] });
      setStoreDialogOpen(false);
      setEditingStore(null);
      setForm(emptyForm);
      toast({ title: editingStore ? "Store updated" : "Store added", description: `${form.name} has been saved.` });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // Toggle store active status
  const toggleStore = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("inventory_locations")
        .update({ is_active: !is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-locations"] });
      toast({ title: "Status updated" });
    },
  });

  // Assign staff
  const assignStaff = useMutation({
    mutationFn: async () => {
      if (!business || !selectedStoreId || !staffEmployeeId) throw new Error("Missing fields");
      const { error } = await supabase
        .from("store_staff")
        .insert({
          business_id: business.id,
          location_id: selectedStoreId,
          employee_id: staffEmployeeId,
          role: staffRole,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-staff"] });
      setStaffDialogOpen(false);
      setStaffEmployeeId("");
      setStaffRole("staff");
      toast({ title: "Staff assigned", description: "Employee has been assigned to the store." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // Remove staff
  const removeStaff = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("store_staff")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-staff"] });
      toast({ title: "Staff removed from store" });
    },
  });

  const openEdit = (store: any) => {
    setEditingStore(store);
    setForm({
      name: store.name,
      address: store.address || "",
      type: store.type || "branch",
      phone: store.phone || "",
      email: store.email || "",
      operating_hours: store.operating_hours || "",
    });
    setStoreDialogOpen(true);
  };

  const openAddStore = () => {
    setEditingStore(null);
    setForm(emptyForm);
    setStoreDialogOpen(true);
  };

  const openAssignStaff = (storeId: string) => {
    setSelectedStoreId(storeId);
    setStaffDialogOpen(true);
  };

  const activeStores = stores?.filter((s) => s.is_active) || [];
  const inactiveStores = stores?.filter((s) => !s.is_active) || [];

  const getStaffForStore = (storeId: string) =>
    storeStaff?.filter((s: any) => s.location_id === storeId) || [];

  if (!business) {
    return (
      <div className="max-w-7xl">
        <h1 className="text-2xl font-bold font-display text-foreground mb-4">Store Management</h1>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Register a business to manage stores and branches.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Store Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage branches, assign staff, and monitor store operations.</p>
        </div>
        <Button onClick={openAddStore}>
          <Plus className="h-4 w-4 mr-2" /> Add Store / Branch
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Stores", value: stores?.length || 0, icon: Building2, color: "text-primary" },
          { label: "Active", value: activeStores.length, icon: Store, color: "text-success" },
          { label: "Staff Assigned", value: storeStaff?.length || 0, icon: Users, color: "text-info" },
          { label: "Products", value: productCounts || 0, icon: Package, color: "text-warning" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center bg-muted ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="stores">
        <TabsList>
          <TabsTrigger value="stores"><Store className="h-4 w-4 mr-1" /> Stores</TabsTrigger>
          <TabsTrigger value="staff"><Users className="h-4 w-4 mr-1" /> Staff Assignments</TabsTrigger>
        </TabsList>

        {/* Stores Tab */}
        <TabsContent value="stores" className="mt-4 space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-56 rounded-lg" />)}
            </div>
          ) : stores && stores.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stores.map((store, idx) => {
                const staff = getStaffForStore(store.id);
                return (
                  <motion.div
                    key={store.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className={`h-full transition-shadow hover:shadow-md ${!store.is_active ? "opacity-60" : ""}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Store className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-base">{store.name}</CardTitle>
                              <Badge variant={store.is_active ? "default" : "secondary"} className="text-[10px] mt-1">
                                {store.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {store.type || "branch"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {store.address && (
                          <div className="flex items-start gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <span className="line-clamp-2">{store.address}</span>
                          </div>
                        )}
                        {store.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            <span>{store.phone}</span>
                          </div>
                        )}
                        {store.email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{store.email}</span>
                          </div>
                        )}
                        {store.operating_hours && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            <span>{store.operating_hours}</span>
                          </div>
                        )}

                        <Separator />

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            <Users className="h-3.5 w-3.5 inline mr-1" />
                            {staff.length} staff
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Added {format(new Date(store.created_at), "MMM d, yyyy")}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(store)}>
                            <Edit2 className="h-3 w-3 mr-1" /> Edit
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openAssignStaff(store.id)}>
                            <UserPlus className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleStore.mutate({ id: store.id, is_active: store.is_active })}
                          >
                            {store.is_active ? <ToggleRight className="h-4 w-4 text-success" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <Building2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="font-medium text-foreground">No stores yet</p>
                <p className="text-sm text-muted-foreground mt-1">Add your first store or branch to get started.</p>
                <Button className="mt-4" onClick={openAddStore}>
                  <Plus className="h-4 w-4 mr-2" /> Add Store
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Staff Tab */}
        <TabsContent value="staff" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Staff Assignments</CardTitle>
              <CardDescription>View and manage staff assigned to each store location.</CardDescription>
            </CardHeader>
            <CardContent>
              {storeStaff && storeStaff.length > 0 ? (
                <ResponsiveTable>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead className="hidden sm:table-cell">Position</TableHead>
                      <TableHead>Store</TableHead>
                      <TableHead className="hidden md:table-cell">Role</TableHead>
                      <TableHead className="hidden md:table-cell">Assigned</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {storeStaff.map((assignment: any) => (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-medium">{assignment.employees_hr?.full_name || "—"}</TableCell>
                        <TableCell className="text-muted-foreground hidden sm:table-cell">{assignment.employees_hr?.position || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{assignment.inventory_locations?.name || "—"}</Badge>
                        </TableCell>
                        <TableCell className="capitalize hidden md:table-cell">{assignment.role}</TableCell>
                        <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                          {format(new Date(assignment.assigned_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 min-h-[44px] text-destructive hover:text-destructive"
                            onClick={() => removeStaff.mutate(assignment.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </ResponsiveTable>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No staff assigned to any store yet.</p>
                  <p className="text-xs mt-1">Use the staff button on each store card to assign employees.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Store Dialog */}
      <Dialog open={storeDialogOpen} onOpenChange={setStoreDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingStore ? "Edit Store" : "Add New Store / Branch"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Store Name *</Label>
              <Input
                placeholder="e.g. Lekki Branch"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="branch">Branch</SelectItem>
                  <SelectItem value="warehouse">Warehouse</SelectItem>
                  <SelectItem value="outlet">Outlet</SelectItem>
                  <SelectItem value="headquarters">Headquarters</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Address</Label>
              <Textarea
                placeholder="Full address..."
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Phone</Label>
                <Input
                  placeholder="+234..."
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  placeholder="store@business.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Operating Hours</Label>
              <Input
                placeholder="e.g. Mon-Sat 8am-8pm"
                value={form.operating_hours}
                onChange={(e) => setForm({ ...form, operating_hours: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStoreDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveStore.mutate()} disabled={!form.name || saveStore.isPending}>
              {saveStore.isPending ? "Saving..." : editingStore ? "Update Store" : "Add Store"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Staff Dialog */}
      <Dialog open={staffDialogOpen} onOpenChange={setStaffDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Staff to Store</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Employee *</Label>
              <Select value={staffEmployeeId} onValueChange={setStaffEmployeeId}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees?.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name} {emp.position ? `— ${emp.position}` : ""}
                    </SelectItem>
                  ))}
                  {(!employees || employees.length === 0) && (
                    <SelectItem value="_none" disabled>No employees found. Add employees in Payroll & HR first.</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Store Role</Label>
              <Select value={staffRole} onValueChange={setStaffRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="cashier">Cashier</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStaffDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => assignStaff.mutate()} disabled={!staffEmployeeId || assignStaff.isPending}>
              {assignStaff.isPending ? "Assigning..." : "Assign Staff"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
