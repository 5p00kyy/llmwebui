/**
 * Command Palette for quick actions
 * Keyboard-driven interface (Cmd/Ctrl+K)
 */

import storage from './storage.js';

/**
 * Command Palette class
 */
class CommandPalette {
  constructor() {
    this.isOpen = false;
    this.commands = [];
    this.filteredCommands = [];
    this.selectedIndex = 0;
    this.palette = null;
    this.input = null;
    this.commandsList = null;
  }

  /**
   * Initialize command palette
   * @param {Object} handlers - Command handlers
   */
  initialize(handlers = {}) {
    this.handlers = handlers;
    this.createPalette();
    this.registerDefaultCommands();
    this.setupKeyboardShortcuts();
  }

  /**
   * Register default commands
   */
  registerDefaultCommands() {
    this.commands = [
      {
        id: 'new-conversation',
        name: 'New Conversation',
        description: 'Start a new chat',
        icon: '💬',
        shortcut: 'Ctrl+N',
        handler: () => this.handlers.newConversation?.()
      },
      {
        id: 'search-conversations',
        name: 'Search Conversations',
        description: 'Find past conversations',
        icon: '🔍',
        shortcut: 'Ctrl+F',
        handler: () => this.handlers.searchConversations?.()
      },
      {
        id: 'switch-model',
        name: 'Switch Model',
        description: 'Change active model',
        icon: '🤖',
        shortcut: 'Ctrl+M',
        handler: () => this.handlers.switchModel?.()
      },
      {
        id: 'toggle-sidebar',
        name: 'Toggle Sidebar',
        description: 'Show/hide sidebar',
        icon: '☰',
        shortcut: 'Ctrl+B',
        handler: () => this.handlers.toggleSidebar?.()
      },
      {
        id: 'settings',
        name: 'Open Settings',
        description: 'Configure application',
        icon: '⚙️',
        shortcut: 'Ctrl+,',
        handler: () => this.handlers.openSettings?.()
      },
      {
        id: 'export-conversation',
        name: 'Export Conversation',
        description: 'Download current chat',
        icon: '📥',
        handler: () => this.handlers.exportConversation?.()
      },
      {
        id: 'toggle-stats',
        name: 'Toggle Stats',
        description: 'Show/hide performance stats',
        icon: '📊',
        handler: () => this.handlers.toggleStats?.()
      }
    ];
  }

  /**
   * Create palette DOM element
   */
  createPalette() {
    const palette = document.createElement('div');
    palette.className = 'command-palette';
    palette.innerHTML = `
      <div class="command-palette-modal">
        <div class="command-palette-header">
          <span class="command-palette-icon">⌘</span>
          <input type="text" class="command-palette-input" placeholder="Type a command or search...">
        </div>
        <div class="command-palette-list">
          <!-- Commands will be rendered here -->
        </div>
      </div>
    `;
    
    document.body.appendChild(palette);
    this.palette = palette;
    this.input = palette.querySelector('.command-palette-input');
    this.commandsList = palette.querySelector('.command-palette-list');
    
    // Handle input
    this.input.addEventListener('input', (e) => this.filterCommands(e.target.value));
    
    // Handle keyboard navigation
    this.input.addEventListener('keydown', (e) => this.handleKeyNavigation(e));
    
    // Close on click outside
    palette.addEventListener('click', (e) => {
      if (e.target === palette) {
        this.close();
      }
    });
  }

  /**
   * Setup keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Cmd/Ctrl+K to open palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.toggle();
      }
      
      // Escape to close
      if (e.key === 'Escape' && this.isOpen) {
        e.preventDefault();
        this.close();
      }
    });
  }

  /**
   * Toggle palette
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Open palette
   */
  open() {
    this.isOpen = true;
    this.palette.classList.add('open');
    this.input.value = '';
    this.filterCommands('');
    this.selectedIndex = 0;
    setTimeout(() => this.input.focus(), 100);
  }

  /**
   * Close palette
   */
  close() {
    this.isOpen = false;
    this.palette.classList.remove('open');
    this.input.blur();
  }

  /**
   * Filter commands based on query
   * @param {string} query - Search query
   */
  filterCommands(query) {
    const lowerQuery = query.toLowerCase();
    
    if (!query) {
      this.filteredCommands = this.commands;
    } else {
      this.filteredCommands = this.commands.filter(cmd =>
        cmd.name.toLowerCase().includes(lowerQuery) ||
        cmd.description.toLowerCase().includes(lowerQuery)
      );
    }
    
    this.renderCommands();
  }

  /**
   * Render commands list
   */
  renderCommands() {
    if (this.filteredCommands.length === 0) {
      this.commandsList.innerHTML = `
        <div class="command-empty">No commands found</div>
      `;
      return;
    }

    this.commandsList.innerHTML = this.filteredCommands.map((cmd, index) => `
      <div class="command-item ${index === this.selectedIndex ? 'selected' : ''}" data-index="${index}">
        <div class="command-icon">${cmd.icon}</div>
        <div class="command-content">
          <div class="command-name">${cmd.name}</div>
          <div class="command-description">${cmd.description}</div>
        </div>
        ${cmd.shortcut ? `<div class="command-shortcut">${cmd.shortcut}</div>` : ''}
      </div>
    `).join('');
    
    // Add click handlers
    this.commandsList.querySelectorAll('.command-item').forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.index);
        this.executeCommand(this.filteredCommands[index]);
      });
    });
  }

  /**
   * Handle keyboard navigation
   * @param {KeyboardEvent} e - Keyboard event
   */
  handleKeyNavigation(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredCommands.length - 1);
      this.renderCommands();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
      this.renderCommands();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (this.filteredCommands[this.selectedIndex]) {
        this.executeCommand(this.filteredCommands[this.selectedIndex]);
      }
    }
  }

  /**
   * Execute a command
   * @param {Object} command - Command to execute
   */
  executeCommand(command) {
    this.close();
    if (command.handler) {
      setTimeout(() => command.handler(), 100);
    }
  }

  /**
   * Add custom command
   * @param {Object} command - Command object
   */
  addCommand(command) {
    this.commands.push(command);
  }
}

// Export singleton instance
export default new CommandPalette();
