const fs = require("fs");
const path = require("path");

const replacements = {
  "\\u21BB": "↻",
  "\\u00D7": "×",
  "\\u2630": "☰",
  "\\uD83D\\uDCDA": "📚",
  "\\uD83C\\uDFE0": "🏠",
  "\\uD83C\\uDF93": "🎓",
  "\\uD83D\\uDCCB": "📋",
  "\\uD83D\\uDCDD": "📝",
  "\\u23F1\\uFE0F": "⏱️",
  "\\uD83D\\uDCCA": "📊",
  "\\uD83D\\uDC64": "👤",
  "\\uD83D\\uDD25": "🔥",
  "\\u2705": "✅",
  "\\uD83D\\uDE80": "🚀",
  "\\u2615": "☕",
  "\\uD83D\\uDCAA": "💪",
  "\\uD83D\\uDCC5": "📅",
  "\\uD83E\\uDD16": "🤖",
  "\\\\u21BB": "↻",
  "\\\\u00D7": "×",
  "\\\\u2630": "☰",
  "\\\\uD83D\\\\uDCDA": "📚",
  "\\\\uD83C\\\\uDFE0": "🏠",
  "\\\\uD83C\\\\uDF93": "🎓",
  "\\\\uD83D\\\\uDCCB": "📋",
  "\\\\uD83D\\\\uDCDD": "📝",
  "\\\\u23F1\\\\uFE0F": "⏱️",
  "\\\\uD83D\\\\uDCCA": "📊",
  "\\\\uD83D\\\\uDC64": "👤",
  "\\\\uD83D\\\\uDD25": "🔥",
  "\\\\u2705": "✅",
  "\\\\uD83D\\\\uDE80": "🚀",
  "\\\\u2615": "☕",
  "\\\\uD83D\\\\uDCAA": "💪",
  "\\\\uD83D\\\\uDCC5": "📅",
  "\\\\uD83E\\\\uDD16": "🤖",
};

const targetFiles = [
  "frontend/src/components/Layout.jsx",
  "frontend/src/pages/Dashboard.jsx",
  "frontend/src/pages/Courses.jsx",
  "frontend/src/pages/Tasks.jsx",
  "frontend/src/pages/Notes.jsx",
  "frontend/src/pages/Timer.jsx",
  "frontend/src/pages/Analytics.jsx",
  "frontend/src/pages/Profile.jsx",
  "frontend/src/pages/AiTutor.jsx",
  "frontend/src/pages/Schedule.jsx",
  "frontend/src/pages/Landing.jsx",
  "frontend/src/pages/Login.jsx",
  "frontend/src/pages/Register.jsx",
];

targetFiles.forEach((file) => {
  if (!fs.existsSync(file)) return;

  let content = fs.readFileSync(file, "utf8");

  Object.keys(replacements).forEach((old) => {
    const regex = new RegExp(old, "g");
    content = content.replace(regex, replacements[old]);
  });

  fs.writeFileSync(file, content, "utf8");
  console.log("Fixed:", file);
});

console.log("\n✅ All escaped characters should now be fixed.");
console.log("Please restart your frontend:");
console.log("cd frontend && npm run dev");
