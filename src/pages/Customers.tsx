import { useState } from "react";
import { Users, Plus, MessageSquare, Search, Tag, Mail, Phone } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function Customers() {
  const { user } = useAuth();
  const { data: business } = useBusiness();
  const queryClient = useQueryClient();
  const businessId = business?.id;

  const [customerOpen, setCustomerOpen] = useState(false);
  const [interactionOpen, setInteractionOpen] = useState(false);
  const [segmentOpen, setSegmentOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Customer form
  const [custName, setCustName] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custAddress, setCustAddress] = useState("");
  const [custCompany, setCustCompany] = useState("");
  const [custType, setCustType] = useState("individual");
  const [custCreditLimit, setCustCreditLimit] = useState("");

  // Interaction form
  const [intType, setIntType] = useState("note");
  const [intSubject, setIntSubject] = useState("");
  const [intDescription, setIntDescription] = useState("");

  // Segment form
  const [segName, setSegName] = useState("");
  const [segDescription, setSegDescription] = useState("");
  const [segColor, setSegColor] = useState("#22c55e");

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*").eq("business_id", businessId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const { data: interactions = [] } = useQuery({
    queryKey: ["customer-interactions", selectedCustomer],
    queryFn: async () => {
      const { data, error } = await supabase.from("customer_interactions").select("*").eq("customer_id", selectedCustomer!).order("interaction_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCustomer,
  });

  const { data: segments = [] } = useQuery({
    queryKey: ["customer-segments", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from("customer_segments").select("*").eq("business_id", businessId!).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const createCustomer = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("customers").insert({
        business_id: businessId!,
        name: custName,
        email: custEmail || null,
        phone: custPhone || null,
        address: custAddress || null,
        company_name: custCompany || null,
        customer_type: custType,
        credit_limit: parseFloat(custCreditLimit) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setCustomerOpen(false);
      setCustName(""); setCustEmail(""); setCustPhone(""); setCustAddress(""); setCustCompany(""); setCustCreditLimit("");
      toast.success("Customer added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addInteraction = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("customer_interactions").insert({
        customer_id: selectedCustomer!,
        business_id: businessId!,
        type: intType,
        subject: intSubject || null,
        description: intDescription || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-interactions"] });
      setInteractionOpen(false);
      setIntSubject(""); setIntDescription("");
      toast.success("Interaction logged");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createSegment = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("customer_segments").insert({
        business_id: businessId!,
        name: segName,
        description: segDescription || null,
        color: segColor,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-segments"] });
      setSegmentOpen(false);
      setSegName(""); setSegDescription("");
      toast.success("Segment created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filteredCustomers = customers.filter(c =>
    !searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.email?.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone?.includes(searchTerm)
  );

  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.is_active).length;
  const totalOutstanding = customers.reduce((s, c) => s + (c.outstanding_balance || 0), 0);

  if (!business) {
    return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">Please set up your business profile first.</p></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customers</h1>
          <p className="text-muted-foreground">Manage your customer database and relationships</p>
        </div>
        <Dialog open={customerOpen} onOpenChange={setCustomerOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Customer</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Customer</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Name *</Label><Input value={custName} onChange={e => setCustName(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Email</Label><Input type="email" value={custEmail} onChange={e => setCustEmail(e.target.value)} /></div>
                <div><Label>Phone</Label><Input value={custPhone} onChange={e => setCustPhone(e.target.value)} /></div>
              </div>
              <div><Label>Company</Label><Input value={custCompany} onChange={e => setCustCompany(e.target.value)} /></div>
              <div><Label>Address</Label><Input value={custAddress} onChange={e => setCustAddress(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <Select value={custType} onValueChange={setCustType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Credit Limit (₦)</Label><Input type="number" value={custCreditLimit} onChange={e => setCustCreditLimit(e.target.value)} /></div>
              </div>
              <Button className="w-full" onClick={() => createCustomer.mutate()} disabled={createCustomer.isPending || !custName}>
                {createCustomer.isPending ? "Adding..." : "Add Customer"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Total Customers</CardDescription></CardHeader><CardContent><p className="text-2xl font-bold">{totalCustomers}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Active</CardDescription></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">{activeCustomers}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Outstanding Balance</CardDescription></CardHeader><CardContent><p className="text-2xl font-bold text-yellow-600">₦{totalOutstanding.toLocaleString()}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Segments</CardDescription></CardHeader><CardContent><p className="text-2xl font-bold">{segments.length}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="customers">
        <div className="overflow-x-auto scrollbar-thin">
          <TabsList className="w-max sm:w-auto">
            <TabsTrigger value="customers" className="min-h-[44px]">Customers</TabsTrigger>
            <TabsTrigger value="segments" className="min-h-[44px]">Segments</TabsTrigger>
            {selectedCustomer && <TabsTrigger value="interactions" className="min-h-[44px]">Interactions</TabsTrigger>}
          </TabsList>
        </div>
        </TabsList>

        <TabsContent value="customers" className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search customers..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Credit Limit</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead>Loyalty</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : filteredCustomers.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No customers found</TableCell></TableRow>
                  ) : (
                    filteredCustomers.map(c => (
                      <TableRow key={c.id} className={selectedCustomer === c.id ? "bg-primary/5" : ""}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{c.name}</p>
                            {c.company_name && <p className="text-xs text-muted-foreground">{c.company_name}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            {c.email && <div className="flex items-center gap-1 text-xs"><Mail className="h-3 w-3" />{c.email}</div>}
                            {c.phone && <div className="flex items-center gap-1 text-xs"><Phone className="h-3 w-3" />{c.phone}</div>}
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{c.customer_type}</Badge></TableCell>
                        <TableCell>₦{(c.credit_limit || 0).toLocaleString()}</TableCell>
                        <TableCell className={c.outstanding_balance && c.outstanding_balance > 0 ? "text-yellow-600" : ""}>₦{(c.outstanding_balance || 0).toLocaleString()}</TableCell>
                        <TableCell>{c.loyalty_points || 0} pts</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedCustomer(c.id); setInteractionOpen(true); }} title="Log Interaction">
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segments" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={segmentOpen} onOpenChange={setSegmentOpen}>
              <DialogTrigger asChild><Button size="sm"><Tag className="h-4 w-4 mr-2" />New Segment</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Segment</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Name</Label><Input value={segName} onChange={e => setSegName(e.target.value)} placeholder="e.g. VIP, Wholesale" /></div>
                  <div><Label>Description</Label><Textarea value={segDescription} onChange={e => setSegDescription(e.target.value)} /></div>
                  <div><Label>Color</Label><Input type="color" value={segColor} onChange={e => setSegColor(e.target.value)} className="h-10 w-20" /></div>
                  <Button className="w-full" onClick={() => createSegment.mutate()} disabled={createSegment.isPending || !segName}>
                    {createSegment.isPending ? "Creating..." : "Create Segment"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {segments.length === 0 ? (
              <p className="text-muted-foreground text-sm col-span-3">No segments yet.</p>
            ) : (
              segments.map(s => (
                <Card key={s.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color || "#22c55e" }} />
                      <CardTitle className="text-sm">{s.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">{s.description || "No description"}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {selectedCustomer && (
          <TabsContent value="interactions" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Interaction History</h3>
              <Dialog open={interactionOpen} onOpenChange={setInteractionOpen}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-3 w-3 mr-1" />Log Interaction</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Log Interaction</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Type</Label>
                      <Select value={intType} onValueChange={setIntType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="note">Note</SelectItem>
                          <SelectItem value="call">Phone Call</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="meeting">Meeting</SelectItem>
                          <SelectItem value="purchase">Purchase</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Subject</Label><Input value={intSubject} onChange={e => setIntSubject(e.target.value)} /></div>
                    <div><Label>Details</Label><Textarea value={intDescription} onChange={e => setIntDescription(e.target.value)} /></div>
                    <Button className="w-full" onClick={() => addInteraction.mutate()} disabled={addInteraction.isPending}>
                      {addInteraction.isPending ? "Saving..." : "Log Interaction"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-3">
              {interactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No interactions recorded.</p>
              ) : (
                interactions.map(i => (
                  <Card key={i.id}>
                    <CardContent className="py-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize text-xs">{i.type}</Badge>
                            {i.subject && <span className="font-medium text-sm">{i.subject}</span>}
                          </div>
                          {i.description && <p className="text-sm text-muted-foreground mt-1">{i.description}</p>}
                        </div>
                        <span className="text-xs text-muted-foreground">{new Date(i.interaction_date).toLocaleDateString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </motion.div>
  );
}
