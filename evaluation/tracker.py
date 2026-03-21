from collections import defaultdict
from datetime import datetime

agent_stats = defaultdict(list)

def record_agent_result(agent_id, task_id, score, artifact_type):
    agent_stats[agent_id].append({
        "task_id": task_id,
        "score": score,
        "artifact_type": artifact_type,
        "timestamp": datetime.utcnow().isoformat()
    })

def get_agent_statistics(agent_id):
    records = agent_stats.get(agent_id, [])
    if not records:
        return {}

    avg_score = sum(r["score"] for r in records) / len(records)

    return {
        "agent_id": agent_id,
        "num_runs": len(records),
        "avg_score": avg_score
    }