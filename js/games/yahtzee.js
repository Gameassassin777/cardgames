// Modular Yahtzee Scorecard and Virtual Roller for PWA.
import { el, mount, toast, store, HTTP_BASE, WS_BASE } from "../ui.js";
import { icons } from "../icons.js";
import { renderDiceFaceSVG, playClickTone } from "./dice_hub.js";





let goHome = () => {};
let socket = null;
let roomCode = "";
let myName = "";
let isHost = false;
let heartbeatInt = null;
let roomBrowserRefresh = null;

let isOnline = false;
let setupMode = "passplay"; // "passplay" or "online"
let isTripleMode = false;
let viewedPlayerIdx = 0;
let drawRollerFn = null;

let gState = null;

function diceTopbar(title, onBack) {
  return el("div", { className: "topbar" }, [
    el("button", { className: "back", onClick: onBack }, [
      el("span", { style: "width:16px; height:16px; display:inline-block;" }, [icons.back()]),
      el("span", { text: "Lobby" })
    ]),
    el("div", { className: "title", text: title }),
    el("span", { style: "width:64px" })
  ]);
}

const YAHTZEE_CATEGORIES = [
  { id: "ones", name: "Aces (ones)", section: "upper", desc: "Count and add only Aces" },
  { id: "twos", name: "Twos", section: "upper", desc: "Count and add only Twos" },
  { id: "threes", name: "Threes", section: "upper", desc: "Count and add only Threes" },
  { id: "fours", name: "Fours", section: "upper", desc: "Count and add only Fours" },
  { id: "fives", name: "Fives", section: "upper", desc: "Count and add only Fives" },
  { id: "sixes", name: "Sixes", section: "upper", desc: "Count and add only Sixes" },
  { id: "three_kind", name: "3 of a Kind", section: "lower", desc: "Add total of all dice" },
  { id: "four_kind", name: "4 of a Kind", section: "lower", desc: "Add total of all dice" },
  { id: "full_house", name: "Full House (25)", section: "lower", desc: "Score 25 points" },
  { id: "sm_straight", name: "Small Straight (30)", section: "lower", desc: "Score 30 points" },
  { id: "lg_straight", name: "Large Straight (40)", section: "lower", desc: "Score 40 points" },
  { id: "yahtzee", name: "YAHTZEE (50)", section: "lower", desc: "Score 50 points" },
  { id: "chance", name: "Chance", section: "lower", desc: "Add total of all dice" },
  { id: "bonus_yahtzee", name: "Yahtzee Bonus (+100)", section: "lower", desc: "Score 100 points per extra Yahtzee" }
];

export function start(home) {
  goHome = home;
  resetAll();
  renderSetup();
}

function resetAll() {
  if (socket) { try { socket.close(); } catch (_) {} socket = null; }
  if (heartbeatInt) { clearInterval(heartbeatInt); heartbeatInt = null; }
  if (roomBrowserRefresh) { clearInterval(roomBrowserRefresh); roomBrowserRefresh = null; }
  roomCode = ""; myName = ""; isHost = false; gState = null; isOnline = false;
}

