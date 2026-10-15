# Architecture

OmniWatch is a Next.js (App Router) application. Visitor-facing routes are `/`, `/enforcement`, `/case/[id]`, `/cases`, and `/present`; `POST /api/classify-event` is an on-demand server route used only for custom-event interpretation.

`/` and `/enforcement` are the primary product flow's dossier and policy-configuration stages. `/case/[id]` runs the historical simulation. `/cases` (a plain archive listing) and `/present` (a static anonymous present-day timeline) are secondary routes, not part of the primary flow.

## Data and logic

- `data/cases.ts` is the validated, immutable local case register (`zod`-validated). `threshold` is a constrained integer (1–100), not fixed to 70 — Luther's canonical default is 70, but a visitor-chosen threshold can be applied without mutating this data.
- `lib/simulation.ts` derives the current state and performs the state transitions: continue monitoring, intervene, show outcome. It also exports `withThreshold(caseData, threshold)`, a pure helper that returns a new case object with an overridden threshold, used to apply a visitor's chosen intervention threshold without mutating the canonical case.
- `lib/browser-signals.ts` reads six real, browser-visible categories (timezone, language, browser environment, screen context, device capability, network type). No React dependency; no fingerprinting (no canvas/WebGL reads), no storage, and no network calls.
- `lib/classification.ts` computes deterministic built-in-event indices. `lib/custom-event.ts` validates custom-event assessments and deterministically computes browser-context relevance from material (`MODERATE` or `STRONG`) category relevance only. Weak associations, the number of observed signals, and policy activation add no points. It is not a prediction of intent.
- `app/api/classify-event/route.ts` sends only custom event text plus generic category names to Groq, using `GROQ_API_KEY` solely on the server. Groq separately returns a surface-language flag and strict structured browser-category relevance assessments; it never returns a final index or intervention decision. The language flag describes wording only and does not claim intent or credibility. Raw browser values are never sent. If the key, provider, or response is unavailable, custom classification stops and visibly reports that it is unavailable.
- `lib/operator-context.ts` is the only cross-page persistence: a small `sessionStorage`-backed record (dossier ID, observed signal count, selected behaviour, trained flag, classification index, chosen intervention threshold) carried from `/` through `/enforcement` into `/case/[id]`. Raw signals (e.g. user agent) are never persisted.
- `components/SelfDossier.tsx` renders `/`, composing `lib/browser-signals.ts` and `lib/classification.ts`.
- `components/Simulation.tsx` renders the historical case, applying `withThreshold` with the visitor's configured threshold (read from `lib/operator-context.ts`) before passing the effective case to the existing simulation logic.

## Visual layer

The particle face is isolated in `components/OmniWatchFace.tsx`, `components/scene/`, and `lib/particles.ts`. It has no dependency on case data, simulation state, or the dossier/classification logic — it accepts only a generic `state`/`size` prop.

There is no database, authentication, or background process. The only AI integration is the disclosed, opt-in custom-event interpretation route above.
