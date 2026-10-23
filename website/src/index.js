import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Scroll-reveal animations only run with JavaScript (index.css: .reveal-on);
// anything not revealed shortly after load is shown anyway.
document.documentElement.classList.add('reveal-on');
window.setTimeout(() => {
  document.querySelectorAll('[data-reveal]:not([data-revealed])').forEach((el) => el.setAttribute('data-revealed', 'true'));
}, 4000);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
