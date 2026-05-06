const PaymentSettings = require('../models/PaymentSettings');
const razorpayProvider = require('./razorpayProvider');
const paypalProvider = require('./paypalProvider');

const REGISTRY = {
  razorpay: razorpayProvider,
  paypal: paypalProvider,
};

// Short TTL cache for the singleton settings doc — invalidated on update.
const CACHE_TTL_MS = 60 * 1000;
let cached = null;
let cachedAt = 0;

function clearPaymentSettingsCache() {
  cached = null;
  cachedAt = 0;
}

async function loadSettings() {
  const now = Date.now();
  if (cached && now - cachedAt < CACHE_TTL_MS) return cached;
  const doc = await PaymentSettings.getSingleton();
  cached = doc.toObject ? doc.toObject() : doc;
  cachedAt = now;
  return cached;
}

/**
 * Returns the active provider adapter, or null if none active or the active
 * one is not enabled / not configured. Callers should treat null as "we are
 * facing payment issues" and surface the standardized error message.
 */
async function getActiveProvider() {
  const settings = await loadSettings();
  const id = settings.activeProvider;
  if (!id) return null;
  const provider = REGISTRY[id];
  if (!provider) return null;
  const enabled = settings.providers?.[id]?.enabled;
  if (!enabled) return null;
  if (!provider.isConfigured()) return null;
  return provider;
}

function getProvider(id) {
  return REGISTRY[id] || null;
}

function listProviders() {
  return Object.values(REGISTRY);
}

async function getProviderStatus() {
  const settings = await loadSettings();
  const out = {};
  for (const [id, provider] of Object.entries(REGISTRY)) {
    out[id] = {
      id,
      enabled: !!settings.providers?.[id]?.enabled,
      configured: provider.isConfigured(),
      active: settings.activeProvider === id,
    };
  }
  return {
    activeProvider: settings.activeProvider,
    providers: out,
    allowDowngrades: !!settings.allowDowngrades,
  };
}

module.exports = {
  getActiveProvider,
  getProvider,
  listProviders,
  getProviderStatus,
  clearPaymentSettingsCache,
};
