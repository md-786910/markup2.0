import React from 'react';
import useScrollReveal from '../hooks/useScrollReveal';

const logos = ['Ampioneers', 'Bright Group', 'Bambuam', 'Grandios', 'Leoprinting', 'CoolAirUSA', 'Strom Galeries', 'Bright Now', 'Wonka', 'Stark'];

export default function LogoCloud() {
  const ref = useScrollReveal();

  return (
    <section className="border-y border-emerald-100/70 bg-white/70 py-10" ref={ref}>
      <div className="px-4 sm:px-6">
        <p className="text-center text-xs font-semibold uppercase text-[#53645f]">
          Trusted by fast-moving design, product, and agency teams
        </p>
        <div className="paused-on-hover mt-8 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
          <div className="logo-marquee-track flex w-max gap-14">
            {[...logos, ...logos].map((name, i) => (
              <span key={`${name}-${i}`} className="whitespace-nowrap font-display text-2xl font-bold text-[#8a9b94]">
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

