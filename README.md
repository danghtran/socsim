# SOC SIM

Night-shift desk game. Incoming alerts. Match the playbook, pull logs, contain, set severity, push — before the SLA burns.

Inspired by the *pacing* of a sequential cook-and-serve loop (assemble the right ticket under a waiting queue). Cybersecurity themed. One loop, no accounts, no leaderboards.

## Play

Open `index.html` in a browser, or:

```bash
python3 -m http.server 8080
```

Then visit http://localhost:8080

## How to play

1. Read the alert: **playbook**, **containment**, **severity**.
2. **Open ticket**.
3. Assign **Phish / Malware / Intrusion**.
4. Click **SIEM · pull logs** and wait a beat.
5. Apply **Isolate / Reset creds / Block IP**.
6. Click the **severity** dial until it matches (0–3).
7. **Push case**. Dump resets a bad bench without failing the alert.

A shift is about 100 seconds. Three alerts can wait at once. Missed SLA or a wrong push costs trust.
