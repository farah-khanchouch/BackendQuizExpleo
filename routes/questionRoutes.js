const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');
const verifyToken = require('../middlewares/verifyToken');
const checkRole = require('../middlewares/checkRole');

router.delete('/:id', verifyToken, checkRole('admin'), questionController.deleteQuestion);
// Ajoute d’autres routes si besoin

module.exports = router;