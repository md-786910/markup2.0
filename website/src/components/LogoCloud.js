import React from 'react';
import { GlobeIcon, LightningIcon, DiamondIcon, StarIcon, HexagonIcon, CubeIcon } from './icons';
import useScrollReveal from '../hooks/useScrollReveal';

const LOGOS = [
  { name: 'Acme Co', icon: GlobeIcon },
  { name: 'TechForge', icon: LightningIcon },
  { name: 'Prisma Labs', icon: DiamondIcon },
  { name: 'NovaStar', icon: StarIcon },
  { name: 'Hexacore', icon: HexagonIcon },
  { name: 'CubeStack', icon: CubeIcon },
];

export default function LogoCloud() {
  const ref = useScrollReveal();

  return (
    <section className="bg-white py-16" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-sm font-medium text-gray-400 uppercase tracking-widest text-center mb-10" data-reveal>
          Trusted by teams worldwide
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6" data-reveal data-delay="1">
          {LOGOS.map(({ name, icon: Icon }) => (
            <div key={name} className="flex items-center gap-2 text-gray-300 hover:text-gray-500 transition-colors cursor-default group">
              <Icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="font-display font-bold text-lg">{name}</span>
            </div>
          ))}
        </div>
        <div className="mt-12 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
      </div>
    </section>
  );
}
