# Evaluation & Observability Plane

This module provides **evaluation, tracking, logging, and replay capabilities** for HiveMind.

It ensures the system is **measurable, debuggable, and reproducible** by capturing what happens during each run and evaluating agent outputs.

---

## 📁 Folder Structure

```plaintext
project_root/
│
├── outputs/                # Shared system memory (outside this module)
│   ├── runs/               # Run metadata
│   ├── events/             # Event logs (JSONL per run)
│   ├── scores/             # Artifact evaluation results
│   ├── agents/             # Agent performance tracking
│
├── evaluation/
│   ├── evaluator.py        # Scores artifacts
│   ├── tracker.py          # Tracks agent performance
│   ├── logger.py           # Logs system events
│   ├── replay.py           # Replays past runs
│   └── storage.py          # Handles persistence to /outputs
```

---

## 🧠 Overview

The evaluation layer operates **passively**:

* It does NOT control agents
* It does NOT modify orchestration
* It does NOT handle messaging (Kafka)

Instead, it **observes, evaluates, and records** system behavior.

---

## 🔑 Core Components

### 1. `evaluator.py`

Evaluates artifacts produced by agents.

```python
score_artifact(artifact) -> dict
```

Returns a score and metric breakdown for each artifact.

---

### 2. `tracker.py`

Tracks agent performance over time.

```python
record_agent_result(agent_id, task_id, score, artifact_type)
get_agent_statistics(agent_id)
```

Used to identify:

* High-performing agents
* Effective strategies
* Performance trends

---

### 3. `logger.py`

Logs all system events.

```python
log_event(run_id, event_type, payload)
```

Each event includes:

* run_id
* timestamp
* event_type
* payload

---

### 4. `replay.py`

Reconstructs past runs.

```python
replay_run(run_id)
```

Displays events in chronological order to understand system behavior.

---

### 5. `storage.py`

Handles all persistence to the `outputs/` directory.

**Responsibilities:**

* Save artifact scores
* Store agent performance records
* Record run metadata
* Append event logs (JSONL)

---

## 📦 Key Concepts

### Artifact

A structured output produced by an agent (e.g., memo, summary, recommendation).

### Run

A single execution of the system identified by a `run_id`.

### Event

A recorded system action (used for observability and replay).

---

## 🔄 System Flow

1. Agent produces an artifact
2. Event logged → `artifact_produced`
3. Artifact evaluated → score generated
4. Event logged → `artifact_scored`
5. Performance recorded

---

## 📊 Outputs Directory

All data is stored in the shared `outputs/` folder:

* `runs/` → run metadata
* `events/` → event streams (JSONL per run)
* `scores/` → artifact evaluation results
* `agents/` → agent performance history

This enables:

* Replay of past runs
* Cross-run analysis
* Persistent system memory

---

## 🎯 Goals

This module enables HiveMind to:

* Measure output quality
* Track agent effectiveness
* Debug complex interactions
* Replay and analyze past runs
* Compare system behavior over time

---

## ⚠️ Scope

This module does NOT:

* Implement agent reasoning
* Control agent lifecycle
* Make orchestration decisions
* Manage Kafka or messaging

---

## 🚀 Future Improvements

* LLM-based artifact evaluation
* Database integration (Postgres)
* Visualization dashboards
* Run comparison tools

---

## ✅ Summary

The Evaluation & Observability Plane turns HiveMind into a **data-driven system**.

Without it, the system produces outputs.
With it, the system can **measure, learn, and improve**.
