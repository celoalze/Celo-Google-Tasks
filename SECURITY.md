# Security

## Supported versions

| Version | Supported |
|---|---|
| `main` (1.x) | ✅ |

## Don't report secrets in public issues

If you committed `VITE_GOOGLE_CLIENT_ID/SECRET` or a `client_secret` (`GOCSPX-...`):

1. Revoke it immediately at `console.cloud.google.com/apis/credentials`.
2. Remove it from the code and rewrite history (`git filter-repo` or BFG).
3. Create a new Desktop credential and use a local `.env` (gitignored) or the app's Settings.

This app **never hardcodes** a `client_secret` — it comes from your local `.env` / Settings, and the desktop flow uses PKCE (RFC 8252).

## Reporting a vulnerability

Prefer private contact with the maintainer (see `package.json` author/repository). Include:

- Version/commit, OS (Windows x64), reproduction steps
- Impact (XSS, token exfiltration, RCE, DoS)
- No real tokens included

## Protections in place

- `contextIsolation`, `sandbox`, `nodeIntegration:false`
- `https:` allowlist in `openExternal`/`setWindowOpenHandler`
- CSP in `index.html`, restrictive `setPermissionRequestHandler`
- `safeStorage` (DPAPI) for tokens; no base64 fallback
- OAuth loopback on `127.0.0.1` with ephemeral port + `state` + PKCE S256
- `auth:get-session` exposes only the short-lived `accessToken` to the renderer
