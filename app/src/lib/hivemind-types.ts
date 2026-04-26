export interface Strategy {
  title: string;
  summary: string;
  risk_score: number;
  cost_score: number;
  speed_score: number;
}

export interface CausalNode {
  id: string;
  label: string;
}

export interface CausalEdge {
  source: string;
  target: string;
  relationship: string;
}

export interface CausalGraph {
  nodes: CausalNode[];
  edges: CausalEdge[];
}

export interface Impact {
  ate: number;
  confidence: string;
}

export interface RunResponse {
  run_id: string;
  strategies: Strategy[];
  causal_graph: CausalGraph;
  impact: Impact;
}

export interface HistoryEntry {
  id: string;
  runId: string;
  timestamp: number;
  taskExcerpt: string;
  taskFull: string;
  ate: number;
  confidence: string;
  strategyCount: number;
  payload: RunResponse;
}

export type ExecutionPhaseStatus = "queued" | "running" | "done" | "error";

export interface ExecutionEvent {
  id: string;
  phase: string;
  message: string;
  status: ExecutionPhaseStatus;
  ts: number;
  durationMs?: number;
}