import {
  DAY_END_MIN, DAY_START_MIN, FOLLOWUPS, MAX_Q, NOISE_SPAWN_CHANCE, PATIENCE, PATIENCE_SEV,
  RETURN_MAX_GEN, SHIFT_MS, SOURCES, SPAWN_MAX, SPAWN_MIN, TIMING, TUTORIAL_SPAWN,
  WORK_CLOSE_MIN, WORK_MISS_MIN,
} from "./constants.js";
import { CATALOG } from "./catalog.js";
import { edrFor, emptyEdrState, quarantineNeeded } from "./edr.js";
import { pivotsFor } from "./pivots.js";
import { ensureAudio, tone } from "./audio.js";
import {
  applyPlaybookToTicket, els, fly, focused, hideModal, hud, nextStep,
  paint, setTab, toast, updatePatience,
} from "./render.js";
import { renderPlaybooks, initPlaybooks } from "./playbooks.js";
import { findInterrupt, firstInterruptAt, interruptGapMin, INTERRUPTS } from "./interrupts.js";
import { COMM_SENDERS } from "./comms-data.js";
import {
  flushStaleComms, initComms, maybeSpawnComm, renderComms, resetComms, updateCommsBadge,
} from "./comms.js";
import {
  S, emptyTicket, loadPlaybooks, saveSession, peekSession, clearSession, hasSession, emptyDraft,
} from "./state.js";
import { clamp, fmtWork, pick, sameChain, sameRems, $ } from "./util.js";

let saveTimer = 0;
function queueSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveSession(), 250);
}

function resetInterrupts() {
  S.interrupt = null;
  S.interruptSeen = new Set();
  S.nextInterruptAt = firstInterruptAt(S.workMin);
  S.pauseKind = null;
}

function maybeSpawnInterrupt() {
  if (!S.running || S.paused) return;
  if (S.interrupt) return;
  if (S.workMin < S.nextInterruptAt) return;
  if (!els.modal?.hidden) return;

  const eligible = INTERRUPTS.filter((t) => {
    if (S.interruptSeen.has(t.id)) return false;
    if ((t.needClosed || 0) > S.closed) return false;
    return true;
  });
  if (!eligible.length) {
    S.nextInterruptAt = S.workMin + interruptGapMin();
    return;
  }
  const tpl = pick(eligible);
  showInterrupt(tpl);
}

function showInterrupt(tpl) {
  S.interrupt = { id: tpl.id, shownAt: S.workMin };
  S.interruptSeen.add(tpl.id);
  S.paused = true;
  S.pauseKind = "interrupt";
  S.pauseAt = performance.now();
  tone(360, 0.09, "square", 0.04);
  setTimeout(() => tone(300, 0.1, "square", 0.035), 70);

  const urg = tpl.urgency === "critical" ? "critical" : "urgent";
  els.card.className = `interrupt-card ${urg}`;
  els.card.innerHTML = `
    <div class="int-banner"><span>${urg === "critical" ? "Immediate action" : "Urgent"}</span><span>${tpl.tag || "Interrupt"}</span></div>
    <p class="int-from">${tpl.from}</p>
    <h2>${tpl.title}</h2>
    <p>${tpl.body}</p>
    <p class="int-hint">Desk is frozen until you choose.</p>
    <div class="btns int-choices">
      ${tpl.choices.map((c) => `
        <button type="button" data-int-choice="${c.id}" class="${c.effect === "good" ? "pri" : ""}">${c.text}</button>
      `).join("")}
    </div>`;
  els.modal.hidden = false;
  els.modal.classList.add("interrupt-open");
  els.card.querySelectorAll("[data-int-choice]").forEach((btn) => {
    btn.onclick = () => resolveInterrupt(btn.dataset.intChoice);
  });
  hud(advanceWork);
  queueSave();
}

