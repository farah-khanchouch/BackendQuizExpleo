const Quiz = require('../models/Quiz');
const Question = require('../models/Question'); // <-- AJOUTE CETTE LIGNE
const QuizResult = require('../models/QuizResult'); // ⚠️ Ajoutez cette ligne

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
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
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
    // On récupère le quiz existant
    const quizExistant = await Quiz.findById(req.params.id);
    if (!quizExistant) return res.status(404).json({ error: 'Quiz non trouvé' });

    // On ne modifie questions QUE si elles sont explicitement envoyées
    const dataToUpdate = { ...req.body };
    if (typeof req.body.questions === 'undefined') {
      dataToUpdate.questions = quizExistant.questions;
    }

    const quiz = await Quiz.findByIdAndUpdate(req.params.id, dataToUpdate, { new: true });
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
exports.duplicateQuiz = async (req, res) => {
  try {
    // 1. Récupérer le quiz d'origine
    const originalQuiz = await Quiz.findById(req.params.id);
    if (!originalQuiz) return res.status(404).json({ message: 'Quiz non trouvé' });

    // 2. Créer un nouveau quiz (en copiant les champs, mais sans l'_id ni les questions)
    const newQuizData = originalQuiz.toObject();
    delete newQuizData._id;
    delete newQuizData.id;
    newQuizData.title = newQuizData.title + '';
    const newQuiz = new Quiz(newQuizData);
    await newQuiz.save();

    // 3. Copier toutes les questions du quiz d'origine
    const questions = await Question.find({ quizId: originalQuiz._id });
    const newQuestions = questions.map(q => {
      const obj = q.toObject();
      delete obj._id;
      obj.quizId = newQuiz._id;
      return obj;
    });
    await Question.insertMany(newQuestions);

    res.status(201).json(newQuiz);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.getQuizCompletionStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    const quizId = req.params.quizId;
    
    // Récupérer le quiz pour vérifier s'il est rejouable
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz non trouvé' });
    }
    
    // Vérifier si l'utilisateur a déjà terminé ce quiz
    const result = await QuizResult.findOne({
      userId: userId,
      quizId: quizId
    });

    res.json({
      completed: !!result,
      isReplayable: quiz.isReplayable,
      lastAttempt: result?.completedAt,
      score: result?.score
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// AJOUTEZ cette méthode pour sauvegarder correctement les résultats
exports.submitQuizResult = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { answers, score, timeSpent, totalQuestions, correctAnswers } = req.body;
    const userId = req.user._id;

    // Vérifier si l'utilisateur a déjà complété ce quiz
    const existingResult = await QuizResult.findOne({ userId, quizId });
    
    if (existingResult) {
      const quiz = await Quiz.findById(quizId);
      if (!quiz.isReplayable) {
        return res.status(400).json({ 
          error: 'Ce quiz ne peut être refait qu\'une seule fois' 
        });
      }
      
      // Si rejouable, mettre à jour le résultat existant
      existingResult.score = score;
      existingResult.answers = answers;
      existingResult.timeSpent = timeSpent;
      existingResult.correctAnswers = correctAnswers;
      existingResult.completedAt = new Date();
      await existingResult.save();
      
      return res.json({
        message: 'Résultat mis à jour',
        result: existingResult,
        badges: []
      });
    }

    // Créer un nouveau résultat
    const newResult = new QuizResult({
      userId,
      quizId,
      score,
      answers,
      timeSpent,
      totalQuestions,
      correctAnswers,
      completedAt: new Date()
    });

    await newResult.save();

    res.json({
      message: 'Résultat enregistré',
      result: newResult,
      badges: []
    });

  } catch (error) {
    console.error('Erreur lors de la soumission:', error);
    res.status(500).json({ error: error.message });
  }
};