const router = require("express").Router();
const { getSchedule } = require("../controllers/scheduleController");
const { protect } = require("../middleware/auth");

router.use(protect);
router.get("/", getSchedule);

module.exports = router;
