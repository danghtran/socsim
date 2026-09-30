/**
 * Hunt pivots — one extra fact per SIEM stream row (index-aligned).
 * Never states the sealed chain / rem / disposition.
 */
export const PIVOTS = {
  "invoice-portal": [
    "Same lookalike hit 2 more finance mailboxes within +8m.",
    "Domain not on allowlist; first corp sighting today.",
    "j.chen: no travel ticket; last good login on-prem ~3h earlier.",
    "EDR timeline clean — no child process after the browser session.",
    "Correlation holds: click → rare domain → password POST only.",
  ],
  "rundll-temp": [
    "Attachment hash unseen in org; macro-enabled = true.",
    "rundll32 parent chain matches known Office exploit path.",
    "a.dll unsigned; VT-like intel: 0 org hits before today.",
    "Beacon IP not on business CDN lists; JA3 uncommon here.",
    "Host still on LAN — isolate window still open.",
  ],
  "vpn-spray": [
    "Same /24 probed 3 service accounts in 10m.",
    "Legacy VPN profile: MFA not enforced for svc-*.",
    "Success after 40 fails — classic spray pattern.",
    "No corporate travel record for svc-backup.",
    "Session still listed as connected on the concentrator.",
  ],
  "gift-cards": [
    "Helpdesk tag: finance queue; user did not click.",
    "Envelope domain is a 1-day-old lookalike of acme holdings.",
    "14 recipients, 0 clicks, 0 auth events in window.",
    "IdP quiet for finance group — no password POSTs.",
    "Lure messages still sitting unquarantined in inboxes.",
  ],
  "psexec-share": [
    "jump-box had an interactive logon 20m before SMB enum.",
    "PSEXESVC install matches PsExec default service name.",
    "psexec.exe hash not in standard admin toolkit allowlist.",
    "No encrypt / VSS wipe on FS-02 yet.",
    "Pivot session still interactive on jump-box.",
  ],
  "mfa-blast": [
    "200 unique links; template matches last month’s kit.",
    "login-okta-acme.xyz age 11h; not on allowlist.",
    "Only 3 clicks so far; zero password POSTs.",
    "Sending ASN overlaps prior credential-harvest infra.",
    "Kit staged — harvest not started.",
  ],
  "vssadmin": [
    "Nightly backup failed only on fs-02 legal share.",
    "vssadmin cmdline matches known ransomware prep.",
    "Mass .locked rename — not a backup extension pattern.",
    "HELP.txt dropped on three shares.",
    "Admin SMB session to fs-02 still open.",
  ],
  "fwd-rule": [
    "Inbox rule created from coffee-shop ASN, not office.",
    "OWA cookie login — no device compliance claim.",
    "Yesterday’s lookalike Okta hit ties to same user.",
    "External forward to consumer gmail — policy violation.",
    "Rule still enabled; mail still leaving.",
  ],
  "cobalt-named": [
    "Named pipe pattern matches Cobalt default prefix.",
    "Parent process is a long-lived Office child.",
    "No disk payload in the last hour — in-memory likely.",
    "Outbound to rare IP on 443; no SNI match to vendors.",
    "Beacon interval ~60s still firing.",
  ],
  "sso-impossible": [
    "Impossible travel: two countries < 1h apart.",
    "Refresh token reuse flagged by IdP risk engine.",
    "New OAuth grant to an unverified app same hour.",
    "User reports “I didn’t approve that.”",
    "Cloud session list still shows the odd grant.",
  ],
  "c2-dns": [
    "Query name entropy high; length atypical for corp DNS.",
    "Same host also made rare DoH-like HTTPS bursts.",
    "Domain registered < 48h; no category.",
    "No malware file on disk — living-off-the-land DNS.",
    "C2 domain still resolving from the host.",
  ],
  "rdp-brute": [
    "Src IP in prior month’s brute list.",
    "Target is an internet-exposed jump RDP.",
    "One success after burst — account not locked out.",
    "No MFA on this RDP listener.",
    "Successful session still active.",
  ],
  "macro-drop": [
    "docm came from external sender; user enabled content.",
    "Dropped exe hash unseen; writes under %%TEMP%%.",
    "Child process spawns powershell -enc shortly after.",
    "Hash not blocked fleet-wide yet.",
    "Patient host still talking outbound.",
  ],
  "bitlocker-note": [
    "Note text matches known ransomware family template.",
    "Shadow copies missing on DC volume.",
    "Encryption targets include SYSVOL-adjacent paths.",
    "No legit BitLocker escrow event in that window.",
    "Impact still spreading — contain DC path now.",
  ],
  "oauth-spam": [
    "App publisher unverified; scopes include Mail.Read.",
    "Consent blast targeted finance + HR.",
    "One user completed consent; tokens issued.",
    "App still listed under enterprise apps.",
    "Grant not revoked — sync can continue.",
  ],
  "exfil-share": [
    "Large sequential reads on %%CONFIDENTIAL%% share.",
    "Dest IP is rare VPS; not a backup target.",
    "User agent matches custom sync tool, not OneDrive.",
    "No DLP block fired — policy gap.",
    "Transfer still in progress.",
  ],
  "kerberoast-svc": [
    "TGS requests for MSSQL SPN from hr-pc — unusual.",
    "RC4-HMAC ticket = roastable.",
    "svc-sql later used from jump-box (first seen).",
    "hr-pc itself clean of malware.",
    "Service account still enabled.",
  ],
  "noise-vendor-update": [
    "Publisher thumbprint matches Contoso Imaging allowlist.",
    "Path is Temp but hash is the known Setup.exe.",
    "CDN destination categorized software-update.",
    "CHG4412 covers this exact push window.",
    "No secondary payload after Setup.exe exit.",
  ],
  "noise-pentest": [
    "Src in contracted pentest IP range.",
    "Auth fails are spray-shaped but expected today.",
    "TI allowlist: RedTeam Co engagement.",
    "Email notice matches start/end times.",
    "No successful pivot beyond scan noise.",
  ],
  "noise-mailer": [
    "Display-name heuristic only — SPF/DKIM pass.",
    "Volume matches HR enrollment roster size.",
    "Domain age 4y; not a same-day lookalike kit.",
    "HR campaign ticket on file this week.",
    "No credential harvest events after delivery.",
  ],
  "noise-backup": [
    "Rename extension .bak — backup rotate pattern.",
    "BackupAgent.exe signed and expected on host.",
    "Job name rotate-legal-archive succeeded.",
    "No ransom note; VSS intact.",
    "Schedule matches nightly window every week.",
  ],
  "noise-sso-lab": [
    "Users are qa-* only — nonprod naming.",
    "Source VLAN is lab 10.90.0.0/16.",
    "MFA disabled by lab policy — expected.",
    "AUT-882 soak test owns this burst.",
    "No prod IdP apps in the same session set.",
  ],
};

export function pivotsFor(key, streamLen = 0) {
  const list = PIVOTS[key];
  if (list?.length) return list;
  return Array.from({ length: streamLen }, (_, i) =>
    `No enriched pivot for event ${i + 1} — stick to the stream and analyst note.`);
}
