/**
 * Parameter controls for LLM generation
 * Manages temperature, top-p, max tokens, etc.
 */

import presetsManager from './presets.js';

export class ParameterManager {
  constructor(storage) {
    this.storage = storage;
    this.parameters = this.loadParameters();
    this.listeners = new Set();
    this.currentModel = null;
  }

  /**
   * Load parameters from storage with defaults
   * @param {string} modelId - Optional model ID to load model-specific parameters
   * @returns {Object} Parameters object
   */
  loadParameters(modelId = null) {
    // If modelId is provided, check for model-specific config
    if (modelId) {
      const modelConfig = this.storage.getModelConfig(modelId);
      if (modelConfig) {
        return {
          ...modelConfig,
          useServerDefaults: modelConfig.useServerDefaults || {
            temperature: true,
            topP: true,
            maxTokens: true,
            presencePenalty: true,
            frequencyPenalty: true
          }
        };
      }
    }

    // Return global defaults
    return {
      temperature: this.storage.get('parameters.temperature') ?? 0.7,
      topP: this.storage.get('parameters.topP') ?? 0.9,
      maxTokens: this.storage.get('parameters.maxTokens') ?? 2048,
      presencePenalty: this.storage.get('parameters.presencePenalty') ?? 0,
      frequencyPenalty: this.storage.get('parameters.frequencyPenalty') ?? 0,
      systemPrompt: this.storage.get('parameters.systemPrompt') ?? '',
      useServerDefaults: {
        temperature: this.storage.get('parameters.useServerDefaults.temperature') ?? true,
        topP: this.storage.get('parameters.useServerDefaults.topP') ?? true,
        maxTokens: this.storage.get('parameters.useServerDefaults.maxTokens') ?? true,
        presencePenalty: this.storage.get('parameters.useServerDefaults.presencePenalty') ?? true,
        frequencyPenalty: this.storage.get('parameters.useServerDefaults.frequencyPenalty') ?? true
      }
    };
  }

  /**
   * Save parameters to storage
   */
  saveParameters() {
    Object.entries(this.parameters).forEach(([key, value]) => {
      if (key === 'useServerDefaults') {
        Object.entries(value).forEach(([param, val]) => {
          this.storage.set(`parameters.useServerDefaults.${param}`, val);
        });
      } else {
        this.storage.set(`parameters.${key}`, value);
      }
    });
    this.notifyListeners();
  }

  /**
   * Get parameter value
   * @param {string} key - Parameter key
   * @returns {*} Parameter value
   */
  get(key) {
    return this.parameters[key];
  }

  /**
   * Set parameter value
   * @param {string} key - Parameter key
   * @param {*} value - Parameter value
   */
  set(key, value) {
    if (key.startsWith('useServerDefaults.')) {
      const param = key.split('.')[1];
      this.parameters.useServerDefaults[param] = value;
      this.storage.set(`parameters.${key}`, value);
    } else {
      this.parameters[key] = value;
      this.storage.set(`parameters.${key}`, value);
    }
    this.notifyListeners();
  }

  /**
   * Get all parameters
   * @returns {Object} All parameters
   */
  getAll() {
    return { ...this.parameters };
  }

  /**
   * Reset to default parameters
   */
  resetToDefaults() {
    this.parameters = {
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 2048,
      presencePenalty: 0,
      frequencyPenalty: 0,
      systemPrompt: '',
      useServerDefaults: {
        temperature: true,
        topP: true,
        maxTokens: true,
        presencePenalty: true,
        frequencyPenalty: true
      }
    };
    this.saveParameters();
  }

  /**
   * Apply a preset to parameters
   * @param {string} presetId - Preset ID
   * @returns {boolean} Success status
   */
  applyPreset(presetId) {
    const presetParams = presetsManager.applyPreset(presetId);
    if (!presetParams) return false;

    // Apply preset parameters
    Object.entries(presetParams).forEach(([key, value]) => {
      if (this.parameters[key] !== undefined) {
        this.parameters[key] = value;
        this.storage.set(`parameters.${key}`, value);
      }
    });

    this.saveParameters();
    return true;
  }