function resolveInterrupt(choiceId) {
  const tpl = findInterrupt(S.interrupt?.id);
  if (!tpl) {
    clearInterruptModal();
    return;
  }
  const choice = tpl.choices.find((c) => c.id === choiceId);
  if (!choice) return;

  applyPauseOffset(performance.now() - S.pauseAt);
  S.paused = false;
  S.pauseKind = null;
  S.interrupt = null;
  S.nextInterruptAt = S.workMin + interruptGapMin();
  clearInterruptModal();

  if (typeof choice.rate === "number") rate(choice.rate);

  if (choice.effect === "good") {
    toast(`${tpl.tag || "Interrupt"} handled`, "good");
    tone(660, 0.07, "square", 0.03);
  } else if (choice.effect === "bad") {
    toast("That call may come back to bite you", "bad");
    tone(180, 0.12, "sawtooth", 0.045);
    if (choice.attackKey) {
      scheduleReturnByKey(choice.attackKey, choice.returnReason || "Floor decision made it worse", {
        direct: true,
        fromComms: true,
        delayMin: choice.delayMin || 14,
        fromTitle: tpl.title,
      });
    }
  } else {
    toast("Noted — keep moving");
    tone(240, 0.06);
  }

  hud(advanceWork);
  queueSave();
}

function clearInterruptModal() {
  els.modal.hidden = true;
  els.modal.classList.remove("interrupt-open");
  els.card.className = "";
  els.card.innerHTML = "";
}

function reshowInterruptIfNeeded() {
  if (!S.interrupt?.id) return;
  const tpl = findInterrupt(S.interrupt.id);
  if (!tpl) {
    S.interrupt = null;
    S.pauseKind = null;
    return;
  }
  showInterrupt(tpl);
}
export function advanceWork(mins) {
  const before = Math.floor(S.workMin);
  S.workMin = Math.min(DAY_END_MIN + 45, S.workMin + mins);
  if (!S.eodShown && S.workMin >= DAY_END_MIN) {
    S.eodShown = true;
    toast("Wall clock hit 16:00 — wrap up when ready", "good");
  }
  flushReturns();
  maybeSpawnComm();
  flushStaleComms();
  maybeSpawnInterrupt();
  if (Math.floor(S.workMin) !== before) queueSave();
}

function rate(delta) {
  S.reviews += 1;
  S.stars = clamp(S.stars + delta, 1, 5);
}

function remember(key) {
  S.recent.push(key);
  if (S.recent.length > 6) S.recent.shift();
}

function pickTemplate(fixedKey) {
  if (fixedKey) return CATALOG.find((e) => e.key === fixedKey) || CATALOG[0];
  const used = new Set(S.queue.map((a) => a.key).concat(S.recent));
  const noise = CATALOG.filter((e) => e.noise && !used.has(e.key));
  const real = CATALOG.filter((e) => !e.noise && !used.has(e.key));
  if (noise.length && Math.random() < NOISE_SPAWN_CHANCE) return pick(noise);
  const pool = real.length ? real : CATALOG.filter((e) => !used.has(e.key));
  return pick(pool.length ? pool : CATALOG);
}

function scheduleReturn(a) {
  const fu = FOLLOWUPS[a.key];
  if (!fu) return;
  const gen = (a.generation || 0) + 1;
  if (gen > RETURN_MAX_GEN) return;
  // Don't stack duplicates of the same follow-up key
  if (S.pending.some((p) => p.key === fu.key) || S.queue.some((q) => q.key === fu.key && q.isReturn)) {
    return;
  }
  S.pending.push({
    atMin: S.workMin + fu.delayMin,
    key: fu.key,
    fromTitle: a.title,
    reason: fu.reason,
    generation: gen,
  });
}

/** Schedule a later console alert. Comms bad-advice uses short delay + attackKey. */
export function scheduleReturnByKey(key, reason, opts = {}) {
  const tpl = CATALOG.find((e) => e.key === key);
  if (!tpl) return false;
  const fu = FOLLOWUPS[key];
  // Comms passes the attack outcome key directly; case mishandles use follow-up map.
  const targetKey = opts.direct ? key : (fu?.key || key);
  const targetTpl = CATALOG.find((e) => e.key === targetKey) || tpl;
  if (S.pending.some((p) => p.key === targetKey)) return false;
  if (S.queue.some((q) => q.key === targetKey && q.isReturn)) return false;

  const delay = opts.delayMin
    ?? (opts.fromComms ? 14 : null)
    ?? fu?.delayMin
    ?? 28;

  S.pending.push({
    atMin: S.workMin + delay,
    key: targetKey,
    fromTitle: opts.fromTitle || targetTpl.title,
    reason: reason || fu?.reason || "Desk guidance made it worse",
    generation: opts.generation || 1,
    fromComms: !!opts.fromComms,
  });
  return true;
}

