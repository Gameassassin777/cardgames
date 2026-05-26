// Lake House Doodles 🎨 — Gartic Phone-style game for Lake House Card Games.
// Players alternate writing phrases and drawing them. Chains pass around the
// table and are revealed at the end. Completed games are saved to the cloud gallery.
import { el, mount, toast } from "./ui.js";

const WS_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "ws://localhost:3000"
  : "wss://lakehouse-cardgames-sync.gameassassin777.workers.dev";

const HTTP_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:3000"
  : "https://lakehouse-cardgames-sync.gameassassin777.workers.dev";

const WRITE_TIME = 60;  // seconds per writing phase
const DRAW_TIME  = 90;  // seconds per drawing phase
const MIN_PLAYERS = 3;

// ── Module-level state ───────────────────────────────────────────────────────
let goHome = () => {};
let socket = null;
let roomCode = "";
let myName = "";
let isHost = false;
let myIdx = -1;
let gState = null;          // Full game state object (host-owned, synced to all)
let timerHandle = null;     // setInterval handle for countdown display
let autoAdvHandle = null;   // setTimeout handle for host auto-advance
let hasSubmitted = false;   // Prevent double-submit per round

// ── Entry point ──────────────────────────────────────────────────────────────
export function start(home) {
  goHome = home;
  resetAll();
  renderSetup();
}

function resetAll() {
  if (socket) { try { socket.close(); } catch (_) {} socket = null; }
  if (timerHandle)   { clearInterval(timerHandle);   timerHandle = null; }
  if (autoAdvHandle) { clearTimeout(autoAdvHandle);  autoAdvHandle = null; }
  roomCode = "";
  myName = "";
  isHost = false;
  myIdx = -1;
  gState = null;
  hasSubmitted = false;
}

// ── Setup screen ─────────────────────────────────────────────────────────────
function renderSetup() {
  const savedName = localStorage.getItem("gartic.name") || "";

  const nameInput = el("input", {
    type: "text",
    placeholder: "Your name...",
    value: savedName,
    id: "g-name",
    style: "font-size:1.1rem; border-radius:14px; text-align:center; margin-bottom:14px;"
  });

  const codeInput = el("input", {
    type: "text",
    placeholder: "4-letter code",
    id: "g-code",
    maxLength: 4,
    style: "font-size:1.3rem; border-radius:14px; text-align:center; text-transform:uppercase; letter-spacing:6px; margin-bottom:14px; width:100%;"
  });
  codeInput.addEventListener("input", () => { codeInput.value = codeInput.value.toUpperCase(); });

  const getName = () => {
    const n = nameInput.value.trim();
    if (!n) { toast("Enter your name first!"); return null; }
    localStorage.setItem("gartic.name", n);
    return n;
  };

  mount(
    el("div", { className: "topbar" }, [
      el("button", { className: "back", text: "‹ Home", onClick: () => { resetAll(); goHome(); } }),
      el("div",    { className: "title", text: "Lake House Doodles 🎨" }),
      el("span",   { style: "width:64px" })
    ]),
    el("div", { className: "panel center" }, [
      el("div", { style: "font-size:3rem; margin-bottom:8px;", text: "🎨" }),
      el("h2",  { style: "margin:0 0 6px; color:var(--water-foam);", text: "Lake House Doodles" }),
      el("p",   { className: "muted", style: "margin:0 0 20px; font-size:0.9rem;",
        text: "Write a phrase → someone draws it → someone guesses → watch it transform!" }),
      el("label", { text: "Your Name" }),
      nameInput,
    ]),
    el("div", { className: "panel" }, [
      el("label", { text: "🚀 Create a New Room (you host)" }),
      el("button", { className: "btn", style: "width:100%; margin-top:6px;", text: "✨ Create Room",
        onClick: () => { const n = getName(); if (n) { myName = n; connectRoom("create"); } }
      }),
      el("label", { style: "margin-top:18px;", text: "🚪 Join Existing Room" }),
      codeInput,
      el("button", { className: "btn ghost", style: "width:100%; margin-top:6px;", text: "Join →",
        onClick: () => {
          const n = getName();
          const code = codeInput.value.trim().toUpperCase();
          if (!n) return;
          if (code.length !== 4) { toast("Enter a 4-letter room code!"); return; }
          myName = n;
          connectRoom("join", code);
        }
      })
    ])
  );
}

