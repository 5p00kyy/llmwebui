/**
 * Settings Sidebar Manager
 * Handles the right-side settings sidebar similar to the conversation sidebar
 */

import storage from './storage.js';
import { SettingsRegistry } from './settingsRegistry.js';
import SettingComponentFactory from './settingsComponents.js';
import endpointEditor from './endpointEditor.js';

/**
 * Settings Sidebar Manager class
 */
class SettingsSidebarManager {
  constructor() {
    this.sidebar = null;
    this.isOpen = false;
    this.onSettingsChanged = null;
    this.parameterManager = null;
    this.ragManager = null;
    this.modelManager = null;
    this.currentSection = 'general';
    this.searchQuery = '';
    this.settingsRegistry = null;
  }

  /**
   * Initialize settings sidebar
   * @param {HTMLElement} sidebar - Settings sidebar element
   * @param {Function} onSettingsChanged - Callback when settings change
   * @param {Object} managers - Manager instances
   */
  initialize(sidebar, onSettingsChanged, managers = {}) {
    this.sidebar = sidebar;
    this.onSettingsChanged = onSettingsChanged;
    this.parameterManager = managers.parameterManager;
    this.ragManager = managers.ragManager;
    this.modelManager = managers.modelManager;
    
    // Initialize settings registry
    this.settingsRegistry = new SettingsRegistry(storage);
    
    // Initialize endpoint editor
    endpointEditor.initialize();
    
    // Listen for setting changes
    window.addEventListener('settingChanged', (e) => {
      // Apply appearance changes immediately
      if (e.detail.settingId === 'appearance.fontSize') {
        this.applyFontSize(e.detail.value);
      } else if (e.detail.settingId === 'appearance.compactMode') {
        this.applyCompactMode(e.detail.value);
      } else if (e.detail.settingId === 'appearance.theme') {
        // Theme is already handled in setupSectionEventListeners
      }
      
      if (this.onSettingsChanged) {
        this.onSettingsChanged();
      }
    });
    
    this.render();
  }

  /**
   * Toggle settings sidebar
   */
  toggle() {
    this.isOpen = !this.isOpen;
    if (this.sidebar) {
      this.sidebar.classList.toggle('open', this.isOpen);
    }
    if (this.isOpen) {
      this.render();
    }
  }

  /**
   * Open settings sidebar
   */
  open() {
    this.isOpen = true;
    if (this.sidebar) {
      this.sidebar.classList.add('open');
      this.render();
    }
  }

  /**
   * Close settings sidebar
   */
  close() {
    this.isOpen = false;
    if (this.sidebar) {
      this.sidebar.classList.remove('open');
    }
  }

  /**
   * Render settings sidebar
   */
  render() {
    if (!this.sidebar) return;

    const html = `
      <div class="settings-sidebar-header">
        <div class="settings-sidebar-title">Settings</div>
        <button class="settings-sidebar-close" id="closeSettingsSidebar">✕</button>
      </div>
      
      <div class="settings-sidebar-content">
        <div class="settings-sidebar-nav" id="settingsSidebarNav">
          <div class="settings-nav-item active" data-section="general">
            <span class="settings-nav-icon">⚙️</span>
            <span>General</span>
          </div>
          <div class="settings-nav-item" data-section="endpoints">
            <span class="settings-nav-icon">🔌</span>
            <span>Endpoints</span>
          </div>
          <div class="settings-nav-item" data-section="models">
            <span class="settings-nav-icon">🤖</span>
            <span>Models</span>
          </div>
          <div class="settings-nav-item" data-section="parameters">
            <span class="settings-nav-icon">🎚️</span>
            <span>Parameters</span>
          </div>
          <div class="settings-nav-item" data-section="rag">
            <span class="settings-nav-icon">📚</span>
            <span>Documents</span>
          </div>
          <div class="settings-nav-item" data-section="appearance">
            <span class="settings-nav-icon">🎨</span>
            <span>Appearance</span>
          </div>
          <div class="settings-nav-item" data-section="data">
            <span class="settings-nav-icon">💾</span>
            <span>Data</span>
          </div>
        </div>
        
        <div class="settings-sidebar-main">
          <div class="settings-sidebar-search">
            <div class="settings-search-container">
              <span class="settings-search-icon">🔍</span>
              <input 
                type="text" 
                class="settings-search-input" 
                placeholder="Search settings..." 
                id="settingsSearchInput"
              >
            </div>
          </div>
          
          <div class="settings-sidebar-content-area" id="settingsSidebarContent">
            <!-- Content sections will be rendered here based on active tab -->
          </div>
        </div>
      </div>
    `;

    this.sidebar.innerHTML = html;
    this.setupSearch();
    this.setupTabNavigation();
    this.showSection('general');
    this.setupEventListeners();
  }

