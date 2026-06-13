import { Link } from "react-router-dom";
import { PublicNavbar } from "@/components/PublicNavbar";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  BookOpen, Package, FileText, Users, Store, BarChart3,
  ArrowRight, CheckCircle, Star, Mic, Stethoscope, Sprout,
  Cpu, Landmark, Briefcase, Factory, ShoppingBag, Phone,
  PiggyBank, Sparkles,
} from "lucide-react";
import { BUSINESS_CATEGORIES, INDUSTRY_CONFIG } from "@/lib/industry-config";

const features = [
  { icon: BookOpen, title: "Bookkeeping", desc: "Track income, expenses, and generate financial statements automatically." },
  { icon: Package, title: "Inventory", desc: "Manage stock across multiple locations with real-time tracking." },
  { icon: FileText, title: "Invoicing", desc: "Create professional invoices and track payments effortlessly." },
  { icon: Users, title: "Payroll & HR", desc: "Process payroll, manage attendance, and handle leave requests." },
  { icon: Store, title: "Online Store", desc: "Launch your storefront and sell online with integrated checkout." },
  { icon: Landmark, title: "Banking", desc: "Move money, reconcile accounts, and watch every kobo." },
  { icon: PiggyBank, title: "Capital Access", desc: "Get loan offers tailored to your business performance." },
  { icon: BarChart3, title: "Reports", desc: "AI-powered insights and analytics to grow your business." },
  { icon: Mic, title: "Voice Commands", desc: "Hands-free across every form — speak to fill, save, navigate." },
];

const INDUSTRY_ICONS: Record<string, any> = {
  MSMEs: ShoppingBag,
  Healthcare: Stethoscope,
  Agriculture: Sprout,
  Technology: Cpu,
  Finance: Landmark,
  Consultant: Briefcase,
  Manufacturing: Factory,
};

const testimonials = [
  { name: "Adebayo O.", role: "Pharmacy Owner, Lagos", quote: "Switching the dashboard to Healthcare renamed everything — patients, dispenses, stock. It finally speaks my language." },
  { name: "Chioma E.", role: "Founder, ChiStyle Fashion", quote: "The voice assistant fills my invoices while I serve customers. No more typing on a tiny phone." },
  { name: "Ibrahim M.", role: "Farmer & Offtake Manager, Kano", quote: "Tonnes, bags, hectares — the units actually match how I sell. That alone saved me hours." },
];

const steps = [
  { n: "1", title: "Create your account", desc: "Sign up free in under 2 minutes." },
  { n: "2", title: "Pick your industry", desc: "Your dashboard, terminology and KPIs tailor to it instantly." },
  { n: "3", title: "Run your business", desc: "Sell, invoice, pay staff, see profits — all in one place." },
];

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

export default function Index() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-accent/10" />
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Sparkles className="h-3.5 w-3.5" /> Tailored to your industry — out of the box
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-display text-foreground leading-tight">
                Business software that{" "}
                <span className="text-primary">speaks your language</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
                Whether you run a pharmacy, a farm, an agency or a factory — Prime renames screens,
                units, KPIs and workflows to match. Less setup, more selling.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Button size="lg" asChild className="text-base px-8">
                  <Link to="/signup">
                    Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="text-base px-8">
                  <Link to="/pricing">View Pricing</Link>
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-primary" /> Free tier available</span>
                <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-primary" /> No credit card required</span>
                <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-primary" /> Works offline</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="relative rounded-2xl border bg-card shadow-xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <span className="ml-3 text-xs text-muted-foreground">Healthcare workspace</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Total Billed", v: "₦4.2M" },
                    { label: "Active Patients", v: "1,284" },
                    { label: "Dispenses", v: "892" },
                    { label: "Stock Alerts", v: "12" },
                  ].map((k) => (
                    <div key={k.label} className="rounded-xl bg-muted/50 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.label}</p>
                      <p className="text-lg font-bold text-foreground mt-1">{k.v}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border bg-background p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mic className="h-3.5 w-3.5 text-primary" />
                    <span>"Add medication, paracetamol, 200 tablets, price 1500"</span>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 hidden sm:flex items-center gap-2 rounded-full bg-card border shadow-lg px-4 py-2 text-xs font-medium">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Industry-tailored
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Industries */}
      <section id="industries" className="py-20 sm:py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-12" {...fadeUp}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
              Built for your industry
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold font-display text-foreground">
              One platform, seven tailored experiences
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Pick your focus during onboarding and the entire dashboard adapts — terminology,
              units of measurement, KPIs, sidebar and quick actions.
            </p>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {BUSINESS_CATEGORIES.map((c, i) => {
              const Icon = INDUSTRY_ICONS[c] || ShoppingBag;
              const cfg = INDUSTRY_CONFIG[c];
              return (
                <motion.div key={c} {...fadeUp} transition={{ duration: 0.4, delay: i * 0.05 }}>
                  <Link to={`/signup`} className="group block h-full">
                    <Card className="h-full hover:shadow-lg transition-all border-border/60 hover:border-primary/40">
                      <CardContent className="p-5">
                        <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <h3 className="text-base font-semibold text-foreground font-display">{c}</h3>
                        <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed line-clamp-2">{cfg.hint}</p>
                        <div className="mt-3 flex flex-wrap gap-1">
                          {cfg.subcategories.slice(0, 3).map((s) => (
                            <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{s}</span>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features / Services */}
      <section id="features" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-16" {...fadeUp}>
            <h2 className="text-3xl sm:text-4xl font-bold font-display text-foreground">
              Everything you need to run a real business
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              Nine integrated modules — connected by a single voice-driven assistant.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div key={f.title} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.05 }}>
                <Card className="group hover:shadow-lg transition-all duration-300 border-border/60 hover:border-primary/30 h-full">
                  <CardContent className="p-6">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <f.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground font-display">{f.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-gradient-to-b from-background to-muted/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-12" {...fadeUp}>
            <h2 className="text-3xl font-bold font-display text-foreground">Up and running in 3 steps</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <motion.div key={s.n} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.1 }}>
                <Card className="h-full">
                  <CardContent className="p-6">
                    <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold mb-4">
                      {s.n}
                    </div>
                    <h3 className="text-lg font-semibold text-foreground font-display">{s.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 bg-muted/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-12" {...fadeUp}>
            <h2 className="text-3xl font-bold font-display text-foreground">Loved by real Nigerian businesses</h2>
            <p className="mt-3 text-sm text-muted-foreground">Trusted by 1,200+ owners across pharmacy, retail, farming, finance and more.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div key={t.name} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.1 }}>
                <Card className="h-full">
                  <CardContent className="p-6">
                    <div className="flex gap-0.5 mb-4">
                      {[...Array(5)].map((_, j) => (
                        <Star key={j} className="h-4 w-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-sm text-foreground leading-relaxed italic">"{t.quote}"</p>
                    <div className="mt-4 pt-4 border-t flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold text-sm">
                        {t.name.split(" ").map(w => w[0]).join("")}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp} className="rounded-3xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground p-10 sm:p-14 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold font-display">
              Ready to tailor Prime to your business?
            </h2>
            <p className="mt-4 max-w-xl mx-auto opacity-90">
              Sign up free. Pick your industry. Start running your business smarter — today.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" variant="secondary" asChild className="text-base px-8">
                <Link to="/signup">Start for Free <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-base px-8 bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                <Link to="/contact"><Phone className="mr-2 h-4 w-4" /> Talk to sales</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
