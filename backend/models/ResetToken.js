const mongoose = require("mongoose");

const resetTokenSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  token: { type: String, required: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

resetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("ResetToken", resetTokenSchema);
