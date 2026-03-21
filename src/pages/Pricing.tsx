import { useState } from "react";
import { Link } from "react-router-dom";
import { PublicNavbar } from "@/components/PublicNavbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";

type Period = "monthly" | "quarterly" | "annually";

const pricing: Record<Period, { starter: number; growth: number; business: number }> = {
  monthly: { starter: 0, growth: 15000, business: 45000 },
  quarterly: { starter: 0, growth: 40000, business: 120000 },
  annually: { starter: 0, growth: 144000, business: 432000 },
};

const plans = [
  {
    name: "Starter",
    key: "starter" as const,
    desc: "For individuals and small businesses just getting started.",
    features: ["1 User", "Basic Bookkeeping", "5 Invoices/month", "Basic Reports", "Email Support", "10 Voice Commands/day"],
    cta: "Start Free",
    popular: false,
  },
  {
    name: "Growth",
    key: "growth" as const,
    desc: "For growing businesses that need more power and flexibility.",
    features: ["5 Users", "Full Bookkeeping", "Unlimited Invoices", "Inventory Management", "Payroll (up to 10)", "Advanced Reports", "Priority Support", "Unlimited Voice Commands"],
    cta: "Get Started",
    popular: true,
  },
  {
    name: "Business",
    key: "business" as const,
    desc: "For established businesses needing the full suite of tools.",
    features: ["Unlimited Users", "All Growth Features", "Online Store", "Capital Access", "Multi-location Inventory", "Dedicated Account Manager", "API Access", "Custom Integrations"],
    cta: "Contact Sales",
    popular: false,
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

export default function Pricing() {
  const [period, setPeriod] = useState<Period>("monthly");

  const formatPrice = (amount: number) => {
    if (amount === 0) return "Free";
    return `₦${amount.toLocaleString()}`;
  };

  const periodLabel = { monthly: "/mo", quarterly: "/qtr", annually: "/yr" };

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      <section className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-12" {...fadeUp}>
            <h1 className="text-4xl sm:text-5xl font-bold font-display text-foreground">Simple, Transparent Pricing</h1>
            <p className="mt-4 text-lg text-muted-foreground">Choose the plan that fits your business. Scale as you grow.</p>
          </motion.div>

          {/* Period Toggle */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex rounded-lg bg-muted p-1">
              {(["monthly", "quarterly", "annually"] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all capitalize ${
                    period === p ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  {p}
                  {p === "annually" && <Badge variant="secondary" className="ml-2 text-[10px]">Save 20%</Badge>}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan, i) => (
              <motion.div key={plan.name} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.1 }}>
                <Card className={`h-full relative ${plan.popular ? "border-primary shadow-lg" : ""}`}>
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
                    <Button
                      className="w-full"
                      variant={plan.popular ? "default" : "outline"}
                      asChild
                    >
                      <Link to="/signup">
                        {plan.cta} <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Prime Business Platform. All rights reserved.
      </footer>
    </div>
  );
}
