// Emergency Meeting — pass-and-play/online "who's most likely / who's the most sus" voting game.
import { el, mount, shuffle, toast, store, HTTP_BASE, WS_BASE } from "./ui.js";
import { icons } from "./icons.js";

let goHome = () => {};
let s = null;
let cfg = null;

let onlineMode = false;
let socket = null;
let roomCode = "";
let myName = "";
let isHost = false;
let onlinePlayers = [];
let heartbeatInt = null;
let wsKeepaliveInt = null;

export function makeGame(config) {
  return function start(home) {
    cfg = config;
    document.body.classList.add("spaceship-theme");
    goHome = () => {
      resetOnline();
      document.body.classList.remove("spaceship-theme");
      home();
    };
    const __pj = (() => { try { return JSON.parse(sessionStorage.getItem("lakehouse.pendingJoin")||"null"); } catch(_) { return null; } })();
    if (__pj && __pj.game === "meeting" && __pj.code && (Date.now() - __pj.ts) < 20000) {
      sessionStorage.removeItem("lakehouse.pendingJoin");
      myName = localStorage.getItem("lakehouse.playerName") || "";
      if (myName) { connectRoom("join", __pj.code); return; }
    }
    renderSetup();
  };
}

function resetOnline() {
  stopHeartbeat();
  if (socket) { try { socket.close(); } catch (_) {} socket = null; }
  onlineMode = false;
  roomCode = ""; myName = ""; isHost = false; onlinePlayers = [];
}

function syncGameState() {
  if (onlineMode && isHost && socket && socket.readyState === 1) {
    socket.send(JSON.stringify({
      type: "relay",
      code: roomCode,
      sender: myName,
      action: {
        type: "STATE_SYNC",
        state: s
      }
    }));
  }
}

async function registerRoom() {
  try {
    await fetch(`${HTTP_BASE}/rooms/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: roomCode, host: myName, playerCount: onlinePlayers.length,
        game: "meeting", private: false,
        lastPing: Date.now()
      }),
    });
  } catch (_) {}
}

function startHeartbeat(playerCount = 1) {
  stopHeartbeat();
  const ping = () => fetch(`${HTTP_BASE}/rooms/heartbeat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: roomCode, playerCount: onlinePlayers.length || playerCount })
  }).catch(() => {});
  ping();
  heartbeatInt = setInterval(ping, 25000);
}

function stopHeartbeat() {
  if (heartbeatInt) { clearInterval(heartbeatInt); heartbeatInt = null; }
}

function connectRoom(type, code = "") {
  onlineMode = true;
  mount(
    topbar(cfg.title),
    el("div", { className: "sci-fi-panel center", style: "margin:40px auto; max-width:320px;" }, [
      el("div", { className: "spin-indicator sci-fi-pulse", style: "font-size:2rem; margin-bottom:12px;", text: "🌀" }),
      el("p", { text: type === "create" ? "Creating terminal lobby…" : `Joining terminal ${code}…` })
    ])
  );

  isHost = (type === "create");
  const url = type === "create"
    ? `${WS_BASE}/ws/create?name=${encodeURIComponent(myName)}&game=meeting`
    : `${WS_BASE}/ws/join?code=${code}&name=${encodeURIComponent(myName)}&game=meeting`;

  socket = new WebSocket(url);

  socket.addEventListener("open", () => {
    if (wsKeepaliveInt) clearInterval(wsKeepaliveInt);
    wsKeepaliveInt = setInterval(() => {
      if (socket && socket.readyState === 1) socket.send(JSON.stringify({ type: "ping" }));
    }, 25000);
  });

  socket.onmessage = (ev) => {
    try {
      const d = JSON.parse(ev.data);
      if (d.type === "created" || d.type === "player_joined") {
        roomCode = d.code;
        onlinePlayers = d.players;
        applyLobby();
      } else if (d.type === "player_left") {
        onlinePlayers = d.players;
        applyLobby();
      } else if (d.type === "relay") {
        if (d.action.type === "STATE_SYNC") {
          s = d.action.state;
          render();
        } else if (d.action.type === "quit") {
          toast("Lobby closed by host.");
          goHome();
        }
      } else if (d.type === "error") {
        toast(d.message || "Connection error");
        renderSetup();
      }
    } catch (_) {}
  };
}

