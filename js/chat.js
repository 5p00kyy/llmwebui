/**
 * Chat interface module
 * Handles chat UI, message rendering, and streaming responses
 */

import { renderMarkdownWithHighlight, addCopyButtons } from './markdown.js';
import { escapeHtml, copyToClipboard, generateTitle } from './utils.js';
import storage from './storage.js';
import stats from './stats.js';

/**
 * Chat manager class
 */
class ChatManager {
  constructor() {
    this.messagesContainer = null;
    this.inputField = null;
    this.sendButton = null;
    this.currentConversationId = null;
    this.apiClient = null;
    this.parameterManager = null;
    this.ragManager = null;
    this.modelManager = null;
    this.isGenerating = false;
    this.currentMessageElement = null;
    
    // Scroll management
    this.scrollToBottomBtn = null;
    this.isUserScrolling = false;
    this.scrollTimeout = null;
    
    // HUD elements
    this.hudStatus = null;
    this.hudModel = null;
    this.hudTokens = null;
    this.hudProgress = null;
    
    // Generation stats
    this.generationStartTime = null;
    this.currentTokens = 0;
    this.estimatedTotal = 0;
  }

  /**
   * Initialize chat interface
   * @param {Object} elements - DOM elements
   * @param {APIClient} apiClient - API client instance
   * @param {Object} managers - Optional manager instances
   */
  initialize(elements, apiClient, managers = {}) {
    this.messagesContainer = elements.messagesContainer;
    this.inputField = elements.inputField;
    this.sendButton = elements.sendButton;
    this.apiClient = apiClient;
    this.parameterManager = managers.parameterManager;
    this.ragManager = managers.ragManager;
    this.modelManager = managers.modelManager;
    
    // Get HUD elements
    this.hudStatus = document.getElementById('hudStatus');
    this.hudModel = document.getElementById('hudModel');
    this.hudTokens = document.getElementById('hudTokens');
    this.hudProgress = document.getElementById('hudProgress');
    
    // Get scroll button
    this.scrollToBottomBtn = document.getElementById('scrollToBottom');

    // Set up event listeners
    this.setupEventListeners();
    this.setupScrollManagement();
    
    // Initialize HUD
    this.updateHUD();
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Send button
    if (this.sendButton) {
      this.sendButton.addEventListener('click', () => this.sendMessage());
    }

    // Input field - Enter to send, Shift+Enter for new line
    if (this.inputField) {
      this.inputField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });

