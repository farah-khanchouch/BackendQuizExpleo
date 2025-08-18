const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ✅ Création de compte (register)

exports.register = async (req, res) => {
  const { fullname, email, password, confirmPassword, cbu, role } = req.body;

  try {
    // Vérifier si l’email existe déjà
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email déjà utilisé' });

    // Vérifier correspondance des mots de passe
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Les mots de passe ne correspondent pas' });
    }

    // Hacher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer un nouvel utilisateur
    const user = new User({
      username: fullname,   // ici on map  → nomComplet dans la BDD
      email,
      password: hashedPassword,
      cbu,
      role: role || 'collaborator'
    });

    await user.save();

    res.status(201).json({ message: 'Utilisateur inscrit avec succès' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
exports.login = async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  const password = req.body.password;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Utilisateur non trouvé' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Mot de passe incorrect' });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Connexion réussie',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        cbu: user.cbu 
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
exports.googleLogin = async (req, res) => {
  const { idToken } = req.body;

  try {
    // Vérifie le token Google
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name } = payload;

    // Vérifie si l'utilisateur existe déjà
    let user = await User.findOne({ email });

    if (!user) {
      // Crée un nouvel utilisateur si inexistant
      user = new User({
        username: name,
        email,
        password: '', // pas de mot de passe car Google gère l’authentification
        role: 'collaborator'
      });
      await user.save();
    }

    // Crée un token JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Envoie la réponse
    res.json({
      message: 'Connexion via Google réussie',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        cbu: user.cbu 
      }
    });

  } catch (error) {
    console.error(error);
    res.status(401).json({ message: 'Authentification Google échouée' });
  }
};