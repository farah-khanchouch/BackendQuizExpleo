const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const User = require('../models/User');
const UserStats = require('../models/UserStats');

// GET tous les utilisateurs
router.get('/', async (req, res) => {
  try {
    console.log('🔍 GET /api/users - Récupération pour admin interface');
    
    const collaborators = await User.find({ role: 'collaborator' }).sort({ createdAt: -1 });
    console.log(`📊 ${collaborators.length} collaborateurs trouvés`);
    
    const usersWithStats = await Promise.all(
      collaborators.map(async (user) => {
        const stats = await UserStats.findOne({ userId: user._id });
        
        // Utiliser les champs du modèle UserStats
        const completedQuizzes = stats ? stats.quizCompleted || 0 : 0;
        const totalScore = stats ? stats.totalScore || 0 : 0;
        const averageScore = stats && stats.totalQuestions > 0 
          ? Math.round((stats.correctAnswers / stats.totalQuestions) * 100)
          : 0;
        const badges = Math.floor(completedQuizzes / 2);
        
        return {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          cbu: user.cbu || 'Non défini',
          totalPoints: totalScore,
          joinedAt: user.createdAt ? user.createdAt.toISOString() : new Date().toISOString(),
          totalQuizzes: 10, // Valeur fixe ou à calculer
          completedQuizzes: completedQuizzes,
          averageScore: averageScore,
          badges: badges,
          status: user.status || 'active',
          lastActivity: user.updatedAt ? user.updatedAt.toISOString() : new Date().toISOString()
        };
      })
    );
    
    console.log('📤 Premier utilisateur exemple:', usersWithStats[0]);
    res.json(usersWithStats);
    
  } catch (error) {
    console.error('❌ Erreur GET /api/users:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des utilisateurs',
      details: error.message 
    });
  }
});

// GET un utilisateur par ID
router.get('/:id', async (req, res) => {
  try {
    console.log(`🔍 GET /api/users/${req.params.id}`);
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    const stats = await UserStats.findOne({ userId: user._id });
    const completedQuizzes = stats ? stats.quizCompleted || 0 : 0;
    const totalScore = stats ? stats.totalScore || 0 : 0;
    const averageScore = stats && stats.totalQuestions > 0 
      ? Math.round((stats.correctAnswers / stats.totalQuestions) * 100)
      : 0;
    const badges = Math.floor(completedQuizzes / 2);
    
    const formattedUser = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      cbu: user.cbu || 'Non défini',
      totalPoints: totalScore,
      joinedAt: user.createdAt ? user.createdAt.toISOString() : new Date().toISOString(),
      totalQuizzes: 10,
      completedQuizzes: completedQuizzes,
      averageScore: averageScore,
      badges: badges,
      status: user.status || 'active',
      lastActivity: user.updatedAt ? user.updatedAt.toISOString() : new Date().toISOString()
    };
    
    res.json(formattedUser);
    
  } catch (error) {
    console.error('❌ Erreur GET /api/users/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH - Mettre à jour un utilisateur
router.patch('/:id', async (req, res) => {
  try {
    console.log(`🔄 PATCH /api/users/${req.params.id}`);
    console.log('📥 Données de mise à jour:', req.body);
    
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    console.log('✅ Utilisateur mis à jour');
    
    // Récupérer les stats
    const stats = await UserStats.findOne({ userId: updatedUser._id });
    const completedQuizzes = stats ? stats.quizCompleted || 0 : 0;
    const totalScore = stats ? stats.totalScore || 0 : 0;
    const averageScore = stats && stats.totalQuestions > 0 
      ? Math.round((stats.correctAnswers / stats.totalQuestions) * 100)
      : 0;
    const badges = Math.floor(completedQuizzes / 2);
    
    const formattedUser = {
      id: updatedUser._id.toString(),
      username: updatedUser.username,
      email: updatedUser.email,
      avatar: updatedUser.avatar,
      cbu: updatedUser.cbu || 'Non défini',
      totalPoints: totalScore,
      joinedAt: updatedUser.createdAt ? updatedUser.createdAt.toISOString() : new Date().toISOString(),
      totalQuizzes: 10,
      completedQuizzes: completedQuizzes,
      averageScore: averageScore,
      badges: badges,
      status: updatedUser.status || 'active',
      lastActivity: updatedUser.updatedAt ? updatedUser.updatedAt.toISOString() : new Date().toISOString()
    };
    
    res.json(formattedUser);
    
  } catch (error) {
    console.error('❌ Erreur PATCH /api/users:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE - Supprimer un utilisateur
router.delete('/:id', async (req, res) => {
  try {
    console.log(`🗑️ DELETE /api/users/${req.params.id}`);
    
    // Supprimer l'utilisateur
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    
    if (!deletedUser) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    // Supprimer aussi ses stats
    await UserStats.deleteOne({ userId: req.params.id });
    
    console.log('✅ Utilisateur et ses stats supprimés');
    res.json({ message: 'Utilisateur supprimé avec succès' });
    
  } catch (error) {
    console.error('❌ Erreur DELETE /api/users:', error);
    res.status(500).json({ error: error.message });
  }
});

// Créer un nouvel utilisateur
router.post('/', userController.createUser);

// Enregistrer un nouvel utilisateur
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, cbu } = req.body;
    
    const newUser = new User({
      username,
      email,
      password: hashPassword(password),
      cbu,
      role: 'collaborator'
    });

    const savedUser = await newUser.save();

    // Créer automatiquement les stats pour ce collaborateur
    await UserStats.create({ userId: savedUser._id });

    res.status(201).json(savedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Récupérer les collaborateurs avec leurs statistiques
router.get('/collaborators-with-stats', async (req, res) => {
  try {
    const collaborators = await User.find({ role: 'collaborator' });

    const data = await Promise.all(
      collaborators.map(async (user) => {
        const stats = await UserStats.findOne({ userId: user._id });
        const completedQuizzes = stats ? stats.quizCompleted || 0 : 0;
        
        return {
          user: {
            ...user.toObject(),
            stats: {
              quizCompleted: completedQuizzes,
              totalScore: stats ? stats.totalScore || 0 : 0,
              averageScore: stats && stats.totalQuestions > 0 
                ? Math.round((stats.correctAnswers / stats.totalQuestions) * 100)
                : 0,
              badges: Math.floor(completedQuizzes / 2)
            }
          }
        };
      })
    );

    res.json(data);
  } catch (err) {
    console.error('❌ Erreur GET /api/users/collaborators-with-stats:', err);
    res.status(500).json({ error: 'Erreur serveur', details: err.message });
  }
});

module.exports = router;