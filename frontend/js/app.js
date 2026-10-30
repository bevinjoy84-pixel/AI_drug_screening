/**
 * PharmaScreen AI - Main Application Controller
 * Handles sidebar navigation, tab switching, global notifications,
 * dashboard metrics, and module initialization.
 */

const App = {
  activeTab: 'dashboard',

  init() {
    this.initTheme();
    this.bindNavigation();
    this.checkServerHealth();
    this.refreshDashboardStats();

    // Initialize sub-controllers
    if (window.ScreeningController) window.ScreeningController.init();
    if (window.MlEngineController) window.MlEngineController.init();
    if (window.DatasetController) window.DatasetController.init();
    if (window.HistoryController) window.HistoryController.init();

    // Theme toggle button (Running slider switch)
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => this.toggleTheme());
      themeBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.toggleTheme();
        }
      });
    }

    // Mobile sidebar toggle
    const toggleBtn = document.getElementById('sidebarToggleBtn');
    const sidebar = document.querySelector('.app-sidebar');
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
    }

    // Window resize chart re-renders
    window.addEventListener('resize', () => {
      if (this.activeTab === 'dashboard') {
        this.refreshDashboardStats();
      }
    });
  },

  initTheme() {
    const savedTheme = localStorage.getItem('pharma_theme');
    if (savedTheme === 'dark') {
      document.body.classList.add('theme-dark');
    } else {
      document.body.classList.remove('theme-dark');
      localStorage.setItem('pharma_theme', 'white');
    }
    this.updateThemeButton();
  },

  toggleTheme() {
    const isDark = document.body.classList.toggle('theme-dark');
    localStorage.setItem('pharma_theme', isDark ? 'dark' : 'white');
    this.updateThemeButton();

    // Re-render charts with updated theme colors
    this.refreshDashboardStats();
    if (window.currentScreeningResult && window.ScreeningController) {
      const radarCanvas = document.getElementById('lipinskiRadarChart');
      if (radarCanvas && window.PharmaCharts) {
        window.PharmaCharts.drawRadarChart(radarCanvas, window.currentScreeningResult.compound.properties);
      }
    }
    this.notify(isDark ? 'Switched to Futuristic Dark Mode' : 'Switched to Pure White Theme (20% Glass)', 'info');
  },

  updateThemeButton() {
    const isDark = document.body.classList.contains('theme-dark');
    const switchEl = document.getElementById('themeToggleBtn');
    if (!switchEl) return;

    switchEl.setAttribute('aria-checked', isDark ? 'true' : 'false');
    switchEl.title = isDark ? 'Active: Dark Mode (Click for Pure White)' : 'Active: Pure White Theme (Click for Dark Mode)';

    const thumbIcon = switchEl.querySelector('.thumb-icon');
    const thumbLabel = switchEl.querySelector('.thumb-label');
    if (thumbIcon && thumbLabel) {
      if (isDark) {
        thumbIcon.className = 'fas fa-moon thumb-icon';
        thumbLabel.textContent = 'Dark';
      } else {
        thumbIcon.className = 'fas fa-sun thumb-icon';
        thumbLabel.textContent = 'Light';
      }
    }
  },

  bindNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-tab]');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = e.currentTarget.getAttribute('data-tab');
        this.switchTab(tab);

        // Close mobile sidebar if open
        const sidebar = document.querySelector('.app-sidebar');
        if (sidebar && sidebar.classList.contains('open')) {
          sidebar.classList.remove('open');
        }
      });
    });

    // Quick launch buttons in dashboard
    document.querySelectorAll('.quick-screen-launch').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const sampleKey = e.currentTarget.getAttribute('data-sample');
        this.switchTab('screening');
        if (window.ScreeningController) {
          window.ScreeningController.loadSample(sampleKey);
        }
      });
    });
  },

  switchTab(tabId) {
    this.activeTab = tabId;

    // Update nav links
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.getAttribute('data-tab') === tabId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Update tab content views
    document.querySelectorAll('.tab-view').forEach(view => {
      if (view.id === `tab-${tabId}`) {
        view.classList.add('active');
      } else {
        view.classList.remove('active');
      }
    });

    // Module-specific hooks
    if (tabId === 'dashboard') {
      this.refreshDashboardStats();
    } else if (tabId === 'screening') {
      if (window.currentScreeningResult && window.PharmaCharts) {
        const radarCanvas = document.getElementById('lipinskiRadarChart');
        if (radarCanvas && window.currentScreeningResult.compound?.properties) {
          window.PharmaCharts.drawRadarChart(radarCanvas, window.currentScreeningResult.compound.properties);
        }
      }
    } else if (tabId === 'ml') {
      if (window.MlEngineController) window.MlEngineController.loadModelMetrics();
    } else if (tabId === 'dataset') {
      if (window.DatasetController) window.DatasetController.loadDataset();
    } else if (tabId === 'history') {
      if (window.HistoryController) window.HistoryController.loadHistory();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  async checkServerHealth() {
    try {
      const health = await API.getHealth();
      const statusPill = document.getElementById('backendStatusPill');
      const aiStatusPill = document.getElementById('geminiStatusPill');

      if (statusPill) {
        statusPill.innerHTML = '<span class="status-dot dot-green"></span> Backend Online';
      }

      if (aiStatusPill) {
        if (health.geminiConfigured) {
          aiStatusPill.innerHTML = '<span class="status-dot dot-cyan"></span> Gemini AI Active';
          aiStatusPill.className = 'status-pill pill-cyan';
        } else {
          aiStatusPill.innerHTML = '<span class="status-dot dot-cyan"></span> In-Silico Heuristics Active';
          aiStatusPill.className = 'status-pill pill-cyan';
          aiStatusPill.title = 'Add GEMINI_API_KEY in .env for generative insights';
        }
      }
    } catch (err) {
      const statusPill = document.getElementById('backendStatusPill');
      if (statusPill) {
        statusPill.innerHTML = '<span class="status-dot dot-red"></span> Backend Disconnected';
      }
    }
  },

  async refreshDashboardStats() {
    try {
      const res = await API.getDashboardStats();
      if (!res.success || !res.data) return;

      const data = res.data;

      // Metric Numbers
      const totalEl = document.getElementById('dashTotalAnalyzed');
      const promEl = document.getElementById('dashPromisingCount');
      const revEl = document.getElementById('dashReviewCount');
      const unfavEl = document.getElementById('dashUnfavorableCount');
      const mwEl = document.getElementById('dashAvgMw');
      const logpEl = document.getElementById('dashAvgLogP');

      if (totalEl) totalEl.textContent = data.totalAnalyzed;
      if (promEl) promEl.textContent = data.promisingCount;
      if (revEl) revEl.textContent = data.needsReviewCount;
      if (unfavEl) unfavEl.textContent = data.unfavorableCount;
      if (mwEl) mwEl.textContent = `${data.averageMw} Da`;
      if (logpEl) logpEl.textContent = data.averageLogP;

      // Donut Chart: Classification Distribution
      const donutCanvas = document.getElementById('dashClassificationDonutChart');
      if (donutCanvas && window.PharmaCharts) {
        const segments = [
          { label: 'Promising', value: data.classificationDistribution.promising, color: '#10b981' },
          { label: 'Needs Review', value: data.classificationDistribution.needsReview, color: '#f59e0b' },
          { label: 'Unfavorable', value: data.classificationDistribution.unfavorable, color: '#ef4444' }
        ];
        window.PharmaCharts.drawDonutChart(donutCanvas, segments);
      }

      // Bar Chart: MW Distribution
      const barCanvas = document.getElementById('dashMwBarChart');
      if (barCanvas && window.PharmaCharts && data.mwDistribution) {
        const cats = Object.keys(data.mwDistribution);
        const vals = Object.values(data.mwDistribution);
        window.PharmaCharts.drawBarChart(barCanvas, cats, vals);
      }

      // Recent Activity Feed
      const feedContainer = document.getElementById('dashRecentFeed');
      if (feedContainer && data.recentHistory) {
        if (data.recentHistory.length === 0) {
          feedContainer.innerHTML = '<div class="text-sm text-slate-400 py-3">No recent screenings.</div>';
        } else {
          feedContainer.innerHTML = data.recentHistory.map(h => {
            const isPromising = h.classification === 'Promising Candidate';
            const badgeClass = isPromising ? 'badge-success' : (h.classification === 'Needs Review' ? 'badge-warning' : 'badge-danger');
            const dateStr = new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const smilesDisplay = h.smiles || '';
            const truncated = smilesDisplay.length > 28 ? smilesDisplay.substring(0, 28) + '...' : smilesDisplay;

            return `
              <div class="activity-feed-item d-flex justify-content-between align-items-center py-2" style="border-bottom: 1px solid var(--border-subtle);">
                <div>
                  <strong class="text-light text-sm">${h.name || 'Candidate'}</strong>
                  <div class="text-xs text-slate-400 font-mono">${truncated}</div>
                </div>
                <div class="text-end">
                  <span class="badge ${badgeClass} text-xs">${h.classification}</span>
                  <div class="text-xs text-slate-500 mt-0.5">${dateStr}</div>
                </div>
              </div>
            `;
          }).join('');
        }
      }
    } catch (err) {
      console.warn('Dashboard stats refresh error:', err.message);
    }
  },

  refreshData() {
    this.refreshDashboardStats();
    if (window.HistoryController) window.HistoryController.loadHistory();
  },

  notify(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `app-toast toast-${type}`;

    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'warning') icon = 'exclamation-triangle';
    if (type === 'error') icon = 'times-circle';

    toast.innerHTML = `
      <i class="fas fa-${icon}"></i>
      <span>${message}</span>
    `;

    const container = document.getElementById('toastContainer');
    if (container) {
      container.appendChild(toast);
      setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 300);
      }, 4000);
    }
  }
};

window.App = App;

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
