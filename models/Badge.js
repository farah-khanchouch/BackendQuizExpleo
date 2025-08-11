const mongoose = require('mongoose');

const BadgeSchema = new mongoose.Schema({
  name: { type: String },
  description: { type: String},
  icon: { type: String },
  color: { type: String},
  criteria: { type: String },
  type: { type: String, enum: ['achievement', 'milestone', 'special'], default: 'achievement' },
  isActive: { type: Boolean },
  createdAt: { type: Date, default: Date.now },
  earnedBy: { type: Number }
  // Ajoute ici d'autres champs si besoin, ils seront automatiquement gérés par Angular si tu les ajoutes aussi côté front
});

module.exports = mongoose.model('Badge', BadgeSchema);