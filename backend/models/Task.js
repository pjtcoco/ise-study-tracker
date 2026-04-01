const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
  title: { type: String, required: true },
  description: String,
  type: { type: String, default: "assignment" },
  dueDate: Date,
  priority: { type: String, default: "medium" },
  status: { type: String, default: "pending" }
}, { timestamps: true });

module.exports = mongoose.model("Task", taskSchema);
