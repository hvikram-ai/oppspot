# Repository Guidelines

## Project Structure & Module Organization
- `app/` Next.js app router (routes, API handlers, middleware).
- `components/` Reusable React UI; prefer colocated styles/assets.
- `lib/` Client/server utilities (API, Supabase, helpers).
- `types/` Shared TypeScript types; import via `@/` alias.
- `utils/` Small helpers; pure and testable.
- `public/` Static assets.
- `tests/` Playwright end‑to‑end specs (`*.spec.ts`).
- `scripts/` Node/TS scripts run with `tsx`.
- `supabase/` SQL/schema and related config.

## Build, Test, and Development Commands
- `npm run dev` Start local dev server (Next.js + Turbopack).
- `npm run build` Production build.
- `npm run start` Serve the production build.
- `npm run lint` Run ESLint (Next Core Web Vitals rules).
- `npm run test:e2e` Run Playwright tests headless.
- `npm run test:e2e:ui` Open Playwright UI runner.
- `npm run test:e2e:report` Show the last Playwright report.
- `npm run create-account`/`demo-login` Utility scripts (see `scripts/`).
- `npm run ollama:setup|start|test` Local LLM integration helpers.

## Coding Style & Naming Conventions
- Language: TypeScript (`strict: true`). Path alias: `@/*`.
- Components: PascalCase names; files kebab‑case (e.g., `business-card.tsx`).
- Indentation: 2 spaces; keep lines concise; no unused exports.
- Linting: ESLint flat config (`next/core-web-vitals`, TS). Fix issues before PR.
- Formatting: Prettier (with Tailwind plugin installed). Example: `npx prettier --write .`.
- Tailwind: Prefer utility classes; keep class lists ordered logically.

## Testing Guidelines
- E2E: Playwright specs in `tests/` named `*.spec.ts`.
- Run locally: `npm run test:e2e` or `:ui` during development.
- Write stable selectors; avoid brittle text matches when possible.
- Add tests for new routes, forms, and critical flows (auth, search, map).

## Commit & Pull Request Guidelines
- Commits: Imperative mood; concise subject. Optional prefix: `feat:`, `fix:`, `chore:`, `docs:`.
- PRs: Clear description, scope, and rationale. Link issues, attach UI screenshots for visual changes, note env or migration steps.
- Required before opening PR: `npm run lint` and Playwright green locally.

## Security & Configuration Tips
- Secrets in `.env.local` (copy from `.env.example`). Never commit `.env*`.
- Supabase keys and external API keys must be set for e2e tests.
- Avoid logging sensitive data; scrub PII in errors and analytics.
