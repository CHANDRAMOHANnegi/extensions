chrome.runtime.onInstalled.addListener(() => {
  console.log("Smart Job Form Filler with Gemini AI Installed");
});

const GEMINI_MODEL = "gemini-1.5-flash";

// Relays Gemini API requests to bypass Page Content Security Policy (CSP)
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "CALL_GEMINI") {
    const { apiKey, promptText } = message.payload;

    if (!apiKey) {
      sendResponse({ success: false, error: "API Key is missing." });
      return true;
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

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

  if (message.type === "PARSE_RESUME") {
    const { apiKey, base64, mimeType } = message.payload;

    if (!apiKey) {
      sendResponse({ success: false, error: "API Key is missing." });
      return true;
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
    const rawBase64 = base64.split(",")[1];

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
                inlineData: {
                  mimeType: mimeType || "application/octet-stream",
                  data: rawBase64,
                },
              },
              {
                text: "Extract candidate profile details from this resume. Return ONLY one valid JSON object with this exact shape: { \"personal\": { \"firstName\": \"\", \"lastName\": \"\", \"email\": \"\", \"phone\": \"\", \"city\": \"\", \"country\": \"\", \"website\": \"\", \"linkedin\": \"\", \"github\": \"\" }, \"education\": { \"school\": \"\", \"degree\": \"\", \"major\": \"\", \"gradMonth\": \"\", \"gradYear\": \"\" }, \"experience\": { \"company\": \"\", \"title\": \"\", \"startMonth\": \"\", \"startYear\": \"\", \"endMonth\": \"\", \"endYear\": \"\", \"isCurrent\": false, \"description\": \"\" }, \"resumeText\": \"\" }. Use empty strings for unknown fields. Keep resumeText as concise plain text containing skills, education, and work history. Do not wrap in markdown fences or add commentary.",
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
          throw new Error("Invalid or empty response from Gemini API.");
        }

        sendResponse({ success: true, text });
      })
      .catch((error) => {
        console.error("Gemini Parse Resume failed:", error);
        sendResponse({ success: false, error: error.message });
      });

    return true; // Keep message channel open for async response
  }
});
