/**
 * PharmaScreen AI - Main Backend Server
 * Express application serving REST APIs and static frontend dashboard.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const screenRoutes = require('./routes/screenRoutes');
const datasetRoutes = require('./routes/datasetRoutes');
const historyRoutes = require('./routes/historyRoutes');
const mlRoutes = require('./routes/mlRoutes');
const aiRoutes = require('./routes/aiRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Security and CORS middleware
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Static frontend assets
app.use(express.static(path.join(__dirname, '../frontend')));

// Mount API routes
app.use('/api/screen', screenRoutes);
app.use('/api/dataset', datasetRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/ml', mlRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    application: 'PharmaScreen AI – Drug Discovery Lab',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 5)
  });
});

// API 404 fallback (prevents sending index.html for unmatched /api routes)
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API route not found: ${req.method} ${req.originalUrl}`
  });
});

// Single Page Application fallback for client-side navigation
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Global Error handling middleware
app.use((err, req, res, next) => {
  console.error('[ServerError]', err.stack || err.message);
  res.status(500).json({
    success: false,
    error: 'Internal server error occurred',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Graceful shutdown handling for Docker / production orchestration
function setupGracefulShutdown(server) {
  function shutdown(signal) {
    console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);
    server.close(() => {
      console.log('[Server] Closed remaining connections. Exited cleanly.');
      process.exit(0);
    });

    // Force exit if hanging
    setTimeout(() => {
      console.error('[Server] Could not close connections in time, forcefully shutting down.');
      process.exit(1);
    }, 5000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Start listening when executed directly
if (require.main === module) {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🔬 PharmaScreen AI – Drug Discovery Lab running`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🛡️  Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🤖 Gemini AI: ${process.env.GEMINI_API_KEY ? 'Configured (Active)' : 'Unset (Fallback Heuristic Engine Active)'}`);
    console.log(`=======================================================`);
  });

  setupGracefulShutdown(server);
}

module.exports = app;
