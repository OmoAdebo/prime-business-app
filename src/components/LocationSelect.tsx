import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const NEW = "__new__";

export function useLocations() {
  const { data: business } = useBusiness();
  const businessId = business?.id;
  return useQuery({
    queryKey: ["inventory_locations", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_locations")
        .select("id, name, type, address, is_active")
        .eq("business_id", businessId!)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

interface Props {
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  showHint?: boolean;
}

export function LocationSelect({ value, onChange, placeholder = "Choose location", showHint = true }: Props) {
  const { data: business } = useBusiness();
  const { data: locations = [] } = useLocations();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", type: "store", address: "" });

  const create = async () => {
    if (!business?.id || !form.name.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("inventory_locations")
      .insert({ business_id: business.id, name: form.name.trim(), type: form.type, address: form.address || null, is_active: true })
      .select("id")
      .single();
    setSaving(false);
    if (error) { toast.error("Could not create location", { description: error.message }); return; }
    await qc.invalidateQueries({ queryKey: ["inventory_locations"] });
    onChange(data.id);
    setOpen(false);
    setForm({ name: "", type: "store", address: "" });
    toast.success("Location created");
  };

  return (
    <>
      <Select value={value} onValueChange={(v) => (v === NEW ? setOpen(true) : onChange(v))}>
        <SelectTrigger><SelectValue placeholder={locations.length ? placeholder : "No locations yet — Main Store will be created"} /></SelectTrigger>
        <SelectContent>
          {locations.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
          {locations.length > 0 && <SelectSeparator />}
          <SelectItem value={NEW} className="text-primary font-medium">+ New location</SelectItem>
        </SelectContent>
      </Select>
      {showHint && locations.length === 0 && (
        <p className="text-xs text-muted-foreground mt-1">
          Manage all your stores and warehouses in <Link to="/store-management" className="text-primary underline">Store Management</Link>.
        </p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New location</DialogTitle>
            <DialogDescription>Where this stock is kept. It also appears in Store Management.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ikeja Warehouse" /></div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="store">Store / Shop</SelectItem>
                  <SelectItem value="warehouse">Warehouse</SelectItem>
                  <SelectItem value="office">Office</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create} disabled={!form.name.trim() || saving}>{saving ? "Saving..." : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
