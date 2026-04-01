const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function write(fp, content) {
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, content.trimStart(), "utf8");
  console.log("Created: " + fp);
}

console.log("=== ISE StudyTracker Feature Upgrade ===");
console.log("Adding: Charts, Schedule, Password Reset, PDF Export, AI Tutor\n");

// ───────────────────────────────────
// BACKEND: New dependencies
// ───────────────────────────────────

const backendPkg = JSON.parse(fs.readFileSync("backend/package.json", "utf8"));
backendPkg.dependencies["nodemailer"] = "^6.9.8";
backendPkg.dependencies["crypto"] = "*";
fs.writeFileSync(
  "backend/package.json",
  JSON.stringify(backendPkg, null, 2),
  "utf8",
);
console.log("Updated: backend/package.json");

// ───────────────────────────────────
// BACKEND: Password Reset Model
// ───────────────────────────────────

write(
  "backend/models/ResetToken.js",
  `const mongoose = require("mongoose");

const resetTokenSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  token: { type: String, required: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

resetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("ResetToken", resetTokenSchema);
`,
);

// ───────────────────────────────────
// BACKEND: Password Reset Controller
// ───────────────────────────────────

write(
  "backend/controllers/resetController.js",
  `const crypto = require("crypto");
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
`,
);

// ───────────────────────────────────
// BACKEND: Reset Routes
// ───────────────────────────────────

write(
  "backend/routes/reset.js",
  `const router = require("express").Router();
const { forgotPassword, resetPassword } = require("../controllers/resetController");

router.post("/forgot", forgotPassword);
router.post("/reset", resetPassword);

module.exports = router;
`,
);

// ───────────────────────────────────
// BACKEND: AI Tutor Model
// ───────────────────────────────────

write(
  "backend/models/Lecture.js",
  `const mongoose = require("mongoose");

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
`,
);

// ───────────────────────────────────
// BACKEND: AI Tutor Controller
// ───────────────────────────────────

write(
  "backend/controllers/lectureController.js",
  `const Lecture = require("../models/Lecture");

function generateSummary(content) {
  const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 10);
  const keyPoints = sentences.slice(0, Math.min(5, sentences.length)).map((s) => s.trim());
  const summary = sentences.slice(0, 3).join(". ").trim() + ".";
  return { summary, keyPoints };
}

function explainConcept(content, question) {
  const q = question.toLowerCase();
  const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 5);

  const relevant = sentences.filter((s) => {
    const words = q.split(" ").filter((w) => w.length > 3);
    return words.some((w) => s.toLowerCase().includes(w));
  });

  if (relevant.length === 0) {
    return "I could not find specific information about that in your lecture content. Try rephrasing your question or check if the topic is covered in your uploaded material.";
  }

  let answer = "Based on your lecture material:\\n\\n";
  answer += relevant.slice(0, 3).map((s, i) => (i + 1) + ". " + s.trim()).join("\\n");
  answer += "\\n\\nKey takeaway: " + relevant[0].trim() + ".";

  if (q.includes("how") || q.includes("explain") || q.includes("what")) {
    answer += "\\n\\nSimplified: Think of it like this - " + relevant[0].trim().split(",")[0] + ". This is the core concept.";
  }

  if (q.includes("diagram") || q.includes("draw") || q.includes("visual")) {
    answer += "\\n\\n[Visual Representation]\\n";
    const terms = relevant[0].trim().split(" ").filter((w) => w.length > 4).slice(0, 4);
    answer += "\\n  " + terms[0] + " --> " + (terms[1] || "Process") + " --> " + (terms[2] || "Result");
    answer += "\\n    |                    |";
    answer += "\\n    v                    v";
    answer += "\\n  [Input]           [Output]\\n";
  }

  return answer;
}

exports.getLectures = async (req, res) => {
  const filter = { user: req.user._id };
  if (req.query.course) filter.course = req.query.course;
  const lectures = await Lecture.find(filter).populate("course", "name color").sort("-createdAt");
  res.json(lectures);
};

exports.getLecture = async (req, res) => {
  const lecture = await Lecture.findOne({ _id: req.params.id, user: req.user._id }).populate("course", "name color");
  if (!lecture) return res.status(404).json({ message: "Not found" });
  res.json(lecture);
};

exports.uploadLecture = async (req, res) => {
  try {
    const { title, content, course } = req.body;
    const { summary, keyPoints } = generateSummary(content);

    const payload = { user: req.user._id, title, content, summary, keyPoints };
    if (course) payload.course = course;

    const lecture = await Lecture.create(payload);
    const populated = await lecture.populate("course", "name color");
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.askQuestion = async (req, res) => {
  try {
    const { question } = req.body;
    const lecture = await Lecture.findOne({ _id: req.params.id, user: req.user._id });
    if (!lecture) return res.status(404).json({ message: "Lecture not found" });

    const answer = explainConcept(lecture.content, question);

    lecture.explanations.push({ question, answer });
    await lecture.save();

    res.json({ question, answer });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteLecture = async (req, res) => {
  await Lecture.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  res.json({ message: "Deleted" });
};
`,
);

