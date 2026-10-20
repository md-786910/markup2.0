const dns = require('dns');
const net = require('net');

// Blocks the website proxy from reaching private, loopback, link-local (cloud
// metadata) and other non-public addresses. Set PROXY_ALLOW_PRIVATE=true to
// allow them, e.g. when reviewing a site running on localhost in development.
const ALLOW_PRIVATE = process.env.PROXY_ALLOW_PRIVATE === 'true';

const blockList = new net.BlockList();
[
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24],
  ['224.0.0.0', 4], ['240.0.0.0', 4],
].forEach(([addr, prefix]) => blockList.addSubnet(addr, prefix, 'ipv4'));
[
  ['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8],
  ['64:ff9b::', 96], ['2001:db8::', 32],
].forEach(([addr, prefix]) => blockList.addSubnet(addr, prefix, 'ipv6'));

function isPrivateAddress(ip) {
  if (ALLOW_PRIVATE) return false;
  const family = net.isIP(ip);
  if (!family) return true;
  if (family === 6) {
    // IPv4-mapped IPv6 (::ffff:10.0.0.1)
    const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
    if (mapped) return blockList.check(mapped[1], 'ipv4');
    return blockList.check(ip, 'ipv6');
  }
  return blockList.check(ip, 'ipv4');
}

// Hostname-level check (no DNS): protocol, IP literals and obvious internal names.
function isBlockedHost(hostname) {
  if (ALLOW_PRIVATE) return false;
  const host = (hostname || '').replace(/^\[|\]$/g, '').toLowerCase();
  if (!host) return true;
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) return true;
  if (net.isIP(host)) return isPrivateAddress(host);
  return false;
}

// Resolved-address cache so sub-resource bursts don't each hit DNS.
const resolveCache = new Map();
const RESOLVE_CACHE_TTL = 60000;
const RESOLVE_CACHE_MAX = 2000;

// Resolves to true when `urlString` is an http(s) URL pointing at a public address.
async function isPublicUrl(urlString) {
  let parsed;
  try { parsed = new URL(urlString); } catch { return false; }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  if (ALLOW_PRIVATE) return true;
  const host = parsed.hostname.replace(/^\[|\]$/g, '');
  if (isBlockedHost(host)) return false;
  if (net.isIP(host)) return true;

  const cached = resolveCache.get(host);
  if (cached && Date.now() - cached.timestamp < RESOLVE_CACHE_TTL) return cached.ok;
  let ok;
  try {
    const addresses = await dns.promises.lookup(host, { all: true });
    ok = addresses.length > 0 && addresses.every((a) => !isPrivateAddress(a.address));
  } catch {
    // Unresolvable: let the request proceed so the normal ENOTFOUND error page is shown.
    return true;
  }
  if (resolveCache.size >= RESOLVE_CACHE_MAX) resolveCache.delete(resolveCache.keys().next().value);
  resolveCache.set(host, { ok, timestamp: Date.now() });
  return ok;
}

// dns.lookup replacement for http(s) agents: re-checks the address actually
// connected to, which defeats DNS rebinding between the check and the request.
function safeLookup(hostname, options, callback) {
  if (typeof options === 'function') { callback = options; options = {}; }
  dns.lookup(hostname, options, (err, address, family) => {
    if (err) return callback(err, address, family);
    const list = Array.isArray(address) ? address.map((a) => a.address) : [address];
    if (list.some(isPrivateAddress)) {
      const blocked = new Error(`Blocked request to non-public address for ${hostname}`);
      blocked.code = 'EBLOCKEDADDRESS';
      return callback(blocked);
    }
    return callback(null, address, family);
  });
}

// axios/follow-redirects hook: rejects redirects to IP literals or internal hostnames
// (connections to IP literals bypass the agent lookup).
function beforeRedirect(options) {
  if (options.protocol !== 'http:' && options.protocol !== 'https:') {
    throw new Error('Blocked redirect to unsupported protocol');
  }
  if (isBlockedHost(options.hostname)) {
    const blocked = new Error(`Blocked redirect to non-public address ${options.hostname}`);
    blocked.code = 'EBLOCKEDADDRESS';
    throw blocked;
  }
}

module.exports = { isPublicUrl, isPrivateAddress, isBlockedHost, safeLookup, beforeRedirect };