function flushReturns() {
  if (!S.running || S.paused) return;
  const due = [];
  const wait = [];
  for (const p of S.pending) {
    if (S.workMin >= p.atMin) due.push(p);
    else wait.push(p);
  }
  S.pending = wait;
  for (const p of due) {
    if (S.queue.length >= MAX_Q) {
      S.pending.push({ ...p, atMin: S.workMin + 6 });
      continue;
    }
    spawnReturn(p);
  }
}

function spawnReturn(p) {
  const alert = makeAlert(p.key, {
    isReturn: true,
    generation: p.generation,
    returnFrom: p.fromTitle,
    returnReason: p.reason,
  });
  // Returns land hotter than the catalog baseline
  alert.sev = Math.min(3, (alert.sev || 1) + 1);
  alert.title = `RETURN · ${alert.title}`;
  if (p.fromComms) alert.fromComms = true;
  S.queue.push(alert);
  S.focus = alert.id;
  const prefix = p.fromComms ? "After your guidance" : "Returned";
  toast(`${prefix}: ${p.reason}`, "bad");
  tone(200, 0.12, "sawtooth", 0.045);
  setTimeout(() => tone(160, 0.14, "sawtooth", 0.04), 90);
}

function makeAlert(fixedKey, opts = {}) {
  const tpl = pickTemplate(fixedKey);
  const src = SOURCES[tpl.source];
  const base = S.firstDone ? PATIENCE : 110000;
  return {
    id: S.alertUid++,
    key: tpl.key,
    title: tpl.title,
    source: src,
    host: tpl.host,
    sev: tpl.sev,
    chain: tpl.chain,
    rems: Array.isArray(tpl.rems) ? [...tpl.rems] : [],
    disp: tpl.disp,
    rule: tpl.rule,
    stream: tpl.stream,
    teach: tpl.teach,
    born: S.now,
    wait: Math.max(45000, base - tpl.sev * PATIENCE_SEV),
    strikes: 0,
    isReturn: !!opts.isReturn,
    generation: opts.generation || 0,
    returnFrom: opts.returnFrom || null,
    returnReason: opts.returnReason || null,
    noise: !!tpl.noise,
    pivots: pivotsFor(tpl.key, (tpl.stream || []).length),
    edr: emptyEdrState(),
  };
}

function ticketAlert() {
  if (!S.ticket) return null;
  return S.queue.find((q) => q.id === S.ticket.alertId) || null;
}

function ensureEdr(a) {
  if (!a.edr) a.edr = emptyEdrState();
  if (!a.edr.iocSearched) a.edr.iocSearched = {};
  return a.edr;
}

function doEdrAction(kind, iocId) {
  const a = ticketAlert();
  if (!a) {
    toast("Claim a ticket first");
    return;
  }
  const st = ensureEdr(a);
  const profile = edrFor(a.key, a.host);
  if (!profile.agent) {
    toast("No EDR agent on this asset");
    tone(220, 0.06);
    return;
  }

  if (kind === "isolate") {
    if (st.isolated) return;
    st.isolated = true;
    const needed = (a.rems || []).includes("isolate");
    if (needed) {
      rate(0.08);
      toast(`Isolate queued on ${a.host}`, "good");
      tone(520, 0.07, "triangle", 0.03);
    } else if (a.noise) {
      rate(-0.3);
      toast("Isolated a clean change host — expect a call", "bad");
      tone(180, 0.1, "sawtooth", 0.04);
    } else {
      rate(-0.12);
      toast(`Isolate sent on ${a.host} — confirm scope`, "bad");
      tone(240, 0.08);
    }
    doPaint();
    return;
  }

  if (kind === "kill") {
    if (!profile.process) {
      toast("No kill target on this host");
      tone(220, 0.06);
      return;
    }
    if (st.killed) return;
    st.killed = true;
    const needed = (a.rems || []).includes("kill_proc");
    if (needed) {
      rate(0.08);
      toast(`Kill sent · ${profile.process.name}`, "good");
      tone(520, 0.07, "triangle", 0.03);
    } else if (a.noise) {
      rate(-0.25);
      toast("Killed a signed change process", "bad");
      tone(180, 0.1, "sawtooth", 0.04);
    } else {
      rate(-0.1);
      toast(`Kill sent · ${profile.process.name} — may not be the patient`, "bad");
      tone(240, 0.08);
    }
    doPaint();
    return;
  }

  if (kind === "quarantine") {
    if (!profile.file) {
      toast("No file object on this host");
      tone(220, 0.06);
      return;
    }
    if (st.quarantined) return;
    st.quarantined = true;
    const needed = quarantineNeeded(a.rems);
    if (needed) {
      rate(0.08);
      toast(`Quarantine · ${profile.file.name}`, "good");
      tone(520, 0.07, "triangle", 0.03);
    } else if (a.noise) {
      rate(-0.3);
      toast("Quarantined a signed change file", "bad");
      tone(180, 0.1, "sawtooth", 0.04);
    } else {
      rate(-0.1);
      toast(`Quarantine · ${profile.file.name} — confirm it is the patient`, "bad");
      tone(240, 0.08);
    }
    doPaint();
    return;
  }

  if (kind === "ioc") {
    const ioc = (profile.iocs || []).find((x) => x.id === iocId);
    if (!ioc) return;
    if (st.iocSearched[ioc.id]) return;
    st.iocSearched[ioc.id] = true;
    if (ioc.useful) rate(0.04);
    toast(`IOC search · ${ioc.kind}`);
    tone(440, 0.05, "triangle", 0.025);
    doPaint();
  }
}

