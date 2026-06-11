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
  const [activeTab, setActiveTab] = useState<"personal" | "edu_work" | "resume" | "custom">("personal");
  const [personal, setPersonal] = useState<PersonalInfo>(initialPersonal);
  const [education, setEducation] = useState<EducationInfo>(initialEducation);
  const [experience, setExperience] = useState<ExperienceInfo>(initialExperience);
  const [resume, setResume] = useState<ResumeInfo | null>(null);

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
      chrome.storage.local.get(["jobFiller_personal", "jobFiller_education", "jobFiller_experience", "jobFiller_resume"], (result: { [key: string]: any }) => {
        if (result.jobFiller_personal) setPersonal(result.jobFiller_personal);
        if (result.jobFiller_education) setEducation(result.jobFiller_education);
        if (result.jobFiller_experience) setExperience(result.jobFiller_experience);
        if (result.jobFiller_resume) setResume(result.jobFiller_resume);
      });
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

    // Check size limit: keep it under 8MB for chrome.storage limit safety (default 10MB)
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
          payload: { personal, education, experience, resume },
        },
        (response) => {
          if (chrome.runtime.lastError) {
            setFillStatus({
              type: "error",
              message: "Cannot access this page. Please refresh and try again.",
            });
            console.error(chrome.runtime.lastError);
          } else if (response && response.success) {
            setFillStatus({
              type: "success",
              message: `Successfully filled ${response.filledCount} fields!`,
            });
            setTimeout(() => setFillStatus({ type: "", message: "" }), 4000);
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

  // Helper to format bytes
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
      <header className="px-5 py-4 bg-slate-900/50 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-400 to-indigo-500 flex items-center justify-center text-xl font-bold shadow-lg shadow-cyan-500/10">
            📝
          </div>
          <div>
            <h1 className="text-base font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-300 tracking-tight">
              Smart Job Filler
            </h1>
            <p className="text-[10px] text-slate-400 font-medium -mt-0.5">Auto-fill applications</p>
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
          { id: "resume", label: "Resume" },
          { id: "custom", label: "Custom Q&A" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 pb-2 text-xs font-semibold border-b-2 transition-all duration-200 ${
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
          </div>
        )}

        {activeTab === "edu_work" && (
          <div className="space-y-4">
            {/* Education Sub-section */}
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

            {/* Experience Sub-section */}
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
                    placeholder="Software Engineer Intern"
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
            </div>
          </div>
        )}

        {activeTab === "resume" && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                <span>📄</span> Resume File (PDF/Word)
              </h3>
              <p className="text-[10px] text-slate-400">
                Upload a document to fill file attachment fields in application forms.
              </p>
            </div>

            {resume ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-3.5 hover:border-slate-800 transition">
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
              <div className="relative group border-2 border-dashed border-slate-800 hover:border-cyan-500/50 bg-slate-900/20 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition duration-300">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleResumeUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <span className="text-3xl mb-2.5">📤</span>
                <p className="text-xs font-bold text-slate-300">Drag & drop resume here</p>
                <p className="text-[10px] text-slate-500 mt-1">Accepts PDF, DOCX (up to 8MB)</p>
              </div>
            )}

            <div className="bg-slate-900/30 border border-slate-900 rounded-xl p-3.5 text-[10px] text-slate-400 space-y-1.5 leading-relaxed">
              <span className="font-bold text-slate-300 uppercase tracking-wider text-[9px] block">
                How It Works:
              </span>
              <p>
                When clicking <b>Fill Form</b>, the extension converts the stored document into a browser
                File object, finds the file inputs labeled "resume" or "cv", and simulates a user upload
                action.
              </p>
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
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
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
            <span className="flex-1">{fillStatus.message}</span>
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
