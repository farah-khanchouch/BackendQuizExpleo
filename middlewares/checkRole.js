// middlewares/checkRole.js
module.exports = function(roles = []) {
    // roles peut être une string ou un tableau de strings
    if (typeof roles === 'string') {
      roles = [roles];
    }
  
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ message: 'Utilisateur non authentifié' });
      }
  
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ message: "Accès refusé : rôle insuffisant" });
      }
  
      next();
    };
  };
  