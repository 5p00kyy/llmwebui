/**
 * Endpoint Editor - Form-based modal for endpoint configuration
 */

import storage from './storage.js';

/**
 * Endpoint Editor class
 */
class EndpointEditor {
  constructor() {
    this.modal = null;
    this.currentEndpointId = null;
    this.onSave = null;
  }

  /**
   * Initialize endpoint editor
   */
  initialize() {
    this.createModal();
  }

  /**
   * Create editor modal
   */
  createModal() {
    const modal = document.createElement('div');
    modal.className = 'endpoint-editor-modal';
    modal.innerHTML = `
      <div class="endpoint-editor-content">
        <div class="endpoint-editor-header">
          <h3 id="endpoint-editor-title">Add Endpoint</h3>
          <button class="close-btn" id="closeEndpointEditor">✕</button>
        </div>
        
        <form class="endpoint-editor-form" id="endpointForm">
          <div class="form-group">
            <label for="endpoint-name">Name *</label>
            <input type="text" id="endpoint-name" class="form-control" placeholder="My API Endpoint" required>
            <div class="validation-message error" id="name-error" style="display: none;">
              <span>⚠️</span>
              <span id="name-error-text">Name is required</span>
            </div>
          </div>

          <div class="form-group">
            <label for="endpoint-url">URL *</label>
            <input type="url" id="endpoint-url" class="form-control" placeholder="http://localhost:8080/v1" required>
            <small class="form-help">Include /v1 at the end for OpenAI compatibility</small>
            <div class="validation-message error" id="url-error" style="display: none;">
              <span>⚠️</span>
              <span id="url-error-text">Valid URL is required</span>
            </div>
            <div class="validation-message success" id="url-success" style="display: none;">
              <span>✓</span>
              <span>Connection successful!</span>
            </div>
          </div>

          <div class="form-group">
            <label for="endpoint-apikey">API Key (Optional)</label>
            <div class="api-key-input-container">
              <input type="password" id="endpoint-apikey" class="form-control" placeholder="sk-...">
              <button type="button" class="api-key-toggle" id="toggleApiKey" title="Show/Hide API Key">
                <span class="toggle-icon">👁️</span>
              </button>
            </div>
            <small class="form-help">Leave empty if not required. Will be sent as Bearer token.</small>
          </div>

          <div class="endpoint-editor-actions">
            <button type="button" class="btn btn-secondary" id="testEndpointConnection">
              <span id="testButtonText">Test Connection</span>
            </button>
            <div style="flex: 1;"></div>
            <button type="button" class="btn btn-secondary" id="cancelEndpointEdit">Cancel</button>
            <button type="submit" class="btn btn-primary" id="saveEndpoint">Save Endpoint</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);
    this.modal = modal;
    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    const closeBtn = this.modal.querySelector('#closeEndpointEditor');
    const cancelBtn = this.modal.querySelector('#cancelEndpointEdit');
    const form = this.modal.querySelector('#endpointForm');
    const toggleBtn = this.modal.querySelector('#toggleApiKey');
    const testBtn = this.modal.querySelector('#testEndpointConnection');
    const nameInput = this.modal.querySelector('#endpoint-name');
    const urlInput = this.modal.querySelector('#endpoint-url');

    closeBtn.addEventListener('click', () => this.close());
    cancelBtn.addEventListener('click', () => this.close());
    
    // Close on click outside
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });

    // Handle form submission
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveEndpoint();
    });

    // API key visibility toggle
    toggleBtn.addEventListener('click', () => this.toggleApiKeyVisibility());

    // Test connection
    testBtn.addEventListener('click', () => this.testConnection());

    // Real-time validation
    nameInput.addEventListener('input', () => this.validateName());
    urlInput.addEventListener('input', () => this.validateUrl());
    urlInput.addEventListener('blur', () => this.validateUrl());
  }
  /**
   * Toggle API key visibility
   */
  toggleApiKeyVisibility() {
    const apiKeyInput = this.modal.querySelector('#endpoint-apikey');
    const toggleIcon = this.modal.querySelector('.toggle-icon');
    
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
      toggleIcon.textContent = '👁️‍🗨️';
    } else {
      apiKeyInput.type = 'password';
      toggleIcon.textContent = '👁️';
    }
  }

  /**
   * Validate endpoint name
   */
  validateName() {
    const nameInput = this.modal.querySelector('#endpoint-name');
    const errorDiv = this.modal.querySelector('#name-error');
    const errorText = this.modal.querySelector('#name-error-text');
    const value = nameInput.value.trim();

    if (!value) {
      errorDiv.style.display = 'flex';
      errorText.textContent = 'Name is required';
      nameInput.classList.add('invalid');
      return false;
    }

    errorDiv.style.display = 'none';
    nameInput.classList.remove('invalid');
    return true;
  }

  /**
   * Validate endpoint URL
   */
  validateUrl() {
    const urlInput = this.modal.querySelector('#endpoint-url');
    const errorDiv = this.modal.querySelector('#url-error');
    const errorText = this.modal.querySelector('#url-error-text');
    const successDiv = this.modal.querySelector('#url-success');
    const value = urlInput.value.trim();

    // Hide success message when validating
    successDiv.style.display = 'none';

    if (!value) {
      errorDiv.style.display = 'flex';
      errorText.textContent = 'URL is required';
      urlInput.classList.add('invalid');
      return false;
    }

    try {
      const url = new URL(value);
      if (!url.protocol.startsWith('http')) {
        throw new Error('Invalid protocol');
      }
      
      // Warn if /v1 is missing
      if (!value.endsWith('/v1')) {
        errorDiv.style.display = 'flex';
        errorText.textContent = 'URL should end with /v1 for OpenAI compatibility';
        urlInput.classList.add('warning');
        urlInput.classList.remove('invalid');
        return true; // Still valid, just a warning
      }

      errorDiv.style.display = 'none';
      urlInput.classList.remove('invalid', 'warning');
      return true;
    } catch (error) {
      errorDiv.style.display = 'flex';
      errorText.textContent = 'Please enter a valid URL';
      urlInput.classList.add('invalid');
      return false;
    }
  }

  /**
   * Test connection to endpoint
   */
  async testConnection() {
    const urlInput = this.modal.querySelector('#endpoint-url');
    const apiKeyInput = this.modal.querySelector('#endpoint-apikey');
    const testBtn = this.modal.querySelector('#testEndpointConnection');
    const testBtnText = this.modal.querySelector('#testButtonText');
    const errorDiv = this.modal.querySelector('#url-error');
    const successDiv = this.modal.querySelector('#url-success');

    const url = urlInput.value.trim();
    const apiKey = apiKeyInput.value.trim();

    if (!url) {
      this.validateUrl();
      return;
    }

    // Update button state
    testBtn.disabled = true;
    testBtnText.textContent = 'Testing...';
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';

    try {
      const headers = {
        'Content-Type': 'application/json'
      };

      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      // Test by fetching models
      const response = await fetch(`${url}/models`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.data || data.models) {
        successDiv.style.display = 'flex';
        urlInput.classList.remove('invalid', 'warning');
        urlInput.classList.add('valid');
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      errorDiv.style.display = 'flex';
      const errorText = this.modal.querySelector('#url-error-text');
      errorText.textContent = `Connection failed: ${error.message}`;
      urlInput.classList.add('invalid');
    } finally {
      testBtn.disabled = false;
      testBtnText.textContent = 'Test Connection';
    }
  }

  /**
   * Open editor for new endpoint
   * @param {Function} onSave - Callback after save
   */
  openNew(onSave) {
    this.currentEndpointId = null;
    this.onSave = onSave;
    
    document.getElementById('endpoint-editor-title').textContent = 'Add Endpoint';
    document.getElementById('endpoint-name').value = '';
    document.getElementById('endpoint-url').value = 'http://localhost:8080/v1';
    document.getElementById('endpoint-apikey').value = '';
    
    this.modal.classList.add('open');
    setTimeout(() => document.getElementById('endpoint-name').focus(), 100);
  }

  /**
   * Open editor for existing endpoint
   * @param {string} endpointId - Endpoint ID
   * @param {Function} onSave - Callback after save
   */
  openEdit(endpointId, onSave) {
    const settings = storage.getSettings();
    const endpoint = settings.endpoints.find(e => e.id === endpointId);
    if (!endpoint) return;

    this.currentEndpointId = endpointId;
    this.onSave = onSave;
    this.originalApiKey = endpoint.apiKey; // Store original API key
    
    document.getElementById('endpoint-editor-title').textContent = 'Edit Endpoint';
    document.getElementById('endpoint-name').value = endpoint.name;
    document.getElementById('endpoint-url').value = endpoint.url;
    const apiKeyInput = document.getElementById('endpoint-apikey');
    apiKeyInput.value = endpoint.apiKey || '';
    apiKeyInput.placeholder = endpoint.apiKey ? '••••••••' : 'sk-...';
    
    this.modal.classList.add('open');
    setTimeout(() => document.getElementById('endpoint-name').focus(), 100);
  }

  /**
   * Save endpoint
   */
  saveEndpoint() {
    const name = document.getElementById('endpoint-name').value.trim();
    const url = document.getElementById('endpoint-url').value.trim();
    const apiKey = document.getElementById('endpoint-apikey').value.trim();

    if (!name || !url) {
      alert('Name and URL are required');
      return;
    }

    if (this.currentEndpointId) {
      // Update existing endpoint
      // If apiKey field is empty during edit, keep the original API key
      const finalApiKey = apiKey || this.originalApiKey || null;
      storage.updateEndpoint(this.currentEndpointId, {
        name,
        url,
        apiKey: finalApiKey
      });
    } else {
      // Add new endpoint
      storage.addEndpoint({
        name,
        url,
        apiKey: apiKey || null,
        active: false
      });
    }

    this.close();
    if (this.onSave) {
      this.onSave();
    }
  }

  /**
   * Close editor
   */
  close() {
    this.modal.classList.remove('open');
    this.currentEndpointId = null;
    this.originalApiKey = null;
    this.onSave = null;
  }
}

// Export singleton instance
export default new EndpointEditor();
