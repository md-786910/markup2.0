import React from 'react';
import { SiteNav } from './site';

// Pages not yet built on SiteLayout still render <Navbar />: same design-system nav.
// `display: contents` keeps the header sticky to the page, not to this wrapper.
export default function Navbar() {
  return (
    <div className="kc km km-chrome">
      <SiteNav />
    </div>
  );
}