function renderSetup() {
  const savedName = localStorage.getItem("yahtzee.name") || localStorage.getItem("lakehouse.playerName") || "";
  const nameInput = el("input", {
    type: "text",
    placeholder: "Your name…",
    value: savedName,
    id: "y-name",
    style: "font-size:1.1rem; border-radius:14px; text-align:center; margin-bottom:14px; width:100%;"
  });

  const codeInput = el("input", {
    type: "text",
    placeholder: "4-LETTER CODE",
    id: "y-code",
    maxLength: 4,
    style: "font-size:1.3rem; border-radius:14px; text-align:center; text-transform:uppercase; letter-spacing:6px; margin-bottom:10px; width:100%;"
  });
  codeInput.addEventListener("input", () => { codeInput.value = codeInput.value.toUpperCase(); });

  const getName = () => {
    const n = nameInput.value.trim();
    if (!n) { toast("Enter your name first!"); return null; }
    localStorage.setItem("yahtzee.name", n);
    return n;
  };

  const savedNames = store.get("yacht.names", ["", ""]);
  let names = savedNames.slice();

  const listWrap = el("div", { id: "yachtPlayerList", style: "margin: 16px 0;" });

  function drawList() {
    listWrap.innerHTML = "";
    names.forEach((nm, i) => {
      const input = el("input", {
        type: "text",
        value: nm,
        maxlength: "14",
        placeholder: `Player ${i + 1}`,
        style: "flex:1; border-radius:12px; font-size:1rem; padding: 8px 12px; text-align:center;",
        onInput: (e) => { names[i] = e.target.value; }
      });
      const row = el("div", { className: "player-row", style: "display:flex; gap:8px; align-items:center; margin-bottom: 8px; width:100%;" }, [
        input,
        el("button", {
          className: "btn ghost small error",
          text: "✕",
          style: "margin:0; padding:6px 12px; border-radius:12px; font-size:1.1rem; line-height:1;",
          onClick: () => {
            if (names.length > 1) {
              names.splice(i, 1);
              drawList();
            } else {
              toast("Need at least 1 player.");
            }
          }
        })
      ]);
      listWrap.appendChild(row);
    });
  }

  const addBtn = el("button", {
    className: "btn ghost small",
    text: "+ Add Player",
    style: "width:100%; margin-bottom:10px;",
    onClick: () => {
      if (names.length < 6) {
        names.push("");
        drawList();
      } else {
        toast("Max 6 players for Yahtzee.");
      }
    }
  });

  const showRulesBtn = el("button", {
    className: "btn ghost small",
    text: "📖 Rules & How to Play",
    style: "width:100%; margin-bottom:16px;",
    onClick: () => {
      const existing = document.querySelector(".rules-panel");
      if (existing) { existing.remove(); return; }
      const rPanel = el("div", {
        className: "rules-panel panel",
        style: "text-align:left; background:rgba(255,255,255,0.02); border:1px dashed rgba(255,255,255,0.12); border-radius:12px; padding:12px; margin-bottom:16px; font-size:0.82rem; line-height:1.4;"
      }, [
        el("h4", { text: "How to Play:", style: "margin:0 0 6px; color:var(--sunset-soft);" }),
        el("ul", { style: "margin:0; padding-left:16px; display:flex; flex-direction:column; gap:4px;" }, [
          el("li", { text: "Yahtzee is a strategic dice rolling game where players take turns filling in a scorecard of 13 categories." }),
          el("li", { text: "Objective: On your turn, roll the 5 dice up to 3 times. You can hold any number of dice between rolls." }),
          el("li", { text: "Scoring: Assign your final roll to one of the 13 categories (Upper section: Aces through Sixes; Lower section: 3-of-a-kind, 4-of-a-kind, Full House, Straights, Chance, or YAHTZEE)." }),
          el("li", { text: "Scratching: Each category can only be scored ONCE. If your roll doesn't qualify for an open category, you must select one to 'scratch' (score 0)." }),
          el("li", { text: "Upper Bonus: Score 63+ in the Upper section to gain an additional +35 point bonus!" }),
          el("li", { text: "Yahtzee Bonus: If you roll another YAHTZEE after scoring your first 50, gain +100 bonus points!" })
        ])
      ]);
      showRulesBtn.parentNode.insertBefore(rPanel, showRulesBtn.nextSibling);
    }
  });

  const startBtn = el("button", {
    className: "btn",
    text: "Start Scorecard",
    style: "width:100%;",
    onClick: () => {
      const cleaned = names.map((n, idx) => n.trim() || `Player ${idx + 1}`);
      store.set("yacht.names", cleaned);
      isOnline = false;
      initLocalGame(cleaned);
    }
  });

  // Game Variant selection (Standard vs Triple)
  isTripleMode = false;
  const variantSelector = el("div", {
    style: "display:flex; background:rgba(255,255,255,0.04); border-radius:14px; padding:4px; margin-bottom:20px; width:100%;"
  });

  const tabStandard = el("button", {
    className: "btn small",
    text: "🎲 Standard",
    style: "flex:1; margin:0; font-size:0.85rem; padding: 8px 0; border:none; box-shadow:none;",
    onClick: () => {
      isTripleMode = false;
      tabStandard.className = "btn small";
      tabTriple.className = "btn ghost small";
    }
  });

  const tabTriple = el("button", {
    className: "btn ghost small",
    text: "🏆 Triple Yahtzee",
    style: "flex:1; margin:0; font-size:0.85rem; padding: 8px 0; border:none; box-shadow:none;",
    onClick: () => {
      isTripleMode = true;
      tabStandard.className = "btn ghost small";
      tabTriple.className = "btn small";
    }
  });

  variantSelector.appendChild(tabStandard);
  variantSelector.appendChild(tabTriple);

  // Toggles for Setup Mode
  const modeSelector = el("div", {
    style: "display:flex; background:rgba(255,255,255,0.04); border-radius:14px; padding:4px; margin-bottom:20px; width:100%;"
  });

  const tabLocal = el("button", {
    className: setupMode === "passplay" ? "btn small" : "btn ghost small",
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
    className: setupMode === "online" ? "btn small" : "btn ghost small",
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
      drawList();
      [
        listWrap,
        addBtn,
        startBtn
      ].forEach(child => dynamicFormWrap.appendChild(child));
    } else {
      const onlineLayout = el("div", { style: "width:100%;" }, [
        nameInput,
        el("button", {
          className: "btn",
          text: "Create Room",
          style: "width:100%; margin-bottom:10px;",
          onClick: () => {
            const n = getName();
            if (n) { myName = n; connectRoom("create"); }
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
          text: "Join Room",
          style: "width:100%; margin-bottom:10px;",
          onClick: () => {
            const n = getName();
            const code = codeInput.value.trim().toUpperCase();
            if (!code || code.length !== 4) { toast("Enter a valid 4-letter room code!"); return; }
            if (n) { myName = n; connectRoom("join", code); }
          }
        }),
        el("button", {
          className: "btn ghost small",
          text: "🌐 Browse Open Rooms",
          style: "width:100%; margin-top: 8px;",
          onClick: () => renderRoomBrowser()
        })
      ]);
      dynamicFormWrap.appendChild(onlineLayout);
    }
  }

  drawList();

  mount(
    diceTopbar("Yahtzee Setup", goHome),
    el("div", { className: "panel center", style: "max-width: 480px; margin: 0 auto;" }, [
      el("div", { style: "width:64px; height:64px; margin:0 auto 12px; color:var(--sunset-soft);" }, [icons.canoe()]),
      el("h2", { text: "Yahtzee Setup" }),
      el("p", { className: "muted", text: "Enter up to 6 player names. Pass the device to fill in scores. Use physical dice or our built-in virtual roller!" }),
      showRulesBtn,
      modeSelector,
      el("div", { style: "margin-top: 10px; width: 100%;" }, [
        el("label", { text: "GAME MODE", style: "font-size:0.75rem; text-align:left; letter-spacing:1px; display:block; margin-bottom:6px; color:var(--sunset-soft);" }),
        variantSelector
      ]),
      dynamicFormWrap
    ])
  );

  renderSetupForm();
}

function renderRoomBrowser() {
  const listEl = el("div", { style: "display:flex; flex-direction:column; gap:8px; margin: 12px 0;" });
  const loadRooms = async () => {
    try {
      listEl.innerHTML = `<p class="muted center" style="margin:16px 0;">Loading active rooms…</p>`;
      const res = await fetch(`${HTTP_BASE}/rooms/list?game=yahtzee`).then(r => r.json());
      listEl.innerHTML = "";
      if (res.length === 0) {
        listEl.innerHTML = `<p class="muted center" style="margin:16px 0;">No active public rooms found. Create one!</p>`;
        return;
      }
      res.forEach(r => {
        const info = el("div", { style: "text-align: left;" }, [
          el("div", { html: `Room <strong style="color:var(--sunset-soft);">${r.code}</strong> • Host: ${r.host}` }),
          el("div", { className: "muted", style: "font-size: 0.75rem;", text: `${r.playerCount} players active` })
        ]);
        const row = el("div", { className: "room-row" }, [
          info,
          el("button", {
            className: "btn small",
            style: "margin:0; padding:6px 14px;",
            text: "Join",
            onClick: () => {
              clearInterval(roomBrowserRefresh);
              connectRoom("join", r.code);
            }
          })
        ]);
        listEl.appendChild(row);
      });
    } catch (_) {
      listEl.innerHTML = `<p class="muted center" style="margin:16px 0;">Failed to fetch rooms.</p>`;
    }
  };

  loadRooms();
  roomBrowserRefresh = setInterval(loadRooms, 3000);

  mount(
    diceTopbar("Open Yahtzee Rooms", () => { clearInterval(roomBrowserRefresh); renderSetup(); }),
    el("div", { className: "panel center" }, [
      el("p", { className: "muted", style: "margin:0; font-size:0.82rem;", text: "Tap Join to enter any open Yahtzee lobby." })
    ]),
    el("div", { className: "panel" }, [listEl])
  );
}

// ── WebSockets Networking ──────────────────────────────────────────────────
function connectRoom(type, code = "") {
  isOnline = true;
  mount(
    diceTopbar("Connecting", () => { resetAll(); renderSetup(); }),
    el("div", { className: "panel center", style: "margin:30px auto; max-width:320px;" }, [
      el("div", { className: "spin-indicator", style: "font-size:2rem; margin-bottom:12px;", text: "🌀" }),
      el("p", { text: type === "create" ? "Creating room…" : `Joining ${code}…` })
    ])
  );

  const url = type === "create"
    ? `${WS_BASE}/ws/create?name=${encodeURIComponent(myName)}&game=yahtzee`
    : `${WS_BASE}/ws/join?code=${code}&name=${encodeURIComponent(myName)}&game=yahtzee`;

  isHost = (type === "create");
  socket = new WebSocket(url);

  socket.onmessage = (ev) => {
    try {
      const d = JSON.parse(ev.data);
      if (d.type === "created" || d.type === "player_joined") {
        roomCode = d.code;
        applyLobby(d.players);
      } else if (d.type === "player_left") {
        applyLobby(d.players);
        if (gState?.phase !== "lobby") toast(`${d.name} left the room.`);
      } else if (d.type === "relay") {
        handleRelay(d.action, d.sender);
      } else if (d.type === "error") {
        toast(d.message || "Connection error");
        resetAll();
        renderSetup();
      }
    } catch (e) {
      console.error("[Yahtzee] Parse error:", e);
    }
  };

  socket.onclose = () => {
    stopHeartbeat();
    if (gState && gState.phase !== "done") {
      toast("Disconnected from room.");
      resetAll();
      renderSetup();
    }
  };
}

function relay(action) {
  if (!socket || socket.readyState !== 1) return;
  socket.send(JSON.stringify({ type: "relay", code: roomCode, sender: myName, action }));
  if (typeof handleRelay === "function") handleRelay(action, myName);
}

function startHeartbeat(playerCount = 1) {
  stopHeartbeat();
  const ping = () => fetch(`${HTTP_BASE}/rooms/heartbeat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: roomCode, playerCount: gState?.players?.length || playerCount })
  }).catch(() => {});
  ping();
  heartbeatInt = setInterval(ping, 5000);
}

function stopHeartbeat() {
  if (heartbeatInt) { clearInterval(heartbeatInt); heartbeatInt = null; }
}

async function registerRoom() {
  try {
    await fetch(`${HTTP_BASE}/rooms/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: roomCode, host: myName, playerCount: gState?.players?.length || 1,
        game: "yahtzee", private: false,
        lastPing: Date.now()
      }),
    });
  } catch (_) {}
}

