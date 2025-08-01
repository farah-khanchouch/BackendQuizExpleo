const Question = require('../models/Question');

exports.createQuestion = async (req, res) => {
  try {
    const question = new Question({
      ...req.body,
      quizId: req.params.quizId
    });
    await question.save();
    res.status(201).json(question);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getQuestionsByQuiz = async (req, res) => {
  try {
    const questions = await Question.find({ quizId: req.params.quizId });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateQuestion = async (req, res) => {
  try {
    const question = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!question) return res.status(404).json({ error: 'Question non trouvée' });
    res.json(question);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteQuestion = async (req, res) => {
  try {
    await Question.findByIdAndDelete(req.params.id);
    res.json({ message: 'Question supprimée' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
