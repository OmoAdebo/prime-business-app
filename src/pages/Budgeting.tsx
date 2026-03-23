import { useState } from "react";
import { Calculator, Plus, AlertTriangle, TrendingUp } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function Budgeting() {
  const { user } = useAuth();
  const { data: business } = useBusiness();
  const queryClient = useQueryClient();
  const businessId = business?.id;

  const [budgetOpen, setBudgetOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<string | null>(null);
  const [budgetName, setBudgetName] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [itemCategory, setItemCategory] = useState("");
  const [itemAmount, setItemAmount] = useState("");
  const [itemNotes, setItemNotes] = useState("");

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ["budgets", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from("budgets").select("*").eq("business_id", businessId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const { data: budgetItems = [] } = useQuery({
    queryKey: ["budget-items", selectedBudget],
    queryFn: async () => {
      const { data, error } = await supabase.from("budget_items").select("*").eq("budget_id", selectedBudget!).order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedBudget,
  });

  const createBudget = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("budgets").insert({
        business_id: businessId!,
        name: budgetName,
        period_start: periodStart,
        period_end: periodEnd,
        total_amount: parseFloat(totalAmount) || 0,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      setBudgetOpen(false);
      setBudgetName(""); setPeriodStart(""); setPeriodEnd(""); setTotalAmount("");
      toast.success("Budget created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addBudgetItem = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("budget_items").insert({
        budget_id: selectedBudget!,
        category: itemCategory,
        allocated_amount: parseFloat(itemAmount) || 0,
        notes: itemNotes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-items"] });
      setItemOpen(false);
      setItemCategory(""); setItemAmount(""); setItemNotes("");
      toast.success("Budget item added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalAllocated = budgets.reduce((s, b) => s + b.total_amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent_amount, 0);
  const activeBudgets = budgets.filter(b => b.status === "active");

  if (!business) {
    return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">Please set up your business profile first.</p></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Budgeting</h1>
          <p className="text-muted-foreground">Plan and track budgets across departments</p>
        </div>
        <Dialog open={budgetOpen} onOpenChange={setBudgetOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Budget</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Budget</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Budget Name</Label><Input value={budgetName} onChange={e => setBudgetName(e.target.value)} placeholder="e.g. Q1 2026 Marketing" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Start Date</Label><Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} /></div>
                <div><Label>End Date</Label><Input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} /></div>
              </div>
              <div><Label>Total Budget (₦)</Label><Input type="number" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} /></div>
              <Button className="w-full" onClick={() => createBudget.mutate()} disabled={createBudget.isPending || !budgetName || !periodStart || !periodEnd}>
                {createBudget.isPending ? "Creating..." : "Create Budget"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Active Budgets</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold">{activeBudgets.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Total Allocated</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold">₦{totalAllocated.toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Total Spent</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold text-yellow-600">₦{totalSpent.toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Remaining</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600">₦{(totalAllocated - totalSpent).toLocaleString()}</p></CardContent>
        </Card>
      </div>

      {/* Budget List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Budgets</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : budgets.length === 0 ? (
              <p className="text-muted-foreground text-sm">No budgets yet. Create your first budget.</p>
            ) : (
              budgets.map(b => {
                const pct = b.total_amount > 0 ? Math.min((b.spent_amount / b.total_amount) * 100, 100) : 0;
                const isOver = b.spent_amount > b.total_amount;
                return (
                  <div
                    key={b.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedBudget === b.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
                    onClick={() => setSelectedBudget(b.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium text-sm">{b.name}</h4>
                        <p className="text-xs text-muted-foreground">{new Date(b.period_start).toLocaleDateString()} — {new Date(b.period_end).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {isOver && <AlertTriangle className="h-4 w-4 text-destructive" />}
                        <Badge variant={b.status === "active" ? "default" : "outline"}>{b.status}</Badge>
                      </div>
                    </div>
                    <Progress value={pct} className={`h-2 ${isOver ? "[&>div]:bg-destructive" : ""}`} />
                    <div className="flex justify-between text-xs mt-1 text-muted-foreground">
                      <span>₦{b.spent_amount.toLocaleString()} spent</span>
                      <span>₦{b.total_amount.toLocaleString()} total</span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Budget Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Budget Items</CardTitle>
              {selectedBudget && (
                <Dialog open={itemOpen} onOpenChange={setItemOpen}>
                  <DialogTrigger asChild><Button size="sm"><Plus className="h-3 w-3 mr-1" />Add Item</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add Budget Item</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div><Label>Category</Label><Input value={itemCategory} onChange={e => setItemCategory(e.target.value)} placeholder="e.g. Marketing, Supplies" /></div>
                      <div><Label>Allocated Amount (₦)</Label><Input type="number" value={itemAmount} onChange={e => setItemAmount(e.target.value)} /></div>
                      <div><Label>Notes</Label><Input value={itemNotes} onChange={e => setItemNotes(e.target.value)} /></div>
                      <Button className="w-full" onClick={() => addBudgetItem.mutate()} disabled={addBudgetItem.isPending || !itemCategory || !itemAmount}>
                        {addBudgetItem.isPending ? "Adding..." : "Add Item"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedBudget ? (
              <p className="text-sm text-muted-foreground">Select a budget to view its items.</p>
            ) : budgetItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items yet for this budget.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Allocated</TableHead>
                    <TableHead>Spent</TableHead>
                    <TableHead>Remaining</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgetItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.category}</TableCell>
                      <TableCell>₦{item.allocated_amount.toLocaleString()}</TableCell>
                      <TableCell>₦{item.spent_amount.toLocaleString()}</TableCell>
                      <TableCell className={item.spent_amount > item.allocated_amount ? "text-destructive" : "text-green-600"}>
                        ₦{(item.allocated_amount - item.spent_amount).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
