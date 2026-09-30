import {
  DAY_END_MIN, DISPS, MAX_Q, TIMING, SHIFT_MS, WORK_IDLE_SCALE,
} from "./constants.js";
import { edrPanelHtml } from "./edr.js";
import { renderPlaybookPicker } from "./playbooks.js";
import { S, getPlaybook } from "./state.js";
import { $, chainLabel, fmt, fmtWork, remLabel, starGlyph } from "./util.js";
import { tone } from "./audio.js";

export const els = {
  splash: null,
  shift: null,
  queue: null,
  brief: null,
  work: null,
  edrPanel: null,
  hint: null,
  toast: null,
  modal: null,
  card: null,
  rep: null,
  stars: null,
  starN: null,
  clock: null,
  dayLabel: null,
  tag: null,
  mute: null,
  pbPicker: null,
  tabConsole: null,
  tabPlaybooks: null,
  tabComms: null,
  panelConsole: null,
  panelPlaybooks: null,
  panelComms: null,
};

export function bindEls() {
  els.splash = $("splash");
  els.shift = $("shift");
  els.queue = $("queue");
  els.brief = $("brief");
  els.work = $("work");
  els.edrPanel = $("edr-panel");
  els.hint = $("hint");
  els.toast = $("toast");
  els.modal = $("modal");
  els.card = $("card");
  els.rep = $("rep");
  els.stars = $("stars");
  els.starN = $("star-n");
  els.clock = $("clock");
  els.dayLabel = $("day-label");
  els.tag = $("shift-tag");
  els.mute = $("btn-mute");
  els.pbPicker = $("pb-picker");
  els.tabConsole = $("tab-console");
  els.tabPlaybooks = $("tab-playbooks");
  els.tabComms = $("tab-comms");
  els.panelConsole = $("panel-console");
  els.panelPlaybooks = $("panel-playbooks");
  els.panelComms = $("panel-comms");
}

export function focused() {
  return S.queue.find((a) => a.id === S.focus) || S.queue[0] || null;
}

export function nextStep() {
  const a = focused();
  const t = S.ticket;
  if (!a) return { id: null, msg: "Queue is clear. Stay on console." };
  if (!t) return { id: "btn-open", msg: "Claim the focused alert to open a ticket." };
  if (!t.playbookId) {
    if (a.noise) return { id: null, msg: "Stream may be noise — use an FP/benign playbook if evidence says so." };
    return { id: null, msg: "Apply a playbook from your library." };
  }
  return { id: "btn-push", msg: "Disposition looks complete — submit the case." };
}

function slaLeft(a) {
  if (!TIMING) return 1;
  return Math.max(0, Math.min(1, 1 - (S.now - a.born) / a.wait));
}

function slaColor(left) {
  if (left > 0.45) return "#3ecf8e";
  if (left > 0.22) return "#f5c542";
  return "#ff5d8f";
}

/** Fill / accent for the queue circle by severity (L1–L3). */
function sevStyle(sev) {
  const n = Math.max(1, Math.min(3, sev || 1));
  if (n >= 3) return { fill: "#5a1830", ring: "#ff5d8f", tag: "#ff5d8f" };
  if (n === 2) return { fill: "#4a3810", ring: "#f5c542", tag: "#f5c542" };
  return { fill: "#0f3d48", ring: "#3ee0c5", tag: "#3ee0c5" };
}

