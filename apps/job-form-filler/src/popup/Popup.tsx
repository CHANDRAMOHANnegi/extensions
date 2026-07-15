import { useState, useEffect, useCallback } from "react";

interface CustomField {
  key: string;
  value: string;
}

interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  website: string;
  linkedin: string;
  github: string;
  authorizedToWork: string;
  requiresSponsorship: string;
  notice: string;
  salary: string;
  coverLetter: string;
  customFields: CustomField[];
}

interface EducationInfo {
  school: string;
  degree: string;
  major: string;
  gradMonth: string;
  gradYear: string;
}

interface ExperienceInfo {
  company: string;
  title: string;
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  isCurrent: boolean;
  description: string;
}

interface ResumeInfo {
  base64: string;
  name: string;
  size: number;
  type: string;
}

interface ParseSummary {
  source: string;
  savedAt: string;
  personalCount: number;
  educationCount: number;
  workCount: number;
  resumeTextLength: number;
}

interface ParsedResumeData {
  personal?: Partial<PersonalInfo> & {
    fullName?: string;
    name?: string;
  };
  education?: Partial<EducationInfo> & {
    graduationYear?: string;
    graduationDate?: string;
    fieldOfStudy?: string;
  };
  experience?: Partial<ExperienceInfo> & {
    jobTitle?: string;
    currentTitle?: string;
    currentCompany?: string;
  };
  resumeText?: string;
}

type ResumeJson = Record<string, any>;

const initialPersonal: PersonalInfo = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  city: "",
  country: "",
  website: "",
  linkedin: "",
  github: "",
  authorizedToWork: "yes",
  requiresSponsorship: "no",
  notice: "",
  salary: "",
  coverLetter: "",
  customFields: [],
};

const initialEducation: EducationInfo = {
  school: "",
  degree: "",
  major: "",
  gradMonth: "",
  gradYear: "",
};

const initialExperience: ExperienceInfo = {
  company: "",
  title: "",
  startMonth: "",
  startYear: "",
  endMonth: "",
  endYear: "",
  isCurrent: false,
  description: "",
};

const cleanJsonResponse = (value: string) => {
  let cleaned = value.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  }

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  return cleaned;
};

const stringValue = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const firstObject = (value: unknown): ResumeJson => {
  if (Array.isArray(value)) {
    return firstObject(value[0]);
  }

  return value && typeof value === "object" ? (value as ResumeJson) : {};
};

const hasKeys = (value: ResumeJson) => Object.keys(value).length > 0;

const firstNonEmptyObject = (...values: unknown[]): ResumeJson => {
  for (const value of values) {
    const object = firstObject(value);
    if (hasKeys(object)) {
      return object;
    }
  }

  return {};
};

const firstString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
};

const firstBoolean = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["present", "current", "true", "yes"].includes(normalized)) return true;
      if (["false", "no"].includes(normalized)) return false;
    }
  }

  return undefined;
};

const extractYear = (...values: unknown[]) => {
  const value = firstString(...values);
  return value.match(/\b(19\d{2}|20\d{2})\b/)?.[1] || value;
};

const compactPatch = <T extends Record<string, any>>(value: Partial<T> | undefined): Partial<T> => {
  if (!value) return {};

  return Object.entries(value).reduce<Partial<T>>((result, [key, rawValue]) => {
    if (typeof rawValue === "boolean") {
      result[key as keyof T] = rawValue as T[keyof T];
    } else if (typeof rawValue === "string" && rawValue.trim()) {
      result[key as keyof T] = rawValue.trim() as T[keyof T];
    }
    return result;
  }, {});
};

const splitFullName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { firstName: parts[0] };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
};

