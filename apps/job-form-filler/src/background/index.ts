chrome.runtime.onInstalled.addListener(() => {
  console.log("Smart Job Form Filler with Gemini AI Installed");
});

// Relays Gemini API requests to bypass Page Content Security Policy (CSP)
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "CALL_GEMINI") {
    const { apiKey, promptText } = message.payload;

    if (!apiKey) {
      sendResponse({ success: false, error: "API Key is missing." });
      return true;
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

    fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: promptText,
              },
            ],
          },
        ],
      }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error?.message || `HTTP error! status: ${response.status}`);
        }
        
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          throw new Error("Invalid or empty response structure from Gemini API.");
        }

        sendResponse({ success: true, text });
      })
      .catch((error) => {
        console.error("Gemini API call failed:", error);
        sendResponse({ success: false, error: error.message });
      });

    return true; // Keep message channel open for async response
  }
});