function spawn(fixedKey) {
  if (S.queue.length >= MAX_Q) return;
  const alert = makeAlert(fixedKey);
  S.queue.push(alert);
  if (!S.focus) S.focus = alert.id;
  tone(520, 0.07, "triangle", 0.03);
}

function drop(id, why) {
  const i = S.queue.findIndex((a) => a.id === id);
  if (i < 0) return;
  const a = S.queue[i];
  S.queue.splice(i, 1);
  if (S.focus === id) S.focus = S.queue[0]?.id || null;
  if (S.ticket?.alertId === id) S.ticket = null;
  remember(a.key);
  if (why === "sla") {
    S.breached += 1;
    S.combo = 0;
    rate(-1);
    advanceWork(WORK_MISS_MIN);
    scheduleReturn(a);
    toast(`${a.title} — SLA missed; threat may return`, "bad");
    tone(140, 0.2, "sawtooth", 0.05);
  } else if (why === "wrong") {
    // Silent mishandle: looks like a normal close to the analyst, but the threat returns later.
    S.rejected += 1;
    S.closed += 1;
    S.combo = 0;
    advanceWork(WORK_CLOSE_MIN);
    scheduleReturn(a);
    fly("closed");
    toast(`${a.title} — case closed`, "good");
    tone(660, 0.08, "square", 0.04);
    setTimeout(() => tone(880, 0.1, "square", 0.035), 70);
    if (S.tutorial) S.firstDone = true;
  } else if (why === "ok") {
    S.contained += 1;
    S.closed += 1;
    S.combo += 1;
    advanceWork(WORK_CLOSE_MIN + Math.min(2, S.combo - 1) * 4);
    rate(0.15);
    fly(`closed${S.combo > 1 ? "  x" + S.combo : ""}`);
    toast(`${a.title} — case closed`, "good");
    tone(660, 0.08, "square", 0.04);
    setTimeout(() => tone(880, 0.1, "square", 0.035), 70);
    if (S.tutorial) S.firstDone = true;
  }
}

function requireTicket() {
  if (!S.ticket) {
    toast("Claim a ticket first");
    tone(220, 0.08);
    return false;
  }
  return true;
}

function openTicket() {
  if (S.ticket) {
    toast("Discard the current draft first");
    return;
  }
  const a = focused();
  if (!a) {
    toast("No alert in queue");
    return;
  }
  S.ticket = emptyTicket(a.id);
  tone(420, 0.06);
  doPaint();
}

function dump() {
  if (!S.ticket) return;
  S.ticket = null;
  els.work.classList.add("flash");
  setTimeout(() => els.work.classList.remove("flash"), 220);
  tone(200, 0.08);
  toast("Draft discarded");
  doPaint();
}

function ticketComplete(t) {
  if (!t?.playbookId || !t.disp) return false;
  if (t.disp === "fp" || t.disp === "benign") {
    return Array.isArray(t.rems) && t.rems.length > 0;
  }
  return !!(t.chain.length && t.rems?.length);
}

function playbookMatches(t, a) {
  return a && sameChain(t.chain, a.chain) && sameRems(t.rems, a.rems) && t.disp === a.disp;
}