const normalizeParsedResumeData = (parsed: unknown): ParsedResumeData => {
  const root = firstObject(parsed);
  const candidate = firstNonEmptyObject(
    root.candidate,
    root.candidateProfile,
    root.candidate_profile,
    root.profile,
    root.data,
    root.result,
    root
  );
  const personalSource = firstNonEmptyObject(
    candidate.personal,
    candidate.personalInfo,
    candidate.personal_info,
    candidate.personalDetails,
    candidate.personal_details,
    candidate.contact,
    candidate.contactInfo,
    candidate.contact_info,
    candidate.contactInformation,
    candidate.contact_information,
    candidate.basics,
    root.personal,
    root.personalInfo,
    root.personal_info,
    root.personalDetails,
    root.personal_details,
    root.contact,
    root.contactInfo,
    root.contact_info,
    root.contactInformation,
    root.contact_information,
    root.basics,
    candidate
  );
  const educationSource = firstNonEmptyObject(
    candidate.education,
    candidate.educationInfo,
    candidate.education_info,
    candidate.educations,
    candidate.educationalBackground,
    candidate.educational_background,
    candidate.academicBackground,
    candidate.academic_background,
    root.education,
    root.educationInfo,
    root.education_info,
    root.educations,
    root.educationalBackground,
    root.educational_background,
    root.academicBackground,
    root.academic_background
  );
  const experienceSource = firstNonEmptyObject(
    candidate.experience,
    candidate.workExperience,
    candidate.work_experience,
    candidate.professionalExperience,
    candidate.professional_experience,
    candidate.work,
    candidate.employment,
    candidate.employmentHistory,
    candidate.employment_history,
    candidate.experiences,
    root.experience,
    root.workExperience,
    root.work_experience,
    root.professionalExperience,
    root.professional_experience,
    root.work,
    root.employment,
    root.employmentHistory,
    root.employment_history,
    root.experiences
  );

  const fullName = firstString(
    personalSource.fullName,
    personalSource.full_name,
    personalSource.name,
    personalSource.candidateName,
    personalSource.candidate_name,
    candidate.fullName,
    candidate.full_name,
    candidate.name
  );
  const nameParts = splitFullName(fullName);
  const links = Array.isArray(personalSource.links) ? personalSource.links : [];
  const linkedinLink = links.find((link) => typeof link === "string" && /linkedin\.com/i.test(link));
  const githubLink = links.find((link) => typeof link === "string" && /github\.com/i.test(link));
  const location = firstString(personalSource.location, personalSource.address, candidate.location);
  const [locationCity = "", locationCountry = ""] =
    typeof location === "string" ? location.split(",").map((part) => part.trim()) : [];

  return {
    personal: {
      firstName: firstString(personalSource.firstName, personalSource.first_name, personalSource.givenName, personalSource.given_name, nameParts.firstName),
      lastName: firstString(personalSource.lastName, personalSource.last_name, personalSource.familyName, personalSource.family_name, personalSource.surname, nameParts.lastName),
      email: firstString(personalSource.email, personalSource.emailAddress, personalSource.email_address, candidate.email),
      phone: firstString(personalSource.phone, personalSource.phoneNumber, personalSource.phone_number, personalSource.mobile, candidate.phone),
      city: firstString(personalSource.city, personalSource.location?.city, candidate.city, locationCity),
      country: firstString(personalSource.country, personalSource.location?.country, candidate.country, locationCountry),
      website: firstString(personalSource.website, personalSource.personalWebsite, personalSource.personal_website, personalSource.portfolio, personalSource.portfolioUrl, personalSource.portfolio_url, candidate.website),
      linkedin: firstString(personalSource.linkedin, personalSource.linkedIn, personalSource.linked_in, personalSource.linkedinUrl, personalSource.linkedin_url, linkedinLink),
      github: firstString(personalSource.github, personalSource.githubUrl, personalSource.github_url, githubLink),
    },
    education: {
      school: firstString(educationSource.school, educationSource.university, educationSource.college, educationSource.institution, educationSource.institutionName, educationSource.institution_name, educationSource.schoolName, educationSource.school_name, educationSource.universityName, educationSource.university_name),
      degree: firstString(educationSource.degree, educationSource.qualification),
      major: firstString(educationSource.major, educationSource.fieldOfStudy, educationSource.field_of_study, educationSource.specialization, educationSource.discipline),
      gradMonth: firstString(educationSource.gradMonth, educationSource.grad_month, educationSource.graduationMonth, educationSource.graduation_month),
      gradYear: extractYear(educationSource.gradYear, educationSource.grad_year, educationSource.graduationYear, educationSource.graduation_year, educationSource.graduationDate, educationSource.graduation_date, educationSource.endYear, educationSource.end_year),
    },
    experience: {
      company: firstString(experienceSource.company, experienceSource.companyName, experienceSource.company_name, experienceSource.currentCompany, experienceSource.current_company, experienceSource.employer, experienceSource.employerName, experienceSource.employer_name, experienceSource.organization),
      title: firstString(experienceSource.title, experienceSource.jobTitle, experienceSource.job_title, experienceSource.currentTitle, experienceSource.current_title, experienceSource.role, experienceSource.position, experienceSource.positionTitle, experienceSource.position_title),
      startMonth: firstString(experienceSource.startMonth, experienceSource.start_month),
      startYear: extractYear(experienceSource.startYear, experienceSource.start_year, experienceSource.startDate, experienceSource.start_date),
      endMonth: firstString(experienceSource.endMonth, experienceSource.end_month),
      endYear: extractYear(experienceSource.endYear, experienceSource.end_year, experienceSource.endDate, experienceSource.end_date),
      ...(firstBoolean(experienceSource.isCurrent, experienceSource.is_current, experienceSource.current, experienceSource.endDate, experienceSource.end_date) !== undefined
        ? { isCurrent: firstBoolean(experienceSource.isCurrent, experienceSource.is_current, experienceSource.current, experienceSource.endDate, experienceSource.end_date) }
        : {}),
      description: firstString(experienceSource.description, experienceSource.summary, experienceSource.responsibilities, experienceSource.roleSummary, experienceSource.role_summary),
    },
    resumeText: firstString(root.resumeText, root.resume_text, candidate.resumeText, candidate.resume_text, root.rawText, root.raw_text, candidate.rawText, candidate.raw_text, root.summary),
  };
};

const readPlainTextResume = async (file: File) => {
  const lowerName = file.name.toLowerCase();
  const isPlainText =
    file.type.startsWith("text/") ||
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".md") ||
    lowerName.endsWith(".rtf");

  return isPlainText ? file.text() : "";
};

