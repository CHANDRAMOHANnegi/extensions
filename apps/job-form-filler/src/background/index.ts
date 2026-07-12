chrome.runtime.onInstalled.addListener(() => {
  console.log("Smart Job Form Filler with Gemini AI Installed");
});

// Tier 1: highest free RPM — raced together first (30 + 15 RPM)
const GEMINI_TIER1 = ["gemini-2.0-flash-lite", "gemini-2.0-flash"];
// Tier 2: fallback models — only tried if tier 1 is fully rate-limited (15 + 10 RPM)
const GEMINI_TIER2 = ["gemini-1.5-flash", "gemini-2.5-flash"];
// All models (for error messages)
const GEMINI_MODELS = [...GEMINI_TIER1, ...GEMINI_TIER2];

function summarizeGeminiError(errors: string[]) {
  const joined = errors.join(" | ");

  // API not enabled for this project
  if (/has not been used in project|it is disabled|SERVICE_DISABLED/i.test(joined)) {
    const enableApiMatch = joined.match(
      /https:\/\/console\.developers\.google\.com\/apis\/api\/generativelanguage\.googleapis\.com\/overview\?project=\d+/
    );
    return `Generative Language API is disabled for this API key's Google Cloud project. Enable it here, wait a few minutes, then test again: ${
      enableApiMatch?.[0] || "https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com"
    }`;
  }

  // Invalid API key
  if (/API key not valid|API_KEY_INVALID|invalid api key/i.test(joined)) {
    return "Invalid API key. Please check your key in Google AI Studio (aistudio.google.com) — make sure it is copied correctly, has no leading/trailing spaces, and has no HTTP referrer restrictions set.";
  }

  // Permission denied / key restrictions
  if (/403|PERMISSION_DENIED/i.test(joined)) {
    return "Google rejected this API key (403 Forbidden). Create a fresh Gemini API key in Google AI Studio, ensure the Generative Language API is enabled for that project, and remove any HTTP referrer restrictions.";
  }

  // Quota exceeded
  if (/429|RESOURCE_EXHAUSTED|quota/i.test(joined)) {
    return "Gemini API free-tier rate limit hit. Wait 60 seconds and try again. To avoid this, enable billing at console.cloud.google.com/billing (usage stays free under the free quota, billing just lifts the rate cap).";
  }

  return `Gemini API call failed. Tried models: ${GEMINI_MODELS.join(", ")}. Details: ${joined}`;
}

function extractGenerateContentText(data: any): string {
  return (
    data.candidates?.[0]?.content?.parts
      ?.map((part: any) => part.text || "")
      .filter(Boolean)
      .join("\n")
      .trim() || ""
  );
}

function toGenerateContentParts(input: any) {
  if (typeof input === "string") {
    return [{ text: input }];
  }

  if (!Array.isArray(input)) {
    return [{ text: String(input || "") }];
  }

  return input
    .map((part) => {
      if (part?.type === "text") {
        return { text: part.text || "" };
      }

      // Handle document/image/binary parts — map to Gemini's inline_data format
      if (part?.type === "document" || part?.type === "image" || (part?.data && part?.mime_type)) {
        return {
          inline_data: {
            mime_type: part.mime_type || "application/octet-stream",
            data: part.data,
          },
        };
      }

      return part;
    })
    .filter(Boolean);
}

async function callGenerateContent(apiKey: string, model: string, input: any, options?: { json?: boolean }) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    // Suppress the Referer header so HTTP referrer restrictions on the API key
    // don't block requests coming from the chrome-extension:// origin.
    referrerPolicy: "no-referrer",
    body: JSON.stringify({
      contents: [
        {
          parts: toGenerateContentParts(input),
        },
      ],
      ...(options?.json
        ? {
            generationConfig: {
              response_mime_type: "application/json",
            },
          }
        : {}),
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || `HTTP error! status: ${response.status}`);
  }

  const text = extractGenerateContentText(data);
  if (!text) {
    throw new Error("Empty response from model.");
  }

  return text;
}


async function raceModels(apiKey: string, models: string[], input: any): Promise<{ text: string; model: string } | null> {
  const promises = models.map((model) =>
    callGenerateContent(apiKey, model, input).then(
      (text) => ({ text, model }),
      (error: any) => {
        const message: string = error?.message || "Request failed.";
        if (/API key not valid|API_KEY_INVALID|invalid api key|403|PERMISSION_DENIED/i.test(message)) {
          throw error; // Auth errors propagate immediately
        }
        return Promise.reject(new Error(`${model}: ${message}`));
      }
    )
  );

  try {
    return await Promise.any(promises);
  } catch {
    return null; // All models in this tier failed (likely quota)
  }
}

async function callGemini(apiKey: string, input: any) {
  // Race tier-1 models first (highest free quota: flash-lite + 2.0-flash)
  // Only if both are rate-limited do we burn tier-2 quota.
  try {
    const result = await raceModels(apiKey, GEMINI_TIER1, input);
    if (result) return result;

    // Tier 1 exhausted — try tier 2
    const result2 = await raceModels(apiKey, GEMINI_TIER2, input);
    if (result2) return result2;
  } catch (authError: any) {
    // Auth error — no point trying more models
    throw new Error(summarizeGeminiError([authError?.message || "Auth error"]));
  }

  // All tiers failed
  throw new Error(summarizeGeminiError(["All models quota-limited. Wait ~60s and retry."]));
}

// Relays Gemini API requests to bypass Page Content Security Policy (CSP)
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "CALL_GEMINI") {
    const { apiKey, promptText } = message.payload;

    if (!apiKey) {
      sendResponse({ success: false, error: "API Key is missing." });
      return true;
    }

    callGemini(apiKey, promptText)
      .then(({ text, model }) => {
        sendResponse({ success: true, text, model });
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

    const rawBase64 = base64.split(",")[1];

    callGemini(apiKey, [
      {
        type: "document",
        data: rawBase64,
        mime_type: mimeType || "application/octet-stream",
      },
      {
        type: "text",
        text: "Extract candidate profile details from this resume. Return exactly one JSON object with no markdown and this schema: { \"personal\": { \"firstName\": \"\", \"lastName\": \"\", \"email\": \"\", \"phone\": \"\", \"city\": \"\", \"country\": \"\", \"website\": \"\", \"linkedin\": \"\", \"github\": \"\" }, \"education\": { \"school\": \"\", \"degree\": \"\", \"major\": \"\", \"gradMonth\": \"\", \"gradYear\": \"\" }, \"experience\": { \"company\": \"\", \"title\": \"\", \"startMonth\": \"\", \"startYear\": \"\", \"endMonth\": \"\", \"endYear\": \"\", \"isCurrent\": false, \"description\": \"\" }, \"resumeText\": \"\" }. Use empty strings for unknown fields. Prefer the most recent education and most recent work experience.",
      },
    ])
      .then(({ text, model }) => {
        sendResponse({ success: true, text, model });
      })
      .catch((error) => {
        console.error("Gemini Parse Resume failed:", error);
        sendResponse({ success: false, error: error.message });
      });

    return true; // Keep message channel open for async response
  }
});
