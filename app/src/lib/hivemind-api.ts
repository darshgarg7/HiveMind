import type { RunResponse } from "./hivemind-types";
import { parseRunResponse, SchemaValidationError } from "./hivemind-schema";

const DEFAULT_ENDPOINT = "http://localhost:8000/run";
const STORAGE_KEY = "hivemind:apiUrl";

function normalizeBase(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, "");
  if (!trimmed) return DEFAULT_ENDPOINT;
  if (trimmed === "/run") return "http://localhost:8000/run";
  // If user pasted a base URL (no /run), append it.
  if (/\/run$/i.test(trimmed)) return trimmed;
  return `${trimmed}/run`;
}

export function getApiUrl(): string {
  if (typeof window === "undefined") return DEFAULT_ENDPOINT;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && stored.trim()) return normalizeBase(stored);
  } catch {
    /* ignore */
  }
  return DEFAULT_ENDPOINT;
}

export function setApiUrl(url: string): string {
  const next = url.trim();
  if (typeof window !== "undefined") {
    try {
      if (!next) window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }
  return getApiUrl();
}

export function clearApiUrl(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export const DEFAULT_API_URL = DEFAULT_ENDPOINT;

export async function runCausalEngine(taskDescription: string): Promise<RunResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  const endpoint = getApiUrl();

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Skip the localtunnel.me browser warning interstitial.
        "Bypass-Tunnel-Reminder": "true",
      },
      body: JSON.stringify({ task_description: taskDescription }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Backend returned ${res.status} ${res.statusText}${text ? `: ${text.slice(0, 200)}` : ""}`,
      );
    }

    const json = await res.json();
    return parseRunResponse(json);
  } catch (err) {
    if (err instanceof SchemaValidationError) {
      throw err;
    }
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Request timed out after 60 seconds.");
    }
    if (err instanceof TypeError) {
      throw new Error(
        `Could not reach the HiveMind backend at ${endpoint}. Check the internal /run route or configure a reachable external endpoint in Settings.`,
      );
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}