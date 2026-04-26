import json
import os
from datetime import datetime
from dotenv import load_dotenv
import streamlit as st
from streamlit_agraph import agraph, Node, Edge, Config

load_dotenv()

from engine import run_hivemind

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
            st.write("Executing Causal Graph Loop...")
            try:
                artifact = run_hivemind(task_description)
                status.update(label="Analysis & Causal Inference Complete", state="complete", expanded=False)
            except Exception as e:
                status.update(label="Execution Failed", state="error", expanded=False)
                st.error(f"Error executing graph: {str(e)}")
                return

        artifact_path = f"data/{artifact['run_id']}.json"
        st.success(f"Execution trace saved locally to `{artifact_path}`")
        st.divider()

        # UI LAYOUT
        col1, col2 = st.columns([1, 1])

        causal_graph = artifact.get("causal_graph", {})
        impact = artifact.get("impact", {})

        with col1:
            st.subheader("Synthesized Causal DAG (interactable)")
            if causal_graph and "nodes" in causal_graph:
                nodes = []
                edges = []
                
                for n in causal_graph.get("nodes", []):
                    nodes.append(Node(
                        id=n["id"], 
                        label=n["label"], 
                        size=25, 
                        shape="dot",
                        title=n.get("description", "")
                    ))
                    
                for e in causal_graph.get("edges", []):
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
            if impact:
                ate = impact.get("ate", 0.0)
                st.metric("Average Treatment Effect (ATE)", f"{ate:.4f}")
                
                confidence = impact.get("confidence", "low")
                if confidence == "high":
                    st.success("Refutation Tests Passed (Robust Causal Logic verified via subsets/placebos)")
                else:
                    st.error("Refutation Tests Failed (Fragile Causal Logic, DAG is weak)")
            else:
                st.write("No DoWhy metrics returned.")
                
        st.divider()
        st.header("Raw Agent Artifacts")
        st.json(artifact)


if __name__ == "__main__":
    main()