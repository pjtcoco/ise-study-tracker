const Task = require("../models/Task");

exports.getTasks = async (req, res) => {
  const tasks = await Task.find({ user: req.user._id }).populate("course", "name color");
  res.json(tasks);
};

exports.createTask = async (req, res) => {
  const task = await Task.create({ ...req.body, user: req.user._id });
  res.status(201).json(task);
};

exports.updateTask = async (req, res) => {
  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    req.body,
    { new: true }
  );
  res.json(task);
};

exports.deleteTask = async (req, res) => {
  await Task.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  res.json({ message: "Task deleted" });
};
