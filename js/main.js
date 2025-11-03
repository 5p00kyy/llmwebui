/**
 * Main application entry point
 * Initializes all modules and coordinates the application
 */

import storage from './storage.js';
import chat from './chat.js';
import sidebar from './sidebar.js';
import settings from './settings.js';
import stats from './stats.js';
import APIClient, { createClientFromStorage } from './api.js';

/**
 * Application class
 */
class App {
  constructor() {
    this.apiClient = null;
    this.initialized = false;
  }

  /**
   * Initialize the application
   */
  async init() {
    if (this.initialized) return;

    console.log('Initializing LLM WebUI...');

    try {
      // Apply theme
      const storedSettings = storage.getSettings();
      document.body.className = `theme-${storedSettings.theme}`;

      // Initialize API client
      this.apiClient = createClientFromStorage(storage);

      // Initialize stats manager
      const statsBar = document.getElementById('statsBar');
      if (statsBar) {
        stats.setElement(statsBar);
      }

      // Initialize chat interface
      chat.initialize({
        messagesContainer: document.getElementById('messagesContainer'),
        inputField: document.getElementById('messageInput'),
        sendButton: document.getElementById('sendButton')
      }, this.apiClient);

      // Initialize sidebar
      sidebar.initialize({
        conversationList: document.getElementById('conversationList'),
        searchInput: document.getElementById('searchInput')
      }, 
      // On conversation selected
      (conversationId) => {
        chat.loadConversation(conversationId);
        sidebar.setActive(conversationId);
      },
      // On new conversation
      () => this.newConversation()
      );

      // Initialize settings panel
      settings.initialize(
        document.getElementById('settingsPanel'),
        () => this.onSettingsChanged()
      );

      // Set up global event listeners
      this.setupEventListeners();

      // Load last conversation or start new one
      const currentConvId = storage.getCurrentConversationId();
      if (currentConvId && storage.getConversation(currentConvId)) {
        await chat.loadConversation(currentConvId);
        sidebar.setActive(currentConvId);
      }

      this.initialized = true;
      console.log('LLM WebUI initialized successfully');
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.showError('Failed to initialize application: ' + error.message);
    }
  }

  /**
   * Set up global event listeners
   */
  setupEventListeners() {
    // New conversation button
    const newChatBtn = document.getElementById('newChatBtn');
    if (newChatBtn) {
      newChatBtn.addEventListener('click', () => this.newConversation());
    }

    // Settings button
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => settings.toggle());
    }

    // Sidebar toggle (for mobile)
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', () => {
        document.getElementById('sidebar')?.classList.toggle('open');
      });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + N - New conversation
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        this.newConversation();
      }

      // Ctrl/Cmd + , - Settings
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        settings.toggle();
      }

      // Escape - Close settings
      if (e.key === 'Escape') {
        if (settings.isOpen) {
          settings.close();
        }
      }
    });

    // Handle window resize for mobile layout
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
  }

  /**
   * Handle window resize
   */
  handleResize() {
    const isMobile = window.innerWidth < 768;
    const sidebar = document.getElementById('sidebar');
    
    if (sidebar && !isMobile) {
      sidebar.classList.add('open');
    }
  }

  /**
   * Start a new conversation
   */
  newConversation() {
    const storedSettings = storage.getSettings();
    const model = storedSettings.defaultModel;
    
    if (!model) {
      this.showError('Please select a model in settings first');
      settings.open();
      return;
    }

    const systemPrompt = storedSettings.systemPrompts[model] || '';
    chat.newConversation(model, systemPrompt);
    sidebar.update();
    sidebar.setActive(null);

    // Close sidebar on mobile
    if (window.innerWidth < 768) {
      document.getElementById('sidebar')?.classList.remove('open');
    }
  }

  /**
   * Handle settings changes
   */
  onSettingsChanged() {
    console.log('Settings changed, updating API client...');
    
    try {
      // Recreate API client with new endpoint
      this.apiClient = createClientFromStorage(storage);
      chat.setApiClient(this.apiClient);
      
      // Update theme
      const storedSettings = storage.getSettings();
      document.body.className = `theme-${storedSettings.theme}`;
    } catch (error) {
      console.error('Failed to update settings:', error);
      this.showError('Failed to update settings: ' + error.message);
    }
  }

  /**
   * Show error message to user
   * @param {string} message - Error message
   */
  showError(message) {
    // Simple alert for now, could be replaced with a toast notification
    alert(message);
  }

  /**
   * Test API connection
   */
  async testConnection() {
    try {
      const connected = await this.apiClient.testConnection();
      if (connected) {
        alert('✓ Connection successful!');
      } else {
        alert('✗ Connection failed');
      }
    } catch (error) {
      alert('✗ Connection error: ' + error.message);
    }
  }
}

// Create and initialize app when DOM is ready
const app = new App();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

// Export for console debugging
window.app = app;
