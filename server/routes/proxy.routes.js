const router = require("express").Router();
const proxyAuth = require("../middleware/proxyAuth");
const { proxyPage } = require("../controllers/proxy.controller");

// Reviewed sites run on the API origin: a service worker registered from one
// would control every later review on this origin (and survive sign-out).
// Browsers mark the worker script fetch with `Service-Worker: script`.
function refuseServiceWorkers(req, res, next) {
  if (req.headers["service-worker"]) {
    return res.status(403).json({ message: "Service workers are not supported in review mode" });
  }
  next();
}

router.all("/", refuseServiceWorkers, proxyAuth, proxyPage);

module.exports = router;
