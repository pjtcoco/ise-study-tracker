const mongoose = require("mongoose");

const studySessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
  duration: { type: Number, required: true },
  type: { type: String, default: "pomodoro" },
  notes: String,
  date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model("StudySession", studySessionSchema);