  /**
   * Setup search functionality
   */
  setupSearch() {
    const searchInput = document.getElementById('settingsSearchInput');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      this.searchQuery = query;

      if (query.length === 0) {
        // Show normal navigation
        this.showNormalNav();
        return;
      }

      // Perform search
      this.performSearch(query);
    });
  }

  /**
   * Show normal navigation
   */
  showNormalNav() {
    const nav = document.getElementById('settingsSidebarNav');
    if (!nav) return;

    // Restore normal nav items (they're already there)
    nav.style.display = 'block';
    
    // Clear any search results from content area
    if (this.searchQuery === '') {
      this.showSection(this.currentSection);
    }
  }

  /**
   * Perform settings search
   * @param {string} query - Search query
   */
  performSearch(query) {
    if (!this.settingsRegistry) return;

    const results = this.settingsRegistry.search(query);
    const content = document.getElementById('settingsSidebarContent');
    const title = document.querySelector('.settings-sidebar-title');

    if (!content || !title) return;

    title.textContent = `Search Results (${results.length})`;

    if (results.length === 0) {
      content.innerHTML = `
        <div class="settings-search-results">
          <p style="color: var(--text-muted); text-align: center; padding: 2rem;">
            No settings found matching "${query}"
          </p>
        </div>
      `;
      return;
    }

    // Render search results
    let html = '<div class="settings-search-results">';
    
    results.forEach(definition => {
      const category = this.settingsRegistry.getCategory(definition.category);
      const categoryLabel = category ? category.label : definition.category;

      html += `
        <div class="search-result-item" data-setting-id="${definition.id}" data-category="${definition.category}">
          <div class="search-result-category">${category?.icon || ''} ${categoryLabel}</div>
          <div class="search-result-label">${definition.label}</div>
          <div class="search-result-description">${definition.description}</div>
        </div>
      `;
    });

    html += '</div>';
    content.innerHTML = html;

    // Setup click handlers for search results
    content.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const category = item.dataset.category;
        const settingId = item.dataset.settingId;
        
        // Clear search
        const searchInput = document.getElementById('settingsSearchInput');
        if (searchInput) {
          searchInput.value = '';
          this.searchQuery = '';
        }

        // Navigate to category
        this.navigateToSetting(category, settingId);
      });
    });
  }

  /**
   * Navigate to a specific setting
   * @param {string} categoryId - Category ID
   * @param {string} settingId - Setting ID
   */
  navigateToSetting(categoryId, settingId) {
    // Update nav selection
    const navItems = this.sidebar.querySelectorAll('.settings-nav-item');
    navItems.forEach(item => {
      item.classList.remove('active');
      if (item.dataset.section === categoryId) {
        item.classList.add('active');
      }
    });

    // Show the section
    this.showSection(categoryId);

    // Scroll to and highlight the setting
    setTimeout(() => {
      const settingElement = document.querySelector(`[data-setting-id="${settingId}"]`);
      if (settingElement) {
        settingElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        settingElement.style.animation = 'highlight 2s ease';
      }
    }, 100);
  }

  /**
   * Setup tab navigation
   */
  setupTabNavigation() {
    const navItems = this.sidebar.querySelectorAll('.settings-nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const section = item.dataset.section;
        
        // Clear search when navigating manually
        const searchInput = document.getElementById('settingsSearchInput');
        if (searchInput) {
          searchInput.value = '';
          this.searchQuery = '';
        }
        
        // Update active state
        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        // Show section
        this.showSection(section);
      });
    });
  }

  /**
   * Show specific settings section
   * @param {string} section - Section name
   */
  showSection(section) {
    const content = document.getElementById('settingsSidebarContent');
    const title = document.querySelector('.settings-sidebar-title');
    if (!content || !title) return;

    this.currentSection = section;
    const settings = storage.getSettings();
    
    const sections = {
      general: () => this.renderGeneralSection(settings),
      endpoints: () => this.renderEndpointsSection(settings),
      models: () => this.renderModelsSection(settings),
      parameters: () => this.renderParametersSection(),
      rag: () => this.renderRAGSection(),
      appearance: () => this.renderAppearanceSection(settings),
      data: () => this.renderDataSection()
    };

    const sectionTitles = {
      general: 'General',
      endpoints: 'API Endpoints',
      models: 'Model Configs',
      parameters: 'Parameters',
      rag: 'RAG Documents',
      appearance: 'Appearance',
      data: 'Data Management'
    };

    title.textContent = sectionTitles[section] || 'Settings';
    
    if (sections[section]) {
      content.innerHTML = sections[section]();
      this.setupSectionEventListeners(section);
    }
  }

  /**
   * Render general section
   */
  renderGeneralSection(settings) {
    const generalSettings = this.settingsRegistry.getSettingsForCategory('general');
    
    let settingsHTML = '';
    generalSettings.forEach(definition => {
      const component = SettingComponentFactory.createComponent(definition, this.settingsRegistry);
      const element = component.render();
      settingsHTML += element.outerHTML;
    });

    return `
      <div class="settings-section">
        <h3>About</h3>
        <div class="form-group">
          <p>LLM WebUI - A modern, local-first interface for AI models</p>
          <p style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 0.5rem;">
            Version 1.0.0 | Dark theme optimized for local AI workflows
          </p>
        </div>
      </div>

      <div class="settings-section">
        <h3>Preferences</h3>
        ${settingsHTML}
      </div>
      
      <div class="settings-section">
        <h3>Quick Actions</h3>
        <button class="btn btn-secondary" id="testConnection">🔌 Test Connection</button>
      </div>
    `;
  }

  /**
   * Render endpoints section
   */
  renderEndpointsSection(settings) {
    return `
      <div class="settings-section">
        <h3>Configured Endpoints</h3>
        <div id="endpointsList"></div>
        <button class="btn btn-secondary" id="addEndpoint">+ Add Endpoint</button>
      </div>
    `;
  }

  /**
   * Render models section
   */
  renderModelsSection(settings) {
    const modelConfigs = storage.getAllModelConfigs();
    const modelCount = Object.keys(modelConfigs).length;

    return `
      <div class="settings-section">
        <h3>Per-Model Configuration</h3>
        <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 1rem;">
          Configure specific parameters for individual models. When a model-specific configuration exists, it will be used instead of the global defaults.
        </p>
        
        <div style="background: var(--bg-tertiary); border: 1px solid var(--border-default); border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <span style="font-size: 1.25rem;">📊</span>
            <strong style="font-size: 0.875rem;">Configured Models: ${modelCount}</strong>
          </div>
          <p style="color: var(--text-muted); font-size: 0.8125rem; margin: 0;">
            Models with custom configurations will use their specific settings. All other models use global defaults.
          </p>
        </div>
        
        <div id="modelConfigsList"></div>
      </div>
    `;
  }

  /**
   * Render parameters section
   */
  renderParametersSection() {
    return `
      <div class="settings-section">
        <div id="presetSelectorContainer"></div>
      </div>

      <div class="settings-section">
        <h3>Generation Parameters</h3>
        <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 1rem;">
          Configure default parameters. Enable "Use Server Default" to let your API endpoint's config.yaml control values.
        </p>
        <div id="parameterControlsContainer"></div>
      </div>

      <div class="settings-section">
        <h3>System Instructions</h3>
        <div id="systemPromptContainer"></div>
      </div>
    `;
  }

  /**
   * Render RAG section
   */
  renderRAGSection() {
    return `
      <div class="settings-section">
        <h3>Document Management</h3>
        <div id="documentManagerContainer"></div>
      </div>
    `;
  }

  /**
   * Render appearance section
   */
  renderAppearanceSection(settings) {
    const appearanceSettings = this.settingsRegistry.getSettingsForCategory('appearance');
    
    let settingsHTML = '';
    appearanceSettings.forEach(definition => {
      const component = SettingComponentFactory.createComponent(definition, this.settingsRegistry);
      const element = component.render();
      settingsHTML += element.outerHTML;
    });

    return `
      <div class="settings-section">
        <h3>Visual Settings</h3>
        ${settingsHTML}
      </div>
    `;
  }

  /**
   * Render data section  
   */
  renderDataSection() {
    return `
      <div class="settings-section">
        <h3>Export & Import</h3>
        <button class="btn btn-secondary" id="exportData">📤 Export Data</button>
        <button class="btn btn-secondary" id="importData">📥 Import Data</button>
        <input type="file" id="importFileInput" accept=".json" style="display: none;">
      </div>

      <div class="settings-section">
        <h3>Danger Zone</h3>
        <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 1rem;">
          This will permanently delete all conversations and reset settings.
        </p>
        <button class="btn btn-danger" id="clearData">🗑️ Clear All Data</button>
      </div>
    `;
  }

  /**
   * Setup section-specific event listeners
   */
  setupSectionEventListeners(section) {
    if (section === 'endpoints') {
      this.renderEndpoints();
      
      const addBtn = document.getElementById('addEndpoint');
      addBtn?.addEventListener('click', () => this.showAddEndpointDialog());
    }
    
    if (section === 'models') {
      this.renderModelConfigs();
    }
    
    if (section === 'parameters') {
      // Render preset selector first
      if (this.parameterManager) {
        const presetContainer = document.getElementById('presetSelectorContainer');
        if (presetContainer) {
          const presetUI = this.createPresetSelectorUI();
          presetContainer.appendChild(presetUI);
        }
      }

      // Render parameter controls
      if (this.parameterManager) {
        const paramContainer = document.getElementById('parameterControlsContainer');
        if (paramContainer) {
          const paramUI = this.createParameterControlsUI();
          paramContainer.appendChild(paramUI);
        }
      }
      
      // Render system prompt
      if (this.parameterManager) {
        const promptContainer = document.getElementById('systemPromptContainer');
        if (promptContainer) {
          const promptUI = this.createSystemPromptUI();
          promptContainer.appendChild(promptUI);
        }
      }
    }
    
    if (section === 'rag') {
      if (this.ragManager) {
        const docContainer = document.getElementById('documentManagerContainer');
        if (docContainer) {
          const docUI = this.createDocumentManagerUI();
          docContainer.appendChild(docUI);
        }
      }
    }
    
    if (section === 'appearance') {
      // Handle theme changes specifically
      window.addEventListener('settingChanged', (e) => {
        if (e.detail.settingId === 'appearance.theme') {
          document.body.className = `theme-${e.detail.value}`;
        }
      });
    }
    
    if (section === 'data') {
      const exportBtn = document.getElementById('exportData');
      exportBtn?.addEventListener('click', () => this.exportData());

      const importBtn = document.getElementById('importData');
      const importFileInput = document.getElementById('importFileInput');
      importBtn?.addEventListener('click', () => importFileInput?.click());
      importFileInput?.addEventListener('change', (e) => this.importData(e));

      const clearBtn = document.getElementById('clearData');
      clearBtn?.addEventListener('click', () => this.clearData());
    }
    
    if (section === 'general') {
      const testBtn = document.getElementById('testConnection');
      testBtn?.addEventListener('click', () => this.testConnection());
    }
  }

  /**
   * Test API connection
   */
  async testConnection() {
    const endpoint = storage.getActiveEndpoint();
    if (!endpoint) {
      alert('No active endpoint configured');
      return;
    }

    try {
      // Import APIClient dynamically to avoid circular dependency
      const { default: APIClient } = await import('./api.js');
      const client = new APIClient(endpoint.url, endpoint.apiKey);
      const connected = await client.testConnection();
      if (connected) {
        alert('✓ Connection successful!');
      } else {
        alert('✗ Connection failed');
      }
    } catch (error) {
      alert('✗ Connection error: ' + error.message);
    }
  }

  /**
   * Render endpoints list (called from endpoints section)
   */
  renderEndpoints() {
    const endpointsList = document.getElementById('endpointsList');
    if (!endpointsList) return;

    const settings = storage.getSettings();
    let html = '';

    for (const endpoint of settings.endpoints) {
      const keyBadge = endpoint.apiKey 
        ? `<span class="endpoint-key-badge" title="API Key: ${this.maskApiKey(endpoint.apiKey)}">🔑</span>`
        : '';
      
      html += `
        <div class="endpoint-item ${endpoint.active ? 'active' : ''}">
          <div class="endpoint-info">
            <input type="radio" name="activeEndpoint" value="${endpoint.id}" ${endpoint.active ? 'checked' : ''}>
            <div class="endpoint-details">
              <strong>${endpoint.name} ${keyBadge}</strong>
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
    
    // Setup endpoint actions
    endpointsList.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        
        if (action === 'edit') this.editEndpoint(id);
        if (action === 'delete') this.deleteEndpoint(id);
      });
    });
    
    // Setup active endpoint change
    endpointsList.querySelectorAll('input[name="activeEndpoint"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        storage.setActiveEndpoint(e.target.value);
        this.renderEndpoints();
        if (this.onSettingsChanged) this.onSettingsChanged();
      });
    });
  }

  /**
   * Setup initial event listeners
   */
  setupEventListeners() {
    // Close button
    const closeBtn = document.getElementById('closeSettingsSidebar');
    closeBtn?.addEventListener('click', () => this.close());
    
    // Click outside to close
    this.sidebar?.addEventListener('click', (e) => {
      if (e.target === this.sidebar) {
        this.close();
      }
    });
  }

  /**
   * Show add endpoint dialog
   */
  showAddEndpointDialog() {
    endpointEditor.openNew(() => {
      this.renderEndpoints();
      if (this.onSettingsChanged) {
        this.onSettingsChanged();
      }
    });
  }

  /**
   * Edit endpoint
   * @param {string} endpointId - Endpoint ID
   */
  editEndpoint(endpointId) {
    endpointEditor.openEdit(endpointId, () => {
      this.renderEndpoints();
      
      // Check if edited endpoint was active
      const settings = storage.getSettings();
      const endpoint = settings.endpoints.find(e => e.id === endpointId);
      if (endpoint?.active && this.onSettingsChanged) {
        this.onSettingsChanged();
      }
    });
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
  async exportData() {
    const { downloadFile } = await import('./utils.js');
    const data = storage.exportData();
    const json = JSON.stringify(data, null, 2);
    const filename = `llmwebui-export-${Date.now()}.json`;
    downloadFile(json, filename, 'application/json');
  }

  /**
   * Import data
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

  /**
   * Render model configurations list
   */
  renderModelConfigs() {
    const modelConfigsList = document.getElementById('modelConfigsList');
    if (!modelConfigsList) return;

    const modelConfigs = storage.getAllModelConfigs();
    
    if (Object.keys(modelConfigs).length === 0) {
      modelConfigsList.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
          <p style="font-size: 0.875rem;">No model-specific configurations yet.</p>
          <p style="font-size: 0.8125rem; margin-top: 0.5rem;">Configure parameters for a specific model by selecting it and clicking "Save for This Model" in the Parameters section.</p>
        </div>
      `;
      return;
    }

    let html = '';
    
    for (const [modelId, config] of Object.entries(modelConfigs)) {
      const updatedDate = config.updated ? new Date(config.updated).toLocaleDateString() : 'Unknown';
      
      html += `
        <div class="endpoint-item" style="margin-bottom: 1rem;">
          <div class="endpoint-info" style="flex-direction: column; align-items: flex-start; gap: 0.5rem;">
            <div style="width: 100%;">
              <strong style="font-size: 0.9375rem;">🤖 ${modelId}</strong>
              <div style="font-size: 0.8125rem; color: var(--text-muted); margin-top: 0.25rem;">
                Updated: ${updatedDate}
              </div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 0.5rem; width: 100%; font-size: 0.8125rem;">
              <div>
                <span style="color: var(--text-muted);">Temperature:</span>
                <strong> ${config.temperature ?? 'Default'}</strong>
              </div>
              <div>
                <span style="color: var(--text-muted);">Top P:</span>
                <strong> ${config.topP ?? 'Default'}</strong>
              </div>
              <div>
                <span style="color: var(--text-muted);">Max Tokens:</span>
                <strong> ${config.maxTokens ?? 'Default'}</strong>
              </div>
              <div>
                <span style="color: var(--text-muted);">System Prompt:</span>
                <strong> ${config.systemPrompt ? 'Custom' : 'None'}</strong>
              </div>
            </div>
          </div>
          <div class="endpoint-actions">
            <button class="btn-icon" data-action="edit-model" data-model-id="${modelId}" title="Edit Configuration">✏️</button>
            <button class="btn-icon" data-action="delete-model" data-model-id="${modelId}" title="Delete Configuration">🗑️</button>
          </div>
        </div>
      `;
    }

    modelConfigsList.innerHTML = html;

    // Setup action handlers
    modelConfigsList.querySelectorAll('[data-action="edit-model"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modelId = btn.dataset.modelId;
        this.editModelConfig(modelId);
      });
    });
    
    modelConfigsList.querySelectorAll('[data-action="delete-model"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modelId = btn.dataset.modelId;
        if (confirm(`Delete configuration for model "${modelId}"?\n\nThis model will use global defaults after deletion.`)) {
          storage.deleteModelConfig(modelId);
          this.renderModelConfigs();
          window.dispatchEvent(new Event('modelConfigsUpdated'));
        }
      });
    });
  }

  /**
   * Edit model configuration
   * @param {string} modelId - Model ID
   */
  editModelConfig(modelId) {
    const config = storage.getModelConfig(modelId);
    if (!config) return;
    
    // Switch to parameters tab
    const navItems = this.sidebar.querySelectorAll('.settings-nav-item');
    navItems.forEach(item => {
      item.classList.remove('active');
      if (item.dataset.section === 'parameters') {
        item.classList.add('active');
      }
    });
    
    this.showSection('parameters');
    
    // Switch parameterManager to this model
    if (this.parameterManager) {
      this.parameterManager.switchToModel(modelId);
      
      // Notify that model was changed
      window.dispatchEvent(new CustomEvent('modelChanged', { 
        detail: { modelId } 
      }));
    }
    
    // Show notification
    setTimeout(() => {
      const statusDiv = document.getElementById('modelConfigStatus');
      if (statusDiv) {
        statusDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        statusDiv.style.animation = 'highlight 2s ease';
      }
    }, 300);
  }

  /**
   * Apply font size setting
   * @param {string} fontSize - Font size value (small, medium, large)
   */
  applyFontSize(fontSize) {
    document.body.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');
    document.body.classList.add(`font-size-${fontSize}`);
  }

  /**
   * Apply compact mode setting
   * @param {boolean} enabled - Whether compact mode is enabled
   */
  applyCompactMode(enabled) {
    if (enabled) {
      document.body.classList.add('compact-mode');
    } else {
      document.body.classList.remove('compact-mode');
    }
  }

  /**
   * Mask API key for display
   * @param {string} apiKey - API key to mask
   * @returns {string} Masked key
   */
  maskApiKey(apiKey) {
    if (!apiKey) return '';
    if (apiKey.length <= 12) return '***' + apiKey.substring(apiKey.length - 4);
    return apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4);
  }

  /**
   * Create preset selector UI
   */
  createPresetSelectorUI() {
    if (!this.parameterManager) return document.createElement('div');
    
    const container = document.createElement('div');
    container.id = 'presetSelectorContainer';
    
    // Create preset selector
    const presetGroup = document.createElement('div');
    presetGroup.className = 'form-group';
    
    const presetLabel = document.createElement('label');
    presetLabel.textContent = 'Parameter Presets';
    presetGroup.appendChild(presetLabel);
    
    const presetSelect = document.createElement('select');
    presetSelect.className = 'form-control';
    presetSelect.id = 'presetSelect';
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select a preset...';
    presetSelect.appendChild(defaultOption);
    
    // Add existing presets
    const presets = this.parameterManager.getPresets();
    presets.forEach(preset => {
      const option = document.createElement('option');
      option.value = preset.id;
      option.textContent = preset.name;
      presetSelect.appendChild(option);
    });
    
    presetSelect.addEventListener('change', (e) => {
      const presetId = e.target.value;
      if (presetId) {
        this.parameterManager.applyPreset(presetId);
        // Re-render the parameters section to show updated values
        this.showSection('parameters');
      }
    });
    
    presetGroup.appendChild(presetSelect);
    
    // Add save preset button
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-secondary';
    saveBtn.textContent = '💾 Save Current as Preset';
    saveBtn.addEventListener('click', () => {
      const name = prompt('Enter preset name:');
      if (name) {
        this.parameterManager.savePreset(name);
        // Refresh the preset selector
        this.showSection('parameters');
      }
    });
    
    presetGroup.appendChild(saveBtn);
    container.appendChild(presetGroup);
    
    return container;
  }

  /**
   * Create parameter controls UI
   */
  createParameterControlsUI() {
    if (!this.parameterManager) return document.createElement('div');
    
    const container = document.createElement('div');
    container.id = 'parameterControlsContainer';
    
    // Get current parameters
    const params = this.parameterManager.getParameters();
    
    // Create controls for each parameter
    Object.entries(params).forEach(([key, value]) => {
      const paramGroup = document.createElement('div');
      paramGroup.className = 'form-group';
      
      const label = document.createElement('label');
      label.textContent = key.charAt(0).toUpperCase() + key.slice(1);
      paramGroup.appendChild(label);
      
      // Create input based on parameter type
      if (typeof value === 'boolean') {
        // Toggle switch
        const toggleLabel = document.createElement('label');
        toggleLabel.className = 'toggle-switch';
        
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = value;
        input.dataset.param = key;
        
        input.addEventListener('change', (e) => {
          this.parameterManager.setParameter(key, e.target.checked);
        });
        
        const slider = document.createElement('span');
        slider.className = 'toggle-slider';
        
        toggleLabel.appendChild(input);
        toggleLabel.appendChild(slider);
        paramGroup.appendChild(toggleLabel);
      } else if (typeof value === 'number') {
        // Slider for numeric values
        const sliderContainer = document.createElement('div');
        sliderContainer.style.display = 'flex';
        sliderContainer.style.alignItems = 'center';
        sliderContainer.style.gap = '12px';
        
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.className = 'parameter-slider';
        slider.min = '0';
        slider.max = '100';
        slider.value = Math.round(value * 100);
        slider.dataset.param = key;
        
        const valueDisplay = document.createElement('span');
        valueDisplay.className = 'parameter-value';
        valueDisplay.textContent = value;
        
        slider.addEventListener('input', (e) => {
          const newValue = parseFloat(e.target.value) / 100;
          valueDisplay.textContent = newValue.toFixed(2);
          this.parameterManager.setParameter(key, newValue);
        });
        
        sliderContainer.appendChild(slider);
        sliderContainer.appendChild(valueDisplay);
        paramGroup.appendChild(sliderContainer);
      } else {
        // Text input for other values
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-control';
        input.value = value;
        input.dataset.param = key;
        
        input.addEventListener('change', (e) => {
          this.parameterManager.setParameter(key, e.target.value);
        });
        
        paramGroup.appendChild(input);
      }
      
      container.appendChild(paramGroup);
    });
    
    return container;
  }

  /**
   * Create system prompt UI
   */
  createSystemPromptUI() {
    if (!this.parameterManager) return document.createElement('div');
    
    const container = document.createElement('div');
    container.id = 'systemPromptContainer';
    
    const promptGroup = document.createElement('div');
    promptGroup.className = 'form-group';
    
    const label = document.createElement('label');
    label.textContent = 'System Prompt';
    promptGroup.appendChild(label);
    
    const textarea = document.createElement('textarea');
    textarea.className = 'form-control';
    textarea.rows = '4';
    textarea.value = this.parameterManager.getSystemPrompt();
    
    textarea.addEventListener('change', (e) => {
      this.parameterManager.setSystemPrompt(e.target.value);
    });
    
    promptGroup.appendChild(textarea);
    container.appendChild(promptGroup);
    
    return container;
  }

  /**
   * Create document manager UI
   */
  createDocumentManagerUI() {
    if (!this.ragManager) return document.createElement('div');
    
    const container = document.createElement('div');
    container.id = 'documentManagerContainer';
    
    // Create file upload area
    const uploadGroup = document.createElement('div');
    uploadGroup.className = 'form-group';
    
    const uploadLabel = document.createElement('label');
    uploadLabel.textContent = 'Upload Document';
    uploadGroup.appendChild(uploadLabel);
    
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.className = 'form-control';
    fileInput.accept = '.txt,.md,.pdf';
    
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.ragManager.addDocument(file);
        // Refresh the document list
        this.showSection('rag');
      }
    });
    
    uploadGroup.appendChild(fileInput);
    container.appendChild(uploadGroup);
    
    // Create document list
    const docList = document.createElement('div');
    docList.id = 'documentList';
    docList.style.marginTop = '1rem';
    
    const documents = this.ragManager.getDocuments();
    if (documents.length === 0) {
      docList.innerHTML = '<p style="color: var(--text-muted); text-align: center;">No documents uploaded</p>';
    } else {
      documents.forEach(doc => {
        const docItem = document.createElement('div');
        docItem.className = 'endpoint-item';
        docItem.innerHTML = `
          <div class="endpoint-info">
            <strong>${doc.name}</strong>
            <span style="color: var(--text-muted); font-size: 0.875rem;">${doc.size} bytes</span>
          </div>
          <div class="endpoint-actions">
            <button class="btn-icon" data-action="delete-doc" data-id="${doc.id}" title="Delete">🗑️</button>
          </div>
        `;
        
        docItem.querySelector('[data-action="delete-doc"]').addEventListener('click', () => {
          if (confirm(`Delete document "${doc.name}"?`)) {
            this.ragManager.removeDocument(doc.id);
            // Refresh the document list
            this.showSection('rag');
          }
        });
        
        docList.appendChild(docItem);
      });
    }
    
    container.appendChild(docList);
    
    return container;
  }
}

// Export singleton instance
export default new SettingsSidebarManager();