function applyLobby() {
  if (isHost && roomCode) {
    registerRoom();
    startHeartbeat(onlinePlayers.length);
  }

  const pRows = onlinePlayers.map((p, i) => {
    return el("div", {
      style: "display:flex; justify-content:space-between; padding:10px 14px; background:rgba(255,255,255,0.02); border-radius:10px; margin-bottom:6px;"
    }, [
      el("span", { text: p, style: "font-weight: 500;" }),
      el("span", {
        text: i === 0 ? "👑 HOST" : "READY",
        style: `font-size:0.75rem; font-weight:bold; color:${i === 0 ? "var(--sunset-soft)" : "#00ffaa"};`
      })
    ]);
  });

  const lobbyLayout = el("div", { className: "sci-fi-panel center", style: "max-width: 440px; margin:0 auto;" }, [
    el("h3", { text: `Room Lobby: ${roomCode}`, style: "color:var(--sunset-soft); margin-top:0;" }),
    el("p", { className: "muted", text: "Invite crewmates using this terminal code." }),
    el("div", { style: "margin: 16px 0; width:100%; max-height:240px; overflow-y:auto;" }, pRows),
    isHost
      ? el("button", {
          className: "btn danger-btn pulsing",
          text: "Start Mission ➔",
          style: "width:100%;",
          onClick: () => {
            begin(onlinePlayers);
          }
        })
      : el("p", { className: "muted center anim-pulse", text: "Waiting for host to start mission..." })
  ]);

  mount(
    topbar(cfg.title),
    lobbyLayout
  );
}

function topbar(title) {
  return el("div", { className: "topbar spaceship-header" }, [
    el("button", { className: "back", text: "‹ Lobby", onClick: goHome }),
    el("div", { className: "title", text: title }),
    el("span", { style: "width:64px" }),
  ]);
}

function getFullSource() {
  const saveKey = cfg.saveKey;
  const customKey = saveKey ? saveKey.replace("cabin_", "").replace("zesty_", "") : "";
  const enabled = customKey ? store.get(customKey + ".enabled_decks", ["core"]) : ["core"];
  const customDecks = customKey ? store.get(customKey + ".custom_decks", []) : [];

  let promptPool = [];
  if (enabled.includes("core")) {
    promptPool = promptPool.concat(cfg.source);
  }

  customDecks.forEach(deck => {
    if (enabled.includes(deck.id)) {
      const promptsList = deck.prompts || [];
      promptPool = promptPool.concat(promptsList);
    }
  });

  if (promptPool.length === 0) {
    promptPool = cfg.source;
  }
  return promptPool;
}


/* ---------------- Room Browser ---------------- */
function renderRoomBrowser() {
  let refreshTimer = null;
  const listEl = el("div", { style: "display:flex; flex-direction:column; gap:8px; margin: 12px 0;" });

  const loadRooms = async () => {
    try {
      listEl.innerHTML = '<p class="muted center" style="margin:16px 0;">Loading rooms…</p>';
      const res = await fetch(`${HTTP_BASE}/rooms/list?game=meeting`).then(r => r.json());
      listEl.innerHTML = "";
      if (res.length === 0) {
        listEl.innerHTML = '<p class="muted center" style="margin:16px 0;">No active rooms. Create one!</p>';
        return;
      }
      res.forEach(r => {
        const row = el("div", { className: "room-row" }, [
          el("div", { style: "text-align:left;" }, [
            el("div", { html: `Room <strong style="color:var(--sunset-soft);">${r.code}</strong> · Host: ${r.host}` }),
            el("div", { className: "muted", style: "font-size:0.75rem;", text: `${r.playerCount} players active` })
          ]),
          el("button", {
            className: "btn small", style: "margin:0; padding:6px 14px;",
            text: "Join",
            onClick: () => {
              clearInterval(refreshTimer);
              const n = myName || localStorage.getItem("lakehouse.playerName") || "";
              if (!n) { toast("Set your name first!"); renderSetup(); return; }
              connectRoom("join", r.code);
            }
          })
        ]);
        listEl.appendChild(row);
      });
    } catch (_) {
      listEl.innerHTML = '<p class="muted center" style="margin:16px 0;">Failed to reach server.</p>';
    }
  };

  loadRooms();
  refreshTimer = setInterval(loadRooms, 4000);

  mount(
    topbar(cfg.title),
    el("div", { className: "sci-fi-panel center" }, [
      el("p", { className: "muted", style: "font-size:0.82rem; margin:0;", text: "Tap Join to enter any open Most Likely To room." })
    ]),
    el("div", { className: "sci-fi-panel" }, [listEl]),
    el("button", {
      className: "btn ghost small",
      style: "margin:16px auto; display:block;",
      text: "← Back",
      onClick: () => { clearInterval(refreshTimer); renderSetup(); }
    })
  );
}

