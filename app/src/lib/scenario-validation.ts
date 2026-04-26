import { TECHNIQUES, tacticById, type TacticId } from "./mitre-catalog";
import type { FieldKey, ScenarioState } from "./scenario-builder";

export type Severity = "error" | "warning" | "info";

export interface ValidationIssue {
  id: string;
  severity: Severity;
  /** Short label shown in the checklist row. */
  title: string;
  /** One-line explanation of the problem. */
  detail: string;
  /** Concrete suggested fix the analyst can act on. */
  fix: string;
  /** Field to scroll/focus when the analyst clicks "Fix". */
  field?: FieldKey;
  /** TTPs to add when the analyst clicks "Fix" (for chain-conflict issues). */
  addTtpIds?: string[];
  /** TTPs to remove when the analyst clicks "Fix". */
  removeTtpIds?: string[];
}

export interface ValidationResult {
  issues: ValidationIssue[];
  errors: number;
  warnings: number;
  /** True iff there are zero errors — Run is allowed. */
  canRun: boolean;
  /** Score 0..100 — pure visual confidence. */
  score: number;
}

const REQUIRED_FIELDS: { key: FieldKey; label: string }[] = [
  { key: "asset", label: "Asset / Target System" },
  { key: "objective", label: "Attack Objective" },
  { key: "vector", label: "Entry Vector" },
];

/**
 * Real-time validator for the Threat Scenario Builder.
 * Pure, fast (<1ms), runs on every render via useMemo.
 */
