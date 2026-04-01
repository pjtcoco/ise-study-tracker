const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config();
connectDB();

const app = express();
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://ise-study-tracker.vercel.app",
      /\.vercel\.app$/,
    ],
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "ISE StudyTracker API running" });
});

app.use("/api/auth", require("./routes/auth"));
app.use("/api/courses", require("./routes/courses"));
app.use("/api/tasks", require("./routes/tasks"));
app.use("/api/notes", require("./routes/notes"));
app.use("/api/sessions", require("./routes/sessions"));
app.use("/api/password", require("./routes/reset"));
app.use("/api/lectures", require("./routes/lectures"));
app.use("/api/schedule", require("./routes/schedule"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
