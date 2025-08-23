// routes/dashboard.js
const express = require('express');
const router = express.Router();

// CORRECTION: Import direct de la fonction middleware
const authenticateToken = require('../middlewares/authMiddleware');

// Import du contrôleur
const dashboardController = require('../controllers/dashboardController');

// Routes du dashboard
router.get('/stats', authenticateToken, dashboardController.getUserStats);
router.get('/', authenticateToken, dashboardController.getDashboardData);

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

router.get('/top-performers', authenticateToken, async (req, res) => {
  try {
    const topPerformers = await dashboardController.getTopPerformers();
    res.json(topPerformers);
  } catch (error) {
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
router.get('/recent-activities', authenticateToken, async (req, res) => {
  try {
    const activities = await dashboardController.getRecentActivities(req.user._id);
    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route pour les recommandations personnalisées
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

// Route pour le parcours d'apprentissage
router.get('/learning-path', authenticateToken, async (req, res) => {
  try {
    const learningPath = await dashboardController.getLearningPath(req.user._id, req.user.cbu);
    res.json(learningPath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route pour les top performers
router.get('/top-performers', authenticateToken, async (req, res) => {
  try {
    const topPerformers = await dashboardController.getTopPerformers();
    res.json(topPerformers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route pour les achievements
router.get('/achievements', authenticateToken, async (req, res) => {
  try {
    const achievements = await dashboardController.getUserAchievements(req.user._id);
    res.json(achievements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;