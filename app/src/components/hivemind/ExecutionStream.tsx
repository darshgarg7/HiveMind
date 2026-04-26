import { useEffect, useRef } from "react";
import { Activity, Check, Loader2, Terminal, X } from "lucide-react";
import type { ExecutionEvent } from "@/lib/hivemind-types";
import { cn } from "@/lib/utils";

interface ExecutionStreamProps {
  events: ExecutionEvent[];
  isRunning: boolean;
}

function fmtTime(ts: number) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

export function ExecutionStream({ events, isRunning }: ExecutionStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  // Deduplicate by id, keeping the last status update for each
  const merged = new Map<string, ExecutionEvent>();
  for (const e of events) merged.set(e.id, e);
  const list = Array.from(merged.values());

  return (
    <section className="glass overflow-hidden rounded-2xl">
      <header className="flex items-center justify-between border-b border-white/5 bg-black/20 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-[color:var(--neon-cyan)]" aria-hidden />
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-foreground/80">
            Execution Stream
          </span>
          {isRunning && (
            <span className="flex items-center gap-1 font-mono text-[10px] text-[color:var(--neon-cyan)]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--neon-cyan)] opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[color:var(--neon-cyan)]" />
              </span>
              live
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
          <Activity className="h-3 w-3" />
          {list.filter((e) => e.status === "done").length} / {list.length}
        </div>
      </header>

      <div
        ref={scrollRef}
        className="max-h-[260px] overflow-auto bg-black/30 px-4 py-3 font-mono text-[12px] leading-relaxed"
      >
        {list.length === 0 ? (
          <p className="text-muted-foreground">// awaiting execution…</p>
        ) : (
          <ul className="space-y-0.5">
            {list.map((e) => (
              <li
                key={e.id}
                className={cn(
                  "flex items-start gap-2",
                  e.status === "queued" && "text-muted-foreground/60",
                  e.status === "running" && "text-[color:var(--neon-cyan)]",
                  e.status === "done" && "text-foreground/90",
                  e.status === "error" && "text-rose-300",
                )}
              >
                <span className="shrink-0 text-muted-foreground/70">[{fmtTime(e.ts)}]</span>
                <StatusIcon status={e.status} />
                <span className="shrink-0 font-semibold">{e.phase}</span>
                <span className="text-muted-foreground/40">·</span>
                <span className="min-w-0 flex-1 break-words">{e.message}</span>
                {e.durationMs != null && e.status === "done" && (
                  <span className="shrink-0 text-muted-foreground/60">{e.durationMs}ms</span>
                )}
              </li>
            ))}
            {isRunning && (
              <li className="flex items-center gap-2 text-[color:var(--neon-cyan)]">
                <span className="text-muted-foreground/70">[{fmtTime(Date.now())}]</span>
                <span className="animate-pulse">▮</span>
              </li>
            )}
          </ul>
        )}
      </div>
    </section>
  );
}

function StatusIcon({ status }: { status: ExecutionEvent["status"] }) {
  if (status === "running")
    return <Loader2 className="mt-0.5 h-3 w-3 shrink-0 animate-spin" aria-hidden />;
  if (status === "done") return <Check className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />;
  if (status === "error") return <X className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />;
  return <span className="mt-0.5 h-3 w-3 shrink-0 rounded-full border border-current opacity-40" />;
}