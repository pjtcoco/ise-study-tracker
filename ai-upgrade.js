const fs = require("fs");
const path = require("path");

function write(fp, content) {
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, content.trimStart(), "utf8");
  console.log("Created:", fp);
}

console.log("=== ISE StudyTracker AI Upgrade ===");
console.log(
  "Adding: Real AI (OpenAI), PDF Upload, Image Upload, Smart Explanations\n",
);

// ───────────────────────────────────
// BACKEND: Update package.json
// ───────────────────────────────────

const backendPkg = JSON.parse(fs.readFileSync("backend/package.json", "utf8"));
backendPkg.dependencies["openai"] = "^4.28.0";
backendPkg.dependencies["multer"] = "^1.4.5-lts.1";
backendPkg.dependencies["pdf-parse"] = "^1.1.1";
backendPkg.dependencies["fs-extra"] = "^11.2.0";
fs.writeFileSync(
  "backend/package.json",
  JSON.stringify(backendPkg, null, 2),
  "utf8",
);
console.log("Updated: backend/package.json");

// ───────────────────────────────────
// BACKEND: OpenAI Config
// ───────────────────────────────────

write(
  "backend/config/openai.js",
  `const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

module.exports = openai;
`,
);

// ───────────────────────────────────
// BACKEND: Upload Middleware
// ───────────────────────────────────

write(
  "backend/middleware/upload.js",
  `const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /pdf|jpeg|jpg|png/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) return cb(null, true);
  cb(new Error("Only PDF, JPEG, JPG, and PNG files are allowed"));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
});

module.exports = upload;
`,
);

// ───────────────────────────────────
// BACKEND: AI Service
// ───────────────────────────────────

write(
  "backend/services/aiService.js",
  `const openai = require("../config/openai");

const SYSTEM_PROMPT = \`You are an expert AI tutor for Intelligent Network Systems (ISE) students at the University of Duisburg-Essen.

Your goals:
1. Explain concepts in simple, layman's terms using analogies and real-world examples.
2. If the student doesn't understand, try a different explanation approach.
3. Be encouraging and helpful.
4. When analyzing images, describe what you see and explain the technical concepts shown.
5. Always relate explanations back to the course material when possible.

Tone: Friendly, patient, and educational.
\`;

async function explainText(context, question, history = []) {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "system", content: "Relevant course material:\\n\\n" + context },
    ...history,
    { role: "user", content: question }
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    max_tokens: 1000,
    temperature: 0.7,
  });

  return response.choices[0].message.content;
}

async function explainImage(imageBase64, question, context = "") {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  if (context) {
    messages.push({ role: "system", content: "Relevant course material:\\n\\n" + context });
  }

  messages.push({
    role: "user",
    content: [
      { type: "text", text: question || "Explain what's in this image in simple terms." },
      { type: "image_url", image_url: { url: \`data:image/jpeg;base64,\${imageBase64}\` } }
    ]
  });

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    max_tokens: 1000,
    temperature: 0.7,
  });

  return response.choices[0].message.content;
}

async function summarizePDF(content) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "Summarize this textbook/lecture content. Extract key concepts, definitions, and important points. Keep it structured and educational." },
      { role: "user", content: content.substring(0, 100000) } // Limit to ~100k chars
    ],
    max_tokens: 2000,
    temperature: 0.5,
  });

  return response.choices[0].message.content;
}

module.exports = { explainText, explainImage, summarizePDF };
`,
);

// ───────────────────────────────────
// BACKEND: Updated Course Model
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
  }],
  textbook: {
    filename: String,
    path: String,
    uploadedAt: { type: Date, default: Date.now }
  },
  textbookContent: String, // Extracted text for AI context
  textbookSummary: String  // AI-generated summary
}, { timestamps: true });

module.exports = mongoose.model("Course", courseSchema);
`,
);

// ───────────────────────────────────
// BACKEND: Updated Lecture Model
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
  files: [{
    filename: String,
    path: String,
    type: { type: String, enum: ["pdf", "image"] },
    uploadedAt: { type: Date, default: Date.now }
  }],
  extractedText: String, // For PDFs
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
// BACKEND: Course Controller with PDF Upload
// ───────────────────────────────────

write(
  "backend/controllers/courseController.js",
  `const Course = require("../models/Course");
