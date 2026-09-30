/**
 * Ad-hoc floor interrupts — urgent popups that freeze the desk until answered.
 * Choices never state sealed chain / rem / disposition.
 */

export const INTERRUPTS = [
  {
    id: "mgr-walkup-sev",
    from: "SOC Manager",
    tag: "Walk-up",
    urgency: "urgent",
    title: "Got a minute?",
    body: "I’m at your shoulder. Highest thing in your queue — are you on it, or still finishing paperwork?",
    needClosed: 0,
    choices: [
      { id: "a", text: "On the highest severity now — I’ll update you in two.", effect: "good", rate: 0.12 },
      { id: "b", text: "Queue looks fine; I’ll get to it after this chat.", effect: "soft", rate: -0.15 },
      {
        id: "c",
        text: "Probably noise — I’m closing leftovers first.",
        effect: "bad",
        rate: -0.45,
        attackKey: "macro-drop",
        delayMin: 16,
        returnReason: "High-sev left idle while Tier-1 chased paperwork",
      },
    ],
  },
  {
    id: "phone-cfo",
    from: "Front desk",
    tag: "Phone",
    urgency: "critical",
    title: "CFO on line 2",
    body: "They want the lookalike invoice case “fully contained” for a board slide in five minutes. What do I say?",
    needClosed: 1,
    choices: [
      { id: "a", text: "Creds may be exposed; resets underway; no confirmed malware — don’t claim fully contained.", effect: "good", rate: 0.15 },
      {
        id: "b",
        text: "Tell them it’s fully contained, no residual risk.",
        effect: "bad",
        rate: -0.7,
        attackKey: "fwd-rule",
        delayMin: 14,
        returnReason: "False containment claim — attacker still had mailbox access",
      },
      { id: "c", text: "Transfer them to IR voicemail and hang up.", effect: "soft", rate: -0.2 },
    ],
  },
  {
    id: "edr-pop",
    from: "EDR console",
    tag: "Detection",
    urgency: "critical",
    title: "Live prevent fail",
    body: "Unsigned update.exe just spawned from Office on a finance laptop. Sensor asks: Isolate now?",
    needClosed: 1,
    choices: [
      { id: "a", text: "Isolate the host and open / claim the correlation.", effect: "good", rate: 0.14 },
      {
        id: "b",
        text: "Dismiss — finance always runs weird installers.",
        effect: "bad",
        rate: -0.65,
        attackKey: "macro-drop",
        delayMin: 12,
        returnReason: "Prevent fail ignored — payload kept running",
      },
      { id: "c", text: "Kill process only; leave them on the network for the demo.", effect: "soft", rate: -0.2 },
    ],
  },
  {
    id: "helpdesk-unblock",
    from: "Helpdesk",
    tag: "Slack",
    urgency: "urgent",
    title: "Please lift isolate",
    body: "User says EDR isolated them mid-client call. They’re asking you to undo it “for two minutes.”",
    needClosed: 1,
    choices: [
      { id: "a", text: "Keep isolated until triage finishes — offer a clean loaner.", effect: "good", rate: 0.12 },
      {
        id: "b",
        text: "Lift isolate so they can finish the call.",
        effect: "bad",
        rate: -0.7,
        attackKey: "cobalt-named",
        delayMin: 10,
        returnReason: "Isolate lifted early — beacon matured on the host",
      },
      { id: "c", text: "Ignore the ping; they’ll figure it out.", effect: "soft", rate: -0.2 },
    ],
  },
  {
    id: "ir-page",
    from: "IR on-call",
    tag: "Page",
    urgency: "critical",
    title: "Are you the primary?",
    body: "PsExec / lateral chatter just lit up. Confirm: is jump-box still being worked, and is anyone else owning it?",
    needClosed: 2,
    choices: [
      { id: "a", text: "I’m primary — here’s status and what I’ve contained so far.", effect: "good", rate: 0.18 },
      {
        id: "b",
        text: "All clear on our side — you can stand down.",
        effect: "bad",
        rate: -0.75,
        attackKey: "exfil-share",
        delayMin: 14,
        returnReason: "IR stood down on a live lateral foothold",
      },
      { id: "c", text: "Not sure — maybe check the queue yourself.", effect: "soft", rate: -0.15 },
    ],
  },
  {
    id: "change-window",
    from: "IT Ops",
    tag: "Change",
    urgency: "urgent",
    title: "Is this our scanner?",
    body: "EDR flagged Setup.exe from Temp on eng-22. CHG4412 is pushing firmware tonight. Kill it or leave it?",
    needClosed: 0,
    choices: [
      { id: "a", text: "Matches the change ticket — leave it; note FP / tune if needed.", effect: "good", rate: 0.12 },
      {
        id: "b",
        text: "Kill and isolate — Temp path is always bad.",
        effect: "soft",
        rate: -0.25,
      },
      { id: "c", text: "Page IR Sev-1 for a signed updater.", effect: "soft", rate: -0.15 },
    ],
  },
  {
    id: "vpn-hot",
    from: "Network",
    tag: "Edge",
    urgency: "urgent",
    title: "Spray still connected",
    body: "VPN show session for svc-backup from the spray /24 is still up. Block source now?",
    needClosed: 1,
    choices: [
      { id: "a", text: "Block the source IP at the edge and keep working the ticket.", effect: "good", rate: 0.14 },
      {
        id: "b",
        text: "Leave the session — might be the real backup job.",
        effect: "bad",
        rate: -0.55,
        attackKey: "psexec-share",
        delayMin: 18,
        returnReason: "Spray session left open — used for lateral move",
      },
      { id: "c", text: "Reset the service account password only.", effect: "soft", rate: -0.1 },
    ],
  },
  {
    id: "mgr-star",
    from: "SOC Manager",
    tag: "Walk-up",
    urgency: "urgent",
    title: "Comms backlog",
    body: "Two chats are aging. Do you want me to pull someone else onto Comms, or are you clearing them?",
    needClosed: 2,
    choices: [
      { id: "a", text: "I’ve got Comms next — clearing the open ones now.", effect: "good", rate: 0.1 },
      { id: "b", text: "Please cover Comms for 20 minutes so I can finish contain.", effect: "good", rate: 0.08 },
      { id: "c", text: "Comms can wait; queue is more important forever.", effect: "soft", rate: -0.2 },
    ],
  },
];

export function interruptGapMin() {
  return 32 + Math.floor(Math.random() * 22);
}

export function firstInterruptAt(workMin) {
  return workMin + 22 + Math.floor(Math.random() * 16);
}

export function findInterrupt(id) {
  return INTERRUPTS.find((t) => t.id === id) || null;
}
