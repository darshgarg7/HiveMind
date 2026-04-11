import operator
from typing import Annotated, Any, Dict, List, Optional
from pydantic import BaseModel, Field
from typing_extensions import TypedDict

# --- CAUSAL GRAPH SCHEMAS ---

class CausalNode(BaseModel):
    id: str = Field(description="Unique variable name without spaces (e.g., 'Compromised_Service_Account')")
    label: str = Field(description="Human readable label")
    description: str = Field(description="Explanation of what this node represents in the scenario")

class CausalEdge(BaseModel):
    source: str = Field(description="Source node ID")
    target: str = Field(description="Target node ID")
    relationship: str = Field(description="Description of the causal mechanism")

class CausalGraphDef(BaseModel):
    nodes: List[CausalNode] = Field(description="Nodes constituting the causal DAG")
    edges: List[CausalEdge] = Field(description="Edges mapping the flow of causality")
    treatment_variable: str = Field(description="Node ID representing the action/intervention (e.g., 'Isolate_Network')")
    outcome_variable: str = Field(description="Node ID representing the final outcome (e.g., 'Data_Loss_Magnitude')")

class SyntheticDataset(BaseModel):
    columns: List[str] = Field(description="List of exact Node IDs")
    data_rows: List[List[float]] = Field(description="List of rows, where each row is a list of numerical values corresponding exactly to the order of columns (0/1 for binary, continuous otherwise)")

class CausalPayload(BaseModel):
    graph: CausalGraphDef
    dataset: SyntheticDataset

# --- AGENT SCHEMAS ---

class AgentConfig(BaseModel):
    """Parent Agent Configuration."""
    persona: str = Field(description="High-level persona (e.g., 'Geopolitical Risk Expert')")
    focus_objective: str = Field(description="Objective for this parent agent")

class ChildConfig(BaseModel):
    """Child Agent Configuration spawned dynamically by Parents."""
    parent_persona: str
    persona: str = Field(description="Granular child persona (e.g., 'Active Directory Forensics Specialist')")
    focus_objective: str = Field(description="Specific sub-problem to solve")

class DecisionMemo(BaseModel):
    """Child's artifact output."""
    perspective: str
    strategy: str
    risks: List[str]
    confidence: Optional[str] = Field(default="N/A")


# --- STATE SCHEMAS ---

class GraphState(TypedDict):
    """The master state of the Grand Graph."""
    task_description: str
    
    # Hierarchical routing
    parent_configs: List[AgentConfig]
    child_configs: Annotated[List[ChildConfig], operator.add]
    
    # Collected artifacts
    memos: Annotated[List[DecisionMemo], operator.add]
    
    # Causal outputs
    causal_payload: Optional[Dict[str, Any]]
    causal_refutation_passed: bool
    dowhy_results: Optional[Dict[str, Any]]
    
class ParentState(TypedDict):
    """State for Parent Agent node execution."""
    task_description: str
    persona: str
    focus_objective: str

class ChildState(TypedDict):
    """State for Child Agent node execution."""
    task_description: str
    parent_persona: str
    persona: str
    focus_objective: str
