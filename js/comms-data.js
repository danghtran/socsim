/** Stakeholder pings — helpdesk, users, IR, manager. */

export const COMM_SENDERS = {
  helpdesk: { id: "helpdesk", label: "Helpdesk", short: "HD", hue: 42 },
  user: { id: "user", label: "End user", short: "USR", hue: 168 },
  ir: { id: "ir", label: "Incident Response", short: "IR", hue: 12 },
  mgr: { id: "mgr", label: "SOC Manager", short: "MGR", hue: 280 },
};

/**
 * effect: "good" | "soft" | "bad"
 * bad / dangerous soft replies use:
 *   ack        — what they say after your guidance (shown in chat)
 *   attackKey  — catalog alert that lands later when the attack succeeds
 *   delayMin   — work minutes until the console event (default 14)
 *   returnReason — shown on the RETURN alert
 */
export const COMM_TEMPLATES = [
  {
    id: "hd-click-safe",
    from: "helpdesk",
    subject: "User asking if the invoice link is safe",
    body: "Finance called: they already opened a lookalike invoice mail. They’re asking if it’s OK to enter the password again “to check.” What do I tell them?",
    needClosed: 1,
    replies: [
      { id: "a", text: "Do not enter anything. We’ll reset the account and quarantine the mail.", effect: "good", rate: 0.15 },
      {
        id: "b",
        text: "Tell them it’s fine — filters would have blocked real phishing.",
        effect: "bad",
        rate: -0.7,
        ack: "OK — I told them to go ahead and sign in again to “verify.”",
        attackKey: "fwd-rule",
        delayMin: 12,
        returnReason: "User re-entered credentials after desk all-clear — inbox rule planted",
      },
      { id: "c", text: "Open a Sev-1 and page IR right now.", effect: "soft", rate: -0.1 },
    ],
  },
  {
    id: "usr-isolate",
    from: "user",
    subject: "Why is my laptop offline?",
    body: "EDR just yanked me off the network mid-meeting. I need back on — VPN for a client demo in 10 minutes. Can you undo the isolate?",
    needClosed: 1,
    replies: [
      { id: "a", text: "Stay isolated until we finish triage. Use a clean machine for the demo.", effect: "good", rate: 0.12 },
      {
        id: "b",
        text: "Sure — lifting isolate now so you can present.",
        effect: "bad",
        rate: -0.8,
        ack: "Thanks — back online. Demo starting.",
        attackKey: "cobalt-named",
        delayMin: 10,
        returnReason: "Isolate lifted early — beacon matured on the host",
      },
      {
        id: "c",
        text: "Ignore them until EOD.",
        effect: "soft",
        rate: -0.25,
      },
    ],
  },
  {
    id: "ir-status",
    from: "ir",
    subject: "Status on the PsExec jump-box?",
    body: "We’re spinning containment. Confirm: is jump-box still isolated, and did Tier-1 block the related IOCs?",
    needClosed: 2,
    replies: [
      { id: "a", text: "Here’s what we applied and what’s still open — jump-box isolated; IOC block pending your review.", effect: "good", rate: 0.2 },
      {
        id: "b",
        text: "All clear on our side. You can stand down.",
        effect: "bad",
        rate: -0.75,
        ack: "Copy — standing down containment. Thanks.",
        attackKey: "exfil-share",
        delayMin: 14,
        returnReason: "Premature all-clear — lateral foothold used for exfil",
      },
      { id: "c", text: "Not my ticket anymore.", effect: "soft", rate: -0.3 },
    ],
  },
  {
    id: "mgr-queue",
    from: "mgr",
    subject: "Quick pulse — anything returned?",
    body: "Stand-up in 5. Any cases you closed that you’re unsure about, or anything that might bounce back?",
    needClosed: 2,
    replies: [
      { id: "a", text: "Flag uncertainty honestly and list open watch items.", effect: "good", rate: 0.15 },
      {
        id: "b",
        text: "Queue is clean. Nothing to worry about.",
        effect: "bad",
        rate: -0.45,
        ack: "Great — I’ll tell leadership we’re green.",
        attackKey: "c2-dns",
        delayMin: 16,
        returnReason: "False green status — missed C2 resumed while leadership was briefed",
      },
      { id: "c", text: "Everything is Sev-1; need more headcount.", effect: "soft", rate: -0.1 },
    ],
  },
  {
    id: "hd-reset",
    from: "helpdesk",
    subject: "Approve password reset — svc-backup?",
    body: "Someone called the desk claiming to be infra. They want an immediate reset on svc-backup and MFA bypass “for a change window.” Ticket looks rushed.",
    needClosed: 1,
    replies: [
      { id: "a", text: "Deny. Verify via known channel. Flag as possible social engineering.", effect: "good", rate: 0.18 },
      {
        id: "b",
        text: "Approve — service accounts break often during changes.",
        effect: "bad",
        rate: -0.85,
        ack: "Reset done. Caller is “in.” Closing the helpdesk ticket.",
        attackKey: "psexec-share",
        delayMin: 12,
        returnReason: "Fraudulent reset approved — account used for lateral move",
      },
      {
        id: "c",
        text: "Reset it but disable MFA permanently to reduce calls.",
        effect: "bad",
        rate: -0.9,
        ack: "MFA removed and password reset. They’re connected.",
        attackKey: "vpn-spray",
        delayMin: 11,
        returnReason: "MFA stripped on sprayed account — VPN access held",
      },
    ],
  },
  {
    id: "usr-mail",
    from: "user",
    subject: "CEO gift-card mail still in my inbox",
    body: "I didn’t click, but the “CEO needs cards” mail is still sitting there and two teammates got it too. Should I delete it myself?",
    needClosed: 0,
    replies: [
      { id: "a", text: "Don’t delete yet — report it; we’ll quarantine and purge org-wide.", effect: "good", rate: 0.14 },
      {
        id: "b",
        text: "Just delete it. No need to involve security.",
        effect: "bad",
        rate: -0.55,
        ack: "Deleted mine. Told the others to ignore it too.",
        attackKey: "invoice-portal",
        delayMin: 15,
        returnReason: "Lure left live for other inboxes — someone clicked later",
      },
      {
        id: "c",
        text: "Forward it to the whole company as a warning.",
        effect: "bad",
        rate: -0.5,
        ack: "Forwarded company-wide. A few people say they “checked the link.”",
        attackKey: "invoice-portal",
        delayMin: 13,
        returnReason: "Warning forward spread the lure — clicks and harvest followed",
      },
    ],
  },
  {
    id: "ir-oauth",
    from: "ir",
    subject: "OAuth app still consented?",
    body: "TI says the spammy OAuth grant may still be active. Did Tier-1 revoke the app, or only the user session?",
    needClosed: 2,
    replies: [
      { id: "a", text: "Confirm whether the app grant was revoked; if not, do it and report back.", effect: "good", rate: 0.16 },
      {
        id: "b",
        text: "Session revoke is enough. App consent is harmless.",
        effect: "bad",
        rate: -0.7,
        ack: "Understood — leaving the grant. Moving on.",
        attackKey: "exfil-share",
        delayMin: 14,
        returnReason: "OAuth grant left active — mail/file sync used for exfil",
      },
      {
        id: "c",
        text: "Ask the user to re-consent so we can “see” it again.",
        effect: "bad",
        rate: -0.55,
        ack: "User re-consented. App is active again.",
        attackKey: "oauth-spam",
        delayMin: 10,
        returnReason: "User re-consented to malicious OAuth app on desk advice",
      },
    ],
  },
  {
    id: "mgr-sla",
    from: "mgr",
    subject: "Customer asked for a written update",
    body: "Business wants a one-liner for the lookalike invoice case. Keep it accurate — no false containment claims.",
    needClosed: 1,
    replies: [
      { id: "a", text: "Creds may be exposed; reset underway; lure quarantine in progress; no confirmed malware on host.", effect: "good", rate: 0.2 },
      {
        id: "b",
        text: "Fully contained. No risk remains.",
        effect: "bad",
        rate: -0.65,
        ack: "Sent to the customer: “Fully contained, no residual risk.”",
        attackKey: "fwd-rule",
        delayMin: 15,
        returnReason: "False containment claim — attacker still had mailbox access",
      },
      { id: "c", text: "Blame the mail gateway vendor in writing.", effect: "soft", rate: -0.2 },
    ],
  },
];

export const COMM_SPAWN_GAP_MIN = 22;
export const COMM_STALE_MIN = 40;
/** Default work minutes before a bad-comms attack lands on the console. */
export const COMM_ATTACK_DELAY_MIN = 14;
