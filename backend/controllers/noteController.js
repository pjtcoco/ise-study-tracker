const Note = require("../models/Note");

exports.getNotes = async (req, res) => {
  const notes = await Note.find({ user: req.user._id }).populate("course", "name color").sort("-updatedAt");
  res.json(notes);
};

exports.createNote = async (req, res) => {
  const note = await Note.create({ ...req.body, user: req.user._id });
  res.status(201).json(note);
};

exports.updateNote = async (req, res) => {
  const note = await Note.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    req.body,
    { new: true }
  );
  res.json(note);
};

exports.deleteNote = async (req, res) => {
  await Note.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  res.json({ message: "Note deleted" });
};