const pdf = require("pdf-parse");
const fs = require("fs");
const { summarizePDF } = require("../services/aiService");

exports.getCourses = async (req, res) => {
  const courses = await Course.find({ user: req.user._id }).sort("-createdAt");
  res.json(courses);
};

exports.getCourse = async (req, res) => {
  const course = await Course.findOne({ _id: req.params.id, user: req.user._id });
  if (!course) return res.status(404).json({ message: "Course not found" });
  res.json(course);
};

exports.createCourse = async (req, res) => {
  const course = await Course.create({ ...req.body, user: req.user._id });
  res.status(201).json(course);
};

exports.updateCourse = async (req, res) => {
  const course = await Course.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!course) return res.status(404).json({ message: "Course not found" });
  res.json(course);
};

exports.deleteCourse = async (req, res) => {
  const course = await Course.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (course && course.textbook?.path && fs.existsSync(course.textbook.path)) {
    fs.unlinkSync(course.textbook.path);
  }
  res.json({ message: "Course deleted" });
};

exports.uploadTextbook = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const course = await Course.findOne({ _id: req.params.id, user: req.user._id });
    if (!course) return res.status(404).json({ message: "Course not found" });

    // Delete old textbook if exists
    if (course.textbook?.path && fs.existsSync(course.textbook.path)) {
      fs.unlinkSync(course.textbook.path);
    }

    // Extract text from PDF
    const dataBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdf(dataBuffer);
    const extractedText = pdfData.text;

    // Generate AI summary
    let summary = "";
    try {
      summary = await summarizePDF(extractedText);
    } catch (err) {
      console.error("AI summary failed:", err);
      summary = "Summary generation failed. Text extracted successfully.";
    }

    course.textbook = {
      filename: req.file.originalname,
      path: req.file.path,
      uploadedAt: new Date()
    };
    course.textbookContent = extractedText;
    course.textbookSummary = summary;
    await course.save();

    res.json({
      message: "Textbook uploaded and analyzed",
      textbook: course.textbook,
      summary: course.textbookSummary
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: error.message });
  }
};
`,
);

// ───────────────────────────────────
// BACKEND: Lecture Controller with AI & Files
// ───────────────────────────────────

write(
  "backend/controllers/lectureController.js",
  `const Lecture = require("../models/Lecture");
const Course = require("../models/Course");
const pdf = require("pdf-parse");
const fs = require("fs");
const { explainText, explainImage, summarizePDF } = require("../services/aiService");

function generateSummary(content) {
  const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 10);
  const keyPoints = sentences.slice(0, Math.min(5, sentences.length)).map((s) => s.trim());
  const summary = sentences.slice(0, 3).join(". ").trim() + ".";
  return { summary, keyPoints };
}

exports.getLectures = async (req, res) => {
  const filter = { user: req.user._id };
  if (req.query.course) filter.course = req.query.course;
  const lectures = await Lecture.find(filter).populate("course", "name color").sort("-createdAt");
  res.json(lectures);
};

exports.getLecture = async (req, res) => {
  const lecture = await Lecture.findOne({ _id: req.params.id, user: req.user._id }).populate("course", "name color");
  if (!lecture) return res.status(404).json({ message: "Lecture not found" });
  res.json(lecture);
};

exports.uploadLecture = async (req, res) => {
  try {
    const { title, content, course } = req.body;
    const { summary, keyPoints } = generateSummary(content || "");

    const payload = { user: req.user._id, title, content: content || "", summary, keyPoints };
    if (course) payload.course = course;

    const lecture = await Lecture.create(payload);
    const populated = await lecture.populate("course", "name color");
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.uploadLectureFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const lecture = await Lecture.findOne({ _id: req.params.id, user: req.user._id });
    if (!lecture) return res.status(404).json({ message: "Lecture not found" });

    const fileType = req.file.mimetype.includes("pdf") ? "pdf" : "image";
    let extractedText = "";

    if (fileType === "pdf") {
      const dataBuffer = fs.readFileSync(req.file.path);
      const pdfData = await pdf(dataBuffer);
      extractedText = pdfData.text;

      // Update lecture content with extracted text
      if (!lecture.content) {
        lecture.content = extractedText;
        const { summary, keyPoints } = generateSummary(extractedText);
        lecture.summary = summary;
        lecture.keyPoints = keyPoints;
      }
    }

    lecture.files.push({
      filename: req.file.originalname,
      path: req.file.path,
      type: fileType,
      uploadedAt: new Date()
    });

    if (extractedText) {
      lecture.extractedText = (lecture.extractedText || "") + "\\n\\n" + extractedText;
    }

    await lecture.save();
    res.json({ message: "File uploaded", file: lecture.files[lecture.files.length - 1] });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: error.message });
  }
};

