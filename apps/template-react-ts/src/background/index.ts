chrome.runtime.onInstalled.addListener(() => {
  console.log("Template React-TS Extension Installed");
  
  // Initialize storage values if not present
  chrome.storage.local.get(["clickCount"], (result) => {
    if (result.clickCount === undefined) {
      chrome.storage.local.set({ clickCount: 0 });
    }
  });
});

// Listener for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received message:", message, "from:", sender);
  
  if (message.type === "GET_EXTENSION_INFO") {
    sendResponse({ version: "1.0.0", environment: "development" });
  }
  return true; // Keep message channel open for async response
});
