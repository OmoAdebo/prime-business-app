import { useState } from "react";
import { Users, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { motion } from "framer-motion";

// Local state for now — can be migrated to DB table later
export default function BankingBeneficiaries() {
  const [open, setOpen] = useState(false);
  const [beneficiaries, setBeneficiaries] = useState<{ id: string; name: string; bank: string; accountNumber: string; }[]>([]);
  const [name, setName] = useState("");
  const [bank, setBank] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  const addBeneficiary = () => {
    if (!name || !bank || !accountNumber) { toast.error("Fill all fields"); return; }
    setBeneficiaries(prev => [...prev, { id: Date.now().toString(), name, bank, accountNumber }]);
    setOpen(false); setName(""); setBank(""); setAccountNumber("");
    toast.success("Beneficiary added");
  };

  const remove = (id: string) => {
    setBeneficiaries(prev => prev.filter(b => b.id !== id));
    toast.success("Beneficiary removed");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Beneficiaries</h2>
          <p className="text-sm text-muted-foreground">Saved payees for quick transfers</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Beneficiary</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Beneficiary</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Full Name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Doe" /></div>
              <div><Label>Bank Name</Label><Input value={bank} onChange={e => setBank(e.target.value)} placeholder="e.g. GTBank" /></div>
              <div><Label>Account Number</Label><Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="10-digit number" maxLength={10} /></div>
              <Button className="w-full" onClick={addBeneficiary} disabled={!name || !bank || !accountNumber}>Add Beneficiary</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Account Number</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {beneficiaries.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No beneficiaries saved yet</TableCell></TableRow>
              ) : (
                beneficiaries.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell>{b.bank}</TableCell>
                    <TableCell>{b.accountNumber}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => remove(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>
  );
}
