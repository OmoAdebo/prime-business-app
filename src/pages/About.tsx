import { PublicNavbar } from "@/components/PublicNavbar";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Target, Eye, Heart } from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const values = [
  { icon: Target, title: "Our Mission", desc: "To empower African SMEs with world-class digital tools that simplify business management, drive growth, and unlock potential." },
  { icon: Eye, title: "Our Vision", desc: "A continent where every business — no matter the size — has access to the technology it needs to thrive in the global economy." },
  { icon: Heart, title: "Our Values", desc: "Simplicity, reliability, and customer-first innovation. We build what businesses actually need, not what looks good on a pitch deck." },
];

const team = [
  { name: "Founder & CEO", desc: "Passionate about building technology that transforms African businesses." },
  { name: "Head of Product", desc: "Focused on creating intuitive experiences for business owners." },
  { name: "Lead Engineer", desc: "Building robust, scalable infrastructure for millions of users." },
];

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      <section className="py-20 sm:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-16" {...fadeUp}>
            <h1 className="text-4xl sm:text-5xl font-bold font-display text-foreground">About Prime</h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              We're building the operating system for African businesses — one module at a time.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
            {values.map((v, i) => (
              <motion.div key={v.title} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.1 }}>
                <Card className="h-full">
                  <CardContent className="p-6 text-center">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <v.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold font-display text-foreground">{v.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div className="text-center mb-12" {...fadeUp}>
            <h2 className="text-3xl font-bold font-display text-foreground">Our Team</h2>
            <p className="mt-3 text-muted-foreground">The people behind Prime.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {team.map((t, i) => (
              <motion.div key={t.name} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.1 }}>
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <span className="text-lg font-bold text-primary">{t.name[0]}</span>
                    </div>
                    <h3 className="font-semibold text-foreground">{t.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
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
