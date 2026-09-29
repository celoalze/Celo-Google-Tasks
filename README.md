# Google Tasks Desktop

[![Windows](https://img.shields.io/badge/platform-Windows%20x64-0078D6?logo=windows&logoColor=white)](https://github.com/celoalze/Celo-Google-Tasks/releases)
[![Electron](https://img.shields.io/badge/Electron-34-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Material Design 3](https://img.shields.io/badge/Material_Design-3-6750A4)](https://m3.material.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CI](https://github.com/celoalze/Celo-Google-Tasks/actions/workflows/ci.yml/badge.svg)](https://github.com/celoalze/Celo-Google-Tasks/actions/workflows/ci.yml)

A Windows desktop client for **Google Tasks (API v1)** with a **Material Design 3** experience: lists, subtasks, drag-to-reorder, native reminders, taskbar badge, system tray, and launch on startup.

> Unofficial project, not affiliated with Google. You bring your own OAuth credentials (BYO-credentials) — no intermediary server ever touches your data.

## Features

- Lists and tasks synced with your Google account (official API v1)
- Subtasks, due dates, notes, starring, and search
- Drag-and-drop reordering (within a list and across lists)
- Native Windows notifications with snooze
- Pending-count badge on the taskbar + tray icon
- Light / dark / system themes, 3 font sizes, PT-BR / EN / ES
- Shortcuts: `F5` or `Ctrl+R` to sync
- One-click NSIS installer and Portable build

## Requirements

- Node.js 20+ (see `.nvmrc`)
- Windows 10/11 x64
- Your own OAuth 2.0 credentials (**Desktop** Client ID in Google Cloud)

## Quickstart

```powershell
npm ci
Copy-Item .env.example .env
# edit .env with VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_CLIENT_SECRET
npm run dev
```

Production:

```powershell
npm run build   # tsc + vite -> dist/ + dist-electron/
npm run dist    # + electron-builder -> release/ (Setup + Portable)
```

The `dist/`, `dist-electron/`, `release/` and `node_modules/` directories are git-ignored.

## Connecting your Google account

1. Create a **Desktop** OAuth Client ID at [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials), enable the **Google Tasks API**, and add your email under **Test users** (project in Testing mode).
2. Paste the **Client ID** and **Client Secret** into `.env` (dev) or into **Settings → Google** inside the app.
3. Click **Sign in with Google** and authorize in the browser — the callback is captured locally via a `http://127.0.0.1:<port>` loopback with PKCE S256 + `state`.

> Even with PKCE, Google requires the `client_secret` in the `code → token` exchange for most Client IDs (`client_secret is missing` without it).

Full guide: [`docs/oauth-setup.md`](docs/oauth-setup.md) · Login issues: [`docs/oauth-setup.md#️-troubleshooting`](docs/oauth-setup.md#-troubleshooting)

## Scripts

| Script              | Description                                   |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Vite development server                       |
| `npm run build`     | `tsc --noEmit` + `vite build`                 |
| `npm run typecheck` | TypeScript check only                         |
| `npm start`         | `electron .` (requires a build)               |
| `npm run dist`      | build + `electron-builder --win` (NSIS+Port.) |
| `npm run dist:nsis` / `dist:portable` / `dist:dir` | Specific targets |

## Project structure

```
src/
  contracts/   Immutable types (readonly) + Result<T> — single source of truth
  services/    ITasksService, GoogleTasksService (REST), MockTasksService
  store/       Zustand with optimistic updates + rollback
  core/        Filters, RFC 3339 dates, badges, reminder scheduler
  components/  M3 UI (ui/ is headless, no store bindings)
  i18n/        PT-BR / EN / ES translations
  theme/       M3 color tokens
electron/
  main.ts            Window, tray, badge, IPC (sandbox, https allowlist)
  preload.cjs        window.electronAPI via contextBridge
  auth/googleAuth.ts PKCE OAuth loopback + safeStorage (DPAPI)
```

Details: [`docs/architecture.md`](docs/architecture.md) · [`docs/google-tasks-api.md`](docs/google-tasks-api.md) · [`docs/design-system.md`](docs/design-system.md)

## Security

- `contextIsolation` + `sandbox`, `nodeIntegration: false`
- `openExternal` restricted to `https:`, CSP in `index.html`
- Tokens in `safeStorage` (DPAPI on Windows); the session exposed to the renderer carries only the short-lived `accessToken`
- Never commit `.env` — use `.env.example` as a template. Found a vulnerability? Read [`SECURITY.md`](SECURITY.md) before opening an issue.

## Contributing

Read [`CONTRIBUTING.md`](CONTRIBUTING.md). Pipeline: `contracts → service → store (optimistic + rollback) → M3 UI`. Every PR needs a green `npm run build` (CI enforces it on Windows + Ubuntu).

## License

MIT — see [`LICENSE`](LICENSE).
