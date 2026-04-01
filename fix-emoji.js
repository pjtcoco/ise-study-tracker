const fs = require("fs");
const path = require("path");

const emojiMap = {
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

const files = [
  "frontend/src/components/Layout.jsx",
  "frontend/src/pages/Landing.jsx",
  "frontend/src/pages/Dashboard.jsx",
  "frontend/src/pages/Courses.jsx",
  "frontend/src/pages/Tasks.jsx",
  "frontend/src/pages/Notes.jsx",
  "frontend/src/pages/Timer.jsx",
  "frontend/src/pages/Analytics.jsx",
  "frontend/src/pages/Profile.jsx",
  "frontend/src/pages/AiTutor.jsx",
  "frontend/src/pages/Schedule.jsx",
];

files.forEach((filePath) => {
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, "utf8");

  Object.keys(emojiMap).forEach((key) => {
    const regex = new RegExp(key, "g");
    content = content.replace(regex, emojiMap[key]);
  });

  fs.writeFileSync(filePath, content, "utf8");
  console.log("✅ Fixed:", filePath);
});

console.log("\n🎉 All emoji issues should now be fixed!");
console.log("Restart your frontend:");
console.log("cd frontend && npm run dev");
