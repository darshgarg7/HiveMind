import json

def replay_run(run_id):
    with open("run_events.jsonl", "r") as f:
        events = [json.loads(line) for line in f]

    filtered = [e for e in events if e["run_id"] == run_id]

    for event in sorted(filtered, key=lambda x: x["timestamp"]):
        print(f"[{event['timestamp']}] {event['event_type']}")
        print(event["payload"])
        print("-" * 40)