// ───────────────────────────────────
// BACKEND: Lecture Routes
// ───────────────────────────────────

write(
  "backend/routes/lectures.js",
  `const router = require("express").Router();
const { getLectures, getLecture, uploadLecture, askQuestion, deleteLecture } = require("../controllers/lectureController");
const { protect } = require("../middleware/auth");

router.use(protect);
router.route("/").get(getLectures).post(uploadLecture);
router.route("/:id").get(getLecture).delete(deleteLecture);
router.post("/:id/ask", askQuestion);

module.exports = router;
`,
);

// ───────────────────────────────────
// BACKEND: Schedule Controller
// ───────────────────────────────────

write(
  "backend/controllers/scheduleController.js",
  `const Course = require("../models/Course");

exports.getSchedule = async (req, res) => {
  const courses = await Course.find({ user: req.user._id, status: "active" });
  const schedule = [];

  courses.forEach((course) => {
    if (course.schedule && course.schedule.length > 0) {
      course.schedule.forEach((slot) => {
        schedule.push({
          courseId: course._id,
          courseName: course.name,
          courseCode: course.code,
          color: course.color,
          day: slot.day,
          startTime: slot.startTime,
          endTime: slot.endTime,
          room: slot.room,
          type: slot.type,
        });
      });
    }
  });

  res.json(schedule);
};
`,
);

// ───────────────────────────────────
// BACKEND: Schedule Routes
// ───────────────────────────────────

write(
  "backend/routes/schedule.js",
  `const router = require("express").Router();
const { getSchedule } = require("../controllers/scheduleController");
const { protect } = require("../middleware/auth");

router.use(protect);
router.get("/", getSchedule);

module.exports = router;
`,
);

// ───────────────────────────────────
// BACKEND: Update Course Model (add schedule field)
// ───────────────────────────────────

write(
  "backend/models/Course.js",
  `const mongoose = require("mongoose");

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
`,
);

// ───────────────────────────────────
// BACKEND: Updated server.js with new routes
// ───────────────────────────────────

write(
  "backend/server.js",
  `const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config();
connectDB();

const app = express();
app.use(cors());
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
`,
);

// ───────────────────────────────────
// BACKEND: Updated stats with weekly breakdown
// ───────────────────────────────────

write(
  "backend/controllers/sessionController.js",
  `const StudySession = require("../models/StudySession");
const Task = require("../models/Task");
const Course = require("../models/Course");

exports.getSessions = async (req, res) => {
  const sessions = await StudySession.find({ user: req.user._id }).populate("course", "name color").sort("-date");
  res.json(sessions);
};

exports.createSession = async (req, res) => {
  const session = await StudySession.create({ ...req.body, user: req.user._id });
  res.status(201).json(session);
};

exports.deleteSession = async (req, res) => {
  await StudySession.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  res.json({ message: "Deleted" });
};

exports.getStats = async (req, res) => {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1);
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const allSessions = await StudySession.find({ user: req.user._id });
  const totalMinutes = allSessions.reduce((s, x) => s + x.duration, 0);

  const weeklySessions = allSessions.filter((s) => new Date(s.date) >= startOfWeek);
  const weeklyMinutes = weeklySessions.reduce((s, x) => s + x.duration, 0);

  const monthlySessions = allSessions.filter((s) => new Date(s.date) >= startOfMonth);
  const monthlyMinutes = monthlySessions.reduce((s, x) => s + x.duration, 0);

  const totalTasks = await Task.countDocuments({ user: req.user._id });
  const completedTasks = await Task.countDocuments({ user: req.user._id, status: "completed" });
  const activeCourses = await Course.countDocuments({ user: req.user._id, status: "active" });

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dailyBreakdown = [];
  for (let i = 0; i < 7; i++) {
    const dayStart = new Date(startOfWeek);
    dayStart.setDate(startOfWeek.getDate() + i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayStart.getDate() + 1);
    const mins = weeklySessions
      .filter((s) => { const d = new Date(s.date); return d >= dayStart && d < dayEnd; })
      .reduce((sum, x) => sum + x.duration, 0);
    dailyBreakdown.push({ day: days[i], minutes: mins });
  }

  const courseAgg = {};
  allSessions.forEach((s) => {
    const key = s.course ? s.course.toString() : "none";
    courseAgg[key] = (courseAgg[key] || 0) + s.duration;
  });
  const courseIds = Object.keys(courseAgg).filter((k) => k !== "none");
  const coursesList = await Course.find({ _id: { $in: courseIds } }).select("name color");
  const byCourse = Object.entries(courseAgg).map(([id, mins]) => {
    const c = coursesList.find((x) => x._id.toString() === id);
    return { courseId: id, courseName: c ? c.name : "Uncategorized", color: c ? c.color : "#6b7280", totalMinutes: mins };
  });

  let streak = 0;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 365; i++) {
    const check = new Date(today); check.setDate(today.getDate() - i);
    const next = new Date(check); next.setDate(check.getDate() + 1);
    if (allSessions.some((s) => { const d = new Date(s.date); return d >= check && d < next; })) streak++;
    else break;
  }

  res.json({
    totalMinutes, weeklyMinutes, monthlyMinutes,
    totalTasks, completedTasks, activeCourses,
    pendingTasks: totalTasks - completedTasks,
    streak, totalSessions: allSessions.length,
    dailyBreakdown, byCourse,
  });
};
`,
);

