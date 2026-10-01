/**
 * Handoff queue — escalate or accept Tier-2 / IR asks with a short checklist.
 * Wrong handoff hurts manager score like bad Comms.
 */

import {
  HANDOFF_SENDERS, HANDOFF_SPAWN_GAP_MIN, HANDOFF_STALE_MIN, HANDOFF_TEMPLATES,
} from "./handoffs-data.js";
import { S } from "./state.js";
import { fmtWork, pick, $ } from "./util.js";

let toastFn = () => {};
let toneFn = () => {};
let rateFn = () => {};
let returnFn = () => {};
let onChange = () => {};

export function initHandoffs({ toast, tone, rate, scheduleReturnByKey, onPaint }) {
  toastFn = toast;
  toneFn = tone;
  rateFn = rate;
  returnFn = scheduleReturnByKey;
  onChange = onPaint || (() => {});

  const list = $("handoff-list");
  const detail = $("handoff-detail");
  if (list && !list.dataset.wired) {
    list.dataset.wired = "1";
    list.addEventListener("click", (e) => {
      const row = e.target.closest("[data-focus]");
      if (!row || !list.contains(row)) return;
      S.handoffFocus = Number(row.dataset.focus);
      renderHandoffs();
    });
  }
  if (detail && !detail.dataset.wired) {
    detail.dataset.wired = "1";
    detail.addEventListener("change", (e) => {
      const input = e.target.closest("input[data-check]");
      if (!input || !detail.contains(input)) return;
      toggleCheck(Number(input.dataset.ho), input.dataset.check, input.checked);
    });
    detail.addEventListener("click", (e) => {
      const act = e.target.closest("[data-ho-act]");
      if (!act || !detail.contains(act)) return;
      e.preventDefault();
      resolveHandoff(Number(act.dataset.ho), act.dataset.hoAct);
    });
  }
}

export function resetHandoffs() {
  S.handoffs = [];
  S.handoffSeen = new Set();
  S.handoffFocus = null;
  S.handoffOk = 0;
  S.handoffBad = 0;
  S.nextHandoffAt = S.workMin + 26;
  updateHandoffBadge();
}

function openCount() {
  return S.handoffs.filter((h) => !h.resolved).length;
}

export function updateHandoffBadge() {
  const badge = $("handoff-badge");
  if (!badge) return;
  const n = openCount();
  badge.hidden = n === 0;
  badge.textContent = String(n);
}

function makeHandoff(tpl) {
  const checks = {};
  for (const c of tpl.checklist || []) checks[c.id] = false;
  return {
    id: S.handoffUid++,
    tplId: tpl.id,
    from: HANDOFF_SENDERS[tpl.from] || HANDOFF_SENDERS.tier2,
    tag: tpl.tag || "Handoff",
    title: tpl.title,
    body: tpl.body,
    checklist: (tpl.checklist || []).map((c) => ({ ...c })),
    correctAction: tpl.correctAction,
    accept: tpl.accept || {},
    escalate: tpl.escalate || {},
    wrong: tpl.wrong || {},
    checks,
    bornMin: S.workMin,
    staleMin: S.workMin + HANDOFF_STALE_MIN,
    resolved: false,
    effect: null,
    chosen: null,
  };
}

export function maybeSpawnHandoff() {
  if (!S.running || S.paused) return;
  if (S.workMin < S.nextHandoffAt) return;
  if (openCount() >= 2) {
    S.nextHandoffAt = S.workMin + 10;
    return;
  }
  const eligible = HANDOFF_TEMPLATES.filter((t) => {
    if (S.handoffSeen.has(t.id)) return false;
    if ((t.needClosed || 0) > S.closed) return false;
    return true;
  });
  if (!eligible.length) {
    S.nextHandoffAt = S.workMin + HANDOFF_SPAWN_GAP_MIN;
    return;
  }
  const tpl = pick(eligible);
  const item = makeHandoff(tpl);
  S.handoffs.unshift(item);
  S.handoffSeen.add(tpl.id);
  S.handoffFocus = item.id;
  S.nextHandoffAt = S.workMin + HANDOFF_SPAWN_GAP_MIN + Math.floor(Math.random() * 12);
  toastFn(`Handoff: ${item.from.label} — ${item.title}`);
  toneFn(380, 0.07, "triangle", 0.03);
  updateHandoffBadge();
  if (S.tab === "handoffs") renderHandoffs();
}

export function flushStaleHandoffs() {
  if (!S.running || S.paused) return;
  let changed = false;
  for (const h of S.handoffs) {
    if (h.resolved || h.staled) continue;
    if (S.workMin < h.staleMin) continue;
    h.staled = true;
    h.resolved = true;
    h.effect = "stale";
    S.handoffBad += 1;
    rateFn(-0.35);
    toastFn(`Handoff timed out: ${h.title}`, "bad");
    toneFn(160, 0.12, "sawtooth", 0.04);
    changed = true;
  }
  if (changed) {
    updateHandoffBadge();
    if (S.tab === "handoffs") renderHandoffs();
  }
}

function toggleCheck(hoId, checkId, forced) {
  const h = S.handoffs.find((x) => x.id === hoId);
  if (!h || h.resolved) return;
  if (!h.checks) h.checks = {};
  h.checks[checkId] = typeof forced === "boolean" ? forced : !h.checks[checkId];
  renderHandoffs();
}

function checklistGrade(h) {
  let missing = 0;
  let traps = 0;
  for (const c of h.checklist || []) {
    const on = !!h.checks?.[c.id];
    if (c.need && !on) missing += 1;
    if (c.trap && on) traps += 1;
  }
  return { missing, traps, clean: missing === 0 && traps === 0 };
}

