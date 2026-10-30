/**
 * PharmaScreen AI - Machine Learning Classification Workflow
 * Implements a genuine Logistic Regression classifier in pure JavaScript.
 * Calculates exact Accuracy, Precision, Recall, F1, Confusion Matrix, and Feature Importance
 * on a held-out test split of the curated benchmark dataset.
 */

const fs = require('fs');
const path = require('path');

const BENCHMARK_FILE = path.join(__dirname, '../../data/benchmark_ml_dataset.json');

const FEATURE_NAMES = [
  'Molecular Weight (MW)',
  'LogP (Lipophilicity)',
  'H-Bond Donors (HBD)',
  'H-Bond Acceptors (HBA)',
  'TPSA (Polar Surface)',
  'Rotatable Bonds'
];

class LogisticRegressionModel {
  constructor() {
    this.weights = [];
    this.bias = 0;
    this.scaler = { means: [], stds: [] };
    this.isTrained = false;
    this.trainingMetadata = null;
    this.metrics = null;
    this.testDataset = [];
    this.trainDataset = [];
  }

  // Sigmoid activation function
  sigmoid(z) {
    if (z < -40) return 0;
    if (z > 40) return 1;
    return 1 / (1 + Math.exp(-z));
  }

  // Standardize feature vector using training statistics
  standardize(x) {
    return x.map((val, idx) => {
      const mean = this.scaler.means[idx] || 0;
      const std = this.scaler.stds[idx] || 1;
      return std === 0 ? 0 : (val - mean) / std;
    });
  }

  /**
   * Train the model with genuine train/test split and calculate verified metrics
   */
  train({ testSplitRatio = 0.20, learningRate = 0.08, epochs = 600, l2Regularization = 0.001 } = {}) {
    // 1. Load dataset
    if (!fs.existsSync(BENCHMARK_FILE)) {
      throw new Error(`Benchmark dataset not found at ${BENCHMARK_FILE}`);
    }
    const rawData = JSON.parse(fs.readFileSync(BENCHMARK_FILE, 'utf8'));

    // Extract feature vectors: [mw, logP, hbd, hba, tpsa, rotatableBonds]
    const dataset = rawData.map(item => ({
      name: item.name,
      smiles: item.smiles,
      x: [
        parseFloat(item.mw),
        parseFloat(item.logP),
        parseFloat(item.hbd),
        parseFloat(item.hba),
        parseFloat(item.tpsa),
        parseFloat(item.rotatableBonds)
      ],
      y: item.label
    }));

    // 2. Stratified train/test split for reproducibility
    const pos = dataset.filter(d => d.y === 1);
    const neg = dataset.filter(d => d.y === 0);

    const testPosCount = Math.max(1, Math.round(pos.length * testSplitRatio));
    const testNegCount = Math.max(1, Math.round(neg.length * testSplitRatio));

    // Deterministic shuffle with seeded sort
    const deterministicSort = (a, b) => (a.x[0] * 31 + a.x[1] * 17) - (b.x[0] * 31 + b.x[1] * 17);
    pos.sort(deterministicSort);
    neg.sort(deterministicSort);

    const testData = [...pos.slice(0, testPosCount), ...neg.slice(0, testNegCount)];
    const trainData = [...pos.slice(testPosCount), ...neg.slice(testNegCount)];

    this.trainDataset = trainData;
    this.testDataset = testData;

    const numFeatures = FEATURE_NAMES.length;

    // 3. Compute mean and standard deviation on training data only
    const means = new Array(numFeatures).fill(0);
    const stds = new Array(numFeatures).fill(0);

    for (let f = 0; f < numFeatures; f++) {
      let sum = 0;
      for (const item of trainData) sum += item.x[f];
      means[f] = sum / trainData.length;

      let varianceSum = 0;
      for (const item of trainData) varianceSum += Math.pow(item.x[f] - means[f], 2);
      stds[f] = Math.sqrt(varianceSum / (trainData.length - 1)) || 1;
    }

    this.scaler = { means, stds };

    // Standardize training set
    const X_train = trainData.map(d => this.standardize(d.x));
    const y_train = trainData.map(d => d.y);

    // 4. Initialize weights
    this.weights = new Array(numFeatures).fill(0);
    this.bias = 0;

    // 5. Gradient Descent with L2 regularization
    const m = X_train.length;
    for (let epoch = 0; epoch < epochs; epoch++) {
      const gradW = new Array(numFeatures).fill(0);
      let gradB = 0;

      for (let i = 0; i < m; i++) {
        const xi = X_train[i];
        const yi = y_train[i];

        // Linear combination: w·x + b
        let z = this.bias;
        for (let j = 0; j < numFeatures; j++) {
          z += this.weights[j] * xi[j];
        }

        const p = this.sigmoid(z);
        const error = p - yi;

        for (let j = 0; j < numFeatures; j++) {
          gradW[j] += error * xi[j];
        }
        gradB += error;
      }

      // Update weights with L2 penalty: w = w - lr * (grad/m + lambda * w)
      for (let j = 0; j < numFeatures; j++) {
        const l2Term = l2Regularization * this.weights[j];
        this.weights[j] -= learningRate * ((gradW[j] / m) + l2Term);
      }
      this.bias -= learningRate * (gradB / m);
    }

    this.isTrained = true;

    // 6. GENUINE EVALUATION ON HELD-OUT TEST SET
    const X_test = testData.map(d => this.standardize(d.x));
    const y_test = testData.map(d => d.y);

    let tp = 0; // True Positive
    let tn = 0; // True Negative
    let fp = 0; // False Positive
    let fn = 0; // False Negative

    const testPredictions = [];

    for (let i = 0; i < testData.length; i++) {
      const xi = X_test[i];
      const yi = y_test[i];

      let z = this.bias;
      for (let j = 0; j < numFeatures; j++) {
        z += this.weights[j] * xi[j];
      }
      const prob = this.sigmoid(z);
      const pred = prob >= 0.5 ? 1 : 0;

      if (yi === 1 && pred === 1) tp++;
      else if (yi === 0 && pred === 0) tn++;
      else if (yi === 0 && pred === 1) fp++;
      else if (yi === 1 && pred === 0) fn++;

      testPredictions.push({
        name: testData[i].name,
        actual: yi,
        predicted: pred,
        probability: parseFloat(prob.toFixed(4))
      });
    }

    const totalTest = testData.length;
    const accuracy = totalTest > 0 ? (tp + tn) / totalTest : 0;
    const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
    const recall = (tp + fn) > 0 ? tp / (tp + fn) : 0;
    const f1Score = (precision + recall) > 0 ? 2 * (precision * recall) / (precision + recall) : 0;

    // 7. GENUINE FEATURE IMPORTANCE
    // Standardized feature coefficients directly express relative log-odds weight
    const absWeights = this.weights.map(w => Math.abs(w));
    const sumAbsWeights = absWeights.reduce((a, b) => a + b, 0) || 1;

    const featureImportance = FEATURE_NAMES.map((name, idx) => ({
      feature: name,
      weight: parseFloat(this.weights[idx].toFixed(4)),
      absoluteWeight: parseFloat(absWeights[idx].toFixed(4)),
      importancePercentage: parseFloat(((absWeights[idx] / sumAbsWeights) * 100).toFixed(1)),
      direction: this.weights[idx] > 0 ? 'Favorable for Drug-likeness' : 'Liability / Penalizing'
    })).sort((a, b) => b.absoluteWeight - a.absoluteWeight);

    this.metrics = {
      isCalculated: true,
      totalSamples: rawData.length,
      trainSampleCount: trainData.length,
      testSampleCount: testData.length,
      metrics: {
        accuracy: parseFloat((accuracy * 100).toFixed(1)),
        precision: parseFloat((precision * 100).toFixed(1)),
        recall: parseFloat((recall * 100).toFixed(1)),
        f1Score: parseFloat((f1Score * 100).toFixed(1))
      },
      confusionMatrix: {
        matrix: [
          [tn, fp],
          [fn, tp]
        ],
        labels: {
          trueNegative: tn,
          falsePositive: fp,
          falseNegative: fn,
          truePositive: tp
        },
        description: 'Evaluated on genuine unseen held-out test molecules'
      },
      featureImportance,
      hyperparameters: {
        epochs,
        learningRate,
        testSplitRatio,
        l2Regularization
      },
      trainedAt: new Date().toISOString()
    };

    return this.metrics;
  }

