const Course = require("../models/Course");

exports.getCourses = async (req, res) => {
  const courses = await Course.find({ user: req.user._id }).sort("-createdAt");
  res.json(courses);
};

exports.createCourse = async (req, res) => {
  const course = await Course.create({ ...req.body, user: req.user._id });
  res.status(201).json(course);
};

exports.updateCourse = async (req, res) => {
  const course = await Course.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    req.body,
    { new: true }
  );
  res.json(course);
};

exports.deleteCourse = async (req, res) => {
  await Course.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  res.json({ message: "Course deleted" });
};
