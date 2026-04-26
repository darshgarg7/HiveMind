export interface PromptSuggestion {
  id: string;
  label: string;
  hint: string;
  insert: string;
}

const TIME_PATTERNS =
  /\b(\d+\s*(?:min|minute|hour|day|week|month|h|d|w)s?|today|yesterday|tonight|past\s+\d+|last\s+\d+|\d+:\d+|am|pm|over\s+the\s+(?:past|last)|window|since)\b/i;
const ASSET_PATTERNS =
  /\b(server|database|workstation|laptop|endpoint|cluster|service|api|app|portal|domain|account|repo|repository|s3|bucket|vpc|subnet|host|node|kube|k8s|jump host|edr|siem|sso|okta|ad|active directory)\b/i;
const ACTOR_PATTERNS =
  /\b(attacker|adversary|actor|insider|employee|contractor|apt\d*|ransomware|nation[- ]state|criminal|group|gang|crew|botnet|operator)\b/i;
const OUTCOME_PATTERNS =
  /\b(decide|need to|must|goal|objective|constraint|require|prevent|contain|minimize|maximize|trade[- ]off|balance|prioritize|escalate|notify)\b/i;

export function analyzePrompt(text: string): PromptSuggestion[] {
  const trimmed = text.trim();
  if (trimmed.length < 30) return [];

  const suggestions: PromptSuggestion[] = [];

  if (!TIME_PATTERNS.test(trimmed)) {
    suggestions.push({
      id: "timeframe",
      label: "+ Timeframe",
      hint: "When did this happen / detection window",
      insert: "\nTimeframe: detected over the past 24h, ongoing.",
    });
  }
  if (!ASSET_PATTERNS.test(trimmed)) {
    suggestions.push({
      id: "asset",
      label: "+ Target asset",
      hint: "Which system / service is affected",
      insert: "\nTarget asset: <service / system / data store>.",
    });
  }
  if (!ACTOR_PATTERNS.test(trimmed)) {
    suggestions.push({
      id: "actor",
      label: "+ Threat actor",
      hint: "Who or what is the source",
      insert: "\nSuspected actor: <external attacker / insider / unknown>.",
    });
  }
  if (!OUTCOME_PATTERNS.test(trimmed)) {
    suggestions.push({
      id: "outcome",
      label: "+ Success criteria",
      hint: "What decision or constraint matters",
      insert: "\nDecision needed: <what must be decided>. Constraint: <business limit>.",
    });
  }

  return suggestions;
}