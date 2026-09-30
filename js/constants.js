export const STEPS = {
  lure: { id: "lure", label: "Lure" },
  harvest: { id: "harvest", label: "Harvest" },
  execute: { id: "execute", label: "Execute" },
  c2: { id: "c2", label: "C2" },
  brute: { id: "brute", label: "Brute" },
  access: { id: "access", label: "Access" },
  move: { id: "move", label: "Move" },
  persist: { id: "persist", label: "Persist" },
  token: { id: "token", label: "Token" },
  consent: { id: "consent", label: "Consent" },
  encrypt: { id: "encrypt", label: "Encrypt" },
  exfil: { id: "exfil", label: "Exfil" },
};

/**
 * Remediation taxonomy: pick one or more categories, then sub-actions.
 * Action ids are unique across categories.
 */
export const REM_CATS = {
  endpoint: {
    id: "endpoint",
    label: "Endpoint",
    actions: {
      isolate: { id: "isolate", label: "Isolate host" },
      kill_proc: { id: "kill_proc", label: "Kill process" },
      quarantine_file: { id: "quarantine_file", label: "Quarantine file" },
    },
  },
  identity: {
    id: "identity",
    label: "Identity",
    actions: {
      reset: { id: "reset", label: "Reset credentials" },
      disable: { id: "disable", label: "Disable account" },
      revoke: { id: "revoke", label: "Revoke sessions" },
    },
  },
  network: {
    id: "network",
    label: "Network",
    actions: {
      block_ip: { id: "block_ip", label: "Block source IP" },
      block_domain: { id: "block_domain", label: "Block domain" },
      block_hash: { id: "block_hash", label: "Block file hash" },
    },
  },
  email: {
    id: "email",
    label: "Email",
    actions: {
      quarantine: { id: "quarantine", label: "Quarantine message" },
      purge: { id: "purge", label: "Purge similar mail" },
      remove_rule: { id: "remove_rule", label: "Remove inbox rule" },
    },
  },
  cloud: {
    id: "cloud",
    label: "Cloud / SaaS",
    actions: {
      revoke_oauth: { id: "revoke_oauth", label: "Revoke OAuth app" },
      revoke_cloud: { id: "revoke_cloud", label: "Revoke cloud session" },
    },
  },
  observe: {
    id: "observe",
    label: "Observe",
    actions: {
      no_action: { id: "no_action", label: "No containment" },
      tune_rule: { id: "tune_rule", label: "Request rule tune" },
    },
  },
};

/** Flat action lookup: id → { id, label, cat } */
export const REM_ACTIONS = Object.fromEntries(
  Object.values(REM_CATS).flatMap((cat) =>
    Object.values(cat.actions).map((a) => [a.id, { ...a, cat: cat.id }]),
  ),
);

/** Case disposition — how Tier-1 closes or routes the ticket. */
export const DISPS = {
  contain: { id: "contain", label: "True positive · contain" },
  monitor: { id: "monitor", label: "Suspicious · monitor" },
  escalate: { id: "escalate", label: "Escalate to IR" },
  handoff: { id: "handoff", label: "Hand off Tier-2" },
  fp: { id: "fp", label: "False positive" },
  benign: { id: "benign", label: "Benign / expected" },
};

export const SOURCES = {
  "mail-gw": { id: "mail-gw", short: "MX", hue: 168, icon: "@" },
  edr: { id: "edr", short: "ED", hue: 12, icon: "▣" },
  vpn: { id: "vpn", short: "VP", hue: 198, icon: "⋈" },
  siem: { id: "siem", short: "SI", hue: 210, icon: "⌇" },
  helpdesk: { id: "helpdesk", short: "HD", hue: 42, icon: "?" },
  idp: { id: "idp", short: "ID", hue: 280, icon: "◉" },
  dns: { id: "dns", short: "NS", hue: 140, icon: "◌" },
  backup: { id: "backup", short: "BK", hue: 320, icon: "▤" },
};

export const TIMING = false;
export const SHIFT_MS = 120000;
export const MAX_Q = 3;
export const SPAWN_MIN = 9000;
export const SPAWN_MAX = 12000;
export const TUTORIAL_SPAWN = 14000;
export const PATIENCE = 80000;
export const PATIENCE_SEV = 4000;
export const DAY_START_MIN = 8 * 60;
export const DAY_END_MIN = 16 * 60;
export const WORK_IDLE_SCALE = 1 / 4000;
export const WORK_CLOSE_MIN = 28;
export const WORK_MISS_MIN = 18;

export const PLAYBOOK_STORE_KEY = "socsim.playbooks.v4";
export const SESSION_STORE_KEY = "socsim.session.v1";

/** Chance a random spawn is a noise / FP catalog entry. */
export const NOISE_SPAWN_CHANCE = 0.3;

/**
 * If a case is mishandled (wrong close) or ignored (SLA), it can return later
 * as a more serious follow-up. Delay is wall-clock minutes on the workday.
 */
