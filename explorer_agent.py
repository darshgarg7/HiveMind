from agent_schema import build_artifact

def extract_inputs(task):
    return {
        "task_id": task.get("task_id", "unknown_task"),
        "objective": task.get("objective", ""),
        "context": task.get("context", "")
    }


def generate_assumptions(inputs, focus):
    assumptions = [
        "The company cannot tolerate major downtime.",
        "Budget pressure affects migration decisions.",
        "Regulatory uncertainty is a real constraint."
    ]

    if focus == "cost":
        assumptions.append("Leadership wants predictable spending.")
    elif focus == "risk":
        assumptions.append("Compliance-sensitive systems need extra control.")
    elif focus == "speed":
        assumptions.append("The team values quick visible progress.")

    return assumptions


def choose_strategy(focus):
    if focus == "cost":
        return (
            "Use a hybrid migration path: move low-risk workloads first and keep "
            "regulated or predictable systems on-prem initially."
        )
    elif focus == "risk":
        return (
            "Prioritize compliance-sensitive system mapping first, then migrate only "
            "workloads with clear governance and auditability."
        )
    elif focus == "speed":
        return (
            "Run a phased migration starting with low-dependency services to create "
            "momentum and reduce hesitation."
        )

    return "Use a balanced phased migration plan."


def identify_risks(focus):
    if focus == "cost":
        return [
            "Hybrid setups can increase operational complexity.",
            "Cloud spend can rise without strong cost controls."
        ]
    elif focus == "risk":
        return [
            "Compliance-first execution may slow delivery.",
            "Too much caution may delay visible business value."
        ]
    elif focus == "speed":
        return [
            "Fast migration may preserve technical debt.",
            "Integration issues may appear later than expected."
        ]

    return ["The plan may become too generic."]


def identify_second_order_effects(focus):
    if focus == "cost":
        return [
            "Finance and engineering will need shared cost visibility.",
            "Tooling complexity may increase before it decreases."
        ]
    elif focus == "risk":
        return [
            "Compliance maturity may improve across the organization.",
            "Future technical choices may favor control over speed."
        ]
    elif focus == "speed":
        return [
            "Early wins may increase confidence.",
            "Fast success may create pressure to migrate unsuitable systems."
        ]

    return ["Stakeholder alignment may improve slowly."]


def build_reasoning_trace(inputs, focus, assumptions, strategy, risks, effects):
    return [
        {
            "step": 1,
            "name": "extract_inputs",
            "output": {
                "objective": inputs["objective"],
                "context": inputs["context"],
                "focus": focus
            }
        },
        {
            "step": 2,
            "name": "generate_assumptions",
            "output": assumptions
        },
        {
            "step": 3,
            "name": "choose_strategy",
            "output": strategy
        },
        {
            "step": 4,
            "name": "identify_risks",
            "output": risks
        },
        {
            "step": 5,
            "name": "identify_second_order_effects",
            "output": effects
        }
    ]


def build_explorer_memo(task, focus="cost"):
    inputs = extract_inputs(task)
    assumptions = generate_assumptions(inputs, focus)
    strategy = choose_strategy(focus)
    risks = identify_risks(focus)
    effects = identify_second_order_effects(focus)

    reasoning_trace = build_reasoning_trace(
        inputs, focus, assumptions, strategy, risks, effects
    )

    memo_data = {
        "objective": inputs["objective"],
        "context": inputs["context"],
        "focus": focus,
        "assumptions": assumptions,
        "strategy": strategy,
        "risks": risks,
        "second_order_effects": effects,
        "reasoning_trace": reasoning_trace
    }

    return build_artifact(
        agent_id=f"explorer_{focus}",
        agent_role="explorer",
        task_id=inputs["task_id"],
        data=memo_data
    )