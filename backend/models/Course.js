const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  code: String,
  professor: String,
  credits: { type: Number, default: 6 },
  semester: { type: Number, default: 1 },
  color: { type: String, default: "#6366f1" },
  status: { type: String, default: "active" },
  description: String,
  schedule: [{
    day: { type: String, enum: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"] },
    startTime: String,
    endTime: String,
    room: String,
    type: { type: String, enum: ["lecture","tutorial","lab","seminar"], default: "lecture" }
  }]
}, { timestamps: true });

module.exports = mongoose.model("Course", courseSchema);
