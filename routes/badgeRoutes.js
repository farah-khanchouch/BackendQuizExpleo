const express = require('express');
const router = express.Router();
const Badge = require('../models/Badge');
const User = require('../models/User');  // Importez le modèle User

// Créer un badge
router.post('/', async (req, res) => {
  try {
    const badge = new Badge({
      ...req.body,
      earnedBy: 0  // Initialiser le compteur à 0
    });
    await badge.save();
    res.status(201).json(badge);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Obtenir tous les badges avec statistiques
router.get('/', async (req, res) => {
  try {
    const badges = await Badge.find();
    res.json(badges);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtenir un badge par ID avec statistiques
router.get('/:id', async (req, res) => {
  try {
    const badge = await Badge.findById(req.params.id);
    if (!badge) return res.status(404).json({ error: 'Badge non trouvé' });
    
    // Compter le nombre d'utilisateurs ayant ce badge
    const userCount = await User.countDocuments({ 'badges.badge': req.params.id });
    
    res.json({
      ...badge.toObject(),
      earnedBy: userCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mettre à jour un badge
router.put('/:id', async (req, res) => {
  try {
    const badge = await Badge.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true }
    );
    if (!badge) return res.status(404).json({ error: 'Badge non trouvé' });
    res.json(badge);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Supprimer un badge
router.delete('/:id', async (req, res) => {
  try {
    // Vérifier d'abord si des utilisateurs ont ce badge
    const usersWithBadge = await User.countDocuments({ 'badges.badge': req.params.id });
    
    if (usersWithBadge > 0) {
      return res.status(400).json({ 
        error: 'Impossible de supprimer ce badge car il est attribué à des utilisateurs' 
      });
    }
    
    const badge = await Badge.findByIdAndDelete(req.params.id);
    if (!badge) return res.status(404).json({ error: 'Badge non trouvé' });
    res.json({ message: 'Badge supprimé avec succès' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Activer/désactiver un badge
router.patch('/:id/activation', async (req, res) => {
  try {
    const badge = await Badge.findByIdAndUpdate(
      req.params.id,
      { isActive: req.body.isActive },
      { new: true }
    );
    if (!badge) return res.status(404).json({ error: 'Badge non trouvé' });
    res.json(badge);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Obtenir les statistiques d'un badge
router.get('/:id/earned-count', async (req, res) => {
  try {
    const count = await User.countDocuments({ 'badges.badge': req.params.id });
    // Mettre à jour le compteur dans le badge
    await Badge.findByIdAndUpdate(req.params.id, { earnedBy: count });
    
    res.json({ 
      badgeId: req.params.id, 
      earnedCount: count 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtenir les statistiques de tous les badges
router.get('/stats/summary', async (req, res) => {
  try {
    const badges = await Badge.find();
    const stats = await Promise.all(
      badges.map(async (badge) => {
        const count = await User.countDocuments({ 'badges.badge': badge._id });
        return {
          badgeId: badge._id,
          name: badge.name,
          earnedCount: count,
          type: badge.type,
          isActive: badge.isActive
        };
      })
    );
    
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;