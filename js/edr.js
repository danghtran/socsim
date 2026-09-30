/**
 * Endpoint detection & response — timeline, contain, quarantine, IOC search.
 * Facts never state sealed chain / rem / disposition.
 */

/** Hosts without a deployed EDR agent (infra / mail / IdP appliances). */
const NO_AGENT = new Set([
  "vpn-edge", "mail-gw", "sso-01", "edge-fw", "mx-01", "lab-sso",
]);

/**
 * @typedef {{ t: string, sev: string, title: string, detail: string }} EdrDet
 * @typedef {{ name: string, pid: number, path: string }} EdrProc
 * @typedef {{ name: string, path: string, sha?: string }} EdrFile
 * @typedef {{ id: string, kind: string, value: string, result: string, useful?: boolean }} EdrIoc
 * @typedef {{
 *   agent: boolean, os?: string, user?: string, note?: string,
 *   detections?: EdrDet[], process?: EdrProc|null, file?: EdrFile|null, iocs?: EdrIoc[]
 * }} EdrProfile
 */

/** @type {Record<string, EdrProfile>} */
export const EDR = {
  "invoice-portal": {
    agent: true,
    os: "Windows 11",
    user: "j.chen",
    detections: [
      { t: "02:14:11", sev: "info", title: "Browser navigation", detail: "chrome.exe → rare domain; no download write." },
      { t: "02:14:25", sev: "med", title: "Outbound HTTPS", detail: "POST to lookalike SSO path; browser only." },
      { t: "02:14:26", sev: "info", title: "Process tree clean", detail: "No child process after browser session." },
    ],
    process: null,
    file: null,
    iocs: [
      { id: "dom", kind: "domain", value: "acme-billing-secure.top", result: "0 endpoint writes; 2 more mailboxes clicked the same domain.", useful: true },
      { id: "host", kind: "host", value: "laptop-04", result: "Sensor clean — browser only, no payload on disk.", useful: true },
    ],
  },
  "rundll-temp": {
    agent: true,
    os: "Windows 10",
    user: "pos-12$",
    detections: [
      { t: "03:41:19", sev: "high", title: "Office → rundll32", detail: "WINWORD → eqnedt32 → rundll32.exe" },
      { t: "03:41:22", sev: "high", title: "Unsigned module", detail: "C:\\Users\\Public\\Temp\\a.dll loaded" },
      { t: "03:42:20", sev: "crit", title: "Periodic beacon", detail: "Outbound 443 interval ~60s; host still on LAN" },
    ],
    process: { name: "rundll32.exe", pid: 4820, path: "C:\\Windows\\System32\\rundll32.exe" },
    file: { name: "a.dll", path: "C:\\Users\\Public\\Temp\\a.dll", sha: "a4c1…9e2f" },
    iocs: [
      { id: "hash", kind: "sha256", value: "a4c1…9e2f", result: "1 fleet hit (pos-12). Hash not on allowlist.", useful: true },
      { id: "ip", kind: "ip", value: "185.203.44.19", result: "pos-12 beaconing; 0 other hosts yet.", useful: true },
    ],
  },
  "vpn-spray": {
    agent: false,
    note: "VPN concentrator — no endpoint agent. Containment is edge/network-side.",
  },
  "gift-cards": {
    agent: true,
    os: "Windows 11",
    user: "finance-shared",
    detections: [
      { t: "09:11:06", sev: "info", title: "Outlook idle", detail: "No attachment open; no child process." },
      { t: "09:11:12", sev: "info", title: "Sensor quiet", detail: "hr-pc / finance endpoints show no payload." },
    ],
    process: null,
    file: null,
    iocs: [
      { id: "dom", kind: "domain", value: "acme-holdlngs.co", result: "0 endpoint hits; lure is mail-only.", useful: true },
    ],
  },
  "psexec-share": {
    agent: true,
    os: "Windows Server 2019",
    user: "SYSTEM",
    detections: [
      { t: "11:08:01", sev: "med", title: "SMB enum burst", detail: "Outbound 445 to 10.4.12.0/24" },
      { t: "11:08:15", sev: "high", title: "PsExec artifact", detail: "psexec.exe interactive=true" },
      { t: "11:08:16", sev: "info", title: "Session live", detail: "Interactive logon still present on jump-box" },
    ],
    process: { name: "psexec.exe", pid: 3104, path: "C:\\Windows\\Temp\\psexec.exe" },
    file: { name: "psexec.exe", path: "C:\\Windows\\Temp\\psexec.exe", sha: "b71e…44aa" },
    iocs: [
      { id: "hash", kind: "sha256", value: "b71e…44aa", result: "jump-box only; not in standard admin toolkit allowlist.", useful: true },
      { id: "host", kind: "host", value: "FS-02", result: "PSEXESVC present; no encrypt yet.", useful: true },
    ],
  },
  "mfa-blast": {
    agent: false,
    note: "Mail gateway — no endpoint agent. Block / sinkhole is infra-side.",
  },
  "vssadmin": {
    agent: true,
    os: "Windows Server 2022",
    user: "SYSTEM",
    detections: [
      { t: "01:02:11", sev: "crit", title: "vssadmin wipe", detail: "delete shadows /all /quiet" },
      { t: "01:02:18", sev: "crit", title: "Mass rename", detail: "Share files → .locked; admin SMB open" },
      { t: "01:02:19", sev: "high", title: "Ransom note", detail: "HELP.txt dropped on legal/finance/hr shares" },
    ],
    process: { name: "vssadmin.exe", pid: 9012, path: "C:\\Windows\\System32\\vssadmin.exe" },
    file: { name: "HELP.txt", path: "\\\\fs-02\\legal\\HELP.txt", sha: null },
    iocs: [
      { id: "host", kind: "host", value: "fs-02", result: "Active encryptor host; admin SMB still open.", useful: true },
      { id: "note", kind: "file", value: "HELP.txt", result: "Same note on legal, finance, hr shares.", useful: true },
    ],
  },
  "fwd-rule": {
    agent: true,
    os: "Windows 11",
    user: "p.nguyen",
    detections: [
      { t: "02:14:10", sev: "info", title: "Endpoint clean", detail: "hr-pc — no malware, no suspicious child." },
      { t: "02:14:11", sev: "info", title: "No local persist", detail: "Inbox rule lives in the cloud mailbox, not on disk." },
    ],
    process: null,
    file: null,
    iocs: [
      { id: "dom", kind: "domain", value: "okta-acme-sso.top", result: "Yesterday click only; no host malware.", useful: true },
      { id: "user", kind: "user", value: "p.nguyen", result: "Valid sessions still listed in IdP — not an EDR kill.", useful: true },
    ],
  },
  "cobalt-named": {
    agent: true,
    os: "Windows 11",
    user: "p.nguyen",
    detections: [
      { t: "10:22:18", sev: "high", title: "Excel → rundll32", detail: "Named pipe msagent_* opened" },
      { t: "10:22:19", sev: "crit", title: "Explorer injection", detail: "Injected thread; beacon profile" },
      { t: "10:22:20", sev: "high", title: "Host on LAN", detail: "TGT still valid; containment window open" },
    ],
    process: { name: "rundll32.exe", pid: 6640, path: "C:\\Windows\\System32\\rundll32.exe" },
    file: { name: "payroll-q3.xlsm", path: "C:\\Users\\p.nguyen\\Downloads\\payroll-q3.xlsm", sha: "c90d…1ab3" },
    iocs: [
      { id: "hash", kind: "sha256", value: "c90d…1ab3", result: "1 host (hr-pc); xlsm not seen elsewhere yet.", useful: true },
      { id: "pipe", kind: "pipe", value: "msagent_*", result: "Named-pipe pattern matches known beacon family.", useful: true },
    ],
  },
  "sso-impossible": {
    agent: false,
    note: "IdP / SSO plane — no endpoint agent on this asset. Session revoke is identity-side.",
  },
  "c2-dns": {
    agent: true,
    os: "Windows 11 (kiosk)",
    user: "kiosk",
    detections: [
      { t: "13:40:00", sev: "med", title: "NXDOMAIN storm", detail: "40+ 5-letter .top lookups" },
      { t: "13:40:11", sev: "high", title: "DGA answered", detail: "xqjrm.top → 172.93.44.9" },
      { t: "13:40:13", sev: "info", title: "Kiosk role", detail: "Host online; isolate optional if name dies" },
    ],
    process: null,
    file: null,
    iocs: [
      { id: "dom", kind: "domain", value: "xqjrm.top", result: "laptop-04 resolving; sinkhole list overlap.", useful: true },
      { id: "ip", kind: "ip", value: "172.93.44.9", result: "1 host talking; known C2 list hit.", useful: true },
    ],
  },
  "rdp-brute": {
    agent: true,
    os: "Windows Server 2019",
    user: "Administrator",
    detections: [
      { t: "16:01:11", sev: "high", title: "RDP success", detail: "Interactive session from 45.134.1.88" },
      { t: "16:01:12", sev: "info", title: "No payload on disk", detail: "Sensor clean; session still live" },
    ],
    process: null,
    file: null,
    iocs: [
      { id: "ip", kind: "ip", value: "45.134.1.88", result: "0 malware writes; source still connected on RDP.", useful: true },
    ],
  },
  "macro-drop": {
    agent: true,
    os: "Windows 11",
    user: "j.chen",
    detections: [
      { t: "14:03:20", sev: "high", title: "WINWORD → powershell -enc", detail: "Encoded command launched" },
      { t: "14:03:22", sev: "crit", title: "Payload written", detail: "%AppData%\\update.exe unsigned, running" },
      { t: "14:03:24", sev: "med", title: "Finance role host", detail: "Cached SAP creds present" },
    ],
    process: { name: "update.exe", pid: 5188, path: "C:\\Users\\j.chen\\AppData\\Roaming\\update.exe" },
    file: { name: "update.exe", path: "C:\\Users\\j.chen\\AppData\\Roaming\\update.exe", sha: "9f3a…c21" },
    iocs: [
      { id: "hash", kind: "sha256", value: "9f3a…c21", result: "1 live hit (laptop-04). Unsigned; not on allowlist.", useful: true },
      { id: "host", kind: "host", value: "laptop-04", result: "Payload still running; finance role host.", useful: true },
    ],
  },
  "bitlocker-note": {
    agent: true,
    os: "Windows Server 2022",
    user: "SYSTEM",
    detections: [
      { t: "01:44:01", sev: "crit", title: "Recovery disabled", detail: "bcdedit recovery-off; VSS stopped" },
      { t: "01:44:08", sev: "crit", title: "cipher /w", detail: "Volume D: wipe paused mid-run" },
      { t: "01:44:10", sev: "crit", title: "Only DC in site", detail: "SYSVOL still writable from self" },
    ],
    process: { name: "cipher.exe", pid: 2204, path: "C:\\Windows\\System32\\cipher.exe" },
    file: null,
    iocs: [
      { id: "host", kind: "host", value: "dc-01", result: "Only DC in site; impact tooling still live.", useful: true },
    ],
  },
  "oauth-spam": {
    agent: false,
    note: "Cloud consent / IdP — endpoint sensors report clean laptops. Containment is OAuth revoke.",
  },
  "exfil-share": {
    agent: true,
    os: "Windows 10",
    user: "guest-wifi",
    detections: [
      { t: "23:12:40", sev: "high", title: "7z staging", detail: "%TEMP%\\legal.7z growing" },
      { t: "23:14:01", sev: "crit", title: "MEGA upload", detail: "Outbound to mega.nz ~40% on guest SSID" },
      { t: "23:14:02", sev: "high", title: "Host is the leak", detail: "wifi-ap still packing share data" },
    ],
    process: { name: "7z.exe", pid: 7744, path: "C:\\Program Files\\7-Zip\\7z.exe" },
    file: { name: "legal.7z", path: "C:\\Users\\guest\\AppData\\Local\\Temp\\legal.7z", sha: "e12b…88d0" },
    iocs: [
      { id: "dom", kind: "domain", value: "mega.nz", result: "wifi-ap upload in progress (~40%).", useful: true },
      { id: "hash", kind: "sha256", value: "e12b…88d0", result: "Staging archive on wifi-ap only.", useful: true },
    ],
  },
  "kerberoast-svc": {
    agent: true,
    os: "Windows 11",
    user: "p.nguyen",
    detections: [
      { t: "18:02:01", sev: "info", title: "hr-pc quiet", detail: "No malware; roast was ticket traffic." },
      { t: "18:18:04", sev: "info", title: "No local payload", detail: "Service account reuse is identity-plane." },
    ],
    process: null,
    file: null,
    iocs: [
      { id: "user", kind: "user", value: "svc-sql", result: "0 malware; account reused from jump-box — identity action.", useful: true },
    ],
  },
  "noise-vendor-update": {
    agent: true,
    os: "Windows 11",
    user: "eng-22$",
    detections: [
      { t: "10:02:01", sev: "med", title: "Process from Temp", detail: "Setup.exe under Public\\Temp" },
      { t: "10:02:02", sev: "info", title: "Authenticode valid", detail: "Publisher Contoso Imaging Ltd — known-good" },
      { t: "10:02:04", sev: "info", title: "Change ticket", detail: "CHG4412 scanner firmware push" },
    ],
    process: { name: "Setup.exe", pid: 4012, path: "C:\\Users\\Public\\Temp\\Setup.exe" },
    file: { name: "Setup.exe", path: "C:\\Users\\Public\\Temp\\Setup.exe", sha: "f00d…aa11" },
    iocs: [
      { id: "hash", kind: "sha256", value: "f00d…aa11", result: "Signed Contoso Imaging; matches CHG4412.", useful: true },
      { id: "pub", kind: "publisher", value: "Contoso Imaging Ltd", result: "Known-good publisher · ticketed update.", useful: true },
    ],
  },
  "noise-pentest": {
    agent: false,
    note: "Edge firewall — no endpoint agent. Scan matches approved pentest window.",
  },
  "noise-mailer": {
    agent: false,
    note: "Mail gateway — no endpoint agent on mx-01.",
  },
  "noise-backup": {
    agent: true,
    os: "Windows Server 2019",
    user: "SYSTEM",
    detections: [
      { t: "02:10:02", sev: "info", title: "Known backup agent", detail: "BackupAgent.exe signed=true" },
      { t: "02:10:03", sev: "info", title: "VSS intact", detail: "No ransom note; nightly rotate job success" },
    ],
    process: { name: "BackupAgent.exe", pid: 1880, path: "C:\\Program Files\\Backup\\BackupAgent.exe" },
    file: null,
    iocs: [
      { id: "proc", kind: "process", value: "BackupAgent.exe", result: "Signed backup agent; job rotate-legal-archive success.", useful: true },
    ],
  },
  "noise-sso-lab": {
    agent: false,
    note: "Lab SSO appliance — no production EDR agent.",
  },
};

