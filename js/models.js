/**
 * Model selection and management
 * Handles model switching and display
 */

export class ModelManager {
  constructor(apiClient, storage) {
    this.apiClient = apiClient;
    this.storage = storage;
    this.models = [];
    this.currentModel = storage.get('currentModel') || null;
    this.listeners = new Set();
  }

  /**
   * Fetch available models from the API
   * @returns {Promise<Array>} Array of models
   */
  async fetchModels() {
    try {
      this.models = await this.apiClient.getModels();
      
      // If no current model set, use the first available
      if (!this.currentModel && this.models.length > 0) {
        this.currentModel = this.models[0].id;
        this.storage.set('currentModel', this.currentModel);
      }
      
      this.notifyListeners();
      return this.models;
    } catch (error) {
      console.error('Failed to fetch models:', error);
      throw error;
    }
  }

  /**
   * Get current model
   * @returns {string|null} Current model ID
   */
  getCurrentModel() {
    return this.currentModel;
  }

  /**
   * Get current model object
   * @returns {Object|null} Current model object
   */
  getCurrentModelObject() {
    return this.models.find(m => m.id === this.currentModel) || null;
  }

  /**
   * Set current model
   * @param {string} modelId - Model ID to set as current
   */
  setCurrentModel(modelId) {
    if (this.models.find(m => m.id === modelId)) {
      this.currentModel = modelId;
      this.storage.set('currentModel', modelId);
      this.notifyListeners();
    } else {
      console.warn('Model not found:', modelId);
    }
  }

  /**
   * Get all available models
   * @returns {Array} Array of models
   */
  getModels() {
    return this.models;
  }

  /**
   * Add change listener
   * @param {Function} listener - Listener function
   */
  addListener(listener) {
    this.listeners.add(listener);
  }

  /**
   * Remove change listener
   * @param {Function} listener - Listener function
   */
  removeListener(listener) {
    this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of changes
   */
  notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener({
          currentModel: this.currentModel,
          models: this.models
        });
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }

  /**
   * Get display name for a model
   * @param {string} modelId - Model ID
   * @returns {string} Display name
   */
  getModelDisplayName(modelId) {
    const model = this.models.find(m => m.id === modelId);
    if (!model) return modelId;
    
    // Format model name for display
    let name = model.name || model.id;
    
    // Remove common prefixes for cleaner display
    name = name.replace(/^(models\/|accounts\/[^/]+\/)/, '');
    
    // Capitalize and format
    name = name.split(/[-_]/).map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    return name;
  }
}

/**
 * Create model selector UI element
 * @param {ModelManager} modelManager - Model manager instance
 * @returns {HTMLElement} Model selector element
 */
export function createModelSelectorUI(modelManager) {
  const container = document.createElement('div');
  container.className = 'model-selector-container';
  
  const button = document.createElement('button');
  button.className = 'model-selector-button btn-secondary btn-sm';
  button.innerHTML = `
    <span class="model-icon">⚡</span>
    <span class="model-name">Loading...</span>
    <span class="dropdown-icon">▼</span>
  `;
  
  const dropdown = document.createElement('div');
  dropdown.className = 'model-dropdown';
  dropdown.style.display = 'none';
  
  // Update button text with current model
  const updateButton = () => {
    const currentModel = modelManager.getCurrentModel();
    const modelName = currentModel 
      ? modelManager.getModelDisplayName(currentModel)
      : 'Select Model';
    
    button.querySelector('.model-name').textContent = modelName;
  };
  
  // Populate dropdown with models
  const populateDropdown = () => {
    const models = modelManager.getModels();
    const currentModel = modelManager.getCurrentModel();
    
    dropdown.innerHTML = '';
    
    if (models.length === 0) {
      dropdown.innerHTML = '<div class="model-dropdown-empty">No models available</div>';
      return;
    }
    
    models.forEach(model => {
      const item = document.createElement('div');
      item.className = 'model-dropdown-item';
      if (model.id === currentModel) {
        item.classList.add('active');
      }
      
      item.innerHTML = `
        <div class="model-item-name">${modelManager.getModelDisplayName(model.id)}</div>
        <div class="model-item-id">${model.id}</div>
      `;
      
      item.addEventListener('click', () => {
        modelManager.setCurrentModel(model.id);
        dropdown.style.display = 'none';
      });
      
      dropdown.appendChild(item);
    });
  };
  
  // Toggle dropdown
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = dropdown.style.display === 'block';
    dropdown.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible) {
      populateDropdown();
    }
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    dropdown.style.display = 'none';
  });
  
  // Listen for model changes
  modelManager.addListener(({ currentModel, models }) => {
    updateButton();
    if (dropdown.style.display === 'block') {
      populateDropdown();
    }
  });
  
  // Initial update
  updateButton();
  
  container.appendChild(button);
  container.appendChild(dropdown);
  
  return container;
}

export default ModelManager;
