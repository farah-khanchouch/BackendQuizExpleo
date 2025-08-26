const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

// Ajouter cette ligne pour debug

const app = express();

app.use(cors());
app.use(express.json());

// Connexion MongoDB (tu peux commenter cette partie pour le moment)
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ DB error:', err));

// Routes
const userRoutes = require('./routes/userRoutes');
const quizRoutes = require('./routes/quizRoutes');
const authRoutes = require('./routes/authRoutes');
const questionRoutes = require('./routes/questionRoutes');
const badgeRoutes = require('./routes/badgeRoutes');
const quizResultRoutes=require('./routes/quizResultRoutes')
const leaderboardRoutes = require('./routes/leaderboard'); // NOUVELLE ROUTE À AJOUTER
// Dans votre app.js
const dashboardRoutes = require('./routes/dashboard');
const userBadgeRoutes = require('./routes/userBadges');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api/quiz-results', quizResultRoutes); // ← AJOUT IMPORTANT
app.use('/api/leaderboard', leaderboardRoutes); // NOUVELLE ROUTE À AJOUTER
app.use('/api/dashboard', dashboardRoutes);
// Ajoutez cette ligne avec vos autres routes
app.use('/api/stats', require('./routes/stats'));
// Dans app.js ou server.js

// ... autres middlewares

app.use('/api/users', userBadgeRoutes);
// Dans app.js ou server.js
app.use('/uploads', express.static('uploads'));
app.get('/', (req, res) => {
  res.send('Quiz API 🚀');
});

module.exports = app;