function applyLobby(playersList) {
  gState = {
    phase: "lobby",
    players: playersList
  };

  if (isHost) {
    registerRoom();
    startHeartbeat(playersList.length);
  }

  const pRows = playersList.map((p, i) => {
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

  const lobbyLayout = el("div", { className: "panel center", style: "max-width: 440px; margin:0 auto;" }, [
    el("h3", { text: `Room Lobby: ${roomCode}`, style: "color:var(--sunset-soft); margin-top:0;" }),
    el("p", { className: "muted", text: "Invite friends using this room code." }),
    el("div", { style: "margin: 16px 0; width:100%; max-height:240px; overflow-y:auto;" }, pRows),
    isHost
      ? el("button", {
          className: "btn",
          text: "Start Game ➔",
          style: "width:100%;",
          onClick: () => {
            if (playersList.length < 2) {
              toast("Need at least 2 players to start Yahtzee!");
              return;
            }
            initOnlineGame();
          }
        })
      : el("p", { className: "muted center anim-pulse", text: "Waiting for host to start..." })
  ]);

  mount(diceTopbar(`Yahtzee Lobby`, () => { resetAll(); renderSetup(); }), lobbyLayout);
}

// ── Game Loops Initialization ───────────────────────────────────────────────
// ── Scoring and Completion helpers ──────────────────────────────────────────
function computePlayerStats(pScores, isTriple) {
  if (isTriple) {
    const cols = Array(3).fill(null).map((_, colIdx) => {
      let upperSum = 0;
      YAHTZEE_CATEGORIES.filter(c => c.section === "upper").forEach(c => {
        const val = pScores[c.id]?.[colIdx];
        if (val !== null && val !== undefined) upperSum += val;
      });

      const upperBonus = upperSum >= 63 ? 35 : 0;
      const upperTotal = upperSum + upperBonus;

      let lowerSum = 0;
      YAHTZEE_CATEGORIES.filter(c => c.section === "lower").forEach(c => {
        const val = pScores[c.id]?.[colIdx];
        if (val !== null && val !== undefined) lowerSum += val;
      });

      const subtotal = upperTotal + lowerSum;
      const multiplier = colIdx + 1;
      const multipliedTotal = subtotal * multiplier;

      return {
        upperSum,
        upperBonus,
        upperTotal,
        lowerSum,
        subtotal,
        multipliedTotal
      };
    });

    const grandTotal = cols.reduce((sum, col) => sum + col.multipliedTotal, 0);

    return {
      columns: cols,
      grandTotal
    };
  } else {
    let upperSum = 0;
    YAHTZEE_CATEGORIES.filter(c => c.section === "upper").forEach(c => {
      const val = pScores[c.id];
      if (val !== null && val !== undefined) upperSum += val;
    });

    const upperBonus = upperSum >= 63 ? 35 : 0;
    const upperTotal = upperSum + upperBonus;

    let lowerSum = 0;
    YAHTZEE_CATEGORIES.filter(c => c.section === "lower").forEach(c => {
      const val = pScores[c.id];
      if (val !== null && val !== undefined) lowerSum += val;
    });

    const grandTotal = upperTotal + lowerSum;

    return {
      upperSum,
      upperBonus,
      upperTotal,
      lowerSum,
      grandTotal
    };
  }
}

function isGameFinished(yState) {
  if (!yState || !yState.scores) return false;
  return yState.scores.every(pScore => {
    return YAHTZEE_CATEGORIES.every(cat => {
      const val = pScore[cat.id];
      if (yState.isTriple) {
        return Array.isArray(val) && val.every(v => v !== null && v !== undefined);
      } else {
        return val !== null && val !== undefined;
      }
    });
  });
}

// ── Game Loops Initialization ───────────────────────────────────────────────
function initLocalGame(players) {
  const scores = players.map(() => {
    const pScore = {};
    YAHTZEE_CATEGORIES.forEach(c => {
      pScore[c.id] = isTripleMode ? [null, null, null] : null;
    });
    return pScore;
  });

  gState = {
    phase: "play",
    isTriple: isTripleMode,
    usePhysicalDice: false,
    players,
    scores,
    activePlayerIdx: 0,
    rollsLeft: 3,
    virtualDice: Array(5).fill(null).map(() => ({ val: 1, held: false })),
    virtualRolling: false
  };

  viewedPlayerIdx = 0;
  renderBoard(gState);
}

function initOnlineGame() {
  const scores = gState.players.map(() => {
    const pScore = {};
    YAHTZEE_CATEGORIES.forEach(c => {
      pScore[c.id] = isTripleMode ? [null, null, null] : null;
    });
    return pScore;
  });

  const initialState = {
    phase: "play",
    isTriple: isTripleMode,
    usePhysicalDice: false,
    players: gState.players,
    scores,
    activePlayerIdx: 0,
    rollsLeft: 3,
    virtualDice: Array(5).fill(null).map(() => ({ val: 1, held: false })),
    virtualRolling: false
  };

  relay({
    type: "start_game",
    state: initialState
  });

  gState = initialState;
  viewedPlayerIdx = 0;
  renderBoard(gState);
}

function handleRelay(action, sender) {
  if (action.type === "start_game") {
    gState = action.state;
    renderBoard(gState);
  } else if (action.type === "state_update") {
    gState = action.state;
    renderBoard(gState);
  } else if (action.type === "trigger_roll") {
    triggerOnlineRollAnimation(action.diceValues);
  } else if (action.type === "quit") {
    toast(`${sender} ended the game.`);
    resetAll();
    renderSetup();
  }
}

// ── Board Renderer ──────────────────────────────────────────────────────────
// ── Board Renderer ──────────────────────────────────────────────────────────
function renderBoard(yState) {
  const players = yState.players;
  const scores = yState.scores;
  const activeIdx = yState.activePlayerIdx;
  const activePlayerName = players[activeIdx];

  const isMyTurn = isOnline ? (activePlayerName === myName) : true;

  // Auto-switch view to active player on turn transition
  if (viewedPlayerIdx === undefined || viewedPlayerIdx >= players.length) {
    viewedPlayerIdx = activeIdx;
  }
  if (renderBoard.lastActiveIdx !== activeIdx) {
    viewedPlayerIdx = activeIdx;
    renderBoard.lastActiveIdx = activeIdx;
  }

  // Pre-calculate player stats
  const playerStats = players.map((name, pIdx) => {
    return computePlayerStats(scores[pIdx], yState.isTriple);
  });

  // Check if game is completed
  const isComplete = isGameFinished(yState);
  if (isComplete || yState.phase === "done") {
    // Sort players by grand total for the podium
    const standings = players.map((name, pIdx) => ({
      name,
      total: playerStats[pIdx].grandTotal
    })).sort((a, b) => b.total - a.total);

    const podiumRows = standings.map((ps, rank) => {
      const isWinner = rank === 0;
      return el("div", {
        className: isWinner ? "podium-row winner-row" : "podium-row"
      }, [
        el("div", { style: "display: flex; align-items: center; gap: 12px;" }, [
          el("span", { className: "podium-rank", text: String(rank + 1) }),
          el("span", {
            text: (isWinner ? "👑 " : "") + ps.name,
            style: "font-weight: 700; font-size: 1.05rem;"
          })
        ]),
        el("span", {
          text: `${ps.total} pts`,
          style: "font-weight: 800; font-size: 1.15rem; color: var(--sunset-soft);"
        })
      ]);
    });

    const playAgainBtn = el("button", {
      className: "btn",
      text: "Play Again ➔",
      style: "margin-top: 20px;",
      onClick: () => {
        resetAll();
        renderSetup();
      }
    });

    const leaveBtn = el("button", {
      className: "btn ghost small",
      text: "Back to Lobby",
      style: "margin-top: 10px;",
      onClick: () => {
        resetAll();
        renderSetup();
      }
    });

    const doneLayout = el("div", { className: "panel center", style: "max-width: 520px; margin: 20px auto; padding: 24px;" }, [
      el("div", { style: "width:64px; height:64px; margin:0 auto 12px; color:var(--sunset-soft);" }, [icons.canoe()]),
      el("h2", { text: "Game Over!" }),
      el("p", { className: "muted", style: "margin-bottom:20px;", text: "All categories have been locked. Here are the final scores:" }),
      el("div", { className: "podium-container" }, podiumRows),
      playAgainBtn,
      leaveBtn
    ]);

    mount(
      diceTopbar("Game Finished", () => { resetAll(); renderSetup(); }),
      doneLayout
    );
    return;
  }

  // ── Normal Gameplay rendering ──────────────────────────────────────────────
  const headerCols = [el("th", { text: "Categories", style: "text-align: left; min-width: 120px;" })];
  
  if (yState.isTriple) {
    // Viewed player's three columns
    headerCols.push(el("th", { text: "Col 1 (x1)", style: "text-align: center;" }));
    headerCols.push(el("th", { text: "Col 2 (x2)", style: "text-align: center;" }));
    headerCols.push(el("th", { text: "Col 3 (x3)", style: "text-align: center;" }));
  } else {
    // All players' standard columns
    players.forEach((pName) => {
      headerCols.push(el("th", { text: pName, style: "text-align: center;" }));
    });
  }

  const rows = [];

  rows.push(el("tr", { className: "section-header" }, [
    el("td", { text: "UPPER SECTION", colSpan: String(yState.isTriple ? 4 : players.length + 1), style: "font-weight: bold; background: rgba(255,255,255,0.02); font-size: 0.75rem; letter-spacing: 1px;" })
  ]));

  const upperCats = YAHTZEE_CATEGORIES.filter(c => c.section === "upper");
  upperCats.forEach(cat => {
    const cols = [
      el("td", { style: "text-align: left; font-size: 0.85rem;" }, [
        el("div", { style: "font-weight: 500;" }, [document.createTextNode(cat.name)]),
        el("div", { className: "muted", style: "font-size: 0.7rem;" }, [document.createTextNode(cat.desc)])
      ])
    ];

    if (yState.isTriple) {
      for (let colIdx = 0; colIdx < 3; colIdx++) {
        const val = scores[viewedPlayerIdx][cat.id]?.[colIdx];
        const isFilled = val !== null && val !== undefined;
        const isCellActive = (viewedPlayerIdx === activeIdx) && isMyTurn;

        let previewText = "—";
        let isPreview = false;
        if (!isFilled && isCellActive && !yState.usePhysicalDice && yState.rollsLeft < 3) {
          const diceVals = yState.virtualDice.map(d => d.val);
          const pot = getSuggestedYahtzeeScore(cat.id, diceVals);
          if (pot !== null) {
            previewText = String(pot * (colIdx + 1));
            isPreview = true;
          }
        }

        const btn = el("button", {
          className: isFilled ? "score-cell filled" : (isPreview ? "score-cell empty preview-score" : "score-cell empty"),
          disabled: !isCellActive && !isFilled,
          text: isFilled ? String(val) : previewText,
          onClick: () => {
            if (isFilled) return;
            openScoreSelector(yState, viewedPlayerIdx, cat, colIdx);
          }
        });
        cols.push(el("td", { style: "text-align: center;" }, [btn]));
      }
    } else {
      players.forEach((name, pIdx) => {
        const val = scores[pIdx][cat.id];
        const isFilled = val !== null && val !== undefined;
        const isCellActive = (pIdx === activeIdx) && isMyTurn;

        let previewText = "—";
        let isPreview = false;
        if (!isFilled && isCellActive && !yState.usePhysicalDice && yState.rollsLeft < 3) {
          const diceVals = yState.virtualDice.map(d => d.val);
          const pot = getSuggestedYahtzeeScore(cat.id, diceVals);
          if (pot !== null) {
            previewText = String(pot);
            isPreview = true;
          }
        }
        
        const btn = el("button", {
          className: isFilled ? "score-cell filled" : (isPreview ? "score-cell empty preview-score" : "score-cell empty"),
          disabled: !isCellActive && !isFilled,
          text: isFilled ? String(val) : previewText,
          onClick: () => {
            if (isFilled) return;
            openScoreSelector(yState, pIdx, cat);
          }
        });
        cols.push(el("td", { style: "text-align: center;" }, [btn]));
      });
    }

    rows.push(el("tr", {}, cols));
  });

  // Subtotal & Bonus Rows
  const upperSumCols = [el("td", { text: "Upper Subtotal", style: "font-weight: bold; font-size: 0.85rem;" })];
  if (yState.isTriple) {
    const stats = playerStats[viewedPlayerIdx];
    for (let colIdx = 0; colIdx < 3; colIdx++) {
      upperSumCols.push(el("td", { text: `${stats.columns[colIdx].upperSum} / 63`, style: "font-weight: bold; text-align: center; font-size: 0.85rem;" }));
    }
  } else {
    players.forEach((name, pIdx) => {
      upperSumCols.push(el("td", { text: `${playerStats[pIdx].upperSum} / 63`, style: "font-weight: bold; text-align: center; font-size: 0.85rem;" }));
    });
  }
  rows.push(el("tr", { style: "background: rgba(255,255,255,0.01);" }, upperSumCols));

  const upperBonusCols = [el("td", { text: "Upper Bonus (+35)", style: "font-weight: bold; font-size: 0.85rem;" })];
  if (yState.isTriple) {
    const stats = playerStats[viewedPlayerIdx];
    for (let colIdx = 0; colIdx < 3; colIdx++) {
      const bonus = stats.columns[colIdx].upperBonus;
      upperBonusCols.push(el("td", {
        text: bonus > 0 ? "+35" : "0",
        className: bonus > 0 ? "text-success" : "muted",
        style: "font-weight: bold; text-align: center; font-size: 0.85rem;"
      }));
    }
  } else {
    players.forEach((name, pIdx) => {
      upperBonusCols.push(el("td", {
        text: playerStats[pIdx].upperBonus > 0 ? "+35" : "0",
        className: playerStats[pIdx].upperBonus > 0 ? "text-success" : "muted",
        style: "font-weight: bold; text-align: center; font-size: 0.85rem;"
      }));
    });
  }
  rows.push(el("tr", { style: "background: rgba(255,255,255,0.01);" }, upperBonusCols));

  rows.push(el("tr", { className: "section-header" }, [
    el("td", { text: "LOWER SECTION", colSpan: String(yState.isTriple ? 4 : players.length + 1), style: "font-weight: bold; background: rgba(255,255,255,0.02); font-size: 0.75rem; letter-spacing: 1px;" })
  ]));

  const lowerCats = YAHTZEE_CATEGORIES.filter(c => c.section === "lower");
  lowerCats.forEach(cat => {
    const cols = [
      el("td", { style: "text-align: left; font-size: 0.85rem;" }, [
        el("div", { style: "font-weight: 500;" }, [document.createTextNode(cat.name)]),
        el("div", { className: "muted", style: "font-size: 0.7rem;" }, [document.createTextNode(cat.desc)])
      ])
    ];

    if (yState.isTriple) {
      for (let colIdx = 0; colIdx < 3; colIdx++) {
        const val = scores[viewedPlayerIdx][cat.id]?.[colIdx];
        const isFilled = val !== null && val !== undefined;
        const isCellActive = (viewedPlayerIdx === activeIdx) && isMyTurn;

        let previewText = "—";
        let isPreview = false;
        if (!isFilled && isCellActive && !yState.usePhysicalDice && yState.rollsLeft < 3) {
          const diceVals = yState.virtualDice.map(d => d.val);
          const pot = getSuggestedYahtzeeScore(cat.id, diceVals);
          if (pot !== null) {
            previewText = String(pot * (colIdx + 1));
            isPreview = true;
          }
        }

        const btn = el("button", {
          className: isFilled ? "score-cell filled" : (isPreview ? "score-cell empty preview-score" : "score-cell empty"),
          disabled: !isCellActive && !isFilled,
          text: isFilled ? String(val) : previewText,
          onClick: () => {
            if (isFilled) return;
            openScoreSelector(yState, viewedPlayerIdx, cat, colIdx);
          }
        });
        cols.push(el("td", { style: "text-align: center;" }, [btn]));
      }
    } else {
      players.forEach((name, pIdx) => {
        const val = scores[pIdx][cat.id];
        const isFilled = val !== null && val !== undefined;
        const isCellActive = (pIdx === activeIdx) && isMyTurn;

        let previewText = "—";
        let isPreview = false;
        if (!isFilled && isCellActive && !yState.usePhysicalDice && yState.rollsLeft < 3) {
          const diceVals = yState.virtualDice.map(d => d.val);
          const pot = getSuggestedYahtzeeScore(cat.id, diceVals);
          if (pot !== null) {
            previewText = String(pot);
            isPreview = true;
          }
        }
        
        const btn = el("button", {
          className: isFilled ? "score-cell filled" : (isPreview ? "score-cell empty preview-score" : "score-cell empty"),
          disabled: !isCellActive && !isFilled,
          text: isFilled ? String(val) : previewText,
          onClick: () => {
            if (isFilled) return;
            openScoreSelector(yState, pIdx, cat);
          }
        });
        cols.push(el("td", { style: "text-align: center;" }, [btn]));
      });
    }

    rows.push(el("tr", {}, cols));
  });

  // End of table columns totals
  if (yState.isTriple) {
    const stats = playerStats[viewedPlayerIdx];
    
    const subtotalCols = [el("td", { text: "Column Subtotals", style: "font-weight: bold; font-size: 0.85rem;" })];
    for (let colIdx = 0; colIdx < 3; colIdx++) {
      subtotalCols.push(el("td", { text: String(stats.columns[colIdx].subtotal), style: "font-weight: bold; text-align: center; font-size: 0.85rem;" }));
    }
    rows.push(el("tr", { style: "background: rgba(255,255,255,0.01);" }, subtotalCols));

    const multCols = [el("td", { text: "Multipliers", style: "font-weight: bold; font-size: 0.85rem;" })];
    for (let colIdx = 0; colIdx < 3; colIdx++) {
      multCols.push(el("td", { text: `x${colIdx + 1}`, style: "font-weight: bold; text-align: center; font-size: 0.85rem; color: var(--sunset-soft);" }));
    }
    rows.push(el("tr", { style: "background: rgba(255,255,255,0.01);" }, multCols));

    const multTotalsCols = [el("td", { text: "Multiplied Totals", style: "font-weight: bold; font-size: 0.85rem;" })];
    for (let colIdx = 0; colIdx < 3; colIdx++) {
      multTotalsCols.push(el("td", { text: String(stats.columns[colIdx].multipliedTotal), style: "font-weight: bold; text-align: center; font-size: 0.85rem; color: var(--sunset-soft);" }));
    }
    rows.push(el("tr", { style: "background: rgba(255,255,255,0.02); border-top: 1px dashed rgba(255,255,255,0.15);" }, multTotalsCols));

    const grandTotalCols = [
      el("td", { text: "GRAND TOTAL", style: "font-weight: 900; font-size: 1rem; color: var(--sunset-soft);" }),
      el("td", { text: String(stats.grandTotal), colSpan: "3", style: "font-weight: 900; text-align: center; font-size: 1.15rem; color: var(--sunset-soft);" })
    ];
    rows.push(el("tr", { style: "background: rgba(255, 100, 100, 0.05); border-top: 2px solid rgba(255,255,255,0.15);" }, grandTotalCols));
  } else {
    const grandTotalCols = [el("td", { text: "GRAND TOTAL", style: "font-weight: 900; font-size: 1rem; color: var(--sunset-soft);" })];
    players.forEach((name, pIdx) => {
      grandTotalCols.push(el("td", {
        text: String(playerStats[pIdx].grandTotal),
        style: "font-weight: 900; text-align: center; font-size: 1rem; color: var(--sunset-soft);"
      }));
    });
    rows.push(el("tr", { style: "background: rgba(255, 100, 100, 0.05); border-top: 2px solid rgba(255,255,255,0.15);" }, grandTotalCols));
  }

  const table = el("table", { className: "yahtzee-table", style: "width: 100%; border-collapse: collapse; margin-bottom: 20px;" }, [
    el("thead", {}, [el("tr", {}, headerCols)]),
    el("tbody", {}, rows)
  ]);

  const rollerPanel = el("div", {
    className: "panel center",
    style: "background: #0b1a20; padding: 12px; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; width: 100%; margin-bottom: 20px;"
  });

  function drawRollerPanel() {
    // Prevent layout thrashing and spastic screen by locking height during active rolling
    if (yState.virtualRolling) {
      const currentHeight = rollerPanel.offsetHeight;
      if (currentHeight > 0) {
        rollerPanel.style.minHeight = `${currentHeight}px`;
      }
    } else {
      rollerPanel.style.minHeight = "";
    }

    rollerPanel.innerHTML = "";
    
    // Toggle for Virtual vs Physical Dice
    const typeSelector = el("div", {
      style: "display: flex; gap: 8px; justify-content: center; margin-bottom: 12px; background: rgba(255,255,255,0.03); padding: 4px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);"
    }, [
      el("button", {
        className: !yState.usePhysicalDice ? "btn small" : "btn ghost small",
        text: "📱 Virtual Roller",
        style: "margin: 0; padding: 6px 12px; font-size: 0.75rem; border: none; box-shadow: none; flex: 1;",
        onClick: () => {
          yState.usePhysicalDice = false;
          drawRollerPanel();
          renderBoard(yState);
          if (isOnline) relay({ type: "state_update", state: yState });
        }
      }),
      el("button", {
        className: yState.usePhysicalDice ? "btn small" : "btn ghost small",
        text: "🎲 Physical Dice",
        style: "margin: 0; padding: 6px 12px; font-size: 0.75rem; border: none; box-shadow: none; flex: 1;",
        onClick: () => {
          yState.usePhysicalDice = true;
          drawRollerPanel();
          renderBoard(yState);
          if (isOnline) relay({ type: "state_update", state: yState });
        }
      })
    ]);

    rollerPanel.appendChild(typeSelector);

    if (yState.usePhysicalDice) {
      rollerPanel.appendChild(el("p", {
        style: "font-size: 0.85rem; font-weight: 700; color: var(--sunset-soft); margin: 12px 0 4px;",
        text: "🎲 Physical Dice Mode Active"
      }));
      rollerPanel.appendChild(el("p", {
        className: "muted",
        style: "font-size: 0.75rem; margin: 0 0 10px; line-height: 1.4;",
        text: "Roll your real-life dice, then tap any empty scorecard cell to record your score."
      }));
      return;
    }

    const titleRow = el("div", {
      style: "display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 8px;"
    }, [
      el("h4", { text: `${activePlayerName}'s Roller`, style: "margin: 0; font-size: 0.9rem;" }),
      el("div", {
        text: `Rolls Left: ${yState.rollsLeft}`,
        style: "font-size: 0.8rem; font-weight: bold; color: var(--sunset-soft);"
      })
    ]);

    const diceGrid = el("div", { style: "display: flex; gap: 8px; justify-content: center; margin: 12px 0;" });
    yState.virtualDice.forEach((die, dIdx) => {
      const dFace = renderDiceFaceSVG(die.val, die.held);
      const card = el("div", {
        className: "dice-box" + (die.held ? " held" : "") + (yState.virtualRolling && !die.held ? " rolling" : ""),
        style: `width: 44px; height: 44px; padding: 2px; border: 2px solid ${die.held ? "var(--sunset-soft)" : "rgba(255,255,255,0.1)"}; border-radius: 8px; cursor: ${yState.virtualRolling || !isMyTurn ? "not-allowed" : "pointer"};`,
        onClick: () => {
          if (yState.virtualRolling || !isMyTurn) return;
          die.held = !die.held;
          drawRollerPanel();
          
          if (isOnline) relay({ type: "state_update", state: yState });
        }
      }, [dFace]);
      diceGrid.appendChild(card);
    });

    const rollBtn = el("button", {
      className: "btn small",
      text: yState.rollsLeft === 0 ? "No Rolls Left" : "Roll Dice",
      disabled: yState.rollsLeft === 0 || yState.virtualRolling || !isMyTurn,
      style: "margin: 0; flex: 1;",
      onClick: () => {
        if (yState.rollsLeft <= 0 || yState.virtualRolling || !isMyTurn) return;
        if (isOnline) {
          triggerOnlineDiceRoll();
        } else {
          triggerLocalDiceRoll();
        }
      }
    });

    const resetRollerBtn = el("button", {
      className: "btn ghost small error",
      text: "Reset",
      disabled: !isMyTurn,
      style: "margin: 0;",
      onClick: () => {
        yState.rollsLeft = 3;
        yState.virtualDice = Array(5).fill(null).map(() => ({ val: 1, held: false }));
        yState.virtualRolling = false;
        drawRollerPanel();
        
        if (isOnline) relay({ type: "state_update", state: yState });
      }
    });

    const actionWrap = el("div", { style: "display: flex; gap: 8px; width:100%;" }, [resetRollerBtn, rollBtn]);

    rollerPanel.appendChild(titleRow);
    rollerPanel.appendChild(diceGrid);
    if (isMyTurn) {
      rollerPanel.appendChild(actionWrap);
    } else {
      rollerPanel.appendChild(el("p", {
        className: "muted anim-pulse center",
        style: "margin: 0; font-weight:bold; font-size:0.85rem;",
        text: `Waiting for ${activePlayerName} to roll or score...`
      }));
    }
  }

  const leaveBtn = el("button", {
    className: "btn ghost small",
    text: "Quit Game",
    onClick: () => {
      if (confirm("Are you sure you want to end this game?")) {
        if (isOnline) relay({ type: "quit" });
        resetAll();
        goHome();
      }
    }
  });

  const boardTitle = isOnline ? `Yahtzee Room: ${roomCode}` : "Yahtzee Scorecard";

  // Build the Triple tabs element
  let tabEl = el("div");
  if (yState.isTriple) {
    const tabs = players.map((name, pIdx) => {
      const stats = playerStats[pIdx];
      const isViewing = (pIdx === viewedPlayerIdx);
      const isActive = (pIdx === activeIdx);
      
      return el("button", {
        className: isViewing ? "triple-tab-btn btn small" : "triple-tab-btn btn ghost small",
        style: `margin: 0; padding: 6px 12px; font-size: 0.8rem; flex-shrink: 0; border: 1.5px solid ${isActive ? "var(--sunset-soft)" : "transparent"}; max-width: 120px;`,
        onClick: () => {
          viewedPlayerIdx = pIdx;
          renderBoard(yState);
        }
      }, [
        el("span", { text: name, style: "font-weight: bold; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" }),
        el("span", { text: `${stats.grandTotal} pts`, style: "font-size: 0.7rem; opacity: 0.8;" })
      ]);
    });

    tabEl = el("div", {
      className: "triple-tabs-container"
    }, tabs);
  }

  const mainPanelChildren = [
    rollerPanel
  ];

  if (yState.isTriple) {
    mainPanelChildren.push(el("div", { style: "width: 100%; margin-bottom: 8px;" }, [
      el("label", { text: "VIEW SCORES FOR PLAYER:", style: "font-size: 0.7rem; color: var(--sunset-soft); text-align: left; display: block; margin-bottom: 4px; letter-spacing: 0.5px;" }),
      tabEl
    ]));
    mainPanelChildren.push(el("h3", { text: `${players[viewedPlayerIdx]}'s Scorecard`, style: "margin: 8px 0 14px; text-align: center; color: var(--sunset-soft); font-size: 1.1rem;" }));
  }

  mainPanelChildren.push(table);
  mainPanelChildren.push(el("div", { style: "display: flex; gap: 8px; justify-content: center;" }, [leaveBtn]));

  mount(
    diceTopbar(boardTitle, () => {
      if (confirm("Exit scorecard?")) {
        if (isOnline) relay({ type: "quit" });
        resetAll();
        goHome();
      }
    }),
    el("div", { className: "panel center", style: "max-width: 720px; margin: 0 auto; padding: 12px;" }, mainPanelChildren)
  );

  drawRollerFn = drawRollerPanel;
  drawRollerPanel();
}

// ── Dice Rolling Sync and Animation Loops ────────────────────────────────────
// ── Dice Rolling Sync and Animation Loops ────────────────────────────────────
function triggerLocalDiceRoll() {
  gState.virtualRolling = true;
  let clicks = 0;
  const limit = 8;
  const interval = setInterval(() => {
    gState.virtualDice.forEach(d => {
      if (!d.held) d.val = Math.floor(Math.random() * 6) + 1;
    });
    
    // Smooth rendering: only redraw the roller panel during rolling
    if (drawRollerFn) {
      drawRollerFn();
    } else {
      renderBoard(gState);
    }
    
    playClickTone(480 + Math.random() * 120, 0.03);
    clicks++;

    if (clicks >= limit) {
      clearInterval(interval);
      gState.virtualRolling = false;
      
      gState.virtualDice.forEach(d => {
        if (!d.held) d.val = Math.floor(Math.random() * 6) + 1;
      });
      gState.rollsLeft--;
      playClickTone(750, 0.07);
      
      // Roll complete: redraw the full board to update scorecard previews!
      renderBoard(gState);
    }
  }, 80);
}

function triggerOnlineDiceRoll() {
  // Host generates rolling values
  const diceValues = gState.virtualDice.map(d => {
    if (!d.held) return Math.floor(Math.random() * 6) + 1;
    return d.val;
  });

  relay({
    type: "trigger_roll",
    diceValues
  });

  triggerOnlineRollAnimation(diceValues);
}

function triggerOnlineRollAnimation(diceValues) {
  gState.virtualRolling = true;
  let clicks = 0;
  const limit = 8;
  const interval = setInterval(() => {
    gState.virtualDice.forEach(d => {
      if (!d.held) d.val = Math.floor(Math.random() * 6) + 1;
    });
    
    // Smooth rendering: only redraw the roller panel during rolling
    if (drawRollerFn) {
      drawRollerFn();
    } else {
      renderBoard(gState);
    }
    
    playClickTone(480 + Math.random() * 120, 0.03);
    clicks++;

    if (clicks >= limit) {
      clearInterval(interval);
      gState.virtualRolling = false;
      
      gState.virtualDice.forEach((d, idx) => {
        d.val = diceValues[idx];
      });
      gState.rollsLeft--;
      playClickTone(750, 0.07);
      
      if (activePlayerNameMatchesMe()) {
        relay({ type: "state_update", state: gState });
      }
      
      // Roll complete: redraw the full board to update scorecard previews!
      renderBoard(gState);
    }
  }, 80);
}

function activePlayerNameMatchesMe() {
  if (!gState) return false;
  return gState.players[gState.activePlayerIdx] === myName;
}

// ── Scorecard entry popup ───────────────────────────────────────────────────
function openScoreSelector(yState, pIdx, category, colIdx = null) {
  const isPhysical = !!yState.usePhysicalDice;

  const currentVal = colIdx !== null 
    ? yState.scores[pIdx][category.id]?.[colIdx]
    : yState.scores[pIdx][category.id];
    
  let inputVal = currentVal !== null && currentVal !== undefined ? String(currentVal) : "";

  const hasRolledVals = yState.virtualDice.map(d => d.val);
  const suggestedScore = getSuggestedYahtzeeScore(category.id, hasRolledVals);
  
  if (!isPhysical && suggestedScore !== null && inputVal === "") {
    inputVal = String(suggestedScore);
  }

  // Check if roll is required in virtual mode
  if (!isPhysical && yState.rollsLeft === 3) {
    const modalContent = el("div", {
      className: "panel",
      style: "max-width: 320px; width: 90%; background: #0b1a20; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); text-align: center;"
    }, [
      el("h3", { text: "Roll Required", style: "color: var(--sunset-soft);" }),
      el("p", { className: "muted", style: "font-size:0.85rem; margin: 12px 0 18px; line-height: 1.4;", text: "You must roll the virtual dice first before scoring. Alternatively, enable 'Physical Dice' mode at the top of the scorecard." }),
      el("button", { className: "btn", text: "OK", onClick: () => modal.remove() })
    ]);
    const modal = el("div", {
      className: "modal-overlay",
      style: "position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 100000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px);"
    }, [modalContent]);
    document.body.appendChild(modal);
    return;
  }

  const title = el("h3", { text: `Enter ${yState.players[pIdx]}'s Score` });
  
  let subtitleText = `${category.name} (${category.desc})`;
  if (colIdx !== null) {
    subtitleText += ` • Col ${colIdx + 1} (x${colIdx + 1} Multiplier)`;
  }
  const subTitle = el("p", { className: "muted", text: subtitleText });

  const inputDisplay = el("div", {
    className: "score-input-display",
    text: inputVal || "0",
    style: "font-size: 2.2rem; font-weight: 900; color: var(--sunset-soft); text-align: center; padding: 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; margin: 12px 0;"
  });

  function pressKey(k) {
    if (k === "C") {
      inputVal = "";
    } else if (k === "⌫") {
      inputVal = inputVal.slice(0, -1);
    } else {
      if (inputVal === "0") inputVal = "";
      inputVal += k;
    }
    inputDisplay.textContent = inputVal || "0";
  }

  const quickOptions = [];
  if (isPhysical) {
    // Enable full suggestions for physical mode
    if (category.id === "ones") [0, 1, 2, 3, 4, 5].forEach(v => quickOptions.push(v));
    if (category.id === "twos") [0, 2, 4, 6, 8, 10].forEach(v => quickOptions.push(v));
    if (category.id === "threes") [0, 3, 6, 9, 12, 15].forEach(v => quickOptions.push(v));
    if (category.id === "fours") [0, 4, 8, 12, 16, 20].forEach(v => quickOptions.push(v));
    if (category.id === "fives") [0, 5, 10, 15, 20, 25].forEach(v => quickOptions.push(v));
    if (category.id === "sixes") [0, 6, 12, 18, 24, 30].forEach(v => quickOptions.push(v));
    if (category.id === "full_house") [0, 25].forEach(v => quickOptions.push(v));
    if (category.id === "sm_straight") [0, 30].forEach(v => quickOptions.push(v));
    if (category.id === "lg_straight") [0, 40].forEach(v => quickOptions.push(v));
    if (category.id === "yahtzee") [0, 50].forEach(v => quickOptions.push(v));
    if (category.id === "bonus_yahtzee") [0, 100, 200, 300].forEach(v => quickOptions.push(v));
  } else {
    // Virtual Mode: Cheat-proof suggestions. The only option is the mathematically correct suggested score!
    if (suggestedScore !== null) {
      quickOptions.push(suggestedScore);
    } else {
      quickOptions.push(0);
    }
  }

  const quickRow = el("div", { className: "quick-row", style: "display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; margin-bottom: 12px;" });
  quickOptions.forEach(opt => {
    quickRow.appendChild(el("button", {
      className: "btn ghost small",
      text: String(opt),
      style: "width: auto; padding: 6px 12px; font-weight: bold; border-radius: 8px;",
      onClick: () => {
        inputVal = String(opt);
        inputDisplay.textContent = inputVal;
      }
    }));
  });

  const padGrid = el("div", { className: "numpad-grid", style: "display: flex; flex-direction: column; gap: 8px; max-width: 280px; margin: 0 auto 16px;" });
  if (isPhysical) {
    // Numpad is only displayed/enabled in Physical Mode!
    const numpadKeys = [
      ["1", "2", "3"],
      ["4", "5", "6"],
      ["7", "8", "9"],
      ["C", "0", "⌫"]
    ];

    numpadKeys.forEach(rowKeys => {
      const rowEl = el("div", { style: "display: flex; gap: 8px;" });
      rowKeys.forEach(k => {
        rowEl.appendChild(el("button", {
          className: "btn ghost",
          text: k,
          style: "flex: 1; height: 50px; font-size: 1.2rem; font-weight: 700; border-radius: 10px;",
          onClick: () => pressKey(k)
        }));
      });
      padGrid.appendChild(rowEl);
    });
  }

  const saveBtn = el("button", {
    className: "btn",
    text: "Save Score",
    onClick: () => {
      const parsed = parseInt(inputVal, 10);
      let valToSave = isNaN(parsed) ? 0 : parsed;
      
      // Cheat-proofing: if not physical, clamp to mathematically correct score
      if (!isPhysical) {
        valToSave = suggestedScore !== null ? suggestedScore : 0;
      }

      if (colIdx !== null) {
        yState.scores[pIdx][category.id][colIdx] = valToSave;
      } else {
        yState.scores[pIdx][category.id] = valToSave;
      }
      
      yState.rollsLeft = 3;
      yState.virtualDice = Array(5).fill(null).map(() => ({ val: 1, held: false }));
      yState.virtualRolling = false;
      yState.activePlayerIdx = (yState.activePlayerIdx + 1) % yState.players.length;

      modal.remove();

      if (isOnline) {
        relay({ type: "state_update", state: yState });
      } else {
        renderBoard(yState);
      }
    }
  });

  const scratchBtn = el("button", {
    className: "btn error ghost",
    text: "Scratch (0)",
    style: "margin-top: 8px;",
    onClick: () => {
      if (colIdx !== null) {
        yState.scores[pIdx][category.id][colIdx] = 0;
      } else {
        yState.scores[pIdx][category.id] = 0;
      }
      
      yState.rollsLeft = 3;
      yState.virtualDice = Array(5).fill(null).map(() => ({ val: 1, held: false }));
      yState.virtualRolling = false;
      yState.activePlayerIdx = (yState.activePlayerIdx + 1) % yState.players.length;

      modal.remove();

      if (isOnline) {
        relay({ type: "state_update", state: yState });
      } else {
        renderBoard(yState);
      }
    }
  });

  const cancelBtn = el("button", {
    className: "btn ghost",
    text: "Cancel",
    style: "margin-top: 8px;",
    onClick: () => modal.remove()
  });

  const modalContentChildren = [
    title,
    subTitle,
    inputDisplay
  ];

  if (quickOptions.length > 0) {
    modalContentChildren.push(
      el("label", { text: isPhysical ? "QUICK OPTIONS:" : "CALCULATED SCORE:", style: "font-size:0.7rem; color:var(--sunset-soft); margin-top:8px; display:block;" }),
      quickRow
    );
  }

  if (isPhysical) {
    modalContentChildren.push(padGrid);
  } else {
    // Add cheat-proof details for virtual mode
    modalContentChildren.push(el("p", {
      className: "muted",
      style: "font-size:0.75rem; margin: 8px 0 16px; line-height:1.4;",
      text: "Playing with Virtual Roller. Custom inputs are disabled to ensure fair play. Tapping 'Save Score' will lock in the mathematically calculated value."
    }));
  }

  modalContentChildren.push(saveBtn);
  if (suggestedScore !== 0) {
    modalContentChildren.push(scratchBtn);
  }
  modalContentChildren.push(cancelBtn);

  const modalContent = el("div", {
    className: "panel",
    style: "max-width: 320px; width: 90%; background: #0b1a20; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); text-align: center;"
  }, modalContentChildren);

  const modal = el("div", {
    className: "modal-overlay",
    style: "position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 100000; display: flex; align-items: center; justify-content: center;"
  }, [modalContent]);

  document.body.appendChild(modal);
}

// ── Yahtzee Score computation helper for roller suggestions ──────────────────
function getSuggestedYahtzeeScore(catId, vals) {
  if (!vals || vals.length === 0) return null;

  const counts = Array(7).fill(0);
  vals.forEach(v => counts[v]++);
  const sumOfAll = vals.reduce((a, b) => a + b, 0);

  if (catId === "ones") return counts[1] * 1;
  if (catId === "twos") return counts[2] * 2;
  if (catId === "threes") return counts[3] * 3;
  if (catId === "fours") return counts[4] * 4;
  if (catId === "fives") return counts[5] * 5;
  if (catId === "sixes") return counts[6] * 6;

  if (catId === "three_kind") {
    const ok = counts.some(c => c >= 3);
    return ok ? sumOfAll : 0;
  }
  if (catId === "four_kind") {
    const ok = counts.some(c => c >= 4);
    return ok ? sumOfAll : 0;
  }

  if (catId === "full_house") {
    const has3 = counts.some(c => c === 3);
    const has2 = counts.some(c => c === 2);
    const has5 = counts.some(c => c === 5);
    return (has3 && has2) || has5 ? 25 : 0;
  }

  if (catId === "sm_straight") {
    const has = (f) => counts[f] > 0;
    const ok = (has(1) && has(2) && has(3) && has(4)) ||
               (has(2) && has(3) && has(4) && has(5)) ||
               (has(3) && has(4) && has(5) && has(6));
    return ok ? 30 : 0;
  }

  if (catId === "lg_straight") {
    const has = (f) => counts[f] > 0;
    const ok = (has(1) && has(2) && has(3) && has(4) && has(5)) ||
               (has(2) && has(3) && has(4) && has(5) && has(6));
    return ok ? 40 : 0;
  }

  if (catId === "yahtzee") {
    const ok = counts.some(c => c === 5);
    return ok ? 50 : 0;
  }

  if (catId === "chance") {
    return sumOfAll;
  }

  return null;
}