// ── Networking ───────────────────────────────────────────────────────────────
function connectRoom(type, code = "") {
  const label = type === "create" ? "Creating room..." : `Joining ${code}...`;
  renderSpinner(label);

  const url = type === "create"
    ? `${WS_BASE}/ws/create?name=${enc(myName)}&game=gartic`
    : `${WS_BASE}/ws/join?code=${code}&name=${enc(myName)}&game=gartic`;

  isHost = (type === "create");
  socket = new WebSocket(url);

  socket.onopen = () => console.log("[Doodles] Socket open");

  socket.onmessage = (ev) => {
    try {
      const d = JSON.parse(ev.data);
      if      (d.type === "created")      { roomCode = d.code; applyLobby(d.players); }
      else if (d.type === "player_joined") { roomCode = d.code; applyLobby(d.players); }
      else if (d.type === "player_left")  { applyLobby(d.players); if (gState) toast(`${d.name} left.`); }
      else if (d.type === "relay")        { handleRelay(d.action, d.sender); }
      else if (d.type === "error")        { toast(d.message || "Error"); resetAll(); renderSetup(); }
    } catch (e) { console.error("[Doodles] Parse error:", e); }
  };

  socket.onclose = () => {
    if (gState && gState.phase !== "done") { toast("Disconnected."); resetAll(); renderSetup(); }
  };
  socket.onerror = () => { toast("Connection failed."); resetAll(); renderSetup(); };
}

function relay(action) {
  if (!socket || socket.readyState !== 1) return;
  socket.send(JSON.stringify({ type: "relay", code: roomCode, sender: myName, action }));
}

function enc(s) { return encodeURIComponent(s); }

// ── Lobby ─────────────────────────────────────────────────────────────────────
function applyLobby(players) {
  if (gState && gState.phase !== "lobby") return; // don't clobber mid-game
  gState = { phase: "lobby", players };
  myIdx = players.indexOf(myName);
  renderLobby();
}

function renderLobby() {
  const players = gState.players;
  const list = el("div", { className: "scoreboard" });
  players.forEach((p, i) => {
    list.appendChild(el("div", { className: "score-row" }, [
      el("span", { className: "nm", text: `${i + 1}. ${p}${p === myName ? " (You)" : ""}` }),
      el("span", { className: "pill" + (i === 0 ? " czar-pill" : ""), text: i === 0 ? "👑 Host" : "Ready" })
    ]));
  });

  const enough = players.length >= MIN_PLAYERS;
  mount(
    topbar("🎨 Lobby"),
    el("div", { className: "wood-panel center" }, [
      el("p",  { className: "muted", style: "margin:0 0 4px; font-size:0.8rem;", text: "ROOM CODE" }),
      el("h1", { style: "font-size:3rem; letter-spacing:8px; font-family:monospace; color:#fff; margin:0 0 8px; text-shadow:0 2px 8px var(--shadow);", text: roomCode }),
      el("p",  { className: "muted", style: "font-size:0.82rem; margin:0;", text: "Share this code to invite friends!" })
    ]),
    el("div", { className: "panel" }, [
      el("label", { text: `Players (${players.length})` }),
      list
    ]),
    isHost
      ? el("button", {
          className: "btn", style: "margin-top:4px;",
          text: enough ? "🎨 Start Game!" : `Need ${MIN_PLAYERS - players.length} more player(s)`,
          disabled: !enough,
          onClick: hostStartGame
        })
      : el("p", { className: "muted center", style: "margin-top:14px;", text: "Waiting for host to start…" })
  );
}

// ── Game start (host only) ────────────────────────────────────────────────────
function hostStartGame() {
  const players = gState.players.slice();
  const N = players.length;
  const isMonkey = localStorage.getItem("lakehouse.weird_unlocked") === "true";

  const state = {
    phase: "write",
    round: 0,
    totalRounds: N - 1,
    players,
    chains: players.map(() => []),        // N chains, each starting empty
    assignments: players.map((_, i) => i), // round 0: player i owns chain i
    submissions: {},
    timerEnd: Date.now() + WRITE_TIME * 1000,
    isMonkey,
    revealChainIdx: 0,
    revealEntryIdx: -1,
  };

  relay({ type: "GARTIC_SYNC", state });
  applyState(state);
}

