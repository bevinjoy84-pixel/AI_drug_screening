/**
 * PharmaScreen AI - Machine Learning Prediction Controller
 * Displays genuine evaluation metrics, confusion matrix, feature importance,
 * and allows live compound inference and verified model retraining.
 */

const MlEngineController = {
  currentMetrics: null,

  init() {
    this.bindEvents();
    this.loadModelMetrics();
  },

  bindEvents() {
    const predictBtn = document.getElementById('runMlPredictBtn');
    const loadFromScreenBtn = document.getElementById('loadFromScreenToMlBtn');
    const retrainBtn = document.getElementById('executeRetrainBtn');

    if (predictBtn) {
      predictBtn.addEventListener('click', () => this.handleCustomPrediction());
    }

    if (loadFromScreenBtn) {
      loadFromScreenBtn.addEventListener('click', () => this.populateFromCurrentScreen());
    }

    if (retrainBtn) {
      retrainBtn.addEventListener('click', () => this.handleRetrainModel());
    }
  },

  async loadModelMetrics() {
    try {
      const res = await API.getMLMetrics();
      if (!res.success || !res.data) {
        throw new Error('Failed to load ML metrics');
      }

      this.currentMetrics = res.data;
      this.renderMetrics(res.data);
    } catch (err) {
      console.error('Error loading ML metrics:', err.message);
      window.App.notify('Could not load ML metrics', 'error');
    }
  },

  renderMetrics(data) {
    const { metrics, confusionMatrix, featureImportance, hyperparameters, trainSampleCount, testSampleCount, trainedAt } = data;

    // 1. Metric Badges
    const accEl = document.getElementById('mlMetricAccuracy');
    const precEl = document.getElementById('mlMetricPrecision');
    const recEl = document.getElementById('mlMetricRecall');
    const f1El = document.getElementById('mlMetricF1');
    const sampleMetaEl = document.getElementById('mlSampleSplitMeta');

    if (accEl) accEl.textContent = `${metrics.accuracy}%`;
    if (precEl) precEl.textContent = `${metrics.precision}%`;
    if (recEl) recEl.textContent = `${metrics.recall}%`;
    if (f1El) f1El.textContent = `${metrics.f1Score}%`;

    if (sampleMetaEl) {
      sampleMetaEl.textContent = `Trained on ${trainSampleCount} compounds | Evaluated on ${testSampleCount} unseen test compounds (${(hyperparameters.testSplitRatio * 100).toFixed(0)}% held-out test split)`;
    }

    // 2. Genuine Confusion Matrix (2x2)
    const m = confusionMatrix.labels;
    const tnEl = document.getElementById('cmTrueNegative');
    const fpEl = document.getElementById('cmFalsePositive');
    const fnEl = document.getElementById('cmFalseNegative');
    const tpEl = document.getElementById('cmTruePositive');

    if (tnEl) tnEl.textContent = m.trueNegative;
    if (fpEl) fpEl.textContent = m.falsePositive;
    if (fnEl) fnEl.textContent = m.falseNegative;
    if (tpEl) tpEl.textContent = m.truePositive;

    // 3. Genuine Feature Importance Table / Bars
    const fiContainer = document.getElementById('mlFeatureImportanceList');
    if (fiContainer && featureImportance) {
      fiContainer.innerHTML = featureImportance.map(f => {
        const isLiability = f.weight < 0;
        const barColor = isLiability ? '#ef4444' : '#10b981';

        return `
          <div class="feature-importance-row">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <span class="feature-name text-light font-medium">${f.feature}</span>
              <div class="d-flex align-items-center gap-2">
                <span class="text-xs font-mono ${isLiability ? 'text-danger' : 'text-success'}">Weight: ${f.weight.toFixed(3)}</span>
                <span class="badge ${isLiability ? 'badge-danger' : 'badge-success'} text-xs">${f.importancePercentage}%</span>
              </div>
            </div>
            <div class="progress-bar-track">
              <div class="progress-bar-fill" style="width: ${Math.min(100, f.importancePercentage * 2.5)}%; background-color: ${barColor};"></div>
            </div>
            <div class="text-xs text-slate-400 mt-1">
              Impact: <span class="${isLiability ? 'text-amber-400' : 'text-emerald-400'}">${f.direction}</span>
            </div>
          </div>
        `;
      }).join('');
    }

    // 4. Update hyperparameters form if available
    const splitInput = document.getElementById('retrainSplitInput');
    const lrInput = document.getElementById('retrainLrInput');
    const epochsInput = document.getElementById('retrainEpochsInput');

    if (splitInput) splitInput.value = hyperparameters.testSplitRatio;
    if (lrInput) lrInput.value = hyperparameters.learningRate;
    if (epochsInput) epochsInput.value = hyperparameters.epochs;
  },

  populateFromCurrentScreen() {
    if (!window.currentScreeningResult) {
      window.App.notify('Screen a compound in the Drug Screening module first', 'warning');
      return;
    }

    const props = window.currentScreeningResult.compound.properties;
    document.getElementById('mlInputMw').value = props.molecularWeight;
    document.getElementById('mlInputLogP').value = props.logP !== null ? props.logP : 1.5;
    document.getElementById('mlInputHbd').value = props.hbd;
    document.getElementById('mlInputHba').value = props.hba;
    document.getElementById('mlInputTpsa').value = props.tpsa;
    document.getElementById('mlInputRotb').value = props.rotatableBonds;

    window.App.notify(`Loaded properties for "${window.currentScreeningResult.compound.name}" into ML Predictor`, 'info');
    this.handleCustomPrediction();
  },

  async handleCustomPrediction() {
    const mw = parseFloat(document.getElementById('mlInputMw')?.value || 0);
    const logP = parseFloat(document.getElementById('mlInputLogP')?.value || 0);
    const hbd = parseInt(document.getElementById('mlInputHbd')?.value || 0, 10);
    const hba = parseInt(document.getElementById('mlInputHba')?.value || 0, 10);
    const tpsa = parseFloat(document.getElementById('mlInputTpsa')?.value || 0);
    const rotatableBonds = parseInt(document.getElementById('mlInputRotb')?.value || 0, 10);

    const predictBtn = document.getElementById('runMlPredictBtn');
    if (predictBtn) {
      predictBtn.disabled = true;
      predictBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Running Logistic Inference...';
    }

    try {
      const res = await API.predictDrugLikeness({
        molecularWeight: mw,
        logP,
        hbd,
        hba,
        tpsa,
        rotatableBonds
      });

      if (!res.success || !res.prediction) {
        throw new Error(res.error || 'Prediction calculation failed');
      }

      this.renderPredictionOutput(res.prediction);
    } catch (err) {
      window.App.notify(`Prediction Error: ${err.message}`, 'error');
    } finally {
      if (predictBtn) {
        predictBtn.disabled = false;
        predictBtn.innerHTML = '<i class="fas fa-calculator"></i> Predict Drug-Likeness Probability';
      }
    }
  },

  renderPredictionOutput(pred) {
    const card = document.getElementById('mlPredictionResultCard');
    const classEl = document.getElementById('mlResultClass');
    const probEl = document.getElementById('mlResultProb');
    const barEl = document.getElementById('mlResultProbBar');
    const confEl = document.getElementById('mlResultConfidence');
    const logitEl = document.getElementById('mlResultLogit');
    const contribList = document.getElementById('mlFeatureContributionsList');

    if (card) card.classList.remove('d-none');

    const isDrugLike = pred.predictedClass === 'Drug-like';

    if (classEl) {
      classEl.textContent = pred.predictedClass;
      classEl.className = isDrugLike ? 'status-badge status-promising' : 'status-badge status-unfavorable';
    }

    if (probEl) probEl.textContent = `${pred.drugLikenessScore}%`;
    if (barEl) {
      barEl.style.width = `${pred.drugLikenessScore}%`;
      barEl.style.backgroundColor = isDrugLike ? '#10b981' : '#ef4444';
    }

    if (confEl) confEl.textContent = `${pred.confidencePercentage}%`;
    if (logitEl) logitEl.textContent = pred.logitScore;

    if (contribList && pred.featureContributions) {
      contribList.innerHTML = pred.featureContributions.map(c => `
        <div class="d-flex justify-content-between align-items-center py-1 border-b border-slate-800 text-xs">
          <span class="text-slate-300">${c.feature} (${c.rawValue})</span>
          <span class="font-mono ${c.contribution >= 0 ? 'text-emerald-400' : 'text-rose-400'}">
            ${c.contribution >= 0 ? '+' : ''}${c.contribution}
          </span>
        </div>
      `).join('');
    }
  },

  async handleRetrainModel() {
    const splitRatio = parseFloat(document.getElementById('retrainSplitInput')?.value || 0.20);
    const learningRate = parseFloat(document.getElementById('retrainLrInput')?.value || 0.08);
    const epochs = parseInt(document.getElementById('retrainEpochsInput')?.value || 600, 10);

    const retrainBtn = document.getElementById('executeRetrainBtn');
    if (retrainBtn) {
      retrainBtn.disabled = true;
      retrainBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Re-training JavaScript Classifier...';
    }

    try {
      const res = await API.retrainModel({
        testSplitRatio: splitRatio,
        learningRate,
        epochs
      });

      if (!res.success || !res.data) {
        throw new Error(res.error || 'Retraining failed');
      }

      this.currentMetrics = res.data;
      this.renderMetrics(res.data);
      window.App.notify('Model retrained successfully with genuine verified metrics!', 'success');
    } catch (err) {
      window.App.notify(`Retraining failed: ${err.message}`, 'error');
    } finally {
      if (retrainBtn) {
        retrainBtn.disabled = false;
        retrainBtn.innerHTML = '<i class="fas fa-rotate"></i> Retrain Model & Recalculate Metrics';
      }
    }
  }
};

window.MlEngineController = MlEngineController;
