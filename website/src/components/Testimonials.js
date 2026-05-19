import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { useEffect, useState } from "react";

const items = [
  {
    quote: "Markly replaced six tools and three weekly meetings. Our launches went from two weeks late to two days early.",
    name: "Rebecca Welton",
    role: "Head of Brand, Northwind",
    initials: "RW",
  },
  {
    quote: "The pixel-perfect pinning is unreal. Our designers, copy, and dev team finally speak the same language.",
    name: "Dani Rojas",
    role: "Design Lead, Initech",
    initials: "DR",
  },
  {
    quote: "We onboarded 40 reviewers in a day. Zero training. Markly is the rare tool people actually want to use.",
    name: "Sam Obisi",
    role: "VP Product, Globex",
    initials: "SO",
  },
];

export function Testimonial() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % items.length), 6000);
    return () => clearInterval(t);
  }, []);

  const item = items[i];

  return (
    <section className="relative overflow-hidden bg-[#171b2a] py-12 text-white sm:py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(48,55,124,0.34),transparent_32%),radial-gradient(circle_at_82%_78%,rgba(77,94,60,0.16),transparent_34%),linear-gradient(90deg,rgba(17,21,35,0.35),rgba(24,29,39,0.12))]" />
      <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:60px_60px]" />

      <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6">
        <Quote className="mx-auto mb-10 h-11 w-11 text-[#8fd14f]" strokeWidth={1.9} />

        <div className="relative min-h-[250px] sm:min-h-[210px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -20, filter: "blur(8px)" }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="mx-auto max-w-4xl font-display text-[1.1rem] font-semibold leading-[1.18] tracking-tight text-white sm:text-4xl lg:text-[2.05rem]">
                &ldquo;{item.quote}&rdquo;
              </p>

              <div className="mt-8 flex items-center justify-center gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-[#2854ff] text-base font-bold text-white">
                  {item.initials}
                </div>
                <div className="text-left">
                  <p className="text-[1.05rem] font-semibold text-white">{item.name}</p>
                  <p className="text-sm text-white/60">{item.role}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={() => setI((v) => (v - 1 + items.length) % items.length)}
            aria-label="Previous testimonial"
            className="grid h-10 w-10 place-items-center rounded-full border border-white/12 text-white/70 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="flex items-center gap-2">
            {items.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setI(idx)}
                aria-label={`Show testimonial ${idx + 1}`}
                className={`rounded-full transition-all ${idx === i ? "h-[5px] w-8 bg-white" : "h-[5px] w-[5px] bg-white/25 hover:bg-white/45"}`}
              />
            ))}
          </div>

          <button
            onClick={() => setI((v) => (v + 1) % items.length)}
            aria-label="Next testimonial"
            className="grid h-10 w-10 place-items-center rounded-full border border-white/12 text-white/70 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
