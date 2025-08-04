const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const User = require('../models/User');
const UserStats = require('../models/UserStats');

// ✅ ROUTE MANQUANTE - GET tous les utilisateurs pour l'admin
router.get('/', async (req, res) => {
  try {
    console.log('🔍 GET /api/users - Récupération de tous les utilisateurs');
    
    // Récupérer tous les collaborateurs avec leurs stats
    const collaborators = await User.find({ role: 'collaborator' }).sort({ createdAt: -1 });
    
    console.log(`📊 ${collaborators.length} collaborateurs trouvés`);
    
    // Pour chaque collaborateur, récupérer ses stats
    const usersWithStats = await Promise.all(
      collaborators.map(async (user) => {
        const stats = await UserStats.findOne({ userId: user._id }) || {
          totalQuizzes: 0,
          completedQuizzes: 0,
          averageScore: 0,
          badges: 0,
          totalPoints: 0
        };
        
        return {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          cbu: user.cbu || 'Non défini',
          totalPoints: stats.totalPoints || 0,
          joinedAt: user.createdAt ? user.createdAt.toISOString() : new Date().toISOString(),
          totalQuizzes: stats.totalQuizzes || 0,
          completedQuizzes: stats.completedQuizzes || 0,
          averageScore: stats.averageScore || 0,
          badges: stats.badges || 0,
          status: user.status || 'active',
          lastActivity: user.updatedAt ? user.updatedAt.toISOString() : new Date().toISOString()
        };
      })
    );
    
    console.log('📤 Envoi des utilisateurs formatés');
    res.json(usersWithStats);
    
  } catch (error) {
    console.error('❌ Erreur GET /api/users:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des utilisateurs',
      details: error.message 
    });
  }
});

// ✅ GET un utilisateur par ID
router.get('/:id', async (req, res) => {
  try {
    console.log(`🔍 GET /api/users/${req.params.id}`);
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    const stats = await UserStats.findOne({ userId: user._id }) || {
      totalQuizzes: 0,
      completedQuizzes: 0,
      averageScore: 0,
      badges: 0,
      totalPoints: 0
    };
    
    const formattedUser = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      cbu: user.cbu || 'Non défini',
      totalPoints: stats.totalPoints || 0,
      joinedAt: user.createdAt ? user.createdAt.toISOString() : new Date().toISOString(),
      totalQuizzes: stats.totalQuizzes || 0,
      completedQuizzes: stats.completedQuizzes || 0,
      averageScore: stats.averageScore || 0,
      badges: stats.badges || 0,
      status: user.status || 'active',
      lastActivity: user.updatedAt ? user.updatedAt.toISOString() : new Date().toISOString()
    };
    
    res.json(formattedUser);
    
  } catch (error) {
    console.error('❌ Erreur GET /api/users/:id:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ PATCH - Mettre à jour un utilisateur
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
    
    // Récupérer les stats aussi
    const stats = await UserStats.findOne({ userId: updatedUser._id }) || {
      totalQuizzes: 0,
      completedQuizzes: 0,
      averageScore: 0,
      badges: 0,
      totalPoints: 0
    };
    
    const formattedUser = {
      id: updatedUser._id.toString(),
      username: updatedUser.username,
      email: updatedUser.email,
      avatar: updatedUser.avatar,
      cbu: updatedUser.cbu || 'Non défini',
      totalPoints: stats.totalPoints || 0,
      joinedAt: updatedUser.createdAt ? updatedUser.createdAt.toISOString() : new Date().toISOString(),
      totalQuizzes: stats.totalQuizzes || 0,
      completedQuizzes: stats.completedQuizzes || 0,
      averageScore: stats.averageScore || 0,
      badges: stats.badges || 0,
      status: updatedUser.status || 'active',
      lastActivity: updatedUser.updatedAt ? updatedUser.updatedAt.toISOString() : new Date().toISOString()
    };
    
    res.json(formattedUser);
    
  } catch (error) {
    console.error('❌ Erreur PATCH /api/users:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ DELETE - Supprimer un utilisateur
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

// Routes existantes
router.post('/', userController.createUser);

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

router.get('/collaborators-with-stats', async (req, res) => {
  try {
    const collaborators = await User.find({ role: 'collaborator' });

    // Pour chaque collaborateur, chercher ses stats
    const data = await Promise.all(
      collaborators.map(async (user) => {
        const stats = await UserStats.findOne({ userId: user._id });
        return {
          user,
          stats
        };
      })
    );

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;