// ───────────────────────────────────
// FRONTEND: Update API service
// ───────────────────────────────────

write(
  "frontend/src/services/api.js",
  `import axios from "axios";

const API = axios.create({ baseURL: "/api" });

API.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem("user"));
  if (user && user.token) config.headers.Authorization = "Bearer " + user.token;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export const loginUser = (data) => API.post("/auth/login", data);
export const registerUser = (data) => API.post("/auth/register", data);
export const updateProfile = (data) => API.put("/auth/profile", data);

export const forgotPassword = (data) => API.post("/password/forgot", data);
export const resetPassword = (data) => API.post("/password/reset", data);

export const getCourses = () => API.get("/courses");
export const createCourse = (data) => API.post("/courses", data);
export const updateCourse = (id, data) => API.put("/courses/" + id, data);
export const deleteCourse = (id) => API.delete("/courses/" + id);

export const getTasks = () => API.get("/tasks");
export const createTask = (data) => API.post("/tasks", data);
export const updateTask = (id, data) => API.put("/tasks/" + id, data);
export const deleteTask = (id) => API.delete("/tasks/" + id);

export const getNotes = () => API.get("/notes");
export const createNote = (data) => API.post("/notes", data);
export const updateNote = (id, data) => API.put("/notes/" + id, data);
export const deleteNote = (id) => API.delete("/notes/" + id);

export const getSessions = () => API.get("/sessions");
export const createSession = (data) => API.post("/sessions", data);
export const getStats = () => API.get("/sessions/stats");

export const getSchedule = () => API.get("/schedule");

export const getLectures = () => API.get("/lectures");
export const getLecture = (id) => API.get("/lectures/" + id);
export const uploadLecture = (data) => API.post("/lectures", data);
export const askLecture = (id, data) => API.post("/lectures/" + id + "/ask", data);
export const deleteLecture = (id) => API.delete("/lectures/" + id);

export default API;
`,
);

// ───────────────────────────────────
// FRONTEND: Updated App.jsx with new routes
// ───────────────────────────────────

write(
  "frontend/src/App.jsx",
  `import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import Tasks from "./pages/Tasks";
import Notes from "./pages/Notes";
import Timer from "./pages/Timer";
import Analytics from "./pages/Analytics";
import Schedule from "./pages/Schedule";
import AiTutor from "./pages/AiTutor";
import Profile from "./pages/Profile";

function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Landing />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
      <Route path="/courses" element={<ProtectedRoute><Layout><Courses /></Layout></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute><Layout><Tasks /></Layout></ProtectedRoute>} />
      <Route path="/notes" element={<ProtectedRoute><Layout><Notes /></Layout></ProtectedRoute>} />
      <Route path="/timer" element={<ProtectedRoute><Layout><Timer /></Layout></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><Layout><Analytics /></Layout></ProtectedRoute>} />
      <Route path="/schedule" element={<ProtectedRoute><Layout><Schedule /></Layout></ProtectedRoute>} />
      <Route path="/ai-tutor" element={<ProtectedRoute><Layout><AiTutor /></Layout></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
export default App;
`,
);

// ───────────────────────────────────
// FRONTEND: Updated Layout with new nav items
// ───────────────────────────────────

