const fs = require('fs');
const path = require('path');
const {
  metadata,
  renderFallback,
  renderJsonLd,
  renderMeta,
} = require('./seo-build-utils.cjs');

const buildDir = path.resolve(__dirname, '..', 'build');
const indexPath = path.join(buildDir, 'index.html');
const template = fs.readFileSync(indexPath, 'utf8')
  .replace(/<title>.*?<\/title>/gi, '')
  .replace(/<meta\b[^>]*data-seo="true"[^>]*>/gi, '')
  .replace(/<link\b[^>]*data-seo="true"[^>]*>/gi, '')
  .replace(/<script\b[^>]*type="application\/ld\+json"[^>]*data-seo="true"[^>]*>[\s\S]*?<\/script>/gi, '')
  .replace(/<div id="root">[\s\S]*?<\/div><\/body>/i, '<div id="root"></div></body>');

function renderPage(route) {
  const headTags = `${renderMeta(route)}\n    ${renderJsonLd(route)}`;
  return template
    .replace('</head>', `${headTags}</head>`)
    .replace('<div id="root"></div>', `<div id="root">${renderFallback(route)}</div>`);
}

metadata.routes.forEach((route) => {
  const outputDir = route.path === '/' ? buildDir : path.join(buildDir, route.path.replace(/^\//, ''));
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'index.html'), renderPage(route));
});
