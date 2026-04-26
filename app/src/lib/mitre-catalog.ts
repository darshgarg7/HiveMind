// Curated subset of MITRE ATT&CK Enterprise techniques used for client-side
// decomposition + kill-chain rendering. Not exhaustive — selected for fidelity
// across the most common enterprise scenarios (ransomware, phishing, insider,
// supply-chain, lateral movement, edge compromise, zero-day).

export type TacticId =
  | "reconnaissance"
  | "resource-development"
  | "initial-access"
  | "execution"
  | "persistence"
  | "privilege-escalation"
  | "defense-evasion"
  | "credential-access"
  | "discovery"
  | "lateral-movement"
  | "collection"
  | "command-and-control"
  | "exfiltration"
  | "impact";

export interface Tactic {
  id: TacticId;
  shortLabel: string; // for kill-chain header
  label: string;
  order: number;
}

export const TACTICS: Tactic[] = [
  { id: "reconnaissance", shortLabel: "Recon", label: "Reconnaissance", order: 1 },
  { id: "resource-development", shortLabel: "Resource Dev", label: "Resource Development", order: 2 },
  { id: "initial-access", shortLabel: "Initial Access", label: "Initial Access", order: 3 },
  { id: "execution", shortLabel: "Execution", label: "Execution", order: 4 },
  { id: "persistence", shortLabel: "Persistence", label: "Persistence", order: 5 },
  { id: "privilege-escalation", shortLabel: "Priv Esc", label: "Privilege Escalation", order: 6 },
  { id: "defense-evasion", shortLabel: "Defense Evasion", label: "Defense Evasion", order: 7 },
  { id: "credential-access", shortLabel: "Cred Access", label: "Credential Access", order: 8 },
  { id: "discovery", shortLabel: "Discovery", label: "Discovery", order: 9 },
  { id: "lateral-movement", shortLabel: "Lateral", label: "Lateral Movement", order: 10 },
  { id: "collection", shortLabel: "Collection", label: "Collection", order: 11 },
  { id: "command-and-control", shortLabel: "C2", label: "Command & Control", order: 12 },
  { id: "exfiltration", shortLabel: "Exfiltration", label: "Exfiltration", order: 13 },
  { id: "impact", shortLabel: "Impact", label: "Impact", order: 14 },
];

export function tacticById(id: TacticId): Tactic {
  return TACTICS.find((t) => t.id === id) ?? TACTICS[0];
}

export interface Technique {
  id: string;            // e.g. "T1566.001"
  name: string;          // e.g. "Spearphishing Attachment"
  tactic: TacticId;
  // keywords used by the decomposer to match free text
  keywords: string[];
  // typical detection signals (one-liner shown in kill-chain)
  detection: string;
  // typical mitigation hint
  mitigation: string;
}

