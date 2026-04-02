import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Settings, Save } from "lucide-react";
import { motion } from "framer-motion";

export default function BookkeepingSettings() {
  const [settings, setSettings] = useState({
    fiscal_year_start: "01",
    default_currency: "NGN",
    vat_rate: "7.5",
    auto_vat: true,
    default_payment_method: "Bank Transfer",
    invoice_prefix: "INV",
    receipt_prefix: "RCT",
  });

  const handleSave = () => {
    toast({ title: "Settings saved", description: "Your bookkeeping preferences have been updated." });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">Bookkeeping Settings</h1>
        <p className="text-muted-foreground mt-1">Configure fiscal year, currency, and VAT preferences.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fiscal Year</CardTitle>
            <CardDescription>Set your business fiscal year start month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Fiscal Year Start Month</Label>
              <Select value={settings.fiscal_year_start} onValueChange={v => setSettings(p => ({ ...p, fiscal_year_start: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["01","02","03","04","05","06","07","08","09","10","11","12"].map((m, i) => (
                    <SelectItem key={m} value={m}>{new Date(2024, i).toLocaleString("en", { month: "long" })}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Currency</CardTitle>
            <CardDescription>Default currency for bookkeeping</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Default Currency</Label>
              <Select value={settings.default_currency} onValueChange={v => setSettings(p => ({ ...p, default_currency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NGN">Nigerian Naira (₦)</SelectItem>
                  <SelectItem value="USD">US Dollar ($)</SelectItem>
                  <SelectItem value="GBP">British Pound (£)</SelectItem>
                  <SelectItem value="EUR">Euro (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">VAT Configuration</CardTitle>
            <CardDescription>Value Added Tax settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>VAT Rate (%)</Label>
              <Input type="number" min="0" max="100" step="0.1" value={settings.vat_rate} onChange={e => setSettings(p => ({ ...p, vat_rate: e.target.value }))} />
              <p className="text-xs text-muted-foreground mt-1">Standard Nigerian VAT rate is 7.5%</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-apply VAT</Label>
                <p className="text-xs text-muted-foreground">Automatically include VAT on new transactions</p>
              </div>
              <Switch checked={settings.auto_vat} onCheckedChange={v => setSettings(p => ({ ...p, auto_vat: v }))} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Defaults</CardTitle>
            <CardDescription>Default values for new entries</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Default Payment Method</Label>
              <Select value={settings.default_payment_method} onValueChange={v => setSettings(p => ({ ...p, default_payment_method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Cash", "Bank Transfer", "Card", "Mobile Money", "Cheque"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Invoice Prefix</Label>
              <Input value={settings.invoice_prefix} onChange={e => setSettings(p => ({ ...p, invoice_prefix: e.target.value }))} />
            </div>
            <div>
              <Label>Receipt Prefix</Label>
              <Input value={settings.receipt_prefix} onChange={e => setSettings(p => ({ ...p, receipt_prefix: e.target.value }))} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-2"><Save className="h-4 w-4" /> Save Settings</Button>
      </div>
    </motion.div>
  );
}
