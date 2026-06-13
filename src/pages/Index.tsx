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
  PiggyBank, Sparkles, ShoppingCart, Zap,
} from "lucide-react";
import { BUSINESS_CATEGORIES, INDUSTRY_CONFIG } from "@/lib/industry-config";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { BeforeAfterSlider } from "@/components/home/BeforeAfterSlider";
import { CountUp } from "@/components/home/CountUp";
import { VoiceDemoStrip } from "@/components/home/VoiceDemoStrip";

import heroPharmacy from "@/assets/home/hero-pharmacy.jpg";
import heroRetail from "@/assets/home/hero-retail.jpg";
import heroFarm from "@/assets/home/hero-farm.jpg";
import heroTech from "@/assets/home/hero-tech.jpg";
import beforePaper from "@/assets/home/before-paper.jpg";
import afterDashboard from "@/assets/home/after-dashboard.jpg";
import indHealthcare from "@/assets/home/ind-healthcare.jpg";
import indMsmes from "@/assets/home/ind-msmes.jpg";
import indAgriculture from "@/assets/home/ind-agriculture.jpg";
import indTechnology from "@/assets/home/ind-technology.jpg";
import indFinance from "@/assets/home/ind-finance.jpg";
import indConsultant from "@/assets/home/ind-consultant.jpg";
import indManufacturing from "@/assets/home/ind-manufacturing.jpg";
import avatarAdebayo from "@/assets/home/avatar-adebayo.jpg";
import avatarChioma from "@/assets/home/avatar-chioma.jpg";
import avatarIbrahim from "@/assets/home/avatar-ibrahim.jpg";
import step1 from "@/assets/home/step-1.png";
import step2 from "@/assets/home/step-2.png";
import step3 from "@/assets/home/step-3.png";

const HERO_SLIDES = [
  {
    src: heroPharmacy,
    label: "Healthcare",
    kpis: [
      { label: "Active Patients", value: "1,284" },
      { label: "Dispenses", value: "892" },
      { label: "Billed", value: "₦4.2M" },
      { label: "Low Stock", value: "12" },
    ],
    voice: "Add medication, paracetamol, 200 tablets, price 1500",
  },
  {
    src: heroRetail,
    label: "Retail",
    kpis: [
      { label: "Today's Sales", value: "₦186K" },
      { label: "Orders", value: "47" },
      { label: "Top SKU", value: "Ankara" },
      { label: "Stock Value", value: "₦2.1M" },
    ],
    voice: "Sell three yards Ankara to Adunni, twelve thousand naira",
  },
  {
    src: heroFarm,
    label: "Agriculture",
    kpis: [
      { label: "Hectares", value: "18" },
      { label: "Tonnes Sold", value: "42" },
      { label: "Offtakers", value: "9" },
      { label: "Revenue", value: "₦8.5M" },
    ],
    voice: "Record harvest, two tonnes maize, store at warehouse B",
  },
  {
    src: heroTech,
    label: "Technology",
    kpis: [
      { label: "MRR", value: "₦3.4M" },
      { label: "Clients", value: "28" },
      { label: "Burn", value: "₦1.8M" },
      { label: "Runway", value: "14mo" },
    ],
    voice: "Invoice Acme Studios, web design retainer, 850k monthly",
  },
];

const INDUSTRY_VISUALS: Record<string, { img: string; icon: any; tag: string }> = {
  MSMEs: { img: indMsmes, icon: ShoppingBag, tag: "Retail & Trade" },
  Healthcare: { img: indHealthcare, icon: Stethoscope, tag: "Clinics & Pharmacies" },
  Agriculture: { img: indAgriculture, icon: Sprout, tag: "Farms & Agro" },
  Technology: { img: indTechnology, icon: Cpu, tag: "Startups & Studios" },
  Finance: { img: indFinance, icon: Landmark, tag: "Fintech & Lending" },
  Consultant: { img: indConsultant, icon: Briefcase, tag: "Services & Advisory" },
  Manufacturing: { img: indManufacturing, icon: Factory, tag: "Production & Supply" },
};

