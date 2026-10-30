/**
 * PharmaScreen AI - Machine Learning Routes
 * Handles ML evaluation metrics retrieval, live compound prediction, and retraining.
 */

const express = require('express');
const router = express.Router();

const mlService = require('../services/mlService');

/**
 * GET /api/ml/metrics
 * Returns genuine, calculated evaluation metrics on held-out test data
 */
router.get('/metrics', (req, res) => {
  try {
    const metrics = mlService.getMetrics();
    return res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/ml/predict
 * Predicts drug-likeness for candidate compound properties
 */
router.post('/predict', (req, res) => {
  try {
    const { properties } = req.body || {};
    if (!properties) {
      return res.status(400).json({
        success: false,
        error: 'Compound properties object is required (mw, logP, hbd, hba, tpsa, rotatableBonds)'
      });
    }

    const prediction = mlService.predict(properties);
    return res.json({
      success: true,
      prediction
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/ml/retrain
 * Retrains model with specified hyperparameters and returns updated genuine metrics
 */
router.post('/retrain', (req, res) => {
  try {
    const { testSplitRatio, learningRate, epochs, l2Regularization } = req.body || {};

    const split = Math.min(0.5, Math.max(0.1, parseFloat(testSplitRatio) || 0.20));
    const lr = Math.min(1.0, Math.max(0.001, parseFloat(learningRate) || 0.08));
    const ep = Math.min(5000, Math.max(50, parseInt(epochs, 10) || 600));
    const l2 = Math.min(0.1, Math.max(0, parseFloat(l2Regularization) || 0.001));

    const metrics = mlService.train({
      testSplitRatio: split,
      learningRate: lr,
      epochs: ep,
      l2Regularization: l2
    });

    return res.json({
      success: true,
      message: 'Model retrained successfully on curated benchmark dataset',
      data: metrics
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
