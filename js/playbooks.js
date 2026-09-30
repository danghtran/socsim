import { DISPS, REM_ACTIONS, REM_CATS, STEPS } from "./constants.js";
import { S, deletePlaybook, emptyDraft, getPlaybook, newPlaybookFromDraft, upsertPlaybook } from "./state.js";
import { catsFromRems, chainLabel, remLabel, $ } from "./util.js";

let toastFn = () => {};
let toneFn = () => {};
let onLibraryChange = () => {};

export function initPlaybooks({ toast, tone, onChange }) {
  toastFn = toast;
  toneFn = tone;
  onLibraryChange = onChange;
}

export function draftComplete(d = S.draft) {
  if (!d.name.trim() || !d.disp || !d.rems.length) return false;
  if (d.disp === "fp" || d.disp === "benign") return true;
  return d.chain.length > 0;
}

export function toggleDraftStep(step) {
  const i = S.draft.chain.indexOf(step);
  if (i >= 0) S.draft.chain.splice(i, 1);
  else S.draft.chain.push(step);
  toneFn(480, 0.05);
  renderPlaybooks();
}

export function toggleDraftRemCat(catId) {
  const i = S.draft.remCats.indexOf(catId);
  if (i >= 0) {
    S.draft.remCats.splice(i, 1);
    const keep = new Set(
      Object.keys(REM_CATS[catId]?.actions || {}),
    );
    S.draft.rems = S.draft.rems.filter((id) => !keep.has(id));
  } else {
    S.draft.remCats.push(catId);
  }
  toneFn(460, 0.05);
  renderPlaybooks();
}

export function toggleDraftRem(actionId) {
  const act = REM_ACTIONS[actionId];
  if (!act) return;
  if (!S.draft.remCats.includes(act.cat)) {
    S.draft.remCats.push(act.cat);
  }
  const i = S.draft.rems.indexOf(actionId);
  if (i >= 0) S.draft.rems.splice(i, 1);
  else S.draft.rems.push(actionId);
  toneFn(500, 0.05);
  renderPlaybooks();
}

export function setDraftDisp(disp) {
  S.draft.disp = disp;
  toneFn(500, 0.05);
  renderPlaybooks();
}

export function startNewPlaybook() {
  S.editingId = null;
  S.draft = emptyDraft();
  renderPlaybooks();
}

export function editPlaybook(id) {
  const pb = getPlaybook(id);
  if (!pb) return;
  S.editingId = id;
  const rems = [...(pb.rems || [])];
  S.draft = {
    name: pb.name,
    chain: [...pb.chain],
    remCats: catsFromRems(rems),
    rems,
    disp: pb.disp,
  };
  renderPlaybooks();
  $("pb-name")?.focus();
}

export function saveDraftPlaybook() {
  if (!draftComplete()) {
    toastFn("Name the playbook and pick disposition + remediations (chain optional for FP/benign)");
    toneFn(220, 0.08);
    return;
  }
  if (S.editingId) {
    upsertPlaybook({
      id: S.editingId,
      name: S.draft.name.trim(),
      chain: [...S.draft.chain],
      rems: [...S.draft.rems],
      disp: S.draft.disp,
    });
    toastFn("Playbook updated", "good");
  } else {
    upsertPlaybook(newPlaybookFromDraft(S.draft));
    toastFn("Playbook saved to library", "good");
  }
  toneFn(660, 0.08);
  S.editingId = null;
  S.draft = emptyDraft();
  renderPlaybooks();
  onLibraryChange();
}

export function removePlaybook(id) {
  deletePlaybook(id);
  if (S.editingId === id) {
    S.editingId = null;
    S.draft = emptyDraft();
  }
  toastFn("Playbook removed");
  toneFn(200, 0.08);
  renderPlaybooks();
  onLibraryChange();
}

function chipRow(kind, items, selected, dataAttr) {
  return Object.values(items).map((it) => {
    const on = kind === "step" || kind === "cat" || kind === "rem"
      ? (Array.isArray(selected) ? selected.indexOf(it.id) >= 0 : selected === it.id)
      : selected === it.id;
    const ord = kind === "step" && Array.isArray(selected) ? selected.indexOf(it.id) : -1;
    return `<button type="button" class="st pb-pick ${on ? "on" : ""}" data-${dataAttr}="${it.id}">
      <span class="t">${it.label}</span>
      ${ord >= 0 ? `<span class="ord">${ord + 1}</span>` : ""}
    </button>`;
  }).join("");
}

function remActionChips(remCats, rems) {
  if (!remCats.length) {
    return `<p class="pb-hint">Select one or more categories above to reveal actions.</p>`;
  }
  return remCats.map((catId) => {
    const cat = REM_CATS[catId];
    if (!cat) return "";
    return `
      <div class="rem-cat-block">
        <div class="rem-cat-title">${cat.label}</div>
        <div class="row pb-grid">${chipRow("rem", cat.actions, rems, "rem")}</div>
      </div>`;
  }).join("");
}