exports.askQuestion = async (req, res) => {
  try {
    const { question, imageBase64 } = req.body;
    const lecture = await Lecture.findOne({ _id: req.params.id, user: req.user._id }).populate("course");
    if (!lecture) return res.status(404).json({ message: "Lecture not found" });

    // Build context from lecture + course textbook
    let context = "Lecture Content:\\n" + (lecture.content || lecture.extractedText || "");
    
    if (lecture.course) {
      const course = await Course.findById(lecture.course);
      if (course?.textbookContent) {
        context += "\\n\\nCourse Textbook Content:\\n" + course.textbookContent.substring(0, 50000);
      }
    }

    let answer;
    if (imageBase64) {
      answer = await explainImage(imageBase64, question, context);
    } else {
      answer = await explainText(context, question);
    }

    lecture.explanations.push({ question, answer });
    await lecture.save();

    res.json({ question, answer });
  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.deleteLecture = async (req, res) => {
  const lecture = await Lecture.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (lecture) {
    lecture.files.forEach((file) => {
      if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    });
  }
  res.json({ message: "Deleted" });
};
`,
);

// ───────────────────────────────────
// BACKEND: Routes
// ───────────────────────────────────

write(
  "backend/routes/courses.js",
  `const router = require("express").Router();
const { getCourses, getCourse, createCourse, updateCourse, deleteCourse, uploadTextbook } = require("../controllers/courseController");
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");

router.use(protect);
router.route("/").get(getCourses).post(createCourse);
router.route("/:id").get(getCourse).put(updateCourse).delete(deleteCourse);
router.post("/:id/textbook", upload.single("textbook"), uploadTextbook);

module.exports = router;
`,
);

write(
  "backend/routes/lectures.js",
  `const router = require("express").Router();
const { getLectures, getLecture, uploadLecture, uploadLectureFile, askQuestion, deleteLecture } = require("../controllers/lectureController");
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");

router.use(protect);
router.route("/").get(getLectures).post(uploadLecture);
router.route("/:id").get(getLecture).delete(deleteLecture);
router.post("/:id/file", upload.single("file"), uploadLectureFile);
router.post("/:id/ask", askQuestion);

module.exports = router;
`,
);

// ───────────────────────────────────
// BACKEND: Updated server.js
// ───────────────────────────────────

write(
  "backend/server.js",
  `const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const connectDB = require("./config/db");

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "ISE StudyTracker API with AI" });
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
// FRONTEND: Updated API Service
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
export const getCourse = (id) => API.get("/courses/" + id);
export const createCourse = (data) => API.post("/courses", data);
export const updateCourse = (id, data) => API.put("/courses/" + id, data);
export const deleteCourse = (id) => API.delete("/courses/" + id);
export const uploadTextbook = (id, file) => {
  const formData = new FormData();
  formData.append("textbook", file);
  return API.post("/courses/" + id + "/textbook", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
};

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
export const uploadLectureFile = (id, file) => {
  const formData = new FormData();
  formData.append("file", file);
  return API.post("/lectures/" + id + "/file", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
};
export const askLecture = (id, data) => API.post("/lectures/" + id + "/ask", data);
export const deleteLecture = (id) => API.delete("/lectures/" + id);

export default API;
`,
);

// ───────────────────────────────────
// FRONTEND: Updated Courses Page
// ───────────────────────────────────

write(
  "frontend/src/pages/Courses.jsx",
  `import { useState, useEffect } from "react";
import { getCourses, createCourse, updateCourse, deleteCourse, uploadTextbook, getCourse } from "../services/api";
import toast from "react-hot-toast";

const COLORS = ["#6366f1","#8b5cf6","#ec4899","#ef4444","#f97316","#eab308","#22c55e","#14b8a6","#3b82f6","#6b7280"];
const empty = { name: "", code: "", professor: "", credits: 6, semester: 1, color: "#6366f1", status: "active" };

const Courses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(empty);
  const [uploading, setUploading] = useState(null);
  const [textbookModal, setTextbookModal] = useState(null);

  useEffect(() => { load(); }, []);
  const load = async () => { try { setCourses((await getCourses()).data); } catch {} finally { setLoading(false); } };

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editId) { await updateCourse(editId, form); toast.success("Updated"); }
      else { await createCourse(form); toast.success("Created"); }
      setModal(false); setEditId(null); setForm(empty); load();
    } catch { toast.error("Error"); }
  };

  const edit = (c) => { setForm({ name: c.name, code: c.code || "", professor: c.professor || "", credits: c.credits || 6, semester: c.semester || 1, color: c.color || "#6366f1", status: c.status }); setEditId(c._id); setModal(true); };
  
  const del = async (id) => { if (!confirm("Delete?")) return; try { await deleteCourse(id); toast.success("Deleted"); load(); } catch {} };

  const handleTextbookUpload = async (e, courseId) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== "application/pdf") return toast.error("Only PDF files allowed");
    
    setUploading(courseId);
    try {
      const { data } = await uploadTextbook(courseId, file);
      toast.success("Textbook uploaded and analyzed!");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(null);
      setTextbookModal(null);
    }
  };

  const set = (k, v) => setForm({ ...form, [k]: v });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Your Courses</h1><p className="text-gray-500 text-sm">Manage courses and textbooks</p></div>
        <button onClick={() => { setForm(empty); setEditId(null); setModal(true); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">+ Add Course</button>
      </div>

      {courses.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-16 text-center">
          <p className="text-5xl mb-4">📚</p><h3 className="text-xl font-semibold mb-2">No courses yet</h3>
          <button onClick={() => setModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Add First Course</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((c) => (
            <div key={c._id} className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: c.color }} />
                  <div><h3 className="font-semibold">{c.name}</h3><p className="text-sm text-gray-500">{c.code}</p></div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                  <button onClick={() => edit(c)} className="p-1.5 hover:bg-gray-100 rounded text-gray-400 text-sm">Edit</button>
                  <button onClick={() => del(c._id)} className="p-1.5 hover:bg-red-50 rounded text-red-400 text-sm">Del</button>
                </div>
              </div>
              {c.professor && <p className="text-sm text-gray-500 mb-1">Prof: {c.professor}</p>}
              
              {c.textbook && (
                <div className="mt-3 bg-indigo-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-indigo-700">📖 Textbook: {c.textbook.filename}</p>
                  {c.textbookSummary && <p className="text-xs text-indigo-600 mt-1 line-clamp-2">{c.textbookSummary.substring(0, 100)}...</p>}
                </div>
              )}

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{c.credits} ECTS</span><span>Sem {c.semester}</span>
                  <span className={"px-2 py-0.5 rounded-full " + (c.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600")}>{c.status}</span>
                </div>
                <button 
                  onClick={() => setTextbookModal(c._id)}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  {c.textbook ? "Replace PDF" : "📤 Upload PDF"}
                </button>
              </div>

              {textbookModal === c._id && (
                <div className="mt-3 pt-3 border-t">
                  <label className="block text-xs text-gray-500 mb-2">Upload textbook PDF:</label>
                  <input 
                    type="file" 
                    accept=".pdf"
                    onChange={(e) => handleTextbookUpload(e, c._id)}
                    disabled={uploading === c._id}
                    className="text-xs"
                  />
                  {uploading === c._id && <p className="text-xs text-indigo-600 mt-1">Uploading and analyzing...</p>}
                  <button onClick={() => setTextbookModal(null)} className="text-xs text-gray-400 mt-1">Cancel</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">{editId ? "Edit" : "Add"} Course</h2>
              <button onClick={() => { setModal(false); setEditId(null); }} className="text-2xl text-gray-400">×</button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input value={form.name} onChange={(e) => set("name", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                  <input value={form.code} onChange={(e) => set("code", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Credits</label>
                  <input type="number" value={form.credits} onChange={(e) => set("credits", Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Professor</label>
                <input value={form.professor} onChange={(e) => set("professor", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <div className="flex gap-2">{COLORS.map((co) => (
                  <button key={co} type="button" onClick={() => set("color", co)}
                    className={"w-8 h-8 rounded-full " + (form.color === co ? "ring-2 ring-offset-2 ring-gray-400 scale-125" : "hover:scale-110")}
                    style={{ backgroundColor: co }} />
                ))}</div></div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">{editId ? "Update" : "Create"}</button>
                <button type="button" onClick={() => { setModal(false); setEditId(null); }} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Courses;
`,
);

// ───────────────────────────────────
// FRONTEND: AI Tutor Page with PDF/Image Upload
// ───────────────────────────────────

write(
  "frontend/src/pages/AiTutor.jsx",
  `import { useState, useEffect, useRef } from "react";
import { getLectures, uploadLecture, askLecture, deleteLecture, getCourses, uploadLectureFile } from "../services/api";
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
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => { load(); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  const load = async () => {
    try {
      const [l, c] = await Promise.all([getLectures(), getCourses()]);
      setLectures(l.data); setCourses(c.data);
    } catch {} finally { setLoading(false); }
  };

  const submitUpload = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (!payload.course) delete payload.course;
      await uploadLecture(payload);
      toast.success("Lecture uploaded!");
      setUploadModal(false); setForm({ title: "", content: "", course: "" }); load();
    } catch { toast.error("Failed"); }
  };

  const openLecture = (lec) => {
    setActiveLecture(lec);
    setChat(lec.explanations || []);
    setSelectedImage(null);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeLecture) return;
    
    setUploadingFile(true);
    try {
      await uploadLectureFile(activeLecture._id, file);
      toast.success("File uploaded and analyzed!");
      load();
      // Refresh active lecture
      const updated = lectures.find(l => l._id === activeLecture._id) || activeLecture;
      setActiveLecture(updated);
    } catch { toast.error("Upload failed"); }
    finally { 
      setUploadingFile(false);
      e.target.value = "";
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const ask = async (e) => {
    e.preventDefault();
    if ((!question.trim() && !selectedImage) || !activeLecture) return;
    
    setAsking(true);
    try {
      const payload = { question: question || "Explain this image" };
      if (selectedImage) {
        payload.imageBase64 = selectedImage.split(",")[1]; // Remove data URL prefix
      }
      
      const { data } = await askLecture(activeLecture._id, payload);
      setChat((prev) => [...prev, data]);
      setQuestion("");
      setSelectedImage(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to get answer");
    } finally { 
      setAsking(false); 
    }
  };

  const askForSimpler = async () => {
    if (!chat.length || asking) return;
    setAsking(true);
    try {
      const lastQ = chat[chat.length - 1].question;
      const { data } = await askLecture(activeLecture._id, { 
        question: "I still don't understand. Please explain this in even simpler terms with a different analogy." 
      });
      setChat((prev) => [...prev, { question: "Explain simpler", answer: data.answer }]);
    } catch { toast.error("Failed"); }
    finally { setAsking(false); }
  };

  const del = async (id) => {
    if (!confirm("Delete?")) return;
    try { await deleteLecture(id); toast.success("Deleted"); if (activeLecture?._id === id) setActiveLecture(null); load(); }
    catch { toast.error("Failed"); }
  };

  const set = (k, v) => setForm({ ...form, [k]: v });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">AI Tutor</h1><p className="text-gray-500 text-sm">Upload PDFs, images, and get real AI explanations</p></div>
        <button onClick={() => setUploadModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">+ New Lecture</button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-3">
          <h3 className="font-semibold text-gray-700">Your Materials</h3>
          
          {activeLecture && (
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <h4 className="font-medium text-sm mb-2">Upload to this lecture:</h4>
              <div className="space-y-2">
                <label className="block">
                  <span className="text-xs text-gray-500">📄 PDF Document</span>
                  <input type="file" accept=".pdf" onChange={handleFileUpload} disabled={uploadingFile}
                    className="block w-full text-xs mt-1" />
                  {uploadingFile && <p className="text-xs text-indigo-600">Processing...</p>}
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500">🖼️ Image for Analysis</span>
                  <input type="file" accept="image/*" onChange={handleImageSelect}
                    className="block w-full text-xs mt-1" />
                </label>
              </div>
              {activeLecture.files?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-1">Attached files:</p>
                  {activeLecture.files.map((f, i) => (
                    <div key={i} className="text-xs text-gray-600 flex items-center gap-1">
                      <span>{f.type === "pdf" ? "📄" : "🖼️"}</span>{f.filename}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {lectures.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border p-6 text-center">
              <p className="text-3xl mb-2">🤖</p>
              <p className="text-gray-500 text-sm">Upload materials to start</p>
            </div>
          ) : (
            lectures.map((lec) => (
              <div key={lec._id} className={"bg-white rounded-xl shadow-sm border p-4 cursor-pointer hover:shadow-md transition-shadow group " + (activeLecture?._id === lec._id ? "ring-2 ring-indigo-500" : "")}
                onClick={() => openLecture(lec)}>
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-sm">{lec.title}</h4>
                    {lec.course && <span className="text-xs px-2 py-0.5 rounded-full mt-1 inline-block" style={{ backgroundColor: (lec.course.color || "#6b7280") + "20", color: lec.course.color }}>{lec.course.name}</span>}
                    {lec.files?.length > 0 && <p className="text-xs text-gray-400 mt-1">{lec.files.length} file(s) attached</p>}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); del(lec._id); }} className="text-red-400 text-xs opacity-0 group-hover:opacity-100">Del</button>
                </div>
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
                    <h3 className="font-semibold text-indigo-900 text-sm mb-1">AI Summary</h3>
                    <p className="text-sm text-indigo-700">{activeLecture.summary}</p>
                  </div>
                )}
                {activeLecture.keyPoints?.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-semibold text-sm mb-2">Key Points</h3>
                    <ul className="space-y-1">
                      {activeLecture.keyPoints.map((kp, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="text-indigo-500 mt-0.5">•</span>{kp}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="font-semibold mb-4">Chat with AI Tutor</h3>
                <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
                  {chat.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Ask a question or upload an image to analyze!</p>}
                  {chat.map((msg, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-end"><div className="bg-indigo-600 text-white rounded-2xl rounded-br-md px-4 py-2 max-w-[80%] text-sm">{msg.question}</div></div>
                      <div className="flex justify-start"><div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-2 max-w-[80%] text-sm whitespace-pre-wrap">{msg.answer}</div></div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {selectedImage && (
                  <div className="mb-3">
                    <div className="relative inline-block">
                      <img src={selectedImage} alt="Selected" className="h-32 rounded-lg border" />
                      <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-sm">×</button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Image ready for analysis</p>
                  </div>
                )}

                <form onSubmit={ask} className="flex gap-2">
                  <input value={question} onChange={(e) => setQuestion(e.target.value)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ask anything... or upload an image" disabled={asking} />
                  <button type="submit" disabled={asking}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">
                    {asking ? "..." : "Ask"}
                  </button>
                </form>

                {chat.length > 0 && (
                  <button onClick={askForSimpler} disabled={asking}
                    className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                    🤔 I still don't understand - explain simpler
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border p-16 text-center">
              <p className="text-5xl mb-4">🤖</p>
              <h3 className="text-xl font-semibold mb-2">Select a material</h3>
              <p className="text-gray-500">Choose from the left or create a new lecture to start learning with AI.</p>
            </div>
          )}
        </div>
      </div>

      {uploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">New Lecture</h2>
              <button onClick={() => setUploadModal(false)} className="text-2xl text-gray-400">×</button>
            </div>
            <form onSubmit={submitUpload} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input value={form.title} onChange={(e) => set("title", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                <select value={form.course} onChange={(e) => set("course", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">No course</option>
                  {courses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Content (optional)</label>
                <textarea value={form.content} onChange={(e) => set("content", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" rows="4"
                  placeholder="You can also upload PDFs/images after creating" /></div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">Create</button>
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

console.log("\n=== AI UPGRADE COMPLETE ===");
console.log("\nNew AI Features:");
console.log("  ✓ Real OpenAI GPT-4o integration");
console.log("  ✓ Upload PDF textbooks to courses");
console.log("  ✓ AI analyzes and summarizes PDFs");
console.log("  ✓ Upload PDFs/images to lectures");
console.log("  ✓ Ask questions about content");
console.log("  ✓ AI explains images");
console.log("  ✓ 'Explain simpler' button");
console.log("  ✓ Layman's terms explanations");
console.log("\nNext steps:");
console.log("  1. cd backend && npm install");
console.log("  2. Get OpenAI API key from https://platform.openai.com");
console.log("  3. Add to backend/.env: OPENAI_API_KEY=sk-...");
console.log("  4. Restart backend and frontend");
