import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CookieConsentManager from './components/CookieConsentManager';
import SEO from './components/SEO';
import { SiteLayout, CTA } from './components/site';
import { getRouteSeo } from './seo/seoUtils';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const CustomersPage = lazy(() => import('./pages/CustomersPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const productPage = (name) => lazy(() => import('./pages/ProductPages').then((m) => ({ default: m[name] })));
const WebsiteReviewPage = productPage('WebsiteReviewPage');
const DocumentReviewPage = productPage('DocumentReviewPage');
const ApprovalsPage = productPage('ApprovalsPage');
const IntegrationsPage = productPage('IntegrationsPage');
const TeamsPage = productPage('TeamsPage');
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
    <SiteLayout>
      <SEO />
      <section className="km-sec light">
        <div className="km-wrap narrow">
          <div className="km-eyebrow">404</div>
          <h1 className="km-h1">This page doesn't exist</h1>
          <p className="km-lead" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
            The link may be old or mistyped. Here are a few places to go instead.
          </p>
          <div className="km-actions center">
            <CTA href="/">Go to the homepage</CTA>
            <CTA href="/pricing" variant="secondary">See pricing</CTA>
            <CTA href="/support" variant="secondary">Contact support</CTA>
          </div>
        </div>
      </section>
    </SiteLayout>
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
          <Route path="/website-review" element={<Page path="/website-review"><WebsiteReviewPage /></Page>} />
          <Route path="/document-review" element={<Page path="/document-review"><DocumentReviewPage /></Page>} />
          <Route path="/approvals" element={<Page path="/approvals"><ApprovalsPage /></Page>} />
          <Route path="/integrations" element={<Page path="/integrations"><IntegrationsPage /></Page>} />
          <Route path="/teams" element={<Page path="/teams"><TeamsPage /></Page>} />
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
