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

  function capture(level, args) {
    window.__zAiLogs.push({
      level,
      text: args.map(a => {
        try { return typeof a === 'object' ? JSON.stringify(a) : String(a); }
        catch { return String(a); }
      }).join(' '),
      time: Date.now()
    });
    if (window.__zAiLogs.length > MAX_LOGS) window.__zAiLogs.shift();
  }

  console.log = function (...a) { capture('log', a); orig.log(...a); };
  console.warn = function (...a) { capture('warn', a); orig.warn(...a); };
  console.error = function (...a) { capture('error', a); orig.error(...a); };
  console.info = function (...a) { capture('info', a); orig.info(...a); };

  window.addEventListener('error', (e) => {
    window.__zAiLogs.push({ level: 'error', text: `${e.message} at ${e.filename}:${e.lineno}`, time: Date.now() });
  });
})();
