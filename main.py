import json
import os
from datetime import datetime
from dotenv import load_dotenv
import streamlit as st

load_dotenv()

from graph import build_graph


def main():
    st.set_page_config(page_title="HiveMind MVP", page_icon="🧠", layout="centered")

    st.title("🧠 HiveMind Interface")
    st.markdown(
        "Enter your incident report or task description below, and let the HiveMind analyze it to suggest strategies and recommendations.",
        help="The HiveMind graph will evaluate the task from multiple perspectives and rank the best approaches."
    )

    default_text = (
        "INCIDENT REPORT: An anomalous spike in outbound SSH traffic directed to an unknown IP "
        "was detected originating from a restricted production database server. Initial "
        "triage shows a service account with potentially compromised credentials was utilized."
    )

    # Task input
    task_description = st.text_area("Task Description", value=default_text, height=150)

    if st.button("Run HiveMind", type="primary", use_container_width=True):
        if not task_description.strip():
            st.warning("Please provide a task description before running.")
            return

        with st.status("Running HiveMind Analysis...", expanded=True) as status:
            st.write("Building execution graph...")
            graph = build_graph()

            initial_state = {
                "task_description": task_description,
                "memos": [],
                "agent_configs": [],
                "ranked_strategies": []
            }

            st.write("Executing graph nodes...")
            try:
                final_state = graph.invoke(initial_state)
                status.update(label="Analysis Complete", state="complete", expanded=False)
            except Exception as e:
                status.update(label="Execution Failed", state="error", expanded=False)
                st.error(f"Error executing graph: {str(e)}")
                return

        # Save artifacts
        run_id = f"run-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        os.makedirs("data", exist_ok=True)

        def serialize_pydantic(obj):
            if hasattr(obj, "model_dump"):
                return obj.model_dump()
            return obj

        memos_serialized = [serialize_pydantic(m) for m in final_state.get("memos", [])]

        artifact = {
            "run_id": run_id,
            "task_description": task_description,
            "memos": memos_serialized,
            "ranked_strategies": final_state.get("ranked_strategies", [])
        }

        artifact_path = f"data/{run_id}.json"
        with open(artifact_path, "w") as f:
            json.dump(artifact, f, indent=2)

        st.success(f"Artifact successfully saved to `{artifact_path}`")

        st.divider()
        st.header("📊 Analysis Results")

        ranked_strats = final_state.get("ranked_strategies", [])

        if ranked_strats:
            result = ranked_strats[0]

            # 🔥 Final Recommendation
            st.subheader("💡 Final Recommendation")
            st.info(result.get("final_recommendation", "No specific recommendation provided."))

            # 🏆 Ranked Strategies with Expanders
            st.subheader("🏆 Ranked Strategies")

            perspectives = result.get("ranked_perspectives", [])
            memos = final_state.get("memos", [])

            if perspectives:
                for idx, strategy in enumerate(perspectives, 1):
                    title = f"🛡️ Strategy {idx}" if idx == 1 else f"Strategy {idx}"

                    with st.expander(title, expanded=(idx == 1)):
                        # Case 1: strategy is a string
                        if isinstance(strategy, str):
                            st.markdown(f"**Summary:** {strategy}")

                        # Case 2: strategy is structured
                        elif isinstance(strategy, dict):
                            st.markdown(f"**Summary:** {strategy.get('summary', 'N/A')}")

                            if "details" in strategy:
                                st.markdown("**Details:**")
                                st.write(strategy["details"])

                            if "reasoning" in strategy:
                                st.markdown("**Reasoning:**")
                                st.write(strategy["reasoning"])

                            if "score" in strategy:
                                st.markdown(f"**Score:** {strategy['score']}")

                        # 🧠 Related memos (light relevance match)
                        if memos:
                            related = []
                            for memo in memos:
                                if isinstance(memo, dict):
                                    content = memo.get("content", "")
                                else:
                                    content = str(memo)

                                if any(word in content.lower() for word in str(strategy).lower().split()):
                                    related.append(content)

                            if related:
                                st.markdown("**Related Insights:**")
                                for r in related:
                                    st.markdown(f"- {r}")

            else:
                st.write("No ranked perspectives returned.")

            # 🔍 Optional raw output
            with st.expander("🔍 View Raw Output"):
                st.json(result)

        else:
            st.warning("No ranking produced by the HiveMind.")


if __name__ == "__main__":
    main()