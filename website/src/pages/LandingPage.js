import React from 'react';
import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import LogoCloud from '../components/LogoCloud';
import FeaturesGrid from '../components/FeaturesGrid';
import FeatureShowcase from '../components/FeatureShowcase';
import HowItWorks from '../components/HowItWorks';
import StatsSection from '../components/StatsSection';
import ComparisonTable from '../components/ComparisonTable';
import PricingSection from '../components/PricingSection';
import TestimonialsSection from '../components/TestimonialsSection';
import FaqSection from '../components/FaqSection';
import Footer from '../components/Footer';
import { Testimonial } from '../components/Testimonials';

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Navbar />
      <main id="main-content" className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[720px] bg-[radial-gradient(circle_at_top,rgba(40,84,255,0.09),transparent_46%)]" />
        <HeroSection />
        <LogoCloud />
        <FeaturesGrid />
        <FeatureShowcase />
        <HowItWorks />
        <StatsSection />
        <ComparisonTable />
        <PricingSection />
        <Testimonial />
        <TestimonialsSection />
        <FaqSection />
        <Footer />
      </main>
    </div>
  );
}
