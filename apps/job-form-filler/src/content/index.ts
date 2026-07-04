// Heuristics mapping keywords
const KEYWORDS = {
  firstName: ["first name", "firstname", "first_name", "given name", "fname"],
  lastName: ["last name", "lastname", "last_name", "family name", "lname", "surname"],
  fullName: ["full name", "fullname", "full_name", "your name", "candidate name"],
  email: ["email", "e-mail", "mail address", "email_address"],
  phone: ["phone", "mobile", "telephone", "tel", "contact number"],
  city: ["city", "town", "location", "residence"],
  country: ["country", "nation", "territory"],
  linkedin: ["linkedin", "linked-in"],
  github: ["github", "git-hub"],
  website: ["website", "portfolio", "personal link", "homepage", "blog"],
  school: ["school", "university", "college", "education", "institution"],
  degree: ["degree", "qualification"],
  major: ["major", "field of study", "specialization", "discipline"],
  gradYear: ["grad year", "graduation year", "completion date", "grad date"],
  company: ["company", "organization", "employer", "most recent employer", "previous employer"],
  jobTitle: ["job title", "title", "role", "position"],
  authorizedToWork: ["authorized to work", "legally authorized", "right to work", "eligible to work"],
  requiresSponsorship: ["sponsor", "visa", "sponsorship"],
};

// Heuristics to identify complex / AI questions
const AI_KEYWORDS = ["?", "why", "describe", "explain", "reason", "tell us", "experience with", "interest in", "cover letter", "statement", "additional details"];

function matchesKeywords(identifiers: string[], keywords: string[]): boolean {
  return identifiers.some((id) =>
    keywords.some((kw) => id.toLowerCase().includes(kw.toLowerCase()))
  );
}

// React-compatible value injector
function setNativeValue(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string
) {
  const valueSetter = Object.getOwnPropertyDescriptor(element, "value")?.set;
  const prototype = Object.getPrototypeOf(element);
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

  if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(element, value);
  } else if (valueSetter) {
    valueSetter.call(element, value);
  } else {
    element.value = value;
  }

  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
  element.dispatchEvent(new Event("blur", { bubbles: true }));
}

