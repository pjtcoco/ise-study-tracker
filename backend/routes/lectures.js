const router = require("express").Router();
const { getLectures, getLecture, uploadLecture, askQuestion, deleteLecture } = require("../controllers/lectureController");
const { protect } = require("../middleware/auth");

router.use(protect);
router.route("/").get(getLectures).post(uploadLecture);
router.route("/:id").get(getLecture).delete(deleteLecture);
router.post("/:id/ask", askQuestion);

module.exports = router;