export const FOLLOWUPS = {
  "invoice-portal": { key: "fwd-rule", delayMin: 32, reason: "Account still valid — attacker planted an inbox rule" },
  "gift-cards": { key: "invoice-portal", delayMin: 36, reason: "Lure left in inboxes — someone clicked later" },
  "mfa-blast": { key: "invoice-portal", delayMin: 28, reason: "Kit domain stayed up — harvest started" },
  "vpn-spray": { key: "psexec-share", delayMin: 40, reason: "Open VPN session used for lateral movement" },
  "rdp-brute": { key: "psexec-share", delayMin: 38, reason: "Brute source kept access and pivoted" },
  "rundll-temp": { key: "cobalt-named", delayMin: 30, reason: "Host not contained — beacon matured" },
  "macro-drop": { key: "exfil-share", delayMin: 42, reason: "Malware left running — data started leaving" },
  "psexec-share": { key: "exfil-share", delayMin: 34, reason: "Lateral foothold used for exfil" },
  "c2-dns": { key: "exfil-share", delayMin: 30, reason: "C2 left open — collection began" },
  "fwd-rule": { key: "exfil-share", delayMin: 40, reason: "Forward rule kept leaking mail" },
  "sso-impossible": { key: "oauth-spam", delayMin: 28, reason: "Token not fully revoked — consent abuse followed" },
  "oauth-spam": { key: "exfil-share", delayMin: 36, reason: "OAuth grant kept reading mail and files" },
  "kerberoast-svc": { key: "psexec-share", delayMin: 34, reason: "Service account still usable — used to move" },
  "vssadmin": { key: "bitlocker-note", delayMin: 22, reason: "Encrypt spread toward domain controllers" },
  "cobalt-named": { key: "exfil-share", delayMin: 26, reason: "Beacon used to stage exfil" },
  "exfil-share": { key: "bitlocker-note", delayMin: 48, reason: "Access persisted into impact" },
  "bitlocker-note": { key: "vssadmin", delayMin: 20, reason: "DC impact continued on other shares" },
};

export const RETURN_MAX_GEN = 2;

/** Seed library so the console is playable before the analyst authors custom books. */
export const DEFAULT_PLAYBOOKS = [
  { id: "pb-cred-phish", name: "Credential phishing", chain: ["lure", "harvest"], rems: ["reset", "quarantine"], disp: "contain" },
  { id: "pb-bec-lure", name: "BEC lure only", chain: ["lure"], rems: ["quarantine", "purge"], disp: "contain" },
  { id: "pb-mfa-kit", name: "MFA kit domain", chain: ["lure"], rems: ["block_domain"], disp: "contain" },
  { id: "pb-office-malware", name: "Office → payload → C2", chain: ["lure", "execute", "c2"], rems: ["isolate", "block_hash"], disp: "escalate" },
  { id: "pb-macro-hash", name: "Macro drop (hash)", chain: ["lure", "execute", "c2"], rems: ["isolate", "block_hash"], disp: "escalate" },
  { id: "pb-inbox-persist", name: "Lure → harvest → inbox rule", chain: ["lure", "harvest", "persist"], rems: ["revoke", "remove_rule"], disp: "contain" },
  { id: "pb-oauth-consent", name: "OAuth consent lure", chain: ["lure", "consent"], rems: ["revoke_oauth"], disp: "contain" },
  { id: "pb-vpn-spray", name: "VPN spray → access", chain: ["brute", "access"], rems: ["block_ip"], disp: "contain" },
  { id: "pb-rdp-brute", name: "RDP brute → access", chain: ["brute", "access"], rems: ["block_ip"], disp: "contain" },
  { id: "pb-lateral", name: "Foothold → lateral", chain: ["access", "move"], rems: ["isolate"], disp: "escalate" },
  { id: "pb-token-consent", name: "Token theft → consent", chain: ["token", "consent"], rems: ["revoke", "revoke_cloud"], disp: "handoff" },
  { id: "pb-c2-dns", name: "C2 via DNS", chain: ["c2"], rems: ["block_domain", "isolate"], disp: "escalate" },
  { id: "pb-ransom-share", name: "Ransom on share", chain: ["encrypt"], rems: ["isolate"], disp: "escalate" },
  { id: "pb-ransom-dc", name: "Ransom on DC", chain: ["encrypt"], rems: ["isolate"], disp: "escalate" },
  { id: "pb-exfil", name: "Access → exfil", chain: ["access", "exfil"], rems: ["isolate", "block_ip"], disp: "escalate" },
  { id: "pb-kerberoast", name: "Kerberoast → access", chain: ["harvest", "access"], rems: ["disable", "reset"], disp: "handoff" },
  { id: "pb-fp-vendor", name: "Noise · signed vendor update", chain: [], rems: ["no_action"], disp: "fp" },
  { id: "pb-fp-pentest", name: "Noise · approved pentest scan", chain: [], rems: ["no_action"], disp: "benign" },
  { id: "pb-fp-mailer", name: "Noise · marketing mailer", chain: [], rems: ["tune_rule"], disp: "fp" },
  { id: "pb-fp-backup", name: "Noise · backup rename job", chain: [], rems: ["no_action"], disp: "benign" },
  { id: "pb-fp-sso-lab", name: "Noise · SSO lab test", chain: [], rems: ["no_action"], disp: "fp" },
];
