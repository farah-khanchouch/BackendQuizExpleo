const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/login', authController.login);
console.log('✅ authRoutes chargé');
router.post('/google', authController.googleLogin);


module.exports = router;
