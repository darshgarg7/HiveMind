// Per-step detection evidence hints for the adversarial preview.
// For each MITRE technique we surface:
//   - confirm:  telemetry signals that, if present, would CONFIRM the step happened
//   - falsify:  observations that, if absent or contradicted, would FALSIFY the
//               hypothesis that this step is occurring (i.e. rule it out)
//   - source:   the primary log/data source an analyst would pivot into
//
// Heuristic: technique-specific overrides take precedence; otherwise we fall back
// to a tactic-level default. This is intentionally client-side and curated so it
// reads credibly to a senior security audience without backend calls.

import type { TacticId } from "@/lib/mitre-catalog";

export interface DetectionEvidence {
  confirm: string[];
  falsify: string[];
  source: string;
}

const TACTIC_DEFAULT: Record<TacticId, DetectionEvidence> = {
  reconnaissance: {
    confirm: ["External scan / OSINT pulls against owned assets", "Spike in WHOIS / cert transparency lookups"],
    falsify: ["No anomalous external probing in 30d baseline", "No targeted asset enumeration in WAF logs"],
    source: "Edge / WAF / threat-intel feeds",
  },
  "resource-development": {
    confirm: ["Newly-registered lookalike domains", "Attacker infra appears in TI feeds"],
    falsify: ["No related domain registrations in passive DNS", "No matching infra in TI sharing groups"],
    source: "Passive DNS, CT logs, TI platform",
  },
  "initial-access": {
    confirm: ["First-seen sign-in from anomalous geo/device", "Inbound payload flagged by gateway sandbox"],
    falsify: ["No new external auth on target identity", "Gateway / WAF show clean inbound for window"],
    source: "Identity provider + email/web gateway",
  },
  execution: {
    confirm: ["EDR child-process tree from Office / browser", "Unsigned or LOLBin process with network egress"],
    falsify: ["No suspicious process tree on host in window", "AMSI / script-block logs show no anomalous content"],
    source: "EDR process telemetry",
  },
  persistence: {
    confirm: ["New autorun / service / scheduled task created", "Directory account created outside change window"],
    falsify: ["Autoruns diff matches gold baseline", "No new privileged accounts in audit log"],
    source: "EDR persistence + directory audit",
  },
  "privilege-escalation": {
    confirm: ["Integrity-level transition without elevation prompt", "Role assumption to admin role outside PIM"],
    falsify: ["No new admin role assignments", "No exploitation telemetry from EDR exploit-guard"],
    source: "EDR + cloud audit (CloudTrail / Entra)",
  },
  "defense-evasion": {
    confirm: ["EDR agent heartbeat loss on target host", "Security event log cleared / shipping gap"],
    falsify: ["EDR / SIEM heartbeats continuous through window", "No tamper-protection alerts fired"],
    source: "EDR health + SIEM ingestion telemetry",
  },
  "credential-access": {
    confirm: ["LSASS handle access by non-system process", "Burst of failed auths followed by success"],
    falsify: ["Credential Guard active, no LSASS read events", "No anomalous auth pattern on identity"],
    source: "EDR + identity sign-in logs",
  },
  discovery: {
    confirm: ["LDAP / AD enumeration burst from single host", "Internal port scan signatures east-west"],
    falsify: ["No abnormal directory query volume", "No internal scan signatures in NDR"],
    source: "NDR + directory audit",
  },
  "lateral-movement": {
    confirm: ["RDP/SMB to host that principal never reaches", "New service install on remote host"],
    falsify: ["Auth graph matches user's normal peer set", "No remote service installs in window"],
    source: "Auth graph + EDR remote-exec telemetry",
  },
  collection: {
    confirm: ["Bulk read by principal far above their baseline", "Off-hours access to sensitive repository"],
    falsify: ["Read volume within normal band for principal", "No sensitivity-labeled access events"],
    source: "Data platform audit + DLP",
  },
  "command-and-control": {
    confirm: ["Low-and-slow beaconing to rare destination", "JA3 / TLS fingerprint anomaly with periodicity"],
    falsify: ["Egress matches known-good destinations only", "No periodicity in outbound flows for host"],
    source: "NDR / proxy / DNS",
  },
  exfiltration: {
    confirm: ["Outbound volume spike to unsanctioned SaaS", "DLP match on egress payload"],
    falsify: ["Egress within baseline + only to sanctioned SaaS", "No DLP signal on outbound content"],
    source: "CASB / DLP / proxy",
  },
  impact: {
    confirm: ["Mass file rename / encryption telemetry", "Backup deletion or shadow-copy removal events"],
    falsify: ["No canary file triggers in window", "Backup catalog intact, no vssadmin / wbadmin events"],
    source: "EDR ransomware behavior + backup audit",
  },
};