write(
  "frontend/src/components/Layout.jsx",
  `import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const nav = [
  { path: "/dashboard", label: "Dashboard", icon: "\\uD83C\\uDFE0" },
  { path: "/courses", label: "Courses", icon: "\\uD83C\\uDF93" },
  { path: "/schedule", label: "Schedule", icon: "\\uD83D\\uDCC5" },
  { path: "/tasks", label: "Tasks", icon: "\\uD83D\\uDCCB" },
  { path: "/notes", label: "Notes", icon: "\\uD83D\\uDCDD" },
  { path: "/ai-tutor", label: "AI Tutor", icon: "\\uD83E\\uDD16" },
  { path: "/timer", label: "Study Timer", icon: "\\u23F1\\uFE0F" },
  { path: "/analytics", label: "Analytics", icon: "\\uD83D\\uDCCA" },
  { path: "/profile", label: "Profile", icon: "\\uD83D\\uDC64" },
];

const Layout = ({ children }) => {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const loc = useLocation();
  const go = useNavigate();

  return (
    <div className="min-h-screen flex bg-gray-50">
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={"fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white transform transition-transform duration-300 flex flex-col " + (open ? "translate-x-0" : "-translate-x-full lg:translate-x-0")}>
        <div className="p-6 border-b border-slate-700">
          <Link to="/dashboard" className="flex items-center gap-3">
            <span className="text-2xl">\\uD83D\\uDCDA</span>
            <div><h1 className="font-bold text-lg leading-tight">ISE StudyTracker</h1><p className="text-xs text-slate-400">Uni Duisburg-Essen</p></div>
          </Link>
        </div>
        <div className="flex-1 py-4 overflow-y-auto">
          {nav.map(({ path, label, icon }) => (
            <Link key={path} to={path} onClick={() => setOpen(false)}
              className={"flex items-center gap-3 px-6 py-3 mx-2 rounded-lg text-sm font-medium transition-all " + (loc.pathname === path ? "bg-indigo-600 text-white shadow-lg" : "text-slate-300 hover:bg-slate-800 hover:text-white")}>
              <span className="text-lg">{icon}</span>{label}
            </Link>
          ))}
        </div>
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-sm font-bold">{user && user.name ? user.name.charAt(0).toUpperCase() : "U"}</div>
            <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{user ? user.name : ""}</p><p className="text-xs text-slate-400">Semester {user ? user.semester : 1}</p></div>
          </div>
          <button onClick={() => { logout(); go("/"); }} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:text-red-400 hover:bg-slate-800 rounded-lg">Logout</button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4 flex items-center gap-4 sticky top-0 z-20">
          <button onClick={() => setOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-xl">\\u2630</button>
          <h2 className="text-lg font-semibold text-gray-800 flex-1">{(nav.find((n) => n.path === loc.pathname) || {}).label || "ISE StudyTracker"}</h2>
        </header>
        <main className="flex-1 p-4 lg:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
};
export default Layout;
`,
);

// ───────────────────────────────────
// FRONTEND: Login with forgot password link
// ───────────────────────────────────

write(
  "frontend/src/pages/Login.jsx",
  `import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await login(email, password); navigate("/dashboard"); }
    catch (err) { toast.error(err.response ? err.response.data.message : "Login failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 to-indigo-900 items-center justify-center p-12">
        <div className="max-w-md text-white">
          <span className="text-6xl mb-6 block">\\uD83D\\uDCDA</span>
          <h2 className="text-4xl font-bold mb-4">Welcome back!</h2>
          <p className="text-indigo-200 text-lg">Continue tracking your ISE studies.</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sign In</h1>
          <p className="text-gray-500 mb-8">Enter your credentials</p>
          <form onSubmit={submit} className="space-y-5">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required /></div>
            <div className="text-right"><Link to="/forgot-password" className="text-sm text-indigo-600 hover:text-indigo-500">Forgot password?</Link></div>
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">
              {loading ? "Signing in..." : "Sign In"}</button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-6">No account? <Link to="/register" className="text-indigo-600 font-medium">Create one</Link></p>
          <p className="text-center mt-3"><Link to="/" className="text-sm text-gray-400">Back to home</Link></p>
        </div>
      </div>
    </div>
  );
};
export default Login;
`,
);

// ───────────────────────────────────
// FRONTEND: Forgot Password Page
// ───────────────────────────────────

write(
  "frontend/src/pages/ForgotPassword.jsx",
  `import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../services/api";
import toast from "react-hot-toast";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [resetUrl, setResetUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const { data } = await forgotPassword({ email });
      setSent(true);
      if (data.resetUrl) setResetUrl(data.resetUrl);
      toast.success("Reset link generated!");
    } catch (err) { toast.error(err.response ? err.response.data.message : "Failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Forgot Password</h1>
        {sent ? (
          <div className="space-y-4">
            <p className="text-gray-500">Reset link has been generated.</p>
            {resetUrl && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <p className="text-sm text-indigo-700 mb-2">Development mode - click link below:</p>
                <a href={resetUrl} className="text-indigo-600 text-sm break-all underline">{resetUrl}</a>
              </div>
            )}
            <Link to="/login" className="block text-center text-indigo-600 font-medium">Back to login</Link>
          </div>
        ) : (
          <div>
            <p className="text-gray-500 mb-8">Enter your email and we will send a reset link.</p>
            <form onSubmit={submit} className="space-y-5">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required /></div>
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">
                {loading ? "Sending..." : "Send Reset Link"}</button>
            </form>
            <p className="text-center mt-6"><Link to="/login" className="text-sm text-gray-400">Back to login</Link></p>
          </div>
        )}
      </div>
    </div>
  );
};
export default ForgotPassword;
`,
);

// ───────────────────────────────────
// FRONTEND: Reset Password Page
// ───────────────────────────────────

