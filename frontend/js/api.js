/**
 * PharmaScreen AI - Frontend API Client
 * Centralized async communication module with Express backend.
 */

const API = {
  baseUrl: '',

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...(options.headers || {})
        }
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (err) {
      console.error(`[API Error: ${endpoint}]`, err.message);
      throw err;
    }
  },

  // Health check
  getHealth() {
    return this.request('/api/health');
  },

  // Dashboard Stats
  getDashboardStats() {
    return this.request('/api/dashboard/stats');
  },

  // Validate SMILES
  validateSmiles(smiles) {
    return this.request('/api/screen/validate', {
      method: 'POST',
      body: JSON.stringify({ smiles })
    });
  },

  // Screen candidate compound
  screenCompound(payload) {
    return this.request('/api/screen/analyze', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // AI-Assisted Explanation
  getAiExplanation(payload) {
    return this.request('/api/ai/explain', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // Dataset queries
  getCompounds(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/dataset${query ? `?${query}` : ''}`);
  },

  getCompoundById(id) {
    return this.request(`/api/dataset/${id}`);
  },

  // Screening History
  getHistory() {
    return this.request('/api/history');
  },

  deleteHistoryItem(id) {
    return this.request(`/api/history/${id}`, {
      method: 'DELETE'
    });
  },

  clearHistory() {
    return this.request('/api/history', {
      method: 'DELETE'
    });
  },

  // ML Engine
  getMLMetrics() {
    return this.request('/api/ml/metrics');
  },

  predictDrugLikeness(properties) {
    return this.request('/api/ml/predict', {
      method: 'POST',
      body: JSON.stringify({ properties })
    });
  },

  retrainModel(hyperparameters) {
    return this.request('/api/ml/retrain', {
      method: 'POST',
      body: JSON.stringify(hyperparameters)
    });
  }
};

window.API = API;
