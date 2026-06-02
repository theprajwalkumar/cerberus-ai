// HostedScan LLM Bridge — Main-world page hook
// Runs inside the page's JavaScript context to intercept real fetch/XHR calls.

function isChatGptApi(url) {
  const u = (url || "").toLowerCase();
  return (
    u.includes("chatgpt.com/backend-api") ||
    u.includes("chat.openai.com/backend-api") ||
    u.includes("chatgpt.com/api/") ||
    u.includes("chat.openai.com/api/")
  );
}

(function () {
  "use strict";
  if (window.__hsBridgeInstalled) return;
  window.__hsBridgeInstalled = true;

  let conversationId = null;

  // ---- Capture fetch() ----
  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    const url = typeof args[0] === "string" ? args[0] : args[0]?.url;
    if (!url || !isChatGptApi(url)) return origFetch.apply(this, args);

    const body = args[1]?.body;
    let requestPayload = null;
    if (body && typeof body === "string") {
      try { requestPayload = JSON.parse(body); } catch (e) { requestPayload = body; }
    } else if (body) {
      try { requestPayload = body; } catch (e) {}
    }

    const match = url.match(/\/conversation\/([a-f0-9-]+)/);
    if (match) conversationId = match[1];

    const startTime = performance.now();
    const response = await origFetch.apply(this, args);
    const duration = Math.round(performance.now() - startTime);

    const cloned = response.clone();
    const contentType = cloned.headers.get("content-type") || "";
    let responseText = "";

    if (contentType.includes("text/event-stream")) {
      const reader = cloned.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
      }
      responseText = fullText;
    } else {
      responseText = await cloned.text();
    }

    try {
      window.postMessage({
        type: "HS_BRIDGE_CAPTURE",
        payload: {
          conversationId,
          method: args[1]?.method || "POST",
          url,
          requestPayload,
          responseText,
          status: response.status,
          duration,
          contentType,
        },
      }, "*");
    } catch (e) {
      console.warn("[HS Bridge] postMessage error:", e);
    }

    return response;
  };

  // ---- Capture XMLHttpRequest ----
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  const xhrMap = new WeakMap();

  XMLHttpRequest.prototype.open = function (method, url) {
    xhrMap.set(this, { method, url: typeof url === "string" ? url : url?.toString() || "" });
    return origOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (body) {
    const meta = xhrMap.get(this);
    if (meta && meta.url && isChatGptApi(meta.url)) {
      let requestPayload = null;
      if (body && typeof body === "string") {
        try { requestPayload = JSON.parse(body); } catch (e) { requestPayload = body; }
      }

      const match = meta.url.match(/\/conversation\/([a-f0-9-]+)/);
      if (match) conversationId = match[1];

      const startTime = performance.now();
      this.addEventListener("loadend", () => {
        const duration = Math.round(performance.now() - startTime);
        try {
          window.postMessage({
            type: "HS_BRIDGE_CAPTURE",
            payload: {
              conversationId,
              method: meta.method,
              url: meta.url,
              requestPayload,
              responseText: this.responseText || "",
              status: this.status,
              duration,
              contentType: this.getResponseHeader("content-type") || "",
            },
          }, "*");
        } catch (e) {
          console.warn("[HS Bridge] postMessage error:", e);
        }
      });
    }
    return origSend.apply(this, arguments);
  };
})();