  /**
   * Get current preset if parameters match
   * @returns {string|null} Preset ID or null
   */
  getCurrentPreset() {
    return presetsManager.findMatchingPreset(this.parameters);
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
        listener(this.parameters);
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }

  /**
   * Switch to a different model and load its parameters
   * @param {string} modelId - Model ID
   */
  switchToModel(modelId) {
    this.currentModel = modelId;
    this.parameters = this.loadParameters(modelId);
    this.notifyListeners();
  }

  /**
   * Save current parameters for the current model
   * @param {string} modelId - Model ID (optional, uses current if not provided)
   * @returns {boolean} Success status
   */
  saveForModel(modelId = null) {
    const targetModel = modelId || this.currentModel;
    if (!targetModel) return false;

    const config = {
      temperature: this.parameters.temperature,
      topP: this.parameters.topP,
      maxTokens: this.parameters.maxTokens,
      presencePenalty: this.parameters.presencePenalty,
      frequencyPenalty: this.parameters.frequencyPenalty,
      systemPrompt: this.parameters.systemPrompt,
      useServerDefaults: { ...this.parameters.useServerDefaults }
    };

    this.storage.saveModelConfig(targetModel, config);
    return true;
  }

  /**
   * Check if current model has custom configuration
   * @returns {boolean} True if model has custom config
   */
  hasModelConfig() {
    return this.currentModel && this.storage.hasModelConfig(this.currentModel);
  }

  /**
   * Reset current model to global defaults
   * @returns {boolean} Success status
   */
  resetModelToDefaults() {
    if (!this.currentModel) return false;
    
    this.storage.resetModelToDefaults(this.currentModel);
    this.parameters = this.loadParameters();
    this.notifyListeners();
    return true;
  }

  /**
   * Get current model ID
   * @returns {string|null} Current model ID
   */
  getCurrentModel() {
    return this.currentModel;
  }
}

/**
 * Create preset selector UI
 * @param {ParameterManager} paramManager - Parameter manager instance
 * @returns {HTMLElement} Preset selector element
 */
