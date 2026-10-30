/**
 * PharmaScreen AI - Storage & Dataset Service
 * Persistent file storage for compound catalog, screening history, and statistical aggregations.
 */

const fs = require('fs');
const path = require('path');

const SAMPLE_DRUGS_PATH = path.join(__dirname, '../../data/sample_drugs.json');
const HISTORY_PATH = path.join(__dirname, '../../data/history.json');

// Ensure directory exists
function ensureFileExists(filePath, defaultContent = '[]') {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, defaultContent, 'utf8');
  }
}

/**
 * Load all compounds from the drug catalog
 */
function getAllCompounds() {
  ensureFileExists(SAMPLE_DRUGS_PATH, '[]');
  try {
    const raw = fs.readFileSync(SAMPLE_DRUGS_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[StorageService] Error reading sample drugs:', err.message);
    return [];
  }
}

/**
 * Load screening history
 */
function getScreeningHistory() {
  ensureFileExists(HISTORY_PATH, '[]');
  try {
    const raw = fs.readFileSync(HISTORY_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[StorageService] Error reading history:', err.message);
    return [];
  }
}

/**
 * Save record to screening history
 */
function addScreeningRecord(record) {
  ensureFileExists(HISTORY_PATH, '[]');
  const history = getScreeningHistory();

  const newEntry = {
    id: `screen-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    name: record.name || 'Screened Compound',
    smiles: record.smiles,
    formula: record.formula || '',
    properties: {
      molecularWeight: parseFloat(record.molecularWeight || record.properties?.molecularWeight || 0),
      logP: record.logP !== undefined ? parseFloat(record.logP) : (record.properties?.logP !== undefined ? parseFloat(record.properties.logP) : null),
      hbd: parseInt(record.hbd || record.properties?.hbd || 0, 10),
      hba: parseInt(record.hba || record.properties?.hba || 0, 10),
      tpsa: parseFloat(record.tpsa || record.properties?.tpsa || 0),
      rotatableBonds: parseInt(record.rotatableBonds || record.properties?.rotatableBonds || 0, 10)
    },
    violations: record.violations || {},
    classification: record.classification || 'Unknown',
    source: record.source || 'In-Silico Cheminformatics Engine',
    aiSummary: record.aiSummary || ''
  };

  history.unshift(newEntry);

  // Keep latest 250 records
  if (history.length > 250) {
    history.pop();
  }

  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2), 'utf8');
  return newEntry;
}

/**
 * Delete a screening record by ID
 */
function deleteScreeningRecord(id) {
  const history = getScreeningHistory();
  const filtered = history.filter(item => item.id !== id);
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(filtered, null, 2), 'utf8');
  return filtered.length !== history.length;
}

/**
 * Clear all history
 */
function clearHistory() {
  fs.writeFileSync(HISTORY_PATH, JSON.stringify([], null, 2), 'utf8');
  return true;
}

/**
 * Calculate dynamic dashboard aggregate metrics combining catalog & history
 */
function getDashboardMetrics() {
  const catalog = getAllCompounds();
  const history = getScreeningHistory();

  // Combine unique SMILES
  const uniqueCompoundsMap = new Map();

  for (const c of catalog) {
    uniqueCompoundsMap.set(c.smiles, {
      mw: c.molecularWeight,
      logP: c.logP,
      classification: c.classification,
      violations: c.lipinskiViolations
    });
  }

  for (const h of history) {
    if (!uniqueCompoundsMap.has(h.smiles)) {
      uniqueCompoundsMap.set(h.smiles, {
        mw: h.properties.molecularWeight,
        logP: h.properties.logP,
        classification: h.classification,
        violations: h.violations.totalViolations || 0
      });
    }
  }

  const allCompounds = Array.from(uniqueCompoundsMap.values());
  const totalAnalyzed = allCompounds.length;

  let promisingCount = 0;
  let needsReviewCount = 0;
  let unfavorableCount = 0;

  let totalMw = 0;
  let validLogPCount = 0;
  let totalLogP = 0;

  // MW distribution bins
  // <200, 200-350, 350-500, >500
  const mwDistribution = {
    '<200 Da': 0,
    '200-350 Da': 0,
    '350-500 Da': 0,
    '>500 Da': 0
  };

  for (const c of allCompounds) {
    if (c.classification === 'Promising Candidate') promisingCount++;
    else if (c.classification === 'Needs Review') needsReviewCount++;
    else unfavorableCount++;

    if (c.mw) {
      totalMw += c.mw;
      if (c.mw < 200) mwDistribution['<200 Da']++;
      else if (c.mw <= 350) mwDistribution['200-350 Da']++;
      else if (c.mw <= 500) mwDistribution['350-500 Da']++;
      else mwDistribution['>500 Da']++;
    }

    if (c.logP !== null && !isNaN(c.logP)) {
      totalLogP += c.logP;
      validLogPCount++;
    }
  }

  const averageMw = totalAnalyzed > 0 ? parseFloat((totalMw / totalAnalyzed).toFixed(1)) : 0;
  const averageLogP = validLogPCount > 0 ? parseFloat((totalLogP / validLogPCount).toFixed(2)) : 0;

  return {
    totalAnalyzed,
    promisingCount,
    needsReviewCount,
    unfavorableCount,
    averageMw,
    averageLogP,
    classificationDistribution: {
      promising: promisingCount,
      needsReview: needsReviewCount,
      unfavorable: unfavorableCount
    },
    mwDistribution,
    catalogCount: catalog.length,
    historyCount: history.length,
    recentHistory: history.slice(0, 5)
  };
}

/**
 * Format records into standard CSV
 */
function exportToCsv(records) {
  if (!records || records.length === 0) {
    return 'Name,SMILES,Formula,Molecular Weight (Da),LogP,HBD,HBA,TPSA (A2),Rotatable Bonds,Lipinski Violations,Classification,Source\n';
  }

  const headers = [
    'Name',
    'SMILES',
    'Formula',
    'Molecular Weight (Da)',
    'LogP',
    'H-Bond Donors',
    'H-Bond Acceptors',
    'TPSA (A2)',
    'Rotatable Bonds',
    'Violations',
    'Classification',
    'Is Demonstration Data'
  ];

  const rows = records.map(r => {
    const mw = r.molecularWeight || r.properties?.molecularWeight || '0';
    const logP = r.logP !== undefined ? r.logP : (r.properties?.logP !== undefined ? r.properties.logP : '');
    const hbd = r.hbd !== undefined ? r.hbd : (r.properties?.hbd !== undefined ? r.properties.hbd : '0');
    const hba = r.hba !== undefined ? r.hba : (r.properties?.hba !== undefined ? r.properties.hba : '0');
    const tpsa = r.tpsa !== undefined ? r.tpsa : (r.properties?.tpsa !== undefined ? r.properties.tpsa : '0');
    const rotB = r.rotatableBonds !== undefined ? r.rotatableBonds : (r.properties?.rotatableBonds !== undefined ? r.properties.rotatableBonds : '0');
    const viol = r.lipinskiViolations !== undefined ? r.lipinskiViolations : (r.violations?.totalViolations !== undefined ? r.violations.totalViolations : '0');
    const isDemo = r.isDemo ? 'Yes' : 'No (Screened)';

    return [
      `"${(r.name || 'Unnamed').replace(/"/g, '""')}"`,
      `"${(r.smiles || '').replace(/"/g, '""')}"`,
      `"${r.formula || ''}"`,
      mw,
      logP,
      hbd,
      hba,
      tpsa,
      rotB,
      viol,
      `"${r.classification || ''}"`,
      isDemo
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

module.exports = {
  getAllCompounds,
  getScreeningHistory,
  addScreeningRecord,
  deleteScreeningRecord,
  clearHistory,
  getDashboardMetrics,
  exportToCsv
};
