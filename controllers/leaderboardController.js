const QuizResult = require('../models/QuizResult');
const User = require('../models/User');
const mongoose = require('mongoose');

// GET /api/leaderboard - Récupérer le classement général
exports.getLeaderboard = async (req, res) => {
  try {
    console.log('Chargement du classement général...');

    // Agrégation pour calculer les scores totaux par utilisateur
    const leaderboardData = await QuizResult.aggregate([
      {
        $group: {
          _id: '$userId', // CBU du département
          totalScore: { $sum: '$pointsEarned' },
          averageScore: { $avg: '$percentage' },
          completedQuizzes: { $sum: 1 },
          bestScore: { $max: '$percentage' },
          totalTimeSpent: { $sum: '$timeSpent' },
          lastActivity: { $max: '$completedAt' }
        }
      },
      {
        $sort: { 
          averageScore: -1, // CHANGÉ: Trier par moyenne d'abord
          totalScore: -1    // Puis par score total
        }
      },
      {
        $limit: 100
      }
    ]);

    console.log(`${leaderboardData.length} utilisateurs trouvés dans le classement`);

    // Enrichir avec les données utilisateur
    const enrichedLeaderboard = await Promise.all(
      leaderboardData.map(async (userData, index) => {
        try {
          // CORRECTION: Chercher uniquement par CBU puisque userData._id est un CBU
          const user = await User.findOne({ cbu: userData._id }).lean();

          return {
            rank: index + 1,
            userId: user ? user._id : userData._id, // ObjectId si trouvé, sinon CBU
            userName: user ? user.username : 'Utilisateur inconnu',
            userCbu: userData._id, // Le CBU du département
            totalScore: userData.totalScore,
            averageScore: Math.round(userData.averageScore * 100) / 100,
            completedQuizzes: userData.completedQuizzes,
            bestScore: Math.round(userData.bestScore * 100) / 100,
            totalTimeSpent: userData.totalTimeSpent,
            lastActivity: userData.lastActivity
          };
        } catch (error) {
          console.error(`Erreur lors de l'enrichissement pour l'utilisateur ${userData._id}:`, error);
          return {
            rank: index + 1,
            userId: userData._id, // CBU
            userName: 'Utilisateur inconnu',
            userCbu: userData._id,
            totalScore: userData.totalScore,
            averageScore: Math.round(userData.averageScore * 100) / 100,
            completedQuizzes: userData.completedQuizzes,
            bestScore: Math.round(userData.bestScore * 100) / 100,
            totalTimeSpent: userData.totalTimeSpent,
            lastActivity: userData.lastActivity
          };
        }
      })
    );

    res.json(enrichedLeaderboard);
  } catch (error) {
    console.error('Erreur lors du chargement du classement:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors du chargement du classement',
      details: error.message 
    });
  }
};

// GET /api/leaderboard/top/:limit - Récupérer le top N utilisateurs
exports.getTopUsers = async (req, res) => {
  try {
    const limit = parseInt(req.params.limit) || 4;
    console.log(`Chargement du top ${limit} utilisateurs...`);

    const topUsers = await QuizResult.aggregate([
      {
        $group: {
          _id: '$userId', // CBU
          totalScore: { $sum: '$pointsEarned' },
          averageScore: { $avg: '$percentage' },
          completedQuizzes: { $sum: 1 },
          bestScore: { $max: '$percentage' },
          totalTimeSpent: { $sum: '$timeSpent' },
          lastActivity: { $max: '$completedAt' }
        }
      },
      {
        $sort: { 
          averageScore: -1, // CHANGÉ: Classement par moyenne
          totalScore: -1
        }
      },
      {
        $limit: limit
      }
    ]);

    // Enrichir avec les données utilisateur
    const enrichedTopUsers = await Promise.all(
      topUsers.map(async (userData, index) => {
        try {
          // CORRECTION: Chercher uniquement par CBU
          const user = await User.findOne({ cbu: userData._id }).lean();

          return {
            rank: index + 1,
            userId: user ? user._id : userData._id, // ObjectId MongoDB si trouvé
            userName: user ? user.username : 'Utilisateur inconnu',
            userCbu: userData._id, // CBU du département
            totalScore: userData.totalScore,
            averageScore: Math.round(userData.averageScore * 100) / 100,
            completedQuizzes: userData.completedQuizzes,
            bestScore: Math.round(userData.bestScore * 100) / 100,
            totalTimeSpent: userData.totalTimeSpent,
            lastActivity: userData.lastActivity
          };
        } catch (error) {
          console.error(`Erreur lors de l'enrichissement:`, error);
          return {
            rank: index + 1,
            userId: userData._id, // CBU
            userName: 'Utilisateur inconnu',
            userCbu: userData._id,
            totalScore: userData.totalScore,
            averageScore: Math.round(userData.averageScore * 100) / 100,
            completedQuizzes: userData.completedQuizzes,
            bestScore: Math.round(userData.bestScore * 100) / 100,
            totalTimeSpent: userData.totalTimeSpent,
            lastActivity: userData.lastActivity
          };
        }
      })
    );

    console.log(`Top ${limit} utilisateurs chargés avec succès`);
    res.json(enrichedTopUsers);
  } catch (error) {
    console.error('Erreur lors du chargement du top utilisateurs:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors du chargement du top utilisateurs',
      details: error.message 
    });
  }
};

