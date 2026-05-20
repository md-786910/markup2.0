import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import CustomersPage from './pages/CustomersPage';
import PricingPage from './pages/PricingPage';
import BlogPage from './pages/BlogPage';
import SupportPage from './pages/SupportPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import CookiePolicyPage from './pages/CookiePolicyPage';
import CookieConsentManager from './components/CookieConsentManager';

function App() {
  return (
    <BrowserRouter>
      <CookieConsentManager />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/cookie-policy" element={<CookiePolicyPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