// ── Relay handler ─────────────────────────────────────────────────────────────
function handleRelay(action, sender) {
  // All clients (host + guests) handle state syncs
  if (action.type === "GARTIC_SYNC") {
    applyState(action.state);
    return;
  }

  // Only the host processes submissions
  if (!isHost) return;

  if (action.type === "GARTIC_SUBMIT") {
    const idx = gState.players.indexOf(sender);
    if (idx === -1 || gState.submissions[idx] !== undefined) return;
    gState.submissions[idx] = action.content;
    checkAllIn();
  }
}

// ── State machine ─────────────────────────────────────────────────────────────
function applyState(state) {
  gState  = state;
  myIdx   = gState.players.indexOf(myName);
  hasSubmitted = gState.submissions[myIdx] !== undefined;

  // Clear old timers
  if (timerHandle)   { clearInterval(timerHandle);  timerHandle = null; }
  if (autoAdvHandle) { clearTimeout(autoAdvHandle); autoAdvHandle = null; }

  renderPhase();

  // Countdown display timer (all clients)
  if (gState.phase === "write" || gState.phase === "draw") {
    timerHandle = setInterval(tickTimer, 500);

    // Host-only auto-advance when timer expires
    if (isHost) {
      const delay = Math.max(0, gState.timerEnd - Date.now()) + 800;
      autoAdvHandle = setTimeout(autoAdvance, delay);
    }
  }
}

function tickTimer() {
  const el = document.getElementById("g-timer");
  if (!el) return;
  const secs = Math.max(0, Math.ceil((gState.timerEnd - Date.now()) / 1000));
  el.textContent = `⏱ ${secs}s`;
  if (secs === 0 && timerHandle) { clearInterval(timerHandle); timerHandle = null; }
}

function renderPhase() {
  switch (gState.phase) {
    case "lobby":  return renderLobby();
    case "write":  return renderWritePhase();
    case "draw":   return renderDrawPhase();
    case "reveal": return renderRevealPhase();
    case "done":   return renderDonePhase();
  }
}

// ── Write phase ───────────────────────────────────────────────────────────────
function renderWritePhase() {
  const chain     = gState.chains[gState.assignments[myIdx]];
  const lastEntry = chain[chain.length - 1];

  // Prompt area: either describe a drawing or write original phrase
  let promptEl;
  if (lastEntry && lastEntry.type === "draw") {
    const img = document.createElement("img");
    img.src = lastEntry.content;
    img.style.cssText = "width:100%; border-radius:12px; display:block; margin-top:10px; border:2px solid rgba(255,255,255,0.15);";
    promptEl = el("div", { className: "panel center", style: "padding:14px;" }, [
      el("p", { style: "margin:0 0 6px; font-weight:700; color:var(--water-foam); font-size:0.9rem;", text: "✍️ WHAT IS THIS DRAWING?" }),
      img
    ]);
  } else {
    promptEl = el("div", { className: "panel center", style: "padding:14px;" }, [
      el("h3", { style: "margin:0 0 6px; color:var(--water-foam);", text: "✍️ Write any phrase!" }),
      el("p",  { className: "muted", style: "margin:0; font-size:0.88rem;",
        text: "Funny, weird, or completely random. The next person will draw it." })
    ]);
  }

  const input = el("input", {
    type: "text", id: "g-write",
    placeholder: lastEntry ? "What do you see…" : "Type a phrase…",
    disabled: hasSubmitted,
    style: "font-size:1.05rem; border-radius:14px; text-align:center; margin-bottom:10px;"
  });

  input.addEventListener("keydown", (e) => { if (e.key === "Enter") doSubmitText(input); });

  const submitBtn = el("button", {
    className: "btn",
    disabled: hasSubmitted,
    style: hasSubmitted ? "opacity:0.55;" : "",
    text: hasSubmitted ? "✓ Submitted — waiting…" : "✅ Submit",
    onClick: () => doSubmitText(input)
  });

  mount(
    topbar("✍️ Write!"),
    timerBar(),
    roundDots(),
    promptEl,
    el("div", { className: "panel", style: "padding:14px;" }, [
      el("label", { text: hasSubmitted ? "Answer submitted:" : "Your answer:" }),
      input,
      submitBtn
    ])
  );

  if (!hasSubmitted) setTimeout(() => document.getElementById("g-write")?.focus(), 120);
}

function doSubmitText(input) {
  const text = input.value.trim();
  if (!text) { toast("Write something first!"); return; }
  submitEntry(text);
}

