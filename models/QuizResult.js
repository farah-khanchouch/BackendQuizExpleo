// models/QuizResult.js
const mongoose = require('mongoose');

const quizResultSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  }, // Référence vers l'utilisateur
  quizId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Quiz',
    required: true 
  }, // Référence vers le quiz
  quizTitle: { type: String, required: false },
  theme: { type: String, required: false },
  score: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  correctAnswers: { type: Number, required: true },
  percentage: { type: Number, required: true },
  timeSpent: { type: Number, required: true }, // en secondes
  pointsEarned: { type: Number, required: true },
  attempts: { type: Number, default: 1 },
  completedAt: { type: Date, default: Date.now }
});

// Index pour améliorer les performances
quizResultSchema.index({ userId: 1 });
quizResultSchema.index({ userId: 1, completedAt: -1 });
quizResultSchema.index({ quizId: 1 });
quizResultSchema.index({ userId: 1, quizId: 1 });

module.exports = mongoose.model('QuizResult', quizResultSchema);