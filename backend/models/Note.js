const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
  title: { type: String, required: true },
  content: String,
  tags: [String]
}, { timestamps: true });

module.exports = mongoose.model("Note", noteSchema);
