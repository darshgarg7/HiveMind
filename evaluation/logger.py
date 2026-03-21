from datetime import datetime
from evaluation.storage import append_event

def log_event(run_id, event_type, payload):
    event = {
        "run_id": run_id,
        "timestamp": datetime.utcnow().isoformat(),
        "event_type": event_type,
        "payload": payload
    }

    append_event(run_id, event)