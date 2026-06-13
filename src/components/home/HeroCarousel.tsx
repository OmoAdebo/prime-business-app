import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Sparkles } from "lucide-react";

interface Slide {
  src: string;
  label: string;
  kpis: { label: string; value: string }[];
  voice: string;
}

interface Props {
  slides: Slide[];
  intervalMs?: number;
}

export function HeroCarousel({ slides, intervalMs = 4500 }: Props) {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % slides.length), intervalMs);
    return () => clearInterval(t);
  }, [slides.length, intervalMs]);

  const slide = slides[i];

  return (
    <div className="relative">
      <div className="relative aspect-[4/5] sm:aspect-[5/4] rounded-3xl overflow-hidden shadow-2xl border bg-card">
        <AnimatePresence mode="wait">
          <motion.img
            key={slide.src}
            src={slide.src}
            alt={slide.label}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* KPI Overlay */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`kpi-${i}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5 }}
            className="absolute left-4 right-4 bottom-4 sm:left-6 sm:right-6 sm:bottom-6 rounded-2xl bg-white/95 backdrop-blur p-4 shadow-xl"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-primary">
                {slide.label} Workspace
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Sparkles className="h-3 w-3 text-primary" /> Live
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {slide.kpis.map((k) => (
                <div key={k.label} className="rounded-lg bg-muted/60 p-2">
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
                    {k.label}
                  </p>
                  <p className="text-sm font-bold text-foreground mt-0.5">{k.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground border-t pt-2">
              <Mic className="h-3 w-3 text-primary shrink-0" />
              <span className="truncate italic">"{slide.voice}"</span>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Dots */}
        <div className="absolute top-4 right-4 flex gap-1.5">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              className={`h-1.5 rounded-full transition-all ${
                idx === i ? "w-6 bg-white" : "w-1.5 bg-white/50"
              }`}
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      <div className="absolute -bottom-4 -right-4 hidden sm:flex items-center gap-2 rounded-full bg-card border shadow-lg px-4 py-2 text-xs font-medium">
        <Sparkles className="h-3.5 w-3.5 text-primary" /> Industry-tailored
      </div>
    </div>
  );
}