const SERVICES = [
  {
    icon: BookOpen, title: "Bookkeeping that runs itself",
    desc: "Auto-categorised transactions, instant financial statements, audit-ready ledger — without an accountant on staff.",
    bullets: ["Chart of accounts pre-built", "P&L, Balance Sheet, Cash Flow", "Reconciliation in minutes"],
    accent: "from-emerald-500/15 to-emerald-500/5",
  },
  {
    icon: Package, title: "Inventory across every location",
    desc: "Track stock in real time across warehouses and shops. Get alerted before you sell out.",
    bullets: ["Multi-location stock", "Low-stock alerts", "Supplier & PO management"],
    accent: "from-blue-500/15 to-blue-500/5",
  },
  {
    icon: FileText, title: "Invoices customers actually pay",
    desc: "Professional invoices with payment links, automatic reminders and overdue tracking.",
    bullets: ["7.5% VAT calc built-in", "Pay-by-link + reminders", "Recurring invoices"],
    accent: "from-amber-500/15 to-amber-500/5",
  },
  {
    icon: ShoppingCart, title: "Point of Sale that just works",
    desc: "Sell offline or online, accept any payment method, sync inventory and bookkeeping live.",
    bullets: ["Works offline", "Cart drawer optimised for mobile", "Receipts via WhatsApp & SMS"],
    accent: "from-rose-500/15 to-rose-500/5",
  },
  {
    icon: Users, title: "Payroll & HR for Nigerian teams",
    desc: "Run payroll with PAYE and pension calculated automatically. Manage leave, attendance and contracts.",
    bullets: ["17.5% tax & pension", "Leave requests in-app", "Staff wallets & limits"],
    accent: "from-violet-500/15 to-violet-500/5",
  },
  {
    icon: Store, title: "Your online store, your subdomain",
    desc: "Launch a storefront on your own subdomain. Anonymous checkout, automatic invoices.",
    bullets: ["yourbrand.getprime.app", "Auto-invoice on delivery", "Inventory-aware checkout"],
    accent: "from-teal-500/15 to-teal-500/5",
  },
];

const STATS = [
  { value: 1284, suffix: "+", label: "Businesses onboarded" },
  { value: 92000, suffix: "+", label: "Invoices generated" },
  { value: 2.4, label: "₦ Bn processed", format: (n: number) => `₦${(n / 1).toFixed(1)}B` },
  { value: 36, label: "States covered" },
];

const TESTIMONIALS = [
  {
    name: "Adebayo O.", role: "Pharmacy Owner, Lagos", avatar: avatarAdebayo,
    tag: "Healthcare", metric: "↓ 65% admin time",
    quote: "Switching the dashboard to Healthcare renamed everything — patients, dispenses, stock. It finally speaks my language.",
  },
  {
    name: "Chioma E.", role: "Founder, ChiStyle Fashion", avatar: avatarChioma,
    tag: "Retail", metric: "3× faster invoicing",
    quote: "The voice assistant fills my invoices while I serve customers. No more typing on a tiny phone.",
  },
  {
    name: "Ibrahim M.", role: "Farmer & Offtake Manager, Kano", avatar: avatarIbrahim,
    tag: "Agriculture", metric: "Zero stock-outs this season",
    quote: "Tonnes, bags, hectares — the units actually match how I sell. That alone saved me hours.",
  },
];

