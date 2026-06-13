import { useEffect, useState } from "react";
import { Mic, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const COMMANDS = [
  { spoken: "Create invoice for Adunni, three bags of rice at twelve thousand each", fields: { customer: "Adunni", qty: "3", item: "Rice (50kg)", price: "₦12,000" } },
  { spoken: "Add patient Tunde Bello, age forty-five, blood type O positive", fields: { customer: "Tunde Bello", qty: "45", item: "O+", price: "—" } },
  { spoken: "Log expense, generator fuel, eight thousand naira, today", fields: { customer: "Fuel", qty: "1", item: "Generator", price: "₦8,000" } },
];

export function VoiceDemoStrip() {
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState("");

  const cmd = COMMANDS[idx];

  useEffect(() => {
    setTyped("");
    let i = 0;
    const t = setInterval(() => {
      i++;
      setTyped(cmd.spoken.slice(0, i));
      if (i >= cmd.spoken.length) clearInterval(t);
    }, 35);
    const next = setTimeout(() => setIdx((p) => (p + 1) % COMMANDS.length), 5500);
    return () => {
      clearInterval(t);
      clearTimeout(next);
    };
  }, [idx]);

  return (
    <section className="py-20 bg-gradient-to-br from-primary/95 to-primary/70 text-primary-foreground overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-primary-foreground text-xs font-medium mb-4">
              <Sparkles className="h-3 w-3" /> Built-in voice assistant
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold font-display leading-tight">
              Speak. Prime fills the form.
            </h2>
            <p className="mt-4 text-base opacity-90 max-w-md">
              Every CRUD form in Prime auto-arms the microphone when it opens.
              Dictate naturally — Prime extracts names, amounts, quantities and
              dates and drops them in the right fields.
            </p>
            <ul className="mt-6 space-y-2 text-sm opacity-95">
              {["Auto-listens when modals open", "Works in noisy markets and shops", "₦ and Nigerian terms understood natively"].map((b) => (
                <li key={b} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  {b}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-white text-foreground p-5 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Mic className="h-4 w-4" />
                </div>
                <span className="absolute inset-0 rounded-full ring-2 ring-primary animate-ping opacity-40" />
              </div>
              <div className="flex-1">
                <div className="flex items-end gap-0.5 h-6">
                  {[...Array(28)].map((_, i) => (
                    <motion.span
                      key={i}
                      className="w-1 rounded-full bg-primary/70"
                      animate={{ height: ["20%", "100%", "30%", "80%", "20%"] }}
                      transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.04 }}
                    />
                  ))}
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Listening</span>
            </div>

            <div className="rounded-lg bg-muted/60 p-3 mb-4 min-h-[3rem]">
              <p className="text-sm italic">"{typed}<span className="animate-pulse">|</span>"</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(cmd.fields).map(([k, v]) => (
                <motion.div
                  key={k + idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="rounded border bg-background p-2"
                >
                  <p className="text-[9px] uppercase text-muted-foreground tracking-wider">{k}</p>
                  <p className="font-semibold text-foreground mt-0.5">{v}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
