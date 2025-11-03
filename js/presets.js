/**
 * Parameter Presets Manager
 * Handles saving, loading, and managing parameter configurations
 */

import storage from './storage.js';

/**
 * Built-in default presets
 */
const DEFAULT_PRESETS = {
  'chat': {
    name: 'Chat',
    description: 'Balanced settings for general conversation',
    parameters: {
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 2048,
      presencePenalty: 0,
      frequencyPenalty: 0
    },
    icon: '💬'
  },
  'creative': {
    name: 'Creative Writing',
    description: 'Higher creativity for stories and creative content',
    parameters: {
      temperature: 1.2,
      topP: 0.95,
      maxTokens: 4096,
      presencePenalty: 0.6,
      frequencyPenalty: 0.3
    },
    icon: '✨'
  },
  'code': {
    name: 'Code Assistant',
    description: 'Precise and focused for programming tasks',
    parameters: {
      temperature: 0.3,
      topP: 0.85,
      maxTokens: 4096,
      presencePenalty: 0,
      frequencyPenalty: 0
    },
    icon: '💻'
  },
  'factual': {
    name: 'Factual Q&A',
    description: 'Low temperature for accurate, factual responses',
    parameters: {
      temperature: 0.2,
      topP: 0.8,
      maxTokens: 2048,
      presencePenalty: 0,
      frequencyPenalty: 0.5
    },
    icon: '📚'
  },
  'analytical': {
    name: 'Analytical',
    description: 'Structured thinking for analysis and problem-solving',
    parameters: {
      temperature: 0.5,
      topP: 0.9,
      maxTokens: 3072,
      presencePenalty: 0.3,
      frequencyPenalty: 0.3
    },
    icon: '🔍'
  }
};

/**
 * Presets Manager class
 */
class PresetsManager {
  constructor() {
    this.presets = this.loadPresets();
    this.currentPreset = null;
  }

  /**
   * Initialize presets with defaults if needed
   */
  initialize() {
    const saved = storage.get('presets');
    if (!saved) {
      // First time - save default presets
      this.presets = { ...DEFAULT_PRESETS };
      this.savePresets();
    }
  }

  /**
   * Load presets from storage
   * @returns {Object} Presets object
   */
  loadPresets() {
    const saved = storage.get('presets');
    if (saved) {
      // Merge with defaults to ensure new defaults are available
      return { ...DEFAULT_PRESETS, ...saved };
    }
    return { ...DEFAULT_PRESETS };
  }

  /**
   * Save presets to storage
   */
  savePresets() {
    // Only save user-created presets, not defaults
    const userPresets = {};
    for (const [id, preset] of Object.entries(this.presets)) {
      if (!DEFAULT_PRESETS[id]) {
        userPresets[id] = preset;
      }
    }
    storage.set('presets', userPresets);
  }

  /**
   * Get all presets
   * @returns {Object} All presets
   */
  getAllPresets() {
    return this.presets;
  }

  /**
   * Get default presets only
   * @returns {Object} Default presets
   */
  getDefaultPresets() {
    return DEFAULT_PRESETS;
  }

  /**
   * Get user-created presets only
   * @returns {Object} User presets
   */
  getUserPresets() {
    const userPresets = {};
    for (const [id, preset] of Object.entries(this.presets)) {
      if (!DEFAULT_PRESETS[id]) {
        userPresets[id] = preset;
      }
    }
    return userPresets;
  }

  /**
   * Get a specific preset
   * @param {string} id - Preset ID
   * @returns {Object|null} Preset or null
   */
  getPreset(id) {
    return this.presets[id] || null;
  }

  /**
   * Create a new preset
   * @param {string} name - Preset name
   * @param {string} description - Preset description
   * @param {Object} parameters - Parameter values
   * @param {string} icon - Optional icon
   * @returns {string} Preset ID
   */
  createPreset(name, description, parameters, icon = '⚙️') {
    const id = this.generatePresetId(name);
    
    this.presets[id] = {
      name,
      description,
      parameters: { ...parameters },
      icon,
      custom: true,
      created: Date.now()
    };

    this.savePresets();
    
    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('presetsUpdated'));
    
    return id;
  }

  /**
   * Update an existing preset
   * @param {string} id - Preset ID
   * @param {Object} updates - Updates to apply
   * @returns {boolean} Success status
   */
  updatePreset(id, updates) {
    if (!this.presets[id] || DEFAULT_PRESETS[id]) {
      return false; // Can't update default presets
    }

    Object.assign(this.presets[id], updates);
    this.savePresets();
    
    window.dispatchEvent(new CustomEvent('presetsUpdated'));
    return true;
  }

  /**
   * Delete a preset
   * @param {string} id - Preset ID
   * @returns {boolean} Success status
   */
  deletePreset(id) {
    if (!this.presets[id] || DEFAULT_PRESETS[id]) {
      return false; // Can't delete default presets
    }

    delete this.presets[id];
    this.savePresets();
    
    window.dispatchEvent(new CustomEvent('presetsUpdated'));
    return true;
  }

  /**
   * Apply a preset (returns parameter values)
   * @param {string} id - Preset ID
   * @returns {Object|null} Parameter values or null
   */
  applyPreset(id) {
    const preset = this.getPreset(id);
    if (!preset) return null;

    this.currentPreset = id;
    return { ...preset.parameters };
  }

  /**
   * Get current preset ID
   * @returns {string|null} Current preset ID
   */
  getCurrentPreset() {
    return this.currentPreset;
  }

  /**
   * Clear current preset
   */
  clearCurrentPreset() {
    this.currentPreset = null;
  }

  /**
   * Generate a unique preset ID from name
   * @param {string} name - Preset name
   * @returns {string} Preset ID
   */
  generatePresetId(name) {
    const base = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    let id = base;
    let counter = 1;

    while (this.presets[id]) {
      id = `${base}_${counter}`;
      counter++;
    }

    return id;
  }

  /**
   * Export presets as JSON
   * @returns {string} JSON string
   */
  exportPresets() {
    const userPresets = this.getUserPresets();
    return JSON.stringify(userPresets, null, 2);
  }

  /**
   * Import presets from JSON
   * @param {string} jsonString - JSON string
   * @returns {boolean} Success status
   */
  importPresets(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      
      // Validate structure
      for (const [id, preset] of Object.entries(imported)) {
        if (!preset.name || !preset.parameters) {
          throw new Error('Invalid preset structure');
        }
      }

      // Merge with existing presets
      this.presets = { ...this.presets, ...imported };
      this.savePresets();
      
      window.dispatchEvent(new CustomEvent('presetsUpdated'));
      return true;
    } catch (err) {
      console.error('Failed to import presets:', err);
      return false;
    }
  }

  /**
   * Check if parameters match a preset
   * @param {Object} parameters - Current parameters
   * @returns {string|null} Matching preset ID or null
   */
  findMatchingPreset(parameters) {
    for (const [id, preset] of Object.entries(this.presets)) {
      const match = Object.keys(preset.parameters).every(key => {
        return Math.abs(preset.parameters[key] - (parameters[key] || 0)) < 0.01;
      });
      
      if (match) {
        return id;
      }
    }
    return null;
  }
}

// Export singleton instance
const presetsManager = new PresetsManager();
presetsManager.initialize();

export default presetsManager;
