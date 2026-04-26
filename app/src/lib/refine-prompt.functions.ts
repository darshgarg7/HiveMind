import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  draft: z.string().trim().min(10).max(8000),
});

const SYSTEM_PROMPT = `You are a senior cyber-defense analyst helping a SOC operator tighten a threat-scenario brief before it is sent to a causal-reasoning engine.

Rewrite the analyst's draft as a precise, structured event-space description. Preserve every concrete fact (assets, indicators, timelines, actors, constraints). Make implicit context explicit. Do NOT invent facts. Do NOT add decorative language.

Output a single tightened brief — no preamble, no headings, no bullet points unless the original used them. Use plain prose with crisp clauses. Keep it under 220 words.

Emphasize:
- temporal markers (when / over what window)
- target asset(s) and trust boundaries
- threat actor / source attribution (or explicitly note "unknown")
- observable indicators / telemetry
- the decision the operator must make and the business constraints that bound it`;

interface RefineSuccess {
  ok: true;
  refined: string;
}
interface RefineFailure {
  ok: false;
  error: string;
  status?: number;
}
type RefineResult = RefineSuccess | RefineFailure;

export const refinePrompt = createServerFn({ method: "POST" })
  .inputValidator((input: { draft: string }) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<RefineResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false, error: "Lovable AI is not configured (missing LOVABLE_API_KEY)." };
    }

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: data.draft },
          ],
        }),
      });

      if (res.status === 429) {
        return { ok: false, status: 429, error: "Rate limit exceeded. Wait a moment and retry." };
      }
      if (res.status === 402) {
        return {
          ok: false,
          status: 402,
          error: "AI credits exhausted. Add funds in Lovable workspace settings.",
        };
      }
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        return {
          ok: false,
          status: res.status,
          error: `AI gateway error (${res.status}): ${txt.slice(0, 200) || res.statusText}`,
        };
      }

      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const refined = json.choices?.[0]?.message?.content?.trim();
      if (!refined) {
        return { ok: false, error: "AI returned an empty response." };
      }
      return { ok: true, refined };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error refining prompt.",
      };
    }
  });