// ── Draw phase ────────────────────────────────────────────────────────────────
function renderDrawPhase() {
  const chain     = gState.chains[gState.assignments[myIdx]];
  const lastEntry = chain[chain.length - 1]; // always a text entry here

  const phrase = lastEntry ? lastEntry.content : "???";

  const phraseBox = el("div", { className: "panel center", style: "padding:10px 14px;" }, [
    el("p",  { style: "margin:0 0 4px; font-size:0.78rem; font-weight:700; color:var(--lake-light); letter-spacing:1px;", text: "🎨 DRAW THIS PHRASE:" }),
    el("h3", { style: "margin:0; color:#fff; font-size:1.2rem; word-break:break-word;", text: `"${phrase}"` })
  ]);

  const { wrap: canvasPanel, getDataUrl } = buildCanvas();

  const submitBtn = el("button", {
    className: "btn",
    disabled: hasSubmitted,
    style: "width:100%; margin-top:10px;" + (hasSubmitted ? "opacity:0.55;" : ""),
    text: hasSubmitted ? "✓ Submitted — waiting…" : "✅ Submit Drawing",
    onClick: () => { submitEntry(getDataUrl()); }
  });

  mount(
    topbar("🎨 Draw!"),
    timerBar(),
    roundDots(),
    phraseBox,
    canvasPanel,
    submitBtn
  );
}

