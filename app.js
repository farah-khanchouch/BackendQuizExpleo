const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// Connexion MongoDB (tu peux commenter cette partie pour le moment)
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ DB error:', err));

// Routes
const userRoutes = require('./routes/userRoutes');
const quizRoutes = require('./routes/quizRoutes');
const authRoutes = require('./routes/authRoutes');
const questionRoutes = require('./routes/questionRoutes');
const badgeRoutes = require('./routes/badgeRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/badges', badgeRoutes);
// Dans app.js ou server.js
app.use('/uploads', express.static('uploads'));
app.get('/', (req, res) => {
  res.send('Quiz API 🚀');
});

module.exports = app;