function push() {
  const t = S.ticket;
  if (!t) {
    toast("Nothing to submit");
    return;
  }
  const a = S.queue.find((q) => q.id === t.alertId);
  if (!a) {
    toast("That alert is gone — discard the draft");
    return;
  }
  if (!ticketComplete(t)) {
    toast(nextStep().msg);
    tone(240, 0.08);
    return;
  }
  if (playbookMatches(t, a)) {
    S.ticket = null;
    drop(a.id, "ok");
    doPaint();
    return;
  }
  // First wrong submit closes the ticket with no rejection feedback;
  // the mishandle is revealed later when the threat returns.
  S.ticket = null;
  drop(a.id, "wrong");
  doPaint();
}

function onApplyPlaybook(id) {
  if (!requireTicket()) return;
  if (applyPlaybookToTicket(id)) doPaint();
}

function doPaint() {
  paint(advanceWork, onApplyPlaybook);
  queueSave();
}

function tick(ts) {
  if (!S.running) return;
  S.raf = requestAnimationFrame(tick);
  if (S.paused) return;
  S.now = ts;
  const elapsed = S.now - S.t0;
  if (TIMING && elapsed >= SHIFT_MS) {
    endShift();
    return;
  }
  if (S.now >= S.nextSpawn) {
    const canSpawn = S.queue.length < MAX_Q && (S.firstDone || S.queue.length === 0);
    if (canSpawn) spawn();
    const gap = S.firstDone
      ? SPAWN_MIN + Math.random() * (SPAWN_MAX - SPAWN_MIN)
      : TUTORIAL_SPAWN;
    S.nextSpawn = S.now + gap;
  }
  if (TIMING) {
    for (const a of [...S.queue]) {
      if (S.now - a.born >= a.wait) drop(a.id, "sla");
    }
  }
  const sig = S.queue.map((a) => a.id).join(",") + ":" + S.focus + ":" + (S.ticket?.alertId || "") + ":" + (S.ticket?.playbookId || "")
    + ":" + S.queue.map((a) => {
      const e = a.edr || {};
      const iocs = Object.keys(e.iocSearched || {}).sort().join("");
      return `${e.isolated ? 1 : 0}${e.killed ? 1 : 0}${e.quarantined ? 1 : 0}${iocs}`;
    }).join("");
  if (sig !== S.qSig) {
    S.qSig = sig;
    doPaint();
  } else {
    updatePatience();
    hud(advanceWork);
  }
}

function applyPauseOffset(dt) {
  S.t0 += dt;
  S.nextSpawn += dt;
  S.lastWorkTick += dt;
  S.queue.forEach((a) => { a.born += dt; });
}

function resumePlay() {
  if (!S.paused || S.pauseKind === "interrupt") return;
  applyPauseOffset(performance.now() - S.pauseAt);
  S.paused = false;
  S.pauseKind = null;
  hideModal();
  els.card.className = "";
  els.modal.classList.remove("interrupt-open");
  hud(advanceWork);
  queueSave();
}

function pause() {
  if (!S.running) return;
  if (S.pauseKind === "interrupt") {
    toast("Handle the urgent popup first");
    tone(220, 0.06);
    return;
  }
  if (S.pauseKind === "brief") return;
  if (S.paused) {
    resumePlay();
    return;
  }
  S.paused = true;
  S.pauseKind = "break";
  S.pauseAt = performance.now();
  saveSession();
  els.card.className = "";
  els.card.innerHTML = `
    <h2>On break</h2>
    <p>The queue is frozen. Wall clock and alerts resume when you return.</p>
    <div class="btns">
      <button class="pri" id="resume">Back on console</button>
      <button id="leave">Save & leave</button>
      <button id="bail">End day</button>
    </div>`;
  els.modal.hidden = false;
  $("resume").onclick = resumePlay;
  $("leave").onclick = () => { hideModal(); leaveDesk(); };
  $("bail").onclick = () => { hideModal(); endShift(); };
  hud(advanceWork);
}

