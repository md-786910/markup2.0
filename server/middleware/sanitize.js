// Strips MongoDB operator characters ($ and .) from request key names to block
// query-injection. Replacement for express-mongo-sanitize, which assigns to
// req.query and crashes on Express 5 (req.query is a getter-only property).

function scrub(obj, replaceWith) {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    for (const item of obj) scrub(item, replaceWith);
    return;
  }
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (key.includes("$") || key.includes(".")) {
      const newKey = key.replace(/[$.]/g, replaceWith);
      delete obj[key];
      obj[newKey] = val;
    }
    scrub(val, replaceWith);
  }
}

function mongoSanitize({ replaceWith = "_" } = {}) {
  return (req, _res, next) => {
    if (req.body) scrub(req.body, replaceWith);
    if (req.params) scrub(req.params, replaceWith);
    // req.query is a getter in Express 5 — mutate the cached object, then
    // redefine the property so subsequent reads see the sanitized version.
    const q = req.query;
    if (q) {
      scrub(q, replaceWith);
      Object.defineProperty(req, "query", {
        value: q,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
    next();
  };
}

module.exports = { mongoSanitize };
