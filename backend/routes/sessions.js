const router = require("express").Router();
const { getSessions, createSession, deleteSession, getStats } = require("../controllers/sessionController");
const { protect } = require("../middleware/auth");

router.use(protect);
router.get("/stats", getStats);
router.route("/").get(getSessions).post(createSession);
router.route("/:id").delete(deleteSession);

module.exports = router;
