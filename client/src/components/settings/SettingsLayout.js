import React from 'react';
import { PageHeader } from '../kc';

// Every settings page: the header, then a 720px column of sections 24px apart.
export default function SettingsLayout({ title, subtitle, actions, children }) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} actions={actions} />
      <div className="kc-stack kc-page-narrow">{children}</div>
    </>
  );
}

// A muted line for loading and empty states inside a section body
export function Muted({ children }) {
  return <p className="m-0 text-ui text-gray-500">{children}</p>;
}
