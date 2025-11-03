/**
 * RAG (Retrieval-Augmented Generation) System
 * Handles document upload, processing, and context retrieval
 */

export class RAGManager {
  constructor(storage) {
    this.storage = storage;
    this.documents = this.loadDocuments();
    this.listeners = new Set();
  }

  /**
   * Load documents from storage
   * @returns {Array} Array of documents
   */
  loadDocuments() {
    return this.storage.get('rag.documents') || [];
  }

  /**
   * Save documents to storage
   */
  saveDocuments() {
    this.storage.set('rag.documents', this.documents);
    this.notifyListeners();
  }

  /**
   * Add a document
   * @param {File} file - File object
   * @returns {Promise<Object>} Document object
   */
  async addDocument(file) {
    try {
      const content = await this.parseFile(file);
      const chunks = this.chunkText(content, 500);
      
      const document = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        type: file.type,
        size: file.size,
        content: content,
        chunks: chunks,
        addedAt: Date.now(),
        active: true
      };
      
      this.documents.push(document);
      this.saveDocuments();
      
      return document;
    } catch (error) {
      console.error('Failed to add document:', error);
      throw error;
    }
  }

  /**
   * Parse file content
   * @param {File} file - File object
   * @returns {Promise<string>} File content as text
   */
  async parseFile(file) {
    const text = await file.text();
    
    // For now, handle plain text files
    // TODO: Add PDF.js for PDFs, mammoth.js for DOCX
    if (file.type === 'application/pdf') {
      // Would integrate PDF.js here
      throw new Error('PDF parsing not yet implemented. Please convert to text first.');
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // Would integrate mammoth.js here
      throw new Error('DOCX parsing not yet implemented. Please convert to text first.');
    }
    
    return text;
  }

  /**
   * Chunk text into smaller pieces
   * @param {string} text - Text to chunk
   * @param {number} chunkSize - Approximate size of each chunk
   * @param {number} overlap - Overlap between chunks
   * @returns {Array} Array of text chunks
   */
  chunkText(text, chunkSize = 500, overlap = 50) {
    const chunks = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    let currentChunk = '';
    let currentSize = 0;
    
    for (const sentence of sentences) {
      if (currentSize + sentence.length > chunkSize && currentChunk) {
        chunks.push(currentChunk.trim());
        
        // Add overlap
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.floor(overlap / 5));
        currentChunk = overlapWords.join(' ') + ' ';
        currentSize = currentChunk.length;
      }
      
      currentChunk += sentence;
      currentSize += sentence.length;
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  /**
   * Retrieve relevant context for a query
   * @param {string} query - User query
   * @param {number} topK - Number of top chunks to return
   * @returns {Array} Array of relevant chunks
   */
  retrieveContext(query, topK = 3) {
    const activeDocuments = this.documents.filter(doc => doc.active);
    if (activeDocuments.length === 0) {
      return [];
    }
    
    // Simple keyword-based retrieval
    // TODO: Implement proper vector similarity for better results
    const scoredChunks = [];
    
    const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    
    activeDocuments.forEach(doc => {
      doc.chunks.forEach((chunk, index) => {
        const chunkLower = chunk.toLowerCase();
        let score = 0;
        
        queryTerms.forEach(term => {
          const occurrences = (chunkLower.match(new RegExp(term, 'g')) || []).length;
          score += occurrences;
        });
        
        if (score > 0) {
          scoredChunks.push({
            docId: doc.id,
            docName: doc.name,
            chunk: chunk,
            chunkIndex: index,
            score: score
          });
        }
      });
    });
    
    // Sort by score and return top K
    return scoredChunks
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /**
   * Get all documents
   * @returns {Array} Array of documents
   */
  getDocuments() {
    return this.documents;
  }

  /**
   * Get active documents
   * @returns {Array} Array of active documents
   */
  getActiveDocuments() {
    return this.documents.filter(doc => doc.active);
  }

  /**
   * Toggle document active status
   * @param {string} docId - Document ID
   */
  toggleDocument(docId) {
    const doc = this.documents.find(d => d.id === docId);
    if (doc) {
      doc.active = !doc.active;
      this.saveDocuments();
    }
  }

  /**
   * Remove a document
   * @param {string} docId - Document ID
   */
  removeDocument(docId) {
    this.documents = this.documents.filter(d => d.id !== docId);
    this.saveDocuments();
  }

  /**
   * Clear all documents
   */
  clearAll() {
    this.documents = [];
    this.saveDocuments();
  }

  /**
   * Get document by ID
   * @param {string} docId - Document ID
   * @returns {Object|null} Document object
   */
  getDocument(docId) {
    return this.documents.find(d => d.id === docId) || null;
  }

  /**
   * Format context for injection into prompt
   * @param {Array} chunks - Array of chunk objects
   * @returns {string} Formatted context
   */
  formatContext(chunks) {
    if (chunks.length === 0) return '';
    
    const header = '=== RELEVANT DOCUMENT CONTEXT ===\n';
    const footer = '\n=== END CONTEXT ===\n\n';
    
    const contextParts = chunks.map((item, index) => 
      `[Source: ${item.docName}, Chunk ${item.chunkIndex + 1}]\n${item.chunk}`
    );
    
    return header + contextParts.join('\n\n---\n\n') + footer;
  }

  /**
   * Add change listener
   * @param {Function} listener - Listener function
   */
  addListener(listener) {
    this.listeners.add(listener);
  }

  /**
   * Remove change listener
   * @param {Function} listener - Listener function
   */
  removeListener(listener) {
    this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of changes
   */
  notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.documents);
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }

  /**
   * Get total document stats
   * @returns {Object} Stats object
   */
  getStats() {
    return {
      total: this.documents.length,
      active: this.documents.filter(d => d.active).length,
      totalSize: this.documents.reduce((sum, d) => sum + d.size, 0),
      totalChunks: this.documents.reduce((sum, d) => sum + d.chunks.length, 0)
    };
  }
}

