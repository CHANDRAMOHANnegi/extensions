import { useState, useEffect } from "react";

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

export function Popup() {
  const [activeTab, setActiveTab] = useState<"personal" | "edu_work" | "resume" | "custom" | "settings">("personal");
  const [personal, setPersonal] = useState<PersonalInfo>(initialPersonal);
  const [education, setEducation] = useState<EducationInfo>(initialEducation);
  const [experience, setExperience] = useState<ExperienceInfo>(initialExperience);
  const [resume, setResume] = useState<ResumeInfo | null>(null);

  // Gemini AI States
  const [geminiApiKey, setGeminiApiKey] = useState<string>("");
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [resumeText, setResumeText] = useState<string>("");

  const [saveStatus, setSaveStatus] = useState<string>("");
  const [fillStatus, setFillStatus] = useState<{ type: "success" | "error" | "info" | ""; message: string }>({
    type: "",
    message: "",
  });

  // State for new custom field input
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  // Load from Storage
  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(
        [
          "jobFiller_personal",
          "jobFiller_education",
          "jobFiller_experience",
          "jobFiller_resume",
          "jobFiller_geminiApiKey",
          "jobFiller_resumeText",
        ],
        (result: { [key: string]: any }) => {
          if (result.jobFiller_personal) setPersonal(result.jobFiller_personal);
          if (result.jobFiller_education) setEducation(result.jobFiller_education);
          if (result.jobFiller_experience) setExperience(result.jobFiller_experience);
          if (result.jobFiller_resume) setResume(result.jobFiller_resume);
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
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const fileData: ResumeInfo = {
        base64,
        name: file.name,
        size: file.size,
        type: file.type,
      };
      setResume(fileData);
      saveToStorage("jobFiller_resume", fileData);
      setFillStatus({ type: "success", message: "Resume uploaded successfully!" });
      setTimeout(() => setFillStatus({ type: "", message: "" }), 3000);
    };
    reader.readAsDataURL(file);
  };

  const deleteResume = () => {
    setResume(null);
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.remove("jobFiller_resume", () => {
        setSaveStatus("Resume deleted");
        setTimeout(() => setSaveStatus(""), 2000);
      });
    }
  };

  // Test Gemini API Key connection
  const testGeminiConnection = () => {
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
          setFillStatus({ type: "error", message: response?.error || "Connection test failed." });
        }
      }
    );
  };

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
            ) : (
              <div className="relative group border-2 border-dashed border-slate-800 hover:border-cyan-500/50 bg-slate-900/20 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition duration-300">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleResumeUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <span className="text-2xl mb-2">📤</span>
                <p className="text-xs font-bold text-slate-300">Drag & drop resume here</p>
                <p className="text-[10px] text-slate-500 mt-0.5">PDF, DOCX (up to 8MB)</p>
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
            className={`px-3 py-2 rounded-lg text-[10px] font-medium border flex items-center gap-2 transition duration-200 ${
              fillStatus.type === "success"
                ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-400"
                : fillStatus.type === "error"
                ? "bg-rose-950/20 border-rose-800/40 text-rose-400"
                : "bg-cyan-950/20 border-cyan-800/40 text-cyan-400"
            }`}
          >
            <span>
              {fillStatus.type === "success" ? "✅" : fillStatus.type === "error" ? "❌" : "ℹ️"}
            </span>
            <span className="flex-1 leading-tight">{fillStatus.message}</span>
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