export function createPresetSelectorUI(paramManager) {
  const container = document.createElement('div');
  container.className = 'preset-selector-container';
  
  const header = document.createElement('div');
  header.className = 'preset-selector-header';
  
  const title = document.createElement('h4');
  title.textContent = 'Parameter Presets';
  title.style.margin = '0 0 0.5rem 0';
  
  const description = document.createElement('p');
  description.className = 'preset-description';
  description.textContent = 'Quick-load parameter configurations for different use cases';
  description.style.fontSize = 'var(--text-sm)';
  description.style.color = 'var(--text-muted)';
  description.style.marginBottom = '1rem';
  
  header.appendChild(title);
  header.appendChild(description);
  
  // Preset grid
  const grid = document.createElement('div');
  grid.className = 'preset-grid';
  grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem; margin-bottom: 1.5rem;';
  
  const renderPresets = () => {
    grid.innerHTML = '';
    const allPresets = presetsManager.getAllPresets();
    const currentPresetId = paramManager.getCurrentPreset();
    
    Object.entries(allPresets).forEach(([id, preset]) => {
      const card = document.createElement('button');
      card.className = 'preset-card';
      card.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        padding: 0.75rem;
        background: var(--bg-message);
        border: 1px solid var(--border-color);
        border-radius: 6px;
        cursor: pointer;
        transition: all var(--duration-fast) var(--ease-in-out);
        text-align: left;
      `;
      
      if (id === currentPresetId) {
        card.style.borderColor = 'var(--text-primary)';
        card.style.background = 'var(--hover-bg)';
      }
      
      card.addEventListener('mouseenter', () => {
        if (id !== currentPresetId) {
          card.style.background = 'var(--hover-bg)';
          card.style.transform = 'translateY(-2px)';
        }
      });
      
      card.addEventListener('mouseleave', () => {
        if (id !== currentPresetId) {
          card.style.background = 'var(--bg-message)';
          card.style.transform = 'translateY(0)';
        }
      });
      
      card.addEventListener('click', () => {
        paramManager.applyPreset(id);
        renderPresets();
        // Trigger update of parameter controls
        window.dispatchEvent(new CustomEvent('presetApplied', { detail: { presetId: id } }));
      });
      
      const iconName = document.createElement('div');
      iconName.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;';
      
      const icon = document.createElement('span');
      icon.textContent = preset.icon || '⚙️';
      icon.style.fontSize = '1.25rem';
      
      const name = document.createElement('span');
      name.textContent = preset.name;
      name.style.fontWeight = '500';
      name.style.fontSize = 'var(--text-base)';
      
      iconName.appendChild(icon);
      iconName.appendChild(name);
      
      const desc = document.createElement('div');
      desc.textContent = preset.description;
      desc.style.fontSize = 'var(--text-xs)';
      desc.style.color = 'var(--text-muted)';
      desc.style.lineHeight = '1.4';
      
      card.appendChild(iconName);
      card.appendChild(desc);
      
      // Show custom badge
      if (preset.custom) {
        const badge = document.createElement('span');
        badge.textContent = 'Custom';
        badge.style.cssText = `
          display: inline-block;
          margin-top: 0.5rem;
          padding: 0.125rem 0.5rem;
          background: var(--bg-deep);
          border: 1px solid var(--border-color);
          border-radius: 4px;
          font-size: 0.6875rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        `;
        card.appendChild(badge);
      }
      
      grid.appendChild(card);
    });
  };
  
  renderPresets();
  
  // Action buttons
  const actions = document.createElement('div');
  actions.style.cssText = 'display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);';
  
  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-secondary btn-sm';
  saveBtn.textContent = '💾 Save Current as Preset';
  saveBtn.addEventListener('click', () => {
    const name = prompt('Enter preset name:');
    if (!name) return;
    
    const description = prompt('Enter preset description:');
    if (!description) return;
    
    const icon = prompt('Enter emoji icon (optional):') || '⚙️';
    
    const params = paramManager.getAll();
    const presetParams = {
      temperature: params.temperature,
      topP: params.topP,
      maxTokens: params.maxTokens,
      presencePenalty: params.presencePenalty,
      frequencyPenalty: params.frequencyPenalty
    };
    
    presetsManager.createPreset(name, description, presetParams, icon);
    renderPresets();
  });
  
  const exportBtn = document.createElement('button');
  exportBtn.className = 'btn btn-secondary btn-sm';
  exportBtn.textContent = '📤 Export Presets';
  exportBtn.addEventListener('click', () => {
    const json = presetsManager.exportPresets();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `llmwebui-presets-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
  
  const importBtn = document.createElement('button');
  importBtn.className = 'btn btn-secondary btn-sm';
  importBtn.textContent = '📥 Import Presets';
  importBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const success = presetsManager.importPresets(event.target.result);
        if (success) {
          alert('Presets imported successfully!');
          renderPresets();
        } else {
          alert('Failed to import presets. Please check the file format.');
        }
      };
      reader.readAsText(file);
    });
    input.click();
  });
  
  actions.appendChild(saveBtn);
  actions.appendChild(exportBtn);
  actions.appendChild(importBtn);
  
  container.appendChild(header);
  container.appendChild(grid);
  container.appendChild(actions);
  
  // Listen for preset updates
  window.addEventListener('presetsUpdated', renderPresets);
  
  return container;
}

/**
 * Create parameter controls UI
 * @param {ParameterManager} paramManager - Parameter manager instance
 * @returns {HTMLElement} Parameter controls element
 */