write(
  "frontend/src/pages/ResetPassword.jsx",
  `import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { resetPassword } from "../services/api";
import toast from "react-hot-toast";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return toast.error("Passwords don't match");
    if (password.length < 6) return toast.error("Min 6 characters");
    setLoading(true);
    try {
      await resetPassword({ token, password });
      toast.success("Password reset! Please login.");
      navigate("/login");
    } catch (err) { toast.error(err.response ? err.response.data.message : "Failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset Password</h1>
        <p className="text-gray-500 mb-8">Enter your new password</p>
        <form onSubmit={submit} className="space-y-5">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required /></div>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">
            {loading ? "Resetting..." : "Reset Password"}</button>
        </form>
        <p className="text-center mt-6"><Link to="/login" className="text-sm text-gray-400">Back to login</Link></p>
      </div>
    </div>
  );
};
export default ResetPassword;
`,
);

// ───────────────────────────────────
// FRONTEND: Schedule / Timetable Page
// ───────────────────────────────────

write(
  "frontend/src/pages/Schedule.jsx",
  `import { useState, useEffect } from "react";
import { getSchedule, getCourses, updateCourse } from "../services/api";
import toast from "react-hot-toast";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const HOURS = ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00"];
const TYPES = ["lecture", "tutorial", "lab", "seminar"];

const Schedule = () => {
  const [schedule, setSchedule] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ course: "", day: "Monday", startTime: "08:00", endTime: "10:00", room: "", type: "lecture" });

  useEffect(() => { load(); }, []);
  const load = async () => {
    try {
      const [s, c] = await Promise.all([getSchedule(), getCourses()]);
      setSchedule(s.data); setCourses(c.data);
    } catch {} finally { setLoading(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.course) return toast.error("Select a course");
    try {
      const course = courses.find((c) => c._id === form.course);
      const existingSchedule = course.schedule || [];
      existingSchedule.push({ day: form.day, startTime: form.startTime, endTime: form.endTime, room: form.room, type: form.type });
      await updateCourse(form.course, { schedule: existingSchedule });
      toast.success("Schedule added");
      setModal(false); setForm({ course: "", day: "Monday", startTime: "08:00", endTime: "10:00", room: "", type: "lecture" }); load();
    } catch { toast.error("Error"); }
  };

  const getSlot = (day, hour) => {
    return schedule.filter((s) => s.day === day && s.startTime === hour);
  };

  const set = (k, v) => setForm({ ...form, [k]: v });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Weekly Schedule</h1><p className="text-gray-500 text-sm">Your timetable</p></div>
        <button onClick={() => setModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">+ Add Slot</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b"><th className="p-3 text-left text-sm font-medium text-gray-500 w-20">Time</th>
              {DAYS.map((d) => <th key={d} className="p-3 text-left text-sm font-medium text-gray-500">{d}</th>)}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((hour) => (
              <tr key={hour} className="border-b hover:bg-gray-50">
                <td className="p-3 text-sm text-gray-500 font-mono">{hour}</td>
                {DAYS.map((day) => {
                  const slots = getSlot(day, hour);
                  return (
                    <td key={day} className="p-2">
                      {slots.map((slot, i) => (
                        <div key={i} className="rounded-lg p-2 text-xs mb-1" style={{ backgroundColor: (slot.color || "#6366f1") + "20", borderLeft: "3px solid " + (slot.color || "#6366f1") }}>
                          <p className="font-semibold" style={{ color: slot.color || "#6366f1" }}>{slot.courseName}</p>
                          <p className="text-gray-500">{slot.startTime}-{slot.endTime}</p>
                          {slot.room && <p className="text-gray-400">{slot.room}</p>}
                          <span className="text-gray-400">{slot.type}</span>
                        </div>
                      ))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Legend</h2>
        <div className="flex flex-wrap gap-3">
          {courses.filter((c) => c.status === "active").map((c) => (
            <div key={c._id} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
              <span className="text-sm text-gray-600">{c.name}</span>
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">Add Schedule Slot</h2>
              <button onClick={() => setModal(false)} className="text-2xl text-gray-400">\\u00D7</button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Course *</label>
                <select value={form.course} onChange={(e) => set("course", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select course</option>
                  {courses.filter((c) => c.status === "active").map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
                  <select value={form.day} onChange={(e) => set("day", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={form.type} onChange={(e) => set("type", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
                  <select value={form.startTime} onChange={(e) => set("startTime", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">End</label>
                  <select value={form.endTime} onChange={(e) => set("endTime", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
                <input value={form.room} onChange={(e) => set("room", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. BA 001" /></div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">Add</button>
                <button type="button" onClick={() => setModal(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Schedule;
`,
);

// ───────────────────────────────────
// FRONTEND: AI Tutor Page
// ───────────────────────────────────

