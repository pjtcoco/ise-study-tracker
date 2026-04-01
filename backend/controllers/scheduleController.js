const Course = require("../models/Course");

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
