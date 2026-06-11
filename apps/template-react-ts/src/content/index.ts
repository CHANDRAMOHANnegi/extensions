console.log("Template React-TS Content Script Loaded");

// Example: Listen for page loads or messaging from background
chrome.runtime.sendMessage({ type: "GET_EXTENSION_INFO" }, (response) => {
  console.log("Response from background in content script:", response);
});