function hydrateAlert(raw, now) {
  const sourceId = raw.sourceId || raw.source?.id || "siem";
  return {
    id: raw.id,
    key: raw.key,
    title: raw.title,
    source: SOURCES[sourceId] || SOURCES.siem,
    host: raw.host,
    sev: raw.sev,
    chain: raw.chain || [],
    rems: Array.isArray(raw.rems) ? [...raw.rems] : [],
    disp: raw.disp,
    rule: raw.rule,
    stream: raw.stream || [],
    teach: raw.teach || {},
    born: now - Math.max(0, raw.ageMs || 0),
    wait: raw.wait || PATIENCE,
    strikes: raw.strikes || 0,
    isReturn: !!raw.isReturn,
    generation: raw.generation || 0,
    returnFrom: raw.returnFrom || null,
    returnReason: raw.returnReason || null,
    fromComms: !!raw.fromComms,
    noise: !!raw.noise,
    pivots: raw.pivots || pivotsFor(raw.key, (raw.stream || []).length),
    edr: {
      ...emptyEdrState(),
      ...(raw.edr || {}),
      iocSearched: { ...(raw.edr?.iocSearched || {}) },
    },
  };
}

function hydrateComm(raw) {
  const fromId = raw.fromId || raw.from?.id || "helpdesk";
  return {
    id: raw.id,
    tplId: raw.tplId,
    from: COMM_SENDERS[fromId] || COMM_SENDERS.helpdesk,
    subject: raw.subject,
    body: raw.body,
    replies: raw.replies || [],
    bornMin: raw.bornMin,
    staleMin: raw.staleMin,
    resolved: !!raw.resolved,
    staled: !!raw.staled,
    effect: raw.effect,
    messages: raw.messages || [],
  };
}

function applySession(data) {
  const now = performance.now();
  S.muted = !!data.muted;
  S.tutorial = !!data.tutorial;
  S.firstDone = !!data.firstDone;
  S.combo = data.combo || 0;
  S.closed = data.closed || 0;
  S.stars = data.stars ?? 5;
  S.reviews = data.reviews || 0;
  S.contained = data.contained || 0;
  S.breached = data.breached || 0;
  S.rejected = data.rejected || 0;
  S.focus = data.focus ?? null;
  S.ticket = data.ticket || null;
  S.alertUid = data.alertUid || 1;
  S.recent = Array.isArray(data.recent) ? [...data.recent] : [];
  S.pending = Array.isArray(data.pending) ? data.pending.map((p) => ({ ...p })) : [];
  S.workMin = data.workMin ?? DAY_START_MIN;
  S.dayN = data.dayN || 1;
  S.eodShown = !!data.eodShown;
  S.draft = data.draft
    ? {
        name: data.draft.name || "",
        chain: [...(data.draft.chain || [])],
        remCats: [...(data.draft.remCats || [])],
        rems: [...(data.draft.rems || [])],
        disp: data.draft.disp ?? null,
      }
    : emptyDraft();
  S.editingId = data.editingId ?? null;
  S.queue = (data.queue || []).map((a) => hydrateAlert(a, now));
  S.t0 = now - Math.max(0, data.elapsedMs || 0);
  S.now = now;
  S.nextSpawn = now + Math.max(0, data.nextSpawnIn ?? TUTORIAL_SPAWN);
  S.lastWorkTick = now - Math.max(0, data.lastWorkAge || 0);
  S.qSig = "";
  S.comms = (data.comms || []).map(hydrateComm);
  S.commsSeen = new Set(data.commsSeen || []);
  S.commsFocus = data.commsFocus ?? null;
  S.commsUid = data.commsUid || 1;
  S.commsOk = data.commsOk || 0;
  S.commsBad = data.commsBad || 0;
  S.nextCommAt = data.nextCommAt ?? (S.workMin + 18);
  S.interruptSeen = new Set(data.interruptSeen || []);
  S.nextInterruptAt = data.nextInterruptAt ?? firstInterruptAt(S.workMin);
  S.interrupt = data.interrupt?.id ? { id: data.interrupt.id, shownAt: data.interrupt.shownAt || S.workMin } : null;
  S.pauseKind = null;
  setTab(data.tab || "console");
}

export function refreshSplash() {
  const saved = peekSession();
  const start = $("btn-start");
  const cont = $("btn-continue");
  const neu = $("btn-new");
  const meta = $("session-meta");
  if (cont) cont.hidden = !saved;
  if (neu) neu.hidden = !saved;
  if (start) start.hidden = !!saved;
  if (meta) {
    if (saved) {
      meta.hidden = false;
      meta.textContent = `Saved Day ${saved.dayN || 1} · ${fmtWork(saved.workMin ?? DAY_START_MIN)} · ${saved.closed || 0} closed`;
    } else {
      meta.hidden = true;
      meta.textContent = "";
    }
  }
}