// React-compatible checked injector for checkboxes and radio buttons
function setNativeChecked(element: HTMLInputElement, checked: boolean) {
  const checkedSetter = Object.getOwnPropertyDescriptor(element, "checked")?.set;
  const prototype = Object.getPrototypeOf(element);
  const prototypeCheckedSetter = Object.getOwnPropertyDescriptor(prototype, "checked")?.set;

  if (prototypeCheckedSetter && checkedSetter !== prototypeCheckedSetter) {
    prototypeCheckedSetter.call(element, checked);
  } else if (checkedSetter) {
    checkedSetter.call(element, checked);
  } else {
    element.checked = checked;
  }

  element.dispatchEvent(new Event("click", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

async function base64ToFile(base64: string, filename: string, mimeType: string): Promise<File> {
  const res = await fetch(base64);
  const blob = await res.blob();
  return new File([blob], filename, { type: mimeType });
}

function triggerHighlight(element: HTMLElement) {
  element.classList.add("autofilled-highlight");
  setTimeout(() => element.classList.remove("autofilled-highlight"), 2500);
}

// Scrapes job/company details from DOM
function scrapePageDetails() {
  let company = "";
  let role = "";

  // Greenhouse selectors
  const ghRole = document.querySelector(".app-title")?.textContent;
  const ghCompany = document.querySelector(".company-name")?.textContent || document.querySelector("#logo img")?.getAttribute("alt");
  
  // Lever selectors
  const levRole = document.querySelector(".posting-header h2")?.textContent;
  const levCompany = document.querySelector(".posting-header .categories-list")?.textContent; // usually department, fallback to document title

  role = ghRole || levRole || document.title || "Target Position";
  company = ghCompany?.trim() || levCompany?.split("•")[0]?.trim() || "Target Company";

  return { company, role };
}

// Main Form Filling Pipeline
async function fillForm(payload: any): Promise<{ filledCount: number; aiCount: number }> {
  const { personal, education, experience, resume, geminiApiKey, resumeText } = payload;
  let filledCount = 0;
  let aiCount = 0;

  // Track elements that are candidate for AI answering
  const aiFields: { el: HTMLInputElement | HTMLTextAreaElement; label: string; index: number }[] = [];

  const formElements = Array.from(
    document.querySelectorAll("input, select, textarea")
  ) as (HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)[];

  for (const el of formElements) {
    const id = el.id || "";
    const name = el.name || "";
    const placeholder = el.getAttribute("placeholder") || "";
    const autocomplete = el.getAttribute("autocomplete") || "";
    const ariaLabel = el.getAttribute("aria-label") || "";

    // Parse labels
    let labelText = "";
    const parentLabel = el.closest("label");
    if (parentLabel) {
      labelText += " " + parentLabel.textContent;
    }
    if (id) {
      const labels = document.querySelectorAll(`label[for="${id}"]`);
      labels.forEach((l) => {
        labelText += " " + l.textContent;
      });
    }
    const ariaLabelledBy = el.getAttribute("aria-labelledby");
    if (ariaLabelledBy) {
      const labelEl = document.getElementById(ariaLabelledBy);
      if (labelEl) {
        labelText += " " + labelEl.textContent;
      }
    }

    const identifiers = [id, name, placeholder, autocomplete, ariaLabel, labelText];

    // --- 1. HANDLE FILE UPLOAD (RESUME) ---
    if (el instanceof HTMLInputElement && el.type === "file" && resume && resume.base64) {
      const isResumeInput = matchesKeywords(identifiers, ["resume", "cv", "curriculum", "file", "upload"]);
      if (isResumeInput) {
        try {
          const file = await base64ToFile(resume.base64, resume.name, resume.type);
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          el.files = dataTransfer.files;

          el.dispatchEvent(new Event("change", { bubbles: true }));
          el.dispatchEvent(new Event("input", { bubbles: true }));

          const highlightTarget = el.parentElement || el;
          triggerHighlight(highlightTarget);

          filledCount++;
          continue;
        } catch (err) {
          console.error("Failed to upload resume file:", err);
        }
      }
    }

    if (
      el.type === "hidden" ||
      el.type === "submit" ||
      el.type === "button" ||
      el.type === "file"
    ) {
      continue;
    }

    let valueToFill = "";
    let matchedStandard = false;

    // --- 2. MATCH CUSTOM Q&A FIELDS (First Priority) ---
    if (personal.customFields && personal.customFields.length > 0) {
      for (const custom of personal.customFields) {
        if (matchesKeywords(identifiers, [custom.key])) {
          valueToFill = custom.value;
          matchedStandard = true;
          break;
        }
      }
    }

    // --- 3. MATCH BUILT-IN PROFILE FIELDS ---
    if (!matchedStandard) {
      if (matchesKeywords(identifiers, KEYWORDS.firstName)) {
        valueToFill = personal.firstName;
        matchedStandard = true;
      } else if (matchesKeywords(identifiers, KEYWORDS.lastName)) {
        valueToFill = personal.lastName;
        matchedStandard = true;
      } else if (matchesKeywords(identifiers, KEYWORDS.fullName)) {
        valueToFill = personal.firstName && personal.lastName
          ? `${personal.firstName} ${personal.lastName}`
          : personal.firstName || personal.lastName;
        matchedStandard = true;
      } else if (matchesKeywords(identifiers, KEYWORDS.email)) {
        valueToFill = personal.email;
        matchedStandard = true;
      } else if (matchesKeywords(identifiers, KEYWORDS.phone)) {
        valueToFill = personal.phone;
        matchedStandard = true;
      } else if (matchesKeywords(identifiers, KEYWORDS.city)) {
        valueToFill = personal.city;
        matchedStandard = true;
      } else if (matchesKeywords(identifiers, KEYWORDS.country)) {
        valueToFill = personal.country;
        matchedStandard = true;
      } else if (matchesKeywords(identifiers, KEYWORDS.linkedin)) {
        valueToFill = personal.linkedin;
        matchedStandard = true;
      } else if (matchesKeywords(identifiers, KEYWORDS.github)) {
        valueToFill = personal.github;
        matchedStandard = true;
      } else if (matchesKeywords(identifiers, KEYWORDS.website)) {
        valueToFill = personal.website;
        matchedStandard = true;
      } else if (matchesKeywords(identifiers, KEYWORDS.school)) {
        valueToFill = education.school;
        matchedStandard = true;
      } else if (matchesKeywords(identifiers, KEYWORDS.degree)) {
        valueToFill = education.degree;
        matchedStandard = true;
      } else if (matchesKeywords(identifiers, KEYWORDS.major)) {
        valueToFill = education.major;
        matchedStandard = true;
      } else if (matchesKeywords(identifiers, KEYWORDS.gradYear)) {
        valueToFill = education.gradYear;
        matchedStandard = true;
      } else if (matchesKeywords(identifiers, KEYWORDS.company)) {
        valueToFill = experience.company;
        matchedStandard = true;
      } else if (matchesKeywords(identifiers, KEYWORDS.jobTitle)) {
        valueToFill = experience.title;
        matchedStandard = true;
      }
    }

    // --- 4. WORK AUTHORIZATION & SPONSORSHIP ---
    if (el instanceof HTMLInputElement && (el.type === "radio" || el.type === "checkbox")) {
      const isAuthField = matchesKeywords(identifiers, KEYWORDS.authorizedToWork);
      const isSponsorField = matchesKeywords(identifiers, KEYWORDS.requiresSponsorship);

      if (isAuthField || isSponsorField) {
        const targetDecision = isAuthField ? personal.authorizedToWork : personal.requiresSponsorship;
        const labelLower = labelText.toLowerCase();
        const valueLower = el.value.toLowerCase();
        const idLower = el.id.toLowerCase();

        const representsYes =
          labelLower.includes("yes") ||
          valueLower === "yes" ||
          valueLower === "y" ||
          valueLower === "1" ||
          valueLower === "true" ||
          idLower.includes("yes");

        const representsNo =
          labelLower.includes("no") ||
          valueLower === "no" ||
          valueLower === "n" ||
          valueLower === "0" ||
          valueLower === "false" ||
          idLower.includes("no");

        if ((targetDecision === "yes" && representsYes) || (targetDecision === "no" && representsNo)) {
          if (!el.checked) {
            el.click();
            el.checked = true;
            el.dispatchEvent(new Event("change", { bubbles: true }));
            filledCount++;
          }
          continue;
        }
      }
    }

    // Fill standard matches immediately
    if (matchedStandard && valueToFill) {
      if (el instanceof HTMLSelectElement) {
        const options = Array.from(el.options);
        const matchedOption = options.find(
          (opt) =>
            opt.value.toLowerCase() === valueToFill.toLowerCase() ||
            opt.text.toLowerCase().includes(valueToFill.toLowerCase())
        );
        if (matchedOption) {
          setNativeValue(el, matchedOption.value);
          triggerHighlight(el);
          filledCount++;
        }
      } else if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
        const normalizedValue = valueToFill.toLowerCase().trim();
        if (el.type === "checkbox") {
          const shouldCheck = !["no", "false", "0", "none"].includes(normalizedValue);
          if (el.checked !== shouldCheck) {
            setNativeChecked(el, shouldCheck);
            triggerHighlight(el);
            filledCount++;
          }
        } else {
          const radioValue = el.value.toLowerCase().trim();
          const isYesRadio = radioValue === "yes" || radioValue === "true" || radioValue === "1";
          const isNoRadio = radioValue === "no" || radioValue === "false" || radioValue === "0";

          let shouldSelect = false;
          if (isYesRadio || isNoRadio) {
            const isPositiveValue = !["no", "false", "0", "none"].includes(normalizedValue);
            shouldSelect = isYesRadio ? isPositiveValue : !isPositiveValue;
          } else {
            shouldSelect = normalizedValue.includes(radioValue) || radioValue.includes(normalizedValue);
          }

          if (shouldSelect && !el.checked) {
            setNativeChecked(el, true);
            triggerHighlight(el);
            filledCount++;
          }
        }
      } else {
        setNativeValue(el, valueToFill);
        triggerHighlight(el);
        filledCount++;
      }
      continue;
    }

    // --- 5. FLAG AS CANDIDATE FOR AI FILLING ---
    if (!matchedStandard && geminiApiKey && (el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && el.type === "text"))) {
      const labelRepresentation = labelText.trim() || placeholder.trim() || name.trim() || id.trim();
      const isComplex = el instanceof HTMLTextAreaElement || matchesKeywords(identifiers, AI_KEYWORDS);
      if (isComplex && labelRepresentation.length > 3) {
        aiFields.push({
          el,
          label: labelRepresentation,
          index: aiFields.length,
        });
      }
    }
  }

  // --- 6. TRIGGER GEMINI AI FOR COMPLEX QUESTIONS ---
  if (aiFields.length > 0 && geminiApiKey) {
    const { company, role } = scrapePageDetails();
    const promptText = buildGeminiPrompt(personal, education, experience, resumeText, company, role, aiFields);

    try {
      console.log(`Smart Job Filler: Querying Gemini for ${aiFields.length} questions...`);
      const response = await new Promise<any>((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            type: "CALL_GEMINI",
            payload: { apiKey: geminiApiKey, promptText },
          },
          (res) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(res);
            }
          }
        );
      });

      if (response && response.success) {
        // Strip markdown backticks if returned in response
        let cleanedJson = response.text.trim();
        if (cleanedJson.startsWith("```")) {
          cleanedJson = cleanedJson.replace(/^```json\s*|```$/gi, "").trim();
        }

        const data = JSON.parse(cleanedJson);
        if (data && Array.isArray(data.answers)) {
          for (const item of data.answers) {
            const match = aiFields.find((f) => f.index === item.index);
            if (match && item.text) {
              setNativeValue(match.el, item.text);
              triggerHighlight(match.el);
              aiCount++;
              filledCount++;
            }
          }
        }
      } else {
        console.error("Gemini failed to answer questions:", response?.error);
      }
    } catch (err) {
      console.error("AI form filling request failed:", err);
    }
  }

  return { filledCount, aiCount };
}