/**
 * Create file upload UI
 * @param {RAGManager} ragManager - RAG manager instance
 * @returns {HTMLElement} File upload element
 */
export function createFileUploadUI(ragManager) {
  const container = document.createElement('div');
  container.className = 'file-upload-container';
  
  // Upload button
  const uploadBtn = document.createElement('button');
  uploadBtn.className = 'btn-icon file-upload-btn';
  uploadBtn.innerHTML = '📎';
  uploadBtn.title = 'Upload Document';
  
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.txt,.md,.pdf,.docx,.json,.csv';
  fileInput.style.display = 'none';
  fileInput.multiple = true;
  
  uploadBtn.addEventListener('click', () => {
    fileInput.click();
  });
  
  fileInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    
    for (const file of files) {
      try {
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '⏳';
        
        await ragManager.addDocument(file);
        
        uploadBtn.innerHTML = '✓';
        setTimeout(() => {
          uploadBtn.innerHTML = '📎';
          uploadBtn.disabled = false;
        }, 1000);
      } catch (error) {
        alert(`Failed to upload ${file.name}: ${error.message}`);
        uploadBtn.innerHTML = '📎';
        uploadBtn.disabled = false;
      }
    }
    
    fileInput.value = '';
  });
  
  container.appendChild(uploadBtn);
  container.appendChild(fileInput);
  
  return container;
}

/**
 * Create document management UI
 * @param {RAGManager} ragManager - RAG manager instance
 * @returns {HTMLElement} Document management element
 */
export function createDocumentManagerUI(ragManager) {
  const container = document.createElement('div');
  container.className = 'document-manager';
  
  const header = document.createElement('div');
  header.className = 'document-manager-header';
  
  const title = document.createElement('h3');
  title.textContent = 'Documents';
  
  const stats = document.createElement('div');
  stats.className = 'document-stats';
  
  const clearBtn = document.createElement('button');
  clearBtn.className = 'btn btn-sm btn-danger';
  clearBtn.textContent = 'Clear All';
  clearBtn.addEventListener('click', () => {
    if (confirm('Remove all documents?')) {
      ragManager.clearAll();
    }
  });
  
  header.appendChild(title);
  header.appendChild(stats);
  
  const list = document.createElement('div');
  list.className = 'document-list';
  
  const updateUI = () => {
    const documents = ragManager.getDocuments();
    const statsData = ragManager.getStats();
    
    stats.textContent = `${statsData.active}/${statsData.total} active • ${statsData.totalChunks} chunks`;
    
    list.innerHTML = '';
    
    if (documents.length === 0) {
      list.innerHTML = '<div class="empty-state-subtext">No documents uploaded</div>';
      return;
    }
    
    documents.forEach(doc => {
      const item = document.createElement('div');
      item.className = 'document-item';
      if (doc.active) item.classList.add('active');
      
      const info = document.createElement('div');
      info.className = 'document-info';
      
      const name = document.createElement('div');
      name.className = 'document-name';
      name.textContent = doc.name;
      
      const meta = document.createElement('div');
      meta.className = 'document-meta';
      meta.textContent = `${doc.chunks.length} chunks • ${(doc.size / 1024).toFixed(1)} KB`;
      
      info.appendChild(name);
      info.appendChild(meta);
      
      const actions = document.createElement('div');
      actions.className = 'document-actions';
      
      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'btn-icon btn-sm';
      toggleBtn.innerHTML = doc.active ? '✓' : '○';
      toggleBtn.title = doc.active ? 'Deactivate' : 'Activate';
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        ragManager.toggleDocument(doc.id);
      });
      
      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn-icon btn-sm';
      removeBtn.innerHTML = '🗑️';
      removeBtn.title = 'Remove';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Remove "${doc.name}"?`)) {
          ragManager.removeDocument(doc.id);
        }
      });
      
      actions.appendChild(toggleBtn);
      actions.appendChild(removeBtn);
      
      item.appendChild(info);
      item.appendChild(actions);
      
      list.appendChild(item);
    });
  };
  
  // Listen for changes
  ragManager.addListener(updateUI);
  
  // Initial render
  updateUI();
  
  container.appendChild(header);
  container.appendChild(list);
  container.appendChild(clearBtn);
  
  return container;
}

/**
 * Enhance user message with RAG context
 * @param {RAGManager} ragManager - RAG manager instance
 * @param {string} userMessage - User's message
 * @returns {string} Enhanced message with context
 */
export function enhanceMessageWithContext(ragManager, userMessage) {
  const relevantChunks = ragManager.retrieveContext(userMessage);
  
  if (relevantChunks.length === 0) {
    return userMessage;
  }
  
  const context = ragManager.formatContext(relevantChunks);
  return context + 'User Query: ' + userMessage;
}

export default RAGManager;
