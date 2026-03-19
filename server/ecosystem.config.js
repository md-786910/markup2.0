module.exports = {
  apps: [
    {
      name: 'markup-proxy',
      script: 'proxy-server.js',
      instances: 4,          // 4 workers for parallel upstream fetching
      exec_mode: 'cluster',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PROXY_PORT: '5000',
      },
    },
    {
      name: 'markup-api',
      script: 'server.js',
      instances: 1,          // single process — Socket.IO rooms work correctly
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'production',
        API_PORT: '5001',
      },
    },
  ],
};
