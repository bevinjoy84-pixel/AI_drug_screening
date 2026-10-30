/**
 * PharmaScreen AI - Comprehensive Test Suite
 * Validates chemistry algorithms, ML pipeline, storage, and API endpoints.
 */

const assert = require('assert');
const path = require('path');
const http = require('http');

const chemistry = require('../backend/services/chemistryCalculator');
const screening = require('../backend/services/screeningEngine');
const ml = require('../backend/services/mlService');
const storage = require('../backend/services/storageService');
const gemini = require('../backend/services/geminiService');

let passedTests = 0;
let totalTests = 0;

function it(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

async function itAsync(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

async function runTestSuite() {
  console.log('\n=======================================================');
  console.log('🔬 PharmaScreen AI - Full Test Suite');
  console.log('=======================================================\n');

  // 1. SMILES Validation
  console.log('--- 1. SMILES Syntax Validation ---');
  it('should accept valid SMILES notation (Aspirin)', () => {
    const res = chemistry.validateSmiles('CC(=O)Oc1ccccc1C(=O)O');
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.error, null);
  });

  it('should accept valid multi-ring and branch SMILES (Imatinib)', () => {
    const res = chemistry.validateSmiles('Cc1ccc(cc1Nc2nccc(n2)c3cccnc3)NC(=O)c4ccc(cc4)CN5CCN(CC5)C');
    assert.strictEqual(res.valid, true);
  });

  it('should reject unclosed parentheses', () => {
    const res = chemistry.validateSmiles('CC(=O)O(c1ccccc1');
    assert.strictEqual(res.valid, false);
    assert.match(res.error, /parenthesis/i);
  });

  it('should reject unmatched closing parenthesis', () => {
    const res = chemistry.validateSmiles('CC(=O)Oc1ccccc1)');
    assert.strictEqual(res.valid, false);
    assert.match(res.error, /parenthesis/i);
  });

  it('should reject unclosed brackets', () => {
    const res = chemistry.validateSmiles('CC[NH+');
    assert.strictEqual(res.valid, false);
    assert.match(res.error, /bracket/i);
  });

  it('should reject unpaired ring numbers', () => {
    const res = chemistry.validateSmiles('c1ccccc');
    assert.strictEqual(res.valid, false);
    assert.match(res.error, /ring/i);
  });

  it('should reject empty or whitespace input', () => {
    assert.strictEqual(chemistry.validateSmiles('').valid, false);
    assert.strictEqual(chemistry.validateSmiles('   ').valid, false);
    assert.strictEqual(chemistry.validateSmiles(null).valid, false);
  });

  // 2. In-Silico Molecular Graph & Descriptors
  console.log('\n--- 2. Molecular Topological Descriptors ---');
  it('should accurately calculate Aspirin descriptors', () => {
    const desc = chemistry.calculateAllDescriptors('CC(=O)Oc1ccccc1C(=O)O');
    assert.strictEqual(desc.formula, 'C9H8O4');
    assert.strictEqual(desc.molecularWeight, 180.16);
    assert.strictEqual(desc.hbd, 1);
    assert.strictEqual(desc.hba, 4);
    assert.ok(desc.logP >= 0.8 && desc.logP <= 1.5, `LogP was ${desc.logP}`);
    assert.strictEqual(desc.tpsa, 63.6);
    assert.strictEqual(desc.rotatableBonds, 3);
  });

  it('should accurately calculate Paracetamol descriptors', () => {
    const desc = chemistry.calculateAllDescriptors('CC(=O)Nc1ccc(O)cc1');
    assert.strictEqual(desc.formula, 'C8H9NO2');
    assert.strictEqual(desc.molecularWeight, 151.16);
    assert.strictEqual(desc.hbd, 2);
    assert.strictEqual(desc.hba, 3);
    assert.strictEqual(desc.rotatableBonds, 1);
  });

  it('should accurately calculate Ibuprofen descriptors', () => {
    const desc = chemistry.calculateAllDescriptors('CC(C)Cc1ccc(cc1)C(C)C(=O)O');
    assert.strictEqual(desc.formula, 'C13H18O2');
    assert.strictEqual(desc.molecularWeight, 206.28);
    assert.strictEqual(desc.hbd, 1);
    assert.strictEqual(desc.hba, 2);
    assert.ok(desc.logP >= 3.0 && desc.logP <= 4.0, `LogP was ${desc.logP}`);
    assert.strictEqual(desc.rotatableBonds, 4);
  });

  it('should accurately calculate Caffeine descriptors', () => {
    const desc = chemistry.calculateAllDescriptors('Cn1cnc2c1c(=O)n(c(=O)n2C)C');
    assert.strictEqual(desc.formula, 'C8H10N4O2');
    assert.strictEqual(desc.molecularWeight, 194.19);
    assert.strictEqual(desc.hbd, 0);
    assert.strictEqual(desc.rotatableBonds, 0);
  });

  it('should generate fallback SVG depiction', () => {
    const svg = chemistry.generateFallbackMolecularSvg('CC(=O)Oc1ccccc1C(=O)O');
    assert.ok(svg.includes('<svg'));
    assert.ok(svg.includes('</svg>'));
    assert.ok(svg.includes('bonds'));
  });

  // 3. Screening Engine
  console.log('\n--- 3. Lipinski Rule of 5 & Veber Evaluation ---');
  it('should classify Aspirin as Promising Candidate with 0 violations', () => {
    const desc = chemistry.calculateAllDescriptors('CC(=O)Oc1ccccc1C(=O)O');
    const result = screening.evaluateDrugLikeness(desc);
    assert.strictEqual(result.classification, 'Promising Candidate');
    assert.strictEqual(result.totalViolations, 0);
    assert.strictEqual(result.violations.mw, false);
    assert.strictEqual(result.violations.logP, false);
    assert.strictEqual(result.violations.hbd, false);
    assert.strictEqual(result.violations.hba, false);
  });

  it('should detect violations for heavy/lipophilic compounds', () => {
    const result = screening.evaluateDrugLikeness({
      molecularWeight: 650.0,
      logP: 6.2,
      hbd: 7,
      hba: 12,
      tpsa: 160.0,
      rotatableBonds: 15
    });
    assert.strictEqual(result.classification, 'Unfavorable');
    assert.strictEqual(result.totalViolations, 4);
    assert.strictEqual(result.veberViolations, 2);
    assert.strictEqual(result.violations.mw, true);
    assert.strictEqual(result.violations.logP, true);
    assert.strictEqual(result.violations.hbd, true);
    assert.strictEqual(result.violations.hba, true);
    assert.strictEqual(result.violations.veberRotB, true);
    assert.strictEqual(result.violations.veberTPSA, true);
  });

  it('should classify single violation as Needs Review', () => {
    const result = screening.evaluateDrugLikeness({
      molecularWeight: 520.0,
      logP: 3.0,
      hbd: 2,
      hba: 5,
      tpsa: 80.0,
      rotatableBonds: 4
    });
    assert.strictEqual(result.classification, 'Needs Review');
    assert.strictEqual(result.totalViolations, 1);
  });

  // 4. Machine Learning Engine
  console.log('\n--- 4. Machine Learning Classifier ---');
  it('should load benchmark dataset and train model', () => {
    const metrics = ml.train({ epochs: 300 });
    assert.ok(metrics.isCalculated);
    assert.ok(metrics.metrics.accuracy > 70, `Accuracy was ${metrics.metrics.accuracy}%`);
    assert.ok(metrics.metrics.precision >= 0);
    assert.ok(metrics.metrics.recall >= 0);
    assert.ok(metrics.metrics.f1Score >= 0);
    assert.strictEqual(metrics.featureImportance.length, 6);
  });

  it('should predict drug-likeness for candidate properties', () => {
    const pred = ml.predict({
      molecularWeight: 180.16,
      logP: 1.2,
      hbd: 1,
      hba: 4,
      tpsa: 63.6,
      rotatableBonds: 3
    });
    assert.ok(pred.predictedClass === 'Drug-like' || pred.predictedClass === 'Non-drug-like / High Risk');
    assert.ok(pred.probability >= 0 && pred.probability <= 1);
    assert.strictEqual(pred.featureContributions.length, 6);
  });

  // 5. Storage Service
  console.log('\n--- 5. Storage & Dataset Service ---');
  it('should retrieve compound reference catalog', () => {
    const list = storage.getAllCompounds();
    assert.ok(Array.isArray(list));
    assert.ok(list.length >= 20, `Catalog has ${list.length} compounds`);
  });

  it('should compute valid dashboard metrics without NaN', () => {
    const stats = storage.getDashboardMetrics();
    assert.ok(typeof stats.totalAnalyzed === 'number');
    assert.ok(!isNaN(stats.averageMw));
    assert.ok(!isNaN(stats.averageLogP));
    assert.ok(stats.mwDistribution['<200 Da'] !== undefined);
  });

  it('should add, retrieve, and delete screening history records', () => {
    const initialCount = storage.getScreeningHistory().length;
    const record = storage.addScreeningRecord({
      name: 'UnitTestMolecule',
      smiles: 'c1ccccc1',
      formula: 'C6H6',
      molecularWeight: 78.11,
      logP: 2.13,
      hbd: 0,
      hba: 0,
      tpsa: 0,
      rotatableBonds: 0,
      classification: 'Promising Candidate'
    });

    assert.ok(record.id);
    const updatedHistory = storage.getScreeningHistory();
    assert.strictEqual(updatedHistory.length, initialCount + 1);

    const deleted = storage.deleteScreeningRecord(record.id);
    assert.strictEqual(deleted, true);
    assert.strictEqual(storage.getScreeningHistory().length, initialCount);
  });

  it('should generate valid CSV format with header', () => {
    const list = storage.getAllCompounds();
    const csv = storage.exportToCsv(list);
    assert.ok(csv.startsWith('Name,SMILES,Formula,'));
    assert.ok(csv.includes('\n'));
  });

  // 6. Gemini Service Fallback
  console.log('\n--- 6. Gemini & Heuristic AI Explainer ---');
  await itAsync('should generate structured 4-tier medicinal chemistry explanation', async () => {
    const exp = await gemini.generateCompoundExplanation({
      name: 'Aspirin',
      smiles: 'CC(=O)Oc1ccccc1C(=O)O',
      formula: 'C9H8O4',
      molecularWeight: 180.16,
      logP: 1.19,
      hbd: 1,
      hba: 4,
      tpsa: 63.6,
      rotatableBonds: 3,
      classification: 'Promising Candidate',
      violations: {},
      source: 'Test Harness'
    });

    assert.ok(exp.content);
    assert.ok(exp.content.includes('Chemical Profile'));
    assert.ok(exp.content.includes('Drug-Likeness'));
    assert.ok(exp.content.includes('Pharmacokinetic'));
    assert.ok(exp.content.includes('Optimization'));
    assert.ok(exp.disclaimer);
  });

  // 7. Express HTTP API Routes
  console.log('\n--- 7. Express HTTP Endpoints ---');
  const app = require('../backend/server');
  const testServer = http.createServer(app);

  await new Promise(resolve => testServer.listen(0, '127.0.0.1', resolve));
  const port = testServer.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  async function reqJson(path, options = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, body };
  }

  await itAsync('GET /api/health returns 200 and healthy status', async () => {
    const { status, body } = await reqJson('/api/health');
    assert.strictEqual(status, 200);
    assert.strictEqual(body.status, 'healthy');
  });

  await itAsync('GET /api/dashboard/stats returns aggregate metrics', async () => {
    const { status, body } = await reqJson('/api/dashboard/stats');
    assert.strictEqual(status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.totalAnalyzed >= 0);
  });

  await itAsync('POST /api/screen/validate validates SMILES strings', async () => {
    const { status, body } = await reqJson('/api/screen/validate', {
      method: 'POST',
      body: JSON.stringify({ smiles: 'CC(=O)Oc1ccccc1C(=O)O' })
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(body.valid, true);
  });

  await itAsync('POST /api/screen/analyze analyzes compound', async () => {
    const { status, body } = await reqJson('/api/screen/analyze', {
      method: 'POST',
      body: JSON.stringify({ smiles: 'CC(=O)Oc1ccccc1C(=O)O', name: 'Aspirin', saveToHistory: false })
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.compound.name, 'Aspirin');
    assert.strictEqual(body.evaluation.classification, 'Promising Candidate');
  });

  await itAsync('GET /api/dataset returns compound catalog', async () => {
    const { status, body } = await reqJson('/api/dataset');
    assert.strictEqual(status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.compounds.length > 0);
  });

  await itAsync('GET /api/ml/metrics returns evaluated metrics', async () => {
    const { status, body } = await reqJson('/api/ml/metrics');
    assert.strictEqual(status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.metrics.accuracy > 0);
  });

  await itAsync('POST /api/ml/predict performs inference', async () => {
    const { status, body } = await reqJson('/api/ml/predict', {
      method: 'POST',
      body: JSON.stringify({
        properties: { mw: 180.16, logP: 1.2, hbd: 1, hba: 4, tpsa: 63.6, rotatableBonds: 3 }
      })
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.prediction.predictedClass);
  });

  await itAsync('ALL /api/unmatched returns 404 JSON', async () => {
    const { status, body } = await reqJson('/api/nonexistent');
    assert.strictEqual(status, 404);
    assert.strictEqual(body.success, false);
  });

  testServer.close();

  // Summary
  console.log('\n=======================================================');
  console.log(`Results: ${passedTests} passed, ${totalTests - passedTests} failed out of ${totalTests} tests`);
  console.log('=======================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
