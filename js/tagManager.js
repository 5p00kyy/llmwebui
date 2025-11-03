/**
 * Tag Management Modal
 * UI for creating, editing, and deleting tags
 */

import tags from './tags.js';

/**
 * Tag Manager UI class
 */
class TagManagerUI {
  constructor() {
    this.modal = null;
    this.isOpen = false;
  }

  /**
   * Show tag management modal
   */
  show() {
    if (this.isOpen) return;
    
    this.createModal();
    this.isOpen = true;
    
    // Add to DOM
    document.body.appendChild(this.modal);
    
    // Animate in
    requestAnimationFrame(() => {
      this.modal.classList.add('active');
    });
  }

  /**
   * Hide tag management modal
   */
  hide() {
    if (!this.isOpen || !this.modal) return;
    
    this.modal.classList.remove('active');
    
    setTimeout(() => {
      if (this.modal && this.modal.parentNode) {
        this.modal.parentNode.removeChild(this.modal);
      }
      this.modal = null;
      this.isOpen = false;
    }, 300);
  }

  /**
   * Create modal DOM structure
   */
  createModal() {
    this.modal = document.createElement('div');
    this.modal.className = 'modal-overlay';
    this.modal.innerHTML = `
      <div class="modal-container tag-manager-modal">
        <div class="modal-header">
          <h2>🏷️ Manage Tags</h2>
          <button class="btn-icon modal-close" title="Close">✕</button>
        </div>
        
        <div class="modal-body">
          <!-- Create new tag section -->
          <div class="tag-create-section">
            <h3>Create New Tag</h3>
            <div class="tag-create-form">
              <input 
                type="text" 
                id="newTagName" 
                placeholder="Tag name" 
                maxlength="30"
                class="input-field"
              />
              <input 
                type="color" 
                id="newTagColor" 
                value="#808080"
                class="color-picker"
                title="Choose tag color"
              />
              <button id="createTagBtn" class="btn btn-primary">Create</button>
            </div>
          </div>

          <!-- Existing tags list -->
          <div class="tag-list-section">
            <h3>Existing Tags</h3>
            <div id="tagsList" class="tags-list">
              <!-- Tags will be rendered here -->
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
    this.renderTags();
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Close button
    const closeBtn = this.modal.querySelector('.modal-close');
    closeBtn.addEventListener('click', () => this.hide());

    // Click outside to close
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.hide();
      }
    });

    // Escape key to close
    const escHandler = (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.hide();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    // Create tag button
    const createBtn = this.modal.querySelector('#createTagBtn');
    const nameInput = this.modal.querySelector('#newTagName');
    const colorInput = this.modal.querySelector('#newTagColor');

    createBtn.addEventListener('click', () => {
      this.createTag(nameInput.value, colorInput.value);
    });

    // Enter key in name input
    nameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.createTag(nameInput.value, colorInput.value);
      }
    });
  }

  /**
   * Create a new tag
   * @param {string} name - Tag name
   * @param {string} color - Tag color
   */
  createTag(name, color) {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      alert('Please enter a tag name');
      return;
    }

    // Check for duplicate names
    const existing = tags.getAllTags();
    if (existing.some(t => t.name.toLowerCase() === trimmedName.toLowerCase())) {
      alert('A tag with this name already exists');
      return;
    }

    // Create tag
    tags.addTag(trimmedName, color);
    
    // Reset form
    const nameInput = this.modal.querySelector('#newTagName');
    const colorInput = this.modal.querySelector('#newTagColor');
    nameInput.value = '';
    colorInput.value = '#808080';
    
    // Re-render list
    this.renderTags();
  }

  /**
   * Render tags list
   */
  renderTags() {
    const container = this.modal.querySelector('#tagsList');
    const allTags = tags.getTagUsageStats();

    if (allTags.length === 0) {
      container.innerHTML = '<div class="empty-state">No tags yet. Create one above!</div>';
      return;
    }

    // Sort by usage count (most used first)
    allTags.sort((a, b) => b.count - a.count);

    let html = '';
    allTags.forEach(tag => {
      html += `
        <div class="tag-item" data-tag-id="${tag.id}">
          <div class="tag-item-color" style="background: ${tag.color}"></div>
          <div class="tag-item-info">
            <div class="tag-item-name">${tag.name}</div>
            <div class="tag-item-usage">${tag.count} conversation${tag.count !== 1 ? 's' : ''}</div>
          </div>
          <div class="tag-item-actions">
            <button class="btn-icon" data-action="edit" title="Edit">✏️</button>
            <button class="btn-icon" data-action="delete" title="Delete">🗑️</button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
    this.attachTagItemListeners();
  }

  /**
   * Attach listeners to tag items
   */
  attachTagItemListeners() {
    const container = this.modal.querySelector('#tagsList');

    // Edit buttons
    container.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tagItem = e.target.closest('.tag-item');
        const tagId = tagItem.dataset.tagId;
        this.editTag(tagId);
      });
    });

    // Delete buttons
    container.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tagItem = e.target.closest('.tag-item');
        const tagId = tagItem.dataset.tagId;
        this.deleteTag(tagId);
      });
    });
  }

  /**
   * Edit a tag
   * @param {string} tagId - Tag ID
   */
  editTag(tagId) {
    const tag = tags.getTag(tagId);
    if (!tag) return;

    const newName = prompt('Enter new tag name:', tag.name);
    if (!newName || newName.trim() === '') return;

    const trimmedName = newName.trim();

    // Check for duplicate names (excluding current tag)
    const existing = tags.getAllTags();
    if (existing.some(t => t.id !== tagId && t.name.toLowerCase() === trimmedName.toLowerCase())) {
      alert('A tag with this name already exists');
      return;
    }

    // Color picker (simple approach using prompt)
    const newColor = prompt('Enter new color (hex):', tag.color);
    if (newColor && /^#[0-9A-F]{6}$/i.test(newColor)) {
      tags.updateTag(tagId, { name: trimmedName, color: newColor });
    } else {
      tags.updateTag(tagId, { name: trimmedName });
    }

    this.renderTags();
  }

  /**
   * Delete a tag
   * @param {string} tagId - Tag ID
   */
  deleteTag(tagId) {
    const tag = tags.getTag(tagId);
    if (!tag) return;

    const tagStats = tags.getTagUsageStats().find(t => t.id === tagId);
    const count = tagStats ? tagStats.count : 0;

    let message = `Delete tag "${tag.name}"?`;
    if (count > 0) {
      message += `\n\nThis tag is used in ${count} conversation${count !== 1 ? 's' : ''}. It will be removed from all of them.`;
    }

    if (!confirm(message)) return;

    tags.deleteTag(tagId);
    this.renderTags();
  }
}

// Export singleton instance
export default new TagManagerUI();
