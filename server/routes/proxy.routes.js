const router = require("express").Router();
const proxyAuth = require("../middleware/proxyAuth");
const { proxyPage } = require("../controllers/proxy.controller");

router.all("/", proxyAuth, proxyPage);

module.exports = router;
