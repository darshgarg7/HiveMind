from sentence_transformers import SentenceTransformer, util

model = SentenceTransformer('all-MiniLM-L6-v2')


# --- Helper Functions ---

# relevance = semantic similarity between task and content
def compute_relevance(task, content):
    if not task or not content:
        return 0.0

    emb1 = model.encode(task, convert_to_tensor=True)
    emb2 = model.encode(str(content), convert_to_tensor=True)

    return float(util.cos_sim(emb1, emb2))


# structure = presence of required fields
def compute_structure_score(content):
    if not isinstance(content, dict):
        return 0.0

    required_fields = ["strategy", "risks", "assumptions"]
    present = sum(1 for f in required_fields if f in content)

    return present / len(required_fields)

# reasoning = presence of reasoning indicators such as 'because', 'therefore', 'risk', etc.
def compute_reasoning_score(content):
    text = str(content).lower()

    score = 0

    if "because" in text or "therefore" in text:
        score += 0.3
    if "risk" in text:
        score += 0.3
    if len(text) > 300:
        score += 0.4

    return min(score, 1.0)


def score_artifact(artifact: dict) -> dict:
    content = artifact.get("content", "")
    task = artifact.get("task", "")

    relevance = compute_relevance(task, content)
    structure = compute_structure_score(content)
    reasoning = compute_reasoning_score(content)

    # Map structure → constraint satisfaction
    constraint_satisfaction = structure

    # Final weighted score
    final_score = (
        0.4 * relevance +
        0.3 * reasoning +
        0.3 * constraint_satisfaction
    )

    return {
        "artifact_id": artifact.get("id"),
        "score": round(final_score, 3),
        "metrics": {
            "relevance": round(relevance, 3),
            "reasoning": round(reasoning, 3),
            "constraint_satisfaction": round(constraint_satisfaction, 3)
        }
    }