write(
  "frontend/src/pages/AiTutor.jsx",
  `import { useState, useEffect } from "react";
import { getLectures, uploadLecture, askLecture, deleteLecture, getCourses } from "../services/api";
import toast from "react-hot-toast";

const AiTutor = () => {
  const [lectures, setLectures] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadModal, setUploadModal] = useState(false);
  const [activeLecture, setActiveLecture] = useState(null);
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState([]);
  const [asking, setAsking] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", course: "" });

  useEffect(() => { load(); }, []);
  const load = async () => {
    try {
      const [l, c] = await Promise.all([getLectures(), getCourses()]);
      setLectures(l.data); setCourses(c.data);
    } catch {} finally { setLoading(false); }
  };

  const submitUpload = async (e) => {
    e.preventDefault();
    if (!form.content.trim()) return toast.error("Paste lecture content");
    try {
      const payload = { ...form };
      if (!payload.course) delete payload.course;
      await uploadLecture(payload);
      toast.success("Lecture uploaded and analyzed!");
      setUploadModal(false); setForm({ title: "", content: "", course: "" }); load();
    } catch { toast.error("Failed to upload"); }
  };

  const openLecture = (lec) => {
    setActiveLecture(lec);
    setChat(lec.explanations || []);
  };

  const ask = async (e) => {
    e.preventDefault();
    if (!question.trim() || !activeLecture) return;
    setAsking(true);
    try {
      const { data } = await askLecture(activeLecture._id, { question });
      setChat((prev) => [...prev, data]);
      setQuestion("");
    } catch { toast.error("Failed to get answer"); }
    finally { setAsking(false); }
  };

  const del = async (id) => {
    if (!confirm("Delete this lecture?")) return;
    try { await deleteLecture(id); toast.success("Deleted"); if (activeLecture && activeLecture._id === id) setActiveLecture(null); load(); }
    catch { toast.error("Failed"); }
  };

  const set = (k, v) => setForm({ ...form, [k]: v });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">AI Tutor</h1><p className="text-gray-500 text-sm">Upload lectures and get explanations</p></div>
        <button onClick={() => setUploadModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">+ Upload Lecture</button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-3">
          <h3 className="font-semibold text-gray-700">Your Lectures</h3>
          {lectures.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border p-6 text-center">
              <p className="text-3xl mb-2">\\uD83E\\uDD16</p>
              <p className="text-gray-500 text-sm">Upload a lecture to get started</p>
            </div>
          ) : (
            lectures.map((lec) => (
              <div key={lec._id} className={"bg-white rounded-xl shadow-sm border p-4 cursor-pointer hover:shadow-md transition-shadow group " + (activeLecture && activeLecture._id === lec._id ? "ring-2 ring-indigo-500" : "")}
                onClick={() => openLecture(lec)}>
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-sm">{lec.title}</h4>
                    {lec.course && <span className="text-xs px-2 py-0.5 rounded-full mt-1 inline-block" style={{ backgroundColor: (lec.course.color || "#6b7280") + "20", color: lec.course.color }}>{lec.course.name}</span>}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); del(lec._id); }} className="text-red-400 text-xs opacity-0 group-hover:opacity-100">Del</button>
                </div>
                {lec.keyPoints && lec.keyPoints.length > 0 && (
                  <div className="mt-2"><p className="text-xs text-gray-400">{lec.keyPoints.length} key points</p></div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="lg:col-span-2">
          {activeLecture ? (
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-xl font-bold mb-2">{activeLecture.title}</h2>
                {activeLecture.summary && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-4">
                    <h3 className="font-semibold text-indigo-900 text-sm mb-1">Summary</h3>
                    <p className="text-sm text-indigo-700">{activeLecture.summary}</p>
                  </div>
                )}
                {activeLecture.keyPoints && activeLecture.keyPoints.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-semibold text-sm mb-2">Key Points</h3>
                    <ul className="space-y-1">
                      {activeLecture.keyPoints.map((kp, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="text-indigo-500 mt-0.5">\\u2022</span>{kp}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="font-semibold mb-4">Ask me anything about this lecture</h3>
                <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
                  {chat.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Ask a question to start learning!</p>}
                  {chat.map((msg, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-end"><div className="bg-indigo-600 text-white rounded-2xl rounded-br-md px-4 py-2 max-w-[80%] text-sm">{msg.question}</div></div>
                      <div className="flex justify-start"><div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-2 max-w-[80%] text-sm whitespace-pre-wrap">{msg.answer}</div></div>
                    </div>
                  ))}
                </div>
                <form onSubmit={ask} className="flex gap-2">
                  <input value={question} onChange={(e) => setQuestion(e.target.value)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Explain what TCP handshake means..." disabled={asking} />
                  <button type="submit" disabled={asking}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">
                    {asking ? "..." : "Ask"}</button>
                </form>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border p-16 text-center">
              <p className="text-5xl mb-4">\\uD83E\\uDD16</p>
              <h3 className="text-xl font-semibold mb-2">Select a lecture</h3>
              <p className="text-gray-500">Choose a lecture from the left or upload a new one to start asking questions.</p>
            </div>
          )}
        </div>
      </div>

      {uploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">Upload Lecture</h2>
              <button onClick={() => setUploadModal(false)} className="text-2xl text-gray-400">\\u00D7</button>
            </div>
            <form onSubmit={submitUpload} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input value={form.title} onChange={(e) => set("title", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Lecture 3: TCP/IP Protocol" required /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                <select value={form.course} onChange={(e) => set("course", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">No course</option>
                  {courses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Lecture Content *</label>
                <textarea value={form.content} onChange={(e) => set("content", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                  rows="12" placeholder="Paste your lecture notes, slides text, or transcript here..." required />
                <p className="text-xs text-gray-400 mt-1">Paste lecture notes, slides content, or transcripts. The AI will analyze and help you understand.</p></div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">Upload & Analyze</button>
                <button type="button" onClick={() => setUploadModal(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default AiTutor;
`,
);

