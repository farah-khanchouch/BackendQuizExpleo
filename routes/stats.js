// routes/stats.js
const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

// GET /api/stats/users - Tous les utilisateurs avec vraies stats
router.get('/users', statsController.getAllUsersWithStats);

// GET /api/stats/user/:id - Stats d'un utilisateur spécifique  
router.get('/user/:id', statsController.getUserStats);

// POST /api/stats/sync/:id - Synchroniser les stats d'un utilisateur
router.post('/sync/:id', statsController.syncUserStats);

// POST /api/stats/sync-all - Synchroniser toutes les stats
router.post('/sync-all', statsController.syncAllStats);

module.exports = router;