const crypto = require('crypto');
const pino = require('pino');
const pinoHttp = require('pino-http');

// Structured logs: JSON lines in production (docker compose logs), readable
// colored lines in development when pino-pretty is installed.
//   LOG_LEVEL=debug|info|warn|error   (default info)

// Tokens travel in query strings (proxy ?token=, relay ?rt=, reset links);
// never write them to the log.
const SECRET_PARAMS = /([?&](?:token|rt|key|password|code|otp|signature|sig|access_token)=)[^&#]*/gi;
const scrubUrl = (url = '') => String(url).replace(SECRET_PARAMS, '$1[redacted]');

function prettyTransport() {
  if (process.env.NODE_ENV === 'production') return undefined;
  try {
    require.resolve('pino-pretty');
    return {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:HH:MM:ss',
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
  autoLogging: { ignore: (req) => req.url === '/api/health' },
  customLogLevel(req, res, err) {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res, time) => `${req.method} ${scrubUrl(req.originalUrl || req.url)} ${res.statusCode} ${Math.round(time)}ms`,
  customErrorMessage: (req, res, err) => `${req.method} ${scrubUrl(req.originalUrl || req.url)} ${res.statusCode} ${err.message}`,
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