const parseResumeTextLocally = (text: string): ParsedResumeData | null => {
  const cleaned = text.replace(/\r/g, "").trim();
  if (!cleaned) return null;

  const lines = cleaned
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const email = cleaned.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
  const phone = cleaned.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.replace(/\s+/g, " ").trim() || "";
  const urls = cleaned.match(/https?:\/\/[^\s),]+/gi) || [];
  const linkedin = urls.find((url) => /linkedin\.com/i.test(url)) || "";
  const github = urls.find((url) => /github\.com/i.test(url)) || "";
  const website = urls.find((url) => !/linkedin\.com|github\.com/i.test(url)) || "";
  const location = cleaned.match(/(?:location|address|city)\s*[:|-]\s*([^\n]+)/i)?.[1]?.trim() || "";
  const [labeledCity = "", labeledCountry = ""] = location.split(",").map((part) => part.trim());

  const nameLine = lines.find((line) => {
    const lower = line.toLowerCase();
    return (
      line.length <= 80 &&
      /^[a-z][a-z\s.'-]+$/i.test(line) &&
      !lower.includes("resume") &&
      !lower.includes("curriculum") &&
      !lower.includes("email") &&
      !lower.includes("phone") &&
      !lower.includes("linkedin") &&
      !lower.includes("github")
    );
  });

  const nameIndex = nameLine ? lines.indexOf(nameLine) : -1;
  const titleLine =
    nameIndex >= 0
      ? lines.slice(nameIndex + 1, nameIndex + 4).find((line) => {
          const lower = line.toLowerCase();
          return (
            !lower.includes("@") &&
            !lower.includes("http") &&
            !/\+?\d[\d\s().-]{7,}\d/.test(line) &&
            /(engineer|developer|architect|lead|manager|designer)/i.test(line)
          );
        }) || ""
      : "";
  const city =
    labeledCity ||
    lines.slice(0, 8).find((line) => {
      const lower = line.toLowerCase();
      return (
        line.length <= 40 &&
        !lower.includes("@") &&
        !lower.includes("http") &&
        !/\+?\d[\d\s().-]{7,}\d/.test(line) &&
        !/(engineer|developer|resume|linkedin|github)/i.test(line) &&
        line !== nameLine
      );
    }) ||
    "";
  const country = labeledCountry;

  const educationIndex = lines.findIndex((line) => /^education$/i.test(line));
  const educationLines = educationIndex >= 0 ? lines.slice(educationIndex + 1, educationIndex + 5) : [];
  const degreeLine =
    educationLines.find((line) => /\b(b\.?tech|bachelor|m\.?tech|master|b\.?e\.?|m\.?e\.?|b\.?s\.?|m\.?s\.?|mba|ph\.?d\.?)\b/i.test(line)) ||
    "";
  const degree = degreeLine || cleaned.match(/\b(b\.?tech|m\.?tech|b\.?e\.?|m\.?e\.?|b\.?s\.?|m\.?s\.?|bachelor(?:'s)?|master(?:'s)?|ph\.?d\.?|mba)\b[^,\n]*/i)?.[0] || "";
  const gradYear =
    degreeLine.match(/\b(20\d{2}|19\d{2})\b(?=[^\n]*$)/)?.[1] ||
    cleaned.match(/(?:graduat(?:ed|ion)|class of|passing year)\D*(20\d{2}|19\d{2})/i)?.[1] ||
    "";
  const school =
    educationLines.find((line) => /\b(university|college|institute|school)\b/i.test(line)) ||
    cleaned.match(/(?:university|college|institute|school)\s*[:|-]?\s*([^\n]+)/i)?.[1]?.trim() ||
    lines.find((line) => /\b(university|college|institute|school)\b/i.test(line)) ||
    "";
  const major =
    degreeLine.match(/\(([^)]+)\)/)?.[1]?.trim() ||
    cleaned.match(/(?:major|field of study|specialization)\s*[:|-]\s*([^\n]+)/i)?.[1]?.trim() ||
    "";

  const workIndex = lines.findIndex((line) => /^(work experiences?|experience|professional experience)$/i.test(line));
  const workLines = workIndex >= 0 ? lines.slice(workIndex + 1) : lines;
  const firstRoleIndex = workLines.findIndex((line) =>
    /(zscaler|mamaearth|creesync|software engineer|web developer)/i.test(line)
  );
  const firstRoleLine = firstRoleIndex >= 0 ? workLines[firstRoleIndex] : "";
  const firstRoleDateLine =
    firstRoleIndex >= 0
      ? workLines.slice(firstRoleIndex, firstRoleIndex + 3).find((line) =>
          /\b(jan|feb|mar|apr|may|jun|june|jul|july|aug|sep|oct|nov|dec)\b|\b20\d{2}\b/i.test(line)
        ) || ""
      : "";
  const roleCompany =
    firstRoleLine.match(/^([^,(]+)\s*(?:,|\()/)?.[1]?.trim() ||
    firstRoleLine.split(/\s+-\s+/)[0]?.trim() ||
    "";
  const roleTitle =
    firstRoleLine.match(/\(([^)]+)\)/)?.[1]?.trim() ||
    firstRoleLine.match(/^[^,]+,\s*(.+)$/)?.[1]?.trim() ||
    titleLine ||
    "";
  const roleDates = `${firstRoleLine} ${firstRoleDateLine}`;

  const title =
    roleTitle ||
    titleLine ||
    cleaned.match(/(?:software|frontend|front-end|backend|back-end|full stack|full-stack|mobile|devops|data|machine learning|ai|web)\s+(?:engineer|developer|architect|scientist)/i)?.[0] ||
    cleaned.match(/(?:current title|title|role)\s*[:|-]\s*([^\n]+)/i)?.[1]?.trim() ||
    "";
  const company = roleCompany || cleaned.match(/(?:company|employer|organization)\s*[:|-]\s*([^\n]+)/i)?.[1]?.trim() || "";
  const years =
    roleDates.match(/\b(20\d{2}|19\d{2})\s*[-–]\s*(present|current|20\d{2}|19\d{2})\b/i) ||
    roleDates.match(/\b(?:jan|feb|mar|apr|may|jun|june|jul|july|aug|sep|oct|nov|dec)[a-z]*\s+(20\d{2}|19\d{2})\s*[-–]\s*(present|current|(?:jan|feb|mar|apr|may|jun|june|jul|july|aug|sep|oct|nov|dec)[a-z]*\s+)?(20\d{2}|19\d{2}|present|current)\b/i);
  const startYear = years?.[1] || "";
  const rawEndYear = years?.[3] || years?.[2] || "";

  return {
    personal: {
      ...splitFullName(nameLine || ""),
      email,
      phone,
      city,
      country,
      linkedin,
      github,
      website,
    },
    education: {
      school,
      degree,
      major,
      gradYear,
    },
    experience: {
      company,
      title,
      startYear,
      endYear: rawEndYear && !/present|current/i.test(rawEndYear) ? rawEndYear : "",
      isCurrent: Boolean(rawEndYear && /present|current/i.test(rawEndYear)),
      description: workLines.slice(firstRoleIndex >= 0 ? firstRoleIndex + 1 : 0, firstRoleIndex >= 0 ? firstRoleIndex + 9 : 12).join("\n"),
    },
    resumeText: cleaned,
  };
};

