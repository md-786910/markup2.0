/**
 * Cloudflare Worker — URL Relay Proxy
 *
 * Fetches any URL and returns the response. Used as a fallback
 * when the main server can't reach certain hosting providers.
 *
 * Deploy: npx wrangler deploy
 * Usage:  https://your-worker.workers.dev/?url=https://example.com
 *
 * Free tier: 100,000 requests/day
 */

export default {
  async fetch(request) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
      return new Response('Missing ?url= parameter', { status: 400, headers: corsHeaders });
    }

    try {
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
        },
        redirect: 'follow',
      });

      // Forward the response with CORS headers
      const headers = new Headers(response.headers);
      headers.set('Access-Control-Allow-Origin', '*');
      // Remove headers that interfere with proxy
      headers.delete('content-encoding');
      headers.delete('transfer-encoding');
      headers.delete('content-length');

      return new Response(response.body, {
        status: response.status,
        headers,
      });
    } catch (err) {
      return new Response(`Relay error: ${err.message}`, { status: 502, headers: corsHeaders });
    }
  },
};
