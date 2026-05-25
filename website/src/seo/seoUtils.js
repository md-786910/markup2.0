import metadata from './siteMetadata.json';

const trimSlash = (value) => value.replace(/\/+$/, '');

export const site = metadata.site;
export const routes = metadata.routes;
export const blockedPaths = metadata.blockedPaths;

export function getSiteUrl() {
  return trimSlash(process.env.REACT_APP_SITE_URL || site.url);
}

export function absoluteUrl(path = '/') {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getSiteUrl()}${normalizedPath}`;
}

export function getRouteSeo(pathname = '/') {
  const normalizedPath = pathname === '' ? '/' : pathname.replace(/\/+$/, '') || '/';
  return routes.find((route) => route.path === normalizedPath) || null;
}

export function buildOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site.legalName,
    url: getSiteUrl(),
    logo: absoluteUrl(site.logo),
    email: site.email,
    sameAs: [getSiteUrl()],
  };
}

export function buildWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.name,
    url: getSiteUrl(),
    potentialAction: {
      '@type': 'SearchAction',
      target: `${getSiteUrl()}/blog?query={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function buildSoftwareSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: site.name,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: getSiteUrl(),
    image: absoluteUrl(site.defaultOgImage),
    description: 'Visual comment software for pinning feedback on live websites, PDFs, and launch assets with real-time collaboration and guest review links.',
    offers: [
      { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Starter', price: '12', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Pro', price: '29', priceCurrency: 'USD' },
    ],
  };
}

export function buildFAQSchema(route) {
  if (!route?.faq?.length) return null;
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

export function buildBreadcrumbSchema(route) {
  if (!route?.breadcrumbs?.length) return null;
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

export function buildJsonLd(route) {
  if (!route) return [];
  const schema = route.schema || [];
  return [
    schema.includes('Organization') ? buildOrganizationSchema() : null,
    schema.includes('WebSite') ? buildWebSiteSchema() : null,
    schema.includes('SoftwareApplication') ? buildSoftwareSchema() : null,
    schema.includes('FAQPage') ? buildFAQSchema(route) : null,
    schema.includes('BreadcrumbList') ? buildBreadcrumbSchema(route) : null,
  ].filter(Boolean);
}