// Technique-specific overrides for the highest-signal steps.
const TECHNIQUE_OVERRIDES: Record<string, DetectionEvidence> = {
  "T1566.001": {
    confirm: [
      "Sandbox detonation flags malicious macro / attachment",
      "EDR shows winword.exe → powershell.exe child process",
    ],
    falsify: [
      "No matching message-id in mail trace for window",
      "User mailbox shows no quarantined / delivered match",
    ],
    source: "Email gateway + EDR",
  },
  "T1566.002": {
    confirm: [
      "URL rewrite click on lookalike domain",
      "Impossible-travel sign-in shortly after click",
    ],
    falsify: [
      "No click-through events on rewritten URLs",
      "Sign-in geo / device matches user baseline",
    ],
    source: "URL rewrite logs + IdP sign-in logs",
  },
  "T1190": {
    confirm: [
      "WAF anomaly burst against vulnerable endpoint",
      "Outbound from DMZ host to attacker-controlled IP",
    ],
    falsify: [
      "No WAF anomalies on exposed app in window",
      "DMZ egress matches known allow-list only",
    ],
    source: "WAF + NDR egress",
  },
  "T1078": {
    confirm: [
      "Existing session reused from new device fingerprint",
      "Token replay observed on new ASN",
    ],
    falsify: [
      "Session bound to original device throughout window",
      "No token replay alerts from IdP",
    ],
    source: "IdP session / token telemetry",
  },
  "T1059.001": {
    confirm: [
      "Encoded PowerShell command logged via script-block logging",
      "AMSI flagged content in PS pipeline",
    ],
    falsify: [
      "Constrained Language Mode active, no -enc usage",
      "AMSI logs clean for window",
    ],
    source: "PowerShell script-block + AMSI",
  },
  "T1003.001": {
    confirm: [
      "Non-system process opens handle to lsass.exe with VM_READ",
      "Suspicious memory read pattern flagged by EDR",
    ],
    falsify: [
      "LSA Protection enabled, no abnormal LSASS handles",
      "Credential Guard prevents lsass memory access",
    ],
    source: "EDR LSASS access telemetry",
  },
  "T1539": {
    confirm: [
      "Same auth cookie observed on second device fingerprint",
      "Token-binding mismatch on session validation",
    ],
    falsify: [
      "Token bound to original device for full lifetime",
      "No CAE revocation events fired",
    ],
    source: "IdP session / CAE telemetry",
  },
  "T1071.001": {
    confirm: [
      "Periodic beacon to rare destination with low jitter",
      "JA3 fingerprint matches known C2 family",
    ],
    falsify: [
      "Outbound flows aperiodic and to known-good only",
      "No JA3 anomalies vs 30-day baseline",
    ],
    source: "NDR / proxy JA3 telemetry",
  },
  "T1486": {
    confirm: [
      "Mass file rename to single extension across share",
      "Canary file modified by non-owner process",
    ],
    falsify: [
      "No canary triggers, file-write rate within baseline",
      "EDR ransomware behavior model below threshold",
    ],
    source: "EDR ransomware behavior + canary files",
  },
  "T1490": {
    confirm: [
      "vssadmin delete shadows / wbadmin delete catalog observed",
      "Backup console API calls from non-admin host",
    ],
    falsify: [
      "Backup catalog intact, no shadow-copy deletions",
      "Backup console access only from privileged workstations",
    ],
    source: "Backup audit + EDR",
  },
  "T1567.002": {
    confirm: [
      "Egress to unsanctioned cloud storage from sensitive host",
      "DLP match on outbound to personal cloud sync",
    ],
    falsify: [
      "All cloud egress goes to sanctioned tenants only",
      "No DLP matches on outbound content in window",
    ],
    source: "CASB + DLP",
  },
  "T1041": {
    confirm: [
      "Outbound bytes from host significantly above baseline",
      "Sustained encrypted egress to single rare destination",
    ],
    falsify: [
      "Egress volume within normal envelope for host",
      "No long-lived flows to rare destinations",
    ],
    source: "NDR flow telemetry",
  },
  "T1498": {
    confirm: [
      "Traffic baseline deviation per route exceeds threshold",
      "Upstream scrubbing service reports active mitigation",
    ],
    falsify: [
      "Request rate per route within normal band",
      "No upstream mitigation events in window",
    ],
    source: "Edge / CDN / scrubbing telemetry",
  },
  "T1110": {
    confirm: [
      "Auth failure rate spike across many accounts from few IPs",
      "Low-and-slow failed-auth fan-out across tenant",
    ],
    falsify: [
      "Auth failure rate within normal envelope",
      "No spray pattern across accounts in IdP logs",
    ],
    source: "IdP sign-in logs",
  },
  "T1021.001": {
    confirm: [
      "RDP from host that is not an approved jump server",
      "RDP source IP first-seen for destination host",
    ],
    falsify: [
      "RDP only from JIT-approved jump hosts",
      "No new source-destination RDP edges in window",
    ],
    source: "Auth graph + RDP gateway logs",
  },
  "T1021.002": {
    confirm: [
      "SMB write of executable to ADMIN$ on remote host",
      "Service install event on destination after SMB write",
    ],
    falsify: [
      "No SMB writes to admin shares in window",
      "No new service installs across fleet",
    ],
    source: "EDR remote-exec + Windows event 7045",
  },
  "T1213": {
    confirm: [
      "Bulk read by principal far above per-user baseline",
      "Sensitivity-labeled doc access outside business hours",
    ],
    falsify: [
      "Read volume within baseline for principal",
      "No labeled-doc access events for principal",
    ],
    source: "M365 / data platform audit",
  },
  "T1657": {
    confirm: [
      "Wire approved without out-of-band verification",
      "Vendor banking detail change with no callback record",
    ],
    falsify: [
      "Out-of-band verification recorded for payment",
      "Vendor change followed documented callback control",
    ],
    source: "Finance workflow + vendor master audit",
  },
};

export function evidenceFor(techniqueId: string, tactic: TacticId): DetectionEvidence {
  return TECHNIQUE_OVERRIDES[techniqueId] ?? TACTIC_DEFAULT[tactic];
}