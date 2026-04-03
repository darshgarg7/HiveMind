import os
from langchain_openai import AzureChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from schema import AgentState, DecisionMemo

# Set up LLM
llm = AzureChatOpenAI(
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    azure_deployment=os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4.1"),
    api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2025-01-01-preview"),
    temperature=0.7
)

structured_llm = llm.with_structured_output(DecisionMemo)

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are an expert consultant focusing on the {perspective} perspective. {instructions} Generate a detailed decision memo."),
    ("user", "Task: {task_description}")
])

def generate_memo_node(state: AgentState):
    """LangGraph node to generate a decision memo based on a specific perspective."""
    print(f"-> Agent running for perspective: {state['perspective']}")
    chain = prompt | structured_llm
    memo = chain.invoke({
        "perspective": state["perspective"],
        "instructions": state["instructions"],
        "task_description": state["task_description"]
    })
    
    print(f"<- Agent completed: {state['perspective']}")
    # Return MUST match the graph state key we want to update (reducing)
    return {"memos": [memo]}
