const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText:   { type: String, required: true },
  options:        [{ type: String, required: true }],
  correctAnswer:  { type: Number, required: true },
});

const quizSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String },
  questions:   [questionSchema],
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt:   { type: Date, default: Date.now },
});

module.exports = mongoose.model('Quiz', quizSchema);

