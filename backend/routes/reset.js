const router = require("express").Router();
const { forgotPassword, resetPassword } = require("../controllers/resetController");

router.post("/forgot", forgotPassword);
router.post("/reset", resetPassword);

module.exports = router;
