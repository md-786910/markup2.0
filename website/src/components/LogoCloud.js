import React from 'react';
import useScrollReveal from '../hooks/useScrollReveal';

export default function LogoCloud() {
  const ref = useScrollReveal();

  return (
    <section className="bg-white py-16" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto" data-reveal>
          <p className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-3">
            Built for teams who ship
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 mt-4">
            {['Developers', 'Designers', 'Agencies', 'Product Teams', 'QA Engineers', 'Freelancers'].map((role) => (
              <span
                key={role}
                className="px-4 py-2 rounded-full bg-gray-50 border border-gray-100 text-sm font-medium text-gray-500"
              >
                {role}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-12 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
      </div>
    </section>
  );
}
