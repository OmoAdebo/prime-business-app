import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PublicNavbar } from "@/components/PublicNavbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { motion } from "framer-motion";
import { Check, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/use-subscription";
import { toast } from "@/hooks/use-toast";

type Period = "monthly" | "quarterly" | "annually";
type PlanKey = "starter" | "growth" | "business";

const pricing: Record<Period, Record<PlanKey, number>> = {
  monthly: { starter: 0, growth: 15000, business: 45000 },
  quarterly: { starter: 0, growth: 40000, business: 120000 },
  annually: { starter: 0, growth: 144000, business: 432000 },
};

const plans: Array<{ name: string; key: PlanKey; desc: string; features: string[]; popular: boolean }> = [
  { name: "Starter", key: "starter", desc: "For individuals and small businesses just getting started.",
    features: ["1 User", "Basic Bookkeeping", "5 Invoices/month", "Basic Reports", "Email Support", "10 Voice Commands/day"],
    popular: false },
  { name: "Growth", key: "growth", desc: "For growing businesses that need more power and flexibility.",
    features: ["5 Users", "Full Bookkeeping", "Unlimited Invoices", "Inventory Management", "Payroll (up to 10)", "Advanced Reports", "Priority Support", "Unlimited Voice Commands"],
    popular: true },
  { name: "Business", key: "business", desc: "For established businesses needing the full suite of tools.",
    features: ["Unlimited Users", "All Growth Features", "Online Store", "Capital Access", "Multi-location Inventory", "Dedicated Account Manager", "API Access", "Custom Integrations"],
    popular: false },
];

const fadeUp = { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } };

export default function Pricing() {
  const [period, setPeriod] = useState<Period>("monthly");
  const [loadingKey, setLoadingKey] = useState<PlanKey | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscription, refetch } = useSubscription();
  const required = searchParams.get("required") === "1";

  const formatPrice = (amount: number) => (amount === 0 ? "Free" : `₦${amount.toLocaleString()}`);
  const periodLabel = { monthly: "/mo", quarterly: "/qtr", annually: "/yr" };

  async function handleSelectPlan(plan: PlanKey) {
    if (!user) { navigate(`/signup?plan=${plan}&period=${period}`); return; }
    setLoadingKey(plan);
    try {
      if (plan === "starter") {
        const { error } = await supabase.functions.invoke("activate-free-plan", {});
        if (error) throw error;
        toast({ title: "Starter plan activated", description: "Welcome to Prime — you're all set!" });
        await refetch();
        navigate("/dashboard");
      } else {
        const amount = pricing[period][plan];
        const { data, error } = await supabase.functions.invoke("paystack-init", {
          body: { plan, period, amount, callback_url: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        const url = (data as any)?.authorization_url as string | undefined;
        const isDummy = (data as any)?.dummy === true;
        if (isDummy) {
          toast({ title: "Plan activated (test mode)", description: "Paystack is in test mode — subscription activated immediately." });
          await refetch();
          navigate("/dashboard");
        } else if (url) {
          window.location.href = url;
        } else {
          throw new Error("Could not start checkout");
        }
      }
    } catch (e) {
      toast({ title: "Could not activate plan", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoadingKey(null);
    }
  }

  const ctaLabel = (plan: PlanKey) => {
    if (loadingKey === plan) return "Working…";
    if (subscription?.plan === plan && (subscription.status === "active" || subscription.status === "trialing")) return "Current plan";
    if (plan === "starter") return "Start Free";
    return "Subscribe";
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      <section className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {required && (
            <Alert className="mb-8 border-primary/30 bg-primary/5">
              <AlertCircle className="h-4 w-4 text-primary" />
              <AlertTitle>Choose a plan to continue</AlertTitle>
              <AlertDescription>
                To access your dashboard, please select a plan below. Start with our free Starter plan or upgrade for full features.
              </AlertDescription>
            </Alert>
          )}

          <motion.div className="text-center mb-12" {...fadeUp}>
            <h1 className="text-4xl sm:text-5xl font-bold font-display text-foreground">Simple, Transparent Pricing</h1>
            <p className="mt-4 text-lg text-muted-foreground">Choose the plan that fits your business. Scale as you grow.</p>
          </motion.div>

          <div className="flex justify-center mb-12">
            <div className="inline-flex rounded-lg bg-muted p-1">
              {(["monthly", "quarterly", "annually"] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all capitalize ${period === p ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
                >
                  {p}
                  {p === "annually" && <Badge variant="secondary" className="ml-2 text-[10px]">Save 20%</Badge>}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan, i) => {
              const isCurrent = subscription?.plan === plan.key && (subscription.status === "active" || subscription.status === "trialing");
              return (
                <motion.div key={plan.name} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.1 }}>
                  <Card className={`h-full relative ${plan.popular ? "border-primary shadow-lg" : ""} ${isCurrent ? "ring-2 ring-primary" : ""}`}>
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                      </div>
                    )}
                    <CardHeader className="text-center pb-4">
                      <CardTitle className="text-xl font-display">{plan.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{plan.desc}</p>
                      <div className="mt-4">
                        <span className="text-4xl font-bold text-foreground">{formatPrice(pricing[period][plan.key])}</span>
                        {pricing[period][plan.key] > 0 && (
                          <span className="text-muted-foreground text-sm">{periodLabel[period]}</span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3 mb-6">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                            <Check className="h-4 w-4 text-primary shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      {user ? (
                        <Button
                          className="w-full"
                          variant={plan.popular ? "default" : "outline"}
                          disabled={!!loadingKey || isCurrent}
                          onClick={() => handleSelectPlan(plan.key)}
                        >
                          {loadingKey === plan.key ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                            <>{ctaLabel(plan.key)} {!isCurrent && <ArrowRight className="ml-2 h-4 w-4" />}</>
                          )}
                        </Button>
                      ) : (
                        <Button className="w-full" variant={plan.popular ? "default" : "outline"} asChild>
                          <Link to={`/signup?plan=${plan.key}&period=${period}`}>
                            {plan.key === "starter" ? "Start Free" : "Get Started"} <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Prime Business Platform. All rights reserved.
      </footer>
    </div>
  );
}
