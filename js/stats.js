/**
 * Statistics tracking for performance metrics
 * Tracks token usage, generation speed, and response times
 */

import { formatNumber } from './utils.js';

/**
 * Stats manager class
 */
class StatsManager {
  constructor() {
    this.currentStats = {
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      tokensPerSecond: 0,
      timeToFirstToken: 0,
      totalTime: 0,
      contextUsed: 0,
      contextLimit: 4096
    };
    
    this.statsElement = null;
    this.isGenerating = false;
  }

  /**
   * Set the stats display element
   * @param {HTMLElement} element - Stats display element
   */
  setElement(element) {
    this.statsElement = element;
  }

  /**
   * Update stats
   * @param {Object} stats - Stats object
   */
  updateStats(stats) {
    Object.assign(this.currentStats, stats);
    this.render();
  }

  /**
   * Start generation (show loading state)
   */
  startGeneration() {
    this.isGenerating = true;
    this.currentStats = {
      totalTokens: 0,
      tokensPerSecond: 0,
      timeToFirstToken: 0,
      totalTime: 0
    };
    this.render();
  }

  /**
   * End generation
   */
  endGeneration() {
    this.isGenerating = false;
    this.render();
  }

  /**
   * Set context information
   * @param {number} used - Tokens used
   * @param {number} limit - Token limit
   */
  setContext(used, limit) {
    this.currentStats.contextUsed = used;
    this.currentStats.contextLimit = limit;
    this.render();
  }

  /**
   * Render stats to the element
   */
  render() {
    if (!this.statsElement) return;

    const stats = this.currentStats;
    
    // Build stats HTML
    let html = '<div class="stats-row">';
    
    // Context usage
    if (stats.contextUsed > 0 || stats.contextLimit > 0) {
      const percentage = stats.contextLimit > 0 
        ? Math.round((stats.contextUsed / stats.contextLimit) * 100)
        : 0;
      
      html += `
        <div class="stat-item">
          <span class="stat-label">Context:</span>
          <span class="stat-value">${formatNumber(stats.contextUsed)} / ${formatNumber(stats.contextLimit)}</span>
          <span class="stat-percentage">(${percentage}%)</span>
        </div>
      `;
    }
    
    // Generation speed
    if (this.isGenerating || stats.tokensPerSecond > 0) {
      html += `
        <div class="stat-item">
          <span class="stat-label">Speed:</span>
          <span class="stat-value">${stats.tokensPerSecond || '...'} tok/s</span>
        </div>
      `;
    }
    
    // Time to first token
    if (stats.timeToFirstToken > 0) {
      html += `
        <div class="stat-item">
          <span class="stat-label">TTFT:</span>
          <span class="stat-value">${stats.timeToFirstToken}ms</span>
        </div>
      `;
    }
    
    // Total time
    if (stats.totalTime > 0) {
      const seconds = (stats.totalTime / 1000).toFixed(2);
      html += `
        <div class="stat-item">
          <span class="stat-label">Total:</span>
          <span class="stat-value">${seconds}s</span>
        </div>
      `;
    }
    
    // Loading indicator
    if (this.isGenerating) {
      html += `
        <div class="stat-item stat-loading">
          <span class="stat-label">Generating...</span>
          <span class="loading-spinner"></span>
        </div>
      `;
    }
    
    html += '</div>';
    
    this.statsElement.innerHTML = html;
    
    // Show/hide stats bar
    if (this.isGenerating || stats.totalTime > 0) {
      this.statsElement.classList.add('visible');
    } else {
      this.statsElement.classList.remove('visible');
    }
  }

  /**
   * Clear stats
   */
  clear() {
    this.currentStats = {
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      tokensPerSecond: 0,
      timeToFirstToken: 0,
      totalTime: 0,
      contextUsed: 0,
      contextLimit: 4096
    };
    this.isGenerating = false;
    this.render();
  }

  /**
   * Get current stats
   * @returns {Object} Current stats
   */
  getStats() {
    return { ...this.currentStats };
  }

  /**
   * Format stats for display
   * @returns {string} Formatted stats string
   */
  formatStats() {
    const s = this.currentStats;
    const parts = [];
    
    if (s.contextUsed > 0) {
      parts.push(`Context: ${formatNumber(s.contextUsed)}/${formatNumber(s.contextLimit)}`);
    }
    
    if (s.tokensPerSecond > 0) {
      parts.push(`Speed: ${s.tokensPerSecond} tok/s`);
    }
    
    if (s.timeToFirstToken > 0) {
      parts.push(`TTFT: ${s.timeToFirstToken}ms`);
    }
    
    if (s.totalTime > 0) {
      parts.push(`Total: ${(s.totalTime / 1000).toFixed(2)}s`);
    }
    
    return parts.join(' | ');
  }

  /**
   * Calculate estimated context usage
   * @param {Array} messages - Conversation messages
   * @returns {number} Estimated tokens
   */
  estimateContextUsage(messages) {
    let total = 0;
    
    for (const msg of messages) {
      // Rough estimate: ~4 chars per token
      total += Math.ceil(msg.content.length / 4);
      // Add overhead for message structure
      total += 4;
    }
    
    return total;
  }

  /**
   * Update context for current conversation
   * @param {Array} messages - Array of messages
   * @param {number} contextLimit - Model's context limit
   */
  updateContextFromMessages(messages, contextLimit = 4096) {
    const used = this.estimateContextUsage(messages);
    this.setContext(used, contextLimit);
  }
}

// Export singleton instance
export default new StatsManager();
