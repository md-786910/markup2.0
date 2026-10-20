import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CookieConsentManager from './components/CookieConsentManager';
import SEO from './components/SEO';
import { getRouteSeo } from './seo/seoUtils';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const CustomersPage = lazy(() => import('./pages/CustomersPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const SupportPage = lazy(() => import('./pages/SupportPage'));
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
    <div className="min-h-screen bg-white px-6 py-24 text-center">
      <SEO />
      <main>
        <h1 className="font-display text-4xl font-bold text-[#10231f]">Page not found</h1>
        <p className="mx-auto mt-4 max-w-xl text-[#53645f]">
          This page is not available. Return to the Kommently homepage to continue.
        </p>
        <a className="button-primary mt-8" href="/">
          Go home
        </a>
      </main>
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
          <Route path="/customers" element={<Page path="/customers"><CustomersPage /></Page>} />
          <Route path="/pricing" element={<Page path="/pricing"><PricingPage /></Page>} />
          <Route path="/blog" element={<Page path="/blog"><BlogPage /></Page>} />
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