function applyOutcome(h, pack, effect) {
  const attackKey = pack.attackKey;
  if (attackKey && (effect === "bad" || effect === "soft")) {
    returnFn(attackKey, pack.returnReason || "Handoff decision made it worse", {
      direct: true,
      fromComms: true,
      delayMin: pack.delayMin || 14,
      fromTitle: h.title,
    });
  }
  if (typeof pack.rate === "number") rateFn(pack.rate);
}

export function resolveHandoff(hoId, action) {
  const h = S.handoffs.find((x) => x.id === hoId);
  if (!h || h.resolved) return;
  if (action !== "accept" && action !== "escalate") return;

  const grade = checklistGrade(h);
  const correct = action === h.correctAction;
  h.resolved = true;
  h.chosen = action;

  if (correct && grade.clean) {
    h.effect = "good";
    S.handoffOk += 1;
    const pack = action === "accept" ? h.accept : h.escalate;
    applyOutcome(h, pack, "good");
    if (typeof pack.rate !== "number") rateFn(0.14);
    toastFn("Handoff clean — checklist held", "good");
    toneFn(620, 0.08);
  } else if (correct && !grade.clean) {
    h.effect = "soft";
    S.handoffBad += 1;
    rateFn(-0.2);
    toastFn(grade.traps ? "Action ok, but checklist had a trap checked" : "Action ok — checklist incomplete");
    toneFn(300, 0.08);
  } else {
    // Wrong accept/escalate
    const pack = h.wrong?.attackKey
      ? h.wrong
      : (action === "accept" ? h.accept : h.escalate);
    const effect = pack.effect || h.wrong?.effect || "bad";
    h.effect = effect;
    S.handoffBad += 1;
    applyOutcome(h, { ...h.wrong, ...pack, rate: pack.rate ?? h.wrong?.rate ?? -0.55 }, effect);
    if (effect === "bad" && (pack.attackKey || h.wrong?.attackKey)) {
      toastFn("Handoff sent — that may come back");
      toneFn(240, 0.08);
    } else {
      toastFn("Wrong handoff call", "bad");
      toneFn(180, 0.1, "sawtooth", 0.04);
    }
  }

  updateHandoffBadge();
  renderHandoffs();
  onChange();
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[ch]);
}

function renderDetail(h) {
  const checks = (h.checklist || []).map((c) => {
    const on = !!h.checks?.[c.id];
    const disabled = h.resolved ? "disabled" : "";
    return `
      <label class="ho-check${on ? " on" : ""}${h.resolved ? " locked" : ""}">
        <input type="checkbox" data-ho="${h.id}" data-check="${escapeHtml(c.id)}" ${on ? "checked" : ""} ${disabled}>
        <span>${escapeHtml(c.text)}</span>
      </label>`;
  }).join("");

  const actions = h.resolved
    ? `<div class="ho-actions done"><span>${
      h.effect === "stale" ? "Timed out — no decision."
        : h.effect === "good" ? "Closed clean."
          : h.effect === "soft" ? "Closed — manager noted gaps."
            : "Closed — handoff call was off."
    }</span></div>`
    : `<div class="ho-actions">
        <button type="button" class="ho-act accept" data-ho="${h.id}" data-ho-act="accept">Accept · Tier-1 owns</button>
        <button type="button" class="ho-act escalate" data-ho="${h.id}" data-ho-act="escalate">Escalate to IR</button>
      </div>`;

  return `
    <div class="ho-top">
      <span class="comm-from" style="--h:${h.from.hue}">${escapeHtml(h.from.short)}</span>
      <div class="ho-top-meta">
        <div class="ho-top-name">${escapeHtml(h.from.label)} · ${escapeHtml(h.tag)}</div>
        <div class="ho-top-title">${escapeHtml(h.title)}</div>
      </div>
      ${h.resolved ? "" : `<span class="ho-live">Open</span>`}
    </div>
    <p class="ho-body">${escapeHtml(h.body)}</p>
    <div class="ho-check-label">Checklist <span>confirm before you decide</span></div>
    <div class="ho-checklist">${checks}</div>
    ${actions}`;
}

export function renderHandoffs() {
  const list = $("handoff-list");
  const detail = $("handoff-detail");
  if (!list || !detail) return;

  if (!S.handoffs.length) {
    list.innerHTML = `<p class="pb-empty">No handoffs yet. Tier-2 and IR will ping when they need you to accept or escalate.</p>`;
    detail.className = "ho-pane empty";
    detail.innerHTML = `<div class="chat-empty"><p>Pick a handoff<br><span>or wait for the next ask</span></p></div>`;
    updateHandoffBadge();
    return;
  }

  if (!S.handoffFocus || !S.handoffs.some((h) => h.id === S.handoffFocus)) {
    S.handoffFocus = S.handoffs.find((h) => !h.resolved)?.id ?? S.handoffs[0].id;
  }

  list.innerHTML = S.handoffs.map((h) => {
    const on = h.id === S.handoffFocus ? " on" : "";
    const done = h.resolved ? " done" : " unread";
    return `
      <button type="button" class="chat-list-item${on}${done}" data-focus="${h.id}">
        <div class="chat-list-top">
          <span class="nm">${escapeHtml(h.from.label)}</span>
          <span class="tm">${fmtWork(h.bornMin)}</span>
        </div>
        <div class="chat-list-meta">
          <span class="topic">${escapeHtml(h.tag)}</span>
          <span class="preview">${escapeHtml(h.title)}</span>
        </div>
      </button>`;
  }).join("");

  const cur = S.handoffs.find((h) => h.id === S.handoffFocus);
  detail.className = "ho-pane";
  detail.innerHTML = cur ? renderDetail(cur) : "";
  updateHandoffBadge();
}
