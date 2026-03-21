import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Users, Search, Building2, Shield, Ban, CheckCircle, FileText, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";

interface UserRow {
  user_id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  role: string | null;
  created_at: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export function AdminUserManagement() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-all-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_all_users_with_roles");
      if (error) throw error;
      return (data as UserRow[]) || [];
    },
  });

  const { data: businesses = [] } = useQuery({
    queryKey: ["admin-all-businesses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("businesses").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ userId, activate }: { userId: string; activate: boolean }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const res = await fetch(`${SUPABASE_URL}/functions/v1/toggle-user-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ user_id: userId, is_active: activate }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed");
      return result;
    },
    onSuccess: (_, { activate }) => {
      toast({ title: activate ? "User activated" : "User deactivated" });
      queryClient.invalidateQueries({ queryKey: ["admin-all-users"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filtered = users.filter(
    (u) =>
      (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.company_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalUsers = new Set(users.map((u) => u.user_id)).size;
  const totalBusinesses = new Set(users.filter((u) => u.role === "business_owner").map((u) => u.user_id)).size;
  const totalAdmins = new Set(users.filter((u) => u.role === "super_admin").map((u) => u.user_id)).size;
  const pendingVerifications = businesses.filter((b) => b.verification_status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: totalUsers, icon: Users, color: "bg-primary/10 text-primary" },
          { label: "Business Owners", value: totalBusinesses, icon: Building2, color: "bg-accent text-accent-foreground" },
          { label: "Super Admins", value: totalAdmins, icon: Shield, color: "bg-muted text-muted-foreground" },
          { label: "Pending Verifications", value: pendingVerifications, icon: FileText, color: "bg-warning/10 text-warning" },
        ].map((stat) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">All Users</TabsTrigger>
          <TabsTrigger value="verifications">Business Verifications</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg font-display">All Users</CardTitle>
                <CardDescription>Platform-wide user directory</CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
              ) : filtered.length === 0 ? (
                <p className="py-12 text-center text-muted-foreground text-sm">No users found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((u, i) => (
                      <TableRow key={`${u.user_id}-${i}`}>
                        <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell className="text-muted-foreground">{u.company_name || "—"}</TableCell>
                        <TableCell>
                          {u.role ? <Badge variant="secondary" className="capitalize text-xs">{u.role.replace("_", " ")}</Badge> : <span className="text-muted-foreground text-xs">No role</span>}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          {u.role !== "super_admin" && (
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => toggleMutation.mutate({ userId: u.user_id, activate: false })} disabled={toggleMutation.isPending}>
                                <Ban className="h-3.5 w-3.5 mr-1" /> Deactivate
                              </Button>
                              <Button variant="ghost" size="sm" className="text-primary hover:text-primary" onClick={() => toggleMutation.mutate({ userId: u.user_id, activate: true })} disabled={toggleMutation.isPending}>
                                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Activate
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verifications">
          <BusinessVerificationAdmin businesses={businesses} queryClient={queryClient} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BusinessVerificationAdmin({ businesses, queryClient }: { businesses: any[]; queryClient: any }) {
  const [reviewBiz, setReviewBiz] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleVerify = async (id: string, status: "approved" | "rejected") => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const updateData: any = { verification_status: status, verified_at: new Date().toISOString(), verified_by: user?.id };
    if (status === "rejected") updateData.rejection_reason = rejectionReason;
    else updateData.rejection_reason = null;

    const { error } = await supabase.from("businesses").update(updateData).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: `Business ${status}` });
    queryClient.invalidateQueries({ queryKey: ["admin-all-businesses"] });
    setReviewBiz(null);
    setRejectionReason("");
    setSaving(false);
  };

  const statusColor = (s: string) => {
    if (s === "approved") return "bg-primary/10 text-primary";
    if (s === "rejected") return "bg-destructive/10 text-destructive";
    return "bg-warning/10 text-warning";
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-display">Business Verifications</CardTitle>
          <CardDescription>Review and approve business registrations.</CardDescription>
        </CardHeader>
        <CardContent>
          {businesses.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground text-sm">No business registrations yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>CAC Number</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {businesses.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.company_name}</TableCell>
                    <TableCell>{b.cac_number || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{b.industry || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{b.state || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`capitalize text-xs ${statusColor(b.verification_status)}`}>
                        {b.verification_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setReviewBiz(b)}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!reviewBiz} onOpenChange={() => setReviewBiz(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review: {reviewBiz?.company_name}</DialogTitle>
            <DialogDescription>Review business documents and approve or reject.</DialogDescription>
          </DialogHeader>
          {reviewBiz && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">CAC:</span> {reviewBiz.cac_number || "—"}</div>
                <div><span className="text-muted-foreground">TIN:</span> {reviewBiz.tin_number || "—"}</div>
                <div><span className="text-muted-foreground">State:</span> {reviewBiz.state || "—"}</div>
                <div><span className="text-muted-foreground">LGA:</span> {reviewBiz.lga || "—"}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Address:</span> {reviewBiz.business_address || "—"}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Industry:</span> {reviewBiz.industry || "—"}</div>
              </div>
              {reviewBiz.cac_document_url && (
                <a href={reviewBiz.cac_document_url} target="_blank" rel="noreferrer" className="text-primary text-sm underline">View CAC Document</a>
              )}
              {reviewBiz.utility_bill_url && (
                <a href={reviewBiz.utility_bill_url} target="_blank" rel="noreferrer" className="text-primary text-sm underline block">View Utility Bill</a>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">Rejection Reason (if rejecting)</label>
                <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Reason for rejection..." />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="destructive" onClick={() => handleVerify(reviewBiz?.id, "rejected")} disabled={saving}>
              Reject
            </Button>
            <Button onClick={() => handleVerify(reviewBiz?.id, "approved")} disabled={saving}>
              <CheckCircle className="h-4 w-4 mr-2" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