/** Park the shift on splash; progress stays in localStorage. */
export function leaveDesk() {
  if (!S.running) return;
  saveSession();
  S.running = false;
  S.paused = false;
  S.pauseKind = null;
  cancelAnimationFrame(S.raf);
  clearInterruptModal();
  hideModal();
  els.shift.hidden = true;
  els.splash.hidden = false;
  refreshSplash();
  toast("Progress saved — continue anytime", "good");
}

export function resumeShift() {
  const data = peekSession();
  if (!data) {
    toast("No saved shift");
    refreshSplash();
    return;
  }
  clearInterruptModal();
  hideModal();
  applySession(data);
  S.running = true;
  S.paused = false;
  S.pauseKind = null;
  els.splash.hidden = true;
  els.shift.hidden = false;
  doPaint();
  if (S.tab === "playbooks") renderPlaybooks();
  if (S.tab === "comms") renderComms();
  updateCommsBadge();
  cancelAnimationFrame(S.raf);
  S.raf = requestAnimationFrame(tick);
  tone(520, 0.1);
  toast(`Resumed · Day ${S.dayN} · ${fmtWork(S.workMin)}`, "good");
  if (S.interrupt?.id) reshowInterruptIfNeeded();
  else hud(advanceWork);
}

function showMorningBrief() {
  els.card.className = "";
  els.card.innerHTML = `
    <h2>Morning brief</h2>
    <p class="brief-lead">Day ${S.dayN} · you are Tier-1 on the console.</p>
    <div class="how">
      <div><i>1</i><div><b>Alert queue</b><span>Correlations land from SIEM, EDR, mail, IdP. Up to three wait at once.</span></div></div>
      <div><i>2</i><div><b>Claim & investigate</b><span>Read the stream, Hunt pivot, and EDR. Urgent floor popups can freeze the desk until you answer.</span></div></div>
      <div><i>3</i><div><b>Answer Comms</b><span>Helpdesk, users, IR, and your manager will ping. Bad replies can quietly make threats worse.</span></div></div>
    </div>
    <p>Wall clock runs 08:00–16:00. Take a break anytime. End the day when you wrap.</p>
    <div class="btns"><button class="pri" id="gotit">Start triage</button></div>`;
  els.modal.hidden = false;
  S.paused = true;
  S.pauseKind = "brief";
  S.pauseAt = performance.now();
  $("gotit").onclick = () => {
    applyPauseOffset(performance.now() - S.pauseAt);
    S.paused = false;
    S.pauseKind = null;
    hideModal();
    hud(advanceWork);
    queueSave();
  };
}

export function startShift() {
  clearSession();
  hideModal();
  S.running = true;
  S.paused = false;
  S.tutorial = true;
  S.firstDone = false;
  S.combo = 0;
  S.closed = 0;
  S.stars = 5;
  S.reviews = 0;
  S.contained = 0;
  S.breached = 0;
  S.rejected = 0;
  S.queue = [];
  S.focus = null;
  S.ticket = null;
  S.qSig = "";
  S.recent = [];
  S.pending = [];
  resetComms();
  resetInterrupts();
  S.workMin = DAY_START_MIN;
  S.eodShown = false;
  S.draft = emptyDraft();
  S.editingId = null;
  setTab("console");
  els.splash.hidden = true;
  els.shift.hidden = false;
  S.t0 = performance.now();
  S.now = S.t0;
  S.lastWorkTick = S.t0;
  spawn("invoice-portal");
  S.nextSpawn = S.now + TUTORIAL_SPAWN;
  S.nextInterruptAt = firstInterruptAt(S.workMin);
  doPaint();
  cancelAnimationFrame(S.raf);
  S.raf = requestAnimationFrame(tick);
  tone(520, 0.1);
  showMorningBrief();
}

