import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "Smart Job Form Filler",
  version: "1.0.0",
  description: "Automatically fill out job application forms and upload resumes with a single click.",
  permissions: [
    "storage",
    "activeTab",
    "unlimitedStorage"
  ],
  action: {
    default_popup: "index.html"
  },
  background: {
    service_worker: "src/background/index.ts",
    type: "module"
  },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content/index.ts"]
    }
  ]
});
