/**
 * Settings panel module
 * Manages application settings, endpoints, models, and preferences
 */

import storage from './storage.js';
import { downloadFile, generateUUID } from './utils.js';
import APIClient from './api.js';

/**
 * Settings manager class
 */
class SettingsManager {
  constructor() {
    this.panel = null;
    this.isOpen = false;
    this.onSettingsChanged = null;
  }

  /**
   * Initialize settings panel
   * @param {HTMLElement} panel - Settings panel element
   * @param {Function} onSettingsChanged - Callback when settings change
   */
  initialize(panel, onSettingsChanged) {
    this.panel = panel;
    this.onSettingsChanged = onSettingsChanged;
    this.render();
  }

  /**
   * Toggle settings panel
   */
  toggle() {
    this.isOpen = !this.isOpen;
    if (this.panel) {
      this.panel.classList.toggle('open', this.isOpen);
    }
    if (this.isOpen) {
      this.render();
    }
  }

  /**
   * Open settings panel
   */
  open() {
    this.isOpen = true;
    if (this.panel) {
      this.panel.classList.add('open');
      this.render();
    }
  }

  /**
   * Close settings panel
   */
  close() {
    this.isOpen = false;
    if (this.panel) {
      this.panel.classList.remove('open');
    }
  }

  /**
   * Render settings panel
   */
  render() {
    if (!this.panel) return;

    const settings = storage.getSettings();

    const html = `
      <div class="settings-header">
        <h2>Settings</h2>
        <button class="close-btn" id="closeSettings">✕</button>
      </div>

      <div class="settings-content">
        <!-- Endpoints Section -->
        <div class="settings-section">
          <h3>API Endpoints</h3>
          <div id="endpointsList"></div>
          <button class="btn btn-secondary" id="addEndpoint">+ Add Endpoint</button>
        </div>

        <!-- Model Selection -->
        <div class="settings-section">
          <h3>Model Configuration</h3>
          <div class="form-group">
            <label for="modelSelect">Default Model:</label>
            <select id="modelSelect" class="form-control">
              <option value="">Select a model...</option>
            </select>
            <button class="btn btn-secondary btn-sm" id="refreshModels">🔄 Refresh Models</button>
          </div>
          <div class="form-group">
            <label for="systemPrompt">System Prompt:</label>
            <textarea id="systemPrompt" class="form-control" rows="4" placeholder="You are a helpful assistant..."></textarea>
          </div>
        </div>

        <!-- Parameters -->
        <div class="settings-section">
          <h3>Generation Parameters</h3>
          <div class="form-group">
            <label for="temperature">Temperature: <span id="temperatureValue">${settings.preferences.temperature}</span></label>
            <input type="range" id="temperature" class="form-control-range" min="0" max="2" step="0.1" value="${settings.preferences.temperature}">
          </div>
          <div class="form-group">
            <label for="maxTokens">Max Tokens: <span id="maxTokensValue">${settings.preferences.maxTokens}</span></label>
            <input type="range" id="maxTokens" class="form-control-range" min="256" max="8192" step="256" value="${settings.preferences.maxTokens}">
          </div>
          <div class="form-group">
            <label for="topP">Top P: <span id="topPValue">${settings.preferences.topP}</span></label>
            <input type="range" id="topP" class="form-control-range" min="0" max="1" step="0.05" value="${settings.preferences.topP}">
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" id="streamingEnabled" ${settings.preferences.streamingEnabled ? 'checked' : ''}>
              Enable Streaming
            </label>
          </div>
        </div>

        <!-- Theme -->
        <div class="settings-section">
          <h3>Appearance</h3>
          <div class="form-group">
            <label for="themeSelect">Theme:</label>
            <select id="themeSelect" class="form-control">
              <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Dark</option>
              <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Light</option>
            </select>
          </div>
        </div>

        <!-- Data Management -->
        <div class="settings-section">
          <h3>Data Management</h3>
          <button class="btn btn-secondary" id="exportData">📤 Export Data</button>
          <button class="btn btn-secondary" id="importData">📥 Import Data</button>
          <button class="btn btn-danger" id="clearData">🗑️ Clear All Data</button>
          <input type="file" id="importFileInput" accept=".json" style="display: none;">
        </div>
      </div>
    `;

    this.panel.innerHTML = html;
    this.renderEndpoints();
    this.loadModels();
    this.setupEventListeners();
  }

