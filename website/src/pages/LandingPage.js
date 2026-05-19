import React, { Suspense, lazy } from 'react';
import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';

const LogoCloud = lazy(() => import('../components/LogoCloud'));
const FeaturesGrid = lazy(() => import('../components/FeaturesGrid'));
const FeatureShowcase = lazy(() => import('../components/FeatureShowcase'));
const HowItWorks = lazy(() => import('../components/HowItWorks'));
const StatsSection = lazy(() => import('../components/StatsSection'));
const ComparisonTable = lazy(() => import('../components/ComparisonTable'));
const PricingSection = lazy(() => import('../components/PricingSection'));
const TestimonialsSection = lazy(() => import('../components/TestimonialsSection'));
const FaqSection = lazy(() => import('../components/FaqSection'));
const CtaSection = lazy(() => import('../components/CtaSection'));
const Footer = lazy(() => import('../components/Footer'));
const Testimonial = lazy(() =>
  import('../components/Testimonials').then((module) => ({ default: module.Testimonial }))
);

function SectionFallback() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="premium-card overflow-hidden rounded-[28px] p-8">
        <div className="mb-5 h-4 w-28 rounded-full bg-slate-200" />
        <div className="mb-3 h-9 max-w-xl rounded-2xl bg-slate-200" />
        <div className="mb-10 h-4 max-w-2xl rounded-full bg-slate-100" />
        <div className="grid gap-5 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/80 p-6">
              <div className="absolute inset-y-0 left-0 w-20 -translate-x-full bg-gradient-to-r from-transparent via-white/70 to-transparent animate-shimmer" />
              <div className="mb-4 h-10 w-10 rounded-2xl bg-slate-200" />
              <div className="mb-2 h-5 rounded-xl bg-slate-200" />
              <div className="h-4 w-4/5 rounded-full bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Navbar />
      <main id="main-content" className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[720px] bg-[radial-gradient(circle_at_top,rgba(40,84,255,0.09),transparent_46%)]" />
        <HeroSection />
        <Suspense fallback={<SectionFallback />}>
          <LogoCloud />
          <FeaturesGrid />
          <FeatureShowcase />
          <HowItWorks />
          <StatsSection />
          <ComparisonTable />
          <PricingSection />
          <Testimonial />
          <TestimonialsSection />
          <CtaSection />
          <FaqSection />
          <Footer />
        </Suspense>
      </main>
    </div>
  );
}
