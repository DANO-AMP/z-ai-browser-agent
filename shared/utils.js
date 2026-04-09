// Z AI Browser Agent - Shared Utilities
// Common helper functions used across the extension

/**
 * Format interval minutes into human-readable string
 * @param {number} min - Minutes to format
 * @returns {string} Formatted interval (e.g., "30 min", "2 hr", "1 day")
 */
function formatInterval(min) {
  if (!min || min <= 0) return '0 min';
  if (min < 60) return min + ' min';
  if (min < 1440) {
    const h = min / 60;
    return (h === Math.floor(h) ? h : h.toFixed(1)) + ' hr';
  }
  const d = min / 1440;
  return (d === Math.floor(d) ? d : d.toFixed(1)) + ' day' + (d >= 2 ? 's' : '');
}

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} HTML-escaped text
 */
function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(text).replace(/[&<>"']/g, c => map[c]);
}

/**
 * Sanitize HTML to prevent XSS while allowing safe formatting tags.
 * Strips script, iframe, object, embed, form, and event handlers.
 * @param {string} html - HTML string to sanitize
 * @returns {string} Sanitized HTML
 */
function sanitizeHTML(html) {
  // Remove dangerous tags completely
  let clean = html.replace(/<(script|iframe|object|embed|applet|form|input|textarea|select|button|link|meta|base)[^>]*>[\s\S]*?<\/\1>/gi, '');
  clean = clean.replace(/<(script|iframe|object|embed|applet|form|link|meta|base)[^>]*\/?>/gi, '');
  // Remove event handlers (on*)
  clean = clean.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  // Remove javascript: URLs
  clean = clean.replace(/href\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, 'href="#"');
  // Remove srcdoc attributes
  clean = clean.replace(/srcdoc\s*=\s*(?:"[^"]*"|'[^']*')/gi, '');
  return clean;
}

/**
 * Sanitize markdown link URLs before inserting them into the DOM
 * @param {string} url - Candidate URL from markdown
 * @returns {string} Safe URL or "#" if blocked
 */
function sanitizeLinkUrl(url) {
  try {
    const parsed = new URL(url, 'https://example.invalid');
    const allowed = ['http:', 'https:', 'mailto:'];
    return allowed.includes(parsed.protocol) ? url : '#';
  } catch {
    return '#';
  }
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
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) =>
    `<a href="${escapeHtml(sanitizeLinkUrl(url))}" target="_blank" rel="noopener">${label}</a>`);

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

// Export for global scope (loaded via <script> tags or importScripts)
const _globalObj = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : self);
_globalObj.formatInterval = formatInterval;
_globalObj.escapeHtml = escapeHtml;
_globalObj.sanitizeHTML = sanitizeHTML;
_globalObj.renderMarkdown = renderMarkdown;
_globalObj.jsStr = jsStr;
_globalObj.isUrlSafe = isUrlSafe;
_globalObj.sanitizeLinkUrl = sanitizeLinkUrl;
