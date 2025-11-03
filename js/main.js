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
import { ModelManager, createModelSelectorUI } from './models.js';
import { ParameterManager, createParameterControlsUI, createSystemPromptUI } from './parameters.js';
import { RAGManager, createFileUploadUI, createDocumentManagerUI, enhanceMessageWithContext } from './rag.js';
import commandPalette from './commandPalette.js';
import tags from './tags.js';

/**
 * Application class
 */
class App {
  constructor() {
    this.apiClient = null;
    this.modelManager = null;
    this.parameterManager = null;
    this.ragManager = null;
    this.tags = tags;
    this.initialized = false;
  }

  /**
   * Initialize the application
   */
  async init() {
    if (this.initialized) return;

    console.log('Initializing LLM WebUI...');

    try {
      // Apply theme and appearance settings
      const storedSettings = storage.getSettings();
      this.applyAppearanceSettings(storedSettings);

      // Initialize API client
      this.apiClient = createClientFromStorage(storage);

      // Initialize managers
      this.modelManager = new ModelManager(this.apiClient, storage);
      this.parameterManager = new ParameterManager(storage);
      this.ragManager = new RAGManager(storage);

      // Fetch available models
      try {
        await this.modelManager.fetchModels();
      } catch (error) {
        console.warn('Could not fetch models:', error);
      }

      // Initialize stats manager
      const statsBar = document.getElementById('statsBar');
      if (statsBar) {
        stats.setElement(statsBar);
      }

      // Add model selector to header
      this.addModelSelectorToHeader();

      // Add file upload button to input area
      this.addFileUploadButton();

      // Initialize chat interface with managers
      chat.initialize({
        messagesContainer: document.getElementById('messagesContainer'),
        inputField: document.getElementById('messageInput'),
        sendButton: document.getElementById('sendButton')
      }, this.apiClient, {
        parameterManager: this.parameterManager,
        ragManager: this.ragManager,
        modelManager: this.modelManager
      });

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

      // Initialize settings panel with new features
      settings.initialize(
        document.getElementById('settingsPanel'),
        () => this.onSettingsChanged(),
        {
          parameterManager: this.parameterManager,
          ragManager: this.ragManager,
          modelManager: this.modelManager
        }
      );

      // Initialize command palette
      commandPalette.initialize({
        newConversation: () => this.newConversation(),
        searchConversations: () => this.focusSearch(),
        switchModel: () => this.focusModelSelect(),
        toggleSidebar: () => this.toggleSidebar(),
        openSettings: () => settings.open(),
        exportConversation: () => this.exportCurrentConversation(),
        toggleStats: () => this.toggleStats()
      });

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

    // Sidebar toggle - for mobile and desktop collapse
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    if (sidebarToggle && sidebar) {
      // Load saved sidebar state
      const sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
      if (sidebarCollapsed) {
        sidebar.classList.add('collapsed');
      }
      
      sidebarToggle.addEventListener('click', () => {
        const isMobile = window.innerWidth < 768;
        
        if (isMobile) {
          // Mobile: toggle visibility
          sidebar.classList.toggle('open');
        } else {
          // Desktop: toggle collapsed state
          sidebar.classList.toggle('collapsed');
          localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
        }
      });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + N - New conversation
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        this.newConversation();
      }

      // Ctrl/Cmd + B - Toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        this.toggleSidebar();
      }

      // Ctrl/Cmd + F - Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        this.focusSearch();
      }

      // Ctrl/Cmd + M - Focus model select
      if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault();
        this.focusModelSelect();
      }

      // Ctrl/Cmd + , - Settings
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        settings.toggle();
      }

      // Escape - Close modals
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
      
      // Update theme and appearance settings
      const storedSettings = storage.getSettings();
      this.applyAppearanceSettings(storedSettings);
      
      // Reload models
      this.addModelSelectorToHeader();
    } catch (error) {
      console.error('Failed to update settings:', error);
      this.showError('Failed to update settings: ' + error.message);
    }
  }

  /**
   * Apply appearance settings
   */
  applyAppearanceSettings(storedSettings) {
    const classes = [`theme-${storedSettings.theme}`];
    
    // Font size
    const fontSize = storedSettings.preferences?.fontSize || 'medium';
    classes.push(`font-size-${fontSize}`);
    
    // Compact mode
    if (storedSettings.preferences?.compactMode) {
      classes.push('compact-mode');
    }
    
    document.body.className = classes.join(' ');
  }

  /**
   * Toggle sidebar
   */
  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    
    const isMobile = window.innerWidth < 768;
    
    if (isMobile) {
      sidebar.classList.toggle('open');
    } else {
      sidebar.classList.toggle('collapsed');
      localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
    }
  }

  /**
   * Focus search input
   */
  focusSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  }

  /**
   * Focus model select
   */
  focusModelSelect() {
    const modelSelect = document.getElementById('modelSelect');
    if (modelSelect) {
      modelSelect.focus();
    }
  }

  /**
   * Toggle stats bar
   */
  toggleStats() {
    const statsBar = document.getElementById('statsBar');
    if (statsBar) {
      statsBar.classList.toggle('visible');
    }
  }

  /**
   * Export current conversation
   */
  exportCurrentConversation() {
    const conversation = chat.getCurrentConversation();
    if (!conversation) {
      alert('No active conversation to export');
      return;
    }

    // Export as markdown
    let markdown = `# ${conversation.title}\n\n`;
    markdown += `Model: ${conversation.model}\n`;
    markdown += `Created: ${new Date(conversation.created).toLocaleString()}\n\n`;
    markdown += '---\n\n';

    conversation.messages.forEach(msg => {
      markdown += `## ${msg.role === 'user' ? 'You' : 'Assistant'}\n\n`;
      markdown += `${msg.content}\n\n`;
    });

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${conversation.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
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

  /**
   * Add model selector to header
   */
 addModelSelectorToHeader() {
    const modelSelect = document.getElementById('modelSelect');
    
    if (modelSelect && this.modelManager) {
      // Populate model selector
      this.modelManager.fetchModels().then(() => {
        const models = this.modelManager.getModels();
        modelSelect.innerHTML = '<option value="">Select Model...</option>';
        
        models.forEach(model => {
          const option = document.createElement('option');
          option.value = model.id;
          option.textContent = model.name;
          modelSelect.appendChild(option);
        });
        
        // Set current model
        const currentModel = this.modelManager.getCurrentModel();
        if (currentModel) {
          modelSelect.value = currentModel;
        }
      });
      
      // Handle model change
      modelSelect.addEventListener('change', (e) => {
        const modelId = e.target.value;
        if (modelId) {
          this.modelManager.setCurrentModel(modelId);
          storage.updateSettings({ defaultModel: modelId });
          
          // Update parameterManager to use model-specific config if exists
          if (this.parameterManager) {
            this.parameterManager.switchToModel(modelId);
          }
          
          // Emit model changed event
          window.dispatchEvent(new CustomEvent('modelChanged', { 
            detail: { modelId } 
          }));
        }
      });
    }
  }

  /**
   * Add file upload button to input area
   */
  addFileUploadButton() {
    const inputWrapper = document.querySelector('.input-wrapper');
    const sendButton = document.getElementById('sendButton');
    
    if (inputWrapper && sendButton && this.ragManager) {
      // Create file upload UI
      const fileUpload = createFileUploadUI(this.ragManager);
      
      // Insert before send button
      inputWrapper.insertBefore(fileUpload, sendButton);
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
