const express = require('express');
const router = express.Router();
const quizResultController = require('../controllers/quizResultController');

// POST /api/quiz-results - Sauvegarder un nouveau résultat
router.post('/', quizResultController.createResult);

// GET /api/quiz-results/leaderboard - Récupérer les données pour le classement
router.get('/leaderboard', quizResultController.getLeaderboardData);
// GET /api/quiz-results/:userId - Récupérer tous les résultats d'un utilisateur
router.get('/:userId', quizResultController.getUserResults);

// GET /api/quiz-results/:userId/stats - Récupérer les statistiques calculées
router.get('/:userId/stats', quizResultController.getUserStats);

// DELETE /api/quiz-results/:userId - Supprimer tous les résultats d'un utilisateur (pour les tests)
router.delete('/:userId', quizResultController.deleteUserResults);

module.exports = router;