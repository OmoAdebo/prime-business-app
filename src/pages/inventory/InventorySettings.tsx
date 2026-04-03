import { useState } from "react";
import { useBusiness } from "@/hooks/use-business";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function InventorySettings() {
  const { data: business } = useBusiness();
  const [settings, setSettings] = useState({
    defaultLowStock: "10",
    defaultUnit: "pcs",
    autoDeductOnSale: true,
    trackSerialNumbers: false,
    enableBarcodes: true,
  });

  const handleSave = () => {
    toast({ title: "Settings saved", description: "Inventory settings have been updated." });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inventory Settings</h1>
        <p className="text-muted-foreground mt-1">Configure default thresholds and preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Settings className="h-4 w-4" /> General Settings</CardTitle>
          <CardDescription>Default values for new products and stock tracking.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Default Low Stock Threshold</Label>
              <Input type="number" value={settings.defaultLowStock} onChange={e => setSettings(s => ({ ...s, defaultLowStock: e.target.value }))} />
              <p className="text-xs text-muted-foreground">Alert when stock falls below this number.</p>
            </div>
            <div className="space-y-2">
              <Label>Default Unit of Measure</Label>
              <Select value={settings.defaultUnit} onValueChange={v => setSettings(s => ({ ...s, defaultUnit: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["pcs","kg","litres","meters","boxes","packs","cartons","dozen"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4 border-t pt-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-deduct Stock on Sale</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Automatically reduce stock when a POS sale is recorded.</p>
              </div>
              <Switch checked={settings.autoDeductOnSale} onCheckedChange={v => setSettings(s => ({ ...s, autoDeductOnSale: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Barcodes</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Allow barcode scanning for products.</p>
              </div>
              <Switch checked={settings.enableBarcodes} onCheckedChange={v => setSettings(s => ({ ...s, enableBarcodes: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Track Serial Numbers</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Enable serial number tracking per unit (coming soon).</p>
              </div>
              <Switch checked={settings.trackSerialNumbers} onCheckedChange={v => setSettings(s => ({ ...s, trackSerialNumbers: v }))} disabled />
            </div>
          </div>

          <Button onClick={handleSave}>Save Settings</Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
