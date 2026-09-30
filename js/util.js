import { DAY_START_MIN, DAY_END_MIN, REM_ACTIONS, STEPS } from "./constants.js";

export const $ = (id) => document.getElementById(id);

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export function fmt(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function fmtWork(min) {
  const m = Math.floor(clamp(min, DAY_START_MIN, DAY_END_MIN + 30));
  const h = Math.floor(m / 60);
  return `${String(h).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function chainLabel(steps) {
  if (!steps || !steps.length) return "—";
  return steps.map((s) => STEPS[s]?.label || s).join(" → ");
}

export function remLabel(rems) {
  if (!rems || !rems.length) return "—";
  return rems.map((id) => REM_ACTIONS[id]?.label || id).join(" · ");
}

export function sameChain(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  return a.every((s, i) => s === b[i]);
}

/** Order-independent set equality for remediation action ids. */
export function sameRems(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  const sb = new Set(b);
  return a.every((id) => sb.has(id));
}

export function catsFromRems(rems) {
  const cats = new Set();
  (rems || []).forEach((id) => {
    const cat = REM_ACTIONS[id]?.cat;
    if (cat) cats.add(cat);
  });
  return [...cats];
}

export function starGlyph(n) {
  const full = Math.round(n);
  return "★★★★★".slice(0, full).padEnd(5, "☆");
}

export function uid() {
  return `pb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