// ── Canvas ────────────────────────────────────────────────────────────────────
function buildCanvas() {
  const COLORS = ["#111111","#e53935","#43a047","#1e88e5","#f9a825","#8e24aa","#ff6d00","#ffffff"];
  const SIZES  = [{ label: "S", v: 3 }, { label: "M", v: 7 }, { label: "L", v: 15 }];

  // Drawing state
  let penColor = "#111111";
  let penSize  = 7;
  let erasing  = false;
  let drawing  = false;
  let strokes  = [];       // [{color,size,eraser,pts:[{x,y}]}]
  let cur      = [];       // current stroke points
  let lx = 0, ly = 0;

  const canvas = document.createElement("canvas");
  canvas.width  = 400;
  canvas.height = 280;
  canvas.style.cssText = "width:100%; height:auto; display:block; touch-action:none; cursor:crosshair; background:#fff; border-radius:0 0 10px 10px;";

  const ctx = canvas.getContext("2d");
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 400, 280);

  function getXY(e) {
    const r = canvas.getBoundingClientRect();
    const sx = 400 / r.width, sy = 280 / r.height;
    const src = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - r.left) * sx, y: (src.clientY - r.top) * sy };
  }

  function dot(x, y, c, s) {
    ctx.beginPath();
    ctx.arc(x, y, s / 2, 0, Math.PI * 2);
    ctx.fillStyle = c; ctx.fill();
  }

  canvas.addEventListener("pointerdown", e => {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    drawing = true;
    const p = getXY(e); lx = p.x; ly = p.y;
    cur = [{ x: lx, y: ly }];
    const c = erasing ? "#ffffff" : penColor;
    const s = erasing ? penSize * 5 : penSize;
    dot(lx, ly, c, s);
  });

  canvas.addEventListener("pointermove", e => {
    e.preventDefault();
    if (!drawing) return;
    const p = getXY(e);
    const c = erasing ? "#ffffff" : penColor;
    const s = erasing ? penSize * 5 : penSize;
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = c; ctx.lineWidth = s; ctx.stroke();
    cur.push({ x: p.x, y: p.y });
    lx = p.x; ly = p.y;
  });

  const endStroke = () => {
    if (!drawing) return;
    drawing = false;
    strokes.push({ color: penColor, size: penSize, eraser: erasing, pts: cur.slice() });
    cur = [];
  };
  canvas.addEventListener("pointerup",     endStroke);
  canvas.addEventListener("pointercancel", endStroke);

  function redrawAll() {
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 400, 280);
    for (const s of strokes) {
      const c = s.eraser ? "#fff" : s.color;
      const w = s.eraser ? s.size * 5 : s.size;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      if (s.pts.length === 1) {
        dot(s.pts[0].x, s.pts[0].y, c, w);
      } else {
        ctx.beginPath(); ctx.moveTo(s.pts[0].x, s.pts[0].y);
        for (let i = 1; i < s.pts.length; i++) ctx.lineTo(s.pts[i].x, s.pts[i].y);
        ctx.strokeStyle = c; ctx.lineWidth = w; ctx.stroke();
      }
    }
  }

  // ── Build toolbar ─────────────────────────────────────────────────────────
  let activePenBtn  = null;
  let activeSizeBtn = null;

  // Color swatches
  const swatchRow = el("div", { style: "display:flex; gap:5px; flex-wrap:wrap; justify-content:center; padding:8px 8px 4px;" });
  COLORS.forEach(c => {
    const b = document.createElement("button");
    b.style.cssText = `width:30px; height:30px; border-radius:50%; background:${c};
      border:3px solid ${c === penColor ? "var(--water-foam)" : "rgba(255,255,255,0.25)"};
      cursor:pointer; flex-shrink:0; padding:0;`;
    b.addEventListener("click", () => {
      penColor = c; erasing = false;
      swatchRow.querySelectorAll("button").forEach(x => x.style.borderColor = "rgba(255,255,255,0.25)");
      b.style.borderColor = "var(--water-foam)";
      if (activePenBtn) { activePenBtn.style.background = ""; activePenBtn.style.borderColor = "rgba(255,255,255,0.15)"; }
      activePenBtn = null;
    });
    if (c === penColor) { b.style.borderColor = "var(--water-foam)"; }
    swatchRow.appendChild(b);
  });

  // Size + tool row
  const toolRow = el("div", { style: "display:flex; gap:5px; justify-content:center; flex-wrap:wrap; padding:0 8px 8px;" });

  SIZES.forEach(sz => {
    const b = el("button", {
      className: "btn ghost small",
      style: `padding:5px 12px; font-weight:900; margin:0; font-size:0.88rem; min-width:38px;`,
      text: sz.label,
      onClick: () => {
        penSize = sz.v; erasing = false;
        toolRow.querySelectorAll(".sz").forEach(x => { x.style.background = ""; x.style.borderColor = "rgba(255,255,255,0.15)"; });
        b.style.background = "var(--lake)"; b.style.borderColor = "var(--water-foam)";
        activeSizeBtn = b;
      }
    });
    b.classList.add("sz");
    if (sz.v === penSize) { b.style.background = "var(--lake)"; b.style.borderColor = "var(--water-foam)"; activeSizeBtn = b; }
    toolRow.appendChild(b);
  });

  const eraserBtn = el("button", { className: "btn ghost small", style: "padding:5px 12px; margin:0;", text: "🧹",
    onClick: () => { erasing = true; }
  });
  const undoBtn = el("button", { className: "btn ghost small", style: "padding:5px 12px; margin:0;", text: "↩",
    onClick: () => { strokes.pop(); redrawAll(); }
  });
  const clearBtn = el("button", { className: "btn ghost small", style: "padding:5px 12px; margin:0; color:#ef5350;", text: "🗑",
    onClick: () => { strokes = []; redrawAll(); }
  });

  toolRow.appendChild(eraserBtn);
  toolRow.appendChild(undoBtn);
  toolRow.appendChild(clearBtn);

  const toolbar = el("div", { style: "background:rgba(0,0,0,0.35); border-radius:10px 10px 0 0; border-bottom:1px solid rgba(255,255,255,0.08);" }, [
    swatchRow, toolRow
  ]);

  const canvasBorder = el("div", {
    style: "border-radius:12px; overflow:hidden; border:2px solid rgba(255,255,255,0.15); margin-top:8px;"
  });
  canvasBorder.appendChild(toolbar);
  canvasBorder.appendChild(canvas);

  const wrap = el("div", { className: "panel", style: "padding:12px;" }, [ canvasBorder ]);

  return {
    wrap,
    getDataUrl: () => canvas.toDataURL("image/jpeg", 0.55)
  };
}

// ── Submission ────────────────────────────────────────────────────────────────
function submitEntry(content) {
  if (hasSubmitted) return;
  hasSubmitted = true;

  if (isHost) {
    // Host processes its own submission directly
    gState.submissions[myIdx] = content;
    checkAllIn();
  } else {
    relay({ type: "GARTIC_SUBMIT", content });
  }
  renderPhase();
}

// ── Host: check completion + advance ─────────────────────────────────────────
function checkAllIn() {
  if (Object.keys(gState.submissions).length >= gState.players.length) advanceRound();
}

function autoAdvance() {
  if (!isHost || !gState || (gState.phase !== "write" && gState.phase !== "draw")) return;
  // Fill in blanks for missing submissions
  gState.players.forEach((_, i) => {
    if (gState.submissions[i] === undefined) {
      gState.submissions[i] = gState.phase === "draw" ? blankCanvas() : "(no answer)";
    }
  });
  advanceRound();
}

