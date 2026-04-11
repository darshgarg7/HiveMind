from langgraph.graph import StateGraph, START, END
from langgraph.constants import Send
from schema import GraphState, ParentState, ChildState
from agents import grand_orchestrator_node, parent_agent_node, child_agent_node
from causal import causal_synthesis_node, dowhy_engine_node

def route_to_parents(state: GraphState):
    """Dynamically routes execution to parent agents based on grand orchestrator output."""
    return [Send("parent_agent", {
        "task_description": state["task_description"],
        "persona": config.persona,
        "focus_objective": config.focus_objective
    }) for config in state.get("parent_configs", [])]

def gather_children_node(state: GraphState):
    """Wait step that aligns all dynamically produced child mapping configs."""
    print(f"-> GATHERING CHILDREN: {len(state.get('child_configs', []))} total child tasks queued.")
    return {}

def route_to_children(state: GraphState):
    """Dynamically routes execution to child granular agents."""
    return [Send("child_agent", {
        "task_description": state["task_description"],
        "parent_persona": config.parent_persona,
        "persona": config.persona,
        "focus_objective": config.focus_objective
    }) for config in state.get("child_configs", [])]

def conditional_refutation_check(state: GraphState):
    """If DoWhy refutation fails, loop back to synthesis."""
    if state.get("causal_refutation_passed", False) or "error" in state.get("dowhy_results", {}):
        return "end" # Ends even on systemic math error so we don't inf loop currently
    else:
        print("-> [!] Refutation Failed. Retrying Causal Synthesis loop...")
        return "causal_synthesis"

def build_graph():
    builder = StateGraph(GraphState)
    
    # 1. Nodes
    builder.add_node("orchestrator", grand_orchestrator_node)
    builder.add_node("parent_agent", parent_agent_node)
    builder.add_node("gather_children", gather_children_node)
    builder.add_node("child_agent", child_agent_node)
    builder.add_node("causal_synthesis", causal_synthesis_node)
    builder.add_node("dowhy_engine", dowhy_engine_node)
    
    # 2. Edges
    builder.add_edge(START, "orchestrator")
    builder.add_conditional_edges("orchestrator", route_to_parents, ["parent_agent"])
    builder.add_edge("parent_agent", "gather_children")
    builder.add_conditional_edges("gather_children", route_to_children, ["child_agent"])
    builder.add_edge("child_agent", "causal_synthesis")
    builder.add_edge("causal_synthesis", "dowhy_engine")
    
    # 3. Dynamic Cyclic Loop
    builder.add_conditional_edges(
        "dowhy_engine",
        conditional_refutation_check,
        {
            "end": END,
            "causal_synthesis": "causal_synthesis"
        }
    )
    
    return builder.compile()
