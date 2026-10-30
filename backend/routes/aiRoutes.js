/**
 * PharmaScreen AI - AI Explanation Routes
 * Securely accesses Gemini API from backend with domain heuristic fallback.
 */

const express = require('express');
const router = express.Router();

const geminiService = require('../services/geminiService');

/**
 * POST /api/ai/explain
 * Generate AI-assisted medicinal chemistry explanation
 */
router.post('/explain', async (req, res) => {
  try {
    const {
      name,
      smiles,
      formula,
      properties,
      evaluation,
      source
    } = req.body;

    if (!smiles) {
      return res.status(400).json({ success: false, error: 'Compound SMILES notation is required' });
    }

    const explanationResult = await geminiService.generateCompoundExplanation({
      name: name || 'Screened Compound',
      smiles,
      formula: formula || '',
      molecularWeight: properties?.molecularWeight || 0,
      logP: properties?.logP !== undefined ? properties.logP : null,
      hbd: properties?.hbd || 0,
      hba: properties?.hba || 0,
      tpsa: properties?.tpsa || 0,
      rotatableBonds: properties?.rotatableBonds || 0,
      classification: evaluation?.classification || 'Preliminary Analysis',
      violations: evaluation?.violations || {},
      ruleBreakdown: evaluation?.ruleBreakdown || [],
      source: source || 'PharmaScreen AI Engine'
    });

    return res.json({
      success: true,
      data: explanationResult
    });
  } catch (error) {
    console.error('[AIRoute] Error generating explanation:', error);
    return res.status(500).json({
      success: false,
      error: `AI explanation failed: ${error.message}`
    });
  }
});

module.exports = router;
