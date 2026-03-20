import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

interface Invitation {
  id: string;
  email: string;
  role: string;
  invited_by: string;
  status: string;
  expires_at: string;
}

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ full_name: "", password: "", confirmPassword: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchInvite() {
      if (!token) { setError("Invalid invitation link."); setLoading(false); return; }
      const { data, error: err } = await supabase.rpc("get_invitation_by_token", { _token: token });
      if (err || !data || data.length === 0) {
        setError("This invitation is invalid, expired, or has already been used.");
      } else {
        setInvitation(data[0] as Invitation);
      }
      setLoading(false);
    }
    fetchInvite();
  }, [token]);

  const handleSubmit = async () => {
    if (!invitation || !token) return;
    if (form.password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    // Sign up with the invited email
    const { data: signupData, error: signupErr } = await supabase.auth.signUp({
      email: invitation.email,
      password: form.password,
      options: {
        data: { full_name: form.full_name, requested_role: invitation.role },
      },
    });

    if (signupErr) {
      toast({ title: "Error", description: signupErr.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    // Accept the invitation to swap role from default business_owner to invited role
    if (signupData.user) {
      await supabase.rpc("accept_invitation", { _token: token, _user_id: signupData.user.id });
    }

    toast({
      title: "Account created!",
      description: "Please check your email to verify your account, then log in.",
    });
    setSubmitting(false);
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-12">
            <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-lg font-semibold text-foreground mb-2">Invalid Invitation</h2>
            <p className="text-muted-foreground text-sm mb-6">{error}</p>
            <Button asChild variant="outline">
              <Link to="/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg mb-2">
            P
          </div>
          <CardTitle className="text-xl font-display">Join Prime</CardTitle>
          <CardDescription>
            You've been invited to join as{" "}
            <Badge variant="secondary" className="capitalize">
              {invitation.role.replace("_", " ")}
            </Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={invitation.email} disabled className="bg-muted/50" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              placeholder="Your full name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inv-password">Password</Label>
            <Input
              id="inv-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="Create a password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inv-confirm">Confirm Password</Label>
            <Input
              id="inv-confirm"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              placeholder="Confirm password"
            />
          </div>
          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            Create Account & Join
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
