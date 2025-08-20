const QuizResult = require('../models/QuizResult');
const User = require('../models/User'); // Assurez-vous d'avoir ce modèle

// POST /api/quiz-results - Sauvegarder un nouveau résultat
exports.createResult = async (req, res) => {
  try {
    console.log('Données reçues:', req.body);

    const {
      userId,
      quizId,
      quizTitle,
      theme,
      score,
      totalQuestions,
      correctAnswers,
      percentage,
      timeSpent,
      pointsEarned,
      attempts
    } = req.body;

    // Validation des données obligatoires
    if (!userId || !quizId || score === undefined || !totalQuestions || correctAnswers === undefined) {
      return res.status(400).json({
        error: 'Données manquantes',
        required: ['userId', 'quizId', 'score', 'totalQuestions', 'correctAnswers']
      });
    }

    // Créer le nouveau résultat
    const quizResult = new QuizResult({
      userId,
      quizId,
      quizTitle: quizTitle || 'Quiz sans titre',
      theme: theme || 'general',
      score,
      totalQuestions,
      correctAnswers,
      percentage: percentage || Math.round((correctAnswers / totalQuestions) * 100),
      timeSpent: timeSpent || 0,
      pointsEarned: pointsEarned || score,
      attempts: attempts || 1
    });

    const savedResult = await quizResult.save();
    console.log('Résultat sauvegardé:', savedResult);

    res.status(201).json(savedResult);
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du résultat:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors de la sauvegarde',
      details: error.message 
    });
  }
};

// GET /api/quiz-results/:userId - Récupérer tous les résultats d'un utilisateur
exports.getUserResults = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('Chargement des résultats pour userId:', userId);

    // Récupérer tous les résultats de l'utilisateur, triés par date
    const results = await QuizResult.find({ userId })
      .sort({ completedAt: -1 }) // Plus récents en premier
      .lean(); // Optimisation performance

    console.log(`${results.length} résultats trouvés pour l'utilisateur ${userId}`);
    res.json(results);
  } catch (error) {
    console.error('Erreur lors du chargement des résultats:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors du chargement',
      details: error.message 
    });
  }
};

// GET /api/quiz-results/:userId/stats - Récupérer les statistiques calculées
exports.getUserStats = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const results = await QuizResult.find({ userId }).lean();
    
    if (results.length === 0) {
      return res.json({
        totalQuizzes: 0,
        averageScore: 0,
        bestScore: 0,
        totalTimeSpent: 0,
        totalPoints: 0
      });
    }

    // Calculer les statistiques
    const stats = {
      totalQuizzes: results.length,
      averageScore: Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / results.length),
      bestScore: Math.max(...results.map(r => r.percentage)),
      totalTimeSpent: results.reduce((sum, r) => sum + r.timeSpent, 0),
      totalPoints: results.reduce((sum, r) => sum + r.pointsEarned, 0),
      recentResults: results.slice(0, 10) // 10 plus récents
    };

    res.json(stats);
  } catch (error) {
    console.error('Erreur lors du calcul des statistiques:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// DELETE /api/quiz-results/:userId - Supprimer tous les résultats d'un utilisateur (pour les tests)
exports.deleteUserResults = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await QuizResult.deleteMany({ userId });
    
    console.log(`${result.deletedCount} résultats supprimés pour l'utilisateur ${userId}`);
    res.json({ 
      message: 'Résultats supprimés avec succès',
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// NOUVELLE ROUTE - GET /api/quiz-results/leaderboard - Pour le classement (compatibilité frontend)
exports.getLeaderboardData = async (req, res) => {
  try {
    console.log('Chargement des données de classement...');

    // Récupérer tous les résultats avec les informations utilisateur
    const results = await QuizResult.find({})
      .sort({ pointsEarned: -1 })
      .lean();

    // Enrichir avec les données utilisateur
    const enrichedResults = await Promise.all(
      results.map(async (result) => {
        try {
          const user = await User.findOne({ 
            $or: [
              { _id: result.userId },
              { cbu: result.userId }
            ]
          }).lean();

          return {
            userId: result.userId,
            userName: user ? user.username : 'Utilisateur inconnu',
            userCbu: user ? user.cbu : result.userId,
            score: result.pointsEarned,
            completedAt: result.completedAt,
            quizId: result.quizId
          };
        } catch (error) {
          console.error('Erreur lors de l\'enrichissement:', error);
          return {
            userId: result.userId,
            userName: 'Utilisateur inconnu',
            userCbu: result.userId,
            score: result.pointsEarned,
            completedAt: result.completedAt,
            quizId: result.quizId
          };
        }
      })
    );

    console.log(`${enrichedResults.length} résultats de classement chargés`);
    res.json(enrichedResults);
  } catch (error) {
    console.error('Erreur lors du chargement des données de classement:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors du chargement des données de classement',
      details: error.message 
    });
  }
};