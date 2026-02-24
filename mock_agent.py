import time
import json
import os

def main():
    print("LOG: Mock Agent initialized and analyzing cloud migration...")
    
    # 1. Create the artifact (Decision Memo)
    memo = {
        "strategy": "Hybrid Cloud",
        "risk": "Regulatory uncertainty in local region",
        "status": "COMPLETED_BY_AGENT"
    }
    
    # 2. Simulate heavy thinking (10 seconds)
    for i in range(1, 11):
        print(f"LOG: Processing simulation step {i}/10...")
        time.sleep(1)
        
        # At step 5, save the artifact to the shared volume
        if i == 5:
            with open('/app/outputs/memo.json', 'w') as f:
                json.dump(memo, f)
            print("LOG: Intermediate artifact saved to /outputs.")

    print("LOG: Agent reached natural conclusion.")

if __name__ == "__main__":
    main()