function renderQueue() {
  const slots = [];
  for (let i = 0; i < MAX_Q; i++) {
    const a = S.queue[i];
    if (!a) {
      slots.push(`<div class="empty">empty</div>`);
      continue;
    }
    const left = slaLeft(a);
    const sev = sevStyle(a.sev);
    const ringColor = TIMING ? slaColor(left) : sev.ring;
    const r = 22;
    const c = 2 * Math.PI * r;
    const dash = `${c * left} ${c}`;
    const on = a.id === (focused()?.id);
    const bound = S.ticket && a.id === S.ticket.alertId;
    const angry = left < 0.22 ? " angry" : "";
    const ret = a.isReturn ? " return" : "";
    slots.push(`
      <button class="evt sev-${Math.max(1, Math.min(3, a.sev || 1))}${on ? " on" : ""}${bound ? " bound" : ""}${angry}${ret}" data-id="${a.id}">
        <span class="tag" style="background:${sev.tag};color:#071018">L${a.sev}${a.isReturn ? "↩" : ""}</span>
        <span class="ring">
          <svg class="pr" viewBox="0 0 54 54" aria-hidden="true">
            <circle class="sev-disk" cx="27" cy="27" r="16" fill="${sev.fill}" stroke="${sev.ring}" stroke-width="2"/>
            <circle cx="27" cy="27" r="${r}" fill="none" stroke="#1a3038" stroke-width="4"/>
            <circle cx="27" cy="27" r="${r}" fill="none" stroke="${ringColor}" stroke-width="4"
              stroke-dasharray="${dash}" stroke-linecap="round"/>
          </svg>
        </span>
        <span class="nm">${a.title}</span>
        <span class="src">${(a.stream || []).length} evts</span>
      </button>`);
  }
  els.queue.innerHTML = slots.join("");
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderStream(a) {
  const rows = (a.stream || []).map((e, i) => {
    const find = a.pivots?.[i] || "";
    return `
    <div class="siem">
      <span class="tm">${esc(e.t)}</span>
      <span class="ss">${esc(e.src)}</span>
      <span class="sv ${esc(e.sev)}">${esc(e.sev)}</span>
      <span class="rl">${esc(e.rule)}</span>
      <span class="mg">${esc(e.msg)}</span>
      <details class="siem-pivot">
        <summary>Hunt pivot</summary>
        <p>${esc(find)}</p>
      </details>
    </div>`;
  }).join("");
  const t = a.teach || {};
  return `
    <div class="siem-list">${rows}</div>
    <div class="desk">
      <div class="desk-h">Analyst note</div>
      <p><b>Chain.</b> ${t.chain || ""}</p>
      <p><b>Cut.</b> ${t.cut || ""}</p>
      <p><b>Close.</b> ${t.disp || ""}</p>
    </div>`;
}

function renderBrief() {
  const a = focused();
  if (!a) {
    els.brief.innerHTML = `<div class="idle">Queue clear. Waiting for the next correlation…</div>`;
    return;
  }
  const n = (a.stream || []).length;
  const retBanner = a.isReturn
    ? `<p class="return-banner"><b>${a.fromComms ? "After guidance." : "Return."}</b> ${a.returnFrom ? `From “${a.returnFrom}” — ` : ""}${a.returnReason || "threat progressed."}</p>`
    : "";
  els.brief.innerHTML = `
    <div class="hd">
      <span class="eid">CORR-${String(100 + a.id).slice(-3)}${a.isReturn ? " · RET" : ""}</span>
      <span class="src">${n} events · ${a.host}</span>
      <span class="lv">L${a.sev}</span>
    </div>
    <h3>${a.title}</h3>
    <p class="rule">${a.rule || "corr.unknown"}</p>
    ${retBanner}
    ${renderStream(a)}`;
}

function renderEdr() {
  if (!els.edrPanel) return;
  const t = S.ticket;
  const a = t ? S.queue.find((q) => q.id === t.alertId) : null;
  els.edrPanel.innerHTML = edrPanelHtml(a || null);
  els.edrPanel.classList.toggle("idle", !a);
}

function renderCase() {
  const t = S.ticket;
  if (!t) {
    els.work.innerHTML = `<p class="ph">No ticket claimed.<br>Claim the focused alert to start your investigation.</p>`;
    renderEdr();
    return;
  }
  const a = S.queue.find((q) => q.id === t.alertId);
  const pb = t.playbookId ? getPlaybook(t.playbookId) : null;
  const ready = !!(t.playbookId && t.chain.length && t.rems?.length && t.disp);
  const edrBits = [];
  if (a?.edr?.isolated) edrBits.push("isolated");
  if (a?.edr?.killed) edrBits.push("kill sent");
  if (a?.edr?.quarantined) edrBits.push("quarantined");
  const iocN = a?.edr?.iocSearched ? Object.keys(a.edr.iocSearched).length : 0;
  if (iocN) edrBits.push(`ioc×${iocN}`);
  els.work.innerHTML = `
    <div class="case">
      <div class="id">INC-${String(100 + t.alertId).slice(-3)}${a ? ` · ${a.title}` : " · stale"}</div>
      <div class="fields">
        <div class="wide"><em>playbook</em><b>${pb ? pb.name : "— not applied"}</b></div>
        <div class="wide"><em>attack chain</em><b>${chainLabel(t.chain)}</b></div>
        <div class="wide"><em>remediate</em><b>${remLabel(t.rems)}</b></div>
        <div><em>disposition</em><b>${t.disp ? DISPS[t.disp].label : "—"}</b></div>
        ${edrBits.length ? `<div class="wide"><em>EDR</em><b>${edrBits.join(" · ")}</b></div>` : ""}
      </div>
      <p class="meta">${a ? (ready ? "Ready to submit. Review is sealed until then." : nextStep().msg) : "Alert aged out. Discard this draft."}</p>
    </div>`;
  renderEdr();
}

function highlight() {
  document.querySelectorAll(".need").forEach((n) => n.classList.remove("need"));
  const step = nextStep();
  const coaching = S.tutorial && !S.firstDone;
  if (els.hint) {
    els.hint.hidden = !coaching || S.tab !== "console";
    if (coaching) els.hint.textContent = step.msg;
  }
  if (coaching && step.id) $(step.id)?.classList.add("need");
}

function dripWork(advanceWork) {
  if (!S.running || S.paused) return;
  const dt = S.now - (S.lastWorkTick || S.now);
  S.lastWorkTick = S.now;
  if (dt > 0 && dt < 5000) advanceWork(dt * WORK_IDLE_SCALE);
}

export function hud(advanceWork) {
  if (advanceWork) dripWork(advanceWork);
  const left = S.running ? SHIFT_MS - (S.now - S.t0) : 0;
  els.clock.textContent = TIMING ? fmt(left) : fmtWork(S.workMin);
  if (els.dayLabel) els.dayLabel.textContent = `Day ${S.dayN}`;
  els.rep.innerHTML = `${S.closed}<small>closed</small>`;
  els.stars.textContent = starGlyph(S.stars);
  els.starN.textContent = `${S.stars.toFixed(1)} mgr`;
  const afterHours = S.workMin >= DAY_END_MIN;
  els.tag.textContent = S.paused ? "ON BREAK"
    : afterHours ? "WRAP-UP"
    : TIMING && left < 15000 ? `WRAP UP · ${fmt(left)}`
    : "ON DUTY";
  els.mute.textContent = S.muted ? "✕" : "♪";
}

export function toast(msg, kind = "") {
  els.toast.textContent = msg;
  els.toast.className = kind ? `on ${kind}` : "on";
  clearTimeout(S.toastTimer);
  S.toastTimer = setTimeout(() => { els.toast.className = ""; }, 1800);
}

export function fly(text, bad) {
  const n = document.createElement("div");
  n.className = "fly" + (bad ? " b" : "");
  n.textContent = text;
  const box = els.work.getBoundingClientRect();
  n.style.left = box.left + box.width / 2 + "px";
  n.style.top = box.top + 20 + "px";
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 1200);
}