export const TECHNIQUES: Technique[] = [
  // -------- Initial Access --------
  {
    id: "T1566.001",
    name: "Spearphishing Attachment",
    tactic: "initial-access",
    keywords: ["phish", "spear", "attachment", ".docm", "macro", "invoice", "email"],
    detection: "Email gateway sandbox detonation + EDR macro telemetry",
    mitigation: "Disable macros from internet, attachment sandboxing, user reporting",
  },
  {
    id: "T1566.002",
    name: "Spearphishing Link",
    tactic: "initial-access",
    keywords: ["phishing link", "lookalike portal", "credential harvest", "spoofed login"],
    detection: "URL rewriting + browser isolation + impossible-travel sign-in",
    mitigation: "FIDO2/WebAuthn, conditional access, link rewriting",
  },
  {
    id: "T1190",
    name: "Exploit Public-Facing Application",
    tactic: "initial-access",
    keywords: ["zero-day", "0day", "cve", "perimeter", "exposed", "vpn", "edge", "appliance", "rce"],
    detection: "WAF anomaly + outbound from DMZ to attacker infra",
    mitigation: "Patch SLA, virtual patching, network segmentation",
  },
  {
    id: "T1133",
    name: "External Remote Services",
    tactic: "initial-access",
    keywords: ["rdp", "vpn", "jump host", "exposed", "remote service", "ssh"],
    detection: "Geo / impossible-travel auth on remote services",
    mitigation: "MFA, just-in-time access, no internet-exposed RDP",
  },
  {
    id: "T1195.002",
    name: "Compromise Software Supply Chain",
    tactic: "initial-access",
    keywords: ["supply chain", "npm", "pypi", "package", "dependency", "ci/cd", "postinstall"],
    detection: "SBOM diff + outbound from build agents to unknown infra",
    mitigation: "Package pinning, signed builds, hermetic CI",
  },
  {
    id: "T1078",
    name: "Valid Accounts",
    tactic: "initial-access",
    keywords: ["sso", "okta", "session", "valid account", "stolen credential", "session cookie", "token"],
    detection: "Anomalous IP / device on existing session",
    mitigation: "Token binding, short session TTLs, device posture",
  },

  // -------- Execution --------
  {
    id: "T1059.001",
    name: "PowerShell",
    tactic: "execution",
    keywords: ["powershell", "ps1", "encoded command", "iex"],
    detection: "Script block logging + AMSI",
    mitigation: "Constrained Language Mode, signed scripts only",
  },
  {
    id: "T1204.002",
    name: "Malicious File Execution",
    tactic: "execution",
    keywords: ["macro", ".docm", "user opened", "executed", ".exe", "double-click"],
    detection: "Office child-process + EDR behavior",
    mitigation: "ASR rules, app control",
  },

  // -------- Persistence --------
  {
    id: "T1136",
    name: "Create Account",
    tactic: "persistence",
    keywords: ["new account", "rogue account", "backdoor user"],
    detection: "Directory account creation outside change window",
    mitigation: "Just-in-time admin, account creation alerting",
  },
  {
    id: "T1547",
    name: "Boot or Logon Autostart Execution",
    tactic: "persistence",
    keywords: ["registry run", "scheduled task", "startup", "service", "persistence"],
    detection: "Autoruns diff + EDR persistence telemetry",
    mitigation: "App control, autoruns baseline",
  },

  // -------- Privilege Escalation --------
  {
    id: "T1068",
    name: "Exploitation for Privilege Escalation",
    tactic: "privilege-escalation",
    keywords: ["privilege escalation", "kernel exploit", "local exploit", "elevation"],
    detection: "EDR exploitation telemetry + integrity-level transitions",
    mitigation: "OS patch SLA, exploit guard",
  },
  {
    id: "T1078.004",
    name: "Valid Accounts: Cloud Accounts",
    tactic: "privilege-escalation",
    keywords: ["aws iam", "azure ad", "entra", "cloud admin", "global admin", "role assumption"],
    detection: "CloudTrail / Entra audit + impossible-role-assumption",
    mitigation: "Conditional access, PIM/JIT, break-glass review",
  },

  // -------- Defense Evasion --------
  {
    id: "T1562.001",
    name: "Impair Defenses: Disable Tools",
    tactic: "defense-evasion",
    keywords: ["disable edr", "kill av", "tamper", "uninstall agent"],
    detection: "Tamper-protection alerts + agent heartbeat loss",
    mitigation: "Tamper protection, kernel-level EDR",
  },
  {
    id: "T1070",
    name: "Indicator Removal",
    tactic: "defense-evasion",
    keywords: ["clear logs", "wevtutil", "wipe", "delete history"],
    detection: "Log clearing event + central log shipping gap",
    mitigation: "Immutable log forwarding, write-once storage",
  },

  // -------- Credential Access --------
  {
    id: "T1003.001",
    name: "OS Credential Dumping: LSASS Memory",
    tactic: "credential-access",
    keywords: ["lsass", "mimikatz", "credential dump", "secretsdump"],
    detection: "EDR LSASS handle access + memory read patterns",
    mitigation: "Credential Guard, LSA protection, ASR",
  },
  {
    id: "T1110",
    name: "Brute Force",
    tactic: "credential-access",
    keywords: ["brute force", "password spray", "credential stuffing"],
    detection: "Auth failure rate spike + low-and-slow IP fan-out",
    mitigation: "MFA, lockout, risk-based auth",
  },
  {
    id: "T1539",
    name: "Steal Web Session Cookie",
    tactic: "credential-access",
    keywords: ["session cookie", "token theft", "browser cookie"],
    detection: "Token replay from new device fingerprint",
    mitigation: "Token binding, device-bound sessions",
  },

  // -------- Discovery --------
  {
    id: "T1018",
    name: "Remote System Discovery",
    tactic: "discovery",
    keywords: ["network scan", "nmap", "enumeration", "host discovery"],
    detection: "Internal scan signatures + east-west anomaly",
    mitigation: "Microsegmentation, deception hosts",
  },
  {
    id: "T1087.002",
    name: "Account Discovery: Domain Account",
    tactic: "discovery",
    keywords: ["dc enumeration", "domain controller", "ad enumeration", "bloodhound"],
    detection: "LDAP query anomaly + honey-account access",
    mitigation: "AD attack-path management, tiered admin",
  },

  // -------- Lateral Movement --------
  {
    id: "T1021.002",
    name: "SMB / Admin Shares",
    tactic: "lateral-movement",
    keywords: ["smb", "admin share", "psexec", "file server"],
    detection: "SMB write to non-standard hosts + service install",
    mitigation: "SMB signing, segmentation, admin tier separation",
  },
  {
    id: "T1021.001",
    name: "Remote Desktop Protocol",
    tactic: "lateral-movement",
    keywords: ["rdp", "lateral rdp", "remote desktop"],
    detection: "RDP from non-jump host + new source",
    mitigation: "JIT RDP, network-level auth, gateway only",
  },
  {
    id: "T1550.004",
    name: "Use Alternate Authentication: Web Session Cookie",
    tactic: "lateral-movement",
    keywords: ["pass the cookie", "session reuse", "okta lateral"],
    detection: "Same session, new device + geo",
    mitigation: "Continuous access evaluation, token binding",
  },

  // -------- Collection --------
  {
    id: "T1213",
    name: "Data from Information Repositories",
    tactic: "collection",
    keywords: ["data lake", "sharepoint", "confluence", "warehouse", "snowflake", "bigquery"],
    detection: "Bulk read by unusual principal + off-hours",
    mitigation: "DLP, sensitivity labels, row-level access",
  },
  {
    id: "T1119",
    name: "Automated Collection",
    tactic: "collection",
    keywords: ["bulk download", "scripted export", "mass copy"],
    detection: "Volume anomaly per principal",
    mitigation: "DLP volume thresholds, data egress quotas",
  },

  // -------- C2 --------
  {
    id: "T1071.001",
    name: "Application Layer Protocol: Web",
    tactic: "command-and-control",
    keywords: ["c2", "beacon", "https beacon", "callback", "command and control"],
    detection: "DNS / TLS JA3 anomaly + low-and-slow beaconing",
    mitigation: "TLS inspection, DNS filtering, EDR network telemetry",
  },
  {
    id: "T1090",
    name: "Proxy",
    tactic: "command-and-control",
    keywords: ["proxy", "tor", "relay"],
    detection: "Outbound to known proxy / Tor exit nodes",
    mitigation: "Egress allow-list, proxy detection feed",
  },

  // -------- Exfiltration --------
  {
    id: "T1567.002",
    name: "Exfiltration to Cloud Storage",
    tactic: "exfiltration",
    keywords: ["s3", "gcs", "blob", "dropbox", "personal cloud", "cloud sync"],
    detection: "Egress to unsanctioned SaaS + DLP",
    mitigation: "CASB, allow-list of sanctioned SaaS",
  },
  {
    id: "T1041",
    name: "Exfiltration Over C2 Channel",
    tactic: "exfiltration",
    keywords: ["exfil", "exfiltration", "data theft", "egress"],
    detection: "Outbound volume anomaly + entropy",
    mitigation: "Egress filtering, DLP, network detection",
  },

  // -------- Impact --------
  {
    id: "T1486",
    name: "Data Encrypted for Impact",
    tactic: "impact",
    keywords: ["ransomware", "encrypt", "ransom note", ".lck", "encrypted files"],
    detection: "Mass file rename / encryption + canary file trigger",
    mitigation: "Immutable backups, EDR ransomware behavior",
  },
  {
    id: "T1490",
    name: "Inhibit System Recovery",
    tactic: "impact",
    keywords: ["delete shadow", "vssadmin", "wbadmin", "backup deletion"],
    detection: "Shadow-copy deletion + backup API abuse",
    mitigation: "Offline backups, immutable storage, MFA on backup console",
  },
  {
    id: "T1498",
    name: "Network Denial of Service",
    tactic: "impact",
    keywords: ["ddos", "flood", "volumetric", "l7", "checkout flood", "rate limit"],
    detection: "Traffic baseline deviation per route",
    mitigation: "Upstream scrubbing, anycast, WAF rate-limit",
  },
  {
    id: "T1657",
    name: "Financial Theft",
    tactic: "impact",
    keywords: ["wire transfer", "payment fraud", "bec", "invoice fraud"],
    detection: "Out-of-band payment verification gap",
    mitigation: "Dual-control wires, vendor change verification",
  },
];

export function techniqueById(id: string): Technique | undefined {
  return TECHNIQUES.find((t) => t.id === id);
}

/** Sort techniques by tactic order, preserving input order within a tactic. */
export function sortByTactic(ids: string[]): Technique[] {
  const techs = ids.map(techniqueById).filter((t): t is Technique => Boolean(t));
  return techs.sort(
    (a, b) => tacticById(a.tactic).order - tacticById(b.tactic).order,
  );
}