export function createParameterControlsUI(paramManager) {
  const container = document.createElement('div');
  container.className = 'parameter-controls';
  
  // Temperature Control
  const tempGroup = createSliderControl({
    label: 'Temperature',
    id: 'temperature',
    min: 0,
    max: 2,
    step: 0.1,
    value: paramManager.get('temperature'),
    useServerDefault: paramManager.get('useServerDefaults')?.temperature ?? false,
    description: 'Controls randomness. Lower = more focused, Higher = more creative',
    onChange: (value) => paramManager.set('temperature', parseFloat(value)),
    onToggleDefault: (checked) => paramManager.set('useServerDefaults.temperature', checked),
    paramManager
  });
  
  // Top-P Control
  const topPGroup = createSliderControl({
    label: 'Top P',
    id: 'topP',
    min: 0,
    max: 1,
    step: 0.05,
    value: paramManager.get('topP'),
    useServerDefault: paramManager.get('useServerDefaults')?.topP ?? false,
    description: 'Nucleus sampling. Controls diversity of responses',
    onChange: (value) => paramManager.set('topP', parseFloat(value)),
    onToggleDefault: (checked) => paramManager.set('useServerDefaults.topP', checked),
    paramManager
  });
  
  // Max Tokens Control
  const maxTokensGroup = createSliderControl({
    label: 'Max Tokens',
    id: 'maxTokens',
    min: 128,
    max: 8192,
    step: 128,
    value: paramManager.get('maxTokens'),
    useServerDefault: paramManager.get('useServerDefaults')?.maxTokens ?? false,
    description: 'Maximum length of the response',
    onChange: (value) => paramManager.set('maxTokens', parseInt(value)),
    onToggleDefault: (checked) => paramManager.set('useServerDefaults.maxTokens', checked),
    paramManager
  });
  
  // Presence Penalty Control
  const presenceGroup = createSliderControl({
    label: 'Presence Penalty',
    id: 'presencePenalty',
    min: -2,
    max: 2,
    step: 0.1,
    value: paramManager.get('presencePenalty'),
    useServerDefault: paramManager.get('useServerDefaults')?.presencePenalty ?? false,
    description: 'Penalizes new topics. Positive = encourage new topics',
    onChange: (value) => paramManager.set('presencePenalty', parseFloat(value)),
    onToggleDefault: (checked) => paramManager.set('useServerDefaults.presencePenalty', checked),
    paramManager
  });
  
  // Frequency Penalty Control
  const frequencyGroup = createSliderControl({
    label: 'Frequency Penalty',
    id: 'frequencyPenalty',
    min: -2,
    max: 2,
    step: 0.1,
    value: paramManager.get('frequencyPenalty'),
    useServerDefault: paramManager.get('useServerDefaults')?.frequencyPenalty ?? false,
    description: 'Penalizes repetition. Positive = reduce repetition',
    onChange: (value) => paramManager.set('frequencyPenalty', parseFloat(value)),
    onToggleDefault: (checked) => paramManager.set('useServerDefaults.frequencyPenalty', checked),
    paramManager
  });
  
  // Model selector section (at top)
  const modelSelectorSection = document.createElement('div');
  modelSelectorSection.style.cssText = 'margin-bottom: 1.5rem; padding: 1rem; background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: 8px;';
  
  const modelSelectorLabel = document.createElement('label');
  modelSelectorLabel.textContent = 'Configure Model:';
  modelSelectorLabel.style.cssText = 'display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.875rem;';
  
  const modelSelectorDesc = document.createElement('p');
  modelSelectorDesc.style.cssText = 'font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 0.75rem;';
  modelSelectorDesc.textContent = 'Select a model to configure its specific parameters, or use "Global Defaults" for all models.';
  
  const modelSelect = document.createElement('select');
  modelSelect.className = 'form-control';
  modelSelect.id = 'paramModelSelect';
  modelSelect.style.marginBottom = '0.5rem';
  
  // Populate with models
  const populateModelSelect = () => {
    modelSelect.innerHTML = '<option value="">Global Defaults (All Models)</option>';
    
    // Try to get models from window if available
    if (window.app && window.app.modelManager) {
      const models = window.app.modelManager.getModels();
      models.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.name;
        modelSelect.appendChild(option);
      });
    }
    
    // Set current selection
    const currentModel = paramManager.getCurrentModel();
    if (currentModel) {
      modelSelect.value = currentModel;
    }
  };
  
  populateModelSelect();
  
  // Handle model selection change
  modelSelect.addEventListener('change', (e) => {
    const selectedModel = e.target.value;
    if (selectedModel) {
      paramManager.switchToModel(selectedModel);
    } else {
      // Switch to global defaults
      paramManager.currentModel = null;
      paramManager.parameters = paramManager.loadParameters();
      paramManager.notifyListeners();
    }
    
    updateAllControls();
    updateModelStatus();
    
    // Emit event
    window.dispatchEvent(new CustomEvent('modelChanged', { 
      detail: { modelId: selectedModel || null } 
    }));
  });
  
  modelSelectorSection.appendChild(modelSelectorLabel);
  modelSelectorSection.appendChild(modelSelectorDesc);
  modelSelectorSection.appendChild(modelSelect);
  
  // Model-specific configuration section
  const modelConfigSection = document.createElement('div');
  modelConfigSection.style.cssText = 'margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border-default);';
  
  const modelConfigHeader = document.createElement('h4');
  modelConfigHeader.textContent = 'Save Configuration';
  modelConfigHeader.style.marginBottom = '0.5rem';
  
  const modelConfigDesc = document.createElement('p');
  modelConfigDesc.style.cssText = 'font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1rem;';
  modelConfigDesc.textContent = 'Save these parameters for the currently selected model only.';
  
  const modelConfigActions = document.createElement('div');
  modelConfigActions.style.cssText = 'display: flex; gap: 0.5rem; flex-wrap: wrap;';
  
  const saveForModelBtn = document.createElement('button');
  saveForModelBtn.className = 'btn btn-primary';
  saveForModelBtn.textContent = '💾 Save for Current Model';
  saveForModelBtn.addEventListener('click', () => {
    const currentModel = paramManager.getCurrentModel();
    if (!currentModel) {
      alert('No model selected. Please select a model from the header dropdown first.');
      return;
    }
    
    if (confirm(`Save current parameters for model "${currentModel}"?\n\nThis will create a model-specific configuration.`)) {
      const success = paramManager.saveForModel();
      if (success) {
        alert(`✓ Parameters saved for model "${currentModel}"`);
        window.dispatchEvent(new Event('modelConfigsUpdated'));
      } else {
        alert('Failed to save model configuration');
      }
    }
  });
  
  const resetModelBtn = document.createElement('button');
  resetModelBtn.className = 'btn btn-secondary';
  resetModelBtn.textContent = '🔄 Reset Model to Globals';
  resetModelBtn.addEventListener('click', () => {
    const currentModel = paramManager.getCurrentModel();
    if (!currentModel) {
      alert('No model selected.');
      return;
    }
    
    if (!paramManager.hasModelConfig()) {
      alert('This model is already using global defaults.');
      return;
    }
    
    if (confirm(`Reset model "${currentModel}" to global defaults?\n\nThis will delete the model-specific configuration.`)) {
      const success = paramManager.resetModelToDefaults();
      if (success) {
        alert(`✓ Model "${currentModel}" reset to global defaults`);
        updateAllControls();
        window.dispatchEvent(new Event('modelConfigsUpdated'));
      }
    }
  });
  
  const statusDiv = document.createElement('div');
  statusDiv.id = 'modelConfigStatus';
  statusDiv.style.cssText = 'margin-top: 0.75rem; padding: 0.75rem; background: var(--bg-tertiary); border: 1px solid var(--border-default); border-radius: 6px; font-size: 0.875rem;';
  
  const updateModelStatus = () => {
    const currentModel = paramManager.getCurrentModel();
    if (!currentModel) {
      statusDiv.innerHTML = '<span style="color: var(--text-muted);">ℹ️ No model selected - using global defaults</span>';
    } else if (paramManager.hasModelConfig()) {
      statusDiv.innerHTML = `<span style="color: var(--success, #10b981);">✓ Model "${currentModel}" has custom configuration</span>`;
    } else {
      statusDiv.innerHTML = `<span style="color: var(--text-muted);">ℹ️ Model "${currentModel}" using global defaults</span>`;
    }
  };
  
  updateModelStatus();
  
  modelConfigActions.appendChild(saveForModelBtn);
  modelConfigActions.appendChild(resetModelBtn);
  
  modelConfigSection.appendChild(modelConfigHeader);
  modelConfigSection.appendChild(modelConfigDesc);
  modelConfigSection.appendChild(modelConfigActions);
  modelConfigSection.appendChild(statusDiv);
  
  // Listen for model changes
  window.addEventListener('modelChanged', updateModelStatus);
  window.addEventListener('modelConfigsUpdated', updateModelStatus);
  
  // Reset Button
  const resetBtn = document.createElement('button');
  resetBtn.className = 'btn btn-secondary mt-2';
  resetBtn.textContent = '🔄 Reset to Global Defaults';
  resetBtn.addEventListener('click', () => {
    paramManager.resetToDefaults();
    // Update all controls
    updateAllControls();
  });
  
  const updateAllControls = () => {
    const params = paramManager.getAll();
    container.querySelectorAll('.parameter-slider').forEach(slider => {
      const id = slider.id.replace('param-', '');
      if (params[id] !== undefined) {
        slider.value = params[id];
        const valueSpan = slider.parentElement.querySelector('.parameter-value');
        if (valueSpan) {
          valueSpan.textContent = params[id];
        }
      }
    });
    // Update server default checkboxes
    container.querySelectorAll('.server-default-toggle').forEach(checkbox => {
      const paramId = checkbox.dataset.param;
      if (params.useServerDefaults && params.useServerDefaults[paramId] !== undefined) {
        checkbox.checked = params.useServerDefaults[paramId];
        const paramGroup = checkbox.closest('.parameter-group');
        if (paramGroup) {
          const slider = paramGroup.querySelector('.parameter-slider');
          if (slider) {
            slider.disabled = checkbox.checked;
            slider.style.opacity = checkbox.checked ? '0.4' : '1';
          }
        }
      }
    });
  };
  
  container.appendChild(modelSelectorSection);
  container.appendChild(tempGroup);
  container.appendChild(topPGroup);
  container.appendChild(maxTokensGroup);
  container.appendChild(presenceGroup);
  container.appendChild(frequencyGroup);
  container.appendChild(resetBtn);
  container.appendChild(modelConfigSection);
  
  // Listen for preset application to update controls
  window.addEventListener('presetApplied', () => {
    updateAllControls();
  });
  
  // Listen for model list updates
  window.addEventListener('modelsLoaded', populateModelSelect);
  
  return container;
}

