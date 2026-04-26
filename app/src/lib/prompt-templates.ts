export interface ScenarioTemplate {
  id: string;
  label: string;
  emoji: string;
  prompt: string;
}

export const SCENARIO_TEMPLATES: ScenarioTemplate[] = [
  {
    id: "phishing",
    label: "Phishing campaign",
    emoji: "🎣",
    prompt:
      "Coordinated spear-phishing campaign targeting the finance department over the past 72h. Spoofed vendor invoice emails with malicious .docm attachments leveraging CVE-style macro execution. Two finance analysts opened attachments; one entered SSO credentials on a lookalike portal. Suspected lateral movement via stolen Okta session cookies. Need to: contain identity compromise, decide whether to force-rotate all SSO sessions tonight, balance disruption vs. exposure. Constraint: quarterly close in progress, leadership wants minimum business impact.",
  },
  {
    id: "ransomware",
    label: "Ransomware",
    emoji: "🔒",
    prompt:
      "Ransomware indicators on three engineering workstations: encrypted .lck extension, ransom note dropped, suspected initial access via exposed RDP on a forgotten jump host. EDR shows lsass dumping ~36h ago, DC enumeration, and SMB writes to 12 file servers. No exfil confirmed yet. Backups exist (offline, 24h RPO) but restoration window unknown. Decide: isolate vs. observe to map blast radius, pay vs. restore, public disclosure timing. Constraint: SaaS product must stay online for paying customers.",
  },
  {
    id: "insider",
    label: "Insider threat",
    emoji: "🕵️",
    prompt:
      "Senior data engineer (resigning, 2-week notice) downloaded 14GB from internal data lake over 4 nights, including customer PII and pricing models. Activity outside normal hours, used personal cloud sync client briefly before being blocked. Legal flagged competitor as likely destination. Need to: preserve evidence, decide on revoking access immediately vs. monitoring, coordinate with HR/legal, contain reputational risk. Constraint: zero false-positive tolerance — reputational damage to the employee if wrong.",
  },
  {
    id: "supply-chain",
    label: "Supply chain",
    emoji: "🔗",
    prompt:
      "Upstream npm package used in our customer-facing web app published a malicious version 2 hours ago — postinstall script exfiltrates env vars to attacker-controlled domain. We pin to ^1.x but CI auto-bumped on a feature branch yesterday; build artifacts may have shipped to staging. No production deploy yet. Decide: rollback strategy, secret rotation scope (which env vars are exposed in which environments), customer notification thresholds, and policy change to prevent recurrence. Constraint: a release was planned tomorrow morning.",
  },
  {
    id: "ddos",
    label: "Volumetric DDoS",
    emoji: "🌊",
    prompt:
      "Sustained L7 HTTP flood targeting checkout API — 480k req/s from ~12k unique IPs across residential ranges in 30+ countries, low and slow per-IP rate making rate limits ineffective. CDN absorbing 70%, origin saturating. Suspected extortion precursor (no demand yet). Decide: tighten WAF rules vs. accept false positives on real customers, enable CAPTCHA on checkout (revenue impact), engage upstream scrubbing provider (cost), or ride it out. Constraint: Black Friday in 11 days, traffic patterns must remain legitimate-friendly.",
  },
];

export interface FrameworkFields {
  asset: string;
  actor: string;
  ttps: string;
  indicators: string;
  constraints: string;
}

export function composeFramework(f: FrameworkFields): string {
  const lines: string[] = [];
  if (f.asset.trim()) lines.push(`Target asset / system: ${f.asset.trim()}`);
  if (f.actor.trim()) lines.push(`Suspected threat actor: ${f.actor.trim()}`);
  if (f.ttps.trim()) lines.push(`Observed TTPs: ${f.ttps.trim()}`);
  if (f.indicators.trim()) lines.push(`Indicators / telemetry: ${f.indicators.trim()}`);
  if (f.constraints.trim()) lines.push(`Constraints / objectives: ${f.constraints.trim()}`);
  return lines.join("\n");
}

export const EMPTY_FRAMEWORK: FrameworkFields = {
  asset: "",
  actor: "",
  ttps: "",
  indicators: "",
  constraints: "",
};