// GET /api/leaderboard/user/:userId/rank - Récupérer le rang d'un utilisateur
exports.getUserRank = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`Calcul du rang pour l'utilisateur: ${userId}`);

    // CORRECTION: Déterminer si c'est un ObjectId ou un CBU
    let userCbu = userId;
    
    if (mongoose.Types.ObjectId.isValid(userId)) {
      // Si c'est un ObjectId, trouver le CBU correspondant
      const user = await User.findById(userId);
      if (user) {
        userCbu = user.cbu;
      } else {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }
    }

    // Calculer le classement complet
    const allUsers = await QuizResult.aggregate([
      {
        $group: {
          _id: '$userId', // CBU
          totalScore: { $sum: '$pointsEarned' },
          averageScore: { $avg: '$percentage' }
        }
      },
      {
        $sort: { 
          averageScore: -1, // Classement par moyenne
          totalScore: -1
        }
      }
    ]);

    // Trouver la position de l'utilisateur par CBU
    const userIndex = allUsers.findIndex(user => user._id === userCbu);
    
    if (userIndex === -1) {
      return res.status(404).json({ 
        error: 'Utilisateur non trouvé dans le classement',
        searchedCbu: userCbu
      });
    }

    const userStats = allUsers[userIndex];
    
    res.json({
      rank: userIndex + 1,
      totalUsers: allUsers.length,
      userStats: {
        userId: userStats._id, // CBU
        totalScore: userStats.totalScore,
        averageScore: Math.round(userStats.averageScore * 100) / 100
      }
    });
  } catch (error) {
    console.error('Erreur lors du calcul du rang:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors du calcul du rang',
      details: error.message 
    });
  }
};

// GET /api/leaderboard/stats - Récupérer les statistiques générales
exports.getGeneralStats = async (req, res) => {
  try {
    console.log('Calcul des statistiques générales...');

    const stats = await QuizResult.aggregate([
      {
        $group: {
          _id: null,
          totalQuizzes: { $sum: 1 },
          totalUsers: { $addToSet: '$userId' }, // CBU uniques
          averageScore: { $avg: '$percentage' },
          bestScore: { $max: '$percentage' },
          totalPointsDistributed: { $sum: '$pointsEarned' },
          totalTimeSpent: { $sum: '$timeSpent' }
        }
      },
      {
        $project: {
          _id: 0,
          totalQuizzes: 1,
          totalUsers: { $size: '$totalUsers' },
          averageScore: { $round: ['$averageScore', 2] },
          bestScore: { $round: ['$bestScore', 2] },
          totalPointsDistributed: 1,
          totalTimeSpent: 1
        }
      }
    ]);

    const result = stats.length > 0 ? stats[0] : {
      totalQuizzes: 0,
      totalUsers: 0,
      averageScore: 0,
      bestScore: 0,
      totalPointsDistributed: 0,
      totalTimeSpent: 0
    };

    console.log('Statistiques générales calculées:', result);
    res.json(result);
  } catch (error) {
    console.error('Erreur lors du calcul des statistiques générales:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors du calcul des statistiques',
      details: error.message 
    });
  }
};