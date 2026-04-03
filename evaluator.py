from typing import List, Dict, Any
from pydantic import BaseModel, Field
import os
from langchain_openai import AzureChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from schema import GraphState, DecisionMemo

# Set up LLM
llm = AzureChatOpenAI(
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    azure_deployment=os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4.1"),
    api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2025-01-01-preview"),
    temperature=0.0
)

class EvaluationScore(BaseModel):
    relevance: float = Field(description="Score from 0.0 to 1.0 on relevance to the task")
    reasoning: float = Field(description="Score from 0.0 to 1.0 on quality of reasoning")
    constraint_satisfaction: float = Field(description="Score from 0.0 to 1.0 on satisfying constraints")
    overall_score: float = Field(description="Overall composed score from 0.0 to 1.0")

class MemoEvaluation(BaseModel):
    perspective: str
    score: EvaluationScore
    feedback: str = Field(description="Brief feedback on the memo")

class RankedStrategies(BaseModel):
    evaluations: List[MemoEvaluation] = Field(description="Evaluation for each memo")
    ranked_perspectives: List[str] = Field(description="Ranked list of perspectives, from best to worst")
    final_recommendation: str = Field(description="A synthesized final recommendation based on the top strategies")


evaluator_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are an expert evaluator. The original task was:\n{task_description}\n\nYou will receive several decision memos from different perspectives. Evaluate each, score them, rank them, and provide a final recommendation."),
    ("user", "Memos:\n{memos_text}")
])

structured_evaluator_llm = llm.with_structured_output(RankedStrategies)

def evaluate_memos_node(state: GraphState):
    """LangGraph node to evaluate and rank all collected memos."""
    print("-> Evaluator running...")
    memos = state.get("memos", [])
    if not memos:
        print("No memos found to evaluate.")
        return {"ranked_strategies": []}
        
    memos_text = ""
    for i, memo in enumerate(memos):
        memos_text += f"--- Memo {i+1} ({memo.perspective}) ---\n"
        memos_text += f"Strategy: {memo.strategy}\n"
        memos_text += f"Assumptions: {', '.join(memo.assumptions)}\n"
        memos_text += f"Risks: {', '.join(memo.risks)}\n"
        memos_text += f"Second Order Effects: {', '.join(memo.second_order_effects)}\n\n"
        
    chain = evaluator_prompt | structured_evaluator_llm
    
    result = chain.invoke({
        "task_description": state["task_description"],
        "memos_text": memos_text
    })
    
    # Store the result in a serialized dict for the state
    ranked_strategies = result.model_dump()
    
    print("<- Evaluator completed.")
    return {"ranked_strategies": [ranked_strategies]}
