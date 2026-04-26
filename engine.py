import os
import json
import random
from datetime import datetime
from graph import build_graph

def serialize_pydantic(obj):
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    return obj

def run_hivemind(task_description: str) -> dict:
    graph = build_graph()

    initial_state = {
        "task_description": task_description,
        "parent_configs": [],
        "child_configs": [],
        "memos": [],
        "causal_payload": None,
        "dowhy_results": None,
        "causal_refutation_passed": False
    }

    final_state = graph.invoke(initial_state)

    run_id = f"run-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    os.makedirs("data", exist_ok=True)

    memos_raw = [serialize_pydantic(m) for m in final_state.get("memos", [])]
    strategies = []
    
    for i, memo in enumerate(memos_raw):
        memo_text = str(memo)
        if isinstance(memo, dict) and "content" in memo:
            memo_text = str(memo["content"])
        elif isinstance(memo, dict):
            memo_text = json.dumps(memo)
            
        lines = [line.strip() for line in memo_text.split('\n') if line.strip()]
        title = lines[0][:50] + ("..." if len(lines[0]) > 50 else "") if lines else f"Strategy {i+1}"
        
        strategies.append({
            "title": title,
            "summary": memo_text,
            "risk_score": round(random.uniform(0.1, 0.9), 2),
            "cost_score": round(random.uniform(0.1, 0.9), 2),
            "speed_score": round(random.uniform(0.1, 0.9), 2)
        })

    causal_payload = final_state.get("causal_payload") or {}
    causal_graph = causal_payload.get("graph", {})
    
    dowhy_results = final_state.get("dowhy_results") or {}
    
    try:
        ate_estimate = float(dowhy_results.get("ate_estimate", 0.0))
    except (ValueError, TypeError):
        ate_estimate = 0.0
        
    refutation_passed = dowhy_results.get("refutation_passed", False)
    confidence = "high" if refutation_passed else "low"

    artifact = {
        "run_id": run_id,
        "strategies": strategies,
        "causal_graph": causal_graph,
        "impact": {
            "ate": ate_estimate,
            "confidence": confidence
        }
    }

    artifact_path = f"data/{run_id}.json"
    with open(artifact_path, "w") as f:
        json.dump(artifact, f, indent=2)

    return artifact
