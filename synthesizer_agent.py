from agent_schema import build_artifact

def collect_memo_data(memos):
    assumptions = []
    strategies = []
    risks = []
    effects = []

    for memo in memos:
        data = memo.get("data", {})
        assumptions.extend(data.get("assumptions", []))
        strategies.append(data.get("strategy"))
        risks.extend(data.get("risks", []))
        effects.extend(data.get("second_order_effects", []))

    return assumptions, strategies, risks, effects


def build_reasoning_trace(num_memos, assumptions, strategy, risks, effects):
    return [
        {
            "step": 1,
            "name": "collect_memo_data",
            "output": {"num_source_memos": num_memos}
        },
        {
            "step": 2,
            "name": "merge_assumptions",
            "output": assumptions
        },
        {
            "step": 3,
            "name": "choose_strategy",
            "output": strategy
        },
        {
            "step": 4,
            "name": "merge_risks",
            "output": risks
        },
        {
            "step": 5,
            "name": "merge_second_order_effects",
            "output": effects
        }
    ]


def build_synthesizer_memo(task, memos):
    task_id = task.get("task_id", "unknown_task")
    objective = task.get("objective", "")
    context = task.get("context", "")

    assumptions, strategies, risks, effects = collect_memo_data(memos)

    strategy = (
        "Start with a phased migration using a low-risk pilot while applying "
        "cost governance and compliance checks from the beginning."
    )

    reasoning_trace = build_reasoning_trace(
        len(memos), assumptions, strategy, risks, effects
    )

    memo_data = {
        "objective": objective,
        "context": context,
        "focus": "synthesis",
        "assumptions": assumptions,
        "strategy": strategy,
        "risks": risks,
        "second_order_effects": effects,
        "reasoning_trace": reasoning_trace
    }

    return build_artifact(
        agent_id="synthesizer_main",
        agent_role="synthesizer",
        task_id=task_id,
        data=memo_data
    )