import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent / "outputs"

def _ensure_dir(path):
    path.mkdir(parents=True, exist_ok=True)

def _append_json(file_path, data):
    if file_path.exists():
        with open(file_path, "r") as f:
            existing = json.load(f)
    else:
        existing = []

    existing.append(data)

    with open(file_path, "w") as f:
        json.dump(existing, f, indent=2)


# --- Artifact Scores ---
def save_artifact_score(run_id, score_data):
    path = BASE_DIR / "scores"
    _ensure_dir(path)
    file_path = path / f"{run_id}.json"

    _append_json(file_path, score_data)


# --- Agent Performance ---
def save_agent_record(record):
    path = BASE_DIR / "agents"
    _ensure_dir(path)
    file_path = path / "agent_performance.json"

    _append_json(file_path, record)


# --- Run Registry ---
def save_run(run_data):
    path = BASE_DIR / "runs"
    _ensure_dir(path)
    file_path = path / f"{run_data['run_id']}.json"

    with open(file_path, "w") as f:
        json.dump(run_data, f, indent=2)


# --- Events (JSONL for replay) ---
def append_event(run_id, event):
    path = BASE_DIR / "events"
    _ensure_dir(path)
    file_path = path / f"{run_id}.jsonl"

    with open(file_path, "a") as f:
        f.write(json.dumps(event) + "\n")