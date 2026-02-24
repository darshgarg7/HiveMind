import docker
import psutil
import time
import os

client = docker.from_env()

def run_bounded_agent(image_name, timeout_seconds):
    # Ensure a local 'outputs' folder exists to catch the artifacts
    output_dir = os.path.join(os.getcwd(), "outputs")
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    print(f"--- STARTING EXECUTION GUARDRAIL TEST ---")
    
    # 1. Spawn Agent with a mounted volume for artifacts
    container = client.containers.run(
        image_name, 
        detach=True,
        volumes={output_dir: {'bind': '/app/outputs', 'mode': 'rw'}}
    )
    
    start_time = time.time()
    
    try:
        while container.status != 'exited':
            elapsed = time.time() - start_time
            
            # 2. Print Hardware Assumptions (Monitor logic)
            cpu = psutil.cpu_percent()
            print(f"[STATUS] Time: {int(elapsed)}s | CPU: {cpu}% | Container: {container.short_id}")
            
            # 3. Stream Agent Logs (Verify work is happening)
            logs = container.logs().decode('utf-8').strip().split('\n')
            if logs:
                print(f"  > Last Agent Log: {logs[-1]}")

            # 4. Enforce Kill Signal (Kill logic)
            if elapsed > timeout_seconds:
                print(f"!!! TIMEOUT REACHED ({timeout_seconds}s). FORCING KILL SIGNAL.")
                container.kill()
                break
            
            time.sleep(2)
            container.reload()
            
    finally:
        print("--- CLEANUP & VERIFICATION ---")
        container.remove()
        
        # 5. Verify Artifact Preservation
        memo_path = os.path.join(output_dir, "memo.json")
        if os.path.exists(memo_path):
            print(f"SUCCESS: Artifact 'memo.json' found in local folder!")
            with open(memo_path, 'r') as f:
                print(f"CONTENT: {f.read()}")
        else:
            print("FAILURE: No artifact found. Logic check failed.")

if __name__ == "__main__":
    # Test: Run for 7 seconds (Kill it before it finishes its 10-step loop)
    run_bounded_agent("hive-agent", timeout_seconds=7)