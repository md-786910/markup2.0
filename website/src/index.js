import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/typography.css';
import './styles/kommently-site.css';
import './styles/site-heroes.css';
import './styles/website-review.css';
import './styles/approvals.css';
import App from './App';

// No scroll-reveal animations: the design system allows only 150ms colour
// and border transitions (kommently-design-system/source/README.md, Motion).

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