function blankCanvas() {
  const c = document.createElement("canvas");
  c.width = 400; c.height = 280;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#e8e8e8"; ctx.fillRect(0, 0, 400, 280);
  ctx.fillStyle = "#aaa"; ctx.font = "bold 22px sans-serif"; ctx.textAlign = "center";
  ctx.fillText("(no drawing)", 200, 148);
  return c.toDataURL("image/jpeg", 0.6);
}

function advanceRound() {
  const N = gState.players.length;

  // Commit all submissions into their respective chains
  gState.players.forEach((_, pi) => {
    const chainIdx = gState.assignments[pi];
    const content  = gState.submissions[pi];
    if (content !== undefined) {
      gState.chains[chainIdx].push({ type: gState.phase === "draw" ? "draw" : "text", content });
    }
  });

  gState.round++;
  gState.submissions = {};

  if (gState.round > gState.totalRounds) {
    // ── All rounds done → reveal phase ──────────────────────────────────────
    gState.phase = "reveal";
    gState.revealChainIdx = 0;
    gState.revealEntryIdx = -1;
    relay({ type: "GARTIC_SYNC", state: gState });
    applyState(gState);
    saveToGallery(gState); // fire-and-forget from host
    return;
  }

  // ── Rotate chains: player i works on chain (i + round) % N ───────────────
  gState.assignments = gState.players.map((_, i) => (i + gState.round) % N);
  gState.phase    = gState.round % 2 === 0 ? "write" : "draw";
  gState.timerEnd = Date.now() + (gState.phase === "write" ? WRITE_TIME : DRAW_TIME) * 1000;

  relay({ type: "GARTIC_SYNC", state: gState });
  applyState(gState);
}

// ── Reveal phase ──────────────────────────────────────────────────────────────
function renderRevealPhase() {
  const ci    = gState.revealChainIdx;
  const ei    = gState.revealEntryIdx;
  const chain = gState.chains[ci];
  const totalChains = gState.chains.length;
  const authorName  = gState.players[ci];

  const chainEl = el("div", { className: "gartic-chain" });

  if (ei < 0) {
    chainEl.appendChild(el("p", {
      className: "muted center", style: "margin:24px 0; font-style:italic; font-size:0.95rem;",
      text: `Get ready to see ${authorName}'s chain!`
    }));
  } else {
    chain.slice(0, ei + 1).forEach((entry, i) => {
      const authorOfEntry = gState.players[(ci + i) % gState.players.length];
      const card = el("div", { className: "gartic-entry gartic-entry-in" });
      card.appendChild(el("p", {
        style: "font-size:0.72rem; color:var(--lake-light); margin:0 0 6px; font-weight:700; letter-spacing:0.5px;",
        text: authorOfEntry.toUpperCase()
      }));
      if (entry.type === "text") {
        card.appendChild(el("div", {
          style: "font-size:1.1rem; font-weight:700; color:#fff; word-break:break-word; line-height:1.4;",
          text: `"${entry.content}"`
        }));
      } else {
        const img = document.createElement("img");
        img.src = entry.content;
        img.style.cssText = "width:100%; border-radius:10px; display:block;";
        card.appendChild(img);
      }
      chainEl.appendChild(card);
    });
  }

  const atEnd      = ei >= chain.length - 1;
  const lastChain  = ci >= totalChains - 1;

  let actionBtn;
  if (isHost) {
    if (atEnd && lastChain) {
      actionBtn = el("button", { className: "btn", style: "margin-top:12px;", text: "🎉 Finish Game!",
        onClick: () => { gState.phase = "done"; relay({ type: "GARTIC_SYNC", state: gState }); applyState(gState); }
      });
    } else if (atEnd) {
      actionBtn = el("button", { className: "btn", style: "margin-top:12px;", text: "➡️ Next Chain",
        onClick: () => {
          gState.revealChainIdx++;
          gState.revealEntryIdx = -1;
          relay({ type: "GARTIC_SYNC", state: gState }); applyState(gState);
        }
      });
    } else {
      actionBtn = el("button", { className: "btn", style: "margin-top:12px;", text: "▶️ Reveal Next",
        onClick: () => {
          gState.revealEntryIdx++;
          relay({ type: "GARTIC_SYNC", state: gState }); applyState(gState);
        }
      });
    }
  } else {
    actionBtn = el("p", { className: "muted center", style: "margin-top:14px; font-size:0.9rem;", text: "Host is controlling the reveal…" });
  }

  mount(
    topbar("📖 Reveal!"),
    el("div", { className: "panel center", style: "padding:10px 14px;" }, [
      el("p",  { style: "margin:0 0 2px; font-size:0.75rem; color:var(--lake-light); font-weight:700; letter-spacing:1px;", text: `CHAIN ${ci + 1} OF ${totalChains}` }),
      el("h3", { style: "margin:0; color:var(--water-foam);", text: `📖 ${authorName}'s Chain` })
    ]),
    el("div", { className: "panel", style: "padding:14px; max-height:60vh; overflow-y:auto;" }, [chainEl]),
    actionBtn
  );
}

