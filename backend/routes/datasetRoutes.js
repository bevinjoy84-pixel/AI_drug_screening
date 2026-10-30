/**
 * PharmaScreen AI - Dataset Routes
 * Endpoints for exploring, searching, filtering, and exporting reference compound datasets.
 */

const express = require('express');
const router = express.Router();

const storageService = require('../services/storageService');

/**
 * GET /api/dataset
 * Retrieve compounds with search, classification filter, and pagination
 */
router.get('/', (req, res) => {
  try {
    const { search = '', classification = '', minMw, maxMw, violations } = req.query;
    let list = storageService.getAllCompounds();

    // Search filter: name, smiles, formula, therapeutic class
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(c =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.smiles && c.smiles.toLowerCase().includes(q)) ||
        (c.formula && c.formula.toLowerCase().includes(q)) ||
        (c.therapeuticClass && c.therapeuticClass.toLowerCase().includes(q))
      );
    }

    // Classification filter
    if (classification && classification !== 'All') {
      list = list.filter(c => c.classification === classification);
    }

    // Violations filter
    if (violations !== undefined && violations !== '' && violations !== 'All') {
      const vNum = parseInt(violations, 10);
      list = list.filter(c => c.lipinskiViolations === vNum);
    }

    // MW range filter
    if (minMw) {
      list = list.filter(c => c.molecularWeight >= parseFloat(minMw));
    }
    if (maxMw) {
      list = list.filter(c => c.molecularWeight <= parseFloat(maxMw));
    }

    return res.json({
      success: true,
      total: list.length,
      compounds: list
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/dataset/export
 * Download CSV file of compounds
 */
router.get('/export', (req, res) => {
  try {
    const compounds = storageService.getAllCompounds();
    const csvData = storageService.exportToCsv(compounds);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="pharmascreen_compounds_dataset.csv"');
    return res.send(csvData);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/dataset/:id
 * Retrieve single compound by ID
 */
router.get('/:id', (req, res) => {
  try {
    const list = storageService.getAllCompounds();
    const compound = list.find(c => c.id === req.params.id);
    if (!compound) {
      return res.status(404).json({ success: false, error: 'Compound not found' });
    }
    return res.json({ success: true, compound });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
