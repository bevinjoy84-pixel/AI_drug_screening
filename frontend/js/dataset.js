/**
 * PharmaScreen AI - Drug Dataset Explorer Controller
 * Handles browsing reference pharmaceutical compounds, filtering, searching, and CSV export.
 */

const DatasetController = {
  compounds: [],

  init() {
    this.bindEvents();
    this.loadDataset();
  },

  bindEvents() {
    const searchInput = document.getElementById('datasetSearchInput');
    const classFilter = document.getElementById('datasetClassFilter');
    const violFilter = document.getElementById('datasetViolFilter');
    const exportBtn = document.getElementById('exportDatasetCsvBtn');

    if (searchInput) {
      searchInput.addEventListener('input', () => this.applyFilters());
    }

    if (classFilter) {
      classFilter.addEventListener('change', () => this.applyFilters());
    }

    if (violFilter) {
      violFilter.addEventListener('change', () => this.applyFilters());
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const base = (window.API && window.API.baseUrl) ? window.API.baseUrl : '';
        window.location.href = `${base}/api/dataset/export`;
        window.App.notify('Exporting compound dataset to CSV...', 'info');
      });
    }
  },

  async loadDataset() {
    try {
      const res = await API.getCompounds();
      if (!res.success) throw new Error(res.error || 'Failed to load dataset');

      this.compounds = res.compounds;
      this.renderTable(this.compounds);

      const countBadge = document.getElementById('datasetTotalCountBadge');
      if (countBadge) countBadge.textContent = `${this.compounds.length} Compounds`;
    } catch (err) {
      console.error('Dataset loading error:', err);
      window.App.notify('Could not load compound dataset', 'error');
    }
  },

  applyFilters() {
    const searchVal = document.getElementById('datasetSearchInput')?.value.trim().toLowerCase() || '';
    const classVal = document.getElementById('datasetClassFilter')?.value || 'All';
    const violVal = document.getElementById('datasetViolFilter')?.value || 'All';

    let filtered = this.compounds.filter(c => {
      // Search
      const matchesSearch = !searchVal ||
        (c.name && c.name.toLowerCase().includes(searchVal)) ||
        (c.smiles && c.smiles.toLowerCase().includes(searchVal)) ||
        (c.formula && c.formula.toLowerCase().includes(searchVal)) ||
        (c.therapeuticClass && c.therapeuticClass.toLowerCase().includes(searchVal));

      // Classification
      const matchesClass = classVal === 'All' || c.classification === classVal;

      // Violations
      const matchesViol = violVal === 'All' || c.lipinskiViolations === parseInt(violVal, 10);

      return matchesSearch && matchesClass && matchesViol;
    });

    this.renderTable(filtered);
  },

  renderTable(list) {
    const tbody = document.getElementById('datasetTableBody');
    const countEl = document.getElementById('datasetFilteredCount');
    if (countEl) countEl.textContent = `Showing ${list.length} of ${this.compounds.length}`;

    if (!tbody) return;

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" class="text-center py-5 text-slate-400">
            <i class="fas fa-flask fa-2x mb-2 text-slate-600"></i>
            <p>No compounds match the selected filter criteria.</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map(c => {
      const isPromising = c.classification === 'Promising Candidate';
      const isReview = c.classification === 'Needs Review';
      const classBadgeClass = isPromising ? 'badge-success' : (isReview ? 'badge-warning' : 'badge-danger');

      return `
        <tr>
          <td>
            <div class="font-medium text-light">${c.name}</div>
            <div class="text-xs text-slate-400">${c.therapeuticClass || 'Pharmaceutical Agent'}</div>
          </td>
          <td><code class="code-smiles" title="${c.smiles}">${c.smiles}</code></td>
          <td class="font-mono text-cyan">${c.formula || 'N/A'}</td>
          <td class="font-mono">${Number(c.molecularWeight || 0).toFixed(1)}</td>
          <td class="font-mono">${c.logP !== null && !isNaN(c.logP) ? Number(c.logP).toFixed(2) : 'N/A'}</td>
          <td class="font-mono">${c.hbd || 0} / ${c.hba || 0}</td>
          <td class="font-mono">${c.tpsa ? Number(c.tpsa).toFixed(1) : '0'}</td>
          <td class="text-center font-mono">${c.rotatableBonds || 0}</td>
          <td>
            <span class="badge ${classBadgeClass}">${c.classification}</span>
            <div class="text-xs text-slate-400 mt-1">${c.lipinskiViolations} Violation(s)</div>
          </td>
          <td>
            <div class="d-flex align-items-center gap-2">
              <span class="badge badge-slate text-xs" title="Curated reference demonstration set">Demo</span>
              <button class="btn btn-xs btn-outline-cyan load-screener-btn" data-smiles="${c.smiles}" data-name="${c.name}" title="Screen this molecule">
                <i class="fas fa-vial"></i> Screen
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Attach click events to load into screener
    tbody.querySelectorAll('.load-screener-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const smiles = e.currentTarget.getAttribute('data-smiles');
        const name = e.currentTarget.getAttribute('data-name');
        window.App.switchTab('screening');
        window.ScreeningController.loadCustom(smiles, name);
      });
    });
  }
};

window.DatasetController = DatasetController;
