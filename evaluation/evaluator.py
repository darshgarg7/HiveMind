def score_artifact(artifact: dict) -> dict:
    # MVP: dumb heuristic scoring
    text = artifact.get("content", "")

    score = min(len(text) / 1000, 1.0)  # crude length proxy

    return {
        "artifact_id": artifact.get("id"),
        "score": score,
        "metrics": {
            "relevance": score,
            "reasoning": score * 0.9,
            "constraint_satisfaction": score * 0.8
        }
    }