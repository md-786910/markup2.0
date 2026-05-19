import React from 'react';
import { TESTIMONIALS } from '../data/testimonials';
import useScrollReveal from '../hooks/useScrollReveal';

export default function TestimonialsSection() {
  const ref = useScrollReveal();

  return (
    <section id="testimonials" className="bg-slate-50 py-20 sm:py-24" ref={ref}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center" data-reveal>
          <span className="eyebrow">Use cases</span>
          <h2 className="mt-5 font-display text-3xl font-bold tracking-tight text-gray-900 md:text-4xl lg:text-5xl">
            Built for teams that need
            <span className="block text-gradient">feedback to become action</span>
          </h2>
          <p className="mt-5 text-lg leading-8 text-gray-500">
            From client approvals to developer handoff, Markly keeps review work visible and specific.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-6xl grid-cols-1 gap-5 md:grid-cols-3">
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
