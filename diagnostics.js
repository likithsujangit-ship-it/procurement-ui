(function() {
  const bufferedLogs = [];
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info
  };

  function sendLogs() {
    if (bufferedLogs.length === 0) return;
    const logsToSend = [...bufferedLogs];
    bufferedLogs.length = 0; // Clear buffer

    const body = JSON.stringify({ logs: logsToSend, url: window.location.href });

    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/client-logs', new Blob([body], { type: 'application/json' }));
    } else {
      fetch('/api/client-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
        keepalive: true
      }).catch(err => originalConsole.error("Failed to send diagnostics:", err));
    }
  }

  // Hook console functions
  ['log', 'warn', 'error', 'info'].forEach(type => {
    console[type] = function(...args) {
      originalConsole[type].apply(console, args);
      bufferedLogs.push({
        type: type,
        message: args.map(arg => {
          try {
            return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
          } catch(e) {
            return String(arg);
          }
        }).join(' ')
      });
      
      // Flush immediately on errors or warnings
      if (type === 'error' || type === 'warn' || bufferedLogs.length >= 10) {
        sendLogs();
      }
    };
  });

  // Flush interval
  setInterval(sendLogs, 1500);
  window.addEventListener('beforeunload', sendLogs);

  // Uncaught exceptions
  window.addEventListener('error', function(e) {
    console.error(`Uncaught Error: ${e.message} at ${e.filename}:${e.lineno}:${e.colno}`);
  });

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', function(e) {
    console.error(`Unhandled Rejection: ${e.reason ? (e.reason.stack || e.reason.message || e.reason) : e}`);
  });

  originalConsole.log("nexPro Client-side diagnostics initialized.");
})();
