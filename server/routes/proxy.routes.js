const router = require("express").Router();
const auth = require("../middleware/auth");
const { proxyPage } = require("../controllers/proxy.controller");

router.all("/", auth, proxyPage);

module.exports = router;
