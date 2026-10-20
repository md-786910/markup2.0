const { createProxyMiddleware } = require('http-proxy-middleware');

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

module.exports = function (app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: SERVER_URL,
      changeOrigin: true,
    })
  );
  app.use(
    '/uploads',
    createProxyMiddleware({
      target: SERVER_URL,
      changeOrigin: true,
    })
  );
};
