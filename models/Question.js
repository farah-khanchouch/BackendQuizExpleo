// models/Question.js
const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
type: { type: String, enum: ['qcm', 'vrai-faux', 'libre'], required: true },
  question: { type: String, required: true },
  options: [String],               // Pour QCM
  correctAnswer: mongoose.Schema.Types.Mixed, // string ou number (index)
  points: { type: Number, default: 1 },
  explanation: String
});

module.exports = mongoose.model('Question', questionSchema);
