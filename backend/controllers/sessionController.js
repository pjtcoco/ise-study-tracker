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
  res.json({ message: "Session deleted" });
};

exports.getStats = async (req, res) => {
  const allSessions = await StudySession.find({ user: req.user._id });
  const totalMinutes = allSessions.reduce((sum, s) => sum + s.duration, 0);
  const totalTasks = await Task.countDocuments({ user: req.user._id });
  const completedTasks = await Task.countDocuments({ user: req.user._id, status: "completed" });
  const activeCourses = await Course.countDocuments({ user: req.user._id, status: "active" });

  res.json({
    totalMinutes,
    totalTasks,
    completedTasks,
    activeCourses,
    weeklyMinutes: totalMinutes,
    monthlyMinutes: totalMinutes,
    pendingTasks: totalTasks - completedTasks,
    streak: 0,
    totalSessions: allSessions.length,
    dailyBreakdown: [],
    byCourse: []
  });
};