export function emptyEdrState() {
  return { isolated: false, killed: false, quarantined: false, iocSearched: {} };
}

export function edrFor(key, host) {
  const base = EDR[key];
  if (base) return { host, ...base };
  if (host && NO_AGENT.has(host)) {
    return { host, agent: false, note: "No EDR agent on this asset." };
  }
  return {
    host: host || "unknown",
    agent: true,
    os: "Unknown",
    detections: [
      { t: "--:--", sev: "info", title: "Limited telemetry", detail: "No enriched timeline for this correlation." },
    ],
    process: null,
    file: null,
    iocs: [],
  };
}

/** Quarantine / hash-block counts as correct when playbook rem includes either. */
export function quarantineNeeded(rems) {
  const set = new Set(rems || []);
  return set.has("quarantine_file") || set.has("block_hash");
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** HTML for the EDR console panel (claimed ticket with a host). */
export function edrPanelHtml(alert) {
  if (!alert) {
    return `<div class="edr-empty">Claim a ticket to open the endpoint console.</div>`;
  }
  const p = edrFor(alert.key, alert.host);
  const st = { ...emptyEdrState(), ...(alert.edr || {}) };
  if (!st.iocSearched) st.iocSearched = {};
  const badge = st.isolated
    ? `<span class="edr-badge iso">Isolated</span>`
    : `<span class="edr-badge on">Online</span>`;

  if (!p.agent) {
    return `
      <div class="edr-head">
        <div>
          <div class="edr-kicker">Endpoint · EDR</div>
          <div class="edr-host">${esc(p.host)}</div>
        </div>
        <span class="edr-badge off">No agent</span>
      </div>
      <p class="edr-note">${esc(p.note || "No EDR agent on this asset.")}</p>`;
  }

  const dets = (p.detections || []).map((d) => `
    <div class="edr-row">
      <span class="tm">${esc(d.t)}</span>
      <span class="sv ${esc(d.sev)}">${esc(d.sev)}</span>
      <span class="ttl">${esc(d.title)}</span>
      <span class="det">${esc(d.detail)}</span>
    </div>`).join("");

  const proc = p.process
    ? `<div class="edr-proc">
        <em>Target process</em>
        <b>${esc(p.process.name)}</b>
        <span>pid ${p.process.pid}</span>
        <code>${esc(p.process.path)}</code>
      </div>`
    : "";

  const file = p.file
    ? `<div class="edr-proc">
        <em>File object</em>
        <b>${esc(p.file.name)}</b>
        ${p.file.sha ? `<span>${esc(p.file.sha)}</span>` : ""}
        <code>${esc(p.file.path)}</code>
      </div>`
    : "";

  const iocs = p.iocs || [];
  const iocBlock = iocs.length
    ? `<div class="edr-ioc">
        <em>IOC search</em>
        <div class="edr-ioc-chips">
          ${iocs.map((ioc) => {
            const done = !!st.iocSearched[ioc.id];
            return `<button type="button" class="edr-chip${done ? " on" : ""}" data-edr="ioc" data-ioc="${esc(ioc.id)}" ${done ? "disabled" : ""}>
              <span class="k">${esc(ioc.kind)}</span> ${esc(ioc.value)}
            </button>`;
          }).join("")}
        </div>
        ${iocs.filter((ioc) => st.iocSearched[ioc.id]).map((ioc) => `
          <p class="edr-ioc-hit"><b>${esc(ioc.kind)} ${esc(ioc.value)}</b> — ${esc(ioc.result)}</p>
        `).join("")}
      </div>`
    : "";

  const isoDis = st.isolated ? "disabled" : "";
  const killDis = st.killed || !p.process ? "disabled" : "";
  const quarDis = st.quarantined || !p.file ? "disabled" : "";

  return `
    <div class="edr-head">
      <div>
        <div class="edr-kicker">Endpoint · EDR</div>
        <div class="edr-host">${esc(p.host)}</div>
        <div class="edr-meta">${esc(p.os || "")}${p.user ? ` · ${esc(p.user)}` : ""}</div>
      </div>
      ${badge}
    </div>
    <div class="edr-timeline">${dets}</div>
    ${proc}
    ${file}
    ${iocBlock}
    <div class="edr-actions">
      <button type="button" class="edr-act" data-edr="isolate" ${isoDis}>
        ${st.isolated ? "Isolated" : "Isolate host"}
      </button>
      <button type="button" class="edr-act" data-edr="kill" ${killDis}>
        ${st.killed ? "Kill sent" : "Kill process"}
      </button>
      <button type="button" class="edr-act" data-edr="quarantine" ${quarDis}>
        ${st.quarantined ? "Quarantined" : "Quarantine file"}
      </button>
    </div>`;
}
