// 1. DÉCOMMENTEZ le fichier controllers/dashboardController.js
const QuizResult = require('../models/QuizResult');
const User = require('../models/User');
const Quiz = require('../models/Quiz'); // AJOUT IMPORTANT
const mongoose = require('mongoose');


const dashboardController = {
  // Statistiques utilisateur
  async getUserStats(req, res) {
    try {
      const userId = req.user._id;
      const userResults = await QuizResult.find({ userId });

      if (!userResults || userResults.length === 0) {
        return res.json(this.getDefaultStats());
      }

      const quizCompleted = userResults.length;
      const averageScore = Math.round(
        userResults.reduce((sum, r) => sum + r.percentage, 0) / userResults.length
      );
      const totalMinutes = userResults.reduce((sum, r) => sum + (r.timeSpent || 0), 0);
      const totalTime = this.formatTime(totalMinutes);
      const ranking = await this.calculateUserRanking(userId, averageScore);

      res.json({ quizCompleted, averageScore, totalTime, ranking });
    } catch (error) {
      console.error('Erreur getUserStats:', error);
      res.status(500).json(this.getDefaultStats());
    }
  },

  // Dashboard complet - AMÉLIORÉ
  async getDashboardData(req, res) {
    try {
      const userId = req.user._id;
      const user = req.user;
      
      // Récupérer toutes les données nécessaires
      const stats = await this.getUserStatsInternal(userId, user.cbu);
      const weeklyProgress = await this.getWeeklyProgress(userId);
      const monthlyTrends = await this.getMonthlyTrends(userId);
      const recommendations = await this.getPersonalizedRecommendationsInternal(userId, user.cbu);
      const recentActivities = await this.getRecentActivities(userId);
      const achievements = await this.getUserAchievements(userId);
      const learningPath = await this.getLearningPath(userId, user.cbu);
      
      // MODIFICATION: Utiliser la nouvelle méthode qui filtre par CBU
      const topPerformers = await this.getTopPerformersByCbu(user.cbu, userId);
  
      const dashboardData = {
        stats,
        recentActivities,
        recommendedQuizzes: recommendations.suggestedQuizzes,
        learningPath,
        topPerformers, // Maintenant filtré par CBU
        achievements,
        quickActions: this.getQuickActions(),
        quizzesThisWeek: weeklyProgress.quizzesCompleted,
        scoreEvolution: weeklyProgress.scoreImprovement,
        rankingTrend: monthlyTrends.rankingChange,
        timeSpentThisWeek: weeklyProgress.timeSpent
      };
  
      res.json(dashboardData);
    } catch (error) {
      console.error('Erreur getDashboardData:', error);
      res.status(500).json(this.getDefaultDashboardData());
    }
  },
  // NOUVELLE MÉTHODE : Activités récentes
  async getRecentActivities(userId) {
    try {
      const recentResults = await QuizResult.find({ userId })
        .populate('quizId', 'title theme')
        .sort({ completedAt: -1 })
        .limit(6);

      return recentResults.map(result => {
        const type = result.percentage >= 80 ? 'success' : 
                     result.percentage >= 60 ? 'info' : 'warning';
        
        return {
          type,
          title: this.getActivityTitle(result.percentage),
          description: `${result.quizId?.title || 'Quiz'} - Score: ${result.percentage}%`,
          time: this.getTimeAgo(result.completedAt)
        };
      });
    } catch (error) {
      console.error('Erreur getRecentActivities:', error);
      return [];
    }
  },

  // NOUVELLE MÉTHODE : Parcours d'apprentissage
  async getLearningPath(userId, userCbu) {
    try {
      if (!userCbu) return [];

      // Récupérer les quiz disponibles pour ce CBU
      const availableQuizzes = await Quiz.find({ 
        status: 'active',
        cbus: { $in: [userCbu] }
      });

      // Grouper par thème
      const themeGroups = {};
      availableQuizzes.forEach(quiz => {
        if (!themeGroups[quiz.theme]) {
          themeGroups[quiz.theme] = [];
        }
        themeGroups[quiz.theme].push(quiz);
      });

      // Récupérer les résultats de l'utilisateur
      const userResults = await QuizResult.find({ userId }).populate('quizId');
      const completedQuizIds = userResults.map(r => r.quizId?._id?.toString()).filter(Boolean);

      // Créer le parcours d'apprentissage
      const learningPath = [];
      let stepNumber = 1;

      Object.entries(themeGroups).forEach(([theme, quizzes]) => {
        const completedInTheme = quizzes.filter(q => 
          completedQuizIds.includes(q._id.toString())
        ).length;
        
        let status = 'locked';
        let statusText = 'Verrouillé';
        
        if (completedInTheme === quizzes.length && quizzes.length > 0) {
          status = 'completed';
          statusText = 'Terminé';
        } else if (completedInTheme > 0 || stepNumber === 1) {
          status = 'current';
          statusText = `${completedInTheme}/${quizzes.length} terminés`;
        }

        learningPath.push({
          step: stepNumber++,
          title: this.getThemeDisplayName(theme),
          description: `Maîtrisez les concepts de ${theme.toLowerCase()}`,
          status,
          statusText
        });
      });

      return learningPath.slice(0, 4); // Limiter à 4 étapes
    } catch (error) {
      console.error('Erreur getLearningPath:', error);
      return [];
    }
  },

// MÉTHODE CORRIGÉE : Top performers par CBU
// Méthode getTopPerformersByCbu utilisant la MÊME logique que le leaderboard

async getTopPerformersByCbu(userCbu, currentUserId) {
  try {
    console.log('🔍 === DÉBUT getTopPerformersByCbu (Logique Leaderboard) ===');
    console.log('📊 CBU recherché:', `"${userCbu}"`);
    console.log('👤 Utilisateur actuel:', currentUserId?.toString());
    
    if (!userCbu || !currentUserId) {
      console.log('❌ CBU ou utilisateur manquant');
      return [];
    }

    // MÊME LOGIQUE que leaderboard avec filtre CBU ajouté
    const topUsersData = await QuizResult.aggregate([
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
      // ✅ FILTRE CBU - La seule différence avec le leaderboard
      {
        $match: {
          'userInfo.cbu': userCbu // Filtrer par CBU exact
        }
      },
      {
        $sort: { 
          averageScore: -1, // Trier par moyenne d'abord
          totalScore: -1    // Puis par score total
        }
      },
      {
        $limit: 10 // Top 10 du CBU
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
          userFullName: { $ifNull: ['$userInfo.fullname', '$userInfo.username'] },
          userCbu: { $ifNull: ['$userInfo.cbu', 'Département inconnu'] },
          userAvatar: { $ifNull: ['$userInfo.avatar', '/assets/avatars/default.jpg'] }
        }
      }
    ]);

    console.log(`📈 ${topUsersData.length} utilisateurs trouvés dans le CBU "${userCbu}"`);

    if (topUsersData.length === 0) {
      console.log('❌ Aucun résultat trouvé pour ce CBU');
      return [];
    }

    // Mapper les résultats avec le rang (MÊME format que leaderboard)
    const result = topUsersData.map((userData, index) => {
      // Déterminer le rang avec emoji
      let rank;
      if (index === 0) rank = '🥇';
      else if (index === 1) rank = '🥈';
      else if (index === 2) rank = '🥉';
      else rank = `#${index + 1}`;

      // Nom d'affichage
      const displayName = userData.userFullName || userData.userName || 'Utilisateur Anonyme';
      
      // Vérifier si c'est l'utilisateur actuel
      const isCurrentUser = userData._id.toString() === currentUserId.toString();
      
      console.log(`🏆 ${rank} ${displayName} - ${userData.averageScore}% (${userData.completedQuizzes} quiz) ${isCurrentUser ? '👤 VOUS' : ''}`);

      return {
        rank,
        name: displayName,
        points: `${userData.averageScore}%`,
        avatar: userData.userAvatar,
        current: isCurrentUser,
        avgScore: userData.averageScore,
        totalQuizzes: userData.completedQuizzes,
        bestScore: userData.bestScore,
        totalScore: userData.totalScore,
        userId: userData._id.toString(),
        cbu: userData.userCbu
      };
    });

    console.log('✅ Top performers du CBU formatés:', result.length);
    console.log('=== FIN getTopPerformersByCbu ===\n');
    
    return result;

  } catch (error) {
    console.error('❌ ERREUR dans getTopPerformersByCbu:', error.message);
    console.error('📋 Stack trace:', error.stack);
    return [];
  }
},

