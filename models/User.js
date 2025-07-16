const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },    // le nom complet de l’utilisateur
  email:      { type: String, required: true, unique: true }, // email unique
  password:   { type: String, required: true },    // mot de passe haché
  cbu:        { type: String, required: true },    // département ou catégorie
  avatar:     { type: String },                     // optionnel, url ou chemin vers avatar
  role:       { type: String, enum: ['admin', 'collaborator'], default: 'collaborator' }
});

module.exports = mongoose.model('User', userSchema);

