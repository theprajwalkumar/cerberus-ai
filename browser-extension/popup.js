const endpointInput = document.getElementById("endpoint");
const saveBtn = document.getElementById("saveBtn");
const testBtn = document.getElementById("testBtn");
const statusText = document.getElementById("statusText");
const dot = document.getElementById("dot");

// Load saved endpoint
chrome.storage.sync.get(["hs_bridge_endpoint"], (result) => {
  if (result.hs_bridge_endpoint) {
    endpointInput.value = result.hs_bridge_endpoint;
  }
});

saveBtn.addEventListener("click", () => {
  const url = endpointInput.value.trim();
  chrome.storage.sync.set({ hs_bridge_endpoint: url }, () => {
    // Notify content script
    chrome.tabs.query({ url: ["https://chatgpt.com/*", "https://chat.openai.com/*"] }, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs.sendMessage(tab.id, { type: "config_updated", endpoint: url });
      });
    });
    statusText.textContent = "Saved!";
    dot.className = "dot";
    setTimeout(() => { statusText.textContent = "Connected to platform"; }, 2000);
  });
});

testBtn.addEventListener("click", async () => {
  const url = endpointInput.value.trim();
  testBtn.textContent = "Testing...";
  testBtn.disabled = true;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "bridge", test: true, timestamp: new Date().toISOString() }),
    });
    if (res.ok) {
      statusText.textContent = "Connection OK ✓";
      dot.className = "dot";
    } else {
      statusText.textContent = `Error ${res.status}`;
      dot.className = "dot off";
    }
  } catch (e) {
    statusText.textContent = "Connection failed";
    dot.className = "dot off";
  }
  testBtn.textContent = "Test Connection";
  testBtn.disabled = false;
  setTimeout(() => { statusText.textContent = "Connected to platform"; dot.className = "dot"; }, 3000);
});
