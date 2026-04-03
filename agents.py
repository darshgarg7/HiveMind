import os
import json
from typing import Annotated, List
from langchain_openai import AzureChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from schema import AgentState, DecisionMemo

# SOC-Grade Configuration: Low temperature for precision
llm = AzureChatOpenAI(
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    azure_deployment=os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4.1"),
    api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2025-01-01-preview"),
    temperature=0.2 # Slight entropy allowed for "brainstorming" threats
)

# Structured Output for the Final Memo
structured_llm = llm.with_structured_output(DecisionMemo)

# --- METACOGNITIVE SYSTEM PROMPT ---
# This prompt forces the agent to perform an "Internal Peer Review" before outputting.
META_SOC_PROMPT = (
    "You are a Metacognitive Cybersecurity Analyst. Your role is not just to analyze threats, "
    "but to critique the validity of your own security assumptions.\n\n"
    "PHASE 1: INITIAL ANALYSIS\n"
    "- Identify the TTPs and potential attack surface based on: {task_description}.\n\n"
    "PHASE 2: METACOGNITIVE REFLECTION (Internal Monologue)\n"
    "- Question your own biases: Are you over-prioritizing one vendor or framework?\n"
    "- Check for 'Tunnel Vision': What edge cases (e.g., Living off the Land binaries) are you missing?\n"
    "- Evaluate Confidence: Is the telemetry actually sufficient for this conclusion?\n\n"
    "PHASE 3: REFINED DECISION MEMO\n"
    "Generate a world-class memo based on the perspective of: {perspective}.\n"
    "Incorporate your reflections into the 'Operational Risks' and 'Technical Recommendations'.\n\n"
    "SPECIFIC INSTRUCTIONS: {instructions}"
)

prompt = ChatPromptTemplate.from_messages([
    ("system", META_SOC_PROMPT),
    ("user", "TASK: {task_description}")
])

def generate_memo_node(state: AgentState):
    """
    LangGraph node simulating metacognition. 
    It 'interrogates' the task before committing to a DecisionMemo.
    """
    perspective = state.get("perspective", "Chief Information Security Officer (CISO)")
    
    print(f"\n[META-COGNITION] Agent active: {perspective}")
    print(f"[META-COGNITION] Analyzing potential cognitive biases for task: {state['task_description'][:50]}...")

    # The Chain: Context -> Reflection -> Structured Output
    chain = prompt | structured_llm

    try:
        # Execution with full state context
        memo = chain.invoke({
            "perspective": perspective,
            "instructions": state.get("instructions", "Perform deep-dive adversarial analysis."),
            "task_description": state.get("task_description", "")
        })
        
        # Simulated 'Self-Correction' log
        print(f"[META-COGNITION] Validation complete. Confidence: {getattr(memo, 'confidence', 'N/A')}")
        print(f"<- Memo finalized for {perspective}")

        return {"memos": [memo]}

    except Exception as e:
        print(f"[SYSTEM FAILURE] Metacognitive loop interrupted: {str(e)}")
        raise e
