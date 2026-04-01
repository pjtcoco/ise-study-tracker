const crypto = require("crypto");
const User = require("../models/User");
const ResetToken = require("../models/ResetToken");
const bcrypt = require("bcryptjs");

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "No account with that email" });

    await ResetToken.deleteMany({ user: user._id });

    const token = crypto.randomBytes(32).toString("hex");
    const hashed = crypto.createHash("sha256").update(token).digest("hex");

    await ResetToken.create({
      user: user._id,
      token: hashed,
      expiresAt: new Date(Date.now() + 3600000),
    });

    const resetUrl = (process.env.FRONTEND_URL || "http://localhost:5173") + "/reset-password/" + token;

    console.log("Password reset link:", resetUrl);

    res.json({ message: "Password reset link generated. Check server console.", resetUrl: process.env.NODE_ENV === "development" ? resetUrl : undefined });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const hashed = crypto.createHash("sha256").update(token).digest("hex");
    const resetToken = await ResetToken.findOne({ token: hashed, expiresAt: { $gt: new Date() } });

    if (!resetToken) return res.status(400).json({ message: "Invalid or expired token" });

    const user = await User.findById(resetToken.user);
    user.password = password;
    await user.save();
    await ResetToken.deleteMany({ user: user._id });

    res.json({ message: "Password reset successful" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
