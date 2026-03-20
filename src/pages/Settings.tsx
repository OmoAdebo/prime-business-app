import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { User, Shield, Users, Mail, Phone, Building2, Loader2, UserPlus, Clock, CheckCircle, XCircle, Send } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AppRole } from "@/lib/supabase";

// ─── Profile Tab ───
function ProfileTab() {
  const { profile, user, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    company_name: profile?.company_name || "",
    phone: profile?.phone || "",
  });

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name,
        company_name: form.company_name,
        phone: form.phone,
      })
      .eq("id", user.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await refreshProfile();
      toast({ title: "Profile updated", description: "Your changes have been saved." });
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="h-5 w-5 text-primary" /> Profile Information
        </CardTitle>
        <CardDescription>Update your personal and business details.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email
            </Label>
            <Input id="email" value={user?.email || ""} disabled className="bg-muted/50" />
            <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="full_name" className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" /> Full Name
            </Label>
            <Input
              id="full_name"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              placeholder="Your full name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company_name" className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" /> Company Name
            </Label>
            <Input
              id="company_name"
              value={form.company_name}
              onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
              placeholder="Your company or business name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Phone Number
            </Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+234 800 000 0000"
            />
          </div>
        </div>
        <Separator />
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Save Changes
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Security Tab ───
function SecurityTab() {
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleChangePassword = async () => {
    if (password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated", description: "Your password has been changed." });
      setPassword("");
      setConfirmPassword("");
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" /> Security
        </CardTitle>
        <CardDescription>Change your password to keep your account secure.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-w-md">
        <div className="space-y-2">
          <Label htmlFor="new-password">New Password</Label>
          <Input
            id="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter new password"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm Password</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
          />
        </div>
        <Button onClick={handleChangePassword} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Update Password
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Team Tab ───
function TeamTab() {
  const { user, roles } = useAuth();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("employee");
  const canManageTeam = roles.includes("business_owner") || roles.includes("super_admin");

  const { data: invitations = [], isLoading: loadingInvites } = useQuery({
    queryKey: ["team-invitations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_invitations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: canManageTeam,
  });

  const { data: teamRoles = [], isLoading: loadingTeam } = useQuery({
    queryKey: ["team-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .eq("invited_by", user?.id || "");
      if (error) throw error;
      return data;
    },
    enabled: canManageTeam,
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!inviteEmail || !user) throw new Error("Missing fields");
      const { error } = await supabase.from("team_invitations").insert({
        email: inviteEmail,
        role: inviteRole,
        invited_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Invitation sent", description: `Invitation sent to ${inviteEmail}.` });
      setInviteEmail("");
      queryClient.invalidateQueries({ queryKey: ["team-invitations"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("team_invitations")
        .update({ status: "revoked" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Invitation revoked" });
      queryClient.invalidateQueries({ queryKey: ["team-invitations"] });
    },
  });

  if (!canManageTeam) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-medium">Team management is not available for your role.</p>
        </CardContent>
      </Card>
    );
  }

  const statusIcon = (s: string) => {
    if (s === "pending") return <Clock className="h-3.5 w-3.5 text-warning" />;
    if (s === "accepted") return <CheckCircle className="h-3.5 w-3.5 text-success" />;
    return <XCircle className="h-3.5 w-3.5 text-destructive" />;
  };

  return (
    <div className="space-y-6">
      {/* Invite Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" /> Invite Team Member
          </CardTitle>
          <CardDescription>
            Send an invitation to add a team member. They'll receive an email with a link to join.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="team@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1"
              type="email"
            />
            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="store_manager">Store Manager</SelectItem>
                <SelectItem value="accountant">Accountant</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => inviteMutation.mutate()}
              disabled={inviteMutation.isPending || !inviteEmail}
            >
              {inviteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Invite
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invitations List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" /> Invitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingInvites ? (
            <div className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
          ) : invitations.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground text-sm">No invitations sent yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize text-xs">
                        {(inv.role as string).replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 capitalize text-sm">
                        {statusIcon(inv.status)}
                        {inv.status}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(inv.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {inv.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => revokeMutation.mutate(inv.id)}
                          disabled={revokeMutation.isPending}
                        >
                          Revoke
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Settings Page ───
export default function Settings() {
  const { roles } = useAuth();
  const showTeamTab = roles.includes("business_owner") || roles.includes("super_admin");

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account, security, and team.</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList>
          <TabsTrigger value="profile" className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" /> Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" /> Security
          </TabsTrigger>
          {showTeamTab && (
            <TabsTrigger value="team" className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Team
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>
        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>
        {showTeamTab && (
          <TabsContent value="team">
            <TeamTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
