from langgraph.graph import StateGraph, START, END
from langgraph.constants import Send
from schema import GraphState, AgentConfig, AgentState
from agents import generate_memo_node
from evaluator import evaluate_memos_node

def orchestrator_node(state: GraphState):
    """
    Decides which agents to spawn and issues a Send for each.
    This acts as the 'Control Plane' in the MVP.
    """
    print("-> Orchestrator running: deciding on agents to spawn.")
    # For the MVP, we statically spawn 3 personas, but this could be LLM-driven
    agent_configs = [
        AgentConfig(
            perspective="Cost-Focused",
            instructions="Your goal is to minimize expenditure. Focus purely on short-term and long-term cost savings, ROI, and financial prudence."
        ),
        AgentConfig(
            perspective="Risk-Focused",
            instructions="Your goal is to minimize risk and ensure security/compliance. Prioritize stability and regulatory adherence above all else."
        ),
        AgentConfig(
            perspective="Speed-Focused",
            instructions="Your goal is speed of execution and time-to-market. Tolerate technical debt or higher costs if it means faster delivery."
        )
    ]
    
    # We update the state with the configurations we chose
    return {"agent_configs": agent_configs}

def spawn_agents(state: GraphState):
    """
    Conditional edge function that maps child executions.
    It returns a list of `Send` objects.
    """
    sends = []
    configs = state.get("agent_configs", [])
    print(f"-> Spawning {len(configs)} parallel agents.")
    for config in configs:
        sends.append(Send("agent_node", {
            "task_description": state["task_description"],
            "perspective": config.perspective,
            "instructions": config.instructions
        }))
    return sends


def build_graph():
    builder = StateGraph(GraphState)
    
    # Add nodes
    builder.add_node("orchestrator", orchestrator_node)
    builder.add_node("agent_node", generate_memo_node)
    builder.add_node("evaluator", evaluate_memos_node)
    
    # Add edges
    builder.add_edge(START, "orchestrator")
    
    # Dynamic fan-out
    builder.add_conditional_edges("orchestrator", spawn_agents, ["agent_node"])
    
    # Fan-in (reduction)
    builder.add_edge("agent_node", "evaluator")
    builder.add_edge("evaluator", END)
    
    return builder.compile()
