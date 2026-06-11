import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "Workspace React TS Extension Template",
  version: "1.0.0",
  description: "A boilerplate template for building React/TS Chrome Extensions.",
  permissions: [
    "storage",
    "activeTab"
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