/**
 * Create a slider control
 * @param {Object} config - Slider configuration
 * @returns {HTMLElement} Slider control element
 */
function createSliderControl(config) {
  const { label, id, min, max, step, value, description, onChange, useServerDefault, onToggleDefault } = config;
  
  const group = document.createElement('div');
  group.className = 'form-group parameter-group';
  
  const labelRow = document.createElement('div');
  labelRow.className = 'parameter-label-row';
  
  const labelEl = document.createElement('label');
  labelEl.textContent = label;
  labelEl.htmlFor = `param-${id}`;
  
  const rightSide = document.createElement('div');
  rightSide.className = 'parameter-right-side';
  
  const valueSpan = document.createElement('span');
  valueSpan.className = 'parameter-value';
  valueSpan.textContent = value;
  
  rightSide.appendChild(valueSpan);
  
  labelRow.appendChild(labelEl);
  labelRow.appendChild(rightSide);
  
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.id = `param-${id}`;
  slider.className = 'form-control-range parameter-slider';
  slider.min = min;
  slider.max = max;
  slider.step = step;
  slider.value = value;
  slider.disabled = useServerDefault;
  slider.style.opacity = useServerDefault ? '0.4' : '1';
  
  slider.addEventListener('input', (e) => {
    const newValue = parseFloat(e.target.value);
    valueSpan.textContent = newValue;
    onChange(newValue);
  });
  
  const controlsRow = document.createElement('div');
  controlsRow.className = 'parameter-controls-row';
  
  const desc = document.createElement('div');
  desc.className = 'parameter-description';
  desc.textContent = description;
  
  // Server default toggle
  const toggleContainer = document.createElement('label');
  toggleContainer.className = 'server-default-label';
  
  const toggleCheckbox = document.createElement('input');
  toggleCheckbox.type = 'checkbox';
  toggleCheckbox.className = 'server-default-toggle';
  toggleCheckbox.dataset.param = id;
  toggleCheckbox.checked = useServerDefault;
  
  toggleCheckbox.addEventListener('change', (e) => {
    const checked = e.target.checked;
    slider.disabled = checked;
    slider.style.opacity = checked ? '0.4' : '1';
    onToggleDefault(checked);
  });
  
  const toggleText = document.createElement('span');
  toggleText.textContent = 'Use Server Default';
  toggleText.className = 'server-default-text';
  
  toggleContainer.appendChild(toggleCheckbox);
  toggleContainer.appendChild(toggleText);
  
  controlsRow.appendChild(desc);
  
  group.appendChild(labelRow);
  group.appendChild(slider);
  group.appendChild(controlsRow);
  group.appendChild(toggleContainer);
  
  return group;
}

