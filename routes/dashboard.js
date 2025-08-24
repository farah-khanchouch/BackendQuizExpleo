// routes/dashboard.js - Version mise à jour
const express = require('express');
const router = express.Router();

// CORRECTION: Import direct de la fonction middleware
const authenticateToken = require('../middlewares/authMiddleware');

// Import du contrôleur
const dashboardController = require('../controllers/dashboardController');

// Routes du dashboard
router.get('/stats', authenticateToken, dashboardController.getUserStats);
router.get('/', authenticateToken, dashboardController.getDashboardData);

// ✅ NOUVELLES ROUTES DE DEBUG
router.get('/debug-cbu', authenticateToken, dashboardController.debugCbuData);
router.get('/debug-cbu-leaderboard', authenticateToken, dashboardController.debugCbuLeaderboard);

router.get('/recent-activities', authenticateToken, async (req, res) => {
  try {
    const activities = await dashboardController.getRecentActivities(req.user._id);
    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/recommendations', authenticateToken, async (req, res) => {
  try {
    const recommendations = await dashboardController.getPersonalizedRecommendationsInternal(
      req.user._id, 
      req.user.cbu
    );
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/learning-path', authenticateToken, async (req, res) => {
  try {
    const learningPath = await dashboardController.getLearningPath(req.user._id, req.user.cbu);
    res.json(learningPath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ ROUTE CORRIGÉE avec la nouvelle logique
router.get('/top-performers', authenticateToken, async (req, res) => {
  try {
    console.log('🚀 Route top-performers appelée');
    console.log('👤 Utilisateur:', req.user.username);
    console.log('🏢 CBU:', req.user.cbu);
    
    const topPerformers = await dashboardController.getTopPerformersByCbu(
      req.user.cbu,
      req.user._id
    );
    
    console.log('📊 Résultat:', topPerformers.length, 'performers trouvés');
    res.json(topPerformers);
  } catch (error) {
    console.error('❌ Erreur route top-performers:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/achievements', authenticateToken, async (req, res) => {
  try {
    const achievements = await dashboardController.getUserAchievements(req.user._id);
    res.json(achievements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;