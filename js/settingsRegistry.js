/**
 * Settings Registry - Centralized settings definition and management
 * All settings are registered here with their metadata, validation, and behavior
 */

/**
 * Setting categories with display metadata
 */
export const SettingsCategories = {
  general: {
    id: 'general',
    icon: '⚙️',
    label: 'General',
    description: 'Basic application settings and information',
    weight: 0
  },
  endpoints: {
    id: 'endpoints',
    icon: '🔌',
    label: 'API Endpoints',
    description: 'Configure API connections',
    weight: 1
  },
  models: {
    id: 'models',
    icon: '🤖',
    label: 'Model Configs',
    description: 'Per-model parameter configurations',
    weight: 2
  },
  parameters: {
    id: 'parameters',
    icon: '🎚️',
    label: 'Parameters',
    description: 'Default generation parameters',
    weight: 3
  },
  presets: {
    id: 'presets',
    icon: '💾',
    label: 'Presets',
    description: 'Parameter preset management',
    weight: 4
  },
  rag: {
    id: 'rag',
    icon: '📚',
    label: 'Documents',
    description: 'RAG document management',
    weight: 5
  },
  tags: {
    id: 'tags',
    icon: '🏷️',
    label: 'Tags',
    description: 'Conversation tag management',
    weight: 6
  },
  appearance: {
    id: 'appearance',
    icon: '🎨',
    label: 'Appearance',
    description: 'Theme and visual settings',
    weight: 7
  },
  shortcuts: {
    id: 'shortcuts',
    icon: '⌨️',
    label: 'Keyboard Shortcuts',
    description: 'View and customize keyboard shortcuts',
    weight: 8
  },
  data: {
    id: 'data',
    icon: '💾',
    label: 'Data Management',
    description: 'Export, import, and clear data',
    weight: 9
  }
};

/**
 * Setting definitions
 */
export const SettingsDefinitions = {
  // General settings
  'general.streaming': {
    id: 'general.streaming',
    category: 'general',
    type: 'toggle',
    label: 'Enable Streaming',
    description: 'Stream AI responses in real-time as they generate',
    default: true,
    storageKey: 'preferences.streamingEnabled',
    searchTerms: ['streaming', 'real-time', 'live', 'response']
  },
  'general.showStats': {
    id: 'general.showStats',
    category: 'general',
    type: 'toggle',
    label: 'Show Statistics',
    description: 'Display generation statistics (tokens/sec, time, etc.)',
    default: true,
    storageKey: 'preferences.showStats',
    searchTerms: ['statistics', 'stats', 'tokens', 'performance']
  },
  'general.autoSave': {
    id: 'general.autoSave',
    category: 'general',
    type: 'toggle',
    label: 'Auto-save Conversations',
    description: 'Automatically save conversations after each message',
    default: true,
    storageKey: 'preferences.autoSave',
    searchTerms: ['auto', 'save', 'backup', 'automatic']
  },

  // Appearance settings
  'appearance.theme': {
    id: 'appearance.theme',
    category: 'appearance',
    type: 'select',
    label: 'Color Theme',
    description: 'Choose your preferred color theme',
    options: [
      { value: 'black', label: 'Black (OLED)' },
      { value: 'dark', label: 'Dark (Charcoal)' },
      { value: 'light', label: 'Light' }
    ],
    default: 'black',
    storageKey: 'theme',
    searchTerms: ['theme', 'color', 'dark', 'light', 'black', 'oled']
  },
  'appearance.fontSize': {
    id: 'appearance.fontSize',
    category: 'appearance',
    type: 'select',
    label: 'Font Size',
    description: 'Adjust the interface font size',
    options: [
      { value: 'small', label: 'Small' },
      { value: 'medium', label: 'Medium' },
      { value: 'large', label: 'Large' }
    ],
    default: 'medium',
    storageKey: 'preferences.fontSize',
    searchTerms: ['font', 'size', 'text', 'readability']
  },
  'appearance.compactMode': {
    id: 'appearance.compactMode',
    category: 'appearance',
    type: 'toggle',
    label: 'Compact Mode',
    description: 'Reduce spacing for a more compact interface',
    default: false,
    storageKey: 'preferences.compactMode',
    searchTerms: ['compact', 'spacing', 'density', 'tight']
  },

  // Parameter defaults
  'parameters.temperature': {
    id: 'parameters.temperature',
    category: 'parameters',
    type: 'slider',
    label: 'Temperature',
    description: 'Controls randomness. Lower = focused, Higher = creative',
    min: 0,
    max: 2,
    step: 0.1,
    default: 0.7,
    storageKey: 'parameters.temperature',
    searchTerms: ['temperature', 'randomness', 'creativity', 'focus']
  },
  'parameters.topP': {
    id: 'parameters.topP',
    category: 'parameters',
    type: 'slider',
    label: 'Top P',
    description: 'Nucleus sampling. Controls diversity of responses',
    min: 0,
    max: 1,
    step: 0.05,
    default: 0.9,
    storageKey: 'parameters.topP',
    searchTerms: ['top-p', 'nucleus', 'sampling', 'diversity']
  },
  'parameters.maxTokens': {
    id: 'parameters.maxTokens',
    category: 'parameters',
    type: 'slider',
    label: 'Max Tokens',
    description: 'Maximum length of AI responses',
    min: 128,
    max: 8192,
    step: 128,
    default: 2048,
    storageKey: 'parameters.maxTokens',
    searchTerms: ['max', 'tokens', 'length', 'limit']
  },
  'parameters.presencePenalty': {
    id: 'parameters.presencePenalty',
    category: 'parameters',
    type: 'slider',
    label: 'Presence Penalty',
    description: 'Penalizes new topics. Positive = encourage new topics',
    min: -2,
    max: 2,
    step: 0.1,
    default: 0,
    storageKey: 'parameters.presencePenalty',
    searchTerms: ['presence', 'penalty', 'topics', 'diversity']
  },
  'parameters.frequencyPenalty': {
    id: 'parameters.frequencyPenalty',
    category: 'parameters',
    type: 'slider',
    label: 'Frequency Penalty',
    description: 'Penalizes repetition. Positive = reduce repetition',
    min: -2,
    max: 2,
    step: 0.1,
    default: 0,
    storageKey: 'parameters.frequencyPenalty',
    searchTerms: ['frequency', 'penalty', 'repetition', 'repeat']
  }
};

