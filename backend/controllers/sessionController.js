const StudySession = require("../models/StudySession");
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
