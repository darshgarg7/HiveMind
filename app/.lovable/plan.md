# HiveMind Causal Engine Dashboard

Build a premium, dark-mode cybersecurity dashboard that talks to a local FastAPI backend at `http://localhost:8000/run`.

## Visual Direction

- **Theme:** Deep dark (near-black slate `#05070d` background) with neon cyan/violet accents for a futuristic SOC/cyber feel.
- **Effects:** Glass-morphism cards (`backdrop-blur`, translucent borders), subtle animated gradient glows, grid background, glowing primary CTA button.
- **Typography:** Clean sans-serif for body, monospace tabular numerals for metrics/scores.
- **Icons:** Lucide (Shield, Zap, Brain, GitBranch, AlertTriangle, Activity, Target, etc.).
- **Responsive:** Mobile-first; strategies grid collapses 3→2→1 columns.

## Layout

```text
┌──────────────────────────────────────────────────────────┐
│  HiveMind Causal Engine  [logo + tagline]                │
├──────────────────────────────────────────────────────────┤
│  INPUT PANEL (glass card)                                │
│   ┌────────────────────────────────────────────────┐     │
│   │ Textarea: Massive Event Space Description...   │     │
│   └────────────────────────────────────────────────┘     │
│         [ ⚡ Initialize Causal Execution ]  (glow)       │
├──────────────────────────────────────────────────────────┤
│  RESULTS (only after first run)                          │
│   Run ID: hm_xxx                                         │
│                                                          │
│   ┌──── Impact (ATE) ────┐  ┌── Confidence ──┐           │
│   │   1.25  ↑            │  │  ● HIGH        │           │
│   └──────────────────────┘  └────────────────┘           │
│                                                          │
│   Strategies                                             │
│   ┌──────┐ ┌──────┐ ┌──────┐                             │
│   │ card │ │ card │ │ card │   risk/cost/speed bars      │
│   └──────┘ └──────┘ └──────┘                             │
│                                                          │
│   Causal Graph                                           │
│   ├ Nodes table                                          │
│   └ Edges table (source → relationship → target)         │
└──────────────────────────────────────────────────────────┘
```

## Functionality

1. **Input panel**
   - Large auto-resizing textarea (min ~6 rows) with placeholder example threat scenario.
   - Primary "Initialize Causal Execution" button: gradient + box-shadow glow, pulse on hover, disabled while loading.
   - Loading state swaps label to "Executing Loop..." with a spinning Lucide `Loader2` icon.
   - Submitting empty input shows an inline validation toast.

2. **API call**
   - `POST http://localhost:8000/run` with `{ "task_description": <textarea value> }`.
   - Handles non-2xx responses and network errors with a clear error card (red-tinted glass panel + retry hint), plus a `sonner` toast.
   - 60s timeout via `AbortController`.

3. **Metrics bar**
   - **ATE card:** large monospace number, up/down arrow + color (green if `ate > 0`, red if `< 0`, neutral if 0).
   - **Confidence badge:** pill with dot — green/emerald glow for `high`, red/rose glow for `low`, amber fallback for any other value.

4. **Strategies grid**
   - Responsive grid (1/2/3 cols).
   - Each card: title, summary, and three score rows (risk/cost/speed) rendered as horizontal progress bars with the numeric value and a Lucide icon (`ShieldAlert`, `DollarSign`, `Gauge`).
   - Bar colors: risk = rose, cost = amber, speed = emerald. Width = `score * 100%`.

5. **Causal graph summary**
   - Two sub-panels in one card:
     - **Nodes:** table of `id` (mono) + `label`.
     - **Edges:** table `source → relationship → target` with arrow icon.
   - Scrollable when long.

6. **Empty / error states**
   - Before first run: subtle placeholder beneath input ("Awaiting first execution loop…").
   - Error: glass card with `AlertTriangle` icon and the error message; results from previous successful run remain visible.

## Technical Details

- **Routing:** Replace placeholder content in `src/routes/index.tsx` with the dashboard. Single-page experience — no extra routes needed.
- **Components** (under `src/components/hivemind/`):
  - `InputPanel.tsx` — textarea + submit button.
  - `MetricsBar.tsx` — ATE card + confidence badge.
  - `StrategyCard.tsx` + `StrategiesGrid.tsx`.
  - `CausalGraphPanel.tsx` — nodes/edges tables.
  - `ScoreBar.tsx` — reusable progress bar.
- **Types:** `src/lib/hivemind-types.ts` with `RunResponse`, `Strategy`, `CausalNode`, `CausalEdge`, `Impact`.
- **API client:** `src/lib/hivemind-api.ts` exporting `runCausalEngine(taskDescription: string): Promise<RunResponse>` using `fetch` + `AbortController`.
- **State:** Local `useState` in the index route for `loading`, `error`, `result`. No global store needed.
- **Styling:** Extend `src/styles.css` with a few cyber-themed CSS variables (neon cyan `--neon`, neon violet `--neon-2`, deep bg) and utility classes (`.glass`, `.glow-primary`, animated grid background). Force dark mode by adding `class="dark"` to `<html>` in `__root.tsx` shell.
- **UI primitives:** Reuse existing shadcn `Button`, `Textarea`, `Card`, `Badge`, `Table`, `Progress`, `Sonner` toaster.
- **Toaster:** Mount `<Toaster />` from `sonner` inside the root component.
- **Icons:** `lucide-react` already available.

## Notes / Caveats

- The backend at `http://localhost:8000` is on the user's machine. The Lovable preview runs in the browser, so the request goes from the user's browser → their localhost, which works as long as the user runs the dashboard on the same machine they run the backend on. CORS must be enabled on the FastAPI side (`allow_origins=["*"]` or the preview origin) — if requests fail with CORS, the error card will surface that.
- No auth, no persistence of runs (in-memory only for this version).
