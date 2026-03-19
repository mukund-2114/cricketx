const express = require('express');
const cors = require('cors');
const matchRoutes = require('./routes/matchRoutes');
const betRoutes = require('./routes/betRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.send('<h1>Elite Multi-Sport Exchange API</h1><p>Running in production mode.</p>');
});

app.use('/api/matches', matchRoutes);
app.use('/api/bets', betRoutes);
app.use('/api/auth', authRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = app;
