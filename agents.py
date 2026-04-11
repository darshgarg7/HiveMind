import os
from typing import List
from pydantic import BaseModel
from langchain_openai import AzureChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from schema import AgentConfig, ChildConfig, DecisionMemo

llm = AzureChatOpenAI(
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    azure_deployment=os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4o"),
    api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-08-01-preview"),
    temperature=0.4
)

low_temp_llm = AzureChatOpenAI(
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    azure_deployment=os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4o"),
    api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-08-01-preview"),
    temperature=0.0
)

# --- 1. GRAND ORCHESTRATOR ---
class ParentConfigsOutput(BaseModel):
    parent_configs: List[AgentConfig]

grand_orchestrator_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are the Grand Orchestrator for HiveMind SOC operations. Analyze the following massive threat incident and decompose it into 2-3 distinct high-level investigatory vectors (e.g., Geopolitical, Network Forensics, Insider Threat). Assign an AgentConfig for each vector."),
    ("user", "INCIDENT:\n{task_description}")
])
grand_orchestrator_chain = grand_orchestrator_prompt | llm.with_structured_output(ParentConfigsOutput)

def grand_orchestrator_node(state):
    print("-> GRAND ORCHESTRATOR: Analyzing world space incident...")
    res = grand_orchestrator_chain.invoke({"task_description": state["task_description"]})
    print(f"-> Spawned {len(res.parent_configs)} Parent Agents.")
    return {"parent_configs": res.parent_configs}


# --- 2. PARENT AGENT ---
class ChildConfigsOutput(BaseModel):
    child_configs: List[ChildConfig]

parent_agent_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a {persona} Parent Agent investigating a massive SOC incident. Your objective is: {focus_objective}. Analyze the incident metacognitively. Note your blind spots, and spawn 2 highly-specialized Child Agents to investigate granular technical details you cannot cover."),
    ("user", "INCIDENT:\n{task_description}")
])
parent_agent_chain = parent_agent_prompt | llm.with_structured_output(ChildConfigsOutput)

def parent_agent_node(state):
    print(f"  -> PARENT AGENT [{state['persona']}]: Spawning specialists...")
    res = parent_agent_chain.invoke({
        "persona": state["persona"],
        "focus_objective": state["focus_objective"],
        "task_description": state["task_description"]
    })
    
    # Pass along the parent context dynamically
    for c in res.child_configs:
        c.parent_persona = state["persona"]
        
    print(f"  <- PARENT AGENT [{state['persona']}] spawned {len(res.child_configs)} children.")
    return {"child_configs": res.child_configs}


# --- 3. CHILD AGENT ---
child_agent_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a {persona} Child Agent responding to a {parent_persona}. Your objective: {focus_objective}. Perform a granular incident investigation and output a structured DecisionMemo."),
    ("user", "INCIDENT:\n{task_description}")
])
child_agent_chain = child_agent_prompt | low_temp_llm.with_structured_output(DecisionMemo)

def child_agent_node(state):
    print(f"    -> CHILD AGENT [{state['persona']}]: Synthesizing telemetry...")
    memo = child_agent_chain.invoke({
        "persona": state["persona"],
        "parent_persona": state["parent_persona"],
        "focus_objective": state["focus_objective"],
        "task_description": state["task_description"]
    })
    print(f"    <- CHILD AGENT [{state['persona']}] completed memo.")
    return {"memos": [memo]}
