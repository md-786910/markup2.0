const fs = require('fs');
const path = require('path');
const { absoluteUrl, metadata } = require('./seo-build-utils.cjs');

const publicDir = path.resolve(__dirname, '..', 'public');
const today = new Date().toISOString().slice(0, 10);

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${metadata.routes.map((route) => `  <url>
    <loc>${absoluteUrl(route.path)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority.toFixed(1)}</priority>
  </url>`).join('\n')}
</urlset>
`;

const robots = `User-agent: *
Allow: /
${metadata.blockedPaths.map((blockedPath) => `Disallow: ${blockedPath}`).join('\n')}

Sitemap: ${absoluteUrl('/sitemap.xml')}
`;

fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap);
fs.writeFileSync(path.join(publicDir, 'robots.txt'), robots);
