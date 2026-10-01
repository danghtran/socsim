/** Handoff queue — Tier-2 / IR asks with a short checklist. */

export const HANDOFF_SENDERS = {
  tier2: { id: "tier2", label: "Tier-2", short: "T2", hue: 198 },
  ir: { id: "ir", label: "IR on-call", short: "IR", hue: 330 },
  mgr: { id: "mgr", label: "SOC Manager", short: "MGR", hue: 42 },
};

export const HANDOFF_STALE_MIN = 28;
export const HANDOFF_SPAWN_GAP_MIN = 36;

/**
 * checklist: need=true must be checked; trap=true must stay unchecked.
 * correctAction: "accept" | "escalate"
 */
export const HANDOFF_TEMPLATES = [
  {
    id: "ho-beacon",
    from: "tier2",
    tag: "Transfer in",
    title: "Named-pipe beacon — can Tier-1 own?",
    body: "hr-pc still shows msagent_* after Excel. We’re slammed. If you’ve got isolate + hash notes, take it; otherwise bump IR.",
    needClosed: 1,
    correctAction: "accept",
    checklist: [
      { id: "iso", text: "Host isolated (or isolate queued)", need: true },
      { id: "hash", text: "Payload / xlsm hash noted on the case", need: true },
      { id: "keep", text: "Told the user to keep using the host for payroll", trap: true },
    ],
    accept: { rate: 0.14 },
    escalate: {
      rate: -0.35,
      effect: "soft",
    },
    wrong: {
      rate: -0.55,
      attackKey: "cobalt-named",
      delayMin: 14,
      returnReason: "Beacon handoff bungled — host stayed live without ownership",
    },
  },
  {
    id: "ho-ransom-dc",
    from: "ir",
    tag: "Pull-up",
    title: "DC cipher wipe — escalate now?",
    body: "dc-01 has recovery disabled and cipher /w mid-run. Tier-2 says you’re closest. Do you keep it or hand straight to IR?",
    needClosed: 2,
    correctAction: "escalate",
    checklist: [
      { id: "iso", text: "Isolate attempted / network cut noted", need: true },
      { id: "scope", text: "Confirmed only DC in site / blast radius", need: true },
      { id: "reboot", text: "Rebooted the DC to “clear the wipe”", trap: true },
    ],
    accept: {
      rate: -0.7,
      effect: "bad",
      attackKey: "bitlocker-note",
      delayMin: 12,
      returnReason: "Tier-1 held a DC ransomware case too long",
    },
    escalate: { rate: 0.18 },
    wrong: {
      rate: -0.7,
      attackKey: "bitlocker-note",
      delayMin: 12,
      returnReason: "DC impact case mishandled on handoff",
    },
  },
  {
    id: "ho-oauth",
    from: "tier2",
    tag: "Transfer in",
    title: "OAuth consent spam — accept?",
    body: "Cloud queue is full. Unverified app + “review document” lure. If you can revoke the grant and close, take it.",
    needClosed: 1,
    correctAction: "accept",
    checklist: [
      { id: "rev", text: "Ready to revoke the OAuth grant / session", need: true },
      { id: "app", text: "App / client id captured on the ticket", need: true },
      { id: "iso", text: "Isolating every laptop in Marketing first", trap: true },
    ],
    accept: { rate: 0.12 },
    escalate: { rate: -0.25, effect: "soft" },
    wrong: {
      rate: -0.5,
      attackKey: "oauth-spam",
      delayMin: 16,
      returnReason: "Consent grant left active after a bad handoff",
    },
  },
  {
    id: "ho-exfil",
    from: "ir",
    tag: "Ask",
    title: "MEGA exfil — IR wants primary",
    body: "wifi-ap packing legal.7z to mega.nz. IR can take primary if you confirm staging + egress. Don’t “accept and watch.”",
    needClosed: 2,
    correctAction: "escalate",
    checklist: [
      { id: "stage", text: "Staging path / archive noted", need: true },
      { id: "block", text: "Egress block or isolate requested", need: true },
      { id: "wait", text: "Leaving upload running to “collect more evidence”", trap: true },
    ],
    accept: {
      rate: -0.65,
      effect: "bad",
      attackKey: "exfil-share",
      delayMin: 12,
      returnReason: "Exfil kept running under Tier-1 ownership",
    },
    escalate: { rate: 0.16 },
    wrong: {
      rate: -0.65,
      attackKey: "exfil-share",
      delayMin: 12,
      returnReason: "Exfil handoff failed — data kept leaving",
    },
  },
  {
    id: "ho-vpn-fp",
    from: "mgr",
    tag: "Transfer in",
    title: "Pentest spray — close or escalate?",
    body: "Edge is noisy. Change calendar shows approved pentest. Tier-2 doesn’t want it. Accept and dispose as benign, or escalate anyway?",
    needClosed: 0,
    correctAction: "accept",
    checklist: [
      { id: "sow", text: "Matched tester IP / window on the change calendar", need: true },
      { id: "ir", text: "Opened Sev-1 with IR for the approved scan", trap: true },
      { id: "note", text: "Note left: authorized testing · no contain", need: true },
    ],
    accept: { rate: 0.12 },
    escalate: { rate: -0.3, effect: "soft" },
    wrong: { rate: -0.3, effect: "soft" },
  },
  {
    id: "ho-latmove",
    from: "tier2",
    tag: "Transfer in",
    title: "PsExec lateral — own or bump?",
    body: "jump-box interactive PsExec into FS-02. If you’ve got the session facts, accept; if encryptor signs appear, escalate IR immediately.",
    needClosed: 1,
    correctAction: "escalate",
    checklist: [
      { id: "sess", text: "Interactive admin session still live — noted", need: true },
      { id: "scope", text: "Share / host blast radius attached", need: true },
      { id: "clear", text: "Marked all-clear — “IT admin tooling”", trap: true },
    ],
    accept: {
      rate: -0.55,
      effect: "bad",
      attackKey: "psexec-share",
      delayMin: 15,
      returnReason: "Lateral movement left with Tier-1 too long",
    },
    escalate: { rate: 0.15 },
    wrong: {
      rate: -0.55,
      attackKey: "psexec-share",
      delayMin: 15,
      returnReason: "Lateral handoff mishandled",
    },
  },
];
