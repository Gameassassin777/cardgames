// Lake House Doodles 🎨 — Gartic Phone-style game.
// Features: open room browser, chaos game modes, blur/rotate, TTS, background art slideshow.
import { el, mount, toast } from "./ui.js";

const WS_BASE = location.hostname === "localhost" || location.hostname === "127.0.0.1"
  ? "ws://localhost:3000"
  : "wss://lakehouse-cardgames-sync.gameassassin777.workers.dev";

const HTTP_BASE = location.hostname === "localhost" || location.hostname === "127.0.0.1"
  ? "http://localhost:3000"
  : "https://lakehouse-cardgames-sync.gameassassin777.workers.dev";

const MIN_PLAYERS = 3;

// Default game settings (host overrides these before starting)
const DEFAULT_SETTINGS = {
  writeTime:   60,      // seconds
  drawTime:    90,
  blurPx:      0,       // 0 = off, up to 20
  chaosMode:   "none",  // "none"|"rorschach"|"whisper"|"classified"|"threewords"
  drawStyle:   "normal",// "normal"|"mirror"|"night"|"impressionist"|"speeddemon"
  tts:         false,
  privateRoom: false,
};

// ── Module state ──────────────────────────────────────────────────────────────
let goHome        = () => {};
let socket        = null;
let roomCode      = "";
let myName        = "";
let isHost        = false;
let myIdx         = -1;
let gState        = null;
let timerHandle   = null;
let autoAdvHandle = null;
let hasSubmitted  = false;
let heartbeatInt  = null;   // room browser heartbeat
let artBgEl       = null;   // background art slideshow element
let artBgImages   = [];     // pool of image URLs from gallery
let artBgIdx      = 0;
let artBgTimer    = null;
let hostSettings  = { ...DEFAULT_SETTINGS }; // host-local, sent on game start

// ── Entry point ───────────────────────────────────────────────────────────────
export function start(home) {
  goHome = home;
  resetAll();
  renderSetup();
}

function resetAll() {
  if (socket)        { try { socket.close(); } catch (_) {} socket = null; }
  if (timerHandle)   { clearInterval(timerHandle);   timerHandle = null; }
  if (autoAdvHandle) { clearTimeout(autoAdvHandle);  autoAdvHandle = null; }
  if (heartbeatInt)  { clearInterval(heartbeatInt);  heartbeatInt = null; }
  if (artBgTimer)    { clearInterval(artBgTimer);    artBgTimer = null; }
  if (roomBrowserRefresh) { clearInterval(roomBrowserRefresh); roomBrowserRefresh = null; }
  if (artBgEl)       { artBgEl.remove(); artBgEl = null; }
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  roomCode = ""; myName = ""; isHost = false; myIdx = -1;
  gState = null; hasSubmitted = false;
  artBgImages = []; artBgIdx = 0;
}

// ── Setup screen ──────────────────────────────────────────────────────────────
function renderSetup() {
  const savedName = localStorage.getItem("gartic.name") || "";

  const nameInput = el("input", {
    type: "text", placeholder: "Your name…", value: savedName, id: "g-name",
    style: "font-size:1.1rem; border-radius:14px; text-align:center; margin-bottom:14px;"
  });

  const codeInput = el("input", {
    type: "text", placeholder: "4-letter code", id: "g-code", maxLength: 4,
    style: "font-size:1.3rem; border-radius:14px; text-align:center; text-transform:uppercase; letter-spacing:6px; margin-bottom:10px; width:100%;"
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
      el("label", { style: "margin-top:18px;", text: "👀 Browse Open Rooms" }),
      el("button", { className: "btn ghost", style: "width:100%; margin-top:6px;", text: "📋 Browse Rooms",
        onClick: () => { const n = getName(); if (n) { myName = n; renderRoomBrowser(); } }
      }),
      el("label", { style: "margin-top:14px;", text: "🔑 Join by Code" }),
      codeInput,
      el("button", { className: "btn ghost", style: "width:100%; margin-top:4px;", text: "Join →",
        onClick: () => {
          const n = getName(); if (!n) return;
          const code = codeInput.value.trim().toUpperCase();
          if (code.length !== 4) { toast("Enter a 4-letter room code!"); return; }
          myName = n; connectRoom("join", code);
        }
      })
    ])
  );
}

// ── Room browser ──────────────────────────────────────────────────────────────
let roomBrowserRefresh = null;

