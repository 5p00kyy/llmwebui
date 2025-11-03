/**
 * Storage layer for LLM WebUI
 * Handles localStorage operations for conversations, settings, and preferences
 */

import { generateUUID } from './utils.js';

const STORAGE_KEYS = {
  CONVERSATIONS: 'llmwebui_conversations',
  SETTINGS: 'llmwebui_settings',
  CURRENT_CONVERSATION: 'llmwebui_current_conversation'
};

/**
 * Default settings structure
 */
const DEFAULT_SETTINGS = {
  endpoints: [
    {
      id: generateUUID(),
      name: 'Local llama-swap',
      url: 'http://192.168.0.113:8080/v1',
      apiKey: null,
      active: true
    }
  ],
  theme: 'black',
  defaultModel: null,
  systemPrompts: {},
  preferences: {
    streamingEnabled: true,
    temperature: 0.7,
    maxTokens: 2048,
    topP: 0.9,
    showStats: true
  },
  parameterOverrides: {
    temperature: false,
    topP: false,
    maxTokens: false,
    presencePenalty: false,
    frequencyPenalty: false
  },
  modelConfigs: {}
};

/**
 * Storage class for managing localStorage
 */
class Storage {
  constructor() {
    this.initializeStorage();
  }

  /**
   * Initialize storage with defaults if needed
   */
  initializeStorage() {
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      this.saveSettings(DEFAULT_SETTINGS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.CONVERSATIONS)) {
      localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify([]));
    }
  }

  /**
   * Save a conversation
   * @param {Object} conversation - Conversation object
   * @returns {Object} Saved conversation
   */
  saveConversation(conversation) {
    const conversations = this.getAllConversations();
    const existingIndex = conversations.findIndex(c => c.id === conversation.id);
    
    conversation.updated = Date.now();
    
    if (existingIndex >= 0) {
      conversations[existingIndex] = conversation;
    } else {
      conversation.created = conversation.created || Date.now();
      conversations.unshift(conversation);
    }
    
    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
    return conversation;
  }

  /**
   * Get a specific conversation by ID
   * @param {string} id - Conversation ID
   * @returns {Object|null} Conversation object or null
   */
  getConversation(id) {
    const conversations = this.getAllConversations();
    return conversations.find(c => c.id === id) || null;
  }

  /**
   * Get all conversations
   * @returns {Array} Array of conversations
   */
  getAllConversations() {
    const data = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
    return data ? JSON.parse(data) : [];
  }

  /**
   * Delete a conversation
   * @param {string} id - Conversation ID
   * @returns {boolean} Success status
   */
  deleteConversation(id) {
    const conversations = this.getAllConversations();
    const filtered = conversations.filter(c => c.id !== id);
    
    if (filtered.length === conversations.length) {
      return false; // Conversation not found
    }
    
    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(filtered));
    
    // Clear current conversation if it was deleted
    if (this.getCurrentConversationId() === id) {
      this.setCurrentConversationId(null);
    }
    
    return true;
  }

  /**
   * Create a new conversation
   * @param {string} title - Conversation title
   * @param {string} model - Model name
   * @param {string} systemPrompt - System prompt
   * @returns {Object} New conversation
   */
  createConversation(title = 'New Conversation', model = null, systemPrompt = '') {
    const conversation = {
      id: generateUUID(),
      title,
      created: Date.now(),
      updated: Date.now(),
      model,
      systemPrompt,
      messages: []
    };
    
    return this.saveConversation(conversation);
  }

  /**
   * Add a message to a conversation
   * @param {string} conversationId - Conversation ID
   * @param {Object} message - Message object
   * @returns {Object|null} Updated conversation or null
   */
  addMessage(conversationId, message) {
    const conversation = this.getConversation(conversationId);
    if (!conversation) return null;
    
    message.timestamp = message.timestamp || Date.now();
    conversation.messages.push(message);
    
    return this.saveConversation(conversation);
  }

  /**
   * Update a message in a conversation
   * @param {string} conversationId - Conversation ID
   * @param {number} messageIndex - Index of message
   * @param {Object} updates - Updates to apply
   * @returns {Object|null} Updated conversation or null
   */
  updateMessage(conversationId, messageIndex, updates) {
    const conversation = this.getConversation(conversationId);
    if (!conversation || !conversation.messages[messageIndex]) return null;
    
    Object.assign(conversation.messages[messageIndex], updates);
    
    return this.saveConversation(conversation);
  }

  /**
   * Get current conversation ID
   * @returns {string|null} Current conversation ID
   */
  getCurrentConversationId() {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_CONVERSATION);
  }

  /**
   * Set current conversation ID
   * @param {string|null} id - Conversation ID
   */
  setCurrentConversationId(id) {
    if (id) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_CONVERSATION, id);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_CONVERSATION);
    }
  }

  /**
   * Save settings
   * @param {Object} settings - Settings object
   * @returns {Object} Saved settings
   */
  saveSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    return settings;
  }

  /**
   * Get settings
   * @returns {Object} Settings object
   */
  getSettings() {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : DEFAULT_SETTINGS;
  }

  /**
   * Update settings (merge with existing)
   * @param {Object} updates - Settings updates
   * @returns {Object} Updated settings
   */
  updateSettings(updates) {
    const settings = this.getSettings();
    const merged = { ...settings, ...updates };
    return this.saveSettings(merged);
  }

  /**
   * Get active endpoint
   * @returns {Object|null} Active endpoint
   */
  getActiveEndpoint() {
    const settings = this.getSettings();
    return settings.endpoints.find(e => e.active) || settings.endpoints[0] || null;
  }

  /**
   * Set active endpoint
   * @param {string} endpointId - Endpoint ID
   * @returns {Object} Updated settings
   */
  setActiveEndpoint(endpointId) {
    const settings = this.getSettings();
    settings.endpoints.forEach(e => {
      e.active = e.id === endpointId;
    });
    return this.saveSettings(settings);
  }

  /**
   * Add endpoint
   * @param {Object} endpoint - Endpoint object
   * @returns {Object} Updated settings
   */
  addEndpoint(endpoint) {
    const settings = this.getSettings();
    endpoint.id = endpoint.id || generateUUID();
    settings.endpoints.push(endpoint);
    return this.saveSettings(settings);
  }

  /**
   * Update endpoint
   * @param {string} endpointId - Endpoint ID
   * @param {Object} updates - Updates to apply
   * @returns {Object} Updated settings
   */
  updateEndpoint(endpointId, updates) {
    const settings = this.getSettings();
    const endpoint = settings.endpoints.find(e => e.id === endpointId);
    if (endpoint) {
      Object.assign(endpoint, updates);
      return this.saveSettings(settings);
    }
    return settings;
  }

  /**
   * Delete endpoint
   * @param {string} endpointId - Endpoint ID
   * @returns {Object} Updated settings
   */
  deleteEndpoint(endpointId) {
    const settings = this.getSettings();
    settings.endpoints = settings.endpoints.filter(e => e.id !== endpointId);
    
    // Ensure at least one endpoint is active
    if (settings.endpoints.length > 0 && !settings.endpoints.some(e => e.active)) {
      settings.endpoints[0].active = true;
    }
    
    return this.saveSettings(settings);
  }

  /**
   * Export all data
   * @returns {Object} All data
   */
  exportData() {
    return {
      conversations: this.getAllConversations(),
      settings: this.getSettings(),
      exportedAt: Date.now(),
      version: '1.0.0'
    };
  }

  /**
   * Import data
   * @param {Object} data - Data to import
   * @returns {boolean} Success status
   */
  importData(data) {
    try {
      if (data.conversations) {
        localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(data.conversations));
      }
      if (data.settings) {
        this.saveSettings(data.settings);
      }
      return true;
    } catch (err) {
      console.error('Failed to import data:', err);
      return false;
    }
  }

  /**
   * Clear all data
   * @returns {boolean} Success status
   */
  clearAllData() {
    try {
      localStorage.removeItem(STORAGE_KEYS.CONVERSATIONS);
      localStorage.removeItem(STORAGE_KEYS.CURRENT_CONVERSATION);
      this.saveSettings(DEFAULT_SETTINGS);
      return true;
    } catch (err) {
      console.error('Failed to clear data:', err);
      return false;
    }
  }

  /**
   * Get storage size
   * @returns {Object} Storage size information
   */
  getStorageSize() {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    
    return {
      bytes: total,
      kb: (total / 1024).toFixed(2),
      mb: (total / 1024 / 1024).toFixed(2)
    };
  }

  /**
   * Search conversations
   * @param {string} query - Search query
   * @returns {Array} Matching conversations
   */
  searchConversations(query) {
    const conversations = this.getAllConversations();
    const lowerQuery = query.toLowerCase();
    
    return conversations.filter(conv => {
      // Search in title
      if (conv.title.toLowerCase().includes(lowerQuery)) return true;
      
      // Search in messages
      return conv.messages.some(msg => 
        msg.content.toLowerCase().includes(lowerQuery)
      );
    });
  }

  /**
   * Generic get method for arbitrary data
   * @param {string} key - Storage key (can be dotted path like 'parameters.temperature')
   * @returns {*} Stored value or null
   */
  get(key) {
    const value = localStorage.getItem(`llmwebui_${key}`);
    if (value === null) return null;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  /**
   * Generic set method for arbitrary data
   * @param {string} key - Storage key (can be dotted path like 'parameters.temperature')
   * @param {*} value - Value to store
   */
  set(key, value) {
    try {
      localStorage.setItem(`llmwebui_${key}`, JSON.stringify(value));
    } catch (err) {
      console.error('Failed to save to storage:', err);
    }
  }

  /**
   * Get model configuration
   * @param {string} modelId - Model ID
   * @returns {Object|null} Model configuration or null
   */
  getModelConfig(modelId) {
    const settings = this.getSettings();
    return settings.modelConfigs[modelId] || null;
  }

  /**
   * Save model configuration
   * @param {string} modelId - Model ID
   * @param {Object} config - Model configuration
   * @returns {Object} Updated settings
   */
  saveModelConfig(modelId, config) {
    const settings = this.getSettings();
    if (!settings.modelConfigs) {
      settings.modelConfigs = {};
    }
    settings.modelConfigs[modelId] = {
      ...config,
      updated: Date.now()
    };
    return this.saveSettings(settings);
  }

  /**
   * Delete model configuration
   * @param {string} modelId - Model ID
   * @returns {Object} Updated settings
   */
  deleteModelConfig(modelId) {
    const settings = this.getSettings();
    if (settings.modelConfigs && settings.modelConfigs[modelId]) {
      delete settings.modelConfigs[modelId];
      return this.saveSettings(settings);
    }
    return settings;
  }

  /**
   * Check if model has custom configuration
   * @param {string} modelId - Model ID
   * @returns {boolean} True if model has custom config
   */
  hasModelConfig(modelId) {
    const settings = this.getSettings();
    return !!(settings.modelConfigs && settings.modelConfigs[modelId]);
  }

  /**
   * Get all model configurations
   * @returns {Object} All model configs
   */
  getAllModelConfigs() {
    const settings = this.getSettings();
    return settings.modelConfigs || {};
  }

  /**
   * Reset model to global defaults
   * @param {string} modelId - Model ID
   * @returns {Object} Updated settings
   */
  resetModelToDefaults(modelId) {
    return this.deleteModelConfig(modelId);
  }
}

// Export singleton instance
export default new Storage();
