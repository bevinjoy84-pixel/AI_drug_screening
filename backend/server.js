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

// Single Page Application fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[ServerError]', err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error occurred',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start listening
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🔬 PharmaScreen AI – Drug Discovery Lab running`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🛡️  Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🤖 Gemini AI: ${process.env.GEMINI_API_KEY ? 'Configured (Active)' : 'Unset (Fallback Heuristic Engine Active)'}`);
  console.log(`=======================================================`);
});
