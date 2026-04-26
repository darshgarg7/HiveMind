import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { TECHNIQUES, tacticById, type Technique, type TacticId } from "@/lib/mitre-catalog";
import type { CausalEdge, CausalNode, RunResponse, Strategy } from "@/lib/hivemind-types";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Bypass-Tunnel-Reminder",
  "Access-Control-Max-Age": "86400",
};

const RunInputSchema = z.object({
  task_description: z.string().trim().min(20).max(12_000),
});

export const Route = createFileRoute("/run")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async () =>
        Response.json(
          {
            ok: true,
            service: "hivemind-causal-engine",
            endpoint: "/run",
            accepts: { method: "POST", body: { task_description: "string" } },
          },
          { headers: CORS_HEADERS },
        ),
      POST: async ({ request }) => {
        try {
          const raw = await request.json().catch(() => null);
          const parsed = RunInputSchema.safeParse(raw);

          if (!parsed.success) {
            return Response.json(
              {
                error: "Invalid run request",
                issues: parsed.error.issues.map((issue) => ({
                  path: issue.path.join(".") || "(root)",
                  message: issue.message,
                })),
              },
              { status: 400, headers: CORS_HEADERS },
            );
          }

          return Response.json(buildRunResponse(parsed.data.task_description), {
            headers: {
              ...CORS_HEADERS,
              "X-HiveMind-Backend": "internal-run-engine",
            },
          });
        } catch (error) {
          return Response.json(
            {
              error: "Run execution failed",
              message: error instanceof Error ? error.message : "Unknown backend error",
            },
            { status: 500, headers: CORS_HEADERS },
          );
        }
      },
    },
  },
});

function buildRunResponse(taskDescription: string): RunResponse {
  const seed = hash32(taskDescription);
  const rand = rng(seed);
  const techniques = extractTechniques(taskDescription);
  const fields = parseFields(taskDescription);
  const causal_graph = buildGraph(taskDescription, techniques, fields);
  const strategies = buildStrategies(taskDescription, techniques, fields, rand);
  const confidence = confidenceLabel(taskDescription, techniques.length, causal_graph.edges.length);

  return {
    run_id: `hm-${Date.now().toString(36)}-${seed.toString(36)}`,
    strategies,
    causal_graph,
    impact: {
      ate: Number((0.38 + Math.min(0.42, techniques.length * 0.035) + rand() * 0.08).toFixed(2)),
      confidence,
    },
  };
}

function parseFields(text: string) {
  return {
    asset: readField(text, "Asset / Target") || readField(text, "Asset"),
    actor: readField(text, "Threat Actor"),
    objective: readField(text, "Attack Objective"),
    vector: readField(text, "Entry Vector"),
    environment: readField(text, "Environment"),
    impact: readField(text, "Expected Impact"),
    gaps: readField(text, "Detection Gaps"),
  };
}

function readField(text: string, label: string): string {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`${escaped}:\\s*([^\n]+(?:\\n(?![A-Za-z /&]+:).+)*)`, "i"));
  return match?.[1]?.trim() ?? "";
}

function extractTechniques(text: string): Technique[] {
  const lower = text.toLowerCase();
  const explicitIds = Array.from(text.matchAll(/T\d{4}(?:\.\d{3})?/gi)).map((m) =>
    m[0].toUpperCase(),
  );

  const scored = TECHNIQUES.map((tech) => {
    const explicit = explicitIds.includes(tech.id.toUpperCase()) ? 8 : 0;
    const keywordScore = tech.keywords.reduce(
      (sum, keyword) => sum + (lower.includes(keyword.toLowerCase()) ? 1 : 0),
      0,
    );
    return { tech, score: explicit + keywordScore };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      const tacticDelta = tacticById(a.tech.tactic).order - tacticById(b.tech.tactic).order;
      return tacticDelta || b.score - a.score || a.tech.id.localeCompare(b.tech.id);
    });

  const selected = scored.map((item) => item.tech);
  if (selected.length === 0) {
    return fallbackTechniques(text);
  }

  return dedupeTechniques(selected).slice(0, 10);
}

function fallbackTechniques(text: string): Technique[] {
  const lower = text.toLowerCase();
  const ids = /cloud|entra|aws|azure|sso|okta/.test(lower)
    ? ["T1078", "T1078.004", "T1018", "T1213"]
    : ["T1190", "T1018", "T1021.002", "T1213"];
  return ids
    .map((id) => TECHNIQUES.find((tech) => tech.id === id))
    .filter((tech): tech is Technique => Boolean(tech));
}

function dedupeTechniques(techniques: Technique[]): Technique[] {
  const seen = new Set<string>();
  return techniques.filter((tech) => {
    if (seen.has(tech.id)) return false;
    seen.add(tech.id);
    return true;
  });
}

