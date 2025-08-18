const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const verifyToken = require('../middlewares/verifyToken'); // ✅ Import
const checkRole = require('../middlewares/checkRole');
const UserStats = require('../models/UserStats');
const questionController = require('../controllers/questionController');


router.post('/', verifyToken, checkRole('admin'), quizController.createQuiz);

router.get('/', quizController.getAllQuizzes);

router.get('/:id', quizController.getQuizById);
router.put('/:id', verifyToken, checkRole('admin'), quizController.updateQuiz);
router.delete('/:id', verifyToken, checkRole('admin'), quizController.deleteQuiz);
// Routes Questions liées à un quiz
router.post('/:quizId/questions', verifyToken, checkRole('admin'), questionController.createQuestion);
router.get('/:quizId/questions', verifyToken, questionController.getQuestionsByQuiz);
router.put('/questions/:id', verifyToken, checkRole('admin'), questionController.updateQuestion);
router.delete('/questions/:id', verifyToken, checkRole('admin'), questionController.deleteQuestion);
router.post('/quizzes/:id/duplicate', quizController.duplicateQuiz);

module.exports = router;


async function updateUserStats(userId, score, timeSpent) {
  let stats = await UserStats.findOne({ userId });
  if (!stats) {
    stats = new UserStats({ userId });
  }

  stats.quizCompleted += 1;
  stats.totalScore += score;
  stats.totalQuizTaken += 1;
  stats.totalTimeSpent += timeSpent;

  await stats.save();
}

router.post('/finish', verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { score, timeSpent } = req.body;

    if (typeof score !== 'number' || typeof timeSpent !== 'number') {
      return res.status(400).json({ error: 'Score ou temps invalide' });
    }

    await updateUserStats(userId, score, timeSpent);

    res.json({ message: 'Stats mises à jour avec succès ! ' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});
router.get('/stats', verifyToken, async (req, res) => {
    try {
      const userId = req.user._id;
      const stats = await UserStats.findOne({ userId });
  
      if (!stats) {
        return res.json({
          quizCompleted: 0,
          averageScore: 0,
          ranking: 0,
          totalTime: '0h 0m'
        });
      }
  
      // Calcul moyenne
      const averageScore = stats.totalQuizTaken === 0 ? 0 : Math.round(stats.totalScore / stats.totalQuizTaken);
  
      // Format temps total en h et min
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
  // quiz.routes.js ou quiz.controller.js
const multer = require('multer');
const path = require('path');

// Config stockage local (à adapter si tu veux S3 ou autre)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Dossier où stocker les images
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Route de création de quiz (exemple)
router.post('/api/quizzes', upload.single('image'), async (req, res) => {
  try {
    // Les champs texte sont dans req.body, l’image dans req.file
    const { title, description, ...otherFields } = req.body;
    let imageUrl = '';
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`; // URL d’accès public à l’image
    }
    // Créer le quiz en base avec imageUrl
    const quiz = new QuizModel({
      title,
      description,
      imageUrl,
      ...otherFields
    });
    await quiz.save();
    res.status(201).json(quiz);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la création du quiz.' });
  }
});

  
