# HiveMind -- Agent Design & Artifact Generation

**Owner:** Denial\
**Scope:** Execution Plane\
**Focus:** Deliverables (Explorer, Synthesizer, Artifact Design)

---

# 1. Purpose

This document defines the **Execution Plane deliverables** for HiveMind.

Infrastructure, orchestration, and communication layers are handled
separately. This document focuses only on:

- Agent I/O contracts
- Artifact schemas
- Explorer agent specification
- Synthesizer agent specification
- Format decisions (JSON vs TOON)

The goal is structured, predictable, integrable agent reasoning.

---

# 2. Minimal Architecture Context

HiveMind MVP consists of four planes:

1.  Control Plane -- Orchestrator
2.  Execution Plane -- Agents (this document)
3.  Communication Plane -- Event Bus
4.  Memory Plane -- Artifact Storage

Execution Plane responsibilities:

- Accept structured task input
- Produce structured artifact output
- Terminate cleanly
- Avoid narrative text outside JSON

---

# 3. Deliverable #1 -- Agent I/O Contract

## 3.1 Task Input Schema

```json
{
  "task_id": "string",
  "objective": "string",
  "context": {
    "domain": "string",
    "background": "string",
    "constraints": ["string"],
    "known_unknowns": ["string"]
  },
  "budget": {
    "max_seconds": 120,
    "max_tokens": 2500,
    "max_tool_calls": 3
  },
  "style": {
    "artifact_strict_json": true,
    "verbosity": "compact"
  }
}
```

Requirements:

- Objective is mandatory
- Constraints must influence reasoning
- Output must be strict JSON
- Budget must be respected

---

## 3.2 Artifact Envelope (Mandatory)

All outputs must be wrapped as:

```json
{
  "run_id": "string",
  "agent_id": "string",
  "agent_role": "explorer | synthesizer",
  "artifact_type": "decision_memo | synthesis_report | strategy_map",
  "created_at": "ISO-8601",
  "data": {},
  "metrics": {
    "time_ms": 0,
    "tokens_used": 0,
    "tool_calls": 0
  }
}
```

Purpose:

- Traceability
- Replayability
- Debugging
- Multi-agent lineage tracking

---

# 4. Deliverable #2 -- Artifact Definitions

## 4.1 Decision Memo (Explorer Output)

```json
{
  "assumptions": ["string"],
  "strategy": "string",
  "risks": ["string"],
  "second_order_effects": ["string"],
  "open_questions": ["string"],
  "confidence": 0.0
}
```

Field intent:

- assumptions → explicit premises
- strategy → clear structured approach
- risks → direct vulnerabilities
- second_order_effects → indirect consequences of the strategy
- open_questions → critical unknowns
- confidence → 0.0--1.0 certainty indicator

Second-order effects are indirect outcomes that arise because of the
first-order impact of a decision. They force deeper systemic reasoning.

---

## 4.2 Synthesis Report (Synthesizer Output)

```json
{
  "summary": "string",
  "strategy_clusters": [
    {
      "cluster_name": "string",
      "memos": ["memo_reference"],
      "when_it_wins": ["string"],
      "when_it_fails": ["string"]
    }
  ],
  "contradictions": ["string"],
  "recommended_next_agents": [
    {
      "role": "string",
      "goal": "string",
      "why": "string"
    }
  ]
}
```

Responsibilities:

- Compare memos
- Cluster similar strategies
- Identify contradictions
- Define dominance conditions
- Recommend next exploration

Synthesizer structures existing ideas. It does not invent entirely new ones.

---

# 5. Deliverable #3 -- Agent Specifications

## 5.1 Explorer Agent

Role: Generate one structured strategic perspective under a defined
reasoning lens.

Example lenses:

- Cost-focused
- Risk-focused
- Speed-focused
- Growth-focused

Requirements:

- Produce exactly one decision_memo
- Include second_order_effects
- Respect constraints
- Output strict JSON only

Explorer expands strategic space.

---

## 5.2 Synthesizer Agent

Role: Aggregate and structure multiple Decision Memos.

Responsibilities:

1.  Compare assumptions
2.  Cluster strategies
3.  Detect contradictions
4.  Define dominance conditions
5.  Recommend new exploration roles

Synthesizer reduces entropy and extracts structure.

---

# 6. JSON vs TOON

HiveMind currently uses JSON for artifact representation.

Token-Oriented Object Notation (TOON) is a compact alternative format
designed to reduce token usage in LLM systems.

While TOON may reduce token count slightly at massive scale, it
introduces:

- Custom parsing requirements
- Lower ecosystem compatibility
- Harder debugging
- Reduced readability
- Additional engineering complexity

For MVP systems and moderate traffic volumes, the token savings are
typically marginal compared to the added architectural complexity.

Therefore:

- JSON remains the standard format
- TOON may be evaluated only if scale significantly increases
- Clarity and maintainability are prioritized over compression

Design principle:

Clarity \> Compatibility \> Maintainability \> Compression