export function endShift() {
  clearSession();
  S.running = false;
  S.pauseKind = null;
  S.interrupt = null;
  cancelAnimationFrame(S.raf);
  clearInterruptModal();
  S.ticket = null;
  doPaint();
  const grade = S.contained >= 8 && S.stars >= 4 ? "Solid day. Handoff looks clean."
    : S.contained >= 5 ? "You held the queue. A few tickets went sideways."
    : S.contained >= 2 ? "Rough console day. Review the misses with your lead."
    : "Queue won today. Clock in again and rebuild the muscle.";
  const esc = S.breached + S.rejected;
  els.card.innerHTML = `
    <h2>End of day report</h2>
    <p>${grade}</p>
    <div class="kpis">
      <div><b>${S.closed}</b><small>cases closed</small></div>
      <div><b>${esc}</b><small>mishandled</small></div>
      <div><b>${S.commsOk}/${S.commsOk + S.commsBad}</b><small>comms ok</small></div>
      <div><b>${S.stars.toFixed(1)}</b><small>mgr rating</small></div>
    </div>
    <p>Signed off at <b style="color:var(--amber)">${fmtWork(S.workMin)}</b> · Day ${S.dayN}</p>
    <div class="btns">
      <button class="pri" id="again">Clock in tomorrow</button>
      <button id="home">Leave desk</button>
    </div>`;
  els.modal.hidden = false;
  $("again").onclick = () => {
    S.dayN += 1;
    startShift();
  };
  $("home").onclick = () => {
    hideModal();
    els.shift.hidden = true;
    els.splash.hidden = false;
    refreshSplash();
  };
}

export function showHow() {
  els.card.innerHTML = `
    <h2>How a day works</h2>
    <div class="how">
      <div><i>1</i><div><b>Clock in</b><span>You are Tier-1. Alerts land as SIEM correlations — a stream of events, not a single popup.</span></div></div>
      <div><i>2</i><div><b>Build playbooks</b><span>On the Playbooks tab, name a book and select attack-chain steps, remediation, and disposition.</span></div></div>
      <div><i>3</i><div><b>Claim & apply</b><span>On Console, claim a ticket, read Hunt pivots / EDR timeline, then apply a playbook. Isolate or kill only when the host is the patient.</span></div></div>
      <div><i>4</i><div><b>Submit the case</b><span>Apply the right playbook. Misses aren’t always obvious — unfinished threats can return later as a worse alert.</span></div></div>
      <div><i>5</i><div><b>Comms tab</b><span>Reply to helpdesk, users, IR, and manager pings. A bad all-clear can bring a threat back.</span></div></div>
    </div>
    <p>Discard resets a bad draft. Wall clock is atmospheric for now — SLA timers stay off until you re-enable them.</p>
    <div class="btns"><button class="pri" id="gotit">Got it</button></div>`;
  els.modal.hidden = false;
  $("gotit").onclick = hideModal;
}

export function wireShift() {
  loadPlaybooks();
  initPlaybooks({
    toast,
    tone,
    onChange: () => {
      if (S.tab === "console") doPaint();
      else queueSave();
    },
  });
  initComms({
    toast,
    tone,
    rate,
    scheduleReturnByKey,
    onPaint: () => {
      if (S.tab === "console") doPaint();
      else {
        hud(advanceWork);
        queueSave();
      }
    },
  });

  refreshSplash();

  $("btn-start").onclick = () => {
    ensureAudio();
    startShift();
  };
  $("btn-continue")?.addEventListener("click", () => {
    ensureAudio();
    resumeShift();
  });
  $("btn-new")?.addEventListener("click", () => {
    ensureAudio();
    if (hasSession() && !confirm("Start a new day? Saved progress will be discarded.")) return;
    clearSession();
    startShift();
  });
  $("btn-how").onclick = showHow;
  $("btn-pause").onclick = pause;
  $("btn-mute").onclick = () => {
    S.muted = !S.muted;
    hud(advanceWork);
    queueSave();
  };
  $("btn-open").onclick = openTicket;
  $("btn-push").onclick = push;
  $("btn-dump").onclick = dump;

  els.tabConsole.onclick = () => {
    setTab("console");
    doPaint();
  };
  els.tabPlaybooks.onclick = () => {
    setTab("playbooks");
    renderPlaybooks();
    hud(advanceWork);
    queueSave();
  };
  els.tabComms.onclick = () => {
    setTab("comms");
    renderComms();
    updateCommsBadge();
    hud(advanceWork);
    queueSave();
  };

  els.queue.addEventListener("click", (e) => {
    const b = e.target.closest(".evt");
    if (!b) return;
    S.focus = Number(b.dataset.id);
    doPaint();
  });

  els.edrPanel?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-edr]");
    if (!btn || btn.disabled) return;
    doEdrAction(btn.dataset.edr, btn.dataset.ioc);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && S.running) {
      if (S.pauseKind === "interrupt") {
        toast("Handle the urgent popup first");
        return;
      }
      pause();
    }
  });

  window.addEventListener("pagehide", () => {
    if (S.running) saveSession();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && S.running) saveSession();
  });
}
