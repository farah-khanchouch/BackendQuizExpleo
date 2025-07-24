const mongoose = require('mongoose');

const userStatsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },
  quizCompleted: { type: Number, default: 0 },
  totalScore: { type: Number, default: 0 },
  totalQuizTaken: { type: Number, default: 0 },
  totalTimeSpent: { type: Number, default: 0 }, // en secondes
  ranking: { type: Number, default: 0 },
});

module.exports = mongoose.model('UserStats', userStatsSchema);