export function validateScenario(
  state: ScenarioState,
  ttpIds: string[],
): ValidationResult {
  const issues: ValidationIssue[] = [];

  // ---------- Required fields (errors) ----------
  for (const { key, label } of REQUIRED_FIELDS) {
    const v = state[key]?.trim() ?? "";
    if (v.length === 0) {
      issues.push({
        id: `missing-${key}`,
        severity: "error",
        title: `${label} required`,
        detail: `${label} is empty. The engine cannot reason about a scenario without it.`,
        fix: `Add a one-line ${label.toLowerCase()}.`,
        field: key,
      });
    } else if (v.length < 10) {
      issues.push({
        id: `thin-${key}`,
        severity: "warning",
        title: `${label} too thin`,
        detail: `${label} is under 10 characters — likely too vague for the engine to use.`,
        fix: `Expand to at least one full clause (system, scope, or constraint).`,
        field: key,
      });
    }
  }

  // ---------- TTPs required ----------
  if (ttpIds.length === 0) {
    issues.push({
      id: "ttps-missing",
      severity: "error",
      title: "No MITRE ATT&CK techniques mapped",
      detail: "An empty kill chain produces no causal graph and no ranked strategies.",
      fix: "Pick a scenario from the library, click Decompose now, or add at least one technique chip.",
      field: "ttps",
    });
  } else if (ttpIds.length === 1) {
    issues.push({
      id: "ttps-thin",
      severity: "warning",
      title: "Only 1 technique mapped",
      detail: "Single-step chains rarely produce useful counterfactual analysis.",
      fix: "Add at least one Initial Access + one Impact technique to form a chain.",
      field: "ttps",
    });
  }

  // ---------- Conflict: actor vs vector ----------
  const actor = state.actor.toLowerCase();
  const vector = state.vector.toLowerCase();
  if (
    actor &&
    vector &&
    /\binsider|departing|employee|contractor\b/.test(actor) &&
    /\b(0[- ]?day|zero[- ]?day|exploit|rce|cve|perimeter|vpn appliance)\b/.test(vector)
  ) {
    issues.push({
      id: "conflict-insider-exploit",
      severity: "warning",
      title: "Actor / Vector conflict",
      detail: "Actor is described as an insider, but Entry Vector describes external exploitation (0-day / RCE).",
      fix: "Either reclassify the actor as external attacker, or change vector to legitimate authenticated access.",
      field: "vector",
    });
  }
  if (
    actor &&
    vector &&
    /\bnation[- ]state|apt|state[- ]sponsored\b/.test(actor) &&
    /\bphishing|invoice fraud|bec\b/.test(vector) === false &&
    /\bphish/.test(vector)
  ) {
    // (rare) — drop, no real conflict
  }

  // ---------- Conflict: ransomware objective without Impact technique ----------
  const objective = state.objective.toLowerCase();
  const hasImpactTech = ttpIds.some((id) => {
    const t = TECHNIQUES.find((x) => x.id === id);
    return t?.tactic === "impact";
  });
  if (/\bransomware|encrypt|destroy|wipe\b/.test(objective) && !hasImpactTech) {
    issues.push({
      id: "conflict-ransom-no-impact",
      severity: "error",
      title: "Ransomware objective has no Impact technique",
      detail: "Objective implies destructive impact, but no MITRE Impact tactic technique is in the chain.",
      fix: "Add T1486 (Data Encrypted for Impact) and T1490 (Inhibit System Recovery).",
      addTtpIds: ["T1486", "T1490"],
      field: "ttps",
    });
  }

  // ---------- Conflict: exfil objective without exfil technique ----------
  if (
    /\bexfil|data theft|leak|steal data\b/.test(objective) &&
    !ttpIds.some((id) => TECHNIQUES.find((x) => x.id === id)?.tactic === "exfiltration")
  ) {
    issues.push({
      id: "conflict-exfil-no-tech",
      severity: "warning",
      title: "Exfiltration objective has no Exfil technique",
      detail: "Objective references data theft, but no Exfiltration tactic technique is mapped.",
      fix: "Add T1041 (Exfil over C2) or T1567.002 (to Cloud Storage).",
      addTtpIds: ["T1041"],
      field: "ttps",
    });
  }

  // ---------- Chain integrity: missing Initial Access ----------
  if (ttpIds.length > 0) {
    const tacticsPresent = new Set<TacticId>(
      ttpIds
        .map((id) => TECHNIQUES.find((x) => x.id === id)?.tactic)
        .filter((t): t is TacticId => Boolean(t)),
    );
    if (!tacticsPresent.has("initial-access")) {
      issues.push({
        id: "chain-no-initial-access",
        severity: "warning",
        title: "Chain missing Initial Access",
        detail: "No technique in the Initial Access tactic — the chain has no defined starting point.",
        fix: "Add T1566.001 (Spearphishing), T1190 (Exploit Public-Facing App), or T1078 (Valid Accounts).",
        field: "ttps",
      });
    }
    // ---------- Conflict: lateral movement without credential access ----------
    if (tacticsPresent.has("lateral-movement") && !tacticsPresent.has("credential-access")) {
      issues.push({
        id: "chain-lateral-no-creds",
        severity: "warning",
        title: "Lateral movement without credential access",
        detail: "Real intrusions almost always dump or steal credentials before moving laterally.",
        fix: "Add T1003.001 (LSASS Memory) or T1539 (Steal Web Session Cookie).",
        addTtpIds: ["T1003.001"],
        field: "ttps",
      });
    }
    // ---------- Conflict: impact-only chain ----------
    if (
      tacticsPresent.has("impact") &&
      tacticsPresent.size === 1
    ) {
      issues.push({
        id: "chain-impact-only",
        severity: "error",
        title: "Chain is Impact-only",
        detail: "An attacker cannot reach Impact without Initial Access first. The chain is unrealistic.",
        fix: "Add at least one Initial Access technique upstream.",
        field: "ttps",
      });
    }
    // ---------- Conflict: discovery / collection without initial access execution ----------
    if (
      tacticsPresent.has("collection") &&
      !tacticsPresent.has("initial-access") &&
      !tacticsPresent.has("execution") &&
      !tacticsPresent.has("credential-access")
    ) {
      issues.push({
        id: "chain-collection-orphan",
        severity: "warning",
        title: "Collection step without prior access",
        detail: "Data collection assumes the adversary has already established a foothold.",
        fix: "Add an Initial Access or Credential Access technique.",
        field: "ttps",
      });
    }
    // ---------- Duplicate techniques ----------
    const dupes = ttpIds.filter((id, i) => ttpIds.indexOf(id) !== i);
    if (dupes.length > 0) {
      issues.push({
        id: "ttps-duplicates",
        severity: "warning",
        title: `Duplicate technique${dupes.length > 1 ? "s" : ""}: ${Array.from(new Set(dupes)).join(", ")}`,
        detail: "The same technique is listed more than once in the kill chain.",
        fix: "Remove the duplicate chip(s).",
        removeTtpIds: Array.from(new Set(dupes)),
        field: "ttps",
      });
    }
  }

  // ---------- Detection gaps reference field that doesn't exist in environment ----------
  const env = state.environment.toLowerCase();
  const gaps = state.detection_gaps.toLowerCase();
  if (
    gaps &&
    /\bedr\b/.test(gaps) &&
    env &&
    !/\bedr|crowdstrike|defender|sentinel|carbon\b/.test(env)
  ) {
    issues.push({
      id: "conflict-edr-gap-no-edr",
      severity: "info",
      title: "Detection gap references EDR but Environment doesn't list one",
      detail: "Make environment + gaps consistent so the engine can weight coverage.",
      fix: "Add your EDR product to Environment, or rephrase the gap.",
      field: "environment",
    });
  }

  // ---------- Info: no detection gaps stated ----------
  if (state.detection_gaps.trim().length === 0 && ttpIds.length > 0) {
    issues.push({
      id: "info-no-gaps",
      severity: "info",
      title: "Detection Gaps not specified",
      detail: "Without gaps, the engine assumes uniform coverage and downweights containment options.",
      fix: "Add at least one blind spot — even 'EDR not deployed on jump hosts' helps.",
      field: "detection_gaps",
    });
  }

  // ---------- Info: no environment ----------
  if (state.environment.trim().length === 0 && ttpIds.length > 0) {
    issues.push({
      id: "info-no-env",
      severity: "info",
      title: "Environment / posture not described",
      detail: "Identity provider, EDR, segmentation posture all change strategy ranking.",
      fix: "Add a one-liner — e.g. 'Entra ID + Defender XDR, partial segmentation'.",
      field: "environment",
    });
  }

  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const infos = issues.filter((i) => i.severity === "info").length;

  // Score: 100 - 25*errors - 8*warnings - 2*infos, floored at 0.
  const score = Math.max(0, 100 - errors * 25 - warnings * 8 - infos * 2);

  return {
    issues,
    errors,
    warnings,
    canRun: errors === 0,
    score,
  };
}

/** Helper to surface tactic name from a technique id (for UI). */
export function techniqueLabel(id: string): string {
  const t = TECHNIQUES.find((x) => x.id === id);
  if (!t) return id;
  return `${t.id} ${t.name} (${tacticById(t.tactic).label})`;
}