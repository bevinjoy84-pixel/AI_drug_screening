/**
 * PharmaScreen AI - Screen Routes
 * Handles SMILES validation, property retrieval from PubChem / In-Silico fallback,
 * Lipinski Rule of 5 evaluation, and history logging.
 */

const express = require('express');
const router = express.Router();

const chemistryCalculator = require('../services/chemistryCalculator');
const pubchemService = require('../services/pubchemService');
const screeningEngine = require('../services/screeningEngine');
const storageService = require('../services/storageService');

/**
 * POST /api/screen/validate
 * Validates SMILES notation syntax
 */
router.post('/validate', (req, res) => {
  const { smiles } = req.body;
  if (!smiles) {
    return res.status(400).json({ valid: false, error: 'SMILES input is required' });
  }

  const result = chemistryCalculator.validateSmiles(smiles);
  return res.json(result);
});

/**
 * POST /api/screen/analyze
 * Full screening workflow: validation -> PubChem/fallback calculation -> Lipinski evaluation -> store
 */
router.post('/analyze', async (req, res) => {
  try {
    const { smiles, name, saveToHistory = true } = req.body;

    if (!smiles || typeof smiles !== 'string' || smiles.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid SMILES chemical string'
      });
    }

    const cleanSmiles = smiles.trim();

    // 1. Syntax Validation
    const validation = chemistryCalculator.validateSmiles(cleanSmiles);
    if (!validation.valid) {
      return res.status(422).json({
        success: false,
        error: `Invalid SMILES syntax: ${validation.error}`
      });
    }

    // 2. Data Retrieval: PubChem PUG REST with In-Silico fallback
    let compoundData = await pubchemService.getCompoundBySmiles(cleanSmiles);
    let structureType = 'pubchem_png';
    let fallbackSvg = null;

    if (!compoundData) {
      // Use built-in cheminformatics engine
      const inSilico = chemistryCalculator.calculateAllDescriptors(cleanSmiles);
      fallbackSvg = chemistryCalculator.generateFallbackMolecularSvg(cleanSmiles);
      structureType = 'fallback_svg';

      compoundData = {
        name: name || 'Novel / Custom Candidate',
        iupacName: 'Derived via in-silico topological parsing',
        smiles: cleanSmiles,
        formula: inSilico.formula,
        molecularWeight: inSilico.molecularWeight,
        logP: inSilico.logP,
        hbd: inSilico.hbd,
        hba: inSilico.hba,
        tpsa: inSilico.tpsa,
        rotatableBonds: inSilico.rotatableBonds,
        structureImageUrl: null,
        fallbackSvg,
        source: 'In-Silico Cheminformatics Fallback Engine'
      };
    } else {
      // Overwrite name if user supplied an explicit label (e.g. Aspirin)
      if (name && name.trim()) {
        compoundData.name = name.trim();
      }

      // If PubChem didn't return logP (e.g. missing XLogP), compute it
      if (compoundData.logP === null || isNaN(compoundData.logP)) {
        compoundData.logP = chemistryCalculator.calculateLogP(cleanSmiles);
      }

      // Generate fallback SVG in case image fails to load in browser
      fallbackSvg = chemistryCalculator.generateFallbackMolecularSvg(cleanSmiles);
      compoundData.fallbackSvg = fallbackSvg;
    }

    // 3. Evaluate Lipinski Rule of Five and Veber criteria
    const evaluation = screeningEngine.evaluateDrugLikeness(compoundData);

    const fullResult = {
      success: true,
      compound: {
        cid: compoundData.cid || null,
        name: compoundData.name,
        iupacName: compoundData.iupacName,
        smiles: compoundData.smiles,
        formula: compoundData.formula,
        properties: {
          molecularWeight: compoundData.molecularWeight,
          logP: compoundData.logP,
          hbd: compoundData.hbd,
          hba: compoundData.hba,
          tpsa: compoundData.tpsa,
          rotatableBonds: compoundData.rotatableBonds
        },
        structureImageUrl: compoundData.structureImageUrl,
        fallbackSvg: compoundData.fallbackSvg || null,
        structureType,
        source: compoundData.source
      },
      evaluation
    };

    // 4. Save to screening history
    if (saveToHistory) {
      const historyEntry = storageService.addScreeningRecord({
        name: compoundData.name,
        smiles: compoundData.smiles,
        formula: compoundData.formula,
        properties: compoundData,
        violations: evaluation.violations,
        classification: evaluation.classification,
        source: compoundData.source
      });
      fullResult.historyId = historyEntry.id;
    }

    return res.json(fullResult);
  } catch (error) {
    console.error('[ScreenRoute] Error during screening analysis:', error);
    return res.status(500).json({
      success: false,
      error: `Screening analysis failed: ${error.message}`
    });
  }
});

module.exports = router;
