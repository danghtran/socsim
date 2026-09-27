(() => {
  const PLAYBOOKS = {
    phish: { id: "phish", label: "Phish", verb: "phishing" },
    malware: { id: "malware", label: "Malware", verb: "malware" },
    intrusion: { id: "intrusion", label: "Intrusion", verb: "intrusion" },
  };
  const TOOLS = {
    isolate: { id: "isolate", label: "isolate host" },
    reset: { id: "reset", label: "reset creds" },
    block: { id: "block", label: "block IP" },
  };
  const HOSTS = [
    { id: "mail-gw", initials: "MG", hue: 168 },
    { id: "vpn-edge", initials: "VE", hue: 198 },
    { id: "laptop-04", initials: "L4", hue: 42 },
    { id: "dc-01", initials: "DC", hue: 210 },
    { id: "wifi-ap", initials: "AP", hue: 320 },
    { id: "pos-12", initials: "P12", hue: 12 },
    { id: "hr-pc", initials: "HR", hue: 88 },
    { id: "jump-box", initials: "JB", hue: 250 },
    { id: "cdn-edge", initials: "CD", hue: 140 },
    { id: "sso-01", initials: "SS", hue: 280 },
  ];

  const SHIFT_MS = 100000;
  const MAX_Q = 3;
  const SEV_MAX = 3;
  const QUERY_MS = 520;
  const SPAWN_FIRST = 600;
  const SPAWN_MIN = 5600;
  const SPAWN_MAX = 8200;
  const PATIENCE = 24000;
  const PATIENCE_SEV = 1800;

  const $ = (id) => document.getElementById(id);
  const els = {
    splash: $("splash"),
    shift: $("shift"),
    queue: $("queue"),
    bubble: $("bubble"),
    work: $("work"),
    hint: $("hint"),
    toast: $("toast"),
    modal: $("modal"),
    card: $("card"),
    rep: $("rep"),
    stars: $("stars"),
    starN: $("star-n"),
    clock: $("clock"),
    tag: $("shift-tag"),
    sevBtn: $("btn-sev"),
    sevN: $("sev-n"),
    query: $("btn-query"),
    mute: $("btn-mute"),
  };

  const S = {
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
    rep: 0,
    stars: 5,
    reviews: 0,
    contained: 0,
    breached: 0,
    rejected: 0,
    queue: [],
    focus: null,
    ticket: null,
    querying: false,
    toastTimer: 0,
    raf: 0,
    uid: 1,
  };

  let audioCtx = null;
  function tone(freq, dur = 0.08, type = "square", gain = 0.04) {
    if (S.muted) return;
    try {
      audioCtx = audioCtx || new AudioContext();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = gain;
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
      o.connect(g).connect(audioCtx.destination);
      o.start();
      o.stop(audioCtx.currentTime + dur);
    } catch (_) { /* ignore */ }
  }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function fmt(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }

  function makeAlert(fixed) {
    const host = pick(HOSTS);
    const play = fixed?.play || pick(Object.keys(PLAYBOOKS));
    const tool = fixed?.tool || pick(Object.keys(TOOLS));
    const sev = fixed?.sev ?? Math.floor(Math.random() * (SEV_MAX + 1));
    return {
      id: S.uid++,
      host,
      play,
      tool,
      sev,
      born: S.now,
      wait: PATIENCE - sev * PATIENCE_SEV,
    };
  }

  function focused() {
    return S.queue.find((a) => a.id === S.focus) || S.queue[0] || null;
  }

  function emptyTicket() {
    return { play: null, queried: false, tool: null, sev: 0 };
  }

  function nextHint() {
    const a = focused();
    const t = S.ticket;
    if (!a) return "Queue is clear. Stay ready.";
    if (!t) return "Open a ticket.";
    if (!t.play) return `Assign playbook: ${PLAYBOOKS[a.play].label}.`;
    if (!t.queried) return "Pull logs from the SIEM.";
    if (!t.tool) return `Contain with ${TOOLS[a.tool].label}.`;
    if (t.sev !== a.sev) return `Dial severity to ${a.sev}.`;
    return "Looks right — push the case.";
  }

  function highlight() {
    document.querySelectorAll(".need").forEach((n) => n.classList.remove("need"));
    if (!S.tutorial || S.firstDone) {
      els.hint.hidden = true;
      return;
    }
    const a = focused();
    const t = S.ticket;
    let id = "btn-open";
    if (!a) id = null;
    else if (!t) id = "btn-open";
    else if (!t.play) id = `btn-${a.play}`;
    else if (!t.queried) id = "btn-query";
    else if (!t.tool) id = `btn-${a.tool}`;
    else if (t.sev !== a.sev) id = "btn-sev";
    else id = "btn-push";
    if (id) $(id)?.classList.add("need");
    els.hint.hidden = false;
    els.hint.textContent = nextHint();
  }

  function starGlyph(n) {
    const full = Math.round(n);
    return "★★★★★".slice(0, full).padEnd(5, "☆");
  }

  function renderQueue() {
    const slots = [];
    for (let i = 0; i < MAX_Q; i++) {
      const a = S.queue[i];
      if (!a) {
        slots.push(`<div class="empty">clear</div>`);
        continue;
      }
      const left = clamp(1 - (S.now - a.born) / a.wait, 0, 1);
      const color = left > 0.45 ? "#3ecf8e" : left > 0.22 ? "#f5c542" : "#ff5d8f";
      const r = 22;
      const c = 2 * Math.PI * r;
      const dash = `${c * left} ${c}`;
      const on = a.id === (focused()?.id);
      const angry = left < 0.22 ? " angry" : "";
      slots.push(`
        <button class="cust${on ? " on" : ""}${angry}" data-id="${a.id}">
          <span class="tag">L${a.sev}</span>
          <span class="ring">
            <svg class="pr" viewBox="0 0 54 54" aria-hidden="true">
              <circle cx="27" cy="27" r="${r}" fill="none" stroke="#1a3038" stroke-width="4"/>
              <circle cx="27" cy="27" r="${r}" fill="none" stroke="${color}" stroke-width="4"
                stroke-dasharray="${dash}" stroke-linecap="round"/>
            </svg>
            <span class="face" style="background:hsl(${a.host.hue} 55% 62%)">${a.host.initials}</span>
          </span>
          <span class="nm">${a.host.id}</span>
        </button>`);
    }
    els.queue.innerHTML = slots.join("");
  }

  function renderBubble() {
    const a = focused();
    if (!a) {
      els.bubble.innerHTML = `<div class="idle">Waiting on the wire…</div>`;
      return;
    }
    const left = clamp(1 - (S.now - a.born) / a.wait, 0, 1);
    const color = left > 0.45 ? "var(--ok)" : left > 0.22 ? "var(--warn)" : "var(--bad)";
    els.bubble.innerHTML = `
      <div class="say">${PLAYBOOKS[a.play].verb} on <b>${a.host.id}</b> — <b>${TOOLS[a.tool].label}</b>, severity <b class="sev">${a.sev}</b>.</div>
      <div class="pat"><div class="bar"><i style="transform:scaleX(${left});background:${color}"></i></div></div>`;
  }

  function renderCase() {
    const t = S.ticket;
    if (!t) {
      els.work.innerHTML = `<p class="ph">No case open.<br>Open a ticket.</p>`;
      return;
    }
    const a = focused();
    const playOk = t.play && a && t.play === a.play;
    const toolOk = t.tool && a && t.tool === a.tool;
    const sevOk = a && t.sev === a.sev;
    const ready = t.play && t.queried && t.tool;
    const face = !t.play ? "…" : ready && sevOk ? "^_^" : ready ? "o_o" : "-_-";
    els.work.innerHTML = `
      <div class="case">
        <div class="face">
          <div>${face}  CASE-${String(100 + (a?.id || 0)).slice(-3)}</div>
          <div style="margin-top:6px">
            <span class="chip ${t.play ? (playOk ? "ok" : "bad") : ""}">${t.play ? PLAYBOOKS[t.play].label : "playbook?"}</span>
            <span class="chip ${t.queried ? "ok" : "warn"}">${t.queried ? "logs" : "no logs"}</span>
            <span class="chip ${t.tool ? (toolOk ? "ok" : "bad") : ""}">${t.tool ? TOOLS[t.tool].label : "contain?"}</span>
            <span class="chip ${sevOk ? "ok" : "warn"}">sev ${t.sev}</span>
          </div>
        </div>
        <p class="meta">${nextHint()}</p>
      </div>`;
  }

  function renderSev() {
    const t = S.ticket;
    const lv = t ? t.sev : 0;
    els.sevN.textContent = lv;
    els.sevBtn.dataset.lv = String(lv);
    const a = focused();
    els.sevBtn.classList.toggle("match", !!(t && a && t.sev === a.sev));
    els.sevBtn.classList.toggle("need", false);
  }

  function renderPlayMarks() {
    document.querySelectorAll(".pb").forEach((b) => {
      b.classList.toggle("on", S.ticket?.play === b.dataset.play);
    });
    document.querySelectorAll(".tray").forEach((b) => {
      b.classList.toggle("on", S.ticket?.tool === b.dataset.tool);
    });
    els.query.classList.toggle("on", !!S.ticket?.queried);
    els.query.classList.toggle("run", S.querying);
  }

  function hud() {
    const left = S.running ? SHIFT_MS - (S.now - S.t0) : 0;
    els.clock.textContent = fmt(left);
    els.rep.innerHTML = `${S.rep}<small>rep</small>`;
    els.stars.textContent = starGlyph(S.stars);
    els.starN.textContent = `${S.stars.toFixed(1)} trust`;
    els.tag.textContent = S.paused ? "PAUSED" : left < 15000 ? "WRAP UP" : "SHIFT OPEN";
    els.mute.textContent = S.muted ? "✕" : "♪";
  }

  function paint() {
    renderQueue();
    renderBubble();
    renderCase();
    renderSev();
    renderPlayMarks();
    highlight();
    hud();
  }

  function toast(msg, kind = "") {
    els.toast.textContent = msg;
    els.toast.className = kind ? `on ${kind}` : "on";
    clearTimeout(S.toastTimer);
    S.toastTimer = setTimeout(() => { els.toast.className = ""; }, 1700);
  }

  function fly(text, bad) {
    const n = document.createElement("div");
    n.className = "fly" + (bad ? " b" : "");
    n.textContent = text;
    const box = els.work.getBoundingClientRect();
    n.style.left = box.left + box.width / 2 + "px";
    n.style.top = box.top + 20 + "px";
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 1200);
  }

  function rate(delta) {
    S.reviews += 1;
    S.stars = clamp(S.stars + delta, 1, 5);
  }

  function spawn(fixed) {
    if (S.queue.length >= MAX_Q) return;
    S.queue.push(makeAlert(fixed));
    if (!S.focus) S.focus = S.queue[0].id;
    tone(520, 0.07, "triangle", 0.03);
  }

  function drop(id, why) {
    const i = S.queue.findIndex((a) => a.id === id);
    if (i < 0) return;
    const a = S.queue[i];
    S.queue.splice(i, 1);
    if (S.focus === id) S.focus = S.queue[0]?.id || null;
    if (why === "sla") {
      S.breached += 1;
      S.combo = 0;
      rate(-1);
      toast(`${a.host.id} breached SLA`, "bad");
      tone(140, 0.2, "sawtooth", 0.05);
    } else if (why === "wrong") {
      S.rejected += 1;
      S.combo = 0;
      rate(-0.8);
      toast(`${a.host.id} rejected the case`, "bad");
      tone(180, 0.16, "square", 0.05);
    } else if (why === "ok") {
      S.contained += 1;
      S.combo += 1;
      const bonus = 80 + a.sev * 25 + Math.min(3, S.combo - 1) * 15;
      S.rep += bonus;
      rate(0.15);
      fly(`+${bonus}${S.combo > 1 ? "  x" + S.combo : ""}`);
      toast(`${a.host.id} contained`, "good");
      tone(660, 0.08, "square", 0.04);
      setTimeout(() => tone(880, 0.1, "square", 0.035), 70);
      if (S.tutorial) S.firstDone = true;
    }
  }

  function requireTicket() {
    if (!S.ticket) {
      toast("Open a ticket first");
      tone(220, 0.08);
      return false;
    }
    return true;
  }

  function openTicket() {
    if (S.ticket) {
      toast("Dump the current case first");
      return;
    }
    if (!focused()) {
      toast("No alert in queue");
      return;
    }
    S.ticket = emptyTicket();
    tone(420, 0.06);
    paint();
  }

  function setPlay(play) {
    if (!requireTicket()) return;
    S.ticket.play = play;
    tone(480, 0.05);
    paint();
  }

  function pullLogs() {
    if (!requireTicket()) return;
    if (S.ticket.queried || S.querying) return;
    S.querying = true;
    els.query.classList.add("run");
    tone(300, 0.12, "sawtooth", 0.03);
    setTimeout(() => {
      S.querying = false;
      if (S.ticket) S.ticket.queried = true;
      paint();
    }, QUERY_MS);
  }

  function setTool(tool) {
    if (!requireTicket()) return;
    S.ticket.tool = tool;
    tone(500, 0.05);
    paint();
  }

  function bumpSev() {
    if (!requireTicket()) return;
    S.ticket.sev = (S.ticket.sev + 1) % (SEV_MAX + 1);
    tone(360 + S.ticket.sev * 80, 0.05);
    paint();
  }

  function dump() {
    if (!S.ticket) return;
    S.ticket = null;
    S.querying = false;
    tone(200, 0.08);
    paint();
  }

  function mismatch(t, a) {
    if (!t.play || !t.queried || !t.tool) return "incomplete";
    if (t.play !== a.play) return "playbook";
    if (t.tool !== a.tool) return "containment";
    if (t.sev !== a.sev) return "severity";
    return null;
  }

  function push() {
    const a = focused();
    if (!S.ticket) {
      toast("Nothing to push");
      return;
    }
    if (!a) {
      toast("No alert selected");
      return;
    }
    const why = mismatch(S.ticket, a);
    if (why === "incomplete") {
      toast(nextHint());
      tone(240, 0.08);
      return;
    }
    if (why) {
      fly("mismatch", true);
      S.ticket = null;
      drop(a.id, "wrong");
      paint();
      return;
    }
    S.ticket = null;
    drop(a.id, "ok");
    paint();
  }

  function tick(ts) {
    if (!S.running) return;
    S.raf = requestAnimationFrame(tick);
    if (S.paused) return;
    S.now = ts;
    const elapsed = S.now - S.t0;
    if (elapsed >= SHIFT_MS) {
      endShift();
      return;
    }
    if (S.now >= S.nextSpawn) {
      if (S.queue.length < MAX_Q) spawn();
      S.nextSpawn = S.now + SPAWN_MIN + Math.random() * (SPAWN_MAX - SPAWN_MIN);
    }
    for (const a of [...S.queue]) {
      if (S.now - a.born >= a.wait) drop(a.id, "sla");
    }
    const sig = S.queue.map((a) => a.id).join(",") + ":" + S.focus;
    if (sig !== S.qSig) {
      S.qSig = sig;
      paint();
    } else {
      updatePatience();
      hud();
    }
  }

  function updatePatience() {
    S.queue.forEach((a, i) => {
      const left = clamp(1 - (S.now - a.born) / a.wait, 0, 1);
      const color = left > 0.45 ? "#3ecf8e" : left > 0.22 ? "#f5c542" : "#ff5d8f";
      const ring = els.queue.querySelectorAll(".cust .pr circle:last-child")[i];
      if (ring) {
        const c = 2 * Math.PI * 22;
        ring.setAttribute("stroke-dasharray", `${c * left} ${c}`);
        ring.setAttribute("stroke", color);
      }
      const node = els.queue.querySelectorAll(".cust")[i];
      if (node) node.classList.toggle("angry", left < 0.22);
    });
    const a = focused();
    const bar = els.bubble.querySelector(".bar i");
    if (a && bar) {
      const left = clamp(1 - (S.now - a.born) / a.wait, 0, 1);
      const color = left > 0.45 ? "var(--ok)" : left > 0.22 ? "var(--warn)" : "var(--bad)";
      bar.style.transform = `scaleX(${left})`;
      bar.style.background = color;
    }
  }

  function startShift() {
    hideModal();
    S.running = true;
    S.paused = false;
    S.tutorial = true;
    S.firstDone = false;
    S.combo = 0;
    S.rep = 0;
    S.stars = 5;
    S.reviews = 0;
    S.contained = 0;
    S.breached = 0;
    S.rejected = 0;
    S.queue = [];
    S.focus = null;
    S.ticket = null;
    S.querying = false;
    S.qSig = "";
    els.splash.hidden = true;
    els.shift.hidden = false;
    S.t0 = performance.now();
    S.now = S.t0;
    spawn({ play: "phish", tool: "isolate", sev: 1 });
    S.nextSpawn = S.now + SPAWN_FIRST + 4200;
    paint();
    cancelAnimationFrame(S.raf);
    S.raf = requestAnimationFrame(tick);
    tone(520, 0.1);
  }

  function endShift() {
    S.running = false;
    cancelAnimationFrame(S.raf);
    S.ticket = null;
    paint();
    const grade = S.contained >= 8 && S.stars >= 4 ? "Clean shift."
      : S.contained >= 5 ? "Desk held. A few scars."
      : S.contained >= 2 ? "The queue won some rounds."
      : "Rough night. Run it back.";
    els.card.innerHTML = `
      <h2>Shift closed</h2>
      <p>${grade}</p>
      <div class="kpis">
        <div><b>${S.contained}</b><small>contained</small></div>
        <div><b>${S.breached + S.rejected}</b><small>missed</small></div>
        <div><b>${S.stars.toFixed(1)}</b><small>trust</small></div>
      </div>
      <p>Reputation <b style="color:var(--amber)">${S.rep}</b></p>
      <div class="btns">
        <button class="pri" id="again">Next shift</button>
        <button id="home">Desk lobby</button>
      </div>`;
    els.modal.hidden = false;
    $("again").onclick = startShift;
    $("home").onclick = () => {
      hideModal();
      els.shift.hidden = true;
      els.splash.hidden = false;
    };
  }

  function showHow() {
    els.card.innerHTML = `
      <h2>How to play</h2>
      <div class="how">
        <div><i>1</i><div><b>Read the alert</b><span>Playbook, containment, severity — all must match.</span></div></div>
        <div><i>2</i><div><b>Open a ticket</b><span>One case on the bench at a time.</span></div></div>
        <div><i>3</i><div><b>Assign playbook</b><span>Phish, malware, or intrusion.</span></div></div>
        <div><i>4</i><div><b>Pull SIEM logs</b><span>Click the console. Wait for the needle.</span></div></div>
        <div><i>5</i><div><b>Contain + set severity</b><span>Click the dial to cycle 0–3, then push.</span></div></div>
      </div>
      <p>Dump resets the bench. Wrong push or a burned SLA costs trust.</p>
      <div class="btns"><button class="pri" id="gotit">Got it</button></div>`;
    els.modal.hidden = false;
    $("gotit").onclick = hideModal;
  }

  function hideModal() { els.modal.hidden = true; }

  function applyPauseOffset(dt) {
    S.t0 += dt;
    S.nextSpawn += dt;
    S.queue.forEach((a) => { a.born += dt; });
  }

  function resumePlay() {
    if (!S.paused) return;
    applyPauseOffset(performance.now() - S.pauseAt);
    S.paused = false;
    hideModal();
    hud();
  }

  function pause() {
    if (!S.running) return;
    if (S.paused) {
      resumePlay();
      return;
    }
    S.paused = true;
    S.pauseAt = performance.now();
    els.card.innerHTML = `
      <h2>Paused</h2>
      <p>The queue is frozen. SLA clocks resume when you do.</p>
      <div class="btns">
        <button class="pri" id="resume">Resume</button>
        <button id="bail">End shift</button>
      </div>`;
    els.modal.hidden = false;
    $("resume").onclick = resumePlay;
    $("bail").onclick = () => { hideModal(); endShift(); };
    hud();
  }

  $("btn-start").onclick = () => { audioCtx = audioCtx || new AudioContext(); startShift(); };
  $("btn-how").onclick = showHow;
  $("btn-pause").onclick = pause;
  $("btn-mute").onclick = () => { S.muted = !S.muted; hud(); };
  $("btn-open").onclick = openTicket;
  $("btn-phish").onclick = () => setPlay("phish");
  $("btn-malware").onclick = () => setPlay("malware");
  $("btn-intrusion").onclick = () => setPlay("intrusion");
  $("btn-query").onclick = pullLogs;
  $("btn-isolate").onclick = () => setTool("isolate");
  $("btn-reset").onclick = () => setTool("reset");
  $("btn-block").onclick = () => setTool("block");
  $("btn-sev").onclick = bumpSev;
  $("btn-push").onclick = push;
  $("btn-dump").onclick = dump;

  els.queue.addEventListener("click", (e) => {
    const b = e.target.closest(".cust");
    if (!b) return;
    S.focus = Number(b.dataset.id);
    paint();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && S.running) pause();
  });
})();
