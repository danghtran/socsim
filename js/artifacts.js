/**
 * Artifact desk — hash / URL / IP OSINT lookups.
 * Canned results; never states sealed chain / rem / disposition.
 */

/**
 * @typedef {'sha256'|'url'|'ip'|'domain'} ArtifactKind
 * @typedef {'malicious'|'suspicious'|'benign'|'unknown'} ArtifactVerdict
 * @typedef {{
 *   id: string, kind: ArtifactKind, value: string,
 *   source?: string, verdict: ArtifactVerdict, result: string,
 *   lean?: string, useful?: boolean
 * }} ArtifactItem
 */

/** @type {Record<string, { note?: string, items: ArtifactItem[] }>} */
export const ARTIFACTS = {
  "invoice-portal": {
    items: [
      {
        id: "u1", kind: "url", value: "https://acme-billing-secure.top/sso",
        source: "URLScan · VT",
        verdict: "malicious",
        result: "First seen overnight · lookalike brand kit · 0 enterprise allowlist hits.",
        lean: "Supports phishing / credential harvest — not a mailer FP.",
        useful: true,
      },
      {
        id: "d1", kind: "domain", value: "acme-billing-secure.top",
        source: "Passive DNS",
        verdict: "suspicious",
        result: "Registered 3 days ago · no corporate ownership match.",
        lean: "Young lookalike domain — treat as hostile until proven otherwise.",
        useful: true,
      },
    ],
  },
  "rundll-temp": {
    items: [
      {
        id: "h1", kind: "sha256", value: "a4c19e2f…8c41",
        source: "VirusTotal",
        verdict: "malicious",
        result: "38/71 detections · labeled loader · first seen with Office→rundll chains.",
        lean: "Hash reputation backs malware / C2 — escalate after contain.",
        useful: true,
      },
      {
        id: "i1", kind: "ip", value: "185.203.44.19",
        source: "AbuseIPDB · TI",
        verdict: "malicious",
        result: "Reported C2 / beacon sink · overlapping campaigns this week.",
        lean: "Outbound peer is hostile — network block is on-theme.",
        useful: true,
      },
    ],
  },
  "vpn-spray": {
    items: [
      {
        id: "i1", kind: "ip", value: "91.224.92.40",
        source: "Greynoise · AbuseIPDB",
        verdict: "malicious",
        result: "Known credential-spray cluster · high volume against VPN edges.",
        lean: "Source reputation supports block-and-close, not “legit backup.”",
        useful: true,
      },
    ],
  },
  "gift-cards": {
    items: [
      {
        id: "d1", kind: "domain", value: "acme-holdlngs.co",
        source: "WHOIS · mail intel",
        verdict: "malicious",
        result: "Homoglyph brand · no MX reputation · BEC kit overlap.",
        lean: "Lure domain is hostile — quarantine path, not ignore.",
        useful: true,
      },
      {
        id: "u1", kind: "url", value: "mailto path only (no payload URL)",
        source: "Mail gateway",
        verdict: "suspicious",
        result: "No attachment hash — social engineering only.",
        lean: "Mail-borne BEC; endpoint hash hunt will stay empty.",
        useful: true,
      },
    ],
  },
  "psexec-share": {
    items: [
      {
        id: "h1", kind: "sha256", value: "b71e44aa…c903",
        source: "VirusTotal",
        verdict: "suspicious",
        result: "Matches PsExec tooling · not on your admin allowlist · rare on jump-box.",
        lean: "Lateral tooling present — treat as intrusion, not IT noise.",
        useful: true,
      },
      {
        id: "i1", kind: "ip", value: "10.4.12.18",
        source: "Internal CMDB",
        verdict: "unknown",
        result: "FS-02 file server · no external OSINT · internal asset.",
        lean: "Target is internal; focus on the interactive admin session.",
        useful: false,
      },
    ],
  },
  "mfa-blast": {
    items: [
      {
        id: "d1", kind: "domain", value: "okta-push-verify.top",
        source: "URLScan",
        verdict: "malicious",
        result: "MFA fatigue / AiTM kit domain · phishing page clone.",
        lean: "Kit domain is hostile — block domain, not “user error only.”",
        useful: true,
      },
      {
        id: "u1", kind: "url", value: "https://okta-push-verify.top/login",
        source: "Browser sandbox",
        verdict: "malicious",
        result: "Captures OTP / session · ranked phishing this week.",
        lean: "Supports true-positive contain on the kit.",
        useful: true,
      },
    ],
  },
  "vssadmin": {
    items: [
      {
        id: "h1", kind: "sha256", value: "n/a (living-off-land)",
        source: "OSINT note",
        verdict: "suspicious",
        result: "No exotic hash — abuse of signed OS binaries (vssadmin / rename).",
        lean: "Impact stage on shares — escalate; don’t close as FP.",
        useful: true,
      },
    ],
  },
  "fwd-rule": {
    items: [
      {
        id: "d1", kind: "domain", value: "okta-acme-sso.top",
        source: "VT · URLScan",
        verdict: "malicious",
        result: "Credential harvest page · linked to inbox-rule follow-ons.",
        lean: "Prior lure was hostile — mailbox persistence likely, not FP.",
        useful: true,
      },
    ],
  },
  "cobalt-named": {
    items: [
      {
        id: "h1", kind: "sha256", value: "c90d1ab3…77e0",
        source: "VirusTotal",
        verdict: "malicious",
        result: "Macro dropper family · named-pipe beacon association.",
        lean: "Confirmed malware hash — escalate after isolate.",
        useful: true,
      },
      {
        id: "u1", kind: "url", value: "file://payroll-q3.xlsm (mail attach)",
        source: "Mail sandbox",
        verdict: "malicious",
        result: "Macro auto-exec · network callbacks in detonation.",
        lean: "Attachment is the patient — not a benign spreadsheet.",
        useful: true,
      },
    ],
  },
  "sso-impossible": {
    items: [
      {
        id: "i1", kind: "ip", value: "102.89.12.44",
        source: "GeoIP · IdP",
        verdict: "suspicious",
        result: "ASN uncommon for this user · impossible-travel peer.",
        lean: "Session risk is identity-side — hand off / revoke, not endpoint FP.",
        useful: true,
      },
    ],
  },
  "c2-dns": {
    items: [
      {
        id: "d1", kind: "domain", value: "xqjrm.top",
        source: "DNS TI · sinkhole",
        verdict: "malicious",
        result: "DGA / C2 list hit · answered A record to known sink.",
        lean: "DNS C2 is real — escalate after block/isolate.",
        useful: true,
      },
      {
        id: "i1", kind: "ip", value: "172.93.44.9",
        source: "AbuseIPDB",
        verdict: "malicious",
        result: "Listed C2 / malware hosting · multi-tenant reports.",
        lean: "Peer IP reputation backs containment.",
        useful: true,
      },
    ],
  },
  "rdp-brute": {
    items: [
      {
        id: "i1", kind: "ip", value: "45.134.1.88",
        source: "Greynoise",
        verdict: "malicious",
        result: "RDP brute / scan cluster · not a corporate egress.",
        lean: "Block source and close as contain — not “legit admin.”",
        useful: true,
      },
    ],
  },
  "macro-drop": {
    items: [
      {
        id: "h1", kind: "sha256", value: "9f3ac21e…b104",
        source: "VirusTotal",
        verdict: "malicious",
        result: "51/70 AV · unsigned update.exe · finance lure campaigns.",
        lean: "Hash is hostile — isolate / hash-block and escalate.",
        useful: true,
      },
      {
        id: "u1", kind: "url", value: "https://invoice-secure-acme.top/doc",
        source: "URLScan",
        verdict: "malicious",
        result: "Delivery page for macro lure · brand impersonation.",
        lean: "URL reputation supports phishing→payload narrative.",
        useful: true,
      },
    ],
  },
  "bitlocker-note": {
    items: [
      {
        id: "h1", kind: "sha256", value: "n/a (LOLBins)",
        source: "OSINT note",
        verdict: "suspicious",
        result: "No unique malware hash — recovery disable + cipher wipe pattern.",
        lean: "Ransomware prep on a DC — escalate immediately.",
        useful: true,
      },
    ],
  },
  "oauth-spam": {
    items: [
      {
        id: "u1", kind: "url", value: "https://login.microsoftonline.com/…/consent?client_id=…",
        source: "OAuth intel",
        verdict: "suspicious",
        result: "Rare unverified app · “review document” lure pattern.",
        lean: "Consent grant is the patient — revoke OAuth, not endpoint isolate.",
        useful: true,
      },
      {
        id: "d1", kind: "domain", value: "docs-review-online.top",
        source: "URLScan",
        verdict: "malicious",
        result: "Phish landing that redirects into malicious consent.",
        lean: "Hostile lure domain — true positive contain on the grant.",
        useful: true,
      },
    ],
  },
  "exfil-share": {
    items: [
      {
        id: "d1", kind: "domain", value: "mega.nz",
        source: "CASB · TI",
        verdict: "suspicious",
        result: "Personal cloud sync · not blocked org-wide · common exfil path.",
        lean: "Egress to personal cloud during share staging — escalate.",
        useful: true,
      },
      {
        id: "h1", kind: "sha256", value: "e12b88d0…19af",
        source: "Sandbox",
        verdict: "unknown",
        result: "Archive of internal docs · no AV label (data, not malware).",
        lean: "Staging archive confirms theft intent more than malware family.",
        useful: true,
      },
    ],
  },
  "kerberoast-svc": {
    items: [
      {
        id: "i1", kind: "ip", value: "10.4.8.22",
        source: "Internal",
        verdict: "unknown",
        result: "Jump-box RFC1918 · no public OSINT.",
        lean: "Identity / ticket abuse — hand off; hash hunt won’t save you.",
        useful: false,
      },
    ],
  },
  "noise-vendor-update": {
    items: [
      {
        id: "h1", kind: "sha256", value: "f00daa11…91c2",
        source: "VirusTotal · publisher",
        verdict: "benign",
        result: "0/70 · Authenticode Contoso Imaging Ltd · matches CHG4412 package.",
        lean: "Reputation says expected change — FP / no containment.",
        useful: true,
      },
      {
        id: "u1", kind: "url", value: "https://updates.contoso-imaging.example/fw/4412",
        source: "Publisher site",
        verdict: "benign",
        result: "Vendor update CDN · ticketed firmware push.",
        lean: "Supports false-positive / tune, not isolate.",
        useful: true,
      },
    ],
  },
  "noise-pentest": {
    items: [
      {
        id: "i1", kind: "ip", value: "203.0.113.50",
        source: "Pentest SOW · Greynoise",
        verdict: "benign",
        result: "Scoped tester IP · matches approved window on change calendar.",
        lean: "Authorized testing — benign / no_action.",
        useful: true,
      },
    ],
  },
  "noise-mailer": {
    items: [
      {
        id: "d1", kind: "domain", value: "acme-hr-updates.com",
        source: "Brand / marketing",
        verdict: "benign",
        result: "Owned marketing domain · open-enrollment campaign this week.",
        lean: "Expected mailer — FP / rule tune, not quarantine panic.",
        useful: true,
      },
      {
        id: "u1", kind: "url", value: "https://acme-hr-updates.com/enroll",
        source: "URLScan",
        verdict: "benign",
        result: "Valid cert · same template as prior HR campaigns.",
        lean: "Supports false positive disposition.",
        useful: true,
      },
    ],
  },
  "noise-backup": {
    items: [
      {
        id: "h1", kind: "sha256", value: "backup-agent signed hash",
        source: "Publisher catalog",
        verdict: "benign",
        result: "Signed BackupAgent · nightly rotate job · VSS intact.",
        lean: "Expected backup — benign, not ransomware.",
        useful: true,
      },
    ],
  },
  "noise-sso-lab": {
    items: [
      {
        id: "i1", kind: "ip", value: "10.90.0.15",
        source: "Lab inventory",
        verdict: "benign",
        result: "Lab SSO appliance · documented burst-auth tests.",
        lean: "Lab traffic — FP, not production compromise.",
        useful: true,
      },
    ],
  },
};

