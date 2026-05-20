import React from 'react';
import { TESTIMONIALS } from '../data/testimonials';
import useScrollReveal from '../hooks/useScrollReveal';

export default function TestimonialsSection() {
  const ref = useScrollReveal();

  return (
    <section id="testimonials" className="section-shell py-14 sm:py-14 px-10 sm:px-10" ref={ref}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center" data-reveal>
          <h4 className="text-[12px] mb-3 text-[#38BDF8] font-serif font-bold uppercase"><span className="font-extrabold">––</span> Use cases</h4>
          <h2 className="text-[24px] sm:text-[30px] md:text-[36px] lg:text-[44px] xl:text-[48px] 2xl:text-[52px] leading-[1.05] tracking-[-0.03em] font-bold font-sans mb-3">
            Built for teams that need
            <span className="block text-gradient font-sans">feedback to become action</span>
          </h2>
          <p className="text-[15px] sm:text-[16px] lg:text-[17px] xl:text-[18px] leading-[1.7] max-w-[65ch] text-[#475569] font-sans">
            From client approvals to developer handoff, Markly keeps review work visible and specific.
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((testimonial, i) => (
            <article
              key={testimonial.name}
              className="premium-card hover-lift relative rounded-[24px] p-7"
              data-reveal
              data-delay={String(i + 1)}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${testimonial.gradient}`}>
                  <span className="text-sm font-semibold text-white">{testimonial.initials}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm font-medium text-[#2854ff]">{testimonial.role}</p>
                </div>
              </div>

              <div className="my-5 h-px bg-gray-100" />

              <p className="text-[15px] leading-7 text-gray-600">
                {testimonial.quote}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