function renderRoomBrowser() {
  if (roomBrowserRefresh) { clearInterval(roomBrowserRefresh); roomBrowserRefresh = null; }

  const listEl = el("div", { className: "room-browser-list", id: "room-list" });
  const loadRooms = async () => {
    try {
      const res   = await fetch(`${HTTP_BASE}/rooms/list?game=gartic`, { signal: AbortSignal.timeout(5000) });
      const rooms = await res.json();
      listEl.innerHTML = "";
      const weirdOn = localStorage.getItem("lakehouse.weird_unlocked") === "true";
      // Filter out private rooms and hide Monkey Mode rooms if weird mode is not unlocked
      const visible = rooms.filter(r => !r.private && (!r.isMonkey || weirdOn));
      if (visible.length === 0) {
        listEl.appendChild(el("p", { className: "muted center", style: "margin:20px 0; font-style:italic;", text: "No open rooms right now — create one!" }));
        return;
      }
      visible.forEach(r => {
        // Build settings badges
        const badgeElements = [];
        if (r.chaosMode && r.chaosMode !== "none") {
          const labels = {
            rorschach: "🔄 Rorschach",
            whisper: "📵 Whisper",
            classified: "📜 Classified",
            threewords: "3️⃣ 3 Words"
          };
          if (labels[r.chaosMode]) {
            badgeElements.push(el("span", {
              style: "display:inline-block; background:rgba(0,188,212,0.15); border:1px solid rgba(0,188,212,0.3); border-radius:4px; padding:1px 4px; font-size:0.65rem; color:var(--water-foam); font-weight:700; margin-right:4px; margin-top:4px;",
              text: labels[r.chaosMode]
            }));
          }
        }
        if (r.drawStyle && r.drawStyle !== "normal") {
          const labels = {
            mirror: "🪞 Mirror",
            night: "🌃 Night",
            impressionist: "💥 Impressionist",
            speeddemon: "⚡ Speed"
          };
          if (labels[r.drawStyle]) {
            badgeElements.push(el("span", {
              style: "display:inline-block; background:rgba(255,109,0,0.15); border:1px solid rgba(255,109,0,0.3); border-radius:4px; padding:1px 4px; font-size:0.65rem; color:var(--sunset); font-weight:700; margin-right:4px; margin-top:4px;",
              text: labels[r.drawStyle]
            }));
          }
        }
        if (r.isMonkey) {
          badgeElements.push(el("span", {
            style: "display:inline-block; background:rgba(255,215,0,0.1); border:1px solid rgba(255,215,0,0.3); border-radius:4px; padding:1px 4px; font-size:0.65rem; color:var(--sunset); font-weight:700; margin-right:4px; margin-top:4px;",
            text: "🐒 Monkey"
          }));
        }

        const info = el("div", { className: "room-info" }, [
          el("div", { style: "display:flex; align-items:baseline;" }, [
            el("span", { style: "font-weight:700; color:#fff;", text: r.host }),
            el("span", { style: "margin-left:8px; font-size:0.8rem; color:var(--lake-light);", text: `${r.playerCount} player${r.playerCount !== 1 ? "s" : ""}` })
          ]),
          badgeElements.length > 0 ? el("div", { style: "display:flex; flex-wrap:wrap; margin-top:2px;" }, badgeElements) : null
        ]);

        const row = el("div", { className: "room-row" }, [
          info,
          el("button", { className: "btn small", style: "margin:0; padding:6px 14px; font-size:0.85rem;", text: "Join",
            onClick: () => { clearInterval(roomBrowserRefresh); connectRoom("join", r.code); }
          })
        ]);
        listEl.appendChild(row);
      });
    } catch (e) {
      listEl.innerHTML = `<p class="muted center" style="margin:16px 0;">Couldn't load rooms.</p>`;
    }
  };

  loadRooms();
  roomBrowserRefresh = setInterval(loadRooms, 8000);

  mount(
    el("div", { className: "topbar" }, [
      el("button", { className: "back", text: "‹ Back", onClick: () => { clearInterval(roomBrowserRefresh); renderSetup(); } }),
      el("div",    { className: "title", text: "Open Rooms" }),
      el("span",   { style: "width:64px" })
    ]),
    el("div", { className: "panel center", style: "padding:10px 14px;" }, [
      el("p", { className: "muted", style: "margin:0; font-size:0.82rem;", text: "Refreshes every 8s. Tap Join to enter." })
    ]),
    el("div", { className: "panel", style: "padding:10px;" }, [listEl]),
    el("button", { className: "btn ghost", style: "margin-top:4px;", text: "🔄 Refresh",
      onClick: () => loadRooms()
    })
  );
}

// ── Networking ────────────────────────────────────────────────────────────────
function connectRoom(type, code = "") {
  renderSpinner(type === "create" ? "Creating room…" : `Joining ${code}…`);

  const url = type === "create"
    ? `${WS_BASE}/ws/create?name=${enc(myName)}&game=gartic`
    : `${WS_BASE}/ws/join?code=${code}&name=${enc(myName)}&game=gartic`;

  isHost = (type === "create");
  socket = new WebSocket(url);
  socket.onopen = () => console.log("[Doodles] Socket open");

  socket.onmessage = (ev) => {
    try {
      const d = JSON.parse(ev.data);
      if      (d.type === "created")       { roomCode = d.code; applyLobby(d.players); }
      else if (d.type === "player_joined") { roomCode = d.code; applyLobby(d.players); }
      else if (d.type === "player_left")   { applyLobby(d.players); if (gState?.phase !== "lobby") toast(`${d.name} left.`); }
      else if (d.type === "relay")         { handleRelay(d.action, d.sender); }
      else if (d.type === "error")         { toast(d.message || "Error"); resetAll(); renderSetup(); }
    } catch (e) { console.error("[Doodles] Parse error:", e); }
  };

  socket.onclose = () => {
    stopHeartbeat();
    if (gState && gState.phase !== "done") { toast("Disconnected."); resetAll(); renderSetup(); }
  };
  socket.onerror = () => { toast("Connection failed."); resetAll(); renderSetup(); };
}

function relay(action) {
  if (!socket || socket.readyState !== 1) return;
  socket.send(JSON.stringify({ type: "relay", code: roomCode, sender: myName, action }));
}

function enc(s) { return encodeURIComponent(s); }

// ── Heartbeat (room browser) ──────────────────────────────────────────────────
function startHeartbeat(playerCount = 1) {
  stopHeartbeat();
  const ping = () => fetch(`${HTTP_BASE}/rooms/heartbeat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: roomCode, playerCount: gState?.players?.length || playerCount })
  }).catch(() => {});
  ping();
  heartbeatInt = setInterval(ping, 25000);
}

function stopHeartbeat() {
  if (heartbeatInt) { clearInterval(heartbeatInt); heartbeatInt = null; }
}

async function registerRoom(settings) {
  try {
    await fetch(`${HTTP_BASE}/rooms/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: roomCode, host: myName, playerCount: gState?.players?.length || 1,
        game: "gartic", private: settings.privateRoom,
        isMonkey: localStorage.getItem("lakehouse.weird_unlocked") === "true",
        chaosMode: settings.chaosMode,
        drawStyle: settings.drawStyle,
        lastPing: Date.now()
      }),
    });
  } catch (_) {}
}

async function unregisterRoom() {
  if (!roomCode) return;
  try {
    await fetch(`${HTTP_BASE}/rooms/unregister`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: roomCode }),
    });
  } catch (_) {}
}

