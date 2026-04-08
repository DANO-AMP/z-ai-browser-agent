// Z AI Browser Agent - Shared Utilities
// Common helper functions used across the extension

/**
 * Format interval minutes into human-readable string
 * @param {number} min - Minutes to format
 * @returns {string} Formatted interval (e.g., "30 min", "2 hr", "1 day")
 */
function formatInterval(min) {
  if (min < 60) return min + ' min';
  if (min < 1440) return (min / 60) + ' hr';
  return (min / 1440) + ' day';
}

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} HTML-escaped text
 */
function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
  return String(text).replace(/[&<>"]/g, c => map[c]);
}

/**
 * Convert markdown-like text to HTML (enhanced version)
 * Supports: code blocks, inline code, bold, italic, headings,
 * unordered/ordered lists, links, horizontal rules, line breaks
 * @param {string} text - Markdown text to render
 * @returns {string} HTML string
 */
function renderMarkdown(text) {
  let html = escapeHtml(text);

  // Code blocks ```lang...```
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
    `<pre><code class="language-${lang}">${code.trim()}</code></pre>`);

  // Inline code `...`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Headings # ## ###
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold **text**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic *text*
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

  // Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // Horizontal rules ---
  html = html.replace(/^---$/gm, '<hr>');

  // Unordered lists - item (convert consecutive lines)
  html = html.replace(/(^- .+(?:\n- .+)*)/gm, (match) => {
    const items = match.split('\n').map(line => line.replace(/^- /, '').trim());
    return '<ul>' + items.map(i => `<li>${i}</li>`).join('') + '</ul>';
  });

  // Ordered lists 1. item (convert consecutive lines)
  html = html.replace(/(^[\d]+\. .+(?:\n[\d]+\. .+)*)/gm, (match) => {
    const items = match.split('\n').map(line => line.replace(/^[\d]+\. /, '').trim());
    return '<ol>' + items.map(i => `<li>${i}</li>`).join('') + '</ol>';
  });

  // Line breaks
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');

  return html;
}

/**
 * Safely encode a value as a JavaScript string literal
 * Prevents injection in Runtime.evaluate expressions
 * @param {string} value - Value to encode
 * @returns {string} JSON-stringified value
 */
function jsStr(value) {
  return JSON.stringify(String(value));
}

/**
 * Check if a URL is safe to navigate/download
 * Blocks dangerous protocols and internal IPs
 * @param {string} url - URL to check
 * @param {boolean} devMode - If true, allows localhost/internal IPs for development
 * @returns {boolean} True if URL is safe
 */
function isUrlSafe(url, devMode = false) {
  try {
    const parsed = new URL(url);
    const blocked = ['javascript:', 'file:', 'chrome:', 'chrome-extension:', 'data:', 'blob:'];
    if (blocked.includes(parsed.protocol)) return false;

    const h = parsed.hostname;

    // In dev mode, allow localhost/internal IPs
    if (!devMode) {
      if (['localhost', '127.0.0.1', '0.0.0.0'].includes(h)) return false;
      if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(h)) return false;
    }

    return true;
  } catch {
    return false;
  }
}

// Export for global scope (loaded via <script> tags)
window.formatInterval = formatInterval;
window.escapeHtml = escapeHtml;
window.renderMarkdown = renderMarkdown;
window.jsStr = jsStr;
window.isUrlSafe = isUrlSafe;