// Builds unified prompt structure
function buildGeminiPrompt(
  personal: any,
  education: any,
  experience: any,
  resumeText: string,
  company: string,
  role: string,
  questions: any[]
): string {
  return `You are an AI assistant helping a candidate fill out a job application.
Candidate Profile:
Name: ${personal.firstName} ${personal.lastName}
Email: ${personal.email}
Phone: ${personal.phone}
City: ${personal.city}, ${personal.country}
LinkedIn: ${personal.linkedin}
GitHub: ${personal.github}
Portfolio/Website: ${personal.website}
Work Auth: Authorized to work: ${personal.authorizedToWork}, Requires sponsorship: ${personal.requiresSponsorship}

Education:
School: ${education.school}
Degree: ${education.degree} in ${education.major}
Graduation Year: ${education.gradYear}

Professional Experience:
Company: ${experience.company}
Title: ${experience.title}
Dates: ${experience.startYear} - ${experience.isCurrent ? "Present" : experience.endYear}
Description: ${experience.description}

Resume/Bio context:
${resumeText || "No detailed resume text provided."}

Company Name: ${company}
Job Title: ${role}

The job application form contains the following complex questions. 
For each question, draft a concise, professional, and tailored response (under 120 words) based on the candidate's profile and resume. Ensure the tone is proactive, honest, and matching standard engineering standards.
Return the result strictly as a valid JSON object matching the schema below. Do not wrap in markdown or add notes outside the JSON structure.

JSON Response Schema:
{
  "answers": [
    {
      "index": 0,
      "text": "Drafted answer text for question 0..."
    }
  ]
}

Questions to answer:
${questions.map((q) => `[Question ${q.index}]: "${q.label}"`).join("\n")}
`;
}

// Listen for fill commands from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "FILL_FORM") {
    fillForm(message.payload)
      .then((counts) => {
        sendResponse({ success: true, ...counts });
      })
      .catch((err) => {
        sendResponse({ success: false, message: err.message });
      });
    return true; // async
  }
});
console.log("Smart AI Job Form Filler Content Script loaded");
