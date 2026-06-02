// HostedScan LLM Bridge — Content Script
console.log("[HS Bridge] Content script loaded at", document.readyState);

const DEFAULT_ENDPOINT = "https://cerberus-ai.vercel.app/api/ai/bridge-logs";

// Try to extract nonce from page's own scripts to bypass CSP
function getNonce() {
  const s = document.querySelector("script[nonce]");
  return s ? s.nonce : "";
}

function injectHook() {
  const nonce = getNonce();
  const sessionId = crypto.randomUUID();
  const endpoint = DEFAULT_ENDPOINT;

  const code = `
(function() {
  if (window.__hsBridgeInstalled) return;
  window.__hsBridgeInstalled = true;
  console.log("[HS Bridge] Live on", location.host);

  var ENDPOINT = ${JSON.stringify(endpoint)};
  var sessionId = ${JSON.stringify(sessionId)};
  var conversationId = null;

  function isChatGptApi(url) {
    var u = (url || "").toLowerCase();
    return u.indexOf("chatgpt.com/backend-api") !== -1 ||
           u.indexOf("chat.openai.com/backend-api") !== -1 ||
           u.indexOf("chatgpt.com/api/") !== -1 ||
           u.indexOf("chat.openai.com/api/") !== -1;
  }

  var origFetch = window.fetch;

  function sendLog(data) {
    try {
      var payload = JSON.stringify({
        sessionId: sessionId,
        conversationId: conversationId,
        source: "bridge",
        method: data.method,
        url: data.url,
        request: data.requestPayload ? (typeof data.requestPayload === "string" ? data.requestPayload : JSON.stringify(data.requestPayload)) : "",
        response: data.responseText || "",
        status: data.status,
        durationMs: data.duration,
        contentType: data.contentType,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });
      origFetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true
      }).catch(function(e){ console.warn("[HS Bridge] fetch error:", e); });
    } catch(e) {
      console.warn("[HS Bridge] sendLog error:", e);
    }
  }

  window.fetch = function() {
    var args = arguments;
    var url = typeof args[0] === "string" ? args[0] : (args[0] ? args[0].url : "");
    if (!url || !isChatGptApi(url)) return origFetch.apply(this, args);
    var body = args[1] ? args[1].body : null;
    var requestPayload = null;
    if (body && typeof body === "string") { try { requestPayload = JSON.parse(body); } catch(e) { requestPayload = body; } } else if (body) { try { requestPayload = body; } catch(e) {} }
    var match = url.match(/\\/conversation\\/([a-f0-9-]+)/);
    if (match) conversationId = match[1];
    var startTime = performance.now();
    return origFetch.apply(this, args).then(function(response) {
      var duration = Math.round(performance.now() - startTime);
      var cloned = response.clone();
      var contentType = cloned.headers.get("content-type") || "";
      cloned.text().then(function(responseText) {
        sendLog({ method: args[1] ? args[1].method || "POST" : "POST", url: url, requestPayload: requestPayload, responseText: responseText, status: response.status, duration: duration, contentType: contentType });
      }).catch(function() {});
      return response;
    });
  };

  var origOpen = XMLHttpRequest.prototype.open;
  var origSend = XMLHttpRequest.prototype.send;
  var xhrMap = new WeakMap();
  XMLHttpRequest.prototype.open = function(method, url) {
    xhrMap.set(this, { method: method, url: typeof url === "string" ? url : (url ? url.toString() : "") });
    return origOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function(body) {
    var meta = xhrMap.get(this);
    if (meta && meta.url && isChatGptApi(meta.url)) {
      var requestPayload = null;
      if (body && typeof body === "string") { try { requestPayload = JSON.parse(body); } catch(e) { requestPayload = body; } }
      var match = meta.url.match(/\\/conversation\\/([a-f0-9-]+)/);
      if (match) conversationId = match[1];
      var startTime = performance.now();
      this.addEventListener("loadend", function() {
        var duration = Math.round(performance.now() - startTime);
        sendLog({ method: meta.method, url: meta.url, requestPayload: requestPayload, responseText: this.responseText || "", status: this.status, duration: duration, contentType: this.getResponseHeader("content-type") || "" });
      });
    }
    return origSend.apply(this, arguments);
  };
})();
`;

  // Create script element, set nonce if available, inject into page
  try {
    const script = document.createElement("script");
    script.textContent = code;
    if (nonce) script.nonce = nonce;
    document.documentElement.appendChild(script);
    script.remove();
    console.log("[HS Bridge] Injected via script tag" + (nonce ? " with nonce" : " (no nonce)"));
  } catch(e) {
    console.warn("[HS Bridge] DOM injection failed:", e);
    // Fallback: request background to inject via scripting API
    tryFallback();
  }
}

function tryFallback() {
  try {
    console.log("[HS Bridge] Requesting background injection...");
    chrome.runtime.sendMessage({
      type: "inject_hook",
      endpoint: DEFAULT_ENDPOINT,
      sessionId: crypto.randomUUID(),
      newSession: false,
    });
  } catch(e) {
    console.error("[HS Bridge] Background request failed:", e);
  }
}

// Inject immediately at document_start
if (document.readyState === "loading") {
  injectHook();
} else {
  // Already past document_start, try anyway
  injectHook();
}
