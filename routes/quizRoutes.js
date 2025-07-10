const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const verifyToken = require('../middlewares/verifyToken'); // ✅ Import
const checkRole = require('../middlewares/checkRole');

router.post('/', verifyToken, checkRole('admin'), quizController.createQuiz);
router.get('/', quizController.getAllQuizzes);
router.get('/:id', quizController.getQuizById);

module.exports = router;

