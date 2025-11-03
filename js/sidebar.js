/**
 * Sidebar module for conversation management
 * Handles conversation list, search, and navigation
 */

import storage from './storage.js';
import { formatDate, truncate } from './utils.js';

/**
 * Sidebar manager class
 */
class SidebarManager {
  constructor() {
    this.sidebar = null;
    this.conversationList = null;
    this.searchInput = null;
    this.onConversationSelected = null;
    this.onNewConversation = null;
  }

  /**
   * Initialize sidebar
   * @param {Object} elements - DOM elements
   * @param {Function} onConversationSelected - Callback when conversation is selected
   * @param {Function} onNewConversation - Callback for new conversation
   */
  initialize(elements, onConversationSelected, onNewConversation) {
    this.conversationList = elements.conversationList;
    this.searchInput = elements.searchInput;
    this.onConversationSelected = onConversationSelected;
    this.onNewConversation = onNewConversation;

    this.setupEventListeners();
    this.render();

    // Listen for conversation updates
    window.addEventListener('conversationUpdated', () => {
      this.render();
    });
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Search input
    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        this.render(e.target.value);
      });
    }
  }

  /**
   * Render conversation list
   * @param {string} searchQuery - Optional search query
   */
  render(searchQuery = '') {
    if (!this.conversationList) return;

    let conversations;
    if (searchQuery) {
      conversations = storage.searchConversations(searchQuery);
    } else {
      conversations = storage.getAllConversations();
    }

    // Sort by updated time (most recent first)
    conversations.sort((a, b) => b.updated - a.updated);

    const currentId = storage.getCurrentConversationId();

    let html = '';

    if (conversations.length === 0) {
      html = `
        <div class="empty-state">
          ${searchQuery ? 'No conversations found' : 'No conversations yet'}
        </div>
      `;
    } else {
      for (const conv of conversations) {
        const isActive = conv.id === currentId;
        const title = conv.title || 'New Conversation';
        const preview = this.getConversationPreview(conv);
        const date = formatDate(conv.updated);

        html += `
          <div class="conversation-item ${isActive ? 'active' : ''}" data-id="${conv.id}">
            <div class="conversation-content">
              <div class="conversation-title">${truncate(title, 40)}</div>
              <div class="conversation-preview">${truncate(preview, 60)}</div>
              <div class="conversation-meta">
                <span class="conversation-date">${date}</span>
                ${conv.model ? `<span class="conversation-model">${conv.model}</span>` : ''}
              </div>
            </div>
            <div class="conversation-actions">
              <button class="btn-icon" data-action="delete" data-id="${conv.id}" title="Delete">🗑️</button>
            </div>
          </div>
        `;
      }
    }

    this.conversationList.innerHTML = html;
    this.attachConversationListeners();
  }

  /**
   * Get conversation preview text
   * @param {Object} conversation - Conversation object
   * @returns {string} Preview text
   */
  getConversationPreview(conversation) {
    if (conversation.messages.length === 0) {
      return 'No messages yet';
    }

    // Get the last user message or first message
    const lastUserMsg = [...conversation.messages]
      .reverse()
      .find(m => m.role === 'user');
    
    const previewMsg = lastUserMsg || conversation.messages[0];
    return previewMsg.content;
  }

  /**
   * Attach event listeners to conversation items
   */
  attachConversationListeners() {
    if (!this.conversationList) return;

    // Click to select conversation
    this.conversationList.querySelectorAll('.conversation-item').forEach(item => {
      item.addEventListener('click', (e) => {
        // Don't trigger if clicking on action buttons
        if (e.target.closest('.conversation-actions')) return;

        const id = item.dataset.id;
        if (this.onConversationSelected) {
          this.onConversationSelected(id);
        }
      });
    });

    // Delete buttons
    this.conversationList.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        this.deleteConversation(id);
      });
    });
  }

  /**
   * Delete a conversation
   * @param {string} conversationId - Conversation ID
   */
  deleteConversation(conversationId) {
    const conversation = storage.getConversation(conversationId);
    if (!conversation) return;

    const title = conversation.title || 'this conversation';
    if (!confirm(`Delete "${truncate(title, 50)}"?`)) return;

    const success = storage.deleteConversation(conversationId);
    if (success) {
      this.render();
      
      // If deleted conversation was active, notify to clear chat
      if (conversationId === storage.getCurrentConversationId()) {
        if (this.onNewConversation) {
          this.onNewConversation();
        }
      }
    }
  }

  /**
   * Update the conversation list
   */
  update() {
    this.render();
  }

  /**
   * Highlight active conversation
   * @param {string} conversationId - Conversation ID
   */
  setActive(conversationId) {
    if (!this.conversationList) return;

    this.conversationList.querySelectorAll('.conversation-item').forEach(item => {
      item.classList.toggle('active', item.dataset.id === conversationId);
    });
  }

  /**
   * Get conversation count
   * @returns {number} Number of conversations
   */
  getConversationCount() {
    return storage.getAllConversations().length;
  }
}

// Export singleton instance
export default new SidebarManager();
