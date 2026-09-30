import { DAY_START_MIN, DEFAULT_PLAYBOOKS, PLAYBOOK_STORE_KEY, SESSION_STORE_KEY } from "./constants.js";
import { uid } from "./util.js";

export const S = {
  running: false,
  paused: false,
  muted: false,
  t0: 0,
  now: 0,
  pauseAt: 0,
  nextSpawn: 0,
  qSig: "",
  tutorial: true,
  firstDone: false,
  combo: 0,
  closed: 0,
  stars: 5,
  reviews: 0,
  contained: 0,
  breached: 0,
  rejected: 0,
  queue: [],
  focus: null,
  ticket: null,
  toastTimer: 0,
  raf: 0,
  alertUid: 1,
  recent: [],
  /** @type {{ atMin: number, key: string, fromTitle: string, reason: string, generation: number }[]} */
  pending: [],
  workMin: DAY_START_MIN,
  lastWorkTick: 0,
  dayN: 1,
  eodShown: false,
  /** @type {'console'|'playbooks'|'comms'} */
  tab: "console",
  playbooks: [],
  /** Draft while editing in Playbooks tab */
  draft: emptyDraft(),
  editingId: null,
  /** Stakeholder comms / tickets */
  comms: [],
  commsSeen: null,
  commsFocus: null,
  commsUid: 1,
  commsOk: 0,
  commsBad: 0,
  nextCommAt: DAY_START_MIN + 18,
  /** Floor interrupt popup */
  interrupt: null,
  interruptSeen: null,
  nextInterruptAt: DAY_START_MIN + 30,
  /** @type {null|'break'|'brief'|'interrupt'} */
  pauseKind: null,
};

export function emptyDraft() {
  return { name: "", chain: [], remCats: [], rems: [], disp: null };
}

export function emptyTicket(alertId) {
  return { alertId, chain: [], rems: [], disp: null, playbookId: null };
}

export function loadPlaybooks() {
  try {
    const raw = localStorage.getItem(PLAYBOOK_STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        S.playbooks = parsed;
        return;
      }
    }
  } catch (_) { /* ignore */ }
  S.playbooks = DEFAULT_PLAYBOOKS.map((p) => ({ ...p, chain: [...p.chain], rems: [...p.rems] }));
  savePlaybooks();
}

export function savePlaybooks() {
  try {
    localStorage.setItem(PLAYBOOK_STORE_KEY, JSON.stringify(S.playbooks));
  } catch (_) { /* ignore */ }
}

export function getPlaybook(id) {
  return S.playbooks.find((p) => p.id === id) || null;
}

export function upsertPlaybook(pb) {
  const i = S.playbooks.findIndex((p) => p.id === pb.id);
  if (i >= 0) S.playbooks[i] = pb;
  else S.playbooks.push(pb);
  savePlaybooks();
}

export function deletePlaybook(id) {
  S.playbooks = S.playbooks.filter((p) => p.id !== id);
  savePlaybooks();
}

export function newPlaybookFromDraft(draft) {
  return {
    id: uid(),
    name: draft.name.trim(),
    chain: [...draft.chain],
    rems: [...draft.rems],
    disp: draft.disp,
  };
}

function serializeAlert(a) {
  return {
    id: a.id,
    key: a.key,
    title: a.title,
    sourceId: a.source?.id || a.sourceId || "siem",
    host: a.host,
    sev: a.sev,
    chain: a.chain,
    rems: a.rems,
    disp: a.disp,
    rule: a.rule,
    stream: a.stream,
    teach: a.teach,
    ageMs: Math.max(0, (S.now || 0) - (a.born || 0)),
    wait: a.wait,
    strikes: a.strikes,
    isReturn: !!a.isReturn,
    generation: a.generation || 0,
    returnFrom: a.returnFrom || null,
    returnReason: a.returnReason || null,
    fromComms: !!a.fromComms,
    noise: !!a.noise,
    pivots: a.pivots || [],
    edr: a.edr || null,
  };
}

function serializeComm(c) {
  return {
    id: c.id,
    tplId: c.tplId,
    fromId: c.from?.id || c.fromId || "helpdesk",
    subject: c.subject,
    body: c.body,
    replies: c.replies,
    bornMin: c.bornMin,
    staleMin: c.staleMin,
    resolved: !!c.resolved,
    staled: !!c.staled,
    effect: c.effect,
    messages: c.messages || [],
  };
}

/** Snapshot of an in-progress shift (no RAF / DOM timers). */
export function buildSessionSnapshot() {
  const now = S.now || performance.now();
  const t0 = S.t0 || now;
  return {
    v: 1,
    savedAt: Date.now(),
    muted: !!S.muted,
    paused: !!S.paused,
    pauseKind: S.pauseKind || null,
    interrupt: S.interrupt ? { id: S.interrupt.id, shownAt: S.interrupt.shownAt } : null,
    interruptSeen: [...(S.interruptSeen instanceof Set ? S.interruptSeen : new Set(S.interruptSeen || []))],
    nextInterruptAt: S.nextInterruptAt,
    tutorial: !!S.tutorial,
    firstDone: !!S.firstDone,
    combo: S.combo,
    closed: S.closed,
    stars: S.stars,
    reviews: S.reviews,
    contained: S.contained,
    breached: S.breached,
    rejected: S.rejected,
    focus: S.focus,
    ticket: S.ticket,
    alertUid: S.alertUid,
    recent: [...(S.recent || [])],
    pending: (S.pending || []).map((p) => ({ ...p })),
    workMin: S.workMin,
    dayN: S.dayN,
    eodShown: !!S.eodShown,
    tab: S.tab || "console",
    draft: S.draft
      ? {
          ...S.draft,
          chain: [...(S.draft.chain || [])],
          remCats: [...(S.draft.remCats || [])],
          rems: [...(S.draft.rems || [])],
        }
      : emptyDraft(),
    editingId: S.editingId,
    queue: (S.queue || []).map(serializeAlert),
    elapsedMs: Math.max(0, now - t0),
    nextSpawnIn: Math.max(0, (S.nextSpawn || now) - now),
    lastWorkAge: Math.max(0, now - (S.lastWorkTick || now)),
    comms: (S.comms || []).map(serializeComm),
    commsSeen: [...(S.commsSeen instanceof Set ? S.commsSeen : new Set(S.commsSeen || []))],
    commsFocus: S.commsFocus,
    commsUid: S.commsUid,
    commsOk: S.commsOk,
    commsBad: S.commsBad,
    nextCommAt: S.nextCommAt,
  };
}

export function saveSession() {
  if (!S.running) return false;
  try {
    localStorage.setItem(SESSION_STORE_KEY, JSON.stringify(buildSessionSnapshot()));
    return true;
  } catch (_) {
    return false;
  }
}

export function peekSession() {
  try {
    const raw = localStorage.getItem(SESSION_STORE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.v !== 1 || !Array.isArray(data.queue)) return null;
    return data;
  } catch (_) {
    return null;
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_STORE_KEY);
  } catch (_) { /* ignore */ }
}

export function hasSession() {
  return !!peekSession();
}
