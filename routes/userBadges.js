// routes/userBadges.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Badge = require('../models/Badge');

// Attribuer un badge à un utilisateur
router.post('/:userId/badges/:badgeId', async (req, res) => {
  try {
    const { userId, badgeId } = req.params;
    
    // Vérifier si l'utilisateur existe
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    
    // Vérifier si le badge existe
    const badge = await Badge.findById(badgeId);
    if (!badge) return res.status(404).json({ error: 'Badge non trouvé' });
    
    // Vérifier si l'utilisateur a déjà ce badge
    const hasBadge = user.badges.some(b => b.badge.toString() === badgeId);
    if (hasBadge) {
      return res.status(400).json({ error: 'L\'utilisateur possède déjà ce badge' });
    }
    
    // Ajouter le badge à l'utilisateur
    user.badges.push({ badge: badgeId });
    await user.save();
    
    // Incrémenter le compteur earnedBy du badge
    await Badge.findByIdAndUpdate(badgeId, { $inc: { earnedBy: 1 } });
    
    res.status(201).json({ message: 'Badge attribué avec succès' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtenir les badges d'un utilisateur
router.get('/:userId/badges', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate('badges.badge', 'name description icon color type');
    
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    
    res.json(user.badges);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;