const Quiz = require('../models/Quiz');

exports.createQuiz = async (req, res) => {
  try {
    const quiz = new Quiz(req.body);
    await quiz.save();
    res.status(201).json(quiz);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getAllQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find();
    res.json(quizzes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz non trouvé' });
    res.json(quiz);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.updateQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!quiz) return res.status(404).json({ error: 'Quiz non trouvé' });
    res.json(quiz);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteQuiz = async (req, res) => {
  try {
    await Question.deleteMany({ quizId: req.params.id });
    await Quiz.findByIdAndDelete(req.params.id);
    res.json({ message: 'Quiz supprimé avec ses questions' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};