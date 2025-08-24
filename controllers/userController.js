const UserStats = require('../models/UserStats');
const Quiz = require('../models/Quiz');
exports.createUser = async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    
    // Créer les statistiques utilisateur
    await UserStats.create({ 
      userId: user._id,
      quizCompleted: 0,
      totalScore: 0,
      totalQuestions: 0,
      correctAnswers: 0,
      averageScore: 0
    });

    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
// NOUVELLES MÉTHODES À AJOUTER :

// PUT /api/users/:id/profile - Mettre à jour le profil utilisateur
exports.updateProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, cbu, avatar } = req.body;

    console.log('Mise à jour du profil utilisateur:', id, req.body);

    // Vérifier si l'utilisateur existe
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Préparer les données à mettre à jour
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (cbu) updateData.cbu = cbu;
    if (avatar) updateData.avatar = avatar;

    // Vérifier si l'email est unique (si il est modifié)
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: id } });
      if (existingUser) {
        return res.status(400).json({ error: 'Cet email est déjà utilisé' });
      }
    }

    // Mettre à jour l'utilisateur
    const updatedUser = await User.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    ).select('-password'); // Exclure le mot de passe

    console.log('Profil mis à jour avec succès:', updatedUser);

    res.json({
      message: 'Profil mis à jour avec succès',
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        cbu: updatedUser.cbu,
        avatar: updatedUser.avatar,
        role: updatedUser.role
      }
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Email déjà utilisé' });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: 'Données invalides', details: error.message });
    }

    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour' });
  }
};

// PATCH /api/users/:id - Mettre à jour partiellement (pour avatar)
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log('Mise à jour partielle utilisateur:', id, updateData);

    const updatedUser = await User.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({
      message: 'Utilisateur mis à jour avec succès',
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        cbu: updatedUser.cbu,
        avatar: updatedUser.avatar,
        role: updatedUser.role
      }
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// GET /api/users/:id - Récupérer un utilisateur par ID
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Récupérer les statistiques
    const stats = await UserStats.findOne({ userId: id }) || {
      quizCompleted: 0,
      totalScore: 0,
      averageScore: 0
    };

    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      cbu: user.cbu,
      avatar: user.avatar,
      role: user.role,
      stats: {
        totalQuizzes: await Quiz.countDocuments({ status: 'active' }),
        completedQuizzes: stats.quizCompleted,
        averageScore: stats.averageScore,
        badges: Math.min(Math.floor(stats.quizCompleted / 2), 5)
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};