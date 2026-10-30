/**
 * PharmaScreen AI - Storage & Dataset Service
 * Persistent file storage for compound catalog, screening history, and statistical aggregations.
 */

const fs = require('fs');
const path = require('path');

const SAMPLE_DRUGS_PATH = path.join(__dirname, '../../data/sample_drugs.json');
const HISTORY_PATH = path.join(__dirname, '../../data/history.json');

// Ensure directory and file exists safely
function ensureFileExists(filePath, defaultContent = '[]') {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, defaultContent, 'utf8');
    }
  } catch (err) {
    console.error(`[StorageService] Failed to ensure file exists at ${filePath}:`, err.message);
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
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
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

  const rawMw = record.molecularWeight !== undefined ? record.molecularWeight : record.properties?.molecularWeight;
  const mw = (rawMw !== null && rawMw !== undefined && !isNaN(parseFloat(rawMw)))
    ? parseFloat(parseFloat(rawMw).toFixed(2))
    : 0;

  const rawLogP = record.logP !== undefined ? record.logP : record.properties?.logP;
  const cleanLogP = (rawLogP !== null && rawLogP !== undefined && !isNaN(parseFloat(rawLogP)))
    ? parseFloat(parseFloat(rawLogP).toFixed(2))
    : null;

  const rawHbd = record.hbd !== undefined ? record.hbd : record.properties?.hbd;
  const hbd = (rawHbd !== null && rawHbd !== undefined && !isNaN(parseInt(rawHbd, 10)))
    ? parseInt(rawHbd, 10)
    : 0;

  const rawHba = record.hba !== undefined ? record.hba : record.properties?.hba;
  const hba = (rawHba !== null && rawHba !== undefined && !isNaN(parseInt(rawHba, 10)))
    ? parseInt(rawHba, 10)
    : 0;

  const rawTpsa = record.tpsa !== undefined ? record.tpsa : record.properties?.tpsa;
  const tpsa = (rawTpsa !== null && rawTpsa !== undefined && !isNaN(parseFloat(rawTpsa)))
    ? parseFloat(parseFloat(rawTpsa).toFixed(1))
    : 0;

  const rawRotB = record.rotatableBonds !== undefined ? record.rotatableBonds : record.properties?.rotatableBonds;
  const rotatableBonds = (rawRotB !== null && rawRotB !== undefined && !isNaN(parseInt(rawRotB, 10)))
    ? parseInt(rawRotB, 10)
    : 0;

  const newEntry = {
    id: `screen-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    name: record.name || 'Screened Compound',
    smiles: record.smiles,
    formula: record.formula || '',
    properties: {
      molecularWeight: mw,
      logP: cleanLogP,
      hbd,
      hba,
      tpsa,
      rotatableBonds
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

  try {
    fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2), 'utf8');
  } catch (err) {
    console.error('[StorageService] Error writing history file:', err.message);
  }
  return newEntry;
}

/**
 * Delete a screening record by ID
 */
function deleteScreeningRecord(id) {
  const history = getScreeningHistory();
  const filtered = history.filter(item => item && item.id !== id);
  const deleted = filtered.length !== history.length;
  if (deleted) {
    try {
      fs.writeFileSync(HISTORY_PATH, JSON.stringify(filtered, null, 2), 'utf8');
    } catch (err) {
      console.error('[StorageService] Error deleting record:', err.message);
    }
  }
  return deleted;
}

/**
 * Clear all history
 */
function clearHistory() {
  try {
    fs.writeFileSync(HISTORY_PATH, JSON.stringify([], null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[StorageService] Error clearing history:', err.message);
    return false;
  }
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
    if (!c || !c.smiles) continue;
    uniqueCompoundsMap.set(c.smiles, {
      mw: typeof c.molecularWeight === 'number' ? c.molecularWeight : parseFloat(c.molecularWeight || 0),
      logP: (c.logP !== null && c.logP !== undefined && !isNaN(parseFloat(c.logP))) ? parseFloat(c.logP) : null,
      classification: c.classification || 'Unknown',
      violations: c.lipinskiViolations || 0
    });
  }

  for (const h of history) {
    if (!h || !h.smiles) continue;
    if (!uniqueCompoundsMap.has(h.smiles)) {
      const hMw = parseFloat(h.properties?.molecularWeight || h.molecularWeight || 0);
      const rawLogP = h.properties?.logP !== undefined ? h.properties.logP : h.logP;
      const hLogP = (rawLogP !== null && rawLogP !== undefined && !isNaN(parseFloat(rawLogP)))
        ? parseFloat(rawLogP)
        : null;

      uniqueCompoundsMap.set(h.smiles, {
        mw: hMw,
        logP: hLogP,
        classification: h.classification || 'Unknown',
        violations: h.violations?.totalViolations ?? h.lipinskiViolations ?? 0
      });
    }
  }

  const allCompounds = Array.from(uniqueCompoundsMap.values());
  const totalAnalyzed = allCompounds.length;

  let promisingCount = 0;
  let needsReviewCount = 0;
  let unfavorableCount = 0;

  let totalMw = 0;
  let validMwCount = 0;
  let validLogPCount = 0;
  let totalLogP = 0;

  // MW distribution bins: <200, 200-350, 350-500, >500
  const mwDistribution = {
    '<200 Da': 0,
    '200-350 Da': 0,
    '350-500 Da': 0,
    '>500 Da': 0
  };

  for (const c of allCompounds) {
    if (c.classification === 'Promising Candidate') promisingCount++;
    else if (c.classification === 'Needs Review') needsReviewCount++;
    else if (c.classification === 'Unfavorable') unfavorableCount++;
    else needsReviewCount++;

    if (c.mw && !isNaN(c.mw) && c.mw > 0) {
      totalMw += c.mw;
      validMwCount++;
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

  const averageMw = validMwCount > 0 ? parseFloat((totalMw / validMwCount).toFixed(1)) : 0;
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
      logP !== null && logP !== undefined ? logP : '',
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
