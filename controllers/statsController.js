// controllers/statsController.js
const User = require('../models/User');
const UserStats = require('../models/UserStats');
const QuizResult = require('../models/QuizResult');
const Quiz = require('../models/Quiz');

// Calculer et retourner les vraies statistiques d'un utilisateur
exports.calculateUserStats = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('Utilisateur non trouvé');
    
    // Quiz disponibles pour ce CBU
    const activeQuizzes = await Quiz.find({ status: 'active' });
    const userQuizzes = activeQuizzes.filter(quiz => 
      quiz.cbus && quiz.cbus.includes(user.cbu)
    );
    
    // Résultats réels de l'utilisateur
    const quizResults = await QuizResult.find({ userId: userId });
    
    const stats = {
      totalQuizzes: userQuizzes.length,
      completedQuizzes: quizResults.length,
      averageScore: 0,
      bestScore: 0,
      totalTimeSpent: 0,
      totalCorrectAnswers: 0,
      totalQuestions: 0,
      badges: 0,
      completionRate: 0
    };
    
    if (quizResults.length > 0) {
      // Calculs basés sur les vrais résultats
      const totalPercentage = quizResults.reduce((sum, r) => sum + (r.percentage || 0), 0);
      stats.averageScore = Math.round(totalPercentage / quizResults.length);
      stats.bestScore = Math.max(...quizResults.map(r => r.percentage || 0));
      stats.totalTimeSpent = quizResults.reduce((sum, r) => sum + (r.timeSpent || 0), 0);
      stats.totalCorrectAnswers = quizResults.reduce((sum, r) => sum + (r.correctAnswers || 0), 0);
      stats.totalQuestions = quizResults.reduce((sum, r) => sum + (r.totalQuestions || 0), 0);
      stats.badges = Math.floor(stats.averageScore / 10);
    }
    
    stats.completionRate = stats.totalQuizzes > 0 
      ? Math.round((stats.completedQuizzes / stats.totalQuizzes) * 100) 
      : 0;
    
    return stats;
  } catch (error) {
    console.error('Erreur calcul stats:', error);
    throw error;
  }
};

// GET /api/stats/users - Tous les utilisateurs avec vraies stats
exports.getAllUsersWithStats = async (req, res) => {
  try {
    console.log('Récupération utilisateurs avec statistiques réelles');
    
    const collaborators = await User.find({ role: 'collaborator' }).sort({ createdAt: -1 });
    
    const usersWithStats = await Promise.all(
      collaborators.map(async (user) => {
        const stats = await exports.calculateUserStats(user._id);
        const quizResults = await QuizResult.find({ userId: user._id }).sort({ completedAt: -1 }).limit(1);
        
        return {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          cbu: user.cbu || 'Non défini',
          totalPoints: quizResults.reduce((sum, r) => sum + (r.pointsEarned || r.score || 0), 0),
          joinedAt: user.createdAt ? user.createdAt.toISOString() : new Date().toISOString(),
          
          // Statistiques calculées
          ...stats,
          
          status: user.status || 'active',
          lastActivity: quizResults.length > 0 
            ? quizResults[0].completedAt 
            : (user.updatedAt ? user.updatedAt.toISOString() : new Date().toISOString())
        };
      })
    );
    
    res.json(usersWithStats);
    
  } catch (error) {
    console.error('Erreur récupération utilisateurs avec stats:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/stats/user/:id - Stats d'un utilisateur spécifique
exports.getUserStats = async (req, res) => {
  try {
    const stats = await exports.calculateUserStats(req.params.id);
    res.json(stats);
  } catch (error) {
    console.error('Erreur récupération stats utilisateur:', error);
    res.status(500).json({ error: error.message });
  }
};

// POST /api/stats/sync/:id - Synchroniser les stats d'un utilisateur
exports.syncUserStats = async (req, res) => {
  try {
    const userId = req.params.id;
    const stats = await exports.calculateUserStats(userId);
    
    // Mettre à jour UserStats avec les vraies valeurs
    await UserStats.findOneAndUpdate(
      { userId: userId },
      {
        quizCompleted: stats.completedQuizzes,
        totalScore: stats.totalCorrectAnswers, // ou calculer différemment
        totalQuestions: stats.totalQuestions,
        correctAnswers: stats.totalCorrectAnswers,
        totalTimeSpent: stats.totalTimeSpent,
        averageScore: stats.averageScore,
        updatedAt: new Date()
      },
      { upsert: true }
    );
    
    res.json({ 
      message: 'Statistiques synchronisées avec succès',
      stats 
    });
    
  } catch (error) {
    console.error('Erreur synchronisation stats:', error);
    res.status(500).json({ error: error.message });
  }
};

// POST /api/stats/sync-all - Synchroniser toutes les stats
exports.syncAllStats = async (req, res) => {
  try {
    const collaborators = await User.find({ role: 'collaborator' });
    let syncCount = 0;
    
    for (const user of collaborators) {
      try {
        await exports.syncUserStats({ params: { id: user._id } }, { json: () => {} });
        syncCount++;
      } catch (error) {
        console.error(`Erreur sync pour ${user.username}:`, error);
      }
    }
    
    res.json({ 
      message: `${syncCount}/${collaborators.length} utilisateurs synchronisés`
    });
    
  } catch (error) {
    console.error('Erreur synchronisation globale:', error);
    res.status(500).json({ error: error.message });
  }
};