/**
 * Settings Registry class
 */
export class SettingsRegistry {
  constructor(storage) {
    this.storage = storage;
    this.categories = SettingsCategories;
    this.definitions = SettingsDefinitions;
    this.cache = new Map();
  }

  /**
   * Get all categories sorted by weight
   * @returns {Array} Array of category objects
   */
  getCategories() {
    return Object.values(this.categories).sort((a, b) => a.weight - b.weight);
  }

  /**
   * Get category by ID
   * @param {string} categoryId - Category ID
   * @returns {Object|null} Category object
   */
  getCategory(categoryId) {
    return this.categories[categoryId] || null;
  }

  /**
   * Get all settings for a category
   * @param {string} categoryId - Category ID
   * @returns {Array} Array of setting definitions
   */
  getSettingsForCategory(categoryId) {
    return Object.values(this.definitions)
      .filter(setting => setting.category === categoryId);
  }

  /**
   * Get setting definition by ID
   * @param {string} settingId - Setting ID
   * @returns {Object|null} Setting definition
   */
  getDefinition(settingId) {
    return this.definitions[settingId] || null;
  }

  /**
   * Get setting value
   * @param {string} settingId - Setting ID
   * @returns {*} Setting value
   */
  getValue(settingId) {
    const definition = this.getDefinition(settingId);
    if (!definition) return null;

    // Check cache first
    if (this.cache.has(settingId)) {
      return this.cache.get(settingId);
    }

    // Get from storage
    const value = this.storage.get(definition.storageKey);
    const finalValue = value !== null ? value : definition.default;
    
    // Cache it
    this.cache.set(settingId, finalValue);
    
    return finalValue;
  }

  /**
   * Set setting value
   * @param {string} settingId - Setting ID
   * @param {*} value - New value
   * @returns {boolean} Success status
   */
  setValue(settingId, value) {
    const definition = this.getDefinition(settingId);
    if (!definition) return false;

    // Validate value
    if (!this.validate(settingId, value)) {
      console.error(`Invalid value for setting ${settingId}:`, value);
      return false;
    }

    // Save to storage
    this.storage.set(definition.storageKey, value);
    
    // Update cache
    this.cache.set(settingId, value);
    
    // Emit change event
    window.dispatchEvent(new CustomEvent('settingChanged', {
      detail: { settingId, value, definition }
    }));

    return true;
  }

  /**
   * Validate setting value
   * @param {string} settingId - Setting ID
   * @param {*} value - Value to validate
   * @returns {boolean} Valid status
   */
  validate(settingId, value) {
    const definition = this.getDefinition(settingId);
    if (!definition) return false;

    switch (definition.type) {
      case 'toggle':
        return typeof value === 'boolean';
      
      case 'select':
        return definition.options.some(opt => opt.value === value);
      
      case 'slider':
        return typeof value === 'number' && 
               value >= definition.min && 
               value <= definition.max;
      
      case 'text':
      case 'textarea':
        return typeof value === 'string';
      
      default:
        return true;
    }
  }

  /**
   * Reset setting to default
   * @param {string} settingId - Setting ID
   * @returns {boolean} Success status
   */
  resetToDefault(settingId) {
    const definition = this.getDefinition(settingId);
    if (!definition) return false;

    return this.setValue(settingId, definition.default);
  }

  /**
   * Reset all settings to defaults
   */
  resetAllToDefaults() {
    Object.keys(this.definitions).forEach(settingId => {
      this.resetToDefault(settingId);
    });
  }

  /**
   * Search settings
   * @param {string} query - Search query
   * @returns {Array} Array of matching setting definitions
   */
  search(query) {
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) return [];

    return Object.values(this.definitions).filter(definition => {
      // Search in label
      if (definition.label.toLowerCase().includes(lowerQuery)) return true;
      
      // Search in description
      if (definition.description.toLowerCase().includes(lowerQuery)) return true;
      
      // Search in search terms
      if (definition.searchTerms && 
          definition.searchTerms.some(term => term.includes(lowerQuery))) {
        return true;
      }
      
      return false;
    });
  }

  /**
   * Get all setting values as object
   * @returns {Object} All settings
   */
  getAllValues() {
    const values = {};
    Object.keys(this.definitions).forEach(settingId => {
      values[settingId] = this.getValue(settingId);
    });
    return values;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

export default SettingsRegistry;