/* ---------------- Setup ---------------- */
function renderSetup() {  resetOnline();

  const nameInput = el("input", {
    type: "text",
    placeholder: "Your name…",
    id: "m-name",
    value: localStorage.getItem("lakehouse.playerName") || "",
    style: "font-size:1.1rem; border-radius:14px; text-align:center; margin-bottom:14px; width:100%; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); color:#fff;"
  });

  const codeInput = el("input", {
    type: "text",
    placeholder: "4-LETTER CODE",
    id: "m-code",
    maxLength: 4,
    style: "font-size:1.3rem; border-radius:14px; text-align:center; text-transform:uppercase; letter-spacing:6px; margin-bottom:10px; width:100%; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); color:#fff;"
  });
  codeInput.addEventListener("input", () => { codeInput.value = codeInput.value.toUpperCase(); });

  const saved = store.get(cfg.saveKey + ".names", ["", "", ""]);
  let names = saved.length >= 3 ? saved.slice() : ["", "", ""];
  const listWrap = el("div", { id: "mlist" });

  function draw() {
    listWrap.innerHTML = "";
    names.forEach((nm, i) => {
      listWrap.appendChild(el("div", { className: "player-row crew-input" }, [
        el("input", {
          type: "text", value: nm, maxlength: "16", placeholder: `Crewmate ${i + 1}`,
          onInput: (e) => { names[i] = e.target.value; },
        }),
        el("button", {
          className: "icon-btn", text: "✕",
          onClick: () => { if (names.length > 3) { names.splice(i, 1); draw(); } else toast("Need at least 3 crewmates."); },
        }),
      ]));
    });
  }
  draw();

  let setupMode = "passplay";

  const modeSelector = el("div", {
    style: "display:flex; background:rgba(255,255,255,0.04); border-radius:14px; padding:4px; margin-bottom:20px; width:100%;"
  });

  const tabLocal = el("button", {
    className: "btn small",
    text: "🔄 Pass & Play",
    style: "flex:1; margin:0; font-size:0.85rem; padding: 8px 0; border:none; box-shadow:none;",
    onClick: () => {
      setupMode = "passplay";
      tabLocal.className = "btn small";
      tabOnline.className = "btn ghost small";
      renderSetupForm();
    }
  });

  const tabOnline = el("button", {
    className: "btn ghost small",
    text: "📱 Online Room",
    style: "flex:1; margin:0; font-size:0.85rem; padding: 8px 0; border:none; box-shadow:none;",
    onClick: () => {
      setupMode = "online";
      tabLocal.className = "btn ghost small";
      tabOnline.className = "btn small";
      renderSetupForm();
    }
  });

  modeSelector.appendChild(tabLocal);
  modeSelector.appendChild(tabOnline);

  const dynamicFormWrap = el("div", { style: "width:100%;" });

  function renderSetupForm() {
    dynamicFormWrap.innerHTML = "";
    if (setupMode === "passplay") {
      const localSection = el("div", {}, [
        el("label", { text: "CREW PLAYERS (3+)" }),
        listWrap,
        el("button", { className: "btn ghost small", style: "margin-top:10px; width:100%; margin-bottom:14px;", text: "+ Add Crewmate", onClick: () => { if (names.length < 15) { names.push(""); draw(); } else toast("15 max."); } }),
        el("button", { className: "btn danger-btn pulsing", style: "width:100%;", text: "START LOCAL GAME", onClick: () => begin(names) })
      ]);
      dynamicFormWrap.appendChild(localSection);
    } else {
      const onlineSection = el("div", {}, [
        nameInput,
        el("button", {
          className: "btn",
          style: "width:100%; margin-bottom:10px;",
          text: "Create Room",
          onClick: () => {
            const n = nameInput.value.trim();
            if (!n) { toast("Enter your name first!"); return; }
            myName = n;
            localStorage.setItem("lakehouse.playerName", n);
            connectRoom("create");
          }
        }),
        el("div", { style: "display:flex; gap:8px; align-items:center; width:100%; margin: 8px 0;" }, [
          el("hr", { style: "flex:1; border:none; border-top:1px solid rgba(255,255,255,0.06);" }),
          el("span", { text: "OR JOIN EXISTING", className: "muted", style: "font-size:0.75rem; letter-spacing:1px;" }),
          el("hr", { style: "flex:1; border:none; border-top:1px solid rgba(255,255,255,0.06);" })
        ]),
        codeInput,
        el("button", {
          className: "btn ghost",
          style: "width:100%; margin-bottom:10px;",
          text: "Join Room",
          onClick: () => {
            const n = nameInput.value.trim();
            const code = codeInput.value.trim().toUpperCase();
            if (!n) { toast("Enter your name first!"); return; }
            if (!code || code.length !== 4) { toast("Enter room code!"); return; }
            myName = n;
            localStorage.setItem("lakehouse.playerName", n);
            connectRoom("join", code);
          }
        }),
        el("button", {
          className: "btn ghost small",
          text: "🌐 Browse Open Rooms",
          style: "width:100%; margin-top: 8px;",
          onClick: () => {
            const n = nameInput.value.trim();
            if (!n) { toast("Enter your name first!"); return; }
            myName = n;
            localStorage.setItem("lakehouse.playerName", n);
            renderRoomBrowser();
          }
        })
      ]);
      dynamicFormWrap.appendChild(onlineSection);
    }
  }

  renderSetupForm();

  mount(
    topbar(cfg.title),
    el("div", { className: "sci-fi-panel center" }, [
      el("p", { className: "muted", html: "Each round, read a prompt and vote on which player it describes the most. Play local pass-and-play, or connect online to sync and stream gameplay screens!" })
    ]),
    el("div", { className: "sci-fi-panel" }, [
      modeSelector,
      dynamicFormWrap
    ])
  );
}

