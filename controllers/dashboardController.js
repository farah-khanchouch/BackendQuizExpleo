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
      const stats = await this.getUserStatsInternal(userId);
      const weeklyProgress = await this.getWeeklyProgress(userId);
      const monthlyTrends = await this.getMonthlyTrends(userId);
      const recommendations = await this.getPersonalizedRecommendationsInternal(userId, user.cbu);
      const recentActivities = await this.getRecentActivities(userId);
      const achievements = await this.getUserAchievements(userId);
      const learningPath = await this.getLearningPath(userId, user.cbu);
      const topPerformers = await this.getTopPerformers();

      const dashboardData = {
        stats,
        recentActivities,
        recommendedQuizzes: recommendations.suggestedQuizzes,
        learningPath,
        topPerformers,
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

  // NOUVELLE MÉTHODE : Top performers
  async getTopPerformers() {
    try {
      const topUsers = await QuizResult.aggregate([
        {
          $group: {
            _id: '$userId',
            avgScore: { $avg: '$percentage' },
            totalQuizzes: { $sum: 1 }
          }
        },
        { $match: { totalQuizzes: { $gte: 3 } } }, // Au moins 3 quiz
        { $sort: { avgScore: -1 } },
        { $limit: 3 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' }
      ]);

      const ranks = ['🥇', '🥈', '🥉'];
      return topUsers.map((user, index) => ({
        rank: ranks[index] || '🏅',
        name: user.user.username || 'Anonyme',
        points: `${Math.round(user.avgScore * 10)} pts`,
        avatar: `/assets/avatars/default.jpg`,
        current: false // Vous pouvez ajouter une logique pour identifier l'utilisateur actuel
      }));
    } catch (error) {
      console.error('Erreur getTopPerformers:', error);
      return [];
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
  }
};

module.exports = dashboardController;