chrome.runtime.onInstalled.addListener(() => {
  console.log("Smart Job Form Filler Extension Installed");
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "PING") {
    sendResponse({ pong: true });
  }
  return true;
});

