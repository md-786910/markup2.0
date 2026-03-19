const { createProxyMiddleware } = require('http-proxy-middleware');

const API_SERVER   = process.env.REACT_APP_SERVER_URL || 'http://localhost:5001';
const PROXY_SERVER = process.env.REACT_APP_PROXY_URL  || 'http://localhost:5000';

module.exports = function (app) {
  // Socket.IO → API server (single process, rooms work correctly)
  app.use('/socket.io', createProxyMiddleware({ target: API_SERVER, changeOrigin: true, ws: true }));

  // API routes → API server
  app.use('/api/auth',        createProxyMiddleware({ target: API_SERVER, changeOrigin: true }));
  app.use('/api/projects',    createProxyMiddleware({ target: API_SERVER, changeOrigin: true }));
  app.use('/api/pins',        createProxyMiddleware({ target: API_SERVER, changeOrigin: true }));
  app.use('/api/invitations', createProxyMiddleware({ target: API_SERVER, changeOrigin: true }));
  app.use('/api/health',      createProxyMiddleware({ target: API_SERVER, changeOrigin: true }));
  app.use('/uploads',         createProxyMiddleware({ target: API_SERVER, changeOrigin: true }));
  app.use('/admin/queues',    createProxyMiddleware({ target: API_SERVER, changeOrigin: true }));

  // Proxy route → proxy server (4 cluster workers for parallel upstream fetching)
  app.use('/api/proxy', createProxyMiddleware({ target: PROXY_SERVER, changeOrigin: true }));
};
