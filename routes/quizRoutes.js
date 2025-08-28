const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Imports des contrôleurs et middlewares
const quizController = require('../controllers/quizController');
const questionController = require('../controllers/questionController');
const quizResultController = require('../controllers/quizResultController');
const verifyToken = require('../middlewares/verifyToken');
const checkRole = require('../middlewares/checkRole');
const UserStats = require('../models/UserStats');

// Configuration multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// ================================
// ROUTES SPÉCIFIQUES EN PREMIER (TRÈS IMPORTANT!)
// ================================

// Routes avec chemins fixes - DOIVENT ÊTRE EN PREMIER
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const stats = await UserStats.findOne({ userId });

    if (!stats) {
      return res.json({
        quizCompleted: 0,
        averageScore: 0,
        ranking: 0,
        totalTime: '0h 0min'
      });
    }

    const averageScore = stats.quizCompleted === 0 ? 0 : Math.round(stats.totalScore / stats.quizCompleted);
    const hours = Math.floor(stats.totalTimeSpent / 3600);
    const minutes = Math.floor((stats.totalTimeSpent % 3600) / 60);
    const totalTimeFormatted = `${hours}h ${minutes}min`;

    res.json({
      quizCompleted: stats.quizCompleted,
      averageScore,
      ranking: stats.ranking,
      totalTime: totalTimeFormatted
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/finish', verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { score, timeSpent, totalQuestions, correctAnswers } = req.body;

    if (typeof score !== 'number' || typeof timeSpent !== 'number') {
      return res.status(400).json({ error: 'Score ou temps invalide' });
    }

    let stats = await UserStats.findOne({ userId });
    if (!stats) {
      stats = new UserStats({ userId });
    }

    stats.quizCompleted += 1;
    stats.totalScore += score;
    stats.totalQuestions += totalQuestions || 1;
    stats.correctAnswers += correctAnswers || 0;
    stats.totalTimeSpent += timeSpent;
    stats.averageScore = Math.round(stats.totalScore / stats.quizCompleted);

    await stats.save();

    res.json({ message: 'Stats mises à jour avec succès!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes quiz-results (chemins fixes)
router.post('/quiz-results', verifyToken, quizResultController.createResult);
router.get('/quiz-results/:userId', verifyToken, quizResultController.getUserResults);

// ================================
// ROUTES PRINCIPALES QUIZ
// ================================

// Créer un quiz
router.post('/', verifyToken, checkRole('admin'), upload.single('image'), quizController.createQuiz);

// Récupérer tous les quiz
router.get('/', quizController.getAllQuizzes);

// ================================
// ROUTES AVEC PARAMÈTRES DYNAMIQUES (:quizId)
// Ces routes DOIVENT venir AVANT les routes /:id
// ================================

// ✅ Route de completion status - MAINTENANT EN BON ORDRE
router.get('/:quizId/completion-status', verifyToken, quizController.getQuizCompletionStatus);

// Soumettre un résultat de quiz
router.post('/:quizId/submit', verifyToken, quizController.submitQuizResult);

// Routes questions liées à un quiz
router.post('/:quizId/questions', verifyToken, checkRole('admin'), questionController.createQuestion);
router.get('/:quizId/questions', verifyToken, questionController.getQuestionsByQuiz);
// Juste après vos autres routes :quizId
// ================================
// ROUTES AVEC /:id (EN DERNIER!)
// ================================

// ⚠️ Ces routes doivent être EN DERNIER car /:id capture tout
router.get('/:id', quizController.getQuizById);
router.put('/:id', verifyToken, checkRole('admin'), upload.single('image'), quizController.updateQuiz);
router.delete('/:id', verifyToken, checkRole('admin'), quizController.deleteQuiz);
router.post('/:id/duplicate', verifyToken, checkRole('admin'), quizController.duplicateQuiz);

// ================================
// ROUTES QUESTIONS AVEC ID SPÉCIFIQUE
// ================================

router.put('/questions/:id', verifyToken, checkRole('admin'), questionController.updateQuestion);
router.delete('/questions/:id', verifyToken, checkRole('admin'), questionController.deleteQuestion);

module.exports = router;