export function emptyOsintState() {
  return { looked: {} };
}

export function artifactsFor(key) {
  return ARTIFACTS[key] || { items: [], note: "No enriched artifacts for this correlation." };
}

const VERDICT_RANK = { malicious: 3, suspicious: 2, unknown: 1, benign: 0 };

/** Strongest looked-up verdict for case panel / soft scoring. */
export function strongestVerdict(alert) {
  const pack = artifactsFor(alert?.key);
  const looked = alert?.osint?.looked || {};
  let best = null;
  for (const item of pack.items || []) {
    if (!looked[item.id]) continue;
    if (!best || VERDICT_RANK[item.verdict] > VERDICT_RANK[best.verdict]) best = item;
  }
  return best;
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** HTML for the Artifact / OSINT desk panel. */
export function osintPanelHtml(alert) {
  if (!alert) {
    return `<div class="osint-empty">Claim a ticket to open the artifact desk.</div>`;
  }
  const pack = artifactsFor(alert.key);
  const st = { ...emptyOsintState(), ...(alert.osint || {}) };
  if (!st.looked) st.looked = {};
  const items = pack.items || [];

  if (!items.length) {
    return `
      <div class="osint-head">
        <div class="osint-kicker">Artifact desk · OSINT</div>
        <div class="osint-title">No artifacts</div>
      </div>
      <p class="osint-note">${esc(pack.note || "Nothing to look up for this correlation.")}</p>`;
  }

  const chips = items.map((it) => {
    const done = !!st.looked[it.id];
    return `<button type="button" class="osint-chip${done ? " on" : ""}" data-osint="${esc(it.id)}" ${done ? "disabled" : ""}>
      <span class="k">${esc(it.kind)}</span>
      <span class="v">${esc(it.value)}</span>
    </button>`;
  }).join("");

  const hits = items.filter((it) => st.looked[it.id]).map((it) => `
    <article class="osint-hit verdict-${esc(it.verdict)}">
      <header>
        <span class="badge">${esc(it.verdict)}</span>
        <span class="src">${esc(it.source || "OSINT")}</span>
      </header>
      <div class="what"><b>${esc(it.kind)}</b> ${esc(it.value)}</div>
      <p class="res">${esc(it.result)}</p>
      ${it.lean ? `<p class="lean">${esc(it.lean)}</p>` : ""}
    </article>`).join("");

  return `
    <div class="osint-head">
      <div>
        <div class="osint-kicker">Artifact desk · OSINT</div>
        <div class="osint-title">Hash · URL · IP</div>
        <div class="osint-meta">One-click lookups · sealed verdicts for this case</div>
      </div>
    </div>
    <div class="osint-chips">${chips}</div>
    <div class="osint-hits">${hits || `<p class="osint-idle">Pick an artifact to query reputation.</p>`}</div>`;
}