// ───────────────────────────────────
// FRONTEND: Analytics with Charts
// ───────────────────────────────────

write(
  "frontend/src/pages/Analytics.jsx",
  `import { useState, useEffect } from "react";
import { getStats } from "../services/api";
import { Bar, Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const Analytics = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getStats().then((r) => setStats(r.data)).catch(() => {}).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>;
  if (!stats) return <div className="bg-white rounded-xl shadow-sm border p-16 text-center"><p className="text-gray-500">No data yet.</p></div>;

  const rate = stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;

  const weeklyData = {
    labels: (stats.dailyBreakdown || []).map((d) => d.day),
    datasets: [{ label: "Study Hours", data: (stats.dailyBreakdown || []).map((d) => (d.minutes / 60).toFixed(1)), backgroundColor: "#6366f1", borderRadius: 8, barThickness: 40 }]
  };

  const courseData = {
    labels: (stats.byCourse || []).map((c) => c.courseName),
    datasets: [{ data: (stats.byCourse || []).map((c) => c.totalMinutes), backgroundColor: (stats.byCourse || []).map((c) => c.color), borderWidth: 0 }]
  };

  const barOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, grid: { color: "#f1f5f9" }, ticks: { callback: (v) => v + "h" } }, x: { grid: { display: false } } } };
  const doughnutOpts = { responsive: true, maintainAspectRatio: false, cutout: "65%",
    plugins: { legend: { position: "bottom", labels: { padding: 16, usePointStyle: true } }, tooltip: { callbacks: { label: (ctx) => ctx.label + ": " + (ctx.parsed / 60).toFixed(1) + "h" } } } };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Analytics</h1><p className="text-gray-500 text-sm">Your study progress</p></div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Hours", value: (stats.totalMinutes / 60).toFixed(1) + "h", bg: "bg-indigo-50 text-indigo-600" },
          { label: "This Week", value: (stats.weeklyMinutes / 60).toFixed(1) + "h", bg: "bg-blue-50 text-blue-600" },
          { label: "Tasks Done", value: stats.completedTasks + "/" + stats.totalTasks, bg: "bg-emerald-50 text-emerald-600" },
          { label: "Streak", value: stats.streak + " days", bg: "bg-red-50 text-red-500" },
        ].map(({ label, value, bg }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm border p-5">
            <div className={"w-10 h-10 rounded-lg flex items-center justify-center text-lg mb-3 " + bg}>
              {label === "Total Hours" ? "\\u23F0" : label === "This Week" ? "\\uD83D\\uDCC5" : label === "Tasks Done" ? "\\u2705" : "\\uD83D\\uDD25"}
            </div>
            <p className="text-2xl font-bold">{value}</p><p className="text-sm text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">Weekly Study Hours</h2>
          <div className="h-64">
            {stats.dailyBreakdown && stats.dailyBreakdown.length > 0
              ? <Bar data={weeklyData} options={barOpts} />
              : <div className="flex items-center justify-center h-full text-gray-400">No data this week</div>}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">By Course</h2>
          <div className="h-64">
            {stats.byCourse && stats.byCourse.length > 0
              ? <Doughnut data={courseData} options={doughnutOpts} />
              : <div className="flex items-center justify-center h-full text-gray-400">No course data</div>}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Task Completion</h2>
        <div className="flex items-center gap-6">
          <div className="flex-1"><div className="h-4 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full" style={{ width: rate + "%" }} />
          </div></div>
          <span className="text-lg font-bold text-indigo-600">{rate}%</span>
        </div>
        <p className="text-sm text-gray-500 mt-2">{stats.completedTasks} of {stats.totalTasks} completed</p>
      </div>
    </div>
  );
};
export default Analytics;
`,
);

// ───────────────────────────────────
// FRONTEND: Notes with PDF Export
// ───────────────────────────────────