// ── Lobby ─────────────────────────────────────────────────────────────────────
function applyLobby(players) {
  if (gState && gState.phase !== "lobby") {
    // If the game is in progress and we receive a player_joined notification,
    // broadcast the current active state to let the rejoining player recover!
    // This works even if the host is the one rejoining, as any active client will sync them.
    relay({ type: "GARTIC_SYNC", state: gState });
    return;
  }
  gState = { phase: "lobby", players };
  myIdx  = players.indexOf(myName);

  // Host registers room and starts heartbeat
  if (isHost && roomCode) {
    registerRoom(hostSettings);
    startHeartbeat(players.length);
  }
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

  // Host settings panel
  const settingsEl = isHost ? buildSettingsPanel() : null;

  mount(
    topbar("🎨 Lobby"),
    el("div", { className: "wood-panel center" }, [
      el("p",  { className: "muted", style: "margin:0 0 4px; font-size:0.8rem;", text: "ROOM CODE" }),
      el("h1", { style: "font-size:3rem; letter-spacing:8px; font-family:monospace; color:#fff; margin:0 0 8px; text-shadow:0 2px 8px var(--shadow);", text: roomCode }),
      el("p",  { className: "muted", style: "font-size:0.82rem; margin:0;",
        text: hostSettings.privateRoom ? "🔒 Private room — share code only" : "Public room · share code to invite!" })
    ]),
    el("div", { className: "panel" }, [
      el("label", { text: `Players (${players.length})` }),
      list
    ]),
    settingsEl,
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

// ── Host settings panel ───────────────────────────────────────────────────────
function buildSettingsPanel() {
  const s = hostSettings; // reference — mutated in place

  const mkSlider = (label, key, min, max, unit) => {
    const valSpan = el("span", { style: "font-weight:700; color:var(--water-foam);", text: `${s[key]}${unit}` });
    const slider  = el("input", { type: "range", min: String(min), max: String(max), value: String(s[key]),
      style: "width:100%; margin-top:4px;"
    });
    slider.addEventListener("input", () => { s[key] = Number(slider.value); valSpan.textContent = `${s[key]}${unit}`; });
    return el("div", { style: "margin-bottom:10px;" }, [
      el("div", { style: "display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; color:var(--lake-light);", text: "" }, [
        el("span", { text: label }), valSpan
      ]),
      slider
    ]);
  };

  const mkRadio = (label, key, value, emoji) => {
    const btn = el("button", {
      className: "btn ghost small",
      style: `margin:3px; padding:6px 10px; font-size:0.78rem; ${s[key] === value ? "background:var(--lake); border-color:var(--water-foam);" : ""}`,
      text: `${emoji} ${label}`,
      onClick: () => {
        s[key] = value;
        // re-highlight all in group
        group.querySelectorAll("button").forEach(b => { b.style.background = ""; b.style.borderColor = "rgba(255,255,255,0.15)"; });
        btn.style.background = "var(--lake)"; btn.style.borderColor = "var(--water-foam)";
        registerRoom(s);
      }
    });
    return btn;
  };

  const mkToggle = (label, key, emoji) => {
    const btn = el("button", {
      className: "btn ghost small",
      style: `width:100%; margin-bottom:6px; ${s[key] ? "background:var(--lake); border-color:var(--water-foam);" : ""}`,
      text: `${emoji} ${label}`,
      onClick: () => {
        s[key] = !s[key];
        btn.style.background   = s[key] ? "var(--lake)" : "";
        btn.style.borderColor  = s[key] ? "var(--water-foam)" : "rgba(255,255,255,0.15)";
        registerRoom(s);
        if (key === "privateRoom") {
          // Re-render lobby to update the room code display
          renderLobby();
        }
      }
    });
    return btn;
  };

  // Chaos mode radio group
  const chaosOptions = [
    { label: "Normal",       value: "none",        emoji: "😊" },
    { label: "Rorschach",    value: "rorschach",   emoji: "🔄" },
    { label: "Whisper",      value: "whisper",     emoji: "📵" },
    { label: "Classified",   value: "classified",  emoji: "📜" },
    { label: "3 Words Max",  value: "threewords",  emoji: "3️⃣" },
  ];
  const group = el("div", { style: "display:flex; flex-wrap:wrap; gap:4px; margin-bottom:10px;" });
  chaosOptions.forEach(({ label, value, emoji }) => group.appendChild(mkRadio(label, "chaosMode", value, emoji)));

  // Draw style radio group
  const drawOptions = [
    { label: "Normal",       value: "normal",      emoji: "✏️" },
    { label: "Mirror",       value: "mirror",      emoji: "🪞" },
    { label: "Night",        value: "night",       emoji: "🌃" },
    { label: "Impressionist",value: "impressionist",emoji: "💥" },
    { label: "Speed Demon",  value: "speeddemon",  emoji: "⚡" },
  ];
  const drawGroup = el("div", { style: "display:flex; flex-wrap:wrap; gap:4px; margin-bottom:10px;" });
  drawOptions.forEach(({ label, value, emoji }) => drawGroup.appendChild(mkRadio(label, "drawStyle", value, emoji)));

  return el("div", { className: "panel settings-section" }, [
    el("label", { style: "font-size:0.9rem; font-weight:700; color:var(--water-foam); margin-bottom:10px;", text: "⚙️ Game Settings (Host Only)" }),
    mkSlider("✍️ Write Time", "writeTime", 10, 120, "s"),
    mkSlider("🎨 Draw Time",  "drawTime",  10, 120, "s"),
    mkSlider("🔵 Blur (shown drawing)", "blurPx", 0, 20, "px"),
    el("div", { style: "font-size:0.82rem; color:var(--lake-light); margin-bottom:4px;", text: "🎭 Chaos Mode:" }),
    group,
    el("div", { style: "font-size:0.82rem; color:var(--lake-light); margin-bottom:4px;", text: "🖌️ Draw Style:" }),
    drawGroup,
    mkToggle("🔊 Read Text Entries Aloud (TTS)", "tts", "🔊"),
    mkToggle("🔒 Private Room (code required to join)", "privateRoom", "🔒"),
  ]);
}

// ── Game start ────────────────────────────────────────────────────────────────
function hostStartGame() {
  unregisterRoom(); // remove from browser — game is starting
  stopHeartbeat();

  const players  = gState.players.slice();
  const N        = players.length;
  const isMonkey = localStorage.getItem("lakehouse.weird_unlocked") === "true";

  // Apply speed demon timer override
  const writeTime = hostSettings.drawStyle === "speeddemon" ? 15 : hostSettings.writeTime;
  const drawTime  = hostSettings.drawStyle === "speeddemon" ? 20 : hostSettings.drawTime;

  const state = {
    phase: "write",
    round: 0,
    totalRounds: N - 1,
    players,
    chains:      players.map(() => []),
    assignments: players.map((_, i) => i),
    submissions: {},
    timerEnd:    Date.now() + writeTime * 1000,
    isMonkey,
    revealChainIdx: 0,
    revealEntryIdx: -1,
    settings: { ...hostSettings, writeTime, drawTime },
  };

  relay({ type: "GARTIC_SYNC", state });
  applyState(state);
  prefetchArtBackground(isMonkey);
}

// ── Relay handler ─────────────────────────────────────────────────────────────
function handleRelay(action, sender) {
  if (action.type === "GARTIC_SYNC") { applyState(action.state); return; }
  if (!isHost) return;
  if (action.type === "GARTIC_SUBMIT") {
    // Verify round to prevent stale, delayed submissions from previous rounds overriding new ones
    if (action.round !== undefined && action.round !== gState.round) return;
    const idx = gState.players.indexOf(sender);
    if (idx === -1 || gState.submissions[idx] !== undefined) return;
    gState.submissions[idx] = action.content;
    checkAllIn();
  }
}

// ── State machine ─────────────────────────────────────────────────────────────
function applyState(state) {
  gState       = state;
  myIdx        = gState.players.indexOf(myName);
  isHost       = (myIdx === 0); // host is always the first player in the list
  hasSubmitted = gState.submissions[myIdx] !== undefined;

  if (timerHandle)   { clearInterval(timerHandle);  timerHandle = null; }
  if (autoAdvHandle) { clearTimeout(autoAdvHandle); autoAdvHandle = null; }

  renderPhase();

  if (gState.phase === "write" || gState.phase === "draw") {
    timerHandle = setInterval(tickTimer, 500);
    if (isHost) {
      const delay = Math.max(0, gState.timerEnd - Date.now()) + 800;
      autoAdvHandle = setTimeout(autoAdvance, delay);
    }
  }
}

function tickTimer() {
  const timerEl = document.getElementById("g-timer");
  if (!timerEl) return;
  const secs = Math.max(0, Math.ceil((gState.timerEnd - Date.now()) / 1000));
  timerEl.textContent = `⏱ ${secs}s`;
  if (secs <= 10) timerEl.style.color = "#ef5350";
  if (secs === 0 && timerHandle) { clearInterval(timerHandle); timerHandle = null; }
}

function renderPhase() {
  if (gState.phase !== "lobby" && gState.phase !== "done" && myIdx === -1) {
    mount(
      topbar("👁️ Spectating"),
      el("div", { className: "panel center", style: "padding:40px 20px;" }, [
        el("div", { style: "font-size:3rem; margin-bottom:12px;", text: "🍿" }),
        el("h3",  { style: "margin:0 0 8px; color:var(--water-foam);", text: "Game in progress!" }),
        el("p",   { className: "muted", style: "margin:0;", text: "You are spectating this game. You will be able to play in the next lobby!" })
      ])
    );
    return;
  }

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
  const cfg       = gState.settings || DEFAULT_SETTINGS;
  const chain     = gState.chains[gState.assignments[myIdx]];
  const lastEntry = chain[chain.length - 1];

  let promptEl;
  if (lastEntry && lastEntry.type === "draw") {
    // Build the image with all chaos mode effects
    const img = document.createElement("img");
    img.src = lastEntry.content;

    let rotation = 0;
    const filters = [];
    if (cfg.blurPx > 0) filters.push(`blur(${cfg.blurPx}px)`);
    if (cfg.chaosMode === "rorschach") {
      const angles = [0, 90, 180, 270];
      rotation = angles[Math.floor(Math.random() * angles.length)];
      filters.push(`blur(${Math.max(4, cfg.blurPx)}px)`);
    }

    img.style.cssText = `width:100%; border-radius:12px; display:block; margin-top:10px;
      border:2px solid rgba(255,255,255,0.15);
      filter:${filters.length ? filters.join(" ") : "none"};
      transform:rotate(${rotation}deg);
      transition:filter 0.3s;`;

    const label = cfg.chaosMode === "rorschach"
      ? "🔄 WHAT IS THIS ROTATED BLURRY THING??"
      : cfg.blurPx > 0
        ? `🔵 WHAT IS THIS DRAWING? (blurred ${cfg.blurPx}px)`
        : "✍️ WHAT IS THIS DRAWING?";

    // Whisper: hide image after 5s
    if (cfg.chaosMode === "whisper" && !hasSubmitted) {
      setTimeout(() => {
        img.style.filter = "blur(30px) brightness(0.1)";
        img.title = "😱 Time's up — draw from memory!";
      }, 5000);
    }

    promptEl = el("div", { className: "panel center", style: "padding:14px;" }, [
      el("p", { style: "margin:0 0 6px; font-weight:700; color:var(--water-foam); font-size:0.88rem;", text: label }),
      img
    ]);

  } else {
    promptEl = el("div", { className: "panel center", style: "padding:14px;" }, [
      el("h3", { style: "margin:0 0 6px; color:var(--water-foam);", text: "✍️ Write any phrase!" }),
      el("p",  { className: "muted", style: "margin:0; font-size:0.88rem;",
        text: "Funny, weird, completely random. The next person will draw it." })
    ]);
  }

  // Classified mode: if describing a drawing, show redacted version placeholder
  if (cfg.chaosMode === "classified" && lastEntry?.type === "text") {
    const text = lastEntry.content;
    const words = text.split(" ");
    const redacted = words.map((w, idx) => {
      // Deterministic hash based on word content, index and round
      const key = text + idx + gState.round;
      let hash = 0;
      for (let i = 0; i < key.length; i++) {
        hash = (hash << 5) - hash + key.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash) % 100 < 45 ? "█".repeat(w.length) : w;
    }).join(" ");
    promptEl = el("div", { className: "panel center", style: "padding:14px;" }, [
      el("p", { style: "margin:0 0 6px; font-weight:700; color:var(--sunset); font-size:0.88rem;", text: "📜 [CLASSIFIED] DESCRIBE THIS:" }),
      el("div", { style: "font-size:1.1rem; font-weight:700; color:#fff; letter-spacing:2px; word-break:break-all; line-height:1.8;", text: redacted })
    ]);
  }

  const maxWords = cfg.chaosMode === "threewords" ? 3 : null;
  const placeholder = maxWords ? "3 words max…" : (lastEntry ? "What do you see…" : "Type a phrase…");

  const input = el("input", {
    type: "text", id: "g-write", placeholder,
    disabled: hasSubmitted,
    style: "font-size:1.05rem; border-radius:14px; text-align:center; margin-bottom:10px;"
  });

  if (maxWords) {
    input.addEventListener("input", () => {
      const words = input.value.trim().split(/\s+/).filter(Boolean);
      if (words.length > maxWords) { input.value = words.slice(0, maxWords).join(" "); }
    });
  }

  input.addEventListener("keydown", e => { if (e.key === "Enter") doSubmitText(input, maxWords); });

  const submitBtn = el("button", {
    className: "btn", disabled: hasSubmitted,
    style: hasSubmitted ? "opacity:0.55;" : "",
    text: hasSubmitted ? "✓ Submitted — waiting…" : "✅ Submit",
    onClick: () => doSubmitText(input, maxWords)
  });

  const modeHint = maxWords
    ? el("p", { style: "text-align:center; font-size:0.8rem; color:var(--sunset); margin-bottom:6px;", text: "3️⃣ THREE WORDS MAX!" })
    : null;

  mount(
    topbar("✍️ Write!"),
    timerBar(),
    roundDots(),
    promptEl,
    el("div", { className: "panel", style: "padding:14px;" }, [
      modeHint,
      el("label", { text: hasSubmitted ? "Answer submitted:" : "Your answer:" }),
      input,
      submitBtn
    ])
  );

  if (!hasSubmitted) setTimeout(() => document.getElementById("g-write")?.focus(), 120);
}

function doSubmitText(input, maxWords) {
  let text = input.value.trim();
  if (!text) { toast("Write something first!"); return; }
  if (maxWords) {
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length > maxWords) { toast(`Max ${maxWords} words!`); return; }
  }
  submitEntry(text);
}

// ── Draw phase ────────────────────────────────────────────────────────────────
function renderDrawPhase() {
  const cfg       = gState.settings || DEFAULT_SETTINGS;
  const chain     = gState.chains[gState.assignments[myIdx]];
  const lastEntry = chain[chain.length - 1];
  const phrase    = lastEntry ? lastEntry.content : "???";

  const phraseBox = el("div", { className: "panel center", style: "padding:10px 14px;" }, [
    el("p",  { style: "margin:0 0 4px; font-size:0.78rem; font-weight:700; color:var(--lake-light); letter-spacing:1px;", text: "🎨 DRAW THIS PHRASE:" }),
    el("h3", { style: "margin:0; color:#fff; font-size:1.2rem; word-break:break-word;", text: `"${phrase}"` })
  ]);

  // Whisper mode: hide phrase after 5s
  if (cfg.chaosMode === "whisper" && !hasSubmitted) {
    const phraseText = phraseBox.querySelector("h3");
    setTimeout(() => {
      phraseText.style.filter = "blur(8px)";
      phraseText.title = "😱 Gone! Draw from memory!";
    }, 5000);
  }

  const { wrap: canvasPanel, getDataUrl } = buildCanvas(cfg);

  const submitBtn = el("button", {
    className: "btn", disabled: hasSubmitted,
    style: "width:100%; margin-top:10px;" + (hasSubmitted ? "opacity:0.55;" : ""),
    text: hasSubmitted ? "✓ Submitted — waiting…" : "✅ Submit Drawing",
    onClick: () => submitEntry(getDataUrl())
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

// ── Canvas builder ────────────────────────────────────────────────────────────
function buildCanvas(cfg = DEFAULT_SETTINGS) {
  const nightMode       = cfg.drawStyle === "night";
  const mirrorMode      = cfg.drawStyle === "mirror";
  const impressionMode  = cfg.drawStyle === "impressionist";

  const BG_COLOR  = nightMode ? "#0a0a0a" : "#ffffff";
  const BASE_COLORS = nightMode
    ? ["#39ff14","#ff073a","#00d4ff","#ff6600","#ffff00","#ff69b4","#ffffff","#3d5afe","#d500f9","#8d6e63","#b0bec5"]
    : ["#111111","#e53935","#43a047","#1e88e5","#f9a825","#ff6d00","#ffffff","#3949ab","#7c4dff","#795548","#757575"];
  const SIZES = impressionMode
    ? [{ label: "XL", v: 20 }, { label: "XXL", v: 35 }]
    : [{ label: "S", v: 3 }, { label: "M", v: 7 }, { label: "L", v: 15 }];

  let penColor = BASE_COLORS[0];
  let penSize  = impressionMode ? 20 : 7;
  let erasing  = false;
  let drawing  = false;
  let strokes  = [];
  let cur      = [];
  let lx = 0, ly = 0;

  const canvas  = document.createElement("canvas");
  canvas.width  = 400; canvas.height = 280;
  canvas.style.cssText = `width:100%; height:auto; display:block; touch-action:none; cursor:crosshair; background:${BG_COLOR}; border-radius:0 0 10px 10px;`;
  if (mirrorMode) canvas.style.transform = "scaleX(-1)";

  const ctx = canvas.getContext("2d");
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.fillStyle = BG_COLOR; ctx.fillRect(0, 0, 400, 280);

  function getXY(e) {
    const r = canvas.getBoundingClientRect();
    const sx = 400 / r.width, sy = 280 / r.height;
    const src = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - r.left) * sx, y: (src.clientY - r.top) * sy };
  }

  function dot(x, y, c, s) {
    ctx.beginPath(); ctx.arc(x, y, s / 2, 0, Math.PI * 2);
    ctx.fillStyle = c; ctx.fill();
  }

  canvas.addEventListener("pointerdown", e => {
    e.preventDefault(); canvas.setPointerCapture(e.pointerId);
    drawing = true;
    const p = getXY(e); lx = p.x; ly = p.y; cur = [{ x: lx, y: ly }];
    dot(lx, ly, erasing ? BG_COLOR : penColor, erasing ? penSize * 5 : penSize);
  });

  canvas.addEventListener("pointermove", e => {
    e.preventDefault(); if (!drawing) return;
    const p = getXY(e);
    const c = erasing ? BG_COLOR : penColor;
    const w = erasing ? penSize * 5 : penSize;
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = c; ctx.lineWidth = w; ctx.stroke();
    cur.push({ x: p.x, y: p.y }); lx = p.x; ly = p.y;
  });

  const endStroke = () => {
    if (!drawing) return; drawing = false;
    strokes.push({ color: penColor, size: penSize, eraser: erasing, pts: cur.slice() }); cur = [];
  };
  canvas.addEventListener("pointerup",     endStroke);
  canvas.addEventListener("pointercancel", endStroke);

  function redrawAll() {
    ctx.fillStyle = BG_COLOR; ctx.fillRect(0, 0, 400, 280);
    for (const s of strokes) {
      const c = s.eraser ? BG_COLOR : s.color;
      const w = s.eraser ? s.size * 5 : s.size;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      if (s.pts.length === 1) { dot(s.pts[0].x, s.pts[0].y, c, w); }
      else {
        ctx.beginPath(); ctx.moveTo(s.pts[0].x, s.pts[0].y);
        for (let i = 1; i < s.pts.length; i++) ctx.lineTo(s.pts[i].x, s.pts[i].y);
        ctx.strokeStyle = c; ctx.lineWidth = w; ctx.stroke();
      }
    }
  }

  // Toolbar
  const swatchRow = el("div", { style: "display:flex; gap:5px; flex-wrap:wrap; justify-content:center; padding:8px 8px 4px;" });
  const eraserBtn = el("button", { className: "btn ghost small eraser-btn", style: "padding:5px 12px; margin:0;", text: "🧹",
    onClick: () => {
      erasing = true;
      // Clear color highlight borders
      swatchRow.querySelectorAll("button").forEach(x => x.style.borderColor = "rgba(255,255,255,0.25)");
      // Clear size button highlights
      toolRow.querySelectorAll(".sz").forEach(x => { x.style.background = ""; x.style.borderColor = "rgba(255,255,255,0.15)"; });
      // Highlight eraser button
      eraserBtn.style.background = "var(--lake)"; eraserBtn.style.borderColor = "var(--water-foam)";
    }
  });

  BASE_COLORS.forEach(c => {
    const b = document.createElement("button");
    b.style.cssText = `width:30px; height:30px; border-radius:50%; background:${c};
      border:3px solid ${c === penColor ? "var(--water-foam)" : "rgba(255,255,255,0.25)"};
      cursor:pointer; flex-shrink:0; padding:0;`;
    b.addEventListener("click", () => {
      penColor = c; erasing = false;
      swatchRow.querySelectorAll("button").forEach(x => x.style.borderColor = "rgba(255,255,255,0.25)");
      b.style.borderColor = "var(--water-foam)";
      if (eraserBtn) { eraserBtn.style.background = ""; eraserBtn.style.borderColor = "rgba(255,255,255,0.15)"; }
      // Re-highlight current size button if erased
      toolRow.querySelectorAll(".sz").forEach(x => {
        if (x.textContent === SIZES.find(sz => sz.v === penSize)?.label) {
          x.style.background = "var(--lake)"; x.style.borderColor = "var(--water-foam)";
        }
      });
    });
    swatchRow.appendChild(b);
  });

  const toolRow = el("div", { style: "display:flex; gap:5px; justify-content:center; flex-wrap:wrap; padding:0 8px 8px;" });
  SIZES.forEach(sz => {
    const b = el("button", {
      className: "btn ghost small sz",
      style: `padding:5px 12px; font-weight:900; margin:0; font-size:0.88rem; min-width:38px;
              ${sz.v === penSize ? "background:var(--lake); border-color:var(--water-foam);" : ""}`,
      text: sz.label,
      onClick: () => {
        penSize = sz.v; erasing = false;
        toolRow.querySelectorAll(".sz").forEach(x => { x.style.background = ""; x.style.borderColor = "rgba(255,255,255,0.15)"; });
        b.style.background = "var(--lake)"; b.style.borderColor = "var(--water-foam)";
        if (eraserBtn) { eraserBtn.style.background = ""; eraserBtn.style.borderColor = "rgba(255,255,255,0.15)"; }
      }
    });
    toolRow.appendChild(b);
  });

  if (!impressionMode) {
    toolRow.appendChild(eraserBtn);
  }
  toolRow.appendChild(el("button", { className: "btn ghost small", style: "padding:5px 12px; margin:0;", text: "↩",
    onClick: () => { strokes.pop(); redrawAll(); }
  }));
  toolRow.appendChild(el("button", { className: "btn ghost small", style: "padding:5px 12px; margin:0; color:#ef5350;", text: "🗑",
    onClick: () => { strokes = []; redrawAll(); }
  }));

  const modeTag = nightMode ? "🌃 NIGHT MODE" : mirrorMode ? "🪞 MIRROR MODE" : impressionMode ? "💥 IMPRESSIONIST" : "";
  const toolbarInner = el("div", { style: "background:rgba(0,0,0,0.35); border-radius:10px 10px 0 0; border-bottom:1px solid rgba(255,255,255,0.08);" });
  if (modeTag) toolbarInner.appendChild(el("p", { style: "text-align:center; font-size:0.7rem; font-weight:900; color:var(--sunset); margin:4px 0 0; letter-spacing:1px;", text: modeTag }));
  toolbarInner.appendChild(swatchRow);
  toolbarInner.appendChild(toolRow);

  const canvasBorder = el("div", { style: "border-radius:12px; overflow:hidden; border:2px solid rgba(255,255,255,0.15); margin-top:8px;" });
  canvasBorder.appendChild(toolbarInner);
  canvasBorder.appendChild(canvas);

  const wrap = el("div", { className: "panel", style: "padding:12px;" }, [canvasBorder]);

  return {
    wrap,
    getDataUrl: () => canvas.toDataURL("image/jpeg", 0.55)
  };
}

// ── Submission ────────────────────────────────────────────────────────────────
function submitEntry(content) {
  if (hasSubmitted) return;
  hasSubmitted = true;
  if (isHost) { gState.submissions[myIdx] = content; checkAllIn(); }
  else relay({ type: "GARTIC_SUBMIT", round: gState.round, content });
  renderPhase();
}

// ── Host advance ──────────────────────────────────────────────────────────────
function checkAllIn() {
  if (Object.keys(gState.submissions).length >= gState.players.length) advanceRound();
}

function autoAdvance() {
  if (!isHost || !gState || (gState.phase !== "write" && gState.phase !== "draw")) return;
  const cfg = gState.settings || DEFAULT_SETTINGS;
  gState.players.forEach((_, i) => {
    if (gState.submissions[i] === undefined)
      gState.submissions[i] = gState.phase === "draw" ? blankCanvas(cfg) : "(no answer)";
  });
  advanceRound();
}

function blankCanvas(cfg = DEFAULT_SETTINGS) {
  const night = cfg?.drawStyle === "night";
  const c = document.createElement("canvas"); c.width = 400; c.height = 280;
  const ctx = c.getContext("2d");
  ctx.fillStyle = night ? "#0a0a0a" : "#e8e8e8"; ctx.fillRect(0, 0, 400, 280);
  ctx.fillStyle = night ? "#444" : "#aaa"; ctx.font = "bold 22px sans-serif"; ctx.textAlign = "center";
  ctx.fillText("(no drawing)", 200, 148);
  return c.toDataURL("image/jpeg", 0.6);
}

function advanceRound() {
  const N   = gState.players.length;
  const cfg = gState.settings || DEFAULT_SETTINGS;

  gState.players.forEach((_, pi) => {
    const chainIdx = gState.assignments[pi];
    const content  = gState.submissions[pi];
    if (content !== undefined)
      gState.chains[chainIdx].push({ type: gState.phase === "draw" ? "draw" : "text", content });
  });

  gState.round++;
  gState.submissions = {};

  if (gState.round > gState.totalRounds) {
    gState.phase = "reveal"; gState.revealChainIdx = 0; gState.revealEntryIdx = -1;
    relay({ type: "GARTIC_SYNC", state: gState });
    applyState(gState);
    saveToGallery(gState);
    return;
  }

  gState.assignments = gState.players.map((_, i) => (i + gState.round) % N);
  gState.phase    = gState.round % 2 === 0 ? "write" : "draw";
  gState.timerEnd = Date.now() + (gState.phase === "write" ? cfg.writeTime : cfg.drawTime) * 1000;
  relay({ type: "GARTIC_SYNC", state: gState });
  applyState(gState);
}

// ── Reveal phase ──────────────────────────────────────────────────────────────
function renderRevealPhase() {
  const cfg        = gState.settings || DEFAULT_SETTINGS;
  const ci         = gState.revealChainIdx;
  const ei         = gState.revealEntryIdx;
  const chain      = gState.chains[ci];
  const totalC     = gState.chains.length;
  const authorName = gState.players[ci];

  const chainEl = el("div", { className: "gartic-chain" });

  if (ei < 0) {
    chainEl.appendChild(el("p", {
      className: "muted center", style: "margin:24px 0; font-style:italic; font-size:0.95rem;",
      text: `Get ready to see ${authorName}'s chain!`
    }));
  } else {
    chain.slice(0, ei + 1).forEach((entry, i) => {
      const author = gState.players[(ci + i) % gState.players.length];
      const card   = el("div", { className: "gartic-entry gartic-entry-in" });
      card.appendChild(el("p", {
        style: "font-size:0.72rem; color:var(--lake-light); margin:0 0 6px; font-weight:700; letter-spacing:0.5px;",
        text: author.toUpperCase()
      }));
      if (entry.type === "text") {
        card.appendChild(el("div", {
          style: "font-size:1.1rem; font-weight:700; color:#fff; word-break:break-word; line-height:1.4;",
          text: `"${entry.content}"`
        }));
        // TTS: speak the newest revealed entry
        if (i === ei) speakText(`${author} said: ${entry.content}`, cfg);
      } else {
        const img = document.createElement("img");
        img.src = entry.content; img.style.cssText = "width:100%; border-radius:10px; display:block;";
        card.appendChild(img);
      }
      chainEl.appendChild(card);
    });
  }

  const atEnd   = ei >= chain.length - 1;
  const lastC   = ci >= totalC - 1;

  let actionBtn;
  if (isHost) {
    if (atEnd && lastC) {
      actionBtn = el("button", { className: "btn", style: "margin-top:12px;", text: "🎉 Finish Game!",
        onClick: () => { gState.phase = "done"; relay({ type: "GARTIC_SYNC", state: gState }); applyState(gState); }
      });
    } else if (atEnd) {
      actionBtn = el("button", { className: "btn", style: "margin-top:12px;", text: "➡️ Next Chain",
        onClick: () => { gState.revealChainIdx++; gState.revealEntryIdx = -1; relay({ type: "GARTIC_SYNC", state: gState }); applyState(gState); }
      });
    } else {
      actionBtn = el("button", { className: "btn", style: "margin-top:12px;", text: "▶️ Reveal Next",
        onClick: () => { gState.revealEntryIdx++; relay({ type: "GARTIC_SYNC", state: gState }); applyState(gState); }
      });
    }
  } else {
    actionBtn = el("p", { className: "muted center", style: "margin-top:14px; font-size:0.9rem;", text: "Host is controlling the reveal…" });
  }

  mount(
    topbar("📖 Reveal!"),
    el("div", { className: "panel center", style: "padding:10px 14px;" }, [
      el("p",  { style: "margin:0 0 2px; font-size:0.75rem; color:var(--lake-light); font-weight:700; letter-spacing:1px;", text: `CHAIN ${ci + 1} OF ${totalC}` }),
      el("h3", { style: "margin:0; color:var(--water-foam);", text: `📖 ${authorName}'s Chain` })
    ]),
    el("div", { className: "panel", style: "padding:14px; max-height:60vh; overflow-y:auto;" }, [chainEl]),
    actionBtn
  );
}

// ── Done screen ───────────────────────────────────────────────────────────────
function renderDonePhase() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  mount(
    topbar("🎉 Done!"),
    el("div", { className: "panel center", style: "padding:28px 20px;" }, [
      el("div", { style: "font-size:3.5rem; margin-bottom:12px;", text: "🎨" }),
      el("h2", { style: "margin:0 0 8px; color:var(--water-foam);", text: "Game saved to gallery!" }),
      el("p",  { className: "muted", style: "margin:0 0 24px; font-size:0.9rem;",
        text: "View it anytime in the Art Gallery 🖼️" })
    ]),
    el("div", { className: "btn-row", style: "flex-direction:column; gap:10px;" }, [
      el("button", { className: "btn", text: "🏠 Back to Home", onClick: () => { resetAll(); goHome(); } })
    ])
  );
}

// ── TTS ───────────────────────────────────────────────────────────────────────
function speakText(text, cfg) {
  if (!cfg?.tts) return;
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.88; u.pitch = 1.0;
  window.speechSynthesis.speak(u);
}

// ── Background art slideshow ──────────────────────────────────────────────────
async function prefetchArtBackground(isMonkey) {
  try {
    const res   = await fetch(`${HTTP_BASE}/gartic/gallery`, { signal: AbortSignal.timeout(6000) });
    const games = await res.json();
    const weirdOn = isMonkey;

    const imgs = [];
    for (const game of games) {
      if (game.isMonkey && !weirdOn) continue;
      for (const chain of game.chains) {
        for (const entry of chain) {
          if (entry.type === "draw") { imgs.push(entry.content); break; }
        }
      }
    }

    if (imgs.length === 0) return;
    // Shuffle
    for (let i = imgs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
    }
    artBgImages = imgs;
    startArtBackground();
  } catch (_) {}
}

function startArtBackground() {
  if (artBgEl) { artBgEl.remove(); artBgEl = null; }
  if (artBgImages.length === 0) return;

  artBgEl = document.createElement("div");
  artBgEl.id = "gartic-art-bg";
  artBgEl.style.cssText = `
    position: fixed; inset: 0; z-index: -1; pointer-events: none;
    overflow: hidden; background: transparent;
  `;
  document.body.appendChild(artBgEl);

  const imgA = document.createElement("img");
  const imgB = document.createElement("img");
  [imgA, imgB].forEach(img => {
    img.style.cssText = `
      position:absolute; inset:0; width:100%; height:100%;
      object-fit:cover; opacity:0;
      transition:opacity 3s ease;
      filter: blur(2px) brightness(0.25) saturate(0.5);
    `;
    artBgEl.appendChild(img);
  });

  let active  = 0;
  const imgs  = [imgA, imgB];

  const showNext = () => {
    const next = 1 - active;
    imgs[next].src     = artBgImages[artBgIdx % artBgImages.length];
    artBgIdx++;
    imgs[next].style.opacity = "0.9";
    setTimeout(() => { imgs[active].style.opacity = "0"; active = next; }, 200);
  };

  imgA.src = artBgImages[artBgIdx % artBgImages.length];
  imgA.style.opacity = "0.9"; artBgIdx++;

  artBgTimer = setInterval(showNext, 8000);
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function topbar(title) {
  return el("div", { className: "topbar" }, [
    el("button", { className: "back", text: "‹ Leave",
      onClick: () => {
        if (!gState || gState.phase === "lobby" || gState.phase === "done" || confirm("Leave the game?")) {
          if (isHost) unregisterRoom();
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

// ── Gallery save (unlimited) ──────────────────────────────────────────────────
async function saveToGallery(state) {
  try {
    const game = {
      id:       Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      date:     new Date().toISOString(),
      players:  state.players,
      isMonkey: state.isMonkey,
      settings: state.settings,
      chains:   state.chains,
    };
    await fetch(`${HTTP_BASE}/gartic/save`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(game),
      signal:  AbortSignal.timeout(20000),
    });
    console.log("[Doodles] ✓ Saved to gallery.");
  } catch (e) {
    console.warn("[Doodles] Gallery save failed:", e.message);
    toast("⚠️ Gallery save failed (offline?)");
  }
}
