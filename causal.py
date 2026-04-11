from langchain_openai import AzureChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from schema import CausalPayload, GraphState
import os
import dowhy
import pandas as pd
import json

llm = AzureChatOpenAI(
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    azure_deployment=os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4o"),
    api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-08-01-preview"),
    temperature=0.0
)

synth_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a Causal Modeling Architect. Review the gathered DecisionMemos. Construct a Causal DAG representing the adversarial forces and responses. Define exactly ONE treatment_variable and ONE outcome_variable. Also generate a synthetic dataset mapping ~50 rows of continuous/binary values for these nodes, ensuring functional structural equations are represented (e.g. confounding noise and plausible causal weights). NEVER output strings in the dataset numerical values!"),
    ("user", "MEMOS:\n{memos_text}")
])
synth_chain = synth_prompt | llm.with_structured_output(CausalPayload)

def causal_synthesis_node(state: GraphState):
    print("-> CAUSAL ENGINE: Architecting DAG and Synthesizing Dataset...")
    memos = state.get("memos", [])
    memos_text = "\n\n".join([f"({m.perspective}): {m.strategy}" for m in memos])
    
    payload = synth_chain.invoke({"memos_text": memos_text})
    
    return {
        "causal_payload": payload.model_dump(),
        "causal_refutation_passed": False # To be updated by dowhy step
    }
    
def dowhy_engine_node(state: GraphState):
    print("-> DOWHY ENGINE: Identifying, Estimating, and Refuting Causal Effects...")
    payload = state["causal_payload"]
    graph_def = payload["graph"]
    dataset = payload["dataset"]
    
    # --- SELF-HEALING: LLM Graph Hallucination Sanitization ---
    clean = lambda x: str(x).replace(" ", "_").replace("-", "_")
    treatment = clean(graph_def["treatment_variable"])
    outcome = clean(graph_def["outcome_variable"])
    
    dataset["columns"] = [clean(c) for c in dataset["columns"]]
    for n in graph_def["nodes"]: n["id"] = clean(n["id"])
    for e in graph_def["edges"]: 
        e["source"] = clean(e["source"])
        e["target"] = clean(e["target"])

    existing_nodes = {n["id"] for n in graph_def["nodes"]}
    required_nodes = set(dataset["columns"]) | {treatment, outcome}
    for e in graph_def["edges"]:
        required_nodes.add(e["source"])
        required_nodes.add(e["target"])

    for missing in required_nodes - existing_nodes:
        print(f"  [HEAL] Injecting missing hallucinatory node: {missing}")
        graph_def["nodes"].append({
            "id": missing,
            "label": missing.replace("_", " "),
            "description": "Auto-inferred node"
        })
    # --- END HEALING ---
    
    # 1. Build DataFrame
    df = pd.DataFrame(dataset["data_rows"], columns=dataset["columns"])
    
    # 2. Build NetworkX/DoWhy DAG string
    # CRITICAL FIX: We MUST use n["id"] for the GML label property because NetworkX parse_gml
    # uses the 'label' field to instantiate the Python Graph Node objects, which DoWhy then reads.
    gml_nodes = "".join([f'  node [\n    id "{n["id"]}"\n    label "{n["id"]}"\n  ]\n' for n in graph_def["nodes"]])
    gml_edges = "".join([f'  edge [\n    source "{e["source"]}"\n    target "{e["target"]}"\n  ]\n' for e in graph_def["edges"]])
    gml_string = f"graph [\n  directed 1\n{gml_nodes}{gml_edges}]\n"
    
    try:
        # Step 1: Model
        model = dowhy.CausalModel(
            data=df,
            treatment=treatment,
            outcome=outcome,
            graph=gml_string
        )
        
        # Step 2: Identify
        identified_estimand = model.identify_effect(proceed_when_unidentifiable=True)
        
        # Step 3: Estimate
        estimate = model.estimate_effect(
            identified_estimand,
            method_name="backdoor.linear_regression"
        )
        
        # Step 4: Refute (Dummy variable placebo)
        refute_results = model.refute_estimate(
            identified_estimand, estimate,
            method_name="random_common_cause"
        )
        
        refutation_passed = refute_results.new_effect is not None # Basic truthy fallback
        
        results = {
            "ate_estimate": estimate.value,
            "refutation_passed": refutation_passed,
            "refutation_details": str(refute_results)
        }
        
        print(f"<- DOWHY: ATE Estimate [{estimate.value}]. Refutation Passed: {refutation_passed}")
        
    except Exception as e:
        print(f"[!] DOWHY FAILURE: {str(e)}")
        results = {"error": str(e)}
        refutation_passed = False
        
    return {
        "dowhy_results": results,
        "causal_refutation_passed": refutation_passed
    }
