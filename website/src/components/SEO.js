import { useEffect } from 'react';
import { absoluteUrl, buildJsonLd, getRouteSeo, site } from '../seo/seoUtils';

function upsertMeta(selector, attributes) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute('data-seo', 'true');
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([name, value]) => {
    if (value !== undefined && value !== null) {
      element.setAttribute(name, String(value));
    }
  });
}

function upsertLink(rel, href) {
  let element = document.head.querySelector(`link[rel="${rel}"][data-seo="true"]`);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    element.setAttribute('data-seo', 'true');
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

function replaceJsonLd(schemas) {
  document.head.querySelectorAll('script[type="application/ld+json"][data-seo="true"]').forEach((element) => {
    element.remove();
  });

  schemas.forEach((schema) => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-seo', 'true');
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);
  });
}

export default function SEO({ route }) {
  useEffect(() => {
    const seo = route || getRouteSeo(window.location.pathname);
    if (!seo) {
      document.title = `Page Not Found | ${site.name}`;
      upsertMeta('meta[name="robots"][data-seo="true"]', { name: 'robots', content: 'noindex, nofollow' });
      return;
    }

    const canonical = absoluteUrl(seo.path);
    const image = absoluteUrl(seo.ogImage || site.defaultOgImage);

    document.title = seo.title;
    upsertMeta('meta[name="description"][data-seo="true"]', { name: 'description', content: seo.description });
    upsertMeta('meta[name="keywords"][data-seo="true"]', { name: 'keywords', content: seo.keywords });
    upsertMeta('meta[name="robots"][data-seo="true"]', { name: 'robots', content: 'index, follow, max-image-preview:large' });
    upsertLink('canonical', canonical);

    upsertMeta('meta[property="og:title"][data-seo="true"]', { property: 'og:title', content: seo.title });
    upsertMeta('meta[property="og:description"][data-seo="true"]', { property: 'og:description', content: seo.description });
    upsertMeta('meta[property="og:type"][data-seo="true"]', { property: 'og:type', content: 'website' });
    upsertMeta('meta[property="og:url"][data-seo="true"]', { property: 'og:url', content: canonical });
    upsertMeta('meta[property="og:image"][data-seo="true"]', { property: 'og:image', content: image });
    upsertMeta('meta[property="og:image:width"][data-seo="true"]', { property: 'og:image:width', content: '1200' });
    upsertMeta('meta[property="og:image:height"][data-seo="true"]', { property: 'og:image:height', content: '630' });
    upsertMeta('meta[property="og:site_name"][data-seo="true"]', { property: 'og:site_name', content: site.name });
    upsertMeta('meta[property="og:locale"][data-seo="true"]', { property: 'og:locale', content: site.locale });

    upsertMeta('meta[name="twitter:card"][data-seo="true"]', { name: 'twitter:card', content: 'summary_large_image' });
    upsertMeta('meta[name="twitter:site"][data-seo="true"]', { name: 'twitter:site', content: site.twitterHandle });
    upsertMeta('meta[name="twitter:title"][data-seo="true"]', { name: 'twitter:title', content: seo.title });
    upsertMeta('meta[name="twitter:description"][data-seo="true"]', { name: 'twitter:description', content: seo.description });
    upsertMeta('meta[name="twitter:image"][data-seo="true"]', { name: 'twitter:image', content: image });

    replaceJsonLd(buildJsonLd(seo));
  }, [route]);

  return null;
}