// BONUS: Version debug utilisant la même logique
async debugCbuLeaderboard(req, res) {
  try {
    const userCbu = req.user.cbu;
    const currentUserId = req.user._id;
    
    console.log('\n=== DEBUG CBU AVEC LOGIQUE LEADERBOARD ===');
    console.log('🏢 CBU utilisateur:', `"${userCbu}"`);
    
    // Test 1: Tous les CBU dans la DB
    const allCbus = await User.distinct('cbu');
    console.log('📋 Tous les CBU:', allCbus.map(cbu => `"${cbu}"`));
    
    // Test 2: Utiliser la MÊME requête que le leaderboard général
    const generalLeaderboard = await QuizResult.aggregate([
      {
        $group: {
          _id: '$userId',
          averageScore: { $avg: '$percentage' },
          completedQuizzes: { $sum: 1 }
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
        $project: {
          _id: 1,
          averageScore: { $round: ['$averageScore', 2] },
          completedQuizzes: 1,
          userName: { $ifNull: ['$userInfo.username', 'Inconnu'] },
          userCbu: { $ifNull: ['$userInfo.cbu', 'Aucun CBU'] }
        }
      }
    ]);
    
    console.log('📊 Tous les utilisateurs avec scores:');
    generalLeaderboard.forEach(user => {
      console.log(`  - ${user.userName} (CBU: "${user.userCbu}") - ${user.averageScore}%`);
    });
    
    // Test 3: Filtrer pour le CBU spécifique
    const sameCbuUsers = generalLeaderboard.filter(user => user.userCbu === userCbu);
    console.log(`\n🎯 Utilisateurs du CBU "${userCbu}":`, sameCbuUsers.length);
    sameCbuUsers.forEach(user => {
      const isCurrent = user._id.toString() === currentUserId.toString();
      console.log(`  - ${user.userName} - ${user.averageScore}% ${isCurrent ? '👤 VOUS' : ''}`);
    });
    
    res.json({
      userCbu,
      totalUsers: generalLeaderboard.length,
      sameCbuUsers: sameCbuUsers.length,
      allCbus,
      sameCbuDetails: sameCbuUsers.map(u => ({
        name: u.userName,
        cbu: u.userCbu,
        avgScore: u.averageScore,
        quizzes: u.completedQuizzes,
        current: u._id.toString() === currentUserId.toString()
      }))
    });
    
  } catch (error) {
    console.error('Erreur debug CBU leaderboard:', error);
    res.status(500).json({ error: error.message });
  }
},
// MÉTHODE DE DÉBOGAGE à ajouter temporairement dans dashboardController
async debugCbuData(req, res) {
  try {
    const userCbu = req.user.cbu;
    const currentUserId = req.user._id;
    
    console.log('=== DÉBUT DEBUG CBU ===');
    console.log('🏢 CBU recherché:', userCbu);
    console.log('👤 Utilisateur actuel:', currentUserId);
    
    // 1. Vérifier tous les utilisateurs
    const allUsers = await User.find({}).select('_id username fullname cbu');
    console.log('👥 TOUS les utilisateurs dans la DB:');
    allUsers.forEach(user => {
      console.log(`  - ID: ${user._id}, Username: ${user.username}, CBU: "${user.cbu}"`);
    });
    
    // 2. Vérifier les utilisateurs du même CBU
    const samesCbuUsers = await User.find({ 
      cbu: { $regex: new RegExp(userCbu, 'i') }
    }).select('_id username fullname cbu');
    
    console.log('🎯 Utilisateurs avec le même CBU:');
    samesCbuUsers.forEach(user => {
      console.log(`  - ID: ${user._id}, Username: ${user.username}, CBU: "${user.cbu}"`);
    });
    
    // 3. Vérifier tous les résultats de quiz
    const allResults = await QuizResult.find({}).populate('userId', 'username fullname cbu');
    console.log('📊 TOUS les résultats de quiz:');
    allResults.forEach(result => {
      console.log(`  - User: ${result.userId?.username}, CBU: "${result.userId?.cbu}", Score: ${result.percentage}%`);
    });
    
    // 4. Vérifier les résultats pour les utilisateurs du CBU
    const userIds = samesCbuUsers.map(u => u._id);
    const cbuResults = await QuizResult.find({ 
      userId: { $in: userIds } 
    }).populate('userId', 'username fullname cbu');
    
    console.log('🎯 Résultats pour les utilisateurs du CBU:');
    cbuResults.forEach(result => {
      console.log(`  - User: ${result.userId?.username}, Score: ${result.percentage}%, Date: ${result.completedAt}`);
    });
    
    // 5. Agrégation des scores
    const aggregation = await QuizResult.aggregate([
      { $match: { userId: { $in: userIds } } },
      {
        $group: {
          _id: '$userId',
          avgScore: { $avg: '$percentage' },
          totalQuizzes: { $sum: 1 },
          scores: { $push: '$percentage' }
        }
      },
      { $sort: { avgScore: -1 } }
    ]);
    
    console.log('📈 Agrégation des performances:');
    for (const agg of aggregation) {
      const user = samesCbuUsers.find(u => u._id.toString() === agg._id.toString());
      console.log(`  - ${user?.username}: Moyenne ${Math.round(agg.avgScore)}%, ${agg.totalQuizzes} quiz, Scores: [${agg.scores.join(', ')}]`);
    }
    
    console.log('=== FIN DEBUG CBU ===');
    
    res.json({
      userCbu,
      totalUsers: allUsers.length,
      sameCbuUsers: samesCbuUsers.length,
      totalResults: allResults.length,
      cbuResults: cbuResults.length,
      aggregation: aggregation.length
    });
    
  } catch (error) {
    console.error('Erreur debug CBU:', error);
    res.status(500).json({ error: error.message });
  }
},
  // NOUVELLE MÉTHODE : Achievements utilisateur
  async getUserAchievements(userId) {
    try {
      const userResults = await QuizResult.find({ userId });
      const totalQuizzes = userResults.length;
      const averageScore = totalQuizzes ? 
        userResults.reduce((sum, r) => sum + r.percentage, 0) / totalQuizzes : 0;
      const perfectScores = userResults.filter(r => r.percentage === 100).length;

      return [
        {
          icon: '🏆',
          title: 'Premier Quiz',
          description: 'Terminer votre premier quiz',
          earned: totalQuizzes >= 1,
          date: totalQuizzes >= 1 ? 'Obtenu' : undefined,
          progress: totalQuizzes >= 1 ? undefined : '0/1'
        },
        {
          icon: '🌟',
          title: 'Score Parfait',
          description: 'Obtenir 100% à un quiz',
          earned: perfectScores >= 1,
          date: perfectScores >= 1 ? 'Obtenu' : undefined,
          progress: perfectScores >= 1 ? undefined : `${perfectScores}/1`
        },
        {
          icon: '📚',
          title: 'Apprenant Assidu',
          description: 'Terminer 10 quiz',
          earned: totalQuizzes >= 10,
          date: totalQuizzes >= 10 ? 'Obtenu' : undefined,
          progress: totalQuizzes >= 10 ? undefined : `${totalQuizzes}/10`
        },
        {
          icon: '⚡',
          title: 'Expert',
          description: 'Moyenne supérieure à 85%',
          earned: averageScore >= 85,
          date: averageScore >= 85 ? 'Obtenu' : undefined,
          progress: averageScore >= 85 ? undefined : `${Math.round(averageScore)}/85%`
        }
      ];
    } catch (error) {
      console.error('Erreur getUserAchievements:', error);
      return [];
    }
  },

  // Recommandations personnalisées - AMÉLIORÉE
  async getPersonalizedRecommendationsInternal(userId, userCbu) {
    try {
      if (!userCbu) return { suggestedQuizzes: [], weakAreas: [], strengthAreas: [] };

      const completedQuizIds = await QuizResult.find({ userId }).distinct('quizId');
      
      // Récupérer les quiz disponibles non terminés
      const availableQuizzes = await Quiz.find({
        status: 'active',
        cbus: { $in: [userCbu] },
        _id: { $nin: completedQuizIds }
      }).limit(6);

      const suggestedQuizzes = availableQuizzes.map(quiz => ({
        id: quiz._id,
        title: quiz.title,
        description: quiz.description || 'Quiz interactif pour tester vos connaissances',
        difficulty: this.mapDifficulty(quiz.difficulty),
        duration: quiz.duration || 15,
        questions: Array.isArray(quiz.questions) ? quiz.questions.length : 10,
        rating: 4.5,
        progress: 0,
        status: 'Non commencé',
        badge: this.getQuizBadge(quiz)
      }));

      // Analyser les thèmes faibles/forts
      const themeStats = await QuizResult.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
          $lookup: {
            from: 'quizzes',
            localField: 'quizId',
            foreignField: '_id',
            as: 'quiz'
          }
        },
        { $unwind: '$quiz' },
        {
          $group: {
            _id: '$quiz.theme',
            averageScore: { $avg: '$percentage' },
            quizCount: { $sum: 1 }
          }
        }
      ]);

      const weakAreas = themeStats.filter(t => t.averageScore < 70).map(t => t._id);
      const strengthAreas = themeStats.filter(t => t.averageScore >= 80).map(t => t._id);

      return { suggestedQuizzes, weakAreas, strengthAreas };
    } catch (error) {
      console.error('Erreur getPersonalizedRecommendationsInternal:', error);
      return { suggestedQuizzes: [], weakAreas: [], strengthAreas: [] };
    }
  },

  // Méthodes utilitaires
  getQuickActions() {
    return [
      {
        icon: 'brain',
        title: 'Nouveau Quiz',
        description: 'Commencer un nouveau quiz',
        route: '/quizzes'
      },
      {
        icon: 'chart',
        title: 'Mes Statistiques',
        description: 'Voir mes performances',
        route: '/stats'
      },
      {
        icon: 'user',
        title: 'Mon Profil',
        description: 'Gérer mon compte',
        route: '/profile'
      },
      {
        icon: 'settings',
        title: 'Paramètres',
        description: 'Configurer l\'application',
        route: '/settings'
      }
    ];
  },

  mapDifficulty(difficulty) {
    if (!difficulty) return 'intermediate';
    switch (difficulty.toLowerCase()) {
      case 'facile': return 'beginner';
      case 'moyen': return 'intermediate';
      case 'difficile': return 'expert';
      default: return 'intermediate';
    }
  },

  getQuizBadge(quiz) {
    const createdDate = new Date(quiz.createdAt || Date.now());
    const daysDiff = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysDiff < 7) return 'new';
    if (Math.random() > 0.7) return 'trending';
    return 'popular';
  },

  getThemeDisplayName(theme) {
    const themeNames = {
      'technique': 'Technique',
      'culture': 'Culture Générale',
      'securite': 'Sécurité',
      'general': 'Général',
      'management': 'Management',
      'communication': 'Communication'
    };
    return themeNames[theme] || theme.charAt(0).toUpperCase() + theme.slice(1);
  },

  getActivityTitle(percentage) {
    if (percentage >= 90) return '🌟 Score Excellent';
    if (percentage >= 80) return '🏆 Très Bonne Performance';
    if (percentage >= 60) return '👍 Bonne Tentative';
    return '💪 Quiz Terminé';
  },

  getTimeAgo(date) {
    const now = new Date();
    const past = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes}min`;
    if (diffInMinutes < 1440) return `Il y a ${Math.floor(diffInMinutes / 60)}h`;
    return `Il y a ${Math.floor(diffInMinutes / 1440)}j`;
  },

  // Toutes les autres méthodes existantes...
  getDefaultStats() {
    return { quizCompleted: 0, averageScore: 0, totalTime: '0h 0min', ranking: 0 };
  },

  getDefaultDashboardData() {
    return {
      stats: this.getDefaultStats(),
      recentActivities: [],
      recommendedQuizzes: [],
      learningPath: [],
      topPerformers: [],
      achievements: [],
      quickActions: this.getQuickActions(),
      quizzesThisWeek: 0,
      scoreEvolution: 0,
      rankingTrend: 'Nouveau',
      timeSpentThisWeek: 0
    };
  },

  formatTime(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
  },

  async calculateUserRanking(userId, userAverageScore) {
    try {
      const allUsers = await QuizResult.aggregate([
        { 
          $group: { 
            _id: '$userId', 
            avgScore: { $avg: '$percentage' } 
          } 
        },
        { $sort: { avgScore: -1 } }
      ]);
      
      const userObjectId = new mongoose.Types.ObjectId(userId);
      const index = allUsers.findIndex(u => u._id.toString() === userObjectId.toString());
      return index >= 0 ? index + 1 : 1;
    } catch (error) {
      console.error('Erreur calculateUserRanking:', error);
      return 1;
    }
  },

  async getUserStatsInternal(userId) {
    try {
      const userResults = await QuizResult.find({ userId });
      if (!userResults || userResults.length === 0) return this.getDefaultStats();

      const quizCompleted = userResults.length;
      const averageScore = Math.round(
        userResults.reduce((s, r) => s + r.percentage, 0) / quizCompleted
      );
      const totalTime = this.formatTime(
        userResults.reduce((s, r) => s + (r.timeSpent || 0), 0)
      );
      const ranking = await this.calculateUserRanking(userId, averageScore);
      return { quizCompleted, averageScore, totalTime, ranking };
    } catch (error) {
      console.error('Erreur getUserStatsInternal:', error);
      return this.getDefaultStats();
    }
  },

  async getWeeklyProgress(userId) {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const weeklyResults = await QuizResult.find({ 
        userId, 
        completedAt: { $gte: oneWeekAgo } 
      });
      const quizzesCompleted = weeklyResults.length;
      const timeSpent = weeklyResults.reduce((s, r) => s + (r.timeSpent || 0), 0);
      const scoreImprovement = quizzesCompleted ? 
        Math.round(weeklyResults.reduce((s, r) => s + r.percentage, 0) / quizzesCompleted) - 
        (await this.getPreviousWeekScore(userId)) : 0;
      return { quizzesCompleted, timeSpent, scoreImprovement };
    } catch (error) {
      console.error('Erreur getWeeklyProgress:', error);
      return { quizzesCompleted: 0, timeSpent: 0, scoreImprovement: 0 };
    }
  },

  async getPreviousWeekScore(userId) {
    try {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const previousWeekResults = await QuizResult.find({
        userId,
        completedAt: { $gte: twoWeeksAgo, $lt: oneWeekAgo }
      });
      
      return previousWeekResults.length ? 
        Math.round(previousWeekResults.reduce((s, r) => s + r.percentage, 0) / previousWeekResults.length) : 0;
    } catch (error) {
      return 0;
    }
  },

  async getMonthlyTrends(userId) {
    try {
      const oneMonthAgo = new Date();
      oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
      const monthlyResults = await QuizResult.find({ 
        userId, 
        completedAt: { $gte: oneMonthAgo } 
      });
      return { 
        completionRate: monthlyResults.length, 
        averageScoreChange: 0, 
        rankingChange: 0 
      };
    } catch (error) {
      console.error('Erreur getMonthlyTrends:', error);
      return { completionRate: 0, averageScoreChange: 0, rankingChange: 0 };
    }
  },
  // Ajouter cette méthode dans dashboardController.js

// Calculer le classement de l'utilisateur dans son CBU
async calculateUserRankingInCbu(userId, userCbu) {
  try {
    if (!userCbu) return 1;

    // Récupérer tous les utilisateurs du même CBU
    const usersInSameCbu = await User.find({ cbu: userCbu }).select('_id');
    const userIds = usersInSameCbu.map(u => u._id);

    // Calculer les scores moyens de tous les utilisateurs du CBU
    const rankings = await QuizResult.aggregate([
      {
        $match: {
          userId: { $in: userIds }
        }
      },
      {
        $group: {
          _id: '$userId',
          avgScore: { $avg: '$percentage' },
          totalQuizzes: { $sum: 1 }
        }
      },
      { 
        $match: { 
          totalQuizzes: { $gte: 1 } 
        } 
      },
      { 
        $sort: { 
          avgScore: -1,
          totalQuizzes: -1
        } 
      }
    ]);

    // Trouver la position de l'utilisateur actuel
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const userRankIndex = rankings.findIndex(r => r._id.toString() === userObjectId.toString());
    
    return userRankIndex >= 0 ? userRankIndex + 1 : rankings.length + 1;
  } catch (error) {
    console.error('Erreur calculateUserRankingInCbu:', error);
    return 1;
  }
},

// Mettre à jour getUserStatsInternal pour utiliser le classement CBU
async getUserStatsInternal(userId, userCbu) {
  try {
    const userResults = await QuizResult.find({ userId });
    if (!userResults || userResults.length === 0) return this.getDefaultStats();

    const quizCompleted = userResults.length;
    const averageScore = Math.round(
      userResults.reduce((s, r) => s + r.percentage, 0) / quizCompleted
    );
    const totalTime = this.formatTime(
      userResults.reduce((s, r) => s + (r.timeSpent || 0), 0)
    );
    
    // Utiliser le classement dans le CBU au lieu du classement global
    const ranking = await this.calculateUserRankingInCbu(userId, userCbu);
    
    return { quizCompleted, averageScore, totalTime, ranking };
  } catch (error) {
    console.error('Erreur getUserStatsInternal:', error);
    return this.getDefaultStats();
  }
},
};

module.exports = dashboardController;