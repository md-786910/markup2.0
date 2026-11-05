import React from 'react';

// Loading placeholder with the project card's shape (design system ProjectCard)
export default function SkeletonCard() {
  return (
    <div className="kc-card animate-pulse" aria-hidden="true">
      <div className="kc-thumb" />
      <div className="kc-cb">
        <div className="kc-skel" style={{ height: 14, width: '70%' }} />
        <div className="kc-skel" style={{ height: 12, width: '50%' }} />
        <div className="kc-skel" style={{ height: 12, width: '40%' }} />
      </div>
    </div>
  );
}
