# SOC SIM

A **Tier-1 SOC analyst workday** simulator. Correlations land in your alert queue. Author playbooks, claim a ticket, apply the matching book, and submit the case.

One loop, no accounts, no leaderboards.

## Play

**Live:** [https://danghtran.github.io/socsim/](https://danghtran.github.io/socsim/)

Locally, ES modules need a server with the correct JS MIME type:

```bash
python serve.py
```

Then visit http://127.0.0.1:8765/

## How a day works

1. **Clock in.** Morning brief, then you are on the console (wall clock 08:00–16:00). Progress **auto-saves** in the browser — close the tab or use Break → **Save & leave**, then **Continue shift** on the splash. Random **urgent floor popups** freeze the desk until you choose an action.
2. **Playbooks tab.** Name a playbook and select its attack-chain steps (in order), remediation, and disposition. Saved books stay in your library (localStorage).
3. **Console tab.** Claim a ticket, read the SIEM stream, open **Hunt pivot** on a row, use the **EDR** panel (timeline · IOC search · Isolate / Kill / Quarantine), apply a playbook, submit. Some correlations are **noise / FP**.
4. **Submit the case.** Wrong playbooks still close the ticket with no rejection feedback — the miss shows up later when the threat **returns** hotter (noise FPs do not return).
5. **Comms tab.** Helpdesk, users, IR, and your manager ping the desk. Pick a reply — **bad handling advice lets the attack succeed**, and a hotter alert lands on the console a little later.
6. **End the day** from break → End day for an end-of-day report.

### Playbook fields

- **Attack chain** — Lure, Harvest, Execute, C2, Brute, Access, Move, Persist, Token, Consent, Encrypt, Exfil (order matters; empty for FP/benign)
- **Remediation** — Pick categories (Endpoint, Identity, Network, Email, Cloud / SaaS, Observe), then multi-select actions. Use **No containment** / **Request rule tune** for noise.
- **Disposition** — True positive · contain, Suspicious · monitor, Escalate to IR, Hand off Tier-2, False positive, Benign / expected

Wrong disposition needs a rewrite; two failures escalate. Answers stay sealed. SLA timers are off (`TIMING` in `js/constants.js`); the wall clock is atmospheric.

## Code layout

```
js/
  main.js        entry
  constants.js   steps, remediations, dispositions, defaults
  catalog.js     SIEM correlation scenarios
  state.js       runtime + playbook persistence
  playbooks.js   Playbooks tab authoring UI
  render.js      console paint / HUD
  shift.js       spawn, submit, day loop
  util.js        helpers
  pivots.js      hunt-pivot facts per scenario
  edr.js         endpoint timeline, IOC search, isolate/kill/quarantine
  interrupts.js  urgent floor popups
  audio.js       tones
  comms.js       stakeholder inbox / replies
  comms-data.js  ping templates
```
