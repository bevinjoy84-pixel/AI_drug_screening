/**
 * PharmaScreen AI - Drug Screening Frontend Controller
 * Handles SMILES input, sample compounds loading, 2D structure rendering,
 * Lipinski evaluation display, radar chart, and AI explanations.
 */

const SAMPLE_COMPOUNDS = {
  aspirin: {
    name: 'Aspirin',
    smiles: 'CC(=O)Oc1ccccc1C(=O)O',
    desc: 'Classic analgesic and antipyretic (NSAID)'
  },
  paracetamol: {
    name: 'Paracetamol',
    smiles: 'CC(=O)Nc1ccc(O)cc1',
    desc: 'Acetaminophen antipyretic'
  },
  ibuprofen: {
    name: 'Ibuprofen',
    smiles: 'CC(C)Cc1ccc(cc1)C(C)C(=O)O',
    desc: 'Propionic acid derivative NSAID'
  },
  metformin: {
    name: 'Metformin',
    smiles: 'CN(C)C(=N)NC(=N)N',
    desc: 'Biguanide first-line antidiabetic'
  },
  caffeine: {
    name: 'Caffeine',
    smiles: 'Cn1cnc2c1c(=O)n(c(=O)n2C)C',
    desc: 'Purine alkaloid CNS stimulant'
  },
  imatinib: {
    name: 'Imatinib',
    smiles: 'Cc1ccc(cc1Nc2nccc(n2)c3cccnc3)NC(=O)c4ccc(cc4)CN5CCN(CC5)C',
    desc: 'BCR-ABL targeted tyrosine kinase inhibitor'
  },
  atorvastatin: {
    name: 'Atorvastatin',
    smiles: 'CC(C)c1c(c(c(n1CCC(CC(CC(=O)O)O)O)c2ccc(cc2)F)c3ccccc3)C(=O)Nc4ccccc4',
    desc: 'Blockbuster HMG-CoA reductase inhibitor (Statin)'
  }
};

let currentScreeningResult = null;

