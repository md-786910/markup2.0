export const SITE_URL = process.env.REACT_APP_SITE_URL || (
  typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8083'
    : 'https://kommently.info'
);