  /**
   * Predict drug-likeness for an arbitrary compound given its molecular properties
   */
  predict(properties) {
    if (!this.isTrained) {
      this.train();
    }

    const rawFeatures = [
      parseFloat(properties.molecularWeight || properties.mw || 0),
      parseFloat(properties.logP !== undefined ? properties.logP : 0),
      parseFloat(properties.hbd || 0),
      parseFloat(properties.hba || 0),
      parseFloat(properties.tpsa || 0),
      parseFloat(properties.rotatableBonds || 0)
    ];

    const standardizedFeatures = this.standardize(rawFeatures);

    let z = this.bias;
    const featureContributions = [];

    for (let j = 0; j < FEATURE_NAMES.length; j++) {
      const contrib = this.weights[j] * standardizedFeatures[j];
      z += contrib;
      featureContributions.push({
        feature: FEATURE_NAMES[j],
        rawValue: rawFeatures[j],
        standardizedValue: parseFloat(standardizedFeatures[j].toFixed(2)),
        weight: parseFloat(this.weights[j].toFixed(3)),
        contribution: parseFloat(contrib.toFixed(3)),
        impact: contrib >= 0 ? 'Positive' : 'Negative'
      });
    }

    const probability = this.sigmoid(z);
    const predictedClass = probability >= 0.5 ? 'Drug-like' : 'Non-drug-like / High Risk';
    const confidence = parseFloat((Math.abs(probability - 0.5) * 2 * 100).toFixed(1));

    return {
      predictedClass,
      probability: parseFloat(probability.toFixed(3)),
      drugLikenessScore: parseFloat((probability * 100).toFixed(1)),
      confidencePercentage: confidence,
      logitScore: parseFloat(z.toFixed(3)),
      featureContributions: featureContributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)),
      modelStatus: 'Calculated using trained JavaScript Logistic Classifier on benchmark dataset'
    };
  }

  getMetrics() {
    if (!this.isTrained) {
      return this.train();
    }
    return this.metrics;
  }
}

// Singleton instance
const mlServiceInstance = new LogisticRegressionModel();

// Train immediately on startup so metrics are ready
try {
  mlServiceInstance.train();
} catch (err) {
  console.warn('[MLService] Initial training deferred:', err.message);
}

module.exports = mlServiceInstance;
