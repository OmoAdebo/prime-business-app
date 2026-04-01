import { useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function BankingSettings() {
  const [currency, setCurrency] = useState("NGN");
  const [autoReconcile, setAutoReconcile] = useState(false);
  const [notifyTransactions, setNotifyTransactions] = useState(true);

  const save = () => toast.success("Banking settings saved");

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Banking Settings</h2>
        <p className="text-sm text-muted-foreground">Configure your banking preferences</p>
      </div>

      <div className="max-w-lg space-y-6">
        <Card>
          <CardHeader><CardTitle>General</CardTitle><CardDescription>Default banking configuration</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Default Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
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
          <CardHeader><CardTitle>Automation</CardTitle><CardDescription>Automated banking features</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Auto-Reconciliation</p>
                <p className="text-xs text-muted-foreground">Automatically reconcile matched transactions</p>
              </div>
              <Switch checked={autoReconcile} onCheckedChange={setAutoReconcile} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Transaction Notifications</p>
                <p className="text-xs text-muted-foreground">Get notified for every transaction</p>
              </div>
              <Switch checked={notifyTransactions} onCheckedChange={setNotifyTransactions} />
            </div>
          </CardContent>
        </Card>

        <Button onClick={save}>Save Settings</Button>
      </div>
    </motion.div>
  );
}
