def build_artifact(agent_id, agent_role, task_id, data, status="completed"):
    return {
        "agent_id": agent_id,
        "agent_role": agent_role,
        "artifact_type": "decision_memo",
        "task_id": task_id,
        "status": status,
        "data": data
    }


def validate_decision_memo(artifact):
    required_top = [
        "agent_id",
        "agent_role",
        "artifact_type",
        "task_id",
        "status",
        "data"
    ]

    for key in required_top:
        if key not in artifact:
            return False, f"Missing top-level field: {key}"

    if artifact["artifact_type"] != "decision_memo":
        return False, "artifact_type must be 'decision_memo'"

    if artifact["agent_role"] not in ["explorer", "synthesizer"]:
        return False, "agent_role must be 'explorer' or 'synthesizer'"

    data = artifact["data"]
    required_data = [
        "assumptions",
        "strategy",
        "risks",
        "second_order_effects",
        "reasoning_trace"
    ]

    for key in required_data:
        if key not in data:
            return False, f"Missing memo field: {key}"

    return True, "ok"