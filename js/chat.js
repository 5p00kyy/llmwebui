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
    this.isGenerating = false;
    this.currentMessageElement = null;
  }

  /**
   * Initialize chat interface
   * @param {Object} elements - DOM elements
   * @param {APIClient} apiClient - API client instance
   */
  initialize(elements, apiClient) {
    this.messagesContainer = elements.messagesContainer;
    this.inputField = elements.inputField;
    this.sendButton = elements.sendButton;
    this.apiClient = apiClient;

    // Set up event listeners
    this.setupEventListeners();
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
      const settings = storage.getSettings();
      const model = settings.defaultModel;
      const systemPrompt = settings.systemPrompts[model] || '';
      this.newConversation(model, systemPrompt);
    }

    const conversation = storage.getConversation(this.currentConversationId);
    if (!conversation) {
      console.error('No active conversation');
      return;
    }

    // Add user message
    const userMessage = {
      role: 'user',
      content: text
    };

    await this.renderMessage(userMessage);
    storage.addMessage(this.currentConversationId, userMessage);

    // Update conversation title from first message
    if (conversation.messages.length === 0) {
      conversation.title = generateTitle(text);
      storage.saveConversation(conversation);
      
      // Notify sidebar to update
      window.dispatchEvent(new CustomEvent('conversationUpdated', {
        detail: { conversationId: conversation.id }
      }));
    }

    // Clear input
    this.inputField.value = '';
    this.inputField.style.height = 'auto';

    // Generate response
    await this.generateResponse(conversation);
  }

  /**
   * Generate AI response
   * @param {Object} conversation - Conversation object
   */
  async generateResponse(conversation) {
    this.isGenerating = true;
    this.sendButton?.setAttribute('disabled', 'true');
    stats.startGeneration();

    // Create assistant message element
    const assistantMessage = {
      role: 'assistant',
      content: ''
    };

    const messageElement = await this.renderMessage(assistantMessage, true);
    this.currentMessageElement = messageElement;

    try {
      const settings = storage.getSettings();
      
      // Prepare messages for API
      const messages = conversation.messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      // Generate response with streaming
      const response = await this.apiClient.chatCompletion(
        messages,
        {
          model: conversation.model || settings.defaultModel,
          temperature: settings.preferences.temperature,
          maxTokens: settings.preferences.maxTokens,
          topP: settings.preferences.topP,
          stream: settings.preferences.streamingEnabled,
          systemPrompt: conversation.systemPrompt
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

      // Update context stats
      const updatedConversation = storage.getConversation(this.currentConversationId);
      stats.updateContextFromMessages(updatedConversation.messages);

    } catch (error) {
      console.error('Failed to generate response:', error);
      
      // Show error message
      const errorContent = `**Error:** ${error.message}`;
      assistantMessage.content = errorContent;
      await this.updateStreamingMessage(messageElement, errorContent, true);
      
      // Save error message
      storage.addMessage(this.currentConversationId, assistantMessage);
    } finally {
      this.isGenerating = false;
      this.sendButton?.removeAttribute('disabled');
      this.currentMessageElement = null;
      stats.endGeneration();
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

    const roleDiv = document.createElement('div');
    roleDiv.className = 'message-role';
    roleDiv.textContent = message.role === 'user' ? 'You' : 'Assistant';

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
        contentDiv.innerHTML = '<span class="streaming-cursor">▊</span>';
      }
    }

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'message-actions';

    // Copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'message-action-btn';
    copyBtn.title = 'Copy message';
    copyBtn.innerHTML = '📋';
    copyBtn.addEventListener('click', async () => {
      const success = await copyToClipboard(message.content);
      if (success) {
        copyBtn.innerHTML = '✓';
        setTimeout(() => copyBtn.innerHTML = '📋', 2000);
      }
    });

    actionsDiv.appendChild(copyBtn);

    messageDiv.appendChild(roleDiv);
    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(actionsDiv);

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
    } else {
      // Quick update during streaming (plain text with cursor)
      const escapedContent = escapeHtml(content);
      contentDiv.innerHTML = escapedContent + '<span class="streaming-cursor">▊</span>';
    }

    this.scrollToBottom();
  }

  /**
   * Scroll to bottom of messages
   */
  scrollToBottom() {
    if (this.messagesContainer) {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
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