  /**
   * Render endpoints list
   */
  renderEndpoints() {
    const endpointsList = document.getElementById('endpointsList');
    if (!endpointsList) return;

    const settings = storage.getSettings();
    let html = '';

    for (const endpoint of settings.endpoints) {
      html += `
        <div class="endpoint-item ${endpoint.active ? 'active' : ''}">
          <div class="endpoint-info">
            <input type="radio" name="activeEndpoint" value="${endpoint.id}" ${endpoint.active ? 'checked' : ''}>
            <div class="endpoint-details">
              <strong>${endpoint.name}</strong>
              <span class="endpoint-url">${endpoint.url}</span>
            </div>
          </div>
          <div class="endpoint-actions">
            <button class="btn-icon" data-action="edit" data-id="${endpoint.id}" title="Edit">✏️</button>
            <button class="btn-icon" data-action="delete" data-id="${endpoint.id}" title="Delete">🗑️</button>
          </div>
        </div>
      `;
    }

    endpointsList.innerHTML = html;
  }

  /**
   * Load available models
   */
  async loadModels() {
    const modelSelect = document.getElementById('modelSelect');
    if (!modelSelect) return;

    try {
      const endpoint = storage.getActiveEndpoint();
      if (!endpoint) return;

      const client = new APIClient(endpoint.url);
      const models = await client.getModels();

      const settings = storage.getSettings();
      modelSelect.innerHTML = '<option value="">Select a model...</option>';
      
      for (const model of models) {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.name;
        option.selected = model.id === settings.defaultModel;
        modelSelect.appendChild(option);
      }

      // Load system prompt for selected model
      this.loadSystemPrompt(settings.defaultModel);
    } catch (error) {
      console.error('Failed to load models:', error);
      modelSelect.innerHTML = '<option value="">Failed to load models</option>';
    }
  }

  /**
   * Load system prompt for a model
   * @param {string} model - Model ID
   */
  loadSystemPrompt(model) {
    const systemPromptField = document.getElementById('systemPrompt');
    if (!systemPromptField || !model) return;

    const settings = storage.getSettings();
    systemPromptField.value = settings.systemPrompts[model] || '';
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Close button
    const closeBtn = document.getElementById('closeSettings');
    closeBtn?.addEventListener('click', () => this.close());

    // Add endpoint
    const addEndpointBtn = document.getElementById('addEndpoint');
    addEndpointBtn?.addEventListener('click', () => this.showAddEndpointDialog());

    // Endpoint actions
    const endpointsList = document.getElementById('endpointsList');
    endpointsList?.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action]');
      if (!target) return;

      const action = target.dataset.action;
      const id = target.dataset.id;