write(
  "frontend/src/pages/Notes.jsx",
  `import { useState, useEffect } from "react";
import { getNotes, createNote, updateNote, deleteNote, getCourses } from "../services/api";
import toast from "react-hot-toast";

const Notes = () => {
  const [notes, setNotes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ title: "", content: "", course: "", tags: "" });

  useEffect(() => { load(); }, []);
  const load = async () => { try { const [n, c] = await Promise.all([getNotes(), getCourses()]); setNotes(n.data); setCourses(c.data); } catch {} finally { setLoading(false); } };

  const submit = async (e) => {
    e.preventDefault();
    try {
      const p = { ...form, tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [] };
      if (!p.course) delete p.course;
      if (editId) { await updateNote(editId, p); toast.success("Updated"); }
      else { await createNote(p); toast.success("Created"); }
      setEditor(false); setEditId(null); setForm({ title: "", content: "", course: "", tags: "" }); load();
    } catch { toast.error("Error"); }
  };

  const edit = (n) => { setForm({ title: n.title, content: n.content || "", course: n.course ? n.course._id : "", tags: n.tags ? n.tags.join(", ") : "" }); setEditId(n._id); setEditor(true); };
  const del = async (id) => { if (!confirm("Delete?")) return; try { await deleteNote(id); toast.success("Deleted"); load(); } catch {} };
  const set = (k, v) => setForm({ ...form, [k]: v });

  const exportPdf = (note) => {
    const w = window.open("", "_blank");
    w.document.write("<html><head><title>" + note.title + "</title>");
    w.document.write("<style>body{font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:0 auto;} h1{color:#4f46e5;border-bottom:2px solid #e5e7eb;padding-bottom:10px;} .meta{color:#6b7280;font-size:14px;margin-bottom:20px;} .content{white-space:pre-wrap;line-height:1.8;} .tags{margin-top:20px;} .tag{background:#f1f5f9;padding:4px 12px;border-radius:20px;font-size:12px;margin-right:8px;display:inline-block;}</style>");
    w.document.write("</head><body>");
    w.document.write("<h1>" + note.title + "</h1>");
    w.document.write("<div class='meta'>");
    if (note.course) w.document.write("Course: " + note.course.name + " | ");
    w.document.write("Date: " + new Date(note.updatedAt || note.createdAt).toLocaleDateString());
    w.document.write(" | ISE StudyTracker - University of Duisburg-Essen</div>");
    w.document.write("<div class='content'>" + (note.content || "").replace(/\\n/g, "<br>") + "</div>");
    if (note.tags && note.tags.length > 0) {
      w.document.write("<div class='tags'>");
      note.tags.forEach((t) => w.document.write("<span class='tag'>" + t + "</span>"));
      w.document.write("</div>");
    }
    w.document.write("</body></html>");
    w.document.close();
    w.print();
  };

  const filtered = notes.filter((n) => !search || n.title.toLowerCase().includes(search.toLowerCase()) || (n.content && n.content.toLowerCase().includes(search.toLowerCase())));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-bold">Notes</h1><p className="text-gray-500 text-sm">{filtered.length} notes</p></div>
        <button onClick={() => { setForm({ title: "", content: "", course: "", tags: "" }); setEditId(null); setEditor(true); }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">+ New Note</button>
      </div>

      <input value={search} onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Search notes..." />

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-16 text-center"><p className="text-5xl mb-4">\\uD83D\\uDCDD</p><h3 className="text-xl font-semibold">No notes yet</h3></div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((n) => (
            <div key={n._id} className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md cursor-pointer group" onClick={() => edit(n)}>
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold truncate">{n.title}</h3>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                  <button onClick={(e) => { e.stopPropagation(); exportPdf(n); }} className="p-1 text-indigo-500 text-xs" title="Export PDF">PDF</button>
                  <button onClick={(e) => { e.stopPropagation(); del(n._id); }} className="p-1 text-red-400 text-xs">Del</button>
                </div>
              </div>
              {n.course && <span className="text-xs px-2 py-0.5 rounded-full inline-block mb-2" style={{ backgroundColor: (n.course.color || "#6b7280") + "20", color: n.course.color || "#6b7280" }}>{n.course.name}</span>}
              <p className="text-sm text-gray-500 line-clamp-3 mb-3">{n.content || "No content"}</p>
              <div className="flex gap-1 flex-wrap">{(n.tags || []).slice(0, 3).map((t) => <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{t}</span>)}</div>
            </div>
          ))}
        </div>
      )}

      {editor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">{editId ? "Edit" : "New"} Note</h2>
              <button onClick={() => { setEditor(false); setEditId(null); }} className="text-2xl text-gray-400">\\u00D7</button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input value={form.title} onChange={(e) => set("title", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                <select value={form.course} onChange={(e) => set("course", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">No course</option>{courses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <textarea value={form.content} onChange={(e) => set("content", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm" rows="10" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <input value={form.tags} onChange={(e) => set("tags", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">{editId ? "Update" : "Create"}</button>
                <button type="button" onClick={() => { setEditor(false); setEditId(null); }} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Notes;
`,
);

console.log("\n=== FEATURE UPGRADE COMPLETE ===");
console.log("\nNew features added:");
console.log("  1. Analytics with Chart.js (Bar + Doughnut charts)");
console.log("  2. Weekly Schedule / Timetable");
console.log("  3. Password Reset (forgot + reset)");
console.log("  4. Export Notes as PDF");
console.log("  5. AI Tutor (upload lectures, ask questions, get explanations)");
console.log("\nNow run:");
console.log("  cd backend && npm install && cd ..");
console.log("  cd frontend && npm run dev");
console.log("  (in another terminal) cd backend && npm run dev");
