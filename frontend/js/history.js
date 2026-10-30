/**
 * PharmaScreen AI - Screening History Controller
 * Manages stored previous compound screenings, review workflows, and CSV export.
 */

const HistoryController = {
  historyRecords: [],

  init() {
    this.bindEvents();
    this.loadHistory();
  },

  bindEvents() {
    const clearBtn = document.getElementById('clearHistoryBtn');
    const exportBtn = document.getElementById('exportHistoryCsvBtn');
    const searchInput = document.getElementById('historySearchInput');

    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.handleClearHistory());
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const base = (window.API && window.API.baseUrl) ? window.API.baseUrl : '';
        window.location.href = `${base}/api/history/export`;
        window.App.notify('Exporting screening history to CSV...', 'info');
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', () => this.filterHistory());
    }
  },

  async loadHistory() {
    try {
      const res = await API.getHistory();
      if (!res.success) throw new Error(res.error || 'Failed to load history');

      this.historyRecords = res.history;
      this.renderTable(this.historyRecords);

      const countBadge = document.getElementById('historyTotalCountBadge');
      if (countBadge) countBadge.textContent = `${this.historyRecords.length} Records`;
    } catch (err) {
      console.error('History load error:', err);
      window.App.notify('Could not load screening history', 'error');
    }
  },

  filterHistory() {
    const q = document.getElementById('historySearchInput')?.value.trim().toLowerCase() || '';
    if (!q) {
      this.renderTable(this.historyRecords);
      return;
    }

    const filtered = this.historyRecords.filter(h =>
      (h.name && h.name.toLowerCase().includes(q)) ||
      (h.smiles && h.smiles.toLowerCase().includes(q)) ||
      (h.classification && h.classification.toLowerCase().includes(q))
    );

    this.renderTable(filtered);
  },

  renderTable(list) {
    const tbody = document.getElementById('historyTableBody');
    if (!tbody) return;

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="text-center py-5 text-slate-400">
            <i class="fas fa-history fa-2x mb-2 text-slate-600"></i>
            <p>No screening records stored yet. Screen a candidate molecule to log results.</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map(item => {
      const p = item.properties || {};
      const dateStr = new Date(item.timestamp).toLocaleString();
      const isPromising = item.classification === 'Promising Candidate';
      const isReview = item.classification === 'Needs Review';
      const badgeClass = isPromising ? 'badge-success' : (isReview ? 'badge-warning' : 'badge-danger');
      const violationsCount = item.violations?.totalViolations !== undefined ? item.violations.totalViolations : 0;

      return `
        <tr>
          <td>
            <div class="text-xs text-slate-400 font-mono">${dateStr}</div>
            <strong class="text-light">${item.name || 'Unnamed Candidate'}</strong>
          </td>
          <td><code class="code-smiles" title="${item.smiles}">${item.smiles}</code></td>
          <td class="font-mono">${p.molecularWeight !== undefined && p.molecularWeight !== null ? Number(p.molecularWeight).toFixed(1) : 'N/A'}</td>
          <td class="font-mono">${p.logP !== null && p.logP !== undefined && !isNaN(p.logP) ? Number(p.logP).toFixed(2) : 'N/A'}</td>
          <td class="font-mono">${p.hbd || 0} / ${p.hba || 0}</td>
          <td class="font-mono">${p.tpsa ? Number(p.tpsa).toFixed(1) : '0'}</td>
          <td>
            <span class="badge ${badgeClass}">${item.classification}</span>
            <div class="text-xs text-slate-400 mt-0.5">${violationsCount} Violations</div>
          </td>
          <td>
            <span class="text-xs text-slate-400">${item.source || 'In-Silico'}</span>
          </td>
          <td>
            <div class="d-flex align-items-center gap-1.5">
              <button class="btn btn-xs btn-outline-cyan re-screen-btn" data-smiles="${item.smiles}" data-name="${item.name || ''}" title="Re-screen and examine details">
                <i class="fas fa-eye"></i> View
              </button>
              <button class="btn btn-xs btn-outline-danger delete-hist-btn" data-id="${item.id}" title="Delete record">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Re-screen event
    tbody.querySelectorAll('.re-screen-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const smiles = e.currentTarget.getAttribute('data-smiles');
        const name = e.currentTarget.getAttribute('data-name');
        window.App.switchTab('screening');
        window.ScreeningController.loadCustom(smiles, name);
      });
    });

    // Delete event
    tbody.querySelectorAll('.delete-hist-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        await this.handleDeleteRecord(id);
      });
    });
  },

  async handleDeleteRecord(id) {
    if (!confirm('Are you sure you want to delete this screening record?')) return;
    try {
      const res = await API.deleteHistoryItem(id);
      if (res.success) {
        window.App.notify('Record deleted', 'info');
        this.loadHistory();
        window.App.refreshDashboardStats();
      }
    } catch (err) {
      window.App.notify(`Delete error: ${err.message}`, 'error');
    }
  },

  async handleClearHistory() {
    if (!confirm('Are you sure you want to clear all screening history?')) return;
    try {
      const res = await API.clearHistory();
      if (res.success) {
        window.App.notify('Screening history cleared', 'info');
        this.loadHistory();
        window.App.refreshDashboardStats();
      }
    } catch (err) {
      window.App.notify(`Clear error: ${err.message}`, 'error');
    }
  }
};

window.HistoryController = HistoryController;