/**
 * Create system prompt UI
 * @param {ParameterManager} paramManager - Parameter manager instance
 * @returns {HTMLElement} System prompt element
 */
export function createSystemPromptUI(paramManager) {
  const container = document.createElement('div');
  container.className = 'system-prompt-container';
  
  const group = document.createElement('div');
  group.className = 'form-group';
  
  const label = document.createElement('label');
  label.textContent = 'System Prompt';
  label.htmlFor = 'systemPrompt';
  
  const textarea = document.createElement('textarea');
  textarea.id = 'systemPrompt';
  textarea.className = 'form-control';
  textarea.placeholder = 'Enter custom instructions for the AI...';
  textarea.value = paramManager.get('systemPrompt') || '';
  textarea.rows = 4;
  
  textarea.addEventListener('input', (e) => {
    paramManager.set('systemPrompt', e.target.value);
  });
  
  const description = document.createElement('div');
  description.className = 'parameter-description';
  description.textContent = 'Custom instructions that guide the AI\'s behavior and responses';
  
  // Templates
  const templatesBtn = document.createElement('button');
  templatesBtn.className = 'btn btn-secondary btn-sm mt-1';
  templatesBtn.textContent = '📋 Load Template';
  
  const templates = [
    {
      name: 'Default Assistant',
      prompt: 'You are a helpful AI assistant. Provide accurate and concise responses.'
    },
    {
      name: 'Code Expert',
      prompt: 'You are an expert programmer. Provide detailed code examples and explanations. Always include comments in code.'
    },
    {
      name: 'Creative Writer',
      prompt: 'You are a creative writing assistant. Help with storytelling, character development, and engaging narratives.'
    },
    {
      name: 'Technical Educator',
      prompt: 'You are a technical educator. Explain complex concepts in simple terms with examples and analogies.'
    },
    {
      name: 'Clear',
      prompt: ''
    }
  ];
  
  templatesBtn.addEventListener('click', () => {
    const template = templates[Math.floor(Math.random() * templates.length)];
    // For now, just cycle through or show a simple prompt
    const choice = prompt('Choose template:\n1. Default Assistant\n2. Code Expert\n3. Creative Writer\n4. Technical Educator\n5. Clear\n\nEnter number (1-5):');
    
    if (choice && choice >= 1 && choice <= 5) {
      const selected = templates[parseInt(choice) - 1];
      textarea.value = selected.prompt;
      paramManager.set('systemPrompt', selected.prompt);
    }
  });
  
  group.appendChild(label);
  group.appendChild(textarea);
  group.appendChild(description);
  group.appendChild(templatesBtn);
  
  container.appendChild(group);
  
  return container;
}

export default ParameterManager;
