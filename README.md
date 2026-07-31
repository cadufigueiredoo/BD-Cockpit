# Demand Gen Ops · Cockpit

A practical demand generation operations tool: upload a real CRM export (CSV/XLSX),
map the columns, and get a live cockpit — funnel health, data quality, BDR
attainment, and an AI-generated Weekly Business Review. A Preset mode loads a
fully pre-filled, already-run snapshot for demonstration.

Numbers are computed deterministically in the client; the AI layer only narrates.

## Status

The UI is built and wired to the deterministic core — the app runs end-to-end.

- `src/main.tsx`, `src/App.tsx` — shell: view (import | cockpit), PT/EN toggle, Light/Dark toggle, Load preset.
- `src/ingest/` — `parseFile` (CSV via PapaParse, XLSX via SheetJS), header + stage auto-mapping, `applyMapping` (Zod-validated, provenance-tagged, surfaces `ValidationIssue[]`, tolerant date/number parsing), and the upload dataset assembler.
- `src/components/` — `Cockpit`, `ImportWizard`, panels (`KpiRow`, `FunnelPanel`, `QualityPanel`, `BdrPanel`, `WbrPanel`) and `ui/` atoms.
- `api/narrate.ts` — Vercel Node serverless narrator: env-configurable model, retry with backoff, upstream-error mapping (401/402/429/5xx), abort timeout, and tolerant JSON extraction for truncated responses.

Quality/staleness use a passed-in reference date (fixed for the preset so the demo
is deterministic, "now" for uploads). `npm run typecheck`, `npm run test`, and
`npm run build` are all green.

## Run

```bash
npm install
npm run test        # deterministic core suite
npm run dev         # cockpit on the preset (import path also works)
```

The WBR narrative (`/api/narrate`) only runs on Vercel's runtime. To exercise it
locally, use `vercel dev` instead of `npm run dev`; otherwise the panel shows a
graceful error message and the rest of the app works offline.

## Deploy (Vercel)

1. Import the repo; the framework preset is detected as **Vite**.
2. Set env vars before the first deploy:
   - `ANTHROPIC_API_KEY` — your key from console.anthropic.com
   - `ANTHROPIC_MODEL` — optional model override (defaults to `claude-sonnet-4-6`)
3. Deploy. `vercel.json` sets `maxDuration: 60` for `api/narrate.ts`.

Developed by Carlos Eduardo · linkedin.com/in/carloseduardovf