const ScreeningController = {
  init() {
    this.bindEvents();
    // Preload Aspirin as default example
    this.loadSample('aspirin');
  },

  bindEvents() {
    const smilesInput = document.getElementById('smilesInput');
    const screenBtn = document.getElementById('screenCandidateBtn');
    const explainBtn = document.getElementById('requestAiExplanationBtn');

    // Live validation on typing
    if (smilesInput) {
      smilesInput.addEventListener('input', () => this.handleLiveValidation());
    }

    // Screen button
    if (screenBtn) {
      screenBtn.addEventListener('click', () => this.executeScreening());
    }

    // Sample buttons
    const sampleBtns = document.querySelectorAll('.sample-drug-pill');
    sampleBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const key = e.currentTarget.getAttribute('data-sample');
        this.loadSample(key);
      });
    });

    // AI Explanation button
    if (explainBtn) {
      explainBtn.addEventListener('click', () => this.generateAiExplanation());
    }
  },

  loadSample(key) {
    const sample = SAMPLE_COMPOUNDS[key];
    if (!sample) return;

    const smilesInput = document.getElementById('smilesInput');
    const nameInput = document.getElementById('compoundNameInput');

    if (smilesInput) smilesInput.value = sample.smiles;
    if (nameInput) nameInput.value = sample.name;

    // Highlight active sample pill
    document.querySelectorAll('.sample-drug-pill').forEach(btn => {
      if (btn.getAttribute('data-sample') === key) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    this.handleLiveValidation();
  },

  loadCustom(smiles, name = '') {
    const smilesInput = document.getElementById('smilesInput');
    const nameInput = document.getElementById('compoundNameInput');

    if (smilesInput) smilesInput.value = smiles;
    if (nameInput) nameInput.value = name;

    // Clear active sample buttons
    document.querySelectorAll('.sample-drug-pill').forEach(btn => btn.classList.remove('active'));

    this.handleLiveValidation();
    this.executeScreening();
  },

  async handleLiveValidation() {
    const smilesInput = document.getElementById('smilesInput');
    const statusEl = document.getElementById('smilesValidationStatus');
    if (!smilesInput || !statusEl) return;

    const smiles = smilesInput.value.trim();
    if (!smiles) {
      statusEl.innerHTML = '<span class="text-muted"><i class="fas fa-info-circle"></i> Enter valid SMILES notation</span>';
      return;
    }

    try {
      const res = await API.validateSmiles(smiles);
      if (res.valid) {
        statusEl.innerHTML = '<span class="text-success"><i class="fas fa-check-circle"></i> Valid SMILES syntax</span>';
      } else {
        statusEl.innerHTML = `<span class="text-danger"><i class="fas fa-exclamation-triangle"></i> ${res.error}</span>`;
      }
    } catch {
      statusEl.innerHTML = '<span class="text-muted">Validating...</span>';
    }
  },

  async executeScreening() {
    const smilesInput = document.getElementById('smilesInput');
    const nameInput = document.getElementById('compoundNameInput');
    const screenBtn = document.getElementById('screenCandidateBtn');
    const resultsContainer = document.getElementById('screeningResultsContainer');

    const smiles = smilesInput ? smilesInput.value.trim() : '';
    const name = nameInput ? nameInput.value.trim() : '';

    if (!smiles) {
      window.App.notify('Please provide a SMILES string to analyze', 'warning');
      return;
    }

    // Set loading state
    if (screenBtn) {
      screenBtn.disabled = true;
      screenBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing In-Silico...';
    }

    try {
      const res = await API.screenCompound({ smiles, name, saveToHistory: true });
      if (!res.success) {
        throw new Error(res.error || 'Screening failed');
      }

      currentScreeningResult = res;
      window.currentScreeningResult = res;
      this.renderScreeningResults(res);

      if (resultsContainer) {
        resultsContainer.classList.remove('d-none');
        resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      window.App.notify(`Screening complete for "${res.compound.name}"`, 'success');

      // Refresh dashboard & history in background
      if (window.App) window.App.refreshData();
    } catch (err) {
      window.App.notify(`Screening Error: ${err.message}`, 'error');
    } finally {
      if (screenBtn) {
        screenBtn.disabled = false;
        screenBtn.innerHTML = '<i class="fas fa-dna"></i> Screen Candidate Molecule';
      }
    }
  },

  renderScreeningResults(data) {
    const { compound, evaluation } = data;

    // 1. Basic Compound Identity
    const nameEl = document.getElementById('resultCompoundName');
    const formulaEl = document.getElementById('resultFormula');
    const smilesEl = document.getElementById('resultSmiles');
    const sourceEl = document.getElementById('resultSourceBadge');

    if (nameEl) nameEl.textContent = compound.name;
    if (formulaEl) formulaEl.textContent = compound.formula || 'Calculated';
    if (smilesEl) smilesEl.textContent = compound.smiles;
    if (sourceEl) {
      sourceEl.textContent = compound.source;
      sourceEl.className = compound.source.includes('PubChem') ? 'badge badge-cyan' : 'badge badge-warning';
    }

    // 2. 2D Molecular Structure
    const structureContainer = document.getElementById('molecularStructureView');
    if (structureContainer) {
      if (compound.structureImageUrl) {
        structureContainer.innerHTML = `
          <div class="structure-image-wrapper">
            <img src="${compound.structureImageUrl}" alt="${compound.name} 2D Structure" class="pubchem-structure-img" onerror="ScreeningController.handleImageFallback(this)" />
            <div class="structure-overlay-badge">PubChem 2D Depiction</div>
          </div>
        `;
      } else if (compound.fallbackSvg) {
        structureContainer.innerHTML = compound.fallbackSvg;
      } else {
        structureContainer.innerHTML = this.getFallbackSvgString();
      }
    }

    // 3. Physicochemical Descriptors
    const props = compound.properties;
    this.updateDescriptorCard('propMw', `${props.molecularWeight.toFixed(2)} Da`, props.molecularWeight <= 500);
    this.updateDescriptorCard('propLogP', props.logP !== null ? props.logP.toFixed(2) : 'N/A', props.logP <= 5.0);
    this.updateDescriptorCard('propHbd', `${props.hbd}`, props.hbd <= 5);
    this.updateDescriptorCard('propHba', `${props.hba}`, props.hba <= 10);
    this.updateDescriptorCard('propTpsa', `${props.tpsa.toFixed(1)} Å²`, props.tpsa <= 140);
    this.updateDescriptorCard('propRotb', `${props.rotatableBonds}`, props.rotatableBonds <= 10);

    // 4. Lipinski Rule of 5 Classification Badge
    const classBadge = document.getElementById('screeningClassificationBadge');
    const violationsBadge = document.getElementById('screeningViolationsBadge');
    const summaryText = document.getElementById('screeningSummaryText');

    if (classBadge) {
      classBadge.textContent = evaluation.classification;
      if (evaluation.classification === 'Promising Candidate') {
        classBadge.className = 'status-badge status-promising';
      } else if (evaluation.classification === 'Needs Review') {
        classBadge.className = 'status-badge status-warning';
      } else {
        classBadge.className = 'status-badge status-unfavorable';
      }
    }

    if (violationsBadge) {
      const v = evaluation.totalViolations;
      violationsBadge.textContent = `${v} Rule Violation${v === 1 ? '' : 's'}`;
      violationsBadge.className = v === 0 ? 'badge badge-success' : (v === 1 ? 'badge badge-warning' : 'badge badge-danger');
    }

    if (summaryText) {
      summaryText.textContent = evaluation.summary;
    }

    // 5. Lipinski Breakdown Table
    const breakdownBody = document.getElementById('lipinskiBreakdownTableBody');
    if (breakdownBody && evaluation.ruleBreakdown) {
      breakdownBody.innerHTML = evaluation.ruleBreakdown.map(r => `
        <tr class="${r.violated ? 'table-row-violation' : 'table-row-compliant'}">
          <td><strong class="text-light">${r.rule}</strong></td>
          <td class="font-mono">${r.threshold}</td>
          <td class="font-mono ${r.violated ? 'text-danger font-bold' : 'text-cyan'}">${r.value}</td>
          <td>
            <span class="badge ${r.violated ? 'badge-danger' : 'badge-success'}">
              <i class="fas ${r.violated ? 'fa-times-circle' : 'fa-check-circle'}"></i> ${r.status}
            </span>
          </td>
          <td class="text-sm text-slate-300">${r.rationale}</td>
        </tr>
      `).join('');
    }

    // 6. Veber Breakdown Table
    const veberBody = document.getElementById('veberBreakdownTableBody');
    if (veberBody && evaluation.veberBreakdown) {
      veberBody.innerHTML = evaluation.veberBreakdown.map(r => `
        <tr class="${r.violated ? 'table-row-violation' : 'table-row-compliant'}">
          <td><strong class="text-light">${r.rule}</strong></td>
          <td class="font-mono">${r.threshold}</td>
          <td class="font-mono ${r.violated ? 'text-danger font-bold' : 'text-cyan'}">${r.value}</td>
          <td>
            <span class="badge ${r.violated ? 'badge-danger' : 'badge-success'}">
              <i class="fas ${r.violated ? 'fa-times-circle' : 'fa-check-circle'}"></i> ${r.status}
            </span>
          </td>
          <td class="text-sm text-slate-300">${r.rationale}</td>
        </tr>
      `).join('');
    }

    // 7. Render Lipinski Sweet-Spot Radar Chart
    const radarCanvas = document.getElementById('lipinskiRadarChart');
    if (radarCanvas && window.PharmaCharts) {
      window.PharmaCharts.drawRadarChart(radarCanvas, props);
    }

    // 8. Trigger Fast ML prediction for this screened compound
    this.runQuickMlPrediction(props);

    // 9. Reset AI Explanation box
    const aiContent = document.getElementById('aiExplanationContent');
    const aiProvider = document.getElementById('aiProviderBadge');
    if (aiContent) {
      aiContent.innerHTML = `
        <div class="ai-placeholder-prompt">
          <i class="fas fa-brain-circuit text-cyan fa-2x mb-2"></i>
          <p class="text-slate-300">Click the button below to generate a comprehensive AI-assisted medicinal chemistry explanation for <strong>${compound.name}</strong>.</p>
        </div>
      `;
    }
    if (aiProvider) {
      aiProvider.textContent = 'Ready for synthesis';
      aiProvider.className = 'badge badge-slate';
    }
  },

  updateDescriptorCard(id, value, isCompliant) {
    const valEl = document.getElementById(id);
    const indEl = document.getElementById(`${id}Indicator`);
    if (valEl) valEl.textContent = value;
    if (indEl) {
      indEl.className = isCompliant ? 'status-dot dot-green' : 'status-dot dot-red';
      indEl.title = isCompliant ? 'Complies with Lipinski guideline' : 'Violates Lipinski guideline';
    }
  },

  async runQuickMlPrediction(properties) {
    const mlBadge = document.getElementById('quickMlClassBadge');
    const mlScore = document.getElementById('quickMlScoreValue');
    const mlConf = document.getElementById('quickMlConfidence');

    if (!mlBadge || !mlScore) return;

    try {
      const res = await API.predictDrugLikeness(properties);
      if (res.success && res.prediction) {
        const p = res.prediction;
        mlBadge.textContent = p.predictedClass;
        mlBadge.className = p.predictedClass === 'Drug-like' ? 'badge badge-success' : 'badge badge-danger';
        mlScore.textContent = `${p.drugLikenessScore}%`;
        if (mlConf) mlConf.textContent = `(${p.confidencePercentage}% confidence)`;
      }
    } catch (e) {
      console.warn('Quick ML inference failed:', e.message);
    }
  },

  async generateAiExplanation() {
    if (!currentScreeningResult) {
      window.App.notify('Please screen a molecule first', 'warning');
      return;
    }

    const explainBtn = document.getElementById('requestAiExplanationBtn');
    const aiContent = document.getElementById('aiExplanationContent');
    const aiProvider = document.getElementById('aiProviderBadge');

    if (explainBtn) {
      explainBtn.disabled = true;
      explainBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Synthesizing AI Medicinal Chemistry Report...';
    }

    try {
      const res = await API.getAiExplanation({
        name: currentScreeningResult.compound.name,
        smiles: currentScreeningResult.compound.smiles,
        formula: currentScreeningResult.compound.formula,
        properties: currentScreeningResult.compound.properties,
        evaluation: currentScreeningResult.evaluation,
        source: currentScreeningResult.compound.source
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to generate explanation');
      }

      const { data } = res;

      if (aiProvider) {
        aiProvider.textContent = data.provider;
        aiProvider.className = data.aiGenerated ? 'badge badge-cyan' : 'badge badge-warning';
      }

      if (aiContent) {
        // Convert simple markdown to formatted HTML
        aiContent.innerHTML = `
          <div class="ai-generated-report">
            ${this.formatMarkdownToHtml(data.content)}
          </div>
          <div class="research-disclaimer-callout mt-4">
            <i class="fas fa-shield-halved text-warning"></i>
            <div>
              <strong>Educational Research Prototype Disclaimer:</strong>
              <p class="mb-0 text-sm">${data.disclaimer}</p>
            </div>
          </div>
        `;
      }

      window.App.notify('AI Medicinal Chemistry analysis generated', 'success');
    } catch (err) {
      window.App.notify(`AI Generation Error: ${err.message}`, 'error');
    } finally {
      if (explainBtn) {
        explainBtn.disabled = false;
        explainBtn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Re-Synthesize AI Explanation';
      }
    }
  },

  formatMarkdownToHtml(text) {
    if (!text) return '';
    let html = text
      // Headings
      .replace(/^### (.*$)/gim, '<h4 class="ai-section-heading text-cyan"><i class="fas fa-microscope text-sm mr-2"></i>$1</h4>')
      .replace(/^## (.*$)/gim, '<h3 class="ai-major-heading">$1</h3>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Code
      .replace(/`(.*?)`/g, '<code class="code-pill">$1</code>')
      // Bullet points
      .replace(/^\s*-\s+(.*$)/gim, '<li class="ai-bullet-item">$1</li>')
      // Line breaks
      .replace(/\n\n/g, '<br/>');

    return html;
  },

  handleImageFallback(imgEl) {
    if (!imgEl || !imgEl.parentElement) return;
    const fallback = (window.currentScreeningResult && window.currentScreeningResult.compound && window.currentScreeningResult.compound.fallbackSvg)
      ? window.currentScreeningResult.compound.fallbackSvg
      : this.getFallbackSvgString();
    imgEl.parentElement.innerHTML = fallback;
  },

  getFallbackSvgString() {
    return `
      <div class="p-4 text-center text-slate-400">
        <i class="fas fa-atom fa-3x text-cyan mb-2"></i>
        <p class="text-sm">2D Chemical structure projection generated in-silico</p>
      </div>
    `;
  }
};

window.ScreeningController = ScreeningController;