function buildGraph(
  taskDescription: string,
  techniques: Technique[],
  fields: ReturnType<typeof parseFields>,
): { nodes: CausalNode[]; edges: CausalEdge[] } {
  const nodes: CausalNode[] = [
    { id: "intent", label: compactLabel(fields.objective || fields.actor || "Adversarial intent") },
    { id: "entry", label: compactLabel(fields.vector || "Initial access opportunity") },
  ];

  const edges: CausalEdge[] = [{ source: "intent", target: "entry", relationship: "selects viable entry path" }];

  let previous = "entry";
  for (const tech of techniques) {
    const id = nodeId(tech.id);
    nodes.push({ id, label: `${tech.id} · ${tech.name}` });
    edges.push({ source: previous, target: id, relationship: relationshipFor(tech.tactic) });
    previous = id;
  }

  nodes.push({
    id: "impact",
    label: compactLabel(fields.impact || fields.asset || taskDescription),
  });
  edges.push({ source: previous, target: "impact", relationship: "causally increases business impact" });

  return { nodes, edges };
}

function buildStrategies(
  taskDescription: string,
  techniques: Technique[],
  fields: ReturnType<typeof parseFields>,
  rand: () => number,
): Strategy[] {
  const tactics = new Set<TacticId>(techniques.map((tech) => tech.tactic));
  const hasIdentity = tactics.has("credential-access") || /sso|entra|okta|session|credential/i.test(taskDescription);
  const hasExfil = tactics.has("exfiltration") || /exfil|leak|dlp|data/i.test(taskDescription);
  const hasImpact = tactics.has("impact") || /ransom|encrypt|destruct|outage/i.test(taskDescription);

  const strategies: Strategy[] = [
    scoreStrategy(
      "Quarantine entry vector and preserve volatile evidence",
      `Isolate the path described as ${fields.vector || "the suspected initial access vector"}; snapshot logs before containment so causality can be audited.`,
      0.32,
      0.42,
      0.82,
      rand,
    ),
    scoreStrategy(
      hasIdentity ? "Revoke sessions and constrain privilege edges" : "Constrain lateral movement blast radius",
      hasIdentity
        ? "Invalidate active sessions, rotate privileged credentials, and force phishing-resistant re-auth for impacted trust zones."
        : "Apply temporary segmentation between impacted hosts and crown-jewel services while preserving analyst access paths.",
      hasIdentity ? 0.24 : 0.36,
      hasIdentity ? 0.5 : 0.38,
      hasIdentity ? 0.74 : 0.66,
      rand,
    ),
    scoreStrategy(
      hasExfil ? "Instrument egress chokepoints and stage legal hold" : "Increase telemetry on weak causal links",
      hasExfil
        ? "Enable high-sensitivity DLP/CASB detections for the named asset and retain outbound transfer evidence for regulator review."
        : `Close the stated blind spot (${fields.gaps || "unknown detection gap"}) before trusting inferred graph edges.`,
      hasExfil ? 0.28 : 0.41,
      hasExfil ? 0.46 : 0.3,
      hasExfil ? 0.62 : 0.58,
      rand,
    ),
    scoreStrategy(
      hasImpact ? "Stage recovery cutover and backup integrity checks" : "Run counterfactual validation before eradication",
      hasImpact
        ? "Validate restore points, isolate backup control planes, and pre-authorize a cutover window for the impacted business service."
        : "Test whether removing the highest-confidence edge breaks the projected attack path before committing disruptive controls.",
      hasImpact ? 0.22 : 0.34,
      hasImpact ? 0.68 : 0.24,
      hasImpact ? 0.45 : 0.52,
      rand,
    ),
  ];

  return strategies;
}

function scoreStrategy(
  title: string,
  summary: string,
  risk: number,
  cost: number,
  speed: number,
  rand: () => number,
): Strategy {
  const jitter = () => (rand() - 0.5) * 0.08;
  return {
    title,
    summary,
    risk_score: clamp01(Number((risk + jitter()).toFixed(2))),
    cost_score: clamp01(Number((cost + jitter()).toFixed(2))),
    speed_score: clamp01(Number((speed + jitter()).toFixed(2))),
  };
}

function relationshipFor(tactic: TacticId): string {
  const labels: Partial<Record<TacticId, string>> = {
    "initial-access": "enables initial foothold",
    execution: "executes adversary-controlled code",
    persistence: "maintains access across response windows",
    "privilege-escalation": "raises effective privilege",
    "defense-evasion": "reduces detection probability",
    "credential-access": "unlocks identity pivot",
    discovery: "reveals reachable attack surface",
    "lateral-movement": "expands compromise boundary",
    collection: "stages target data",
    "command-and-control": "sustains remote control",
    exfiltration: "moves data outside trust boundary",
    impact: "materializes operational harm",
  };
  return labels[tactic] ?? `advances ${tacticById(tactic).label.toLowerCase()}`;
}

function confidenceLabel(text: string, techniqueCount: number, edgeCount: number): string {
  const fieldSignals = ["Asset / Target", "Threat Actor", "Attack Objective", "Entry Vector", "Environment", "Detection Gaps"].filter(
    (label) => text.toLowerCase().includes(label.toLowerCase()),
  ).length;
  const score = fieldSignals + techniqueCount + edgeCount * 0.2;
  if (score >= 13) return "high";
  if (score >= 7) return "medium";
  return "low";
}

function compactLabel(value: string): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > 80 ? `${clean.slice(0, 77)}…` : clean || "Unspecified node";
}

function nodeId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function hash32(value: string): number {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function rng(seed: number) {
  let state = seed || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}