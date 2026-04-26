import { forwardRef, useMemo, useState } from "react";
import { ArrowRight, GitBranch, Network, Table2, Workflow } from "lucide-react";
import type { CausalEdge, CausalGraph, CausalNode } from "@/lib/hivemind-types";
import { CausalGraph as CausalGraphViz, type CausalGraphHandle } from "./CausalGraph";
import { NodeInspector } from "./NodeInspector";
import { cn } from "@/lib/utils";
import {
  evidenceColor,
  evidenceLabel,
  type EdgeAnnotation,
} from "@/lib/agent-runtime";

interface CausalGraphPanelProps {
  graph: CausalGraph;
  edgeAnnotations?: EdgeAnnotation[];
}

export const CausalGraphPanel = forwardRef<CausalGraphHandle, CausalGraphPanelProps>(
  function CausalGraphPanel({ graph, edgeAnnotations }, ref) {
  const nodes = graph?.nodes ?? [];
  const edges = graph?.edges ?? [];
  const [view, setView] = useState<"graph" | "table">("graph");
  const [selectedNode, setSelectedNode] = useState<CausalNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<CausalEdge | null>(null);

  const annByKey = useMemo(() => {
    const m = new Map<string, EdgeAnnotation>();
    if (edgeAnnotations) for (const a of edgeAnnotations) m.set(a.key, a);
    return m;
  }, [edgeAnnotations]);

  return (
    <section className="glass overflow-hidden rounded-2xl">
      <header className="flex items-center justify-between border-b border-white/5 px-6 py-4">
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4 text-[color:var(--neon-violet)]" aria-hidden />
          <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-foreground">
            Causal Graph
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden gap-3 font-mono text-xs text-muted-foreground sm:flex">
            <span>{nodes.length} nodes</span>
            <span className="text-white/20">·</span>
            <span>{edges.length} edges</span>
            {edgeAnnotations && edgeAnnotations.length > 0 && (
              <>
                <span className="text-white/20">·</span>
                <span className="text-emerald-300/80">
                  {edgeAnnotations.filter((e) => e.validated).length} validated
                </span>
              </>
            )}
          </div>
          <div className="flex rounded-lg border border-white/10 bg-black/30 p-0.5">
            <button
              type="button"
              onClick={() => setView("graph")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] uppercase tracking-wider transition-colors",
                view === "graph"
                  ? "bg-[color:var(--neon-cyan)]/15 text-[color:var(--neon-cyan)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Workflow className="h-3 w-3" />
              Graph
            </button>
            <button
              type="button"
              onClick={() => setView("table")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] uppercase tracking-wider transition-colors",
                view === "table"
                  ? "bg-[color:var(--neon-cyan)]/15 text-[color:var(--neon-cyan)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Table2 className="h-3 w-3" />
              Tables
            </button>
          </div>
        </div>
      </header>

      {view === "graph" ? (
        <div className="grid gap-px bg-white/5 lg:grid-cols-[1fr_280px]">
          <div className="bg-[oklch(0.16_0.03_260/0.6)] p-3">
            <CausalGraphViz
              ref={ref}
              graph={graph}
              edgeAnnotations={edgeAnnotations}
              onSelectNode={(n) => {
                setSelectedNode(n);
                if (n) setSelectedEdge(null);
              }}
              onSelectEdge={(e) => {
                setSelectedEdge(e);
                if (e) setSelectedNode(null);
              }}
              height={480}
            />
          </div>
          <aside className="bg-[oklch(0.16_0.03_260/0.6)]">
            <NodeInspector
              node={selectedNode}
              edge={selectedEdge}
              graph={graph}
              onClose={() => {
                setSelectedNode(null);
                setSelectedEdge(null);
              }}
            />
          </aside>
        </div>
      ) : (
        <div className="grid gap-px bg-white/5 lg:grid-cols-2">
        {/* Nodes */}
        <div className="bg-[oklch(0.16_0.03_260/0.6)]">
          <div className="flex items-center gap-2 px-6 py-3 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--neon-cyan)]" />
            Nodes
          </div>
          <div className="max-h-[420px] overflow-auto px-2 pb-3">
            {nodes.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No nodes.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[oklch(0.16_0.03_260/0.85)] backdrop-blur">
                  <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2 font-medium">ID</th>
                    <th className="px-4 py-2 font-medium">Label</th>
                  </tr>
                </thead>
                <tbody>
                  {nodes.map((n) => (
                    <tr
                      key={n.id}
                      className="border-t border-white/5 transition-colors hover:bg-white/5"
                    >
                      <td className="px-4 py-2.5 font-mono text-xs text-[color:var(--neon-cyan)]">
                        {n.id}
                      </td>
                      <td className="px-4 py-2.5 text-foreground/90">{n.label}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Edges */}
        <div className="bg-[oklch(0.16_0.03_260/0.6)]">
          <div className="flex items-center gap-2 px-6 py-3 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            <GitBranch className="h-3 w-3 text-[color:var(--neon-violet)]" aria-hidden />
            Edges
          </div>
          <div className="max-h-[420px] overflow-auto px-2 pb-3">
            {edges.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No edges.</p>
            ) : (
              <ul className="space-y-1.5 px-2 py-1">
                {edges.map((e, i) => {
                  const ann = annByKey.get(`${e.source}->${e.target}`);
                  return (
                    <li
                      key={`${e.source}-${e.target}-${i}`}
                      className="group flex flex-wrap items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5 transition-colors hover:border-[color:var(--neon-violet)]/30 hover:bg-white/[0.04]"
                    >
                      <span className="font-mono text-xs text-[color:var(--neon-cyan)]">
                        {e.source}
                      </span>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <ArrowRight className="h-3 w-3" aria-hidden />
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider">
                          {e.relationship}
                        </span>
                        <ArrowRight className="h-3 w-3" aria-hidden />
                      </div>
                      <span className="font-mono text-xs text-[color:var(--neon-violet)]">
                        {e.target}
                      </span>
                      {ann && (
                        <span className="ml-auto flex items-center gap-1.5">
                          <span
                            className="rounded-full px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider"
                            style={{
                              color: `oklch(${evidenceColor(ann.evidenceType)})`,
                              background: `oklch(${evidenceColor(ann.evidenceType)} / 0.12)`,
                            }}
                            title={ann.evidenceSummary}
                          >
                            {evidenceLabel(ann.evidenceType)}
                          </span>
                          <span className="font-mono text-[10px] tabular-nums text-foreground/85">
                            {Math.round(ann.confidence * 100)}%
                          </span>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
        </div>
      )}
    </section>
  );
});