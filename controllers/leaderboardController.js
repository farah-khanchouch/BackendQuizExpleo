const QuizResult = require('../models/QuizResult');
const User = require('../models/User');
const mongoose = require('mongoose');

// GET /api/leaderboard - Récupérer le classement général
exports.getLeaderboard = async (req, res) => {
  try {
    console.log('Chargement du classement général...');

    // CORRECTION : Agrégation avec jointure pour récupérer les données utilisateur
    const leaderboardData = await QuizResult.aggregate([
      {
        $group: {
          _id: '$userId', // ObjectId de l'utilisateur
          totalScore: { $sum: '$pointsEarned' },
          averageScore: { $avg: '$percentage' },
          completedQuizzes: { $sum: 1 },
          bestScore: { $max: '$percentage' },
          totalTimeSpent: { $sum: '$timeSpent' },
          lastActivity: { $max: '$completedAt' }
        }
      },
      {
        $lookup: {
          from: 'users', // Collection des utilisateurs
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $unwind: {
          path: '$userInfo',
          preserveNullAndEmptyArrays: true // Garde même si pas d'utilisateur trouvé
        }
      },
      {
        $sort: { 
          averageScore: -1, // Trier par moyenne d'abord
          totalScore: -1    // Puis par score total
        }
      },
      {
        $limit: 100
      },
      {
        $project: {
          _id: 1,
          totalScore: 1,
          averageScore: { $round: ['$averageScore', 2] },
          completedQuizzes: 1,
          bestScore: { $round: ['$bestScore', 2] },
          totalTimeSpent: 1,
          lastActivity: 1,
          userName: { $ifNull: ['$userInfo.username', 'Utilisateur inconnu'] },
          userCbu: { $ifNull: ['$userInfo.cbu', 'Département inconnu'] }
        }
      }
    ]);

    console.log(`${leaderboardData.length} utilisateurs trouvés dans le classement`);

    // Mapper les résultats avec le rang
    const enrichedLeaderboard = leaderboardData.map((userData, index) => ({
      rank: index + 1,
      userId: userData._id,
      userName: userData.userName,
      userCbu: userData.userCbu,
      totalScore: userData.totalScore,
      averageScore: userData.averageScore,
      completedQuizzes: userData.completedQuizzes,
      bestScore: userData.bestScore,
      totalTimeSpent: userData.totalTimeSpent,
      lastActivity: userData.lastActivity
    }));

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
          _id: '$userId', // ObjectId de l'utilisateur
          totalScore: { $sum: '$pointsEarned' },
          averageScore: { $avg: '$percentage' },
          completedQuizzes: { $sum: 1 },
          bestScore: { $max: '$percentage' },
          totalTimeSpent: { $sum: '$timeSpent' },
          lastActivity: { $max: '$completedAt' }
        }
      },
      {
        $lookup: {
          from: 'users', // Collection des utilisateurs
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $unwind: {
          path: '$userInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $sort: { 
          averageScore: -1,
          totalScore: -1
        }
      },
      {
        $limit: limit
      },
      {
        $project: {
          _id: 1,
          totalScore: 1,
          averageScore: { $round: ['$averageScore', 2] },
          completedQuizzes: 1,
          bestScore: { $round: ['$bestScore', 2] },
          totalTimeSpent: 1,
          lastActivity: 1,
          userName: { $ifNull: ['$userInfo.username', 'Utilisateur inconnu'] },
          userCbu: { $ifNull: ['$userInfo.cbu', 'Département inconnu'] }
        }
      }
    ]);

    // Mapper les résultats avec le rang
    const enrichedTopUsers = topUsers.map((userData, index) => ({
      rank: index + 1,
      userId: userData._id,
      userName: userData.userName,
      userCbu: userData.userCbu,
      totalScore: userData.totalScore,
      averageScore: userData.averageScore,
      completedQuizzes: userData.completedQuizzes,
      bestScore: userData.bestScore,
      totalTimeSpent: userData.totalTimeSpent,
      lastActivity: userData.lastActivity
    }));

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

    // Vérifier si c'est un ObjectId valide
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'ID utilisateur invalide' });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Calculer le classement complet avec jointure
    const allUsers = await QuizResult.aggregate([
      {
        $group: {
          _id: '$userId',
          totalScore: { $sum: '$pointsEarned' },
          averageScore: { $avg: '$percentage' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $unwind: {
          path: '$userInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $sort: { 
          averageScore: -1,
          totalScore: -1
        }
      },
      {
        $project: {
          _id: 1,
          totalScore: 1,
          averageScore: { $round: ['$averageScore', 2] },
          userName: { $ifNull: ['$userInfo.username', 'Utilisateur inconnu'] },
          userCbu: { $ifNull: ['$userInfo.cbu', 'Département inconnu'] }
        }
      }
    ]);

    // Trouver la position de l'utilisateur par ObjectId
    const userIndex = allUsers.findIndex(user => user._id.toString() === userObjectId.toString());
    
    if (userIndex === -1) {
      return res.status(404).json({ 
        error: 'Utilisateur non trouvé dans le classement',
        searchedUserId: userId
      });
    }

    const userStats = allUsers[userIndex];
    
    res.json({
      rank: userIndex + 1,
      totalUsers: allUsers.length,
      userStats: {
        userId: userStats._id,
        userName: userStats.userName,
        userCbu: userStats.userCbu,
        totalScore: userStats.totalScore,
        averageScore: userStats.averageScore
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
          totalUsers: { $addToSet: '$userId' }, // ObjectId uniques
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