const STEPS = [
  { n: "1", img: step1, title: "Create your account", desc: "Sign up free in under 2 minutes — no card required." },
  { n: "2", img: step2, title: "Pick your industry", desc: "Your dashboard, terminology and KPIs tailor to it instantly." },
  { n: "3", img: step3, title: "Run your business", desc: "Sell, invoice, pay staff, see profits — all in one place." },
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

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-accent/10" />
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Sparkles className="h-3.5 w-3.5" /> Tailored to your industry — out of the box
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-display text-foreground leading-tight">
                Business software that{" "}
                <span className="text-primary">speaks your language</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
                Pharmacy, farm, agency or factory — Prime renames screens, units, KPIs and
                workflows to match. Less setup, more selling.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Button size="lg" asChild className="text-base px-8">
                  <Link to="/signup">Get Started Free <ArrowRight className="ml-2 h-4 w-4" /></Link>
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

            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.15 }}>
              <HeroCarousel slides={HERO_SLIDES} />
            </motion.div>
          </div>
        </div>
      </section>

      {/* STATS BAND */}
      <section className="border-y bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl sm:text-4xl font-bold font-display text-primary">
                <CountUp to={s.value} suffix={s.suffix} format={s.format} />
              </p>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* BEFORE / AFTER */}
      <section className="py-20 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-10" {...fadeUp}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
              <Zap className="h-3 w-3" /> Before & After Prime
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold font-display text-foreground">
              From scattered to sorted — in one afternoon
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              Drag the handle to see what most Nigerian business owners replace when they switch to Prime.
            </p>
          </motion.div>
          <motion.div {...fadeUp}>
            <BeforeAfterSlider beforeSrc={beforePaper} afterSrc={afterDashboard} beforeLabel="Before Prime" afterLabel="With Prime" />
          </motion.div>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {["70% less admin time", "3× faster invoicing", "₦0 to get started"].map((s) => (
              <div key={s} className="flex items-center justify-center gap-2 rounded-xl border bg-card p-4 text-sm font-medium">
                <CheckCircle className="h-4 w-4 text-primary" /> {s}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INDUSTRIES */}
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
              units, KPIs, sidebar and quick actions.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {BUSINESS_CATEGORIES.map((c, i) => {
              const v = INDUSTRY_VISUALS[c];
              const Icon = v?.icon || ShoppingBag;
              const cfg = INDUSTRY_CONFIG[c];
              return (
                <motion.div key={c} {...fadeUp} transition={{ duration: 0.4, delay: i * 0.05 }}>
                  <Link to="/signup" className="group block h-full">
                    <Card className="h-full overflow-hidden hover:shadow-xl transition-all border-border/60 hover:border-primary/40 hover:-translate-y-1 duration-300">
                      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                        {v && (
                          <img
                            src={v.img} alt={c} loading="lazy"
                            className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent" />
                        <div className="absolute top-3 left-3 h-9 w-9 rounded-lg bg-white/95 backdrop-blur flex items-center justify-center shadow">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <span className="absolute bottom-3 left-3 text-[10px] uppercase tracking-wider text-white/90 font-semibold">
                          {v?.tag}
                        </span>
                      </div>
                      <CardContent className="p-5">
                        <h3 className="text-base font-semibold text-foreground font-display flex items-center justify-between">
                          {c}
                          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </h3>
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

      {/* SERVICES — ZIGZAG */}
      <section id="features" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-16" {...fadeUp}>
            <h2 className="text-3xl sm:text-4xl font-bold font-display text-foreground">
              Everything you need to run a real business
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              Six core modules + voice assistant — connected, not bolted together.
            </p>
          </motion.div>

          <div className="space-y-20 lg:space-y-28">
            {SERVICES.map((s, i) => {
              const reverse = i % 2 === 1;
              return (
                <motion.div
                  key={s.title}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className={`grid lg:grid-cols-2 gap-10 items-center ${reverse ? "lg:flex-row-reverse" : ""}`}
                >
                  <div className={reverse ? "lg:order-2" : ""}>
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <s.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-bold font-display text-foreground">{s.title}</h3>
                    <p className="mt-3 text-muted-foreground leading-relaxed">{s.desc}</p>
                    <ul className="mt-5 space-y-2">
                      {s.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-2 text-sm text-foreground">
                          <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" /> {b}
                        </li>
                      ))}
                    </ul>
                    <Button variant="ghost" asChild className="mt-5 px-0 hover:bg-transparent hover:text-primary">
                      <Link to="/signup">Try it free <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
                    </Button>
                  </div>
                  <div className={reverse ? "lg:order-1" : ""}>
                    <div className={`relative rounded-2xl bg-gradient-to-br ${s.accent} border p-6 shadow-lg`}>
                      <ServiceMock kind={s.title} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* VOICE STRIP */}
      <VoiceDemoStrip />

      {/* HOW IT WORKS */}
      <section className="py-20 bg-gradient-to-b from-background to-muted/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-12" {...fadeUp}>
            <h2 className="text-3xl font-bold font-display text-foreground">Up and running in 3 steps</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((s, i) => (
              <motion.div key={s.n} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.1 }}>
                <Card className="h-full overflow-hidden text-center">
                  <div className="aspect-[5/4] bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-6">
                    <img src={s.img} alt={s.title} loading="lazy" className="max-h-full max-w-full object-contain" />
                  </div>
                  <CardContent className="p-6">
                    <div className="h-10 w-10 mx-auto rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold mb-3">
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

      {/* TESTIMONIALS */}
      <section className="py-20 bg-muted/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-12" {...fadeUp}>
            <h2 className="text-3xl font-bold font-display text-foreground">Loved by real Nigerian businesses</h2>
            <p className="mt-3 text-sm text-muted-foreground">Trusted by 1,200+ owners across pharmacy, retail, farming, finance and more.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={t.name} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.1 }}>
                <Card className="h-full">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, j) => (
                          <Star key={j} className="h-4 w-4 fill-primary text-primary" />
                        ))}
                      </div>
                      <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {t.tag}
                      </span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed italic">"{t.quote}"</p>
                    <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/5 px-2.5 py-1 rounded-full">
                      <Zap className="h-3 w-3" /> {t.metric}
                    </div>
                    <div className="mt-4 pt-4 border-t flex items-center gap-3">
                      <img
                        src={t.avatar} alt={t.name} loading="lazy" width={48} height={48}
                        className="h-12 w-12 rounded-full object-cover ring-2 ring-primary/20"
                      />
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
          <motion.div {...fadeUp} className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground p-10 sm:p-14 text-center">
            <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold font-display">Ready to tailor Prime to your business?</h2>
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
            </div>
          </motion.div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

/* --- Inline service mock visuals (styled placeholders, no extra assets) --- */
function ServiceMock({ kind }: { kind: string }) {
  const Bar = ({ w, c = "bg-primary" }: { w: string; c?: string }) => (
    <div className={`h-2 rounded-full ${c}`} style={{ width: w }} />
  );

  if (kind.includes("Bookkeeping")) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Cash Flow</span><span className="text-primary font-semibold">+18.4%</span>
        </div>
        <div className="flex items-end gap-1.5 h-32">
          {[40, 60, 35, 75, 50, 90, 65, 95, 70, 80, 55, 100].map((h, i) => (
            <div key={i} className="flex-1 bg-gradient-to-t from-primary to-primary/60 rounded-t" style={{ height: `${h}%` }} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 text-[10px]">
          {["Revenue", "Expenses", "Profit"].map((l, i) => (
            <div key={l} className="rounded bg-background border p-2">
              <p className="text-muted-foreground">{l}</p>
              <p className="font-bold text-foreground">{["₦4.2M", "₦2.1M", "₦2.1M"][i]}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (kind.includes("Inventory")) {
    return (
      <div className="space-y-2">
        {[
          { n: "Paracetamol 500mg", q: 412, c: "bg-primary" },
          { n: "Ankara Fabric (yd)", q: 89, c: "bg-amber-500" },
          { n: "Rice 50kg bag", q: 12, c: "bg-red-500" },
          { n: "Generator Fuel (L)", q: 256, c: "bg-blue-500" },
        ].map((r) => (
          <div key={r.n} className="flex items-center gap-3 p-2.5 rounded-lg bg-background border">
            <div className={`h-8 w-8 rounded ${r.c}/15 flex items-center justify-center`}>
              <Package className="h-4 w-4 text-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-foreground">{r.n}</p>
              <Bar w={`${Math.min(100, r.q / 5)}%`} c={r.c} />
            </div>
            <span className="text-xs font-bold text-foreground">{r.q}</span>
          </div>
        ))}
      </div>
    );
  }
  if (kind.includes("Invoices")) {
    return (
      <div className="space-y-3 text-xs">
        <div className="flex items-center justify-between border-b pb-2">
          <span className="font-semibold">INV-00184</span>
          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">Paid</span>
        </div>
        {[{l:"3× Ankara Fabric",p:"₦36,000"},{l:"Tailoring service",p:"₦15,000"},{l:"Delivery",p:"₦2,500"}].map((r)=>(
          <div key={r.l} className="flex justify-between"><span className="text-muted-foreground">{r.l}</span><span>{r.p}</span></div>
        ))}
        <div className="border-t pt-2 flex justify-between"><span className="text-muted-foreground">VAT 7.5%</span><span>₦3,937</span></div>
        <div className="flex justify-between text-base font-bold"><span>Total</span><span className="text-primary">₦57,437</span></div>
      </div>
    );
  }
  if (kind.includes("Point of Sale")) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {["Bread","Milk","Soap","Sugar","Rice","Salt","Oil","Egg","Tea"].map((p,i)=>(
          <div key={p} className="aspect-square rounded-lg bg-background border flex flex-col items-center justify-center text-[10px] font-medium text-foreground">
            <span className="text-lg">{["🍞","🥛","🧼","🍬","🍚","🧂","🫒","🥚","🍵"][i]}</span>
            {p}
          </div>
        ))}
        <div className="col-span-3 mt-2 rounded-lg bg-primary text-primary-foreground p-3 flex justify-between text-sm font-bold">
          <span>Cart (3)</span><span>₦4,250</span>
        </div>
      </div>
    );
  }
  if (kind.includes("Payroll")) {
    return (
      <div className="space-y-2">
        {[{n:"Tunde A.",r:"Sales",p:"₦125,000"},{n:"Amaka O.",r:"Accountant",p:"₦180,000"},{n:"Sani M.",r:"Store Mgr",p:"₦150,000"}].map((e)=>(
          <div key={e.n} className="flex items-center gap-3 p-2.5 rounded-lg bg-background border">
            <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold">{e.n[0]}</div>
            <div className="flex-1">
              <p className="text-xs font-medium text-foreground">{e.n}</p>
              <p className="text-[10px] text-muted-foreground">{e.r}</p>
            </div>
            <span className="text-xs font-bold text-foreground">{e.p}</span>
          </div>
        ))}
        <div className="rounded-lg bg-primary/10 p-3 text-xs flex justify-between font-semibold">
          <span>Net payroll</span><span className="text-primary">₦455,000</span>
        </div>
      </div>
    );
  }
  // Online Store
  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-background border p-3 text-xs">
        <p className="text-muted-foreground">Your store URL</p>
        <p className="font-mono font-semibold text-foreground mt-1">chistyle.getprime.app</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {["Ankara Dress","Headwrap Set","Tote Bag","Earrings"].map((p,i)=>(
          <div key={p} className="rounded-lg bg-background border p-3">
            <div className="aspect-square rounded bg-gradient-to-br from-primary/30 to-accent/30 mb-2" />
            <p className="text-xs font-medium text-foreground">{p}</p>
            <p className="text-[11px] text-primary font-bold">{["₦18,000","₦8,500","₦6,000","₦3,200"][i]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
