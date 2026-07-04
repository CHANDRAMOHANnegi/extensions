# Chrome Extensions Workspace

Welcome! This workspace is set up as a `pnpm` monorepo designed to build and maintain multiple Chrome extensions in a single repository. It supports both simple vanilla JS extensions and modern, fully compiled React + TypeScript + Tailwind CSS extensions.

---

## 📁 Workspace Architecture

```txt
extensions/
├── package.json               # Root scripts and workspace devDependencies
├── pnpm-workspace.yaml        # Workspace definition pointing to apps/* and packages/*
│
├── apps/
│   ├── focus/                 # Vanilla JS Focus Blocker Extension (Manifest V3)
│   │   ├── manifest.json      # Standard extension manifest
│   │   ├── background.js      # Chrome background worker
│   │   ├── popup.html         # HTML interface for extension action popup
│   │   └── ...
│   │
│   └── template-react-ts/     # Modern React + TS + Tailwind Extension (Manifest V3)
│       ├── package.json       # App-specific dependencies and scripts
│       ├── vite.config.ts     # Vite bundler using @crxjs/vite-plugin
│       ├── tsconfig.json      # TypeScript project configuration references
│       ├── index.html         # Popup template entrypoint
│       └── src/
│           ├── manifest.ts    # Typings-safe manifest declaration
│           ├── index.css      # CSS entry containing Tailwind directives
│           ├── background/    # Extension background service worker
│           ├── content/       # Page content script
│           └── popup/         # React application mounting popup dashboard
```

---

## 🛠️ Developer & Agent Guide

### Prerequisites
- Node.js & **`pnpm`** (10+) installed.
- Docker (optional, if any DB services are integrated in future packages).

### Installation
From the root directory, install all workspace dependencies:
```bash
pnpm install
```

### Developing a Vanilla Extension (e.g., `apps/focus`)
1. No compiler or build step is needed for vanilla JS extensions.
2. In Chrome, open `chrome://extensions/`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the folder `apps/focus/`.

### Developing a React-TS Extension (e.g., `apps/template-react-ts`)
1. **Start Development mode**:
   ```bash
   pnpm --filter @extensions-workspace/template-react-ts dev
   ```
   *Note: Vite + CRXJS supports full HMR (Hot Module Replacement) inside Chrome when running in dev mode.*
2. **Build for Production**:
   ```bash
   pnpm --filter @extensions-workspace/template-react-ts build
   ```
   *Output directories are generated in the respective app's `dist/` folder.*
3. **Load in Chrome**:
   - Go to `chrome://extensions/`.
   - Click **Load unpacked** and select the `apps/template-react-ts/dist` folder.

---

## 💡 How to Add a New Extension

1. Create a new directory inside `apps/` (e.g., `apps/my-new-extension`).
2. If it is a **Vanilla JS** extension:
   - Create a `manifest.json` and your static files directly.
3. If it is a **React + TypeScript** extension:
   - You can copy the structure of `apps/template-react-ts/`.
   - Update `name` in `package.json` to `@extensions-workspace/my-new-extension`.
   - Run `pnpm install` at the workspace root to link workspace references.
