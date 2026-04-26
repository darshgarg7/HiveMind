import { z } from "zod";
import type { RunResponse } from "./hivemind-types";

export const StrategySchema = z.object({
  title: z.string().min(1),
  summary: z.string(),
  risk_score: z.number().min(0).max(1),
  cost_score: z.number().min(0).max(1),
  speed_score: z.number().min(0).max(1),
});

export const CausalNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
});

export const CausalEdgeSchema = z.object({
  source: z.string().min(1),
  target: z.string().min(1),
  relationship: z.string(),
});

export const CausalGraphSchema = z.object({
  nodes: z.array(CausalNodeSchema),
  edges: z.array(CausalEdgeSchema),
});

export const ImpactSchema = z.object({
  ate: z.number().finite(),
  confidence: z.string().min(1),
});

export const RunResponseSchema = z.object({
  run_id: z.string().min(1),
  strategies: z.array(StrategySchema),
  causal_graph: CausalGraphSchema,
  impact: ImpactSchema,
});

export interface SchemaIssue {
  path: string;
  message: string;
  code: string;
}

export class SchemaValidationError extends Error {
  issues: SchemaIssue[];
  raw: unknown;

  constructor(issues: SchemaIssue[], raw: unknown) {
    super(`Backend response failed validation: ${issues.length} issue(s)`);
    this.name = "SchemaValidationError";
    this.issues = issues;
    this.raw = raw;
  }
}

export function parseRunResponse(raw: unknown): RunResponse {
  const result = RunResponseSchema.safeParse(raw);
  if (!result.success) {
    const issues: SchemaIssue[] = result.error.issues.map((i) => ({
      path: i.path.length ? i.path.map(String).join(".") : "(root)",
      message: i.message,
      code: i.code,
    }));
    throw new SchemaValidationError(issues, raw);
  }
  return result.data;
}