// Modular Farkle Scorekeeper and Virtual Roller for PWA.
import { el, mount, toast, store } from "../ui.js";
import { icons } from "../icons.js";
import { renderDiceFaceSVG, playClickTone } from "./dice_hub.js";

const WS_BASE = location.hostname === "localhost" || location.hostname === "127.0.0.1"
  ? "ws://localhost:3000"
  : "wss://lakehouse-cardgames-sync.gameassassin777.workers.dev";

const HTTP_BASE = location.hostname === "localhost" || location.hostname === "127.0.0.1"
  ? "http://localhost:3000"
  : "https://lakehouse-cardgames-sync.gameassassin777.workers.dev";

let goHome = () => {};
let socket = null;
let roomCode = "";
let myName = "";
let isHost = false;
let heartbeatInt = null;
let roomBrowserRefresh = null;

let isOnline = false;
let setupMode = "passplay"; // "passplay" or "online"

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
  const savedName = localStorage.getItem("farkle.name") || "";
  const nameInput = el("input", {
    type: "text",
    placeholder: "Your name…",
    value: savedName,
    id: "f-name",
    style: "font-size:1.1rem; border-radius:14px; text-align:center; margin-bottom:14px; width:100%;"
  });

  const codeInput = el("input", {
    type: "text",
    placeholder: "4-LETTER CODE",
    id: "f-code",
    maxLength: 4,
    style: "font-size:1.3rem; border-radius:14px; text-align:center; text-transform:uppercase; letter-spacing:6px; margin-bottom:10px; width:100%;"
  });
  codeInput.addEventListener("input", () => { codeInput.value = codeInput.value.toUpperCase(); });

  const getName = () => {
    const n = nameInput.value.trim();
    if (!n) { toast("Enter your name first!"); return null; }
    localStorage.setItem("farkle.name", n);
    return n;
  };

  const savedNames = store.get("farkle.names", ["", "", ""]);
  let names = savedNames.slice();
  let piggybackRule = store.get("farkle.piggyback", true);

  const listWrap = el("div", { id: "farklePlayerList", style: "margin: 16px 0;" });

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
      if (names.length < 8) {
        names.push("");
        drawList();
      } else {
        toast("Max 8 players for Farkle.");
      }
    }
  });

  const ruleToggle = el("label", {
    style: "display: flex; align-items: center; gap: 8px; margin: 16px 0; cursor: pointer; justify-content: center; font-weight: 500;"
  }, [
    el("input", {
      type: "checkbox",
      checked: piggybackRule,
      onChange: (e) => {
        piggybackRule = e.target.checked;
        store.set("farkle.piggyback", piggybackRule);
      }
    }),
    document.createTextNode("Enable Piggyback Rule (High Stakes)")
  ]);

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
          el("li", { text: "Farkle is a high-rolling dice game played to 10,000 points using 6 dice." }),
          el("li", { text: "Objective: On your turn, roll the dice to accumulate points. You must score at least 500 points in a single turn to 'get on the board' initially." }),
          el("li", { text: "Scoring Combos: Single 1s (100 pts) and 5s (50 pts) score. Three-of-a-kind (face value * 100, except 1s which are 1000 pts), straights, or multiple pairs also score." }),
          el("li", { text: "Locking & Rerolling: You must lock in at least one scoring die after each roll to bank those points, then you can roll the remaining dice." }),
          el("li", { text: "Hot Dice: If all 6 dice are locked/scored, you get 'HOT DICE' and can roll all 6 again to keep increasing your score!" }),
          el("li", { text: "Farkle!: If a roll contains absolutely zero scoring combinations, you FARKLE! You lose all points accumulated in this turn, and the turn passes." }),
          el("li", { text: "Piggybacking: If enabled, you can start your turn using the previous player's banked score and remaining unused dice to compound the stakes!" })
        ])
      ]);
      showRulesBtn.parentNode.insertBefore(rPanel, showRulesBtn.nextSibling);
    }
  });

  const startBtn = el("button", {
    className: "btn",
    text: "Start Farkle",
    style: "width:100%;",
    onClick: () => {
      const cleaned = names.map((n, idx) => n.trim() || `Player ${idx + 1}`);
      store.set("farkle.names", cleaned);
      isOnline = false;
      initLocalGame(cleaned, piggybackRule);
    }
  });

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
        ruleToggle,
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
    diceTopbar("Farkle Setup", goHome),
    el("div", { className: "panel center", style: "max-width: 480px; margin: 0 auto;" }, [
      el("div", { style: "width:64px; height:64px; margin:0 auto 12px; color:var(--sunset-soft);" }, [icons.roasts()]),
      el("h2", { text: "Farkle Setup" }),
      el("p", { className: "muted", text: "Farkle is a dice rolling game played to 10,000 points. Score 500+ to get on the board. Use physical dice or our embedded virtual roller!" }),
      showRulesBtn,
      modeSelector,
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
      const res = await fetch(`${HTTP_BASE}/rooms/list?game=farkle`).then(r => r.json());
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
  roomBrowserRefresh = setInterval(loadRooms, 8000);

  mount(
    diceTopbar("Open Farkle Rooms", () => { clearInterval(roomBrowserRefresh); renderSetup(); }),
    el("div", { className: "panel center" }, [
      el("p", { className: "muted", style: "margin:0; font-size:0.82rem;", text: "Tap Join to enter any open Farkle lobby." })
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
    ? `${WS_BASE}/ws/create?name=${encodeURIComponent(myName)}&game=farkle`
    : `${WS_BASE}/ws/join?code=${code}&name=${encodeURIComponent(myName)}&game=farkle`;

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
      console.error("[Farkle] Parse error:", e);
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
}

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

async function registerRoom() {
  try {
    await fetch(`${HTTP_BASE}/rooms/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: roomCode, host: myName, playerCount: gState?.players?.length || 1,
        game: "farkle", private: false,
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
              toast("Need at least 2 players to start Farkle!");
              return;
            }
            initOnlineGame();
          }
        })
      : el("p", { className: "muted center anim-pulse", text: "Waiting for host to start..." })
  ]);

  mount(diceTopbar(`Farkle Lobby`, () => { resetAll(); renderSetup(); }), lobbyLayout);
}

// ── Game Loops Initialization ───────────────────────────────────────────────
function initLocalGame(players, piggybackRule) {
  const gameStates = players.map(() => ({
    total: 0,
    history: [],
    onBoard: false
  }));

  gState = {
    phase: "play",
    players,
    states: gameStates,
    activePlayerIdx: 0,
    piggybackRule,
    lastBankedScore: 0,
    lastBankedRemainingDice: 0,
    lastBankedPlayerName: "",
    turnTempScore: 0,
    turnRemainingDice: 6,
    turnIsPiggybacked: false,
    turnHasRolled: false,
    virtualDice: [],
    virtualRolling: false
  };

  renderBoard(gState);
}

function initOnlineGame() {
  const gameStates = gState.players.map(() => ({
    total: 0,
    history: [],
    onBoard: false
  }));

  const initialState = {
    phase: "play",
    players: gState.players,
    states: gameStates,
    activePlayerIdx: 0,
    piggybackRule: true, // online always enabled for high stakes fun
    lastBankedScore: 0,
    lastBankedRemainingDice: 0,
    lastBankedPlayerName: "",
    turnTempScore: 0,
    turnRemainingDice: 6,
    turnIsPiggybacked: false,
    turnHasRolled: false,
    virtualDice: [],
    virtualRolling: false
  };

  relay({
    type: "start_game",
    state: initialState
  });

  gState = initialState;
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
    // Other clients trigger the identical local roll animation loop!
    triggerOnlineRollAnimation(action.diceValues);
  } else if (action.type === "quit") {
    toast(`${sender} ended the game.`);
    resetAll();
    renderSetup();
  }
}

// ── Board Renderer & Sovereign turn controls ───────────────────────────────
function renderBoard(state) {
  const players = state.players;
  const states = state.states;
  const activeIdx = state.activePlayerIdx;
  const activePlayerName = players[activeIdx];
  const activeState = states[activeIdx];

  const isMyTurn = isOnline ? (activePlayerName === myName) : true;

  const standings = players.map((name, pIdx) => ({
    name,
    pIdx,
    total: states[pIdx].total,
    onBoard: states[pIdx].onBoard
  })).sort((a, b) => b.total - a.total);

  const playerBlocks = players.map((name, pIdx) => {
    const pState = states[pIdx];
    const isActive = pIdx === activeIdx;
    
    return el("div", {
      className: "farkle-player-card" + (isActive ? " active" : ""),
      style: `padding: 12px 16px; margin-bottom: 8px; border-radius: 12px; border: 1px solid ${isActive ? "var(--sunset-soft)" : "rgba(255,255,255,0.06)"}; background: ${isActive ? "rgba(255,145,100,0.04)" : "rgba(255,255,255,0.01)"}; display: flex; align-items: center; justify-content: space-between;`
    }, [
      el("div", {}, [
        el("div", { style: "display: flex; align-items: center; gap: 8px;" }, [
          el("h3", { text: name, style: "margin: 0;" }),
          pState.onBoard 
            ? el("span", { className: "badge", style: "background: rgba(0,250,150,0.1); color: #00ffaa; font-size: 0.65rem; border: 1px solid rgba(0,250,150,0.3); padding: 1px 6px;", text: "ON BOARD" })
            : el("span", { className: "badge", style: "background: rgba(255,255,255,0.03); color: #888; font-size: 0.65rem; border: 1px dashed rgba(255,255,255,0.15); padding: 1px 6px;", text: "NOT ON BOARD" })
        ]),
        el("div", { className: "muted", style: "font-size: 0.75rem; margin-top: 4px;" }, [
          document.createTextNode(pState.history.length > 0 ? `History: ${pState.history.join(", ")}` : "No rounds logged yet")
        ])
      ]),
      el("div", { style: "text-align: right;" }, [
        el("div", { text: String(pState.total), style: "font-size: 1.4rem; font-weight: bold; color: var(--sunset-soft);" }),
        el("div", { className: "muted", style: "font-size: 0.65rem;" }, [document.createTextNode("points")])
      ])
    ]);
  });

  const turnPanel = el("div", { className: "panel center", style: "align-self: flex-start; background: #0b1a20;" });
  
  function drawTurnPanel() {
    turnPanel.innerHTML = "";

    const canPiggyback = state.piggybackRule && 
                         state.lastBankedScore > 0 && 
                         state.lastBankedRemainingDice > 0 && 
                         state.lastBankedPlayerName !== activePlayerName &&
                         !state.turnHasRolled;

    const heading = el("h3", { text: `${activePlayerName}'s Turn`, style: "margin-top: 0;" });
    const desc = el("p", {
      className: "muted",
      style: "font-size: 0.85rem; margin-bottom: 12px;",
      text: activeState.onBoard
        ? `Running Score: ${state.turnTempScore} • Remaining Dice: ${state.turnRemainingDice}`
        : `Must score 500+ in a turn to get on the board! (Running: ${state.turnTempScore})`
    });

    let piggybackBtn = null;
    if (canPiggyback && isMyTurn) {
      piggybackBtn = el("button", {
        className: "btn success",
        style: "background: linear-gradient(135deg, #00ffaa, #00b377); color: #051410; margin-bottom: 12px; font-weight: 700; width: 100%; border:none;",
        html: `🔥 Piggyback on ${state.lastBankedPlayerName}<br><span style="font-size:0.75rem;">Start with +${state.lastBankedScore} pts & ${state.lastBankedRemainingDice} dice</span>`,
        onClick: () => {
          state.turnTempScore = state.lastBankedScore;
          state.turnRemainingDice = state.lastBankedRemainingDice;
          state.turnIsPiggybacked = true;
          state.turnHasRolled = true;
          toast(`Piggybacked! Starting with ${state.turnTempScore} points using ${state.turnRemainingDice} dice.`);
          
          if (isOnline) {
            relay({ type: "state_update", state });
            triggerOnlineDiceRoll();
          } else {
            drawTurnPanel();
            triggerLocalVirtualRoll();
          }
        }
      });
    }

    const rollerHeading = el("h4", { text: "Virtual Dice Roller", style: "margin: 16px 0 6px; font-size: 0.9rem;" });
    const virtualDiceGrid = el("div", { style: "display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-bottom: 8px;" });

    function drawVirtualDice() {
      virtualDiceGrid.innerHTML = "";
      if (state.virtualDice.length === 0) {
        virtualDiceGrid.appendChild(el("div", { className: "muted", style: "font-size:0.8rem; padding: 12px;", text: "Dice ready to roll" }));
        return;
      }
      state.virtualDice.forEach((die, dIdx) => {
        const dFace = renderDiceFaceSVG(die.val, die.held || die.scored);
        const card = el("div", {
          className: "dice-box" + (die.held ? " held" : "") + (die.scored ? " scored" : "") + (state.virtualRolling && !die.held && !die.scored ? " rolling" : ""),
          style: `width: 44px; height: 44px; padding: 2px; border: 2px solid ${die.scored ? "#00ffaa" : (die.held ? "var(--sunset-soft)" : "rgba(255,255,255,0.1)")}; border-radius: 8px; cursor: ${die.scored || state.virtualRolling || !isMyTurn ? "not-allowed" : "pointer"};`,
          onClick: () => {
            if (state.virtualRolling || die.scored || !isMyTurn) return;
            die.held = !die.held;
            drawVirtualDice();
            updateRollerButtons();
            
            if (isOnline) relay({ type: "state_update", state });
          }
        }, [dFace]);
        virtualDiceGrid.appendChild(card);
      });
    }

    const actionRow = el("div", { style: "display: flex; gap: 8px; margin-top: 10px; width: 100%;" });
    const rollTriggerBtn = el("button", {
      className: "btn small",
      disabled: !isMyTurn,
      text: state.turnHasRolled ? "Roll Remaining" : "Roll Dice",
      onClick: () => {
        state.turnHasRolled = true;
        if (isOnline) {
          triggerOnlineDiceRoll();
        } else {
          triggerLocalVirtualRoll();
        }
      }
    });

    const keepTriggerBtn = el("button", {
      className: "btn ghost small success",
      text: "Lock Selected & Keep Rolling",
      disabled: true,
      onClick: () => {
        const selected = state.virtualDice.filter(d => d.held && !d.scored);
        const vals = selected.map(d => d.val);
        const score = getFarkleDiceScore(vals);

        if (score === 0) {
          toast("⚠️ Selected dice do not form a valid scoring combination!");
          return;
        }

        state.turnTempScore += score;
        selected.forEach(d => { d.scored = true; d.held = false; });
        
        let remaining = state.virtualDice.filter(d => !d.scored).length;
        if (remaining === 0) {
          remaining = 6;
          state.virtualDice = [];
          toast("🔥 HOT DICE! All 6 dice reset for rolling!");
        }
        state.turnRemainingDice = remaining;

        toast(`Locked selected dice! +${score} points. Running total: ${state.turnTempScore}`);
        
        if (isOnline) {
          relay({ type: "state_update", state });
        } else {
          drawTurnPanel();
        }
      }
    });

    function updateRollerButtons() {
      const selected = state.virtualDice.filter(d => d.held && !d.scored);
      const vals = selected.map(d => d.val);
      const score = getFarkleDiceScore(vals);
      
      if (score > 0 && isMyTurn) {
        keepTriggerBtn.disabled = false;
        keepTriggerBtn.textContent = `Lock Selected (+${score} pts)`;
      } else {
        keepTriggerBtn.disabled = true;
        keepTriggerBtn.textContent = "Lock Selected";
      }
    }

    actionRow.appendChild(rollTriggerBtn);
    actionRow.appendChild(keepTriggerBtn);

    const manualHeading = el("h4", { text: "Or Log Score Manually", style: "margin: 20px 0 6px; font-size: 0.9rem; border-top: 1px solid rgba(255,255,255,0.06); padding-top:16px;" });
    let turnScoreInput = "";
    const inputDisplay = el("div", {
      className: "farkle-score-display",
      text: "0",
      style: "font-size: 2rem; font-weight: bold; text-align: center; color: var(--sunset-soft); padding: 12px; background: rgba(255,255,255,0.02); border-radius: 10px; margin-bottom: 8px;"
    });

    function pressKey(k) {
      if (!isMyTurn) return;
      if (k === "C") {
        turnScoreInput = "";
      } else if (k === "⌫") {
        turnScoreInput = turnScoreInput.slice(0, -1);
      } else {
        if (turnScoreInput === "0") turnScoreInput = "";
        turnScoreInput += k;
      }
      inputDisplay.textContent = turnScoreInput || "0";
    }

    const numpadKeys = [
      ["1", "2", "3"],
      ["4", "5", "6"],
      ["7", "8", "9"],
      ["C", "0", "⌫"]
    ];

    const padGrid = el("div", { className: "numpad-grid", style: "display: flex; flex-direction: column; gap: 6px; max-width: 240px; margin: 0 auto 12px;" });
    numpadKeys.forEach(rowKeys => {
      const rowEl = el("div", { style: "display: flex; gap: 6px;" });
      rowKeys.forEach(k => {
        rowEl.appendChild(el("button", {
          className: "btn ghost small",
          text: k,
          disabled: !isMyTurn,
          style: "flex: 1; height: 38px; font-size: 1rem; font-weight: 700; border-radius: 6px; margin:0;",
          onClick: () => pressKey(k)
        }));
      });
      padGrid.appendChild(rowEl);
    });

    const bankBtn = el("button", {
      className: "btn",
      disabled: !isMyTurn,
      text: "Bank Score",
      style: "width: 100%;",
      onClick: () => {
        let scoreVal = parseInt(turnScoreInput, 10) || 0;
        if (state.turnTempScore > 0) {
          scoreVal += state.turnTempScore;
        }

        if (scoreVal === 0) {
          logFarkle(0);
          return;
        }

        if (!activeState.onBoard) {
          if (scoreVal < 500) {
            toast("⚠️ Must score at least 500 points to get on the board!");
            return;
          }
          activeState.onBoard = true;
        }

        activeState.total += scoreVal;
        activeState.history.push(scoreVal);
        toast(`Banked ${scoreVal} points for ${activePlayerName}!`);

        if (state.piggybackRule) {
          let remaining = state.turnRemainingDice;
          if (state.virtualDice.length > 0) {
            remaining = state.virtualDice.filter(d => !d.scored).length;
          } else {
            const ans = prompt("How many unused dice did you have? (0 to 5)", "0");
            remaining = parseInt(ans, 10) || 0;
          }

          if (remaining > 0 && remaining < 6) {
            state.lastBankedScore = scoreVal;
            state.lastBankedRemainingDice = remaining;
            state.lastBankedPlayerName = activePlayerName;
          } else {
            state.lastBankedScore = 0;
            state.lastBankedRemainingDice = 0;
            state.lastBankedPlayerName = "";
          }
        }

        checkWinAndPass();
      }
    });

    const farkleBtn = el("button", {
      className: "btn error ghost",
      disabled: !isMyTurn,
      text: "FARKLE (0)",
      style: "margin-top: 8px; width: 100%;",
      onClick: () => logFarkle(0)
    });

    const quitBtn = el("button", {
      className: "btn ghost",
      text: isOnline ? "Quit Lobby" : "Quit Game",
      style: "margin-top: 16px; width: 100%;",
      onClick: () => {
        if (confirm("Are you sure you want to quit?")) {
          if (isOnline) relay({ type: "quit" });
          resetAll();
          goHome();
        }
      }
    });

    turnPanel.appendChild(heading);
    turnPanel.appendChild(desc);
    if (piggybackBtn) turnPanel.appendChild(piggybackBtn);
    
    turnPanel.appendChild(rollerHeading);
    turnPanel.appendChild(virtualDiceGrid);
    turnPanel.appendChild(actionRow);
    
    if (isMyTurn) {
      turnPanel.appendChild(manualHeading);
      turnPanel.appendChild(inputDisplay);
      turnPanel.appendChild(padGrid);
      turnPanel.appendChild(bankBtn);
      turnPanel.appendChild(farkleBtn);
    } else {
      turnPanel.appendChild(el("p", {
        className: "muted anim-pulse center",
        style: "margin-top: 24px; font-weight:bold;",
        text: `Waiting for ${activePlayerName} to roll/bank...`
      }));
    }
    turnPanel.appendChild(quitBtn);

    drawVirtualDice();
  }

  function logFarkle(scoreVal) {
    activeState.history.push(0);
    toast(`${activePlayerName} Farkled! 0 points logged.`);

    state.lastBankedScore = 0;
    state.lastBankedRemainingDice = 0;
    state.lastBankedPlayerName = "";

    checkWinAndPass();
  }

  function checkWinAndPass() {
    if (activeState.total >= 10000) {
      toast(`🏆🏆🏆 ${activePlayerName} wins the game with ${activeState.total} points!`);
    }

    state.turnTempScore = 0;
    state.turnRemainingDice = 6;
    state.turnIsPiggybacked = false;
    state.turnHasRolled = false;
    state.virtualDice = [];
    
    state.activePlayerIdx = (activeIdx + 1) % players.length;

    if (isOnline) {
      relay({ type: "state_update", state });
    } else {
      renderBoard(state);
    }
  }

  // ── Standalone Local Roll ──────────────────────────────────────────────────
  function triggerLocalVirtualRoll() {
    if (state.virtualRolling) return;
    state.virtualRolling = true;
    
    const count = state.turnRemainingDice;
    if (state.virtualDice.length === 0 || state.virtualDice.filter(d => !d.scored).length === 0) {
      state.virtualDice = Array(6).fill(null).map(() => ({ val: 1, held: false, scored: false }));
      for (let i = count; i < 6; i++) {
        state.virtualDice[i].scored = true;
      }
    }

    let clicks = 0;
    const limit = 8;
    const interval = setInterval(() => {
      state.virtualDice.forEach(d => {
        if (!d.scored && !d.held) d.val = Math.floor(Math.random() * 6) + 1;
      });
      drawTurnPanel();
      playClickTone(450 + Math.random() * 100, 0.03);
      clicks++;

      if (clicks >= limit) {
        clearInterval(interval);
        state.virtualRolling = false;

        state.virtualDice.forEach(d => {
          if (!d.scored && !d.held) d.val = Math.floor(Math.random() * 6) + 1;
        });

        playClickTone(700, 0.06);

        const unheldPool = state.virtualDice.filter(d => !d.scored && !d.held).map(d => d.val);
        const maxUnheldScore = getFarkleDiceScore(unheldPool);

        if (maxUnheldScore === 0) {
          toast("💥 FARKLE! No scoring dice on this roll!");
          setTimeout(() => { logFarkle(0); }, 2000);
        } else {
          toast(`Rolled! Selected unheld dice have potential points. Tap dice to hold.`);
        }
        drawTurnPanel();
      }
    }, 80);

    drawTurnPanel();
  }

  // ── Sync Online Roll loops ─────────────────────────────────────────────────
  function triggerOnlineDiceRoll() {
    const count = state.turnRemainingDice;
    if (state.virtualDice.length === 0 || state.virtualDice.filter(d => !d.scored).length === 0) {
      state.virtualDice = Array(6).fill(null).map(() => ({ val: 1, held: false, scored: false }));
      for (let i = count; i < 6; i++) {
        state.virtualDice[i].scored = true;
      }
    }

    // Host generates final rolled values
    const diceValues = state.virtualDice.map(d => {
      if (!d.scored && !d.held) return Math.floor(Math.random() * 6) + 1;
      return d.val;
    });

    relay({
      type: "trigger_roll",
      diceValues
    });

    triggerOnlineRollAnimation(diceValues);
  }

  function triggerOnlineRollAnimation(diceValues) {
    state.virtualRolling = true;
    
    // Set matching placeholders
    if (state.virtualDice.length === 0) {
      state.virtualDice = Array(6).fill(null).map(() => ({ val: 1, held: false, scored: false }));
    }

    let clicks = 0;
    const limit = 8;
    const interval = setInterval(() => {
      state.virtualDice.forEach((d, idx) => {
        if (!d.scored && !d.held) d.val = Math.floor(Math.random() * 6) + 1;
      });
      drawTurnPanel();
      playClickTone(450 + Math.random() * 100, 0.03);
      clicks++;

      if (clicks >= limit) {
        clearInterval(interval);
        state.virtualRolling = false;

        // Apply final values
        state.virtualDice.forEach((d, idx) => {
          d.val = diceValues[idx];
        });

        playClickTone(700, 0.06);

        if (isMyTurn) {
          const unheldPool = state.virtualDice.filter(d => !d.scored && !d.held).map(d => d.val);
          const maxUnheldScore = getFarkleDiceScore(unheldPool);

          if (maxUnheldScore === 0) {
            toast("💥 FARKLE! No scoring dice on this roll!");
            setTimeout(() => { logFarkle(0); }, 2000);
          } else {
            toast(`Rolled! Selected unheld dice have potential points. Tap dice to hold.`);
          }
          relay({ type: "state_update", state });
        }
        drawTurnPanel();
      }
    }, 80);

    drawTurnPanel();
  }

  const standingsList = standings.map((st, rank) => {
    return el("div", {
      style: "display: flex; justify-content: space-between; font-size: 0.85rem; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05);"
    }, [
      el("span", { style: "font-weight: 500;" }, [
        document.createTextNode(`${rank + 1}. ${st.name}`)
      ]),
      el("span", { text: String(st.total), style: "font-weight: bold; color: var(--sunset-soft);" })
    ]);
  });

  const boardTopbarTitle = isOnline ? `Farkle Room: ${roomCode}` : "Farkle Scorekeeper";

  mount(
    diceTopbar(boardTopbarTitle, () => {
      if (confirm("Exit to home screen?")) {
        if (isOnline) relay({ type: "quit" });
        resetAll();
        goHome();
      }
    }),
    el("div", {
      className: "farkle-board-layout",
      style: "display: flex; flex-direction: column; gap: 20px; max-width: 800px; margin: 0 auto; padding: 12px;"
    }, [
      el("div", { style: "display: grid; grid-template-columns: 1fr 1fr; gap: 16px; flex-wrap: wrap;" }, [
        el("div", {}, [
          el("h2", { text: "Standings", style: "font-size: 1.1rem; margin-top: 0; letter-spacing: 0.5px;" }),
          ...playerBlocks,
          el("div", { className: "panel center", style: "margin-top: 16px;" }, [
            el("h3", { text: "Leaderboard Summary", style: "font-size: 0.9rem; margin-top: 0;" }),
            ...standingsList
          ])
        ]),
        turnPanel
      ])
    ])
  );

  drawTurnPanel();
}

// ── Farkle Score calculation helper ──────────────────────────────────────────
function getFarkleDiceScore(vals) {
  if (vals.length === 0) return 0;
  
  const counts = Array(7).fill(0);
  vals.forEach(v => counts[v]++);

  // Check 1-6 straight
  if (vals.length === 6 && counts.slice(1).every(c => c === 1)) {
    return 1500;
  }

  // Check 3 pairs
  const pairCount = counts.filter(c => c === 2).length;
  if (vals.length === 6 && pairCount === 3) {
    return 1500;
  }

  // Check two triplets
  const tripletCount = counts.filter(c => c === 3).length;
  if (vals.length === 6 && tripletCount === 2) {
    return 2500;
  }

  let totalScore = 0;

  // Check multiples (4 or 5 or 6 of a kind)
  for (let face = 1; face <= 6; face++) {
    const qty = counts[face];
    if (qty >= 6) {
      totalScore += 3000;
      counts[face] -= 6;
    } else if (qty === 5) {
      totalScore += 2000;
      counts[face] -= 5;
    } else if (qty === 4) {
      totalScore += 1000;
      counts[face] -= 4;
    }
  }

  // Check triplets (exactly 3 of a kind left)
  for (let face = 1; face <= 6; face++) {
    if (counts[face] >= 3) {
      if (face === 1) {
        totalScore += 1000;
      } else {
        totalScore += face * 100;
      }
      counts[face] -= 3;
    }
  }

  // Individual 1s and 5s
  totalScore += counts[1] * 100;
  totalScore += counts[5] * 50;

  // Verify locked selection has only scoring dice
  let usedDiceCount = 0;
  if (vals.length === 6 && counts.slice(1).every(c => c === 1)) {
    usedDiceCount = 6;
  } else if (vals.length === 6 && pairCount === 3) {
    usedDiceCount = 6;
  } else if (vals.length === 6 && tripletCount === 2) {
    usedDiceCount = 6;
  } else {
    const freshCounts = Array(7).fill(0);
    vals.forEach(v => freshCounts[v]++);
    for (let face = 1; face <= 6; face++) {
      const qty = freshCounts[face];
      if (qty >= 3) {
        usedDiceCount += qty;
      } else {
        if (face === 1 || face === 5) {
          usedDiceCount += qty;
        }
      }
    }
  }

  if (usedDiceCount < vals.length) {
    return 0; // Contains non-scoring dice!
  }

  return totalScore;
}
