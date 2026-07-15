chrome.runtime.onInstalled.addListener(() => {
  console.log("Smart Job Form Filler with Gemini AI Installed");
});

// ---------------------------------------------------------------------------
// Chrome Built-in AI (Gemini Nano) — no API key, no quota, runs on-device
// ---------------------------------------------------------------------------

declare const ai: {
  languageModel: {
    capabilities(): Promise<{ available: "readily" | "after-download" | "no" }>;
    create(options?: { systemPrompt?: string }): Promise<{ prompt(text: string): Promise<string>; destroy(): void }>;
  };
} | undefined;

async function isBuiltinAIAvailable(): Promise<boolean> {
  try {
    if (typeof ai === "undefined" || !ai?.languageModel) return false;
    const caps = await ai.languageModel.capabilities();
    return caps.available === "readily" || caps.available === "after-download";
  } catch {
    return false;
  }
}

async function callBuiltinAI(prompt: string): Promise<string> {
  // ai is guaranteed non-null here — caller checks isBuiltinAIAvailable() first
  const session = await ai!.languageModel.create({
    systemPrompt: "You are a resume parser. Always respond with valid JSON only, no markdown, no explanation.",
  });
  try {
    return await session.prompt(prompt);
  } finally {
    session.destroy();
  }
}

// ---------------------------------------------------------------------------
// Gemini Cloud API — fallback when built-in AI unavailable or no API key given
// ---------------------------------------------------------------------------

// Try one model at a time. Parallel racing burns multiple free-tier requests per click.
const GEMINI_TIER1 = ["gemini-2.0-flash-lite", "gemini-2.0-flash"];
const GEMINI_TIER2 = ["gemini-1.5-flash", "gemini-2.5-flash"];
const GEMINI_MODELS = [...GEMINI_TIER1, ...GEMINI_TIER2];

function summarizeGeminiError(errors: string[]) {
  const joined = errors.join(" | ");

  if (/has not been used in project|it is disabled|SERVICE_DISABLED/i.test(joined)) {
    const enableApiMatch = joined.match(
      /https:\/\/console\.developers\.google\.com\/apis\/api\/generativelanguage\.googleapis\.com\/overview\?project=\d+/
    );
    return `Generative Language API is disabled for this project. Enable it here: ${
      enableApiMatch?.[0] || "https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com"
    }`;
  }

  if (/API key not valid|API_KEY_INVALID|invalid api key/i.test(joined)) {
    return "Invalid API key. Check your key in Google AI Studio — no leading/trailing spaces, no HTTP referrer restrictions.";
  }

  if (/403|PERMISSION_DENIED/i.test(joined)) {
    return "Google rejected this API key (403 Forbidden). Create a fresh key in Google AI Studio and remove any HTTP referrer restrictions.";
  }

  if (/QUOTA_DAILY/i.test(joined)) {
    return "QUOTA_DAILY: Free-tier daily request limit reached. Resets at midnight Pacific Time (1:30 PM IST). Enable billing at console.cloud.google.com/billing to remove the cap.";
  }

  if (/QUOTA_MINUTE|429|RESOURCE_EXHAUSTED|quota/i.test(joined)) {
    return "QUOTA_MINUTE: Free-tier per-minute rate limit hit. Retrying in 60s automatically.";
  }

  return `Gemini API call failed. Tried: ${GEMINI_MODELS.join(", ")}. Details: ${joined}`;
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
  if (typeof input === "string") return [{ text: input }];
  if (!Array.isArray(input)) return [{ text: String(input || "") }];

  return input
    .map((part) => {
      if (part?.type === "text") return { text: part.text || "" };
      if (part?.type === "document" || part?.type === "image" || (part?.data && part?.mime_type)) {
        return { inline_data: { mime_type: part.mime_type || "application/octet-stream", data: part.data } };
      }
      return part;
    })
    .filter(Boolean);
}

async function callGenerateContent(apiKey: string, model: string, input: any) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    referrerPolicy: "no-referrer",
    body: JSON.stringify({ contents: [{ parts: toGenerateContentParts(input) }] }),
  });

  const data = await response.json();
  if (!response.ok) {
    if (response.status === 429 || data.error?.status === "RESOURCE_EXHAUSTED") {
      const details: any[] = data.error?.details || [];
      const violations = details.flatMap((d: any) => d.violations || d.quotaViolations || []);
      const isDaily = violations.some((v: any) =>
        /per_day|per_project_per_day|daily/i.test(v.quotaMetric || v.metric || v.subject || "")
      );
      throw new Error(`${isDaily ? "QUOTA_DAILY" : "QUOTA_MINUTE"}: ${data.error?.message || "Quota exceeded."}`);
    }
    throw new Error(data.error?.message || `HTTP error! status: ${response.status}`);
  }

  const text = extractGenerateContentText(data);
  if (!text) throw new Error("Empty response from model.");
  return text;
}