// ── Done screen ───────────────────────────────────────────────────────────────
function renderDonePhase() {
  mount(
    topbar("🎉 Done!"),
    el("div", { className: "panel center", style: "padding:28px 20px;" }, [
      el("div", { style: "font-size:3.5rem; margin-bottom:12px;", text: "🎨" }),
      el("h2", { style: "margin:0 0 8px; color:var(--water-foam);", text: "Game saved to gallery!" }),
      el("p",  { className: "muted", style: "margin:0 0 24px; font-size:0.9rem;",
        text: "The full chain is saved permanently. View it anytime in the Art Gallery 🖼️" })
    ]),
    el("div", { className: "btn-row", style: "flex-direction:column; gap:10px;" }, [
      el("button", { className: "btn", text: "🏠 Back to Home", onClick: () => { resetAll(); goHome(); } })
    ])
  );
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function topbar(title) {
  return el("div", { className: "topbar" }, [
    el("button", { className: "back", text: "‹ Leave",
      onClick: () => {
        if (!gState || gState.phase === "lobby" || gState.phase === "done" || confirm("Leave the game?")) {
          resetAll(); goHome();
        }
      }
    }),
    el("div", { className: "title", text: title }),
    el("span", { style: "width:64px" })
  ]);
}

function timerBar() {
  const secs = Math.max(0, Math.ceil((gState.timerEnd - Date.now()) / 1000));
  return el("div", {
    id: "g-timer",
    style: `font-size:1.5rem; font-weight:900; color:var(--sunset); text-align:center;
            margin-bottom:4px; letter-spacing:2px; text-shadow:0 1px 6px rgba(0,0,0,0.4);`,
    text: `⏱ ${secs}s`
  });
}

function roundDots() {
  const N    = gState.totalRounds + 1;
  const wrap = el("div", { style: "text-align:center; margin-bottom:10px;" });
  for (let i = 0; i <= gState.totalRounds; i++) {
    const dot = document.createElement("span");
    dot.textContent = i < gState.round ? "●" : i === gState.round ? "◉" : "○";
    dot.style.cssText = `margin:0 3px; font-size:1rem; color:${
      i < gState.round ? "var(--sunset)" : i === gState.round ? "var(--water-foam)" : "rgba(255,255,255,0.3)"
    };`;
    wrap.appendChild(dot);
  }
  return wrap;
}

function renderSpinner(msg) {
  mount(
    el("div", { className: "topbar" }, [
      el("button", { className: "back", text: "‹ Back", onClick: () => { resetAll(); goHome(); } }),
      el("div",    { className: "title", text: "Lake House Doodles 🎨" }),
      el("span",   { style: "width:64px" })
    ]),
    el("div", { className: "panel center", style: "padding:40px 20px;" }, [
      el("div", { className: "big-emoji spin", style: "font-size:3rem;", text: "🎨" }),
      el("h3",  { style: "margin-top:16px;", text: msg })
    ])
  );
}

// ── Gallery save ──────────────────────────────────────────────────────────────
async function saveToGallery(state) {
  try {
    const game = {
      id:       Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      date:     new Date().toISOString(),
      players:  state.players,
      isMonkey: state.isMonkey,
      chains:   state.chains,
    };
    await fetch(`${HTTP_BASE}/gartic/save`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(game),
      signal:  AbortSignal.timeout(15000),
    });
    console.log("[Doodles] ✓ Game saved to gallery.");
  } catch (e) {
    console.warn("[Doodles] Gallery save failed:", e.message);
    toast("⚠️ Gallery save failed (offline?)");
  }
}
