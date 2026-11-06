import React from 'react';
import { SiteFooter } from './site';

// Pages not yet built on SiteLayout still render <Footer />: same design-system footer.
export default function Footer() {
  return (
    <div className="kc km km-chrome">
      <SiteFooter />
    </div>
  );
}