export function renderPlaybooks() {
  const list = $("pb-list");
  const editor = $("pb-editor");
  if (!list || !editor) return;

  if (!S.playbooks.length) {
    list.innerHTML = `<p class="pb-empty">No playbooks yet. Build one on the right — chain, remediations, disposition.</p>`;
  } else {
    list.innerHTML = S.playbooks.map((p) => `
      <article class="pb-card ${S.editingId === p.id ? "editing" : ""}" data-id="${p.id}">
        <header>
          <h3>${escapeHtml(p.name)}</h3>
          <div class="pb-card-actions">
            <button type="button" class="ghost-sm" data-edit="${p.id}">Edit</button>
            <button type="button" class="ghost-sm danger" data-del="${p.id}">Delete</button>
          </div>
        </header>
        <p class="pb-chain">${chainLabel(p.chain)}</p>
        <p class="pb-meta">${remLabel(p.rems)} · ${DISPS[p.disp]?.label || "?"}</p>
      </article>`).join("");
  }

  const d = S.draft;
  editor.innerHTML = `
    <div class="pb-editor-hd">
      <h3>${S.editingId ? "Edit playbook" : "New playbook"}</h3>
      <button type="button" class="ghost-sm" id="pb-reset">Reset</button>
    </div>
    <label class="pb-field">
      <span>Name</span>
      <input id="pb-name" type="text" maxlength="48" placeholder="e.g. Credential phishing" value="${escapeAttr(d.name)}" />
    </label>
    <div class="lbl">Attack chain <span class="hint-inline">click in order · skip for FP/benign</span></div>
    <div class="row pb-grid" id="pb-steps">${chipRow("step", STEPS, d.chain, "step")}</div>
    <div class="lbl">Remediation categories <span class="hint-inline">pick one or more</span></div>
    <div class="row pb-grid" id="pb-rem-cats">${chipRow("cat", REM_CATS, d.remCats, "remcat")}</div>
    <div class="lbl">Actions <span class="hint-inline">multi-select</span></div>
    <div id="pb-rem-actions">${remActionChips(d.remCats, d.rems)}</div>
    <div class="lbl">Disposition <span class="hint-inline">how you close or route</span></div>
    <div class="row pb-grid" id="pb-disps">${chipRow("disp", DISPS, d.disp, "disp")}</div>
    <div class="pb-preview">
      <em>Preview</em>
      <b>${d.name.trim() || "Untitled"}</b>
      <span>${chainLabel(d.chain)}</span>
      <span>${remLabel(d.rems)} · ${d.disp ? DISPS[d.disp].label : "—"}</span>
    </div>
    <div class="pb-save-row">
      <button type="button" class="serve" id="pb-save">${S.editingId ? "Update playbook" : "Save playbook"}</button>
    </div>`;

  wirePlaybookDom();
}

function wirePlaybookDom() {
  $("pb-list")?.querySelectorAll("[data-edit]").forEach((b) => {
    b.onclick = () => editPlaybook(b.dataset.edit);
  });
  $("pb-list")?.querySelectorAll("[data-del]").forEach((b) => {
    b.onclick = () => removePlaybook(b.dataset.del);
  });
  $("pb-reset")?.addEventListener("click", startNewPlaybook);
  $("pb-save")?.addEventListener("click", saveDraftPlaybook);
  $("pb-name")?.addEventListener("input", (e) => {
    S.draft.name = e.target.value;
  });
  $("pb-steps")?.querySelectorAll("[data-step]").forEach((b) => {
    b.onclick = () => toggleDraftStep(b.dataset.step);
  });
  $("pb-rem-cats")?.querySelectorAll("[data-remcat]").forEach((b) => {
    b.onclick = () => toggleDraftRemCat(b.dataset.remcat);
  });
  $("pb-rem-actions")?.querySelectorAll("[data-rem]").forEach((b) => {
    b.onclick = () => toggleDraftRem(b.dataset.rem);
  });
  $("pb-disps")?.querySelectorAll("[data-disp]").forEach((b) => {
    b.onclick = () => setDraftDisp(b.dataset.disp);
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/\n/g, " ");
}

/** Compact list for console — apply a library playbook onto the open ticket. */
export function renderPlaybookPicker(container, { selectedId, onPick }) {
  if (!container) return;
  if (!S.playbooks.length) {
    container.innerHTML = `<p class="pb-hint">No playbooks in library. Open the <b>Playbooks</b> tab to define one.</p>`;
    return;
  }
  container.innerHTML = S.playbooks.map((p) => `
    <button type="button" class="pb-apply ${selectedId === p.id ? "on" : ""}" data-apply="${p.id}">
      <span class="nm">${escapeHtml(p.name)}</span>
      <span class="meta">${chainLabel(p.chain)} · ${remLabel(p.rems)} · ${DISPS[p.disp]?.label || "?"}</span>
    </button>`).join("");
  container.querySelectorAll("[data-apply]").forEach((b) => {
    b.onclick = () => onPick(b.dataset.apply);
  });
}
