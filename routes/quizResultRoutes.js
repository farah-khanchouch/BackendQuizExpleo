const express = require('express');
const router = express.Router();
const quizResultController = require('../controllers/quizResultController');
const verifyToken = require('../middlewares/verifyToken');  // Modification ici

// POST /api/quiz-results - Sauvegarder un nouveau résultat
router.post('/', verifyToken, quizResultController.createResult);

// GET /api/quiz-results/quiz/:quizId/status - Vérifier le statut d'un quiz
router.get('/quiz/:quizId/status', verifyToken, quizResultController.checkQuizCompletion);

// GET /api/quiz-results/leaderboard - Récupérer les données pour le classement
router.get('/leaderboard', verifyToken, quizResultController.getLeaderboardData);

// GET /api/quiz-results/:userId - Récupérer tous les résultats d'un utilisateur
router.get('/:userId', verifyToken, quizResultController.getUserResults);

// GET /api/quiz-results/:userId/stats - Récupérer les statistiques calculées
router.get('/:userId/stats', verifyToken, quizResultController.getUserStats);

// DELETE /api/quiz-results/:userId - Supprimer les résultats d'un utilisateur
router.delete('/:userId', verifyToken, quizResultController.deleteUserResults);

module.exports = router;