export function updatePatience() {
  S.queue.forEach((a, i) => {
    const left = slaLeft(a);
    const sev = sevStyle(a.sev);
    const color = TIMING ? slaColor(left) : sev.ring;
    const ring = els.queue.querySelectorAll(".evt .pr circle:last-child")[i];
    if (ring) {
      const c = 2 * Math.PI * 22;
      ring.setAttribute("stroke-dasharray", `${c * left} ${c}`);
      ring.setAttribute("stroke", color);
    }
    const disk = els.queue.querySelectorAll(".evt .sev-disk")[i];
    if (disk) {
      disk.setAttribute("fill", sev.fill);
      disk.setAttribute("stroke", sev.ring);
    }
    const node = els.queue.querySelectorAll(".evt")[i];
    if (node) node.classList.toggle("angry", left < 0.22);
  });
}

export function setTab(tab) {
  S.tab = tab;
  const is = (t) => tab === t;
  els.tabConsole?.classList.toggle("on", is("console"));
  els.tabPlaybooks?.classList.toggle("on", is("playbooks"));
  els.tabComms?.classList.toggle("on", is("comms"));
  els.tabConsole?.setAttribute("aria-selected", is("console") ? "true" : "false");
  els.tabPlaybooks?.setAttribute("aria-selected", is("playbooks") ? "true" : "false");
  els.tabComms?.setAttribute("aria-selected", is("comms") ? "true" : "false");
  if (els.panelConsole) els.panelConsole.hidden = !is("console");
  if (els.panelPlaybooks) els.panelPlaybooks.hidden = !is("playbooks");
  if (els.panelComms) els.panelComms.hidden = !is("comms");
  if (els.hint) els.hint.hidden = !is("console") || !(S.tutorial && !S.firstDone);
}

export function paint(advanceWork, onApplyPlaybook) {
  if (S.tab === "console") {
    renderQueue();
    renderBrief();
    renderCase();
    renderPlaybookPicker(els.pbPicker, {
      selectedId: S.ticket?.playbookId || null,
      onPick: (id) => {
        if (onApplyPlaybook) onApplyPlaybook(id);
        else applyPlaybookToTicket(id);
      },
    });
    highlight();
  }
  hud(advanceWork);
}

export function applyPlaybookToTicket(id) {
  if (!S.ticket) {
    toast("Claim a ticket first");
    tone(220, 0.08);
    return false;
  }
  const pb = getPlaybook(id);
  if (!pb) return false;
  S.ticket.playbookId = pb.id;
  S.ticket.chain = [...pb.chain];
  S.ticket.rems = [...(pb.rems || [])];
  S.ticket.disp = pb.disp;
  tone(520, 0.06);
  return true;
}

export function hideModal() {
  els.modal.hidden = true;
}