function begin(raw) {
  const players = raw.map((n) => n.trim()).filter(Boolean);
  if (players.length < 3) { toast("Add at least 3 crewmates."); return; }
  if (new Set(players.map((p) => p.toLowerCase())).size !== players.length) { toast("Names must be unique."); return; }
  store.set(cfg.saveKey + ".names", players);
  s = {
    players: players.map((name) => ({ name, sus: 0 })),
    deck: shuffle(getFullSource()),
    pos: 0,
    round: 1,
    votes: [],     // votes[voterIdx] = targetIdx
    vi: 0,
    phase: "prompt",
    ejected: [],
  };
  if (onlineMode && isHost) {
    syncGameState();
  }
  render();
}

function render() {
  switch (s.phase) {
    case "prompt": return renderPrompt();
    case "handoff": return renderHandoff();
    case "vote": return renderVote();
    case "reveal": return renderReveal();
    case "over": return renderOver();
  }
}

function prompt() { return s.deck[s.pos % s.deck.length]; }

/* ---------------- Prompt ---------------- */
function renderPrompt() {
  const nextBtn = onlineMode && !isHost
    ? el("p", { className: "muted center anim-pulse", text: "Waiting for host to initiate voting..." })
    : el("button", { className: "btn", text: "INITIATE VOTING PROTOCOL", onClick: () => { s.votes = []; s.vi = 0; s.phase = "handoff"; if (onlineMode && isHost) syncGameState(); render(); } });

  mount(
    topbar(`Round ${s.round}`),
    el("div", { className: "sci-fi-panel center" }, [
      el("span", { className: "pill sci-fi-badge", text: "SUSPECT IDENTIFICATION" }),
      el("div", { className: "play-card prompt sci-fi-card", style: "margin-top:14px; font-size:1.3rem; min-height:150px; justify-content:center; text-align:center;" }, [
        el("span", { text: prompt() }),
      ]),
    ]),
    el("p", { className: "muted center", text: "Identify the suspect. Read aloud, then pass around to vote secretly." }),
    el("div", { className: "spacer" }),
    nextBtn,
    susBoard()
  );
}