      if (action === 'edit') this.editEndpoint(id);
      if (action === 'delete') this.deleteEndpoint(id);
    });

    // Active endpoint radio buttons
    endpointsList?.addEventListener('change', (e) => {
      if (e.target.name === 'activeEndpoint') {
        storage.setActiveEndpoint(e.target.value);
        this.renderEndpoints();
        this.loadModels();
        if (this.onSettingsChanged) this.onSettingsChanged();
      }
    });

    // Model selection
    const modelSelect = document.getElementById('modelSelect');
    modelSelect?.addEventListener('change', (e) => {
      const settings = storage.getSettings();
      settings.defaultModel = e.target.value;
      storage.saveSettings(settings);
      this.loadSystemPrompt(e.target.value);
      if (this.onSettingsChanged) this.onSettingsChanged();
    });

    // Refresh models
    const refreshModelsBtn = document.getElementById('refreshModels');
    refreshModelsBtn?.addEventListener('click', () => this.loadModels());

    // System prompt
    const systemPrompt = document.getElementById('systemPrompt');
    systemPrompt?.addEventListener('change', (e) => {
      const settings = storage.getSettings();
      const model = settings.defaultModel;
      if (model) {
        settings.systemPrompts[model] = e.target.value;
        storage.saveSettings(settings);
      }
    });

    // Temperature
    const temperature = document.getElementById('temperature');
    const temperatureValue = document.getElementById('temperatureValue');
    temperature?.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      temperatureValue.textContent = value;
      const settings = storage.getSettings();
      settings.preferences.temperature = value;
      storage.saveSettings(settings);
    });

    // Max tokens
    const maxTokens = document.getElementById('maxTokens');
    const maxTokensValue = document.getElementById('maxTokensValue');
    maxTokens?.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      maxTokensValue.textContent = value;
      const settings = storage.getSettings();
      settings.preferences.maxTokens = value;
      storage.saveSettings(settings);
    });

    // Top P
    const topP = document.getElementById('topP');
    const topPValue = document.getElementById('topPValue');
    topP?.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      topPValue.textContent = value;
      const settings = storage.getSettings();
      settings.preferences.topP = value;
      storage.saveSettings(settings);
    });

    // Streaming
    const streamingEnabled = document.getElementById('streamingEnabled');
    streamingEnabled?.addEventListener('change', (e) => {
      const settings = storage.getSettings();
      settings.preferences.streamingEnabled = e.target.checked;
      storage.saveSettings(settings);
    });

    // Theme
    const themeSelect = document.getElementById('themeSelect');
    themeSelect?.addEventListener('change', (e) => {
      const settings = storage.getSettings();
      settings.theme = e.target.value;
      storage.saveSettings(settings);
      document.body.className = `theme-${e.target.value}`;
    });

    // Export data
    const exportBtn = document.getElementById('exportData');
    exportBtn?.addEventListener('click', () => this.exportData());

    // Import data
    const importBtn = document.getElementById('importData');
    const importFileInput = document.getElementById('importFileInput');
    importBtn?.addEventListener('click', () => importFileInput?.click());
    importFileInput?.addEventListener('change', (e) => this.importData(e));

    // Clear data
    const clearBtn = document.getElementById('clearData');
    clearBtn?.addEventListener('click', () => this.clearData());
  }

  /**
   * Show add endpoint dialog
   */
  showAddEndpointDialog() {
    const name = prompt('Endpoint Name:', 'My Endpoint');
    if (!name) return;

    const url = prompt('Endpoint URL:', 'http://localhost:8080/v1');
    if (!url) return;

    storage.addEndpoint({
      name,
      url: url.trim(),
      active: false
    });

    this.renderEndpoints();
  }

  /**
   * Edit endpoint
   * @param {string} endpointId - Endpoint ID
   */
  editEndpoint(endpointId) {
    const settings = storage.getSettings();
    const endpoint = settings.endpoints.find(e => e.id === endpointId);
    if (!endpoint) return;

    const name = prompt('Endpoint Name:', endpoint.name);
    if (name === null) return;

    const url = prompt('Endpoint URL:', endpoint.url);
    if (url === null) return;

    storage.updateEndpoint(endpointId, {
      name: name.trim(),
      url: url.trim()
    });

    this.renderEndpoints();
    if (endpoint.active && this.onSettingsChanged) {
      this.onSettingsChanged();
    }
  }

  /**
   * Delete endpoint
   * @param {string} endpointId - Endpoint ID
   */
  deleteEndpoint(endpointId) {
    if (!confirm('Delete this endpoint?')) return;

    storage.deleteEndpoint(endpointId);
    this.renderEndpoints();
    if (this.onSettingsChanged) this.onSettingsChanged();
  }

  /**
   * Export data
   */
  exportData() {
    const data = storage.exportData();
    const json = JSON.stringify(data, null, 2);
    const filename = `llmwebui-export-${Date.now()}.json`;
    downloadFile(json, filename, 'application/json');
  }

  /**
   * Import data
   * @param {Event} event - File input change event
   */
  async importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (confirm('This will replace all existing data. Continue?')) {
        const success = storage.importData(data);
        if (success) {
          alert('Data imported successfully!');
          this.render();
          if (this.onSettingsChanged) this.onSettingsChanged();
        } else {
          alert('Failed to import data');
        }
      }
    } catch (error) {
      console.error('Import failed:', error);
      alert('Failed to import data: ' + error.message);
    }

    // Reset file input
    event.target.value = '';
  }

  /**
   * Clear all data
   */
  clearData() {
    if (!confirm('This will delete ALL conversations and reset settings. This cannot be undone. Continue?')) {
      return;
    }

    if (!confirm('Are you absolutely sure? This action is permanent!')) {
      return;
    }

    const success = storage.clearAllData();
    if (success) {
      alert('All data cleared');
      this.render();
      if (this.onSettingsChanged) this.onSettingsChanged();
    } else {
      alert('Failed to clear data');
    }
  }
}

// Export singleton instance
export default new SettingsManager();
