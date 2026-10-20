const metadata = require('../src/seo/siteMetadata.json');

const trimSlash = (value) => value.replace(/\/+$/, '');
const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

function getSiteUrl() {
  return trimSlash(process.env.REACT_APP_SITE_URL || process.env.SITE_URL || metadata.site.url);
}

function absoluteUrl(path = '/') {
  if (/^https?:\/\//i.test(path)) return path;
  return `${getSiteUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

function buildOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: metadata.site.legalName,
    url: getSiteUrl(),
    logo: absoluteUrl(metadata.site.logo),
    email: metadata.site.email,
    sameAs: [getSiteUrl()],
  };
}

function buildWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: metadata.site.name,
    url: getSiteUrl(),
    potentialAction: {
      '@type': 'SearchAction',
      target: `${getSiteUrl()}/blog?query={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

function buildSoftwareSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: metadata.site.name,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: getSiteUrl(),
    image: absoluteUrl(metadata.site.defaultOgImage),
    description: 'Visual comment software for pinning feedback on live websites, PDFs, and launch assets with real-time collaboration and guest review links.',
    offers: [
      { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Starter', price: '12', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Pro', price: '29', priceCurrency: 'USD' },
    ],
  };
}

function buildFAQSchema(route) {
  if (!route.faq?.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: route.faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

function buildBreadcrumbSchema(route) {
  if (!route.breadcrumbs?.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: route.breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

function buildJsonLd(route) {
  const schema = route.schema || [];
  return [
    schema.includes('Organization') ? buildOrganizationSchema() : null,
    schema.includes('WebSite') ? buildWebSiteSchema() : null,
    schema.includes('SoftwareApplication') ? buildSoftwareSchema() : null,
    schema.includes('FAQPage') ? buildFAQSchema(route) : null,
    schema.includes('BreadcrumbList') ? buildBreadcrumbSchema(route) : null,
  ].filter(Boolean);
}

function renderMeta(route) {
  const canonical = absoluteUrl(route.path);
  const image = absoluteUrl(route.ogImage || metadata.site.defaultOgImage);
  return [
    `<title>${escapeHtml(route.title)}</title>`,
    `<meta name="description" content="${escapeHtml(route.description)}" data-seo="true" />`,
    `<meta name="keywords" content="${escapeHtml(route.keywords)}" data-seo="true" />`,
    '<meta name="robots" content="index, follow, max-image-preview:large" data-seo="true" />',
    `<link rel="canonical" href="${escapeHtml(canonical)}" data-seo="true" />`,
    `<meta property="og:title" content="${escapeHtml(route.title)}" data-seo="true" />`,
    `<meta property="og:description" content="${escapeHtml(route.description)}" data-seo="true" />`,
    '<meta property="og:type" content="website" data-seo="true" />',
    `<meta property="og:url" content="${escapeHtml(canonical)}" data-seo="true" />`,
    `<meta property="og:image" content="${escapeHtml(image)}" data-seo="true" />`,
    '<meta property="og:image:width" content="1200" data-seo="true" />',
    '<meta property="og:image:height" content="630" data-seo="true" />',
    `<meta property="og:site_name" content="${escapeHtml(metadata.site.name)}" data-seo="true" />`,
    `<meta property="og:locale" content="${escapeHtml(metadata.site.locale)}" data-seo="true" />`,
    '<meta name="twitter:card" content="summary_large_image" data-seo="true" />',
    `<meta name="twitter:site" content="${escapeHtml(metadata.site.twitterHandle)}" data-seo="true" />`,
    `<meta name="twitter:title" content="${escapeHtml(route.title)}" data-seo="true" />`,
    `<meta name="twitter:description" content="${escapeHtml(route.description)}" data-seo="true" />`,
    `<meta name="twitter:image" content="${escapeHtml(image)}" data-seo="true" />`,
  ].join('\n    ');
}

function renderJsonLd(route) {
  return buildJsonLd(route)
    .map((schema) => `<script type="application/ld+json" data-seo="true">${JSON.stringify(schema)}</script>`)
    .join('\n    ');
}

function renderFallback(route) {
  const links = metadata.routes
    .map((item) => `<a href="${escapeHtml(item.path)}">${escapeHtml(item.breadcrumbs?.at(-1)?.name || item.h1)}</a>`)
    .join('');

  return [
    '<main id="main-content">',
    `<h1>${escapeHtml(route.h1)}</h1>`,
    `<p>${escapeHtml(route.summary || route.description)}</p>`,
    `<nav aria-label="Public pages">${links}</nav>`,
    '</main>',
  ].join('');
}

module.exports = {
  absoluteUrl,
  escapeHtml,
  metadata,
  renderFallback,
  renderJsonLd,
  renderMeta,
};
