/**
 * Sidebar module for conversation management
 * Handles conversation list, search, and navigation
 */

import storage from './storage.js';
import { formatDate, truncate } from './utils.js';
import tags from './tags.js';
import tagManager from './tagManager.js';

/**
 * Sidebar manager class
 */
class SidebarManager {
  constructor() {
    this.sidebar = null;
    this.conversationList = null;
    this.searchInput = null;
    this.tagFilterSection = null;
    this.onConversationSelected = null;
    this.onNewConversation = null;
    this.activeTagFilter = null;
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
    this.tagFilterSection = document.getElementById('tagFilterSection');
    this.onConversationSelected = onConversationSelected;
    this.onNewConversation = onNewConversation;

    this.setupEventListeners();
    this.render();
    this.renderTagFilters();

    // Listen for conversation updates
    window.addEventListener('conversationUpdated', () => {
      this.render();
    });
    
    // Listen for tag updates
    window.addEventListener('tagsUpdated', () => {
      this.renderTagFilters();
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
    
    // Filter by active tag if set
    if (this.activeTagFilter) {
      conversations = conversations.filter(conv => {
        const convTags = tags.getConversationTags(conv.id);
        return convTags.includes(this.activeTagFilter);
      });
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
              ${this.renderConversationTags(conv.id)}
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
   * Render tags for a conversation
   * @param {string} conversationId - Conversation ID
   * @returns {string} HTML for tags
   */
  renderConversationTags(conversationId) {
    const conversationTags = tags.getConversationTags(conversationId);
    if (conversationTags.length === 0) return '';

    let html = '<div class="conversation-tags">';
    conversationTags.forEach(tagId => {
      const tag = tags.getTag(tagId);
      if (tag) {
        html += `
          <span class="tag-badge" style="color: ${tag.color}">
            <span class="tag-badge-dot" style="background: ${tag.color}"></span>
            ${tag.name}
          </span>
        `;
      }
    });
    html += '</div>';
    return html;
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
   * Render tag filters
   */
  renderTagFilters() {
    if (!this.tagFilterSection) return;
    
    const allTags = tags.getAllTags();
    
    if (allTags.length === 0) {
      this.tagFilterSection.style.display = 'none';
      return;
    }
    
    this.tagFilterSection.style.display = 'block';
    
    let html = '<span class="tag-filter-label">Filter by Tag</span>';
    html += '<div class="tag-filter-list">';
    
    // Add "All" option
    html += `
      <div class="tag-filter-item ${!this.activeTagFilter ? 'active' : ''}" data-tag-id="">
        <span class="tag-filter-dot" style="background: var(--text-muted)"></span>
        <span class="tag-filter-name">All Conversations</span>
        <span class="tag-filter-count">${storage.getAllConversations().length}</span>
      </div>
    `;
    
    // Add each tag
    allTags.forEach(tag => {
      const count = tags.getConversationsWithTag(tag.id).length;
      const isActive = this.activeTagFilter === tag.id;
      
      html += `
        <div class="tag-filter-item ${isActive ? 'active' : ''}" data-tag-id="${tag.id}">
          <span class="tag-filter-dot" style="background: ${tag.color}"></span>
          <span class="tag-filter-name">${tag.name}</span>
          <span class="tag-filter-count">${count}</span>
        </div>
      `;
    });
    
    html += '</div>';
    
    html += `
      <div class="tag-actions-row">
        <button class="btn-tag-action" id="manageTagsBtn">⚙️ Manage Tags</button>
      </div>
    `;
    
    this.tagFilterSection.innerHTML = html;
    this.attachTagFilterListeners();
  }

  /**
   * Attach tag filter event listeners
   */
  attachTagFilterListeners() {
    if (!this.tagFilterSection) return;
    
    // Tag filter items
    this.tagFilterSection.querySelectorAll('.tag-filter-item').forEach(item => {
      item.addEventListener('click', () => {
        const tagId = item.dataset.tagId;
        this.activeTagFilter = tagId || null;
        this.renderTagFilters();
        this.render();
      });
    });
    
    // Manage tags button
    const manageBtn = document.getElementById('manageTagsBtn');
    if (manageBtn) {
      manageBtn.addEventListener('click', () => {
        this.showTagManagementModal();
      });
    }
  }

  /**
   * Show tag management modal
   */
  showTagManagementModal() {
    tagManager.show();
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
