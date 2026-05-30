require('dotenv').config();
const express   = require('express');
const http      = require('http');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');

const connectDB    = require('./config/db');
const { initWebSocket } = require('./services/websocket.service');
const errorHandler = require('./middleware/error.middleware');

// Routes
const authRoutes      = require('./routes/auth.routes');
const candidateRoutes = require('./routes/candidate.routes');
const interviewRoutes = require('./routes/interview.routes');
const sessionRoutes   = require('./routes/session.routes');
const chunkRoutes     = require('./routes/chunk.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const jobRoutes       = require('./routes/job.routes');

const app    = express();
const server = http.createServer(app);

// Connect DB (non-fatal — falls back to mock mode)
connectDB().catch(err => console.warn('⚠️  DB unavailable, running in mock mode:', err.message));

// Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// Rate limiting
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 500, message: { error: 'Too many requests' } }));

// Routes
app.use('/api/auth',       authRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/sessions',   sessionRoutes);
app.use('/api/chunks',     chunkRoutes);
app.use('/api/analytics',  analyticsRoutes);
app.use('/api/jobs',       jobRoutes);

// Health
app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  res.json({ status:'ok', uptime: process.uptime(), db: mongoose.connection.readyState === 1 ? 'connected' : 'mock mode', timestamp: new Date().toISOString() });
});

// 404
app.use('*', (req, res) => res.status(404).json({ error: `Route ${req.originalUrl} not found` }));

// Error handler
app.use(errorHandler);

// WebSocket
initWebSocket(server);

// Start
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 InterviewAI Backend  →  http://localhost:${PORT}`);
  console.log(`🔌 WebSocket           →  ws://localhost:${PORT}/ws`);
  console.log(`💡 Health              →  http://localhost:${PORT}/api/health\n`);
});

module.exports = { app, server };