/* ---------------- Voting handoff ---------------- */
function renderHandoff() {
  const voter = s.players[s.vi].name;
  const accessBtn = onlineMode && !isHost
    ? el("p", { className: "muted center anim-pulse", text: `Waiting for ${voter} to access terminal...` })
    : el("button", { className: "btn pulsing", text: `I am ${voter} — Access Terminal`, onClick: () => { s.phase = "vote"; render(); } });

  mount(
    topbar(`Round ${s.round}`),
    el("div", { className: "handoff sci-fi-panel center" }, [
      el("div", { className: "big-icon sci-fi-pulse", style: "width:64px; height:64px; margin: 0 auto 12px; color: var(--sunset-soft);" }, [icons.eyeOff()]),
      el("p", { className: "muted", text: "Secret ballot — pass terminal to:" }),
      el("div", { className: "who", style: "font-size:2rem; font-weight:700; color:var(--cream); margin: 8px 0;", text: voter }),
      el("p", { className: "muted", text: `${s.vi + 1} of ${s.players.length} transmissions logged` }),
      el("div", { className: "spacer" }),
      accessBtn,
    ])
  );
}

/* ---------------- Vote ---------------- */
function renderVote() {
  const voterIdx = s.vi;

  if (onlineMode && !isHost) {
    mount(
      topbar(`Round ${s.round}`),
      el("div", { className: "sci-fi-panel center" }, [
        el("div", { className: "big-icon sci-fi-pulse", style: "width:64px; height:64px; margin: 0 auto 12px; color: var(--sunset-soft);" }, [icons.eyeOff()]),
        el("h3", { text: "Secret Ballot Active" }),
        el("p", { className: "muted", text: `${s.players[voterIdx].name} is casting their vote privately...` })
      ])
    );
    return;
  }

  const grid = el("div", { className: "menu" });
  s.players.forEach((p, i) => {
    if (i === voterIdx) return; // can't vote for yourself
    grid.appendChild(el("button", { className: "tile sci-fi-tile", onClick: () => castVote(i) }, [
      el("div", { className: "icon", style: "width:36px; height:36px; color:var(--cream);" }, [icons.truths()]),
      el("div", { className: "meta" }, [el("h3", { text: p.name })]),
    ]));
  });
  mount(
    topbar(`${s.players[voterIdx].name} votes`),
    el("div", { className: "sci-fi-panel center" }, [
      el("p", { className: "muted", text: "WHO IS MOST LIKELY TO:" }),
      el("div", { className: "play-card prompt sci-fi-card", style: "font-size:1.05rem; min-height:90px; justify-content:center; text-align:center;" }, [
        el("span", { text: prompt() }),
      ]),
    ]),
    el("p", { className: "muted center", text: "LOG TRANSMISSION FOR TARGET SUSPECT:" }),
    grid
  );
}

function castVote(targetIdx) {
  s.votes[s.vi] = targetIdx;
  s.vi++;
  if (s.vi >= s.players.length) tallyVotes();
  else s.phase = "handoff";
  if (onlineMode && isHost) syncGameState();
  render();
}

function tallyVotes() {
  const counts = s.players.map(() => 0);
  s.votes.forEach((t) => { if (t != null) counts[t]++; });
  const max = Math.max(...counts);
  s.ejected = counts.map((c, i) => (c === max && max > 0 ? i : -1)).filter((i) => i >= 0);
  s.counts = counts;
  s.ejected.forEach((i) => s.players[i].sus++);
  s.phase = "reveal";
}

