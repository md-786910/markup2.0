import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CookieConsentManager from './components/CookieConsentManager';
import SEO from './components/SEO';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { getRouteSeo } from './seo/seoUtils';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const CustomersPage = lazy(() => import('./pages/CustomersPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const SupportPage = lazy(() => import('./pages/SupportPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const CookiePolicyPage = lazy(() => import('./pages/CookiePolicyPage'));

function Page({ path, children }) {
  return (
    <>
      <SEO route={getRouteSeo(path)} />
      {children}
    </>
  );
}

function NotFoundPage() {
  return (
    <div className="min-h-screen bg-white">
      <SEO />
      <Navbar />
      <main id="main-content" className="site-container py-24 text-center sm:py-32">
        <p className="text-sm font-semibold text-[#003dff]">404</p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">This page doesn't exist.</h1>
        <p className="mx-auto mt-4 max-w-md text-slate-600">
          The link may be old or mistyped. Here are a few places to go instead.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a className="button-primary" href="/">Go to the homepage</a>
          <a className="button-secondary" href="/pricing">See pricing</a>
          <a className="button-secondary" href="/support">Contact support</a>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <CookieConsentManager />
      <Suspense fallback={<div className="min-h-screen bg-white" />}>
        <Routes>
          <Route path="/" element={<Page path="/"><LandingPage /></Page>} />
          <Route path="/use-cases" element={<Page path="/use-cases"><CustomersPage /></Page>} />
          <Route path="/customers" element={<Navigate to="/use-cases" replace />} />
          <Route path="/pricing" element={<Page path="/pricing"><PricingPage /></Page>} />
          <Route path="/about" element={<Page path="/about"><AboutPage /></Page>} />
          <Route path="/support" element={<Page path="/support"><SupportPage /></Page>} />
          <Route path="/privacy" element={<Page path="/privacy"><PrivacyPage /></Page>} />
          <Route path="/terms" element={<Page path="/terms"><TermsPage /></Page>} />
          <Route path="/cookie-policy" element={<Page path="/cookie-policy"><CookiePolicyPage /></Page>} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
