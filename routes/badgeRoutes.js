const express = require('express');
const router = express.Router();
const Badge = require('../models/Badge');


// Créer un badge
router.post('/', async (req, res) => {  try {
    const badge = new Badge(req.body);
    await badge.save();
    res.status(201).json(badge);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router.get('/', async (req, res) => {
    try {
      const badges = await Badge.find();
      res.json(badges);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  // Modifier un badge
router.put('/:id', async (req, res) => {
    try {
      const badge = await Badge.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!badge) return res.status(404).json({ error: 'Badge non trouvé' });
      res.json(badge);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });
  // Supprimer un badge
router.delete('/:id', async (req, res) => {
  try {
    const badge = await Badge.findByIdAndDelete(req.params.id);
    if (!badge) return res.status(404).json({ error: 'Badge non trouvé' });
    res.json({ message: 'Badge supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// PATCH /api/badges/:id/activation
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
// (autres routes CRUD ici...)

module.exports = router;