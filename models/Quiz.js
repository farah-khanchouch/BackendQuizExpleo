// models/Quiz.js
const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  status: { type: String, enum: ['draft', 'active', 'archived'], default: 'draft' },
  createdAt: { type: Date, default: Date.now },
  participants: { type: Number, default: 0 },
  averageScore: { type: Number, default: 0 }
});

module.exports = mongoose.model('Quiz', quizSchema);
