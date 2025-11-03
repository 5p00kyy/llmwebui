/**
 * Tags manager for conversations
 * Provides categorization and filtering capabilities
 */

import storage from './storage.js';

/**
 * Tags manager class
 */
class TagsManager {
  constructor() {
    this.tags = this.loadTags();
  }

  /**
   * Load tags from storage
   * @returns {Array} Array of tag objects
   */
  loadTags() {
    const stored = storage.get('tags');
    return stored || [];
  }

  /**
   * Save tags to storage
   */
  saveTags() {
    storage.set('tags', this.tags);
  }

  /**
   * Get all tags
   * @returns {Array} Array of tags
   */
  getAllTags() {
    return this.tags;
  }

  /**
   * Add a new tag
   * @param {string} name - Tag name
   * @param {string} color - Tag color (hex)
   * @returns {Object} Created tag
   */
  addTag(name, color = '#808080') {
    const tag = {
      id: Date.now().toString(),
      name: name.trim(),
      color,
      created: Date.now()
    };
    
    this.tags.push(tag);
    this.saveTags();
    window.dispatchEvent(new Event('tagsUpdated'));
    return tag;
  }

  /**
   * Update tag
   * @param {string} tagId - Tag ID
   * @param {Object} updates - Updates object (name, color)
   */
  updateTag(tagId, updates) {
    const tag = this.tags.find(t => t.id === tagId);
    if (!tag) return;

    if (updates.name !== undefined) {
      tag.name = updates.name.trim();
    }
    if (updates.color !== undefined) {
      tag.color = updates.color;
    }

    this.saveTags();
    window.dispatchEvent(new Event('tagsUpdated'));
  }

  /**
   * Delete a tag
   * @param {string} tagId - Tag ID
   */
  deleteTag(tagId) {
    this.tags = this.tags.filter(t => t.id !== tagId);
    this.saveTags();
    
    // Remove tag from all conversations
    const conversations = storage.getAllConversations();
    conversations.forEach(conv => {
      if (conv.tags && conv.tags.includes(tagId)) {
        conv.tags = conv.tags.filter(t => t !== tagId);
        storage.saveConversation(conv);
      }
    });
    
    window.dispatchEvent(new Event('tagsUpdated'));
  }

  /**
   * Add tag to conversation
   * @param {string} conversationId - Conversation ID
   * @param {string} tagId - Tag ID
   */
  addTagToConversation(conversationId, tagId) {
    const conversation = storage.getConversation(conversationId);
    if (!conversation) return;

    if (!conversation.tags) {
      conversation.tags = [];
    }

    if (!conversation.tags.includes(tagId)) {
      conversation.tags.push(tagId);
      storage.saveConversation(conversation);
      window.dispatchEvent(new Event('conversationUpdated'));
    }
  }

  /**
   * Remove tag from conversation
   * @param {string} conversationId - Conversation ID
   * @param {string} tagId - Tag ID
   */
  removeTagFromConversation(conversationId, tagId) {
    const conversation = storage.getConversation(conversationId);
    if (!conversation || !conversation.tags) return;

    conversation.tags = conversation.tags.filter(t => t !== tagId);
    storage.saveConversation(conversation);
    window.dispatchEvent(new Event('conversationUpdated'));
  }

  /**
   * Get tag by ID
   * @param {string} tagId - Tag ID
   * @returns {Object|null} Tag object or null
   */
  getTag(tagId) {
    return this.tags.find(t => t.id === tagId) || null;
  }

  /**
   * Get tags for a conversation
   * @param {string} conversationId - Conversation ID
   * @returns {Array} Array of tag IDs
   */
  getConversationTags(conversationId) {
    const conversation = storage.getConversation(conversationId);
    return conversation?.tags || [];
  }

  /**
   * Filter conversations by tag
   * @param {string} tagId - Tag ID
   * @returns {Array} Filtered conversations
   */
  filterConversationsByTag(tagId) {
    const conversations = storage.getAllConversations();
    return conversations.filter(conv => conv.tags && conv.tags.includes(tagId));
  }

  /**
   * Get conversations with a specific tag
   * @param {string} tagId - Tag ID
   * @returns {Array} Array of conversations
   */
  getConversationsWithTag(tagId) {
    return this.filterConversationsByTag(tagId);
  }

  /**
   * Get tag usage statistics
   * @returns {Array} Array of tags with usage counts
   */
  getTagUsageStats() {
    const conversations = storage.getAllConversations();
    return this.tags.map(tag => ({
      ...tag,
      count: conversations.filter(conv => 
        conv.tags && conv.tags.includes(tag.id)
      ).length
    }));
  }
}

// Export singleton instance
export default new TagsManager();
