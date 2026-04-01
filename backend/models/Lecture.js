const mongoose = require("mongoose");

const lectureSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
  title: { type: String, required: true },
  content: { type: String, required: true },
  summary: String,
  keyPoints: [String],
  explanations: [{
    question: String,
    answer: String,
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model("Lecture", lectureSchema);
