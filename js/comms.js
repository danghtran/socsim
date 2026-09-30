import { COMM_SENDERS, COMM_SPAWN_GAP_MIN, COMM_STALE_MIN, COMM_TEMPLATES } from "./comms-data.js";
import { S } from "./state.js";
import { fmtWork, pick, $ } from "./util.js";

let toastFn = () => {};
let toneFn = () => {};
let rateFn = () => {};
let returnFn = () => {};
let onChange = () => {};

export function initComms({ toast, tone, rate, scheduleReturnByKey, onPaint }) {
  toastFn = toast;
  toneFn = tone;
  rateFn = rate;
  returnFn = scheduleReturnByKey;
  onChange = onPaint || (() => {});

  const list = $("comms-list");
  const detail = $("comms-detail");
  if (list && !list.dataset.wired) {
    list.dataset.wired = "1";
    list.addEventListener("click", (e) => {
      const row = e.target.closest("[data-focus]");
      if (!row || !list.contains(row)) return;
      S.commsFocus = Number(row.dataset.focus);
      renderComms();
    });
  }
  if (detail && !detail.dataset.wired) {
    detail.dataset.wired = "1";
    detail.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-reply]");
      if (!btn || !detail.contains(btn)) return;
      e.preventDefault();
      replyComm(Number(btn.dataset.comm), btn.dataset.reply);
    });
  }
}

export function resetComms() {
  S.comms = [];
  S.commsSeen = new Set();
  S.commsFocus = null;
  S.commsOk = 0;
  S.commsBad = 0;
  S.nextCommAt = S.workMin + 18;
  updateCommsBadge();
}

function openCount() {
  return S.comms.filter((c) => !c.resolved).length;
}

export function updateCommsBadge() {
  const badge = $("comms-badge");
  if (!badge) return;
  const n = openCount();
  badge.hidden = n === 0;
  badge.textContent = String(n);
}

function makeComm(tpl) {
  return {
    id: S.commsUid++,
    tplId: tpl.id,
    from: COMM_SENDERS[tpl.from] || COMM_SENDERS.helpdesk,
    subject: tpl.subject,
    body: tpl.body,
    replies: tpl.replies,
    bornMin: S.workMin,
    staleMin: S.workMin + COMM_STALE_MIN,
    resolved: false,
    effect: null,
    messages: [
      { who: "system", text: `Opened · ${fmtWork(S.workMin)}`, at: S.workMin },
      { who: "them", text: tpl.body, at: S.workMin },
    ],
  };
}

export function maybeSpawnComm() {
  if (!S.running || S.paused) return;
  if (S.workMin < S.nextCommAt) return;
  if (openCount() >= 2) {
    S.nextCommAt = S.workMin + 8;
    return;
  }
  const eligible = COMM_TEMPLATES.filter((t) => {
    if (S.commsSeen.has(t.id)) return false;
    if ((t.needClosed || 0) > S.closed) return false;
    return true;
  });
  if (!eligible.length) {
    S.nextCommAt = S.workMin + COMM_SPAWN_GAP_MIN;
    return;
  }
  const tpl = pick(eligible);
  const msg = makeComm(tpl);
  S.comms.unshift(msg);
  S.commsSeen.add(tpl.id);
  S.commsFocus = msg.id;
  S.nextCommAt = S.workMin + COMM_SPAWN_GAP_MIN + Math.floor(Math.random() * 10);
  toastFn(`Comms: ${msg.from.label} — ${msg.subject}`);
  toneFn(400, 0.07, "triangle", 0.03);
  updateCommsBadge();
  if (S.tab === "comms") renderComms();
}

export function flushStaleComms() {
  if (!S.running || S.paused) return;
  let changed = false;
  for (const c of S.comms) {
    if (c.resolved || c.staled) continue;
    if (S.workMin < c.staleMin) continue;
    c.staled = true;
    c.resolved = true;
    c.effect = "stale";
    c.messages.push({
      who: "system",
      text: `No reply · timed out · ${fmtWork(S.workMin)}`,
      at: S.workMin,
    });
    S.commsBad += 1;
    rateFn(-0.35);
    toastFn(`Comms timed out: ${c.subject}`, "bad");
    toneFn(160, 0.12, "sawtooth", 0.04);
    changed = true;
  }
  if (changed) {
    updateCommsBadge();
    if (S.tab === "comms") renderComms();
  }
}

