const jwt = require('jsonwebtoken');
const User = require('../models/User'); // ⭐ AJOUT IMPORTANT
require('dotenv').config();

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];

    // ✅ Vérifie que le token est présent
    if (!authHeader) {
      return res.status(401).json({ message: 'Accès refusé. Aucun token fourni.' });
    }

    const token = authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
      return res.status(401).json({ message: 'Format de token invalide.' });
    }

    console.log('🔐 Vérification du token...');
    
    // Décoder le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token décodé:', { userId: decoded.userId || decoded.id, username: decoded.username });

    // ⭐ CORRECTION PRINCIPALE: Récupérer l'utilisateur complet depuis la DB
    const user = await User.findById(decoded.userId || decoded.id).select('-password');
    
    if (!user) {
      console.log('❌ Utilisateur non trouvé pour ID:', decoded.userId || decoded.id);
      return res.status(401).json({ message: 'Utilisateur non trouvé.' });
    }

    console.log('✅ Utilisateur chargé:', {
      id: user._id,
      username: user.username,
      cbu: user.cbu,
      fullname: user.fullname
    });

    // ⭐ CHANGEMENT: Attacher l'utilisateur COMPLET au lieu du token décodé
    req.user = user; // Maintenant req.user contient toutes les infos utilisateur
    req.userId = user._id; // ID aussi disponible directement
    
    next();
    
  } catch (err) {
    console.error('❌ Erreur authentification:', err.message);
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({ message: 'Token invalide.' });
    }
    
    if (err.name === 'TokenExpiredError') {
      return res.status(403).json({ message: 'Token expiré.' });
    }
    
    res.status(500).json({ message: 'Erreur serveur d\'authentification.' });
  }
};