const Lecture = require("../models/Lecture");

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

  let answer = "Based on your lecture material:\n\n";
  answer += relevant.slice(0, 3).map((s, i) => (i + 1) + ". " + s.trim()).join("\n");
  answer += "\n\nKey takeaway: " + relevant[0].trim() + ".";

  if (q.includes("how") || q.includes("explain") || q.includes("what")) {
    answer += "\n\nSimplified: Think of it like this - " + relevant[0].trim().split(",")[0] + ". This is the core concept.";
  }

  if (q.includes("diagram") || q.includes("draw") || q.includes("visual")) {
    answer += "\n\n[Visual Representation]\n";
    const terms = relevant[0].trim().split(" ").filter((w) => w.length > 4).slice(0, 4);
    answer += "\n  " + terms[0] + " --> " + (terms[1] || "Process") + " --> " + (terms[2] || "Result");
    answer += "\n    |                    |";
    answer += "\n    v                    v";
    answer += "\n  [Input]           [Output]\n";
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