      // Auto-resize textarea
      this.inputField.addEventListener('input', () => {
        this.inputField.style.height = 'auto';
        this.inputField.style.height = this.inputField.scrollHeight + 'px';
      });
    }
    
    // Scroll to bottom button
    if (this.scrollToBottomBtn) {
      this.scrollToBottomBtn.addEventListener('click', () => {
        this.scrollToBottom(true);
      });
    }
  }
  
  /**
   * Set up scroll management
   */
  setupScrollManagement() {
    if (!this.messagesContainer) return;
    
    // Get the chat container (parent of messages container)
    const chatContainer = this.messagesContainer.parentElement;
    if (!chatContainer) return;
    
    // Listen for scroll events
    chatContainer.addEventListener('scroll', () => {
      this.handleScroll();
    });
  }
  
  /**
   * Handle scroll events
   */
  handleScroll() {
    if (!this.messagesContainer) return;
    
    const chatContainer = this.messagesContainer.parentElement;
    if (!chatContainer) return;
    
    const scrollTop = chatContainer.scrollTop;
    const scrollHeight = chatContainer.scrollHeight;
    const clientHeight = chatContainer.clientHeight;
    
    // Calculate distance from bottom
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    // During streaming, be extremely persistent with auto-scroll
    // Only mark as user scrolling if they've scrolled significantly up
    if (this.isGenerating) {
      // During generation, only disable auto-scroll if user scrolls up more than 200px
      this.isUserScrolling = distanceFromBottom > 200;
    } else {
      // When not streaming, use a more conservative threshold
      this.isUserScrolling = distanceFromBottom > 100;
    }
    
    // Show/hide scroll to bottom button
    if (this.scrollToBottomBtn) {
      if (this.isUserScrolling && distanceFromBottom > 150) {
        this.scrollToBottomBtn.classList.add('visible');
      } else {
        this.scrollToBottomBtn.classList.remove('visible');
      }
    }
  }
  
  /**
   * Update HUD status bar
   */
  updateHUD(status = null) {
    const hudBar = document.getElementById('hudStatusBar');
    
    if (status) {
      if (this.hudStatus) {
        this.hudStatus.textContent = status;
      }
      
      // Set data attribute for streaming animation
      if (hudBar) {
        hudBar.setAttribute('data-status', status);
      }
    }
    
    // Update model
    if (this.hudModel && this.modelManager) {
      const currentModel = this.modelManager.getCurrentModel();
      this.hudModel.textContent = currentModel || '-';
    }
    
    // Update tokens - use context window from stats
    const conversation = this.getCurrentConversation();
    if (this.hudTokens && conversation) {
      const currentStats = stats.getStats();
      const contextWindow = currentStats.contextLimit || 8192; // Default to 8192 if not set
      const contextUsed = currentStats.contextUsed || 0;
      
      this.hudTokens.textContent = `${contextUsed}/${contextWindow}`;
      
      // Update progress bar
      if (this.hudProgress) {
        const percentage = Math.min((contextUsed / contextWindow) * 100, 100);
        this.hudProgress.style.width = `${percentage}%`;
      }
    }
  }

  /**
   * Load a conversation
   * @param {string} conversationId - Conversation ID
   */
  async loadConversation(conversationId) {
    const conversation = storage.getConversation(conversationId);
    if (!conversation) {
      console.error('Conversation not found:', conversationId);
      return;
    }

    this.currentConversationId = conversationId;
    storage.setCurrentConversationId(conversationId);

    // Clear messages container
    if (this.messagesContainer) {
      this.messagesContainer.innerHTML = '';
    }

    // Render all messages
    for (const message of conversation.messages) {
      await this.renderMessage(message);
    }

    // Update context stats
    stats.updateContextFromMessages(conversation.messages);

    // Scroll to bottom
    this.scrollToBottom();
    
    // Update HUD
    this.updateHUD();
  }

  /**
   * Start a new conversation
   * @param {string} model - Model name
   * @param {string} systemPrompt - System prompt
   */
  newConversation(model, systemPrompt = '') {
    const conversation = storage.createConversation('New Conversation', model, systemPrompt);
    this.currentConversationId = conversation.id;
    storage.setCurrentConversationId(conversation.id);

    // Clear messages
    if (this.messagesContainer) {
      this.messagesContainer.innerHTML = '';
    }

    stats.clear();
    this.updateHUD();

    return conversation;
  }

  /**
   * Send a message
   */
  async sendMessage() {
    if (this.isGenerating) return;

    const text = this.inputField?.value.trim();
    if (!text) return;

    // Get or create conversation
    if (!this.currentConversationId) {
      const model = this.modelManager?.getCurrentModel() || 'default';
      const systemPrompt = this.parameterManager?.get('systemPrompt') || '';
      this.newConversation(model, systemPrompt);
    }

    const conversation = storage.getConversation(this.currentConversationId);
    if (!conversation) {
      console.error('No active conversation');
      return;
    }

    // Enhance message with RAG context if available
    let messageContent = text;
    if (this.ragManager) {
      const activeDocsCount = this.ragManager.getActiveDocuments().length;
      if (activeDocsCount > 0) {
        const relevantChunks = this.ragManager.retrieveContext(text);
        if (relevantChunks.length > 0) {
          const context = this.ragManager.formatContext(relevantChunks);
          messageContent = context + 'User Query: ' + text;
        }
      }
    }

    // Add user message (save original text for display)
    const userMessage = {
      role: 'user',
      content: text
    };

    await this.renderMessage(userMessage);
    
    // Save the enhanced message for API but display original
    const apiMessage = {
      role: 'user',
      content: messageContent
    };
    
    // Store the message before generating response
    const updatedConversation = storage.addMessage(this.currentConversationId, apiMessage);
    
    if (!updatedConversation) {
      console.error('Failed to save message to storage');
      return;
    }

    // Update conversation title from first message
    if (updatedConversation.messages.length === 1) {
      updatedConversation.title = generateTitle(text);
      storage.saveConversation(updatedConversation);
      
      // Notify sidebar to update
      window.dispatchEvent(new CustomEvent('conversationUpdated', {
        detail: { conversationId: updatedConversation.id }
      }));
    }

    // Clear input
    this.inputField.value = '';
    this.inputField.style.height = 'auto';

    // Generate response with the updated conversation
    await this.generateResponse(updatedConversation);
  }

  /**
   * Generate AI response
   * @param {Object} conversation - Conversation object
   */
  async generateResponse(conversation) {
    this.isGenerating = true;
    this.sendButton?.setAttribute('disabled', 'true');
    stats.startGeneration();
    
    // Update HUD status
    this.updateHUD('STREAMING');
    this.generationStartTime = Date.now();
    this.currentTokens = 0;

    // Create assistant message element
    const assistantMessage = {
      role: 'assistant',
      content: ''
    };

    const messageElement = await this.renderMessage(assistantMessage, true);
    this.currentMessageElement = messageElement;

    try {
      // Get current parameters
      const params = this.parameterManager?.getAll() || {};
      const currentModel = this.modelManager?.getCurrentModel();
      
      // Get fresh conversation from storage to ensure we have the latest messages
      const freshConversation = storage.getConversation(this.currentConversationId);
      if (!freshConversation) {
        throw new Error('Conversation not found');
      }
      
      // Prepare messages for API
      const messages = freshConversation.messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      // Validate that we have messages to send
      if (!messages || messages.length === 0) {
        throw new Error('No messages to send. The conversation may not have been saved properly.');
      }

      // Generate response with streaming
      const response = await this.apiClient.chatCompletion(
        messages,
        {
          model: currentModel || freshConversation.model,
          temperature: params.temperature ?? 0.7,
          maxTokens: params.maxTokens ?? 2048,
          topP: params.topP ?? 0.9,
          stream: true,
          systemPrompt: params.systemPrompt || freshConversation.systemPrompt,
          parameterOverrides: params.useServerDefaults || {}
        },
        // onChunk callback
        async (chunk, fullContent) => {
          assistantMessage.content = fullContent;
          await this.updateStreamingMessage(messageElement, fullContent);
        },
        // onStats callback
        (statsData) => {
          stats.updateStats(statsData);
        }
      );

      // Save complete message
      assistantMessage.content = response.content;
      storage.addMessage(this.currentConversationId, assistantMessage);

      // Final render with code highlighting
      await this.updateStreamingMessage(messageElement, response.content, true);
      
      // Remove streaming badge
      const statusBadge = messageElement.querySelector('.status-badge');
      if (statusBadge) {
        statusBadge.innerHTML = '<span class="status-icon"></span>COMPLETE';
        statusBadge.classList.remove('streaming');
      }

      // Update context stats
      const updatedConversation = storage.getConversation(this.currentConversationId);
      stats.updateContextFromMessages(updatedConversation.messages);
      
      // Update HUD
      this.updateHUD('IDLE');

    } catch (error) {
      console.error('Failed to generate response:', error);
      
      // Show error message
      const errorContent = `**Error:** ${error.message}`;
      assistantMessage.content = errorContent;
      await this.updateStreamingMessage(messageElement, errorContent, true);
      
      // Save error message
      storage.addMessage(this.currentConversationId, assistantMessage);
      
      // Update HUD
      this.updateHUD('ERROR');
    } finally {
      this.isGenerating = false;
      this.sendButton?.removeAttribute('disabled');
      this.currentMessageElement = null;
      stats.endGeneration();
      
      // Update HUD to idle if not error
      if (this.hudStatus && this.hudStatus.textContent !== 'ERROR') {
        this.updateHUD('IDLE');
      }
    }
  }

  /**
   * Render a message
   * @param {Object} message - Message object
   * @param {boolean} isStreaming - Whether message is being streamed
   * @returns {HTMLElement} Message element
   */
  async renderMessage(message, isStreaming = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${message.role}`;

    // Message header with role and status
    const headerDiv = document.createElement('div');
    headerDiv.className = 'message-header';
    
    const roleContainer = document.createElement('div');
    roleContainer.className = 'message-role-container';
    
    const roleDiv = document.createElement('div');
    roleDiv.className = 'message-role';
    roleDiv.textContent = message.role === 'user' ? 'USER' : 'ASSISTANT';
    roleContainer.appendChild(roleDiv);
    
    // Add status badge for streaming messages
    if (isStreaming && message.role === 'assistant') {
      const statusDiv = document.createElement('div');
      statusDiv.className = 'message-status';
      statusDiv.innerHTML = `
        <span class="status-badge streaming">
          <span class="status-icon"></span>
          STREAMING
        </span>
      `;
      roleContainer.appendChild(statusDiv);
    }
    
    headerDiv.appendChild(roleContainer);

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    if (message.role === 'user') {
      // User messages don't need markdown rendering
      contentDiv.textContent = message.content;
    } else {
      // Assistant messages get markdown rendering
      if (message.content) {
        const rendered = await renderMarkdownWithHighlight(message.content);
        contentDiv.innerHTML = rendered.innerHTML;
        addCopyButtons(contentDiv);
      } else if (isStreaming) {
        // Show cursor for streaming
        contentDiv.innerHTML = '<span class="streaming-cursor" id="stream-cursor">▊</span>';
      }
    }

    // Create metadata section
    const metadataDiv = document.createElement('div');
    metadataDiv.className = 'message-metadata';
    
    const metadataLeft = document.createElement('div');
    metadataLeft.className = 'metadata-left';
    
    // Add timestamp
    const timestamp = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    if (message.role === 'user') {
      const charCount = message.content?.length || 0;
      metadataLeft.innerHTML = `
        <div class="metadata-item">
          <span class="metadata-label">SENT</span>
          <span class="metadata-value">${timestamp}</span>
        </div>
        <div class="metadata-item">
          <span class="metadata-label">CHARS</span>
          <span class="metadata-value">${charCount}</span>
        </div>
      `;
    } else {
      const tokenCount = Math.floor((message.content?.length || 0) / 4);
      metadataLeft.innerHTML = `
        <div class="metadata-item">
          <span class="metadata-label">MODEL</span>
          <span class="metadata-value">${this.modelManager?.getCurrentModel() || 'unknown'}</span>
        </div>
        <div class="metadata-item">
          <span class="metadata-label">TOKENS</span>
          <span class="metadata-value token-counter">${tokenCount}</span>
        </div>
      `;
      
      if (isStreaming) {
        metadataLeft.innerHTML += `
          <div class="metadata-item">
            <span class="metadata-label">SPEED</span>
            <span class="metadata-value" id="stream-speed-${Date.now()}">-- tok/s</span>
          </div>
        `;
      }
    }
    
    const metadataRight = document.createElement('div');
    metadataRight.className = 'metadata-right';
    
    // Copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'message-action-btn';
    copyBtn.title = 'Copy message';
    copyBtn.textContent = 'COPY';
    copyBtn.addEventListener('click', async () => {
      const success = await copyToClipboard(message.content);
      if (success) {
        copyBtn.textContent = '✓ COPIED';
        setTimeout(() => copyBtn.textContent = 'COPY', 2000);
      }
    });
    
    metadataRight.appendChild(copyBtn);
    
    metadataDiv.appendChild(metadataLeft);
    metadataDiv.appendChild(metadataRight);

    messageDiv.appendChild(headerDiv);
    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(metadataDiv);

    if (this.messagesContainer) {
      this.messagesContainer.appendChild(messageDiv);
      this.scrollToBottom();
    }

    return messageDiv;
  }

  /**
   * Update streaming message content
   * @param {HTMLElement} messageElement - Message element
   * @param {string} content - New content
   * @param {boolean} final - Whether this is the final update
   */
  async updateStreamingMessage(messageElement, content, final = false) {
    const contentDiv = messageElement.querySelector('.message-content');
    if (!contentDiv) return;

    if (final) {
      // Final render with full markdown and syntax highlighting
      const rendered = await renderMarkdownWithHighlight(content);
      contentDiv.innerHTML = rendered.innerHTML;
      addCopyButtons(contentDiv);
      
      // Update token count in metadata
      const tokenCount = Math.floor(content.length / 4);
      const tokenCounter = messageElement.querySelector('.token-counter');
      if (tokenCounter) {
        tokenCounter.textContent = tokenCount;
      }
      
      // Final scroll to ensure everything is visible
      this.scrollToBottomSmooth();
    } else {
      // Quick update during streaming (plain text with cursor)
      const escapedContent = escapeHtml(content);
      contentDiv.innerHTML = escapedContent + '<span class="streaming-cursor">▊</span>';
      
      // Update token count live
      this.currentTokens = Math.floor(content.length / 4);
      const tokenCounter = messageElement.querySelector('.token-counter');
      if (tokenCounter) {
        tokenCounter.textContent = this.currentTokens;
      }
      
      // Update speed indicator
      if (this.generationStartTime) {
        const elapsed = (Date.now() - this.generationStartTime) / 1000;
        const speed = this.currentTokens / elapsed;
        const speedElement = messageElement.querySelector('[id^="stream-speed-"]');
        if (speedElement && speed > 0) {
          speedElement.textContent = `${speed.toFixed(1)} tok/s`;
        }
      }
      
      // Scroll to bottom during streaming to keep text visible
      this.scrollToBottomSmooth();
    }
  }

  /**
   * Scroll to bottom of messages
   * @param {boolean} smooth - Whether to use smooth scrolling
   */
  scrollToBottom(smooth = false) {
    if (!this.messagesContainer) return;
    
    const chatContainer = this.messagesContainer.parentElement;
    if (!chatContainer) return;
    
    if (smooth) {
      // Smooth scroll when user clicks button
      chatContainer.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: 'smooth'
      });
      
      // Reset user scrolling state
      this.isUserScrolling = false;
      if (this.scrollToBottomBtn) {
        this.scrollToBottomBtn.classList.remove('visible');
      }
    } else {
      // Instant scroll for initial messages
      requestAnimationFrame(() => {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      });
    }
  }
  
  /**
   * Smooth scroll to bottom during streaming
   * Only scrolls if user hasn't manually scrolled up
   */
  scrollToBottomSmooth() {
    if (!this.messagesContainer || this.isUserScrolling) return;
    
    const chatContainer = this.messagesContainer.parentElement;
    if (!chatContainer) return;
    
    // Use requestAnimationFrame for smooth, performant scrolling
    requestAnimationFrame(() => {
      const targetScroll = chatContainer.scrollHeight;
      const currentScroll = chatContainer.scrollTop;
      
      // Only scroll if we're not already at the bottom
      if (targetScroll - currentScroll > 5) {
        chatContainer.scrollTop = targetScroll;
      }
    });
  }

  /**
   * Clear all messages from view
   */
  clearMessages() {
    if (this.messagesContainer) {
      this.messagesContainer.innerHTML = '';
    }
  }

  /**
   * Update API client
   * @param {APIClient} apiClient - New API client
   */
  setApiClient(apiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Get current conversation
   * @returns {Object|null} Current conversation
   */
  getCurrentConversation() {
    return this.currentConversationId 
      ? storage.getConversation(this.currentConversationId)
      : null;
  }

  /**
   * Delete current conversation
   */
  deleteCurrentConversation() {
    if (this.currentConversationId) {
      storage.deleteConversation(this.currentConversationId);
      this.currentConversationId = null;
      this.clearMessages();
      stats.clear();
    }
  }

  /**
   * Regenerate last response
   */
  async regenerateLastResponse() {
    if (this.isGenerating) return;

    const conversation = this.getCurrentConversation();
    if (!conversation || conversation.messages.length < 2) return;

    // Remove last assistant message
    conversation.messages.pop();
    storage.saveConversation(conversation);

    // Remove last message from UI
    const messages = this.messagesContainer?.querySelectorAll('.message');
    if (messages && messages.length > 0) {
      messages[messages.length - 1].remove();
    }

    // Generate new response
    await this.generateResponse(conversation);
  }
}

// Export singleton instance
export default new ChatManager();