export function Popup() {
  const [activeTab, setActiveTab] = useState<"personal" | "edu_work" | "resume" | "custom" | "settings">("personal");
  const [personal, setPersonal] = useState<PersonalInfo>(initialPersonal);
  const [education, setEducation] = useState<EducationInfo>(initialEducation);
  const [experience, setExperience] = useState<ExperienceInfo>(initialExperience);
  const [resume, setResume] = useState<ResumeInfo | null>(null);
  const [parseSummary, setParseSummary] = useState<ParseSummary | null>(null);

  // Gemini AI States
  const [geminiApiKey, setGeminiApiKey] = useState<string>("");
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [resumeText, setResumeText] = useState<string>("");
  const [isParsingResume, setIsParsingResume] = useState<boolean>(false);

  const [saveStatus, setSaveStatus] = useState<string>("");
  const [fillStatus, setFillStatus] = useState<{ type: "success" | "error" | "info" | ""; message: string }>({
    type: "",
    message: "",
  });

  // State for new custom field input
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  /**
   * Handles a quota/rate-limit error from the Gemini API.
   * - QUOTA_DAILY: shows a permanent error (no countdown — resets at midnight PT)
   * - QUOTA_MINUTE: shows a manual retry message; no automatic retry.
   */
  const handleQuotaError = useCallback((errMsg: string) => {
    const isDaily = /QUOTA_DAILY/i.test(errMsg);
    const message = isDaily
      ? errMsg.replace(/^QUOTA_DAILY:\s*/i, "")
      : "Gemini free-tier is rate limited right now. Wait a minute and try once, or paste/upload a TXT resume to parse locally.";
    setFillStatus({ type: "error", message });
  }, []);

  // Load from Storage
  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(
        [
          "jobFiller_personal",
          "jobFiller_education",
          "jobFiller_experience",
          "jobFiller_resume",
          "jobFiller_lastParsedResume",
          "jobFiller_geminiApiKey",
          "jobFiller_resumeText",
        ],
        (result: { [key: string]: any }) => {
          if (result.jobFiller_personal) {
            setPersonal({
              ...initialPersonal,
              ...result.jobFiller_personal,
              customFields: result.jobFiller_personal.customFields || [],
            });
          }
          if (result.jobFiller_education) {
            setEducation({
              ...initialEducation,
              ...result.jobFiller_education,
            });
          }
          if (result.jobFiller_experience) {
            setExperience({
              ...initialExperience,
              ...result.jobFiller_experience,
            });
          }
          if (result.jobFiller_resume) setResume(result.jobFiller_resume);
          if (result.jobFiller_lastParsedResume?.summary) setParseSummary(result.jobFiller_lastParsedResume.summary);
          if (result.jobFiller_geminiApiKey) setGeminiApiKey(result.jobFiller_geminiApiKey);
          if (result.jobFiller_resumeText) setResumeText(result.jobFiller_resumeText);
        }
      );
    }
  }, []);

  // Helper to save to Chrome Storage & show status indicator
  const saveToStorage = (key: string, data: any) => {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [key]: data }, () => {
        setSaveStatus("Changes auto-saved");
        const timer = setTimeout(() => setSaveStatus(""), 2000);
        return () => clearTimeout(timer);
      });
    }
  };

  // Change handlers with auto-save
  const handlePersonalChange = (field: keyof PersonalInfo, value: any) => {
    const updated = { ...personal, [field]: value };
    setPersonal(updated);
    saveToStorage("jobFiller_personal", updated);
  };

  const handleEducationChange = (field: keyof EducationInfo, value: string) => {
    const updated = { ...education, [field]: value };
    setEducation(updated);
    saveToStorage("jobFiller_education", updated);
  };

  const handleExperienceChange = (field: keyof ExperienceInfo, value: any) => {
    const updated = { ...experience, [field]: value };
    setExperience(updated);
    saveToStorage("jobFiller_experience", updated);
  };

  const handleApiKeyChange = (val: string) => {
    setGeminiApiKey(val);
    saveToStorage("jobFiller_geminiApiKey", val);
  };

  const handleResumeTextChange = (val: string) => {
    setResumeText(val);
    saveToStorage("jobFiller_resumeText", val);
  };

  const parsePastedResumeText = () => {
    const localParsed = parseResumeTextLocally(resumeText);
    if (localParsed) {
      applyParsedResumeData(localParsed, "text resume");
      return;
    }

    setFillStatus({
      type: "error",
      message: "Paste resume text first, then parse it into Personal, Education, and Work.",
    });
  };

  const applyParsedResumeData = (parsed: ParsedResumeData, source: "Gemini AI" | "text resume") => {
    const normalized = normalizeParsedResumeData(parsed);
    const parsedPersonal = normalized.personal || {};
    const fullName = stringValue(parsedPersonal.fullName) || stringValue(parsedPersonal.name);
    const nameParts = fullName ? splitFullName(fullName) : {};
    const personalPatch = compactPatch<PersonalInfo>({
      ...parsedPersonal,
      ...nameParts,
    });

    const parsedEducation = normalized.education || {};
    const educationPatch = compactPatch<EducationInfo>({
      ...parsedEducation,
      major: parsedEducation.major || parsedEducation.fieldOfStudy,
      gradYear: parsedEducation.gradYear || parsedEducation.graduationYear || parsedEducation.graduationDate,
    });

    const parsedExperience = normalized.experience || {};
    const experiencePatch = compactPatch<ExperienceInfo>({
      ...parsedExperience,
      company: parsedExperience.company || parsedExperience.currentCompany,
      title: parsedExperience.title || parsedExperience.jobTitle || parsedExperience.currentTitle,
    });

    // Compute and apply each patch — functional updater reads latest prev state,
    // then we save the exact value that was returned (no stale closure).
    if (Object.keys(personalPatch).length > 0) {
      setPersonal((prev) => {
        const next = {
          ...prev,
          ...personalPatch,
          // Preserve fields that should never be overwritten by resume data
          notice: prev.notice,
          salary: prev.salary,
          coverLetter: prev.coverLetter,
          customFields: prev.customFields,
        };
        // Schedule the storage write after React commits the update
        setTimeout(() => saveToStorage("jobFiller_personal", next), 0);
        return next;
      });
    }

    if (Object.keys(educationPatch).length > 0) {
      setEducation((prev) => {
        const next = { ...prev, ...educationPatch };
        setTimeout(() => saveToStorage("jobFiller_education", next), 0);
        return next;
      });
    }

    if (Object.keys(experiencePatch).length > 0) {
      setExperience((prev) => {
        const next = { ...prev, ...experiencePatch };
        setTimeout(() => saveToStorage("jobFiller_experience", next), 0);
        return next;
      });
    }

    if (normalized.resumeText?.trim()) {
      setResumeText(normalized.resumeText.trim());
      saveToStorage("jobFiller_resumeText", normalized.resumeText.trim());
    }

    setActiveTab("personal");
    const summary: ParseSummary = {
      source,
      savedAt: new Date().toISOString(),
      personalCount: Object.keys(personalPatch).length,
      educationCount: Object.keys(educationPatch).length,
      workCount: Object.keys(experiencePatch).length,
      resumeTextLength: normalized.resumeText?.trim().length || 0,
    };
    setParseSummary(summary);
    saveToStorage("jobFiller_lastParsedResume", { source, parsed, normalized, summary });

    const updatedSections = [
      Object.keys(personalPatch).length > 0 ? "personal" : "",
      Object.keys(educationPatch).length > 0 ? "education" : "",
      Object.keys(experiencePatch).length > 0 ? "work" : "",
    ].filter(Boolean);

    setFillStatus({
      type: updatedSections.length > 0 ? "success" : "error",
      message:
        updatedSections.length > 0
          ? `Resume uploaded and updated ${updatedSections.join(", ")} details with ${source}.`
          : "Resume uploaded, but no profile fields were found in the parsed data.",
    });
  };

  // Custom Fields Actions
  const addCustomField = () => {
    if (!newKey.trim()) return;
    const updatedFields = [...personal.customFields, { key: newKey.trim(), value: newValue.trim() }];
    const updatedPersonal = { ...personal, customFields: updatedFields };
    setPersonal(updatedPersonal);
    saveToStorage("jobFiller_personal", updatedPersonal);
    setNewKey("");
    setNewValue("");
  };

  const removeCustomField = (index: number) => {
    const updatedFields = personal.customFields.filter((_, i) => i !== index);
    const updatedPersonal = { ...personal, customFields: updatedFields };
    setPersonal(updatedPersonal);
    saveToStorage("jobFiller_personal", updatedPersonal);
  };

  // Resume File Upload handler
  const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setFillStatus({ type: "error", message: "Resume must be smaller than 8MB." });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const fileData: ResumeInfo = {
        base64,
        name: file.name,
        size: file.size,
        type: file.type,
      };
      setResume(fileData);
      saveToStorage("jobFiller_resume", fileData);

      const plainText = await readPlainTextResume(file);

      setIsParsingResume(true);
      setFillStatus({ type: "info", message: "AI is parsing your resume details…" });

      // Always send to background — it tries Chrome built-in AI first (no key needed),
      // then falls back to Gemini cloud API if available.
      const freshApiKey = await new Promise<string>((resolve) => {
        if (typeof chrome !== "undefined" && chrome.storage?.local) {
          chrome.storage.local.get("jobFiller_geminiApiKey", (r) => {
            resolve(String(r.jobFiller_geminiApiKey || "").trim());
          });
        } else {
          resolve(geminiApiKey.trim());
        }
      });

      chrome.runtime.sendMessage(
        {
          type: "PARSE_RESUME",
          payload: {
            apiKey: freshApiKey,  // may be empty — background will use built-in AI instead
            base64,
            mimeType: file.type,
            plainText,            // for built-in AI (can't read binary files)
          },
        },
        (response) => {
          setIsParsingResume(false);
          if (chrome.runtime.lastError) {
            console.error("PARSE_RESUME message failed:", chrome.runtime.lastError);
            // Fall back to local text parse
            const localParsed = parseResumeTextLocally(plainText);
            if (localParsed) {
              applyParsedResumeData(localParsed, "text resume");
            } else {
              setFillStatus({ type: "error", message: "Connection failed: " + (chrome.runtime.lastError.message || "Unknown error") });
              setTimeout(() => setFillStatus({ type: "", message: "" }), 5000);
            }
            return;
          }
          if (response && response.success) {
            try {
              const cleanedJson = cleanJsonResponse(response.text);
              const parsed = JSON.parse(cleanedJson);
              const source = response.model === "chrome-built-in" ? "Chrome AI" : "Gemini AI";
              applyParsedResumeData(parsed, source as any);
            } catch (e) {
              console.error("Failed to parse resume JSON response:", e);
              const localParsed = parseResumeTextLocally(plainText);
              if (localParsed) {
                applyParsedResumeData(localParsed, "text resume");
              } else {
                setFillStatus({ type: "success", message: "Resume uploaded, but details could not be extracted." });
              }
            }
          } else {
            console.error("AI parse failed:", response?.error);
            const errMsg = response?.error || "Unknown error";
            if (/rate limit|quota|RESOURCE_EXHAUSTED|429|QUOTA_/i.test(errMsg)) {
              const localParsed = parseResumeTextLocally(plainText);
              if (localParsed) {
                applyParsedResumeData(localParsed, "text resume");
              } else {
                const displayMsg = /QUOTA_DAILY/i.test(errMsg)
                  ? errMsg.replace(/^QUOTA_DAILY:\s*/i, "")
                  : "Rate limited. Wait 60s and re-upload your resume.";
                setFillStatus({ type: "error", message: displayMsg });
              }
            } else {
              const localParsed = parseResumeTextLocally(plainText);
              if (localParsed) {
                applyParsedResumeData(localParsed, "text resume");
              } else {
                setFillStatus({ type: "success", message: "Resume uploaded. Extraction failed: " + errMsg });
              }
            }
          }
          setTimeout(() => setFillStatus({ type: "", message: "" }), 5000);
        }
      );
    };
    reader.readAsDataURL(file);
  };

  const deleteResume = () => {
    setResume(null);
    setParseSummary(null);
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.remove(["jobFiller_resume", "jobFiller_lastParsedResume"], () => {
        setSaveStatus("Resume deleted");
        setTimeout(() => setSaveStatus(""), 2000);
      });
    }
  };

  // Test Gemini API Key connection
  const testGeminiConnection = useCallback(() => {
    if (!geminiApiKey.trim()) {
      setFillStatus({ type: "error", message: "Please enter an API Key first." });
      return;
    }

    setFillStatus({ type: "info", message: "Testing connection to Gemini..." });

    if (typeof chrome === "undefined" || !chrome.runtime) {
      setFillStatus({ type: "error", message: "Chrome extension API not available." });
      return;
    }

    chrome.runtime.sendMessage(
      {
        type: "CALL_GEMINI",
        payload: {
          apiKey: geminiApiKey,
          promptText: "Respond with exactly the text: 'Gemini AI connection successful!'",
        },
      },
      (response) => {
        if (chrome.runtime.lastError) {
          setFillStatus({ type: "error", message: "Error communicating with service worker." });
        } else if (response && response.success) {
          setFillStatus({ type: "success", message: response.text });
        } else {
          const errMsg = response?.error || "Connection test failed.";
          if (/rate limit|quota|RESOURCE_EXHAUSTED|429|QUOTA_/i.test(errMsg)) {
            handleQuotaError(errMsg);
          } else {
            setFillStatus({ type: "error", message: errMsg });
          }
        }
      }
    );
  }, [geminiApiKey, handleQuotaError]);

  // Trigger Fill Form Script
  const triggerFillForm = () => {
    setFillStatus({ type: "info", message: "Scanning and filling form fields..." });

    if (typeof chrome === "undefined" || !chrome.tabs) {
      setFillStatus({ type: "error", message: "Chrome API not available (are you testing in a tab?)" });
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTabId = tabs[0]?.id;
      if (!activeTabId) {
        setFillStatus({ type: "error", message: "No active page tab found." });
        return;
      }

      chrome.tabs.sendMessage(
        activeTabId,
        {
          type: "FILL_FORM",
          payload: {
            personal,
            education,
            experience,
            resume,
            geminiApiKey,
            resumeText,
          },
        },
        (response) => {
          if (chrome.runtime.lastError) {
            setFillStatus({
              type: "error",
              message: "Cannot access this page. Please refresh and try again.",
            });
            console.error(chrome.runtime.lastError);
          } else if (response && response.success) {
            let statusMsg = `Successfully filled ${response.filledCount} fields!`;
            if (response.aiCount > 0) {
              statusMsg += ` (${response.aiCount} with Gemini AI)`;
            }
            setFillStatus({
              type: "success",
              message: statusMsg,
            });
            setTimeout(() => setFillStatus({ type: "", message: "" }), 5000);
          } else {
            setFillStatus({
              type: "error",
              message: response?.message || "Failed to fill the form.",
            });
          }
        }
      );
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="flex flex-col h-[580px] bg-slate-950 text-slate-100 select-none">
      {/* Header */}
      <header className="px-5 py-4.5 bg-slate-900/50 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-400 to-indigo-500 flex items-center justify-center text-xl font-bold shadow-lg shadow-cyan-500/10">
            🤖
          </div>
          <div>
            <h1 className="text-base font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-300 tracking-tight">
              Smart AI Job Filler
            </h1>
            <p className="text-[10px] text-slate-400 font-medium -mt-0.5">Gemini-powered applications</p>
          </div>
        </div>
        <div className="text-[10px] font-medium text-cyan-400/80 bg-cyan-950/40 border border-cyan-800/40 rounded px-1.5 py-0.5">
          Manifest V3
        </div>
      </header>

      {/* Tabs Navigation */}
      <nav className="flex px-4 pt-2 bg-slate-950 border-b border-slate-900">
        {[
          { id: "personal", label: "Personal" },
          { id: "edu_work", label: "Education & Work" },
          { id: "resume", label: "Resume & Bio" },
          { id: "custom", label: "Custom Q&A" },
          { id: "settings", label: "Settings" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 pb-2 text-[11px] font-semibold border-b-2 transition-all duration-200 ${
              activeTab === tab.id
                ? "border-cyan-400 text-cyan-400 font-bold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Main Tab Content Panel */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {activeTab === "personal" && (
          <div className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">
                  First Name
                </label>
                <input
                  type="text"
                  value={personal.firstName}
                  onChange={(e) => handlePersonalChange("firstName", e.target.value)}
                  placeholder="John"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-400/50 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">
                  Last Name
                </label>
                <input
                  type="text"
                  value={personal.lastName}
                  onChange={(e) => handlePersonalChange("lastName", e.target.value)}
                  placeholder="Doe"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-400/50 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 outline-none transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">
                  Email Address
                </label>
                <input
                  type="email"
                  value={personal.email}
                  onChange={(e) => handlePersonalChange("email", e.target.value)}
                  placeholder="john.doe@gmail.com"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-400/50 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={personal.phone}
                  onChange={(e) => handlePersonalChange("phone", e.target.value)}
                  placeholder="+1 (555) 019-2834"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-400/50 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 outline-none transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">
                  City
                </label>
                <input
                  type="text"
                  value={personal.city}
                  onChange={(e) => handlePersonalChange("city", e.target.value)}
                  placeholder="San Francisco"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-400/50 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">
                  Country
                </label>
                <input
                  type="text"
                  value={personal.country}
                  onChange={(e) => handlePersonalChange("country", e.target.value)}
                  placeholder="United States"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-400/50 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">
                LinkedIn Profile URL
              </label>
              <input
                type="url"
                value={personal.linkedin}
                onChange={(e) => handlePersonalChange("linkedin", e.target.value)}
                placeholder="https://linkedin.com/in/johndoe"
                className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-400/50 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 outline-none transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">
                  GitHub Profile URL
                </label>
                <input
                  type="url"
                  value={personal.github}
                  onChange={(e) => handlePersonalChange("github", e.target.value)}
                  placeholder="https://github.com/johndoe"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-400/50 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">
                  Portfolio / Website
                </label>
                <input
                  type="url"
                  value={personal.website}
                  onChange={(e) => handlePersonalChange("website", e.target.value)}
                  placeholder="https://johndoe.com"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-400/50 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 outline-none transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5 pt-1.5">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">
                  Authorized to Work?
                </label>
                <div className="flex gap-2">
                  {["yes", "no"].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handlePersonalChange("authorizedToWork", opt)}
                      className={`flex-1 py-1 px-3 text-xs font-semibold rounded-md border capitalize transition ${
                        personal.authorizedToWork === opt
                          ? "bg-cyan-500/10 border-cyan-400/50 text-cyan-400"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">
                  Requires Sponsorship?
                </label>
                <div className="flex gap-2">
                  {["yes", "no"].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handlePersonalChange("requiresSponsorship", opt)}
                      className={`flex-1 py-1 px-3 text-xs font-semibold rounded-md border capitalize transition ${
                        personal.requiresSponsorship === opt
                          ? "bg-cyan-500/10 border-cyan-400/50 text-cyan-400"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5 pt-1.5">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">
                  Notice Period
                </label>
                <input
                  type="text"
                  value={personal.notice}
                  onChange={(e) => handlePersonalChange("notice", e.target.value)}
                  placeholder="Immediate / 30 Days"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-400/50 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">
                  Expected Salary
                </label>
                <input
                  type="text"
                  value={personal.salary}
                  onChange={(e) => handlePersonalChange("salary", e.target.value)}
                  placeholder="Negotiable / $120k"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-400/50 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">
                Cover Letter / Bio
              </label>
              <textarea
                value={personal.coverLetter}
                onChange={(e) => handlePersonalChange("coverLetter", e.target.value)}
                placeholder="Write a brief cover letter or bio that will be injected into cover letter fields..."
                rows={3}
                className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-400/50 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-700 outline-none resize-none transition"
              />
            </div>
          </div>
        )}

        {activeTab === "edu_work" && (
          <div className="space-y-4">
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                <span>🎓</span> Education Details
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">
                    School / University
                  </label>
                  <input
                    type="text"
                    value={education.school}
                    onChange={(e) => handleEducationChange("school", e.target.value)}
                    placeholder="Stanford University"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-400/50 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">
                    Degree
                  </label>
                  <input
                    type="text"
                    value={education.degree}
                    onChange={(e) => handleEducationChange("degree", e.target.value)}
                    placeholder="B.S."
                    className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-400/50 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">
                    Major / Field of Study
                  </label>
                  <input
                    type="text"
                    value={education.major}
                    onChange={(e) => handleEducationChange("major", e.target.value)}
                    placeholder="Computer Science"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-400/50 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">
                    Grad Year
                  </label>
                  <input
                    type="text"
                    value={education.gradYear}
                    onChange={(e) => handleEducationChange("gradYear", e.target.value)}
                    placeholder="2026"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-400/50 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 outline-none transition"
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-900" />

            <div className="space-y-3">
              <h3 className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                <span>💼</span> Professional Experience
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">
                    Current/Last Company
                  </label>
                  <input
                    type="text"
                    value={experience.company}
                    onChange={(e) => handleExperienceChange("company", e.target.value)}
                    placeholder="Google"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-400/50 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={experience.title}
                    onChange={(e) => handleExperienceChange("title", e.target.value)}
                    placeholder="Software Engineer"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-400/50 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">
                    Start Year
                  </label>
                  <input
                    type="text"
                    value={experience.startYear}
                    onChange={(e) => handleExperienceChange("startYear", e.target.value)}
                    placeholder="2024"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-400/50 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">
                    End Year
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      disabled={experience.isCurrent}
                      value={experience.isCurrent ? "Present" : experience.endYear}
                      onChange={(e) => handleExperienceChange("endYear", e.target.value)}
                      placeholder="25"
                      className="flex-1 bg-slate-900 border border-slate-800 focus:border-cyan-400/50 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 outline-none transition disabled:opacity-40 disabled:bg-slate-950"
                    />
                    <button
                      onClick={() => handleExperienceChange("isCurrent", !experience.isCurrent)}
                      className={`px-2 text-[10px] font-bold rounded-lg border transition ${
                        experience.isCurrent
                          ? "bg-cyan-500/10 border-cyan-400/50 text-cyan-400"
                          : "bg-slate-900 border-slate-800 text-slate-400"
                      }`}
                    >
                      Current
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">
                  Experience Description / Role Summary
                </label>
                <textarea
                  value={experience.description}
                  onChange={(e) => handleExperienceChange("description", e.target.value)}
                  placeholder="Summarize key responsibilities, technologies, and achievements..."
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-400/50 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-700 outline-none resize-none transition"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "resume" && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                <span>📄</span> Resume File Attachment
              </h3>
              <p className="text-[10px] text-slate-400">
                Uploaded files are converted to Base64 to programmatically fill file fields.
              </p>
            </div>

            {resume ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-3.5 hover:border-slate-800 transition">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-950/40 border border-red-800/40 flex items-center justify-center text-xl shadow-inner">
                    📕
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-xs font-bold text-white truncate max-w-[240px]">
                      {resume.name}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {formatBytes(resume.size)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={deleteResume}
                  className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-red-900/30 border border-transparent hover:border-red-900/40 hover:text-red-400 flex items-center justify-center transition"
                  title="Remove resume"
                >
                  <span className="text-xs">🗑️</span>
                </button>
              </div>
            ) : isParsingResume ? (
              <div className="border-2 border-dashed border-cyan-500/50 bg-slate-900/40 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mb-3"></div>
                <p className="text-xs font-bold text-cyan-400">Gemini AI is parsing details...</p>
                <p className="text-[10px] text-slate-500 mt-1">Extracting personal details, education, & history</p>
              </div>
            ) : (
              <div className="relative group border-2 border-dashed border-slate-800 hover:border-cyan-500/50 bg-slate-900/20 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition duration-300">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.md,.rtf"
                  disabled={isParsingResume}
                  onChange={handleResumeUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <span className="text-2xl mb-2">📤</span>
                <p className="text-xs font-bold text-slate-300">Drag & drop resume here</p>
                <p className="text-[10px] text-slate-500 mt-0.5">PDF, DOCX, TXT (up to 8MB)</p>
              </div>
            )}

            {parseSummary && (
              <div
                className={`rounded-xl border p-3 text-xs ${
                  parseSummary.personalCount + parseSummary.educationCount + parseSummary.workCount > 0
                    ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-100"
                    : "bg-rose-950/20 border-rose-800/50 text-rose-100"
                }`}
              >
                <div className="font-bold mb-1">
                  Last resume parse: {parseSummary.source}
                </div>
                <div className="grid grid-cols-4 gap-2 text-[10px] text-slate-300">
                  <span>Personal: {parseSummary.personalCount}</span>
                  <span>Education: {parseSummary.educationCount}</span>
                  <span>Work: {parseSummary.workCount}</span>
                  <span>Text: {parseSummary.resumeTextLength}</span>
                </div>
              </div>
            )}

            <hr className="border-slate-900" />

            {/* Resume Plain Text Bio */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                <span>📝</span> Resume Plain Text / Bio (for AI Answers)
              </label>
              <p className="text-[10px] text-slate-400">
                Paste your raw resume text or professional bio. The Gemini AI uses this context to draft custom question responses.
              </p>
              <textarea
                value={resumeText}
                onChange={(e) => handleResumeTextChange(e.target.value)}
                placeholder="Paste parsed resume text, skills list, project highlights, or detailed professional summary..."
                rows={5}
                className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-400/50 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-700 outline-none resize-none transition"
              />
              <button
                type="button"
                onClick={parsePastedResumeText}
                className="w-full py-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/15 border border-cyan-500/40 text-xs font-bold text-cyan-300 transition"
              >
                Parse Pasted Resume Into Profile
              </button>
            </div>
          </div>
        )}

        {activeTab === "custom" && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                <span>💬</span> Custom Questions & Answers
              </h3>
              <p className="text-[10px] text-slate-400">
                Create custom terms (e.g. "Notice Period", "Salary Expectations") to auto-fill custom fields.
              </p>
            </div>

            {/* Custom Field List */}
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {personal.customFields && personal.customFields.length > 0 ? (
                personal.customFields.map((field, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5 hover:border-slate-800 transition"
                  >
                    <div className="overflow-hidden">
                      <div className="text-[10px] uppercase font-bold text-cyan-400/80 tracking-wider">
                        {field.key}
                      </div>
                      <div className="text-xs text-white font-medium mt-0.5 truncate max-w-[340px]">
                        {field.value}
                      </div>
                    </div>
                    <button
                      onClick={() => removeCustomField(idx)}
                      className="w-5 h-5 rounded-md hover:bg-red-950/40 hover:text-red-400 flex items-center justify-center transition"
                    >
                      <span className="text-[10px]">✕</span>
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 border border-dashed border-slate-900 rounded-lg text-[10px] text-slate-500 font-medium">
                  No custom fields added yet. Add one below!
                </div>
              )}
            </div>

            <hr className="border-slate-900" />

            {/* Add Custom Field Form */}
            <div className="bg-slate-900/30 border border-slate-900/60 rounded-xl p-3.5 space-y-3">
              <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Add Custom Field
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">
                    Label keyword
                  </label>
                  <input
                    type="text"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder="e.g. Salary"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400/50 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-700 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">
                    Your answer
                  </label>
                  <input
                    type="text"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder="e.g. $120,000"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400/50 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-700 outline-none transition"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={addCustomField}
                className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 hover:text-white transition text-xs font-bold text-slate-300"
              >
                Add Field
              </button>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                <span>⚙️</span> Gemini AI Settings
              </h3>
              <p className="text-[10px] text-slate-400">
                Configure Google's Gemini API to automatically compose answers to custom and complex application questions.
              </p>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">
                  Gemini API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={geminiApiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-400/50 rounded-lg pl-3 pr-10 py-1.5 text-xs text-white placeholder-slate-700 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 hover:text-slate-300 font-bold"
                  >
                    {showApiKey ? "Hide" : "Show"}
                  </button>
                </div>
                <p className="text-[9px] text-slate-550 mt-1 leading-relaxed">
                  Keys are saved locally inside Chrome's secure storage. Get one for free from Google AI Studio.
                </p>
              </div>

              <button
                type="button"
                onClick={testGeminiConnection}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 hover:text-cyan-400 border border-slate-800 rounded-lg text-xs font-bold text-slate-300 transition"
              >
                ⚡ Test Gemini Connection
              </button>
            </div>

            <div className="bg-slate-900/30 border border-slate-900/80 rounded-xl p-3.5 space-y-1.5 text-[10px] text-slate-400 leading-relaxed">
              <span className="font-bold text-slate-300 uppercase tracking-wider text-[9px] block">
                Security & Costs:
              </span>
              <p>
                - The extension calls <b>Gemini 3.5 Flash</b> directly from your browser background process, keeping request transactions safe from web-page DOM scraping.
              </p>
              <p>
                - Generates specific, context-appropriate responses under 150 words using only the resume text you pasted under the <b>Resume & Bio</b> tab.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <footer className="px-5 py-4.5 bg-slate-900/65 border-t border-slate-900 flex flex-col gap-2.5">
        {/* Status display */}
        {fillStatus.message && (
          <div
            className={`px-3 py-2 rounded-lg text-[10px] font-medium border flex items-start gap-2 transition duration-200 ${
              fillStatus.type === "success"
                ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-400"
                : fillStatus.type === "error"
                ? "bg-rose-950/20 border-rose-800/40 text-rose-400"
                : "bg-cyan-950/20 border-cyan-800/40 text-cyan-400"
            }`}
          >
            <span className="mt-px">
              {fillStatus.type === "success" ? "✅" : fillStatus.type === "error" ? "❌" : "ℹ️"}
            </span>
            <span className="flex-1 leading-tight">
              {fillStatus.message}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium text-slate-500 italic">
            {saveStatus || "Auto-saves on edit"}
          </span>
          <span className="text-[10px] font-medium text-slate-500">v1.0.0</span>
        </div>

        <button
          onClick={triggerFillForm}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 active:scale-[0.98] transition-all text-xs font-bold text-white shadow-lg shadow-indigo-600/10 border border-cyan-400/20 flex items-center justify-center gap-2 focus:outline-none"
        >
          <span>⚡</span> Fill Job Application Form
        </button>
      </footer>
    </div>
  );
}
