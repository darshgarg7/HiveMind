import json
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

from graph import build_graph

def main():
    task_description = (
        "A mid-sized company is considering migrating from on-prem infra to the cloud "
        "under cost pressure and regulatory uncertainty."
    )
    
    print(f"Starting HiveMind MVP Run.")
    print(f"Task: {task_description}\n")
    
    graph = build_graph()
    
    initial_state = {
        "task_description": task_description,
        "memos": [],
        "agent_configs": [],
        "ranked_strategies": []
    }
    
    # Execute the graph
    print("Executing Graph...")
    final_state = graph.invoke(initial_state)
    
    print("\n--- Execution Complete ---")
    
    # Save artifacts
    run_id = f"run-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    os.makedirs("data", exist_ok=True)
    
    # Helper to serialize pydantic models
    def serialize_pydantic(obj):
        if hasattr(obj, "model_dump"):
            return obj.model_dump()
        return obj

    memos_serialized = [serialize_pydantic(m) for m in final_state.get("memos", [])]
    
    artifact = {
        "run_id": run_id,
        "task_description": task_description,
        "memos": memos_serialized,
        "ranked_strategies": final_state.get("ranked_strategies", [])
    }
    
    artifact_path = f"data/{run_id}.json"
    with open(artifact_path, "w") as f:
        json.dump(artifact, f, indent=2)
        
    print(f"\nArtifact saved to {artifact_path}")
    
    print("\n--- Final Ranked Strategies ---")
    ranked_strats = final_state.get("ranked_strategies", [])
    if ranked_strats:
        result = ranked_strats[0]
        for idx, ranking in enumerate(result.get("ranked_perspectives", []), 1):
            print(f"{idx}. {ranking}")
        print(f"\nRecommendation: {result.get('final_recommendation', 'N/A')}")
    else:
        print("No ranking produced.")

if __name__ == "__main__":
    main()
