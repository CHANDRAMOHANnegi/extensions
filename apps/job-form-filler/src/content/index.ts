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

// Help helper to match strings against keywords
function matchesKeywords(identifiers: string[], keywords: string[]): boolean {
  return identifiers.some((id) =>
    keywords.some((kw) => id.toLowerCase().includes(kw.toLowerCase()))
  );
}

// React-compatible element value updater
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

  // Dispatch events to trigger framework reactive updates
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
  element.dispatchEvent(new Event("blur", { bubbles: true }));
}

// Convert Base64 data URL to a File object
async function base64ToFile(base64: string, filename: string, mimeType: string): Promise<File> {
  const res = await fetch(base64);
  const blob = await res.blob();
  return new File([blob], filename, { type: mimeType });
}

// Main Form Filling Engine
async function fillForm(payload: any): Promise<number> {
  const { personal, education, experience, resume } = payload;
  let filledCount = 0;

  // Find all form elements
  const formElements = Array.from(
    document.querySelectorAll("input, select, textarea")
  ) as (HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)[];

  for (const el of formElements) {
    // Collect element identifiers
    const id = el.id || "";
    const name = el.name || "";
    const placeholder = el.getAttribute("placeholder") || "";
    const autocomplete = el.getAttribute("autocomplete") || "";
    const ariaLabel = el.getAttribute("aria-label") || "";

    // Search for labels
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

          // Dispatch change events
          el.dispatchEvent(new Event("change", { bubbles: true }));
          el.dispatchEvent(new Event("input", { bubbles: true }));

          // Add visual highlights
          const highlightTarget = el.parentElement || el;
          highlightTarget.classList.add("autofilled-highlight");
          setTimeout(() => highlightTarget.classList.remove("autofilled-highlight"), 2500);

          filledCount++;
          continue;
        } catch (err) {
          console.error("Failed to upload resume file:", err);
        }
      }
    }

    // Skip hidden elements, buttons, and files (except resume already processed)
    if (
      el.type === "hidden" ||
      el.type === "submit" ||
      el.type === "button" ||
      el.type === "file"
    ) {
      continue;
    }

    let valueToFill = "";

    // --- 2. MATCH CUSTOM Q&A FIELDS ---
    if (personal.customFields && personal.customFields.length > 0) {
      let customMatch = false;
      for (const custom of personal.customFields) {
        if (matchesKeywords(identifiers, [custom.key])) {
          valueToFill = custom.value;
          customMatch = true;
          break;
        }
      }
      if (customMatch && valueToFill) {
        fillValue(el, valueToFill);
        continue;
      }
    }

    // --- 3. MATCH BUILT-IN PROFILE FIELDS ---
    if (matchesKeywords(identifiers, KEYWORDS.firstName)) {
      valueToFill = personal.firstName;
    } else if (matchesKeywords(identifiers, KEYWORDS.lastName)) {
      valueToFill = personal.lastName;
    } else if (matchesKeywords(identifiers, KEYWORDS.fullName)) {
      valueToFill = personal.firstName && personal.lastName
        ? `${personal.firstName} ${personal.lastName}`
        : personal.firstName || personal.lastName;
    } else if (matchesKeywords(identifiers, KEYWORDS.email)) {
      valueToFill = personal.email;
    } else if (matchesKeywords(identifiers, KEYWORDS.phone)) {
      valueToFill = personal.phone;
    } else if (matchesKeywords(identifiers, KEYWORDS.city)) {
      valueToFill = personal.city;
    } else if (matchesKeywords(identifiers, KEYWORDS.country)) {
      valueToFill = personal.country;
    } else if (matchesKeywords(identifiers, KEYWORDS.linkedin)) {
      valueToFill = personal.linkedin;
    } else if (matchesKeywords(identifiers, KEYWORDS.github)) {
      valueToFill = personal.github;
    } else if (matchesKeywords(identifiers, KEYWORDS.website)) {
      valueToFill = personal.website;
    } else if (matchesKeywords(identifiers, KEYWORDS.school)) {
      valueToFill = education.school;
    } else if (matchesKeywords(identifiers, KEYWORDS.degree)) {
      valueToFill = education.degree;
    } else if (matchesKeywords(identifiers, KEYWORDS.major)) {
      valueToFill = education.major;
    } else if (matchesKeywords(identifiers, KEYWORDS.gradYear)) {
      valueToFill = education.gradYear;
    } else if (matchesKeywords(identifiers, KEYWORDS.company)) {
      valueToFill = experience.company;
    } else if (matchesKeywords(identifiers, KEYWORDS.jobTitle)) {
      valueToFill = experience.title;
    }

    // --- 4. WORK AUTHORIZATION & SPONSORSHIP RADIO / CHECKBOX ---
    if (el instanceof HTMLInputElement && (el.type === "radio" || el.type === "checkbox")) {
      const isAuthField = matchesKeywords(identifiers, KEYWORDS.authorizedToWork);
      const isSponsorField = matchesKeywords(identifiers, KEYWORDS.requiresSponsorship);

      if (isAuthField || isSponsorField) {
        const targetDecision = isAuthField ? personal.authorizedToWork : personal.requiresSponsorship; // "yes" or "no"
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
            el.click(); // Trigger native click
            el.checked = true;
            el.dispatchEvent(new Event("change", { bubbles: true }));
            filledCount++;
          }
          continue;
        }
      }
    }

    // Fill textual or select input
    if (valueToFill) {
      fillValue(el, valueToFill);
    }
  }

  function fillValue(element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, value: string) {
    if (element instanceof HTMLSelectElement) {
      // Find matching option in select dropdown
      const options = Array.from(element.options);
      const matchedOption = options.find(
        (opt) =>
          opt.value.toLowerCase() === value.toLowerCase() ||
          opt.text.toLowerCase().includes(value.toLowerCase())
      );

      if (matchedOption) {
        setNativeValue(element, matchedOption.value);
        triggerHighlight(element);
        filledCount++;
      }
    } else {
      // Set text input, email, phone, textarea
      setNativeValue(element, value);
      triggerHighlight(element);
      filledCount++;
    }
  }

  function triggerHighlight(element: HTMLElement) {
    element.classList.add("autofilled-highlight");
    setTimeout(() => element.classList.remove("autofilled-highlight"), 2500);
  }

  return filledCount;
}

// Listen for fill commands from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "FILL_FORM") {
    fillForm(message.payload)
      .then((count) => {
        sendResponse({ success: true, filledCount: count });
      })
      .catch((err) => {
        sendResponse({ success: false, message: err.message });
      });
    return true; // async response
  }
});
console.log("Smart Job Form Filler Content Script loaded");