export function replyComm(commId, replyId) {
  const c = S.comms.find((x) => x.id === commId);
  if (!c || c.resolved) return;
  const rep = c.replies.find((r) => r.id === replyId);
  if (!rep) return;
  c.resolved = true;
  c.effect = rep.effect;
  c.chosen = rep.id;
  c.messages.push({ who: "you", text: rep.text, at: S.workMin });

  if (rep.ack) {
    c.messages.push({ who: "them", text: rep.ack, at: S.workMin });
  }

  const attackKey = rep.attackKey || rep.returnKey;
  if (attackKey && (rep.effect === "bad" || rep.effect === "soft")) {
    const scheduled = returnFn(attackKey, rep.returnReason || "Bad desk guidance let the attack continue", {
      direct: true,
      fromComms: true,
      delayMin: rep.delayMin || 14,
      fromTitle: c.subject,
    });
    if (scheduled) {
      c.messages.push({
        who: "system",
        text: `Thread closed · ${fmtWork(S.workMin)}`,
        at: S.workMin,
      });
      c.attackPending = true;
    } else {
      c.messages.push({
        who: "system",
        text: `You replied · ${fmtWork(S.workMin)}`,
        at: S.workMin,
      });
    }
  } else {
    c.messages.push({
      who: "system",
      text: `You replied · ${fmtWork(S.workMin)}`,
      at: S.workMin,
    });
  }

  if (rep.effect === "good") {
    S.commsOk += 1;
    rateFn(rep.rate ?? 0.12);
    toastFn("Reply sent — tone looks right", "good");
    toneFn(620, 0.08);
  } else if (rep.effect === "soft" && !attackKey) {
    S.commsBad += 1;
    rateFn(rep.rate ?? -0.15);
    toastFn("Reply sent — a bit off, but noted");
    toneFn(300, 0.08);
  } else if (rep.effect === "soft" || rep.effect === "bad") {
    // Silent close — consequence arrives later as a console RETURN
    S.commsBad += 1;
    rateFn(rep.rate ?? -0.6);
    toastFn("Reply sent");
    toneFn(240, 0.08);
  }
  updateCommsBadge();
  renderComms();
  onChange();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[ch]);
}

function previewText(c) {
  const last = [...(c.messages || [])].reverse().find((m) => m.who !== "system");
  return last?.text || c.body || "";
}

function renderThread(c) {
  const msgs = (c.messages || []).map((m) => {
    if (m.who === "system") {
      return `<div class="chat-sys">${escapeHtml(m.text)}</div>`;
    }
    if (m.who === "you") {
      return `
        <div class="chat-row you">
          <div class="chat-bubble you">
            <div class="chat-name">You · Tier-1</div>
            <div class="chat-text">${escapeHtml(m.text)}</div>
          </div>
        </div>`;
    }
    return `
      <div class="chat-row them">
        <span class="comm-from chat-av" style="--h:${c.from.hue}">${escapeHtml(c.from.short)}</span>
        <div class="chat-bubble them">
          <div class="chat-name">${escapeHtml(c.from.label)}</div>
          <div class="chat-text">${escapeHtml(m.text)}</div>
        </div>
      </div>`;
  }).join("");

  const composer = c.resolved
    ? `<div class="chat-composer done"><span>${c.effect === "stale" ? "Thread timed out — no reply sent." : "Reply sent. Thread closed."}</span></div>`
    : `<div class="chat-composer">
        <div class="chat-composer-label">Suggested replies</div>
        <div class="chat-suggestions">
          ${c.replies.map((r) => `
            <button type="button" class="chat-suggest" data-comm="${c.id}" data-reply="${r.id}">
              ${escapeHtml(r.text)}
            </button>`).join("")}
        </div>
      </div>`;

  return `
    <header class="chat-top">
      <span class="comm-from" style="--h:${c.from.hue}">${escapeHtml(c.from.short)}</span>
      <div class="chat-top-meta">
        <div class="chat-top-name">${escapeHtml(c.from.label)}</div>
        <div class="chat-top-topic">${escapeHtml(c.subject)}</div>
      </div>
      ${c.resolved ? "" : `<span class="chat-live">live</span>`}
    </header>
    <div class="chat-thread" id="chat-thread">${msgs}</div>
    ${composer}`;
}

export function renderComms() {
  const list = $("comms-list");
  const detail = $("comms-detail");
  if (!list || !detail) return;

  const open = S.comms.filter((c) => !c.resolved);
  const done = S.comms.filter((c) => c.resolved).slice(0, 8);

  if (!S.comms.length) {
    list.innerHTML = `<p class="pb-empty">No chats yet. Helpdesk, users, IR, and your manager will message the desk as the day runs.</p>`;
  } else {
    list.innerHTML = [
      ...open.map((c) => commRow(c, true)),
      ...done.map((c) => commRow(c, false)),
    ].join("");
  }

  const focus = S.comms.find((c) => c.id === S.commsFocus) || open[0] || done[0] || null;
  if (!focus) {
    detail.className = "chat-pane empty";
    detail.innerHTML = `<div class="chat-empty"><p>Pick a conversation<br><span>or wait for the next ping</span></p></div>`;
  } else {
    detail.className = "chat-pane";
    detail.innerHTML = renderThread(focus);
    const thread = detail.querySelector("#chat-thread");
    if (thread) thread.scrollTop = thread.scrollHeight;
  }

  updateCommsBadge();
}

function commRow(c, unreadStyle) {
  const preview = previewText(c);
  return `
    <button type="button" class="chat-list-item ${S.commsFocus === c.id ? "on" : ""} ${c.resolved ? "done" : ""} ${unreadStyle && !c.resolved ? "unread" : ""}" data-focus="${c.id}">
      <span class="comm-from" style="--h:${c.from.hue}">${escapeHtml(c.from.short)}</span>
      <span class="chat-list-meta">
        <span class="chat-list-top">
          <span class="nm">${escapeHtml(c.from.label)}</span>
          <span class="tm">${fmtWork(c.bornMin)}</span>
        </span>
        <span class="topic">${escapeHtml(c.subject)}</span>
        <span class="preview">${escapeHtml(preview)}</span>
      </span>
    </button>`;
}
