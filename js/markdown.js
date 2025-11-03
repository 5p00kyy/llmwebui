/**
 * Markdown rendering utilities
 * Uses marked.js for markdown parsing and highlight.js for code syntax highlighting
 */

/**
 * Initialize marked with custom renderer
 */
let markedInitialized = false;
let hljs = null;

async function initializeMarked() {
  if (markedInitialized) return;
  
  // Wait for marked to be loaded from CDN
  while (typeof marked === 'undefined') {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Configure marked options
  marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: false,
    mangle: false
  });
  
  markedInitialized = true;
}

/**
 * Initialize highlight.js for code syntax highlighting
 */
async function initializeHighlight() {
  if (hljs) return hljs;
  
  // Wait for hljs to be loaded from CDN
  while (typeof window.hljs === 'undefined') {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  hljs = window.hljs;
  return hljs;
}

/**
 * Render markdown to HTML
 * @param {string} markdown - Markdown text
 * @returns {Promise<string>} Rendered HTML
 */
export async function renderMarkdown(markdown) {
  await initializeMarked();
  
  try {
    const html = marked.parse(markdown);
    return html;
  } catch (error) {
    console.error('Failed to render markdown:', error);
    return escapeHtml(markdown);
  }
}

/**
 * Highlight code blocks in an element
 * @param {HTMLElement} element - Element containing code blocks
 */
export async function highlightCode(element) {
  const highlighter = await initializeHighlight();
  
  if (!highlighter) return;
  
  const codeBlocks = element.querySelectorAll('pre code');
  codeBlocks.forEach(block => {
    try {
      highlighter.highlightElement(block);
    } catch (error) {
      console.warn('Failed to highlight code block:', error);
    }
  });
}

/**
 * Render markdown and highlight code in one step
 * @param {string} markdown - Markdown text
 * @returns {Promise<HTMLElement>} Rendered element
 */
export async function renderMarkdownWithHighlight(markdown) {
  const html = await renderMarkdown(markdown);
  
  const container = document.createElement('div');
  container.className = 'markdown-content';
  container.innerHTML = html;
  
  await highlightCode(container);
  
  return container;
}

/**
 * Add copy button to code blocks
 * @param {HTMLElement} element - Element containing code blocks
 */
export function addCopyButtons(element) {
  const codeBlocks = element.querySelectorAll('pre');
  
  codeBlocks.forEach(pre => {
    // Skip if copy button already exists
    if (pre.querySelector('.copy-button')) return;
    
    const button = document.createElement('button');
    button.className = 'copy-button';
    button.textContent = 'Copy';
    button.title = 'Copy code';
    
    button.addEventListener('click', async () => {
      const code = pre.querySelector('code');
      const text = code ? code.textContent : pre.textContent;
      
      try {
        await navigator.clipboard.writeText(text);
        button.textContent = 'Copied!';
        button.classList.add('copied');
        
        setTimeout(() => {
          button.textContent = 'Copy';
          button.classList.remove('copied');
        }, 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
        button.textContent = 'Failed';
        setTimeout(() => {
          button.textContent = 'Copy';
        }, 2000);
      }
    });
    
    pre.style.position = 'relative';
    pre.appendChild(button);
  });
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Parse inline code in text
 * @param {string} text - Text to parse
 * @returns {string} HTML with inline code formatted
 */
export function parseInlineCode(text) {
  return text.replace(/`([^`]+)`/g, '<code>$1</code>');
}

/**
 * Strip markdown formatting for plain text preview
 * @param {string} markdown - Markdown text
 * @returns {string} Plain text
 */
export function stripMarkdown(markdown) {
  return markdown
    // Remove headers
    .replace(/#{1,6}\s+/g, '')
    // Remove emphasis
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // Remove links
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    // Remove images
    .replace(/!\[([^\]]*)\]\([^\)]+\)/g, '$1')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '[code]')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove blockquotes
    .replace(/^\s*>\s+/gm, '')
    // Remove horizontal rules
    .replace(/^\s*[-*_]{3,}\s*$/gm, '')
    // Remove list markers
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    // Clean up whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Check if text contains markdown formatting
 * @param {string} text - Text to check
 * @returns {boolean} True if contains markdown
 */
export function hasMarkdown(text) {
  const markdownPatterns = [
    /#{1,6}\s+/,           // Headers
    /\*\*.*?\*\*/,          // Bold
    /__.*?__/,              // Bold
    /\*.*?\*/,              // Italic
    /_.*?_/,                // Italic
    /```[\s\S]*?```/,       // Code blocks
    /`[^`]+`/,              // Inline code
    /\[.*?\]\(.*?\)/,       // Links
    /!\[.*?\]\(.*?\)/,      // Images
    /^\s*[-*+]\s+/m,        // Unordered lists
    /^\s*\d+\.\s+/m,        // Ordered lists
    /^\s*>\s+/m             // Blockquotes
  ];
  
  return markdownPatterns.some(pattern => pattern.test(text));
}

export default {
  renderMarkdown,
  highlightCode,
  renderMarkdownWithHighlight,
  addCopyButtons,
  parseInlineCode,
  stripMarkdown,
  hasMarkdown
};
