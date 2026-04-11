import json
import os
from datetime import datetime
from dotenv import load_dotenv
import streamlit as st
from streamlit_agraph import agraph, Node, Edge, Config

load_dotenv()

from graph import build_graph

def main():
    st.set_page_config(page_title="HiveMind Causal Engine", page_icon="🕸️", layout="wide")

    st.title("HiveMind: Causal Digital Twin")
    st.markdown(
        "Deploy hierarchical metacognitive agents to build a Spatiotemporal Causal DAG and simulate interventions using DoWhy.",
        help="The Grand Orchestrator dynamically spins up nested parent/child agents."
    )

    default_text = (
        "WORLD SPACE INCIDENT:\n"
        "An Advanced Persistent Threat (APT) is simultaneously moving laterally across 5 globally "
        "dispersed geographic regions. Telemetry shows exploitation of a supply-chain vendor vulnerability "
        "in the CI/CD pipeline, concurrent with highly unusual insider-threat signatures occurring inside "
        "the financial compartments in London. Global disruption is imminent if root causality is not mapped."
    )

    task_description = st.text_area("Massive Event Space Description", value=default_text, height=200)

    if st.button("Initialize Causal Execution", type="primary", use_container_width=True):
        if not task_description.strip():
            st.warning("Please provide a task description before running.")
            return

        with st.status("Executing Hierarchical Agentic Loop...", expanded=True) as status:
            st.write("1. Compiling Graph...")
            graph = build_graph()

            initial_state = {
                "task_description": task_description,
                "parent_configs": [],
                "child_configs": [],
                "memos": [],
                "causal_payload": None,
                "dowhy_results": None,
                "causal_refutation_passed": False
            }

            st.write("2. Invoking Grand Orchestrator Loop...")
            try:
                final_state = graph.invoke(initial_state)
                status.update(label="Analysis & Causal Inference Complete", state="complete", expanded=False)
            except Exception as e:
                status.update(label="Execution Failed", state="error", expanded=False)
                st.error(f"Error executing graph: {str(e)}")
                return

        # Save artifacts
        run_id = f"run-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        os.makedirs("data", exist_ok=True)

        def serialize_pydantic(obj):
            if hasattr(obj, "model_dump"):
                return obj.model_dump()
            return obj

        artifact = {
            "run_id": run_id,
            "memos": [serialize_pydantic(m) for m in final_state.get("memos", [])],
            "causal_payload": final_state.get("causal_payload"),
            "dowhy_results": final_state.get("dowhy_results")
        }
        
        artifact_path = f"data/{run_id}.json"
        with open(artifact_path, "w") as f:
            json.dump(artifact, f, indent=2)

        st.success(f"Execution trace saved locally to `{artifact_path}`")
        st.divider()

        # UI LAYOUT
        col1, col2 = st.columns([1, 1])

        payload = final_state.get("causal_payload")
        dowhy_res = final_state.get("dowhy_results")

        with col1:
            st.subheader("Synthesized Causal DAG (interactable)")
            if payload and "graph" in payload:
                nodes = []
                edges = []
                g_def = payload["graph"]
                
                for n in g_def.get("nodes", []):
                    nodes.append(Node(
                        id=n["id"], 
                        label=n["label"], 
                        size=25, 
                        shape="dot",
                        title=n.get("description", "")
                    ))
                    
                for e in g_def.get("edges", []):
                    edges.append(Edge(
                        source=e["source"], 
                        target=e["target"],
                        label=e.get("relationship", "")
                    ))
                    
                config = Config(width=1000, height=600, directed=True, nodeHighlightBehavior=True, highlightColor="#F7A7A6")
                agraph(nodes=nodes, edges=edges, config=config)
            else:
                st.write("No DAG generated.")

        with col2:
            st.subheader("DoWhy Causal Estimation")
            if dowhy_res:
                if "error" in dowhy_res:
                    st.error(f"Mathematical engine failed: {dowhy_res['error']}")
                else:
                    try:
                        ate = float(dowhy_res.get('ate_estimate', 0))
                        st.metric("Average Treatment Effect (ATE)", f"{ate:.4f}")
                    except:
                        st.metric("Average Treatment Effect (ATE)", str(dowhy_res.get('ate_estimate')))
                    
                    passed = dowhy_res.get("refutation_passed", False)
                    if passed:
                        st.success("Refutation Tests Passed (Robust Causal Logic verified via subsets/placebos)")
                    else:
                        st.error("Refutation Tests Failed (Fragile Causal Logic, DAG is weak)")
                        
                    with st.expander("View Full DoWhy Refutation Metrics"):
                        st.text(dowhy_res.get("refutation_details", ""))
            else:
                st.write("No DoWhy metrics returned.")
                
        st.divider()
        st.header("Raw Agent Artifacts")
        st.json(artifact)


if __name__ == "__main__":
    main()