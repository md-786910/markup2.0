const crypto = require('crypto');
const pino = require('pino');
const pinoHttp = require('pino-http');

// One colored line per event by default (also in `docker compose logs`).
//   LOG_LEVEL=debug|info|warn|error   (default info)
//   LOG_FORMAT=pretty|json            (default pretty; json for log collectors)

// Tokens travel in query strings (proxy ?token=, relay ?rt=, reset links);
// never write them to the log.
const SECRET_PARAMS = /([?&](?:token|rt|key|password|code|otp|signature|sig|access_token)=)[^&#]*/gi;
const scrubUrl = (url = '') => String(url).replace(SECRET_PARAMS, '$1[redacted]');

function prettyTransport() {
  if (process.env.LOG_FORMAT === 'json') return undefined;
  try {
    require.resolve('pino-pretty');
    return {
      target: 'pino-pretty',
      options: {
        colorize: true, // also without a TTY (docker logs)
        translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
        // One line per request; error stacks (err) are still printed in full
        messageFormat: '{msg}{if userId} user={userId}{end}{if error} - {error}{end}',
        ignore: 'pid,hostname,req,res,responseTime,ip,userId,error',
      },
    };
  } catch {
    return undefined;
  }
}

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-csrf-token"]',
      'req.headers["x-guest-access"]',
      'res.headers["set-cookie"]',
    ],
    censor: '[redacted]',
  },
  transport: prettyTransport(),
});

const REQUEST_ID = /^[\w-]{1,64}$/;

// "/api/proxy?url=https%3A%2F%2Fsite.com%2Fpage&projectId=…&token=…" is
// shown as "proxy https://site.com/page"; long URLs are shortened.
const MAX_URL = 120;
function displayUrl(req) {
  let url = req.originalUrl || req.url;
  if (url.startsWith('/api/proxy')) {
    try {
      const target = new URL(url, 'http://x').searchParams.get('url');
      if (target) url = `proxy ${target}`;
    } catch { /* keep the raw URL */ }
  }
  url = scrubUrl(url);
  return url.length > MAX_URL ? `${url.slice(0, MAX_URL - 1)}…` : url;
}

// One log line per request when the response finishes: method, URL, status,
// duration, user, client IP and, for 4xx/5xx, the error message sent back.
// Bodies are not logged (passwords, comments, uploads).
const httpLogger = pinoHttp({
  logger,
  genReqId(req, res) {
    const incoming = req.headers['x-request-id'];
    const id = typeof incoming === 'string' && REQUEST_ID.test(incoming) ? incoming : crypto.randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },
  // Health checks and CORS preflights are noise
  autoLogging: { ignore: (req) => req.url === '/api/health' || req.method === 'OPTIONS' },
  customLogLevel(req, res, err) {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res, time) => `${req.method} ${displayUrl(req)} ${res.statusCode} ${Math.round(time)}ms`,
  customErrorMessage: (req, res, err) => `${req.method} ${displayUrl(req)} ${res.statusCode} ${err.message}`,
  customProps(req, res) {
    return {
      userId: req.user && req.user._id ? String(req.user._id) : undefined,
      error: res.locals && res.locals.errorMessage,
    };
  },
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: scrubUrl(req.url), ip: req.raw.ip, userAgent: req.headers['user-agent'] }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
});

// Keeps the message of error responses ({ message, code }) for the request log.
function captureErrorMessage(req, res, next) {
  const json = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 400 && body && typeof body.message === 'string') {
      res.locals.errorMessage = body.code ? `${body.code}: ${body.message}` : body.message;
    }
    return json(body);
  };
  next();
}

module.exports = { logger, httpLogger, captureErrorMessage, scrubUrl };