/* ---------------- Reveal ---------------- */
function renderReveal() {
  const names = s.ejected.map((i) => s.players[i].name);
  const tie = s.ejected.length > 1;
  const verdict = tie
    ? `${names.join(" & ")} are equally suspicious. No ejections made.`
    : `${names[0]} was ejected. ${flavor()}`;

  const tallies = el("div", { className: "scoreboard" });
  s.players
    .map((p, i) => ({ p, c: s.counts[i], ej: s.ejected.includes(i) }))
    .sort((a, b) => b.c - a.c)
    .forEach(({ p, c, ej }) => {
      tallies.appendChild(el("div", { className: "score-row" + (ej ? " leader" : "") }, [
        el("span", { className: "nm", text: `${ej ? "🛟 " : ""}${p.name}` }),
        el("span", { className: "pts", text: `${c} vote${c === 1 ? "" : "s"}` }),
      ]));
    });

  const nextBtn = onlineMode && !isHost
    ? el("p", { className: "muted center anim-pulse", text: "Waiting for host to continue..." })
    : el("div", { style: "display:flex; flex-direction:column; gap:10px; width:100%;" }, [
        el("button", { className: "btn", text: "CONTINUE MISSION →", onClick: () => { nextRound(); if (onlineMode && isHost) syncGameState(); } }),
        el("button", { className: "btn ghost", text: "END MISSION & REVIEW SUSPECT REPORT", onClick: () => { s.phase = "over"; if (onlineMode && isHost) syncGameState(); render(); } })
      ]);

  mount(
    topbar(`Round ${s.round}`),
    el("div", { className: "sci-fi-panel center" }, [
      el("div", { style: "width:64px; height:64px; margin:0 auto 12px; color: " + (tie ? "var(--sunset-soft);" : "red;") }, [
        tie ? icons.shield() : icons.warning()
      ]),
      el("h2", { text: tie ? "Suspect Standoff!" : `${names[0]} Ejected.` }),
      el("p", { className: "muted", text: verdict }),
    ]),
    el("div", { className: "sci-fi-panel" }, [el("label", { text: "ROUND VOTE TALLIES" }), tallies]),
    el("div", { className: "spacer" }),
    nextBtn
  );
}

const FLAVORS = [
  "Into the deep vacuum of space.",
  "The vote margin was absolute.",
  "The transmissions have spoken.",
  "Certified high-risk anomaly detected.",
  "0.5 suspicious entities remaining...",
  "Honestly? Deserved.",
  "The diagnostics were clear. The verdict, absolute.",
];
function flavor() { return FLAVORS[Math.floor(Math.random() * FLAVORS.length)]; }

function nextRound() {
  s.pos++;
  s.round++;
  s.votes = [];
  s.vi = 0;
  s.ejected = [];
  s.phase = "prompt";
  render();
}

/* ---------------- Game over ---------------- */
function renderOver() {
  const ranked = s.players.slice().sort((a, b) => b.sus - a.sus);
  const champ = ranked[0];
  const board = el("div", { className: "scoreboard" });
  ranked.forEach((p, i) => {
    board.appendChild(el("div", { className: "score-row" + (i === 0 ? " leader" : "") }, [
      el("span", { className: "nm", text: `${i === 0 ? "★ " : "• "}${p.name}` }),
      el("span", { className: "pts", text: `${p.sus} sus` }),
    ]));
  });

  const actionButtons = onlineMode && !isHost
    ? el("p", { className: "muted center anim-pulse", text: "Mission completed. Waiting for host..." })
    : el("div", { style: "display:flex; flex-direction:column; gap:10px; width:100%;" }, [
        el("button", { className: "btn", text: "RE-INITIATE VOYAGE", onClick: () => { begin(s.players.map((p) => p.name)); } }),
        el("button", { className: "btn ghost", text: "RETURN TO MAIN TERMINAL", onClick: goHome })
      ]);

  mount(
    topbar("Report Logged"),
    el("div", { className: "sci-fi-panel center" }, [
      el("div", { style: "width:64px; height:64px; margin:0 auto 12px; color:var(--sunset-soft);" }, [icons.warning()]),
      el("h2", { text: champ.sus > 0 ? `${champ.name} Identified as Suspect Leader!` : "No anomalies detected." }),
      el("p", { className: "muted", text: champ.sus > 0 ? `Ejected ${champ.sus} time${champ.sus === 1 ? "" : "s"}.` : "A completely verified clean crew." }),
    ]),
    el("div", { className: "sci-fi-panel" }, [el("label", { text: "FINAL SUS-O-METER" }), board]),
    el("div", { className: "spacer" }),
    actionButtons
  );
}

/* ---------------- Sus board ---------------- */
function susBoard() {
  if (s.round === 1) return null;
  const board = el("div", { className: "scoreboard" });
  s.players.slice().sort((a, b) => b.sus - a.sus).forEach((p) => {
    board.appendChild(el("div", { className: "score-row" }, [
      el("span", { className: "nm", text: p.name }),
      el("span", { className: "pts", text: `${p.sus} sus` }),
    ]));
  });
  return el("div", { className: "sci-fi-panel" }, [el("label", { text: "SUSPECT REPORT PROGRESS" }), board]);
}
