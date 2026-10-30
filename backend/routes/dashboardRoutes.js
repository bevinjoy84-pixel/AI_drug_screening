/**
 * PharmaScreen AI - Dashboard Analytics Routes
 */

const express = require('express');
const router = express.Router();

const storageService = require('../services/storageService');

/**
 * GET /api/dashboard/stats
 * Aggregated analytics for executive research overview
 */
router.get('/stats', (req, res) => {
  try {
    const stats = storageService.getDashboardMetrics();
    return res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
