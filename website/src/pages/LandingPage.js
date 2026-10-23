import React from 'react';
import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import HowItWorks from '../components/HowItWorks';
import ProductTour from '../components/ProductTour';
import IntegrationsStrip from '../components/IntegrationsStrip';
import PricingSection from '../components/PricingSection';
import FaqSection from '../components/FaqSection';
import CtaSection from '../components/CtaSection';
import Footer from '../components/Footer';

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      <Navbar />
      <main id="main-content" className="relative">
        <HeroSection />
        <HowItWorks />
        <ProductTour />
        <IntegrationsStrip />
        <PricingSection />
        <FaqSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
