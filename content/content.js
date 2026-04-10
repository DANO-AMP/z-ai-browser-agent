// Z AI Browser Agent - Content Script
// Captures console logs for the agent to read

(function () {
  if (window.__zAiContentLoaded) return;
  window.__zAiContentLoaded = true;

  // Console log capture
  window.__zAiLogs = [];
  const MAX_LOGS = 100;

  const orig = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    info: console.info.bind(console)
  };

  const MAX_LOG_TEXT = 2000; // Prevent oversized log entries from bloating memory

  function capture(level, args) {
    let text = args.map(a => {
      try {
        if (typeof a === 'object') {
          const s = JSON.stringify(a);
          return s.length > MAX_LOG_TEXT ? s.substring(0, MAX_LOG_TEXT) + '...' : s;
        }
        return String(a);
      }
      catch { return String(a); }
    }).join(' ');
    if (text.length > MAX_LOG_TEXT) text = text.substring(0, MAX_LOG_TEXT) + '...';
    window.__zAiLogs.push({ level, text, time: Date.now() });
    if (window.__zAiLogs.length > MAX_LOGS) window.__zAiLogs.shift();
  }

  console.log = function (...a) { capture('log', a); orig.log(...a); };
  console.warn = function (...a) { capture('warn', a); orig.warn(...a); };
  console.error = function (...a) { capture('error', a); orig.error(...a); };
  console.info = function (...a) { capture('info', a); orig.info(...a); };

  window.addEventListener('error', (e) => {
    const text = `${e.message} at ${e.filename}:${e.lineno}`;
    window.__zAiLogs.push({ level: 'error', text: text.substring(0, MAX_LOG_TEXT), time: Date.now() });
    if (window.__zAiLogs.length > MAX_LOGS) window.__zAiLogs.shift();
  });

  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason;
    const text = reason instanceof Error
      ? `Unhandled rejection: ${reason.message}`
      : `Unhandled rejection: ${String(reason)}`;
    window.__zAiLogs.push({ level: 'error', text: text.substring(0, MAX_LOG_TEXT), time: Date.now() });
    if (window.__zAiLogs.length > MAX_LOGS) window.__zAiLogs.shift();
  });
})();
