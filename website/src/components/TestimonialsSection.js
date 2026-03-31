import React from 'react';
import { TESTIMONIALS } from '../data/testimonials';
import useScrollReveal from '../hooks/useScrollReveal';

export default function TestimonialsSection() {
  const ref = useScrollReveal();

  return (
    <section className="bg-gray-50 py-24" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto" data-reveal>
          <span className="text-blue-600 font-semibold text-sm uppercase tracking-wider">Who It's For</span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mt-3">
            Built for teams that ship
          </h2>
          <p className="text-lg text-gray-500 mt-4">
            Whether you're a solo freelancer or a 50-person agency, Feedbackly fits your workflow.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mt-16">
          {TESTIMONIALS.map((testimonial, i) => (
            <div
              key={testimonial.name}
              className="relative bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 group"
              data-reveal
              data-delay={String(i + 1)}
            >
              {/* Decorative quote */}
              <span className="absolute top-4 right-6 text-6xl text-gray-100 font-serif leading-none select-none group-hover:text-blue-100 transition-colors">
                &ldquo;
              </span>

              {/* Header */}
              <div className="flex items-center gap-3 relative z-10">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${testimonial.gradient} flex items-center justify-center`}>
                  <span className="text-sm text-white font-semibold">{testimonial.initials}</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{testimonial.name}</p>
                  <p className="text-blue-600 text-sm font-medium">{testimonial.role}</p>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-gray-100 my-5" />

              {/* Description */}
              <p className="text-gray-600 leading-relaxed text-[15px] relative z-10">
                {testimonial.quote}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
