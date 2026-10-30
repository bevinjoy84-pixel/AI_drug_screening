/**
 * PharmaScreen AI - History Routes
 * Endpoints for managing and reviewing screening history.
 */

const express = require('express');
const router = express.Router();

const storageService = require('../services/storageService');

/**
 * GET /api/history
 * List screening records
 */
router.get('/', (req, res) => {
  try {
    const history = storageService.getScreeningHistory();
    return res.json({
      success: true,
      total: history.length,
      history
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/history/:id
 * Remove individual screening record
 */
router.delete('/:id', (req, res) => {
  try {
    const deleted = storageService.deleteScreeningRecord(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }
    return res.json({ success: true, message: 'Screening record deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/history
 * Clear entire screening history
 */
router.delete('/', (req, res) => {
  try {
    storageService.clearHistory();
    return res.json({ success: true, message: 'Screening history cleared' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/history/export
 * Download history as CSV
 */
router.get('/export', (req, res) => {
  try {
    const history = storageService.getScreeningHistory();
    const csvData = storageService.exportToCsv(history);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="pharmascreen_screening_history.csv"');
    return res.send(csvData);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
