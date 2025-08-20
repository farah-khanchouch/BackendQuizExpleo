const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboardController');

// GET /api/leaderboard - Récupérer le classement général complet
router.get('/', leaderboardController.getLeaderboard);

// GET /api/leaderboard/top/:limit - Récupérer le top N utilisateurs (par défaut 4)
router.get('/top/:limit', leaderboardController.getTopUsers);

// GET /api/leaderboard/user/:userId/rank - Récupérer le rang d'un utilisateur spécifique
router.get('/user/:userId/rank', leaderboardController.getUserRank);

// GET /api/leaderboard/stats - Récupérer les statistiques générales de la plateforme
router.get('/stats', leaderboardController.getGeneralStats);

module.exports = router;