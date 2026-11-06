import React from 'react';
import { CTABand } from './site';

// Closing band of the home page (dark, directly above the footer)
export default function CtaSection() {
  return (
    <CTABand
      title="Your next review round starts with a link"
      text="Paste a URL, invite your team or client, and resolve every comment where the work lives."
      secondary={{ label: 'Compare plans', href: '/pricing' }}
    />
  );
}
