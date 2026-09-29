# Contributing

## Workflow

1. Open an issue describing the problem/improvement.
2. Create a `feat/...` or `fix/...` branch.
3. Follow the pipeline: `contracts → service → store (optimistic + rollback) → M3 UI`.
4. Run `npm run build` (tsc + vite) — it must pass with 0 errors.
5. Open a PR with evidence (screenshots, test steps).

## Rules

- `src/contracts/`: everything `readonly`, no `React/DOM/Electron`, no `any`.
- `src/services/`: every async method returns `Promise<Result<T>>`, never `throw` to the caller; dates in RFC 3339 (`toGoogleDueIso`).
- `src/store/`: optimistic update + rollback on `!ok`/`catch`; listener cleanup.
- `src/components/`: M3 tokens (`bg-m3-*`, `rounded-m3-*`), state layers `hover:/active:/focus-visible`, no hardcoded hex, no store bindings in `ui/`.
- `electron/`: `contextIsolation/sandbox`, https allowlist, no secret logging.
- Zero dead code, zero new `any`, zero hardcoded hex in templates.
