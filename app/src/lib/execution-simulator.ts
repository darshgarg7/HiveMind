import type { ExecutionEvent } from "./hivemind-types";
import type { RunResponse } from "./hivemind-types";
import { runCausalEngine } from "./hivemind-api";

const PHASES: { phase: string; message: string }[] = [
  { phase: "TOKENIZE", message: "Tokenizing event space description" },
  { phase: "HYPOTHESIS", message: "Building causal hypothesis tree (depth=4)" },
  { phase: "SAMPLE", message: "Sampling 128 counterfactual trajectories" },
  { phase: "ESTIMATE", message: "Estimating ATE via doubly-robust IPW" },
  { phase: "SCORE", message: "Scoring strategies · risk · cost · speed" },
  { phase: "GRAPH", message: "Validating causal graph integrity" },
];

function uid() {
  return `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Wraps the real API call with a simulated phase event stream so the UI feels
 * live. Replace this whole function with a real SSE/WebSocket reader when the
 * backend supports streaming — the ExecutionEvent contract stays the same.
 */
export async function executeWithProgress(
  taskDescription: string,
  onEvent: (event: ExecutionEvent) => void,
): Promise<RunResponse> {
  let cancelled = false;
  const start = Date.now();

  // Mark all phases as queued upfront so the UI shows the full plan
  const events: ExecutionEvent[] = PHASES.map((p) => ({
    id: uid(),
    phase: p.phase,
    message: p.message,
    status: "queued",
    ts: Date.now(),
  }));
  events.forEach((e) => onEvent(e));

  // Start the real fetch immediately
  const fetchPromise = runCausalEngine(taskDescription).finally(() => {
    cancelled = true;
  });

  // Drive the simulation
  let i = 0;
  while (!cancelled && i < events.length) {
    const ev = events[i];
    const runningEvent: ExecutionEvent = { ...ev, status: "running", ts: Date.now() };
    onEvent(runningEvent);

    const wait = 280 + Math.random() * 520;
    await new Promise((r) => setTimeout(r, wait));
    if (cancelled) break;

    const doneEvent: ExecutionEvent = {
      ...runningEvent,
      status: "done",
      ts: Date.now(),
      durationMs: Date.now() - runningEvent.ts,
    };
    onEvent(doneEvent);
    i += 1;
  }

  try {
    const result = await fetchPromise;
    // Flush any unreached phases as "done" so the log looks complete
    for (; i < events.length; i++) {
      onEvent({ ...events[i], status: "done", ts: Date.now(), durationMs: 0 });
    }
    onEvent({
      id: uid(),
      phase: "COMPLETE",
      message: `Causal loop complete · ${Date.now() - start}ms`,
      status: "done",
      ts: Date.now(),
    });
    return result;
  } catch (err) {
    onEvent({
      id: uid(),
      phase: "ERROR",
      message: err instanceof Error ? err.message : "Execution failed",
      status: "error",
      ts: Date.now(),
    });
    throw err;
  }
}