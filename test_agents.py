import json
from agent_schema import validate_decision_memo
from explorer_agent import build_explorer_memo
from synthesizer_agent import build_synthesizer_memo

def save_json(path, data):
    with open(path, "w") as f:
        json.dump(data, f, indent=2)

def main():
    task = {
        "task_id": "task_cloud_001",
        "objective": "Analyze cloud migration options for a mid-sized company",
        "context": "A mid-sized company is considering migrating from on-prem infrastructure to the cloud under cost pressure and regulatory uncertainty."
    }

    memo_cost = build_explorer_memo(task, "cost")
    memo_risk = build_explorer_memo(task, "risk")
    memo_speed = build_explorer_memo(task, "speed")

    memo_final = build_synthesizer_memo(
        task, [memo_cost, memo_risk, memo_speed]
    )

    artifacts = [
        ("memo_cost.json", memo_cost),
        ("memo_risk.json", memo_risk),
        ("memo_speed.json", memo_speed),
        ("memo_final.json", memo_final),
    ]

    for filename, artifact in artifacts:
        ok, msg = validate_decision_memo(artifact)
        print(filename, "->", ok, msg)
        save_json(filename, artifact)

    print("\nFiles written:")
    for filename, _ in artifacts:
        print("-", filename)

if __name__ == "__main__":
    main()