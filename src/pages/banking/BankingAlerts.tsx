import { useState } from "react";
import { Bell, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface Alert {
  id: string;
  type: string;
  threshold: number;
  enabled: boolean;
}

export default function BankingAlerts() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([
    { id: "1", type: "Low Balance", threshold: 50000, enabled: true },
    { id: "2", type: "Large Transaction", threshold: 500000, enabled: true },
  ]);
  const [type, setType] = useState("Low Balance");
  const [threshold, setThreshold] = useState("");

  const addAlert = () => {
    const t = parseFloat(threshold);
    if (isNaN(t)) { toast.error("Enter a valid amount"); return; }
    setAlerts(prev => [...prev, { id: Date.now().toString(), type, threshold: t, enabled: true }]);
    setOpen(false); setThreshold("");
    toast.success("Alert created");
  };

  const toggle = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  };

  const remove = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
    toast.success("Alert removed");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Alerts</h2>
          <p className="text-sm text-muted-foreground">Configure balance and transaction alerts</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Alert</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Alert</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Alert Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low Balance">Low Balance Warning</SelectItem>
                    <SelectItem value="Large Transaction">Large Transaction Alert</SelectItem>
                    <SelectItem value="Daily Summary">Daily Summary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Threshold (₦)</Label><Input type="number" value={threshold} onChange={e => setThreshold(e.target.value)} placeholder="e.g. 50000" /></div>
              <Button className="w-full" onClick={addAlert} disabled={!threshold}>Create Alert</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {alerts.map(a => (
          <Card key={a.id}>
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{a.type}</p>
                  <p className="text-sm text-muted-foreground">Threshold: ₦{a.threshold.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={a.enabled ? "default" : "secondary"}>{a.enabled ? "Active" : "Paused"}</Badge>
                <Switch checked={a.enabled} onCheckedChange={() => toggle(a.id)} />
                <Button variant="ghost" size="icon" onClick={() => remove(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}