async function callGeminiCloud(apiKey: string, input: any) {
  const errors: string[] = [];

  for (const model of GEMINI_MODELS) {
    try {
      const text = await callGenerateContent(apiKey, model, input);
      return { text, model };
    } catch (error: any) {
      const message = error?.message || "Request failed.";
      errors.push(`${model}: ${message}`);

      if (/API key not valid|API_KEY_INVALID|invalid api key|403|PERMISSION_DENIED|QUOTA_DAILY/i.test(message)) {
        throw new Error(summarizeGeminiError(errors));
      }

      if (/QUOTA_MINUTE|429|RESOURCE_EXHAUSTED|quota/i.test(message)) {
        throw new Error(summarizeGeminiError(errors));
      }

      console.warn(`Gemini model ${model} failed, trying next model:`, error);
    }
  }

  throw new Error(summarizeGeminiError(errors));
}

// ---------------------------------------------------------------------------
// Message handlers
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {

  // ── Test connection ──────────────────────────────────────────────────────
  if (message.type === "CALL_GEMINI") {
    const { apiKey, promptText } = message.payload;

    (async () => {
      // 1. Try Chrome built-in AI first (no key needed)
      if (await isBuiltinAIAvailable()) {
        try {
          const text = await callBuiltinAI(promptText);
          sendResponse({ success: true, text, model: "chrome-built-in" });
          return;
        } catch (e: any) {
          console.warn("Built-in AI failed, falling back to Gemini API:", e);
        }
      }

      // 2. Fall back to Gemini cloud API
      if (!apiKey) {
        sendResponse({ success: false, error: "No Gemini API key provided and Chrome built-in AI is not available on this device." });
        return;
      }

      callGeminiCloud(apiKey, promptText)
        .then(({ text, model }) => sendResponse({ success: true, text, model }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
    })();

    return true;
  }

  // ── Parse resume ─────────────────────────────────────────────────────────
  if (message.type === "PARSE_RESUME") {
    const { apiKey, base64, mimeType, plainText } = message.payload;

    const RESUME_SCHEMA = `{"personal":{"firstName":"","lastName":"","email":"","phone":"","city":"","country":"","website":"","linkedin":"","github":""},"education":{"school":"","degree":"","major":"","gradMonth":"","gradYear":""},"experience":{"company":"","title":"","startMonth":"","startYear":"","endMonth":"","endYear":"","isCurrent":false,"description":""},"resumeText":""}`;
    const RESUME_PROMPT_SUFFIX = `Extract candidate profile details from this resume. Return exactly one JSON object with no markdown and this schema: ${RESUME_SCHEMA}. Use empty strings for unknown fields. Prefer the most recent education and most recent work experience.`;

    (async () => {
      // 1. Try Chrome built-in AI with plain text (Gemini Nano can't read binary files)
      if (plainText && (await isBuiltinAIAvailable())) {
        try {
          const prompt = `Resume text:\n\n${plainText}\n\n${RESUME_PROMPT_SUFFIX}`;
          const text = await callBuiltinAI(prompt);
          sendResponse({ success: true, text, model: "chrome-built-in" });
          return;
        } catch (e: any) {
          console.warn("Built-in AI resume parse failed, falling back:", e);
        }
      }

      // 2. Fall back to Gemini cloud with binary file (can read PDFs)
      if (!apiKey) {
        sendResponse({ success: false, error: "No Gemini API key provided and Chrome built-in AI is not available. Add a Gemini API key in Settings to parse PDFs." });
        return;
      }

      const rawBase64 = base64.split(",")[1];
      callGeminiCloud(apiKey, [
        { type: "document", data: rawBase64, mime_type: mimeType || "application/octet-stream" },
        { type: "text", text: RESUME_PROMPT_SUFFIX },
      ])
        .then(({ text, model }) => sendResponse({ success: true, text, model }))
        .catch((error) => {
          console.error("Gemini Parse Resume failed:", error);
          sendResponse({ success: false, error: error.message });
        });
    })();

    return true;
  }
});
