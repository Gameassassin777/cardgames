// Modular Liar's Dice online and offline party game engine.
import { el, mount, toast, store, shuffle, HTTP_BASE, WS_BASE } from "../ui.js";
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

// Master host state tracking for secret unmasked dice rolls
let masterState = null;
let gState = null;

// ── Shared AudioContext (reused to prevent CPU spikes) ─────────────────────
let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (_audioCtx.state === "suspended") {
    _audioCtx.resume();
  }
  return _audioCtx;
}

function gameTopbar(title, onBack) {
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
  roomCode = ""; myName = ""; isHost = false; gState = null; masterState = null; isOnline = false;
}

function renderSetup() {
  const savedName = localStorage.getItem("liars.name") || "";
  const nameInput = el("input", {
    type: "text",
    placeholder: "Your name…",
    value: savedName,
    id: "l-name",
    style: "font-size:1.1rem; border-radius:14px; text-align:center; margin-bottom:14px; width:100%;"
  });

  const codeInput = el("input", {
    type: "text",
    placeholder: "4-LETTER CODE",
    id: "l-code",
    maxLength: 4,
    style: "font-size:1.3rem; border-radius:14px; text-align:center; text-transform:uppercase; letter-spacing:6px; margin-bottom:10px; width:100%;"
  });
  codeInput.addEventListener("input", () => { codeInput.value = codeInput.value.toUpperCase(); });

  const getName = () => {
    const n = nameInput.value.trim();
    if (!n) { toast("Enter your name first!"); return null; }
    localStorage.setItem("liars.name", n);
    return n;
  };

  const savedNames = store.get("liars.localNames", ["", "", ""]);
  let names = savedNames.slice();

  const listWrap = el("div", { style: "margin: 16px 0; max-height:220px; overflow-y:auto; width:100%;" });

  function drawList() {
    listWrap.innerHTML = "";
    names.forEach((nm, i) => {
      const input = el("input", {
        type: "text",
        value: nm,
        maxlength: "14",
        placeholder: `Player ${i + 1}`,
        style: "flex:1; border-radius:12px; font-size:1rem; padding: 8px 12px; text-align:center;",
        onInput: (e) => { 
          names[i] = e.target.value; 
          store.set("liars.localNames", names);
        }
      });
      const row = el("div", { style: "display:flex; gap:8px; align-items:center; margin-bottom: 8px; width:100%;" }, [
        input,
        el("button", {
          className: "btn ghost small error",
          text: "✕",
          style: "margin:0; padding:6px 12px; border-radius:12px; font-size:1.1rem; line-height:1;",
          onClick: () => {
            if (names.length > 2) {
              names.splice(i, 1);
              store.set("liars.localNames", names);
              drawList();
            } else {
              toast("Liar's Dice needs at least 2 players.");
            }
          }
        })
      ]);
      listWrap.appendChild(row);
    });
  }

  const addPlayerBtn = el("button", {
    className: "btn ghost small",
    text: "+ Add Player",
    style: "width:100%; margin-bottom:10px;",
    onClick: () => {
      if (names.length < 8) {
        names.push("");
        store.set("liars.localNames", names);
        drawList();
      } else {
        toast("Max 8 players for local play.");
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
          el("li", { text: "Secret Roll: Each player secretly rolls 5 dice and views them without showing others." }),
          el("li", { text: "Bidding: Players take turns bidding on the total number of dice of a specific face in the whole room (e.g. four 5s)." }),
          el("li", { text: "Raising: You must raise the bid on your turn by increasing the quantity of dice, or increasing the die face value if keeping the quantity same." }),
          el("li", { text: "Wildcard rule: In this simplified version, dice faces 2 through 6 are active, with no complex wildcards." }),
          el("li", { text: "Challenge: If you think the current bid is a bluff, call 'LIAR!' and reveal all cups. If the actual count is less than the bid, the bidder loses a die. If the count is equal or greater, you lose a die!" }),
          el("li", { text: "Elimination: Lose all 5 of your dice to be eliminated. The last player with dice remaining wins." })
        ])
      ]);
      showRulesBtn.parentNode.insertBefore(rPanel, showRulesBtn.nextSibling);
    }
  });

  const startBtn = el("button", {
    className: "btn",
    text: "Start Liar's Dice",
    style: "width:100%;",
    onClick: () => {
      const cleaned = names.map((n, idx) => n.trim() || `Player ${idx + 1}`).slice(0, 8);
      if (cleaned.length < 2) {
        toast("Liar's Dice needs at least 2 players.");
        return;
      }
      isOnline = false;
      initLocalGame(cleaned);
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
        addPlayerBtn,
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

  mount(
    gameTopbar("Liar's Dice Setup", goHome),
    el("div", { className: "panel center", style: "max-width: 440px; margin: 0 auto;" }, [
      el("div", { style: "width:64px; height:64px; margin:0 auto 12px; color:var(--sunset-soft);" }, [icons.dice()]),
      el("h2", { text: "Liar's Dice", style: "margin-bottom: 4px;" }),
      el("p", { className: "muted", style: "margin-bottom:20px;", text: "A high-stakes bluffing game! Bid on how many total dice of a face exist in the room. Challenge bids by calling 'Liar!'" }),
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
      const res = await fetch(`${HTTP_BASE}/rooms/list?game=liars_dice`).then(r => r.json());
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
    gameTopbar("Open Liar's Dice Rooms", () => { clearInterval(roomBrowserRefresh); renderSetup(); }),
    el("div", { className: "panel center" }, [
      el("p", { className: "muted", style: "margin:0; font-size:0.82rem;", text: "Tap Join to enter any open Liar's Dice lobby." })
    ]),
    el("div", { className: "panel" }, [listEl])
  );
}

// ── WebSockets Networking ──────────────────────────────────────────────────
function connectRoom(type, code = "") {
  isOnline = true;
  mount(
    gameTopbar("Connecting", () => { resetAll(); renderSetup(); }),
    el("div", { className: "panel center", style: "margin:30px auto; max-width:320px;" }, [
      el("div", { className: "spin-indicator", style: "font-size:2rem; margin-bottom:12px;", text: "🌀" }),
      el("p", { text: type === "create" ? "Creating room…" : `Joining ${code}…` })
    ])
  );

  const url = type === "create"
    ? `${WS_BASE}/ws/create?name=${encodeURIComponent(myName)}&game=liars_dice`
    : `${WS_BASE}/ws/join?code=${code}&name=${encodeURIComponent(myName)}&game=liars_dice`;

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
      console.error("[Liar's Dice] Parse error:", e);
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
        game: "liars_dice", private: false,
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
              toast("Need at least 2 players to start Liar's Dice!");
              return;
            }
            initOnlineGame();
          }
        })
      : el("p", { className: "muted center anim-pulse", text: "Waiting for host to start..." })
  ]);

  mount(gameTopbar(`Liar's Dice Lobby`, () => { resetAll(); renderSetup(); }), lobbyLayout);
}

// ── Local Game Logic ──────────────────────────────────────────────────────────
function initLocalGame(players) {
  const pStates = players.map(name => ({
    name,
    diceCount: 5,
    dice: []
  }));

  const state = {
    players: pStates,
    currentRound: 1,
    activePlayerIdx: 0,
    currentBid: null,
    roundPhase: "reveal_cup",
    revealCycleIdx: 0
  };

  startNewRound(state);
}

function startNewRound(state) {
  const activeCount = state.players.filter(p => p.diceCount > 0).length;
  if (activeCount <= 1) {
    declareWinner(state);
    return;
  }

  state.players.forEach(p => {
    if (p.diceCount > 0) {
      p.dice = Array(p.diceCount).fill(0).map(() => Math.floor(Math.random() * 6) + 1);
      p.dice.sort((a, b) => a - b);
    } else {
      p.dice = [];
    }
  });

  state.currentBid = null;
  state.roundPhase = "reveal_cup";
  state.revealCycleIdx = 0;

  while (state.players[state.revealCycleIdx].diceCount === 0) {
    state.revealCycleIdx++;
  }

  renderCupCycle(state);
}

function renderCupCycle(state) {
  const p = state.players[state.revealCycleIdx];

  const content = el("div", { className: "panel center", style: "max-width: 480px; margin: 30px auto;" }, [
    el("h2", { text: "Pass the Device!", style: "margin-top:0;" }),
    el("p", { className: "muted", style: "font-size:1.15rem; margin:20px 0;", html: `Hand the phone secretly to <strong style="color:var(--sunset-soft); font-size:1.3rem;">${p.name}</strong> to view their secret dice cup.` }),
    el("button", {
      className: "btn",
      text: "View My Cup",
      onClick: () => renderCupReveal(state)
    })
  ]);

  mount(gameTopbar(`Liar's Dice — Round ${state.currentRound}`, () => confirmQuit(state)), content);
}

function renderCupReveal(state) {
  const p = state.players[state.revealCycleIdx];

  const diceGrid = el("div", { style: "display:flex; gap:10px; justify-content:center; margin:24px 0;" });
  p.dice.forEach(val => {
    const dFace = renderDiceFaceSVG(val);
    const box = el("div", {
      style: "width: 50px; height: 50px; padding: 3px; background: rgba(255,255,255,0.02); border: 2px solid rgba(255,255,255,0.12); border-radius: 10px;"
    }, [dFace]);
    diceGrid.appendChild(box);
  });

  const nextBtn = el("button", {
    className: "btn",
    text: "Hide Cup & Continue",
    onClick: () => {
      let next = state.revealCycleIdx + 1;
      while (next < state.players.length && state.players[next].diceCount === 0) {
        next++;
      }

      if (next < state.players.length) {
        state.revealCycleIdx = next;
        renderCupCycle(state);
      } else {
        state.roundPhase = "bidding";
        let startingIdx = 0;
        while (state.players[startingIdx].diceCount === 0) {
          startingIdx++;
        }
        state.activePlayerIdx = startingIdx;
        renderBiddingScreen(state);
      }
    }
  });

  mount(
    gameTopbar(`Secret Cup Reveal`, () => confirmQuit(state)),
    el("div", { className: "panel center", style: "max-width: 480px; margin: 0 auto;" }, [
      el("h3", { text: `${p.name}'s Secret Cup`, style: "color:var(--sunset-soft);" }),
      el("p", { className: "muted", text: "Memorize your rolled dice. Do not let other players see!" }),
      diceGrid,
      el("div", { className: "spacer" }),
      nextBtn
    ])
  );
}

// ── Online Game Logic & Broadcast Loop ─────────────────────────────────────────
function initOnlineGame() {
  const pStates = gState.players.map(name => ({
    name,
    diceCount: 5,
    dice: []
  }));

  masterState = {
    players: pStates,
    currentRound: 1,
    activePlayerIdx: 0,
    currentBid: null,
    roundPhase: "bidding"
  };

  relay({
    type: "start_game",
    players: pStates
  });

  startOnlineRound();
}

function startOnlineRound() {
  const activeCount = masterState.players.filter(p => p.diceCount > 0).length;
  if (activeCount <= 1) {
    declareOnlineWinner();
    return;
  }

  // Roll secret dice for all active players
  const diceMap = {};
  masterState.players.forEach(p => {
    if (p.diceCount > 0) {
      p.dice = Array(p.diceCount).fill(0).map(() => Math.floor(Math.random() * 6) + 1);
      p.dice.sort((a, b) => a - b);
      diceMap[p.name] = p.dice;
    } else {
      p.dice = [];
    }
  });

  masterState.currentBid = null;
  masterState.roundPhase = "bidding";

  // Pick first active player
  let startingIdx = masterState.activePlayerIdx;
  while (masterState.players[startingIdx].diceCount === 0) {
    startingIdx = (startingIdx + 1) % masterState.players.length;
  }
  masterState.activePlayerIdx = startingIdx;

  // Relayout unmasked to host, but masked to other clients
  relay({
    type: "start_round",
    state: {
      ...masterState,
      players: masterState.players.map(p => ({
        ...p,
        dice: [] // mask it
      }))
    },
    diceMap
  });
}

function handleRelay(action, sender) {
  if (action.type === "start_game") {
    gState = {
      players: action.players,
      currentRound: 1,
      activePlayerIdx: 0,
      currentBid: null,
      roundPhase: "bidding"
    };
  } else if (action.type === "start_round") {
    gState = action.state;
    // Unmask only my secret dice
    const me = gState.players.find(p => p.name === myName);
    if (me) {
      me.dice = action.diceMap[myName] || [];
    }
    renderBiddingScreen(gState);
  } else if (action.type === "place_bid") {
    gState.currentBid = action.bid;
    gState.activePlayerIdx = action.nextPlayerIdx;
    playClickTone(600, 0.08);
    renderBiddingScreen(gState);
  } else if (action.type === "call_liar") {
    if (isHost) {
      // Host evaluates the challenge with unmasked masterState rolls
      const bid = masterState.currentBid;
      let totalMatch = 0;
      masterState.players.forEach(pl => {
        if (pl.diceCount > 0) {
          totalMatch += pl.dice.filter(v => v === bid.face).length;
        }
      });
      const didBidderWin = totalMatch >= bid.count;
      const loserName = didBidderWin ? action.challenger : bid.bidder;
      const loser = masterState.players.find(p => p.name === loserName);
      loser.diceCount--;

      relay({
        type: "resolve_challenge",
        revealedPlayers: masterState.players,
        matchCount: totalMatch,
        didBidderWin,
        loserName,
        wasEliminated: loser.diceCount === 0
      });
    }
  } else if (action.type === "resolve_challenge") {
    gState.roundPhase = "reveal";
    gState.players = action.revealedPlayers;
    renderOnlineChallengeReveal(action);
  } else if (action.type === "next_round") {
    if (isHost) {
      masterState.currentRound++;
      startOnlineRound();
    }
  } else if (action.type === "quit") {
    toast(`${sender} ended the game.`);
    resetAll();
    renderSetup();
  }
}

// ── Bidding Board Renderer ───────────────────────────────────────────────────
function renderBiddingScreen(state) {
  const p = state.players[state.activePlayerIdx];
  const isMyTurn = isOnline ? (p.name === myName) : true;

  let bidDisplay = el("p", { text: "No active bids. You must start the bidding!", className: "muted center" });
  if (state.currentBid) {
    const curDieSVG = renderDiceFaceSVG(state.currentBid.face);
    curDieSVG.style.width = "22px";
    curDieSVG.style.height = "22px";
    curDieSVG.style.display = "inline-block";
    curDieSVG.style.verticalAlign = "middle";
    curDieSVG.style.marginLeft = "4px";

    bidDisplay = el("div", {
      className: "panel center",
      style: "border: 1px solid var(--sunset-soft); background:rgba(255,145,100,0.04); border-radius:12px; padding:12px; margin-bottom:20px;"
    }, [
      el("span", { text: "Current Bid: ", className: "muted", style: "font-size:0.8rem; text-transform:uppercase;" }),
      el("h3", { style: "margin: 4px 0 0; color: var(--sunset-soft); font-weight:900;" }, [
        document.createTextNode(`${state.currentBid.count} of `),
        curDieSVG,
        document.createTextNode(` (by ${state.currentBid.bidder})`)
      ])
    ]);
  }

  let bidCount = state.currentBid ? state.currentBid.count : 1;
  let bidFace = state.currentBid ? state.currentBid.face : 2;

  const countDisplay = el("span", { text: String(bidCount), style: "font-size:2rem; font-weight:bold; color:var(--sunset-soft);" });
  
  const increaseCount = el("button", {
    className: "btn ghost small",
    text: "+",
    disabled: !isMyTurn,
    style: "font-size:1.5rem; width:48px; height:48px; border-radius:12px; padding:0; margin:0;",
    onClick: () => {
      bidCount++;
      countDisplay.textContent = String(bidCount);
      validateBid();
    }
  });

  const decreaseCount = el("button", {
    className: "btn ghost small",
    text: "-",
    disabled: !isMyTurn,
    style: "font-size:1.5rem; width:48px; height:48px; border-radius:12px; padding:0; margin:0;",
    onClick: () => {
      const minCount = state.currentBid ? state.currentBid.count : 1;
      if (bidCount > minCount) {
        bidCount--;
        countDisplay.textContent = String(bidCount);
        validateBid();
      }
    }
  });

  const faceSelector = el("div", { style: "display:flex; gap:8px; justify-content:center; margin:16px 0;" });
  function drawFaceSelector() {
    faceSelector.innerHTML = "";
    [2, 3, 4, 5, 6].forEach(faceVal => {
      const isSelected = bidFace === faceVal;
      const faceSVG = renderDiceFaceSVG(faceVal, isSelected);
      faceSVG.style.width = "30px";
      faceSVG.style.height = "30px";
      faceSVG.style.margin = "0 auto";

      const btn = el("button", {
        className: isSelected ? "btn small" : "btn ghost small",
        disabled: !isMyTurn,
        style: `flex:1; padding: 6px; border:2px solid ${isSelected ? "var(--sunset-soft)" : "rgba(255,255,255,0.12)"}; border-radius:12px;`,
        onClick: () => {
          bidFace = faceVal;
          drawFaceSelector();
          validateBid();
        }
      }, [faceSVG]);
      faceSelector.appendChild(btn);
    });
  }

  const bidBtn = el("button", {
    className: "btn",
    text: "Place Bid",
    disabled: !isMyTurn,
    style: "width:100%; font-weight:bold;",
    onClick: () => {
      if (isOnline) {
        let nextIdx = (state.activePlayerIdx + 1) % state.players.length;
        while (state.players[nextIdx].diceCount === 0) {
          nextIdx = (nextIdx + 1) % state.players.length;
        }
        relay({
          type: "place_bid",
          bid: { count: bidCount, face: bidFace, bidder: myName },
          nextPlayerIdx: nextIdx
        });
      } else {
        state.currentBid = { count: bidCount, face: bidFace, bidder: p.name };
        let nextIdx = (state.activePlayerIdx + 1) % state.players.length;
        while (state.players[nextIdx].diceCount === 0) {
          nextIdx = (nextIdx + 1) % state.players.length;
        }
        state.activePlayerIdx = nextIdx;
        playClickTone(600, 0.08);
        renderLocalTurnTransition(state);
      }
    }
  });

  const liarBtn = el("button", {
    className: "btn error",
    text: "🚨 Challenger: LIAR!",
    disabled: !isMyTurn,
    style: "width:100%; font-weight:bold; margin-bottom:12px;",
    onClick: () => {
      if (isOnline) {
        relay({
          type: "call_liar",
          challenger: myName
        });
      } else {
        resolveLocalLiarChallenge(state);
      }
    }
  });

  function validateBid() {
    if (state.currentBid) {
      const curBid = state.currentBid;
      const countHigher = bidCount > curBid.count;
      const sameCountFaceHigher = (bidCount === curBid.count && bidFace > curBid.face);

      if (countHigher || sameCountFaceHigher) {
        bidBtn.disabled = !isMyTurn;
        bidBtn.classList.remove("ghost");
      } else {
        bidBtn.disabled = true;
        bidBtn.classList.add("ghost");
      }
    }
  }

  drawFaceSelector();
  validateBid();

  // Secret Cup Reveal for local or active online player
  const myStatePlayer = isOnline ? state.players.find(pl => pl.name === myName) : p;
  const myDice = myStatePlayer ? myStatePlayer.dice : [];

  const cupWrap = el("div", { style: "display:flex; gap:8px; justify-content:center; margin-top:8px;" });
  myDice.forEach(val => {
    const dFace = renderDiceFaceSVG(val);
    const box = el("div", { style: "width:34px; height:34px; padding:2px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.1); border-radius:6px;" }, [dFace]);
    cupWrap.appendChild(box);
  });

  const cupContainer = el("div", {
    className: "panel",
    style: "border:1px dashed rgba(255,255,255,0.15); border-radius:12px; margin-top:12px; padding:12px;"
  }, [
    el("p", { className: "muted center", text: isOnline ? "Your secret dice cup:" : `${p.name}'s secret cup:`, style: "margin:0 0 4px; font-size:0.75rem;" }),
    cupWrap
  ]);

  const totalActiveDice = state.players.reduce((sum, pl) => sum + pl.diceCount, 0);

  const topbarTitle = isOnline ? `Liar's Turn: ${p.name}` : `Liar's Turn: ${p.name}`;

  mount(
    gameTopbar(topbarTitle, () => confirmQuit(state)),
    el("div", { className: "panel center", style: "max-width: 480px; margin: 0 auto;" }, [
      el("h3", { text: isMyTurn ? "Your Bid Turn" : `${p.name}'s Turn`, style: "color:var(--sunset-soft); margin-top:0;" }),
      el("p", { className: "muted", text: `Active dice in play: ${totalActiveDice}`, style: "font-size:0.8rem; margin-bottom:12px;" }),
      bidDisplay,
      isMyTurn ? el("div", { style: "display:flex; align-items:center; justify-content:center; gap:16px; margin-bottom:12px;" }, [
        decreaseCount,
        countDisplay,
        increaseCount
      ]) : null,
      isMyTurn ? el("p", { className: "muted", text: "Select Die Face:", style: "font-size:0.8rem; margin:0;" }) : null,
      isMyTurn ? faceSelector : null,
      el("hr", { style: "border:none; border-top:1px solid rgba(255,255,255,0.06); margin:18px 0;" }),
      state.currentBid ? liarBtn : null,
      isMyTurn ? bidBtn : el("p", { className: "muted anim-pulse", text: `Waiting for ${p.name} to bid...` }),
      el("hr", { style: "border:none; border-top:1px solid rgba(255,255,255,0.06); margin:18px 0;" }),
      cupContainer
    ])
  );
}

function renderLocalTurnTransition(state) {
  const p = state.players[state.activePlayerIdx];

  const content = el("div", { className: "panel center", style: "max-width: 480px; margin: 30px auto;" }, [
    el("h2", { text: "Bid Submitted!" }),
    el("p", { className: "muted", style: "font-size:1.1rem; margin:20px 0;", html: `Pass the phone secretly to <strong style="color:var(--sunset-soft); font-size:1.25rem;">${p.name}</strong> to make their turn bid.` }),
    el("button", {
      className: "btn",
      text: "I am ready",
      onClick: () => renderBiddingScreen(state)
    })
  ]);

  mount(gameTopbar("Secret Bidding Pass", () => confirmQuit(state)), content);
}

// ── Resolve Challenge screens ──────────────────────────────────────────────────
function resolveLocalLiarChallenge(state) {
  const bid = state.currentBid;
  const activeChallenger = state.players[state.activePlayerIdx];

  let matchCount = 0;
  const revealRows = [];

  state.players.forEach(pl => {
    if (pl.diceCount > 0) {
      const plMatches = pl.dice.filter(v => v === bid.face).length;
      matchCount += plMatches;

      const cupWrap = el("div", { style: "display:flex; gap:6px; flex-wrap:wrap;" });
      pl.dice.forEach(val => {
        const isMatch = val === bid.face;
        const dFace = renderDiceFaceSVG(val, isMatch);
        const box = el("div", {
          style: `width: 32px; height: 32px; padding: 2px; background: ${isMatch ? "rgba(255,145,100,0.12)" : "rgba(255,255,255,0.01)"}; border: 1px solid ${isMatch ? "var(--sunset-soft)" : "rgba(255,255,255,0.08)"}; border-radius: 6px;`
        }, [dFace]);
        cupWrap.appendChild(box);
      });

      revealRows.push(el("div", {
        style: "display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:rgba(255,255,255,0.01); border-radius:10px; margin-bottom:8px; border:1px solid rgba(255,255,255,0.04);"
      }, [
        el("span", { text: pl.name, style: "font-weight: 500; font-size:0.88rem;" }),
        cupWrap
      ]));
    }
  });

  const didBidderWin = matchCount >= bid.count;
  let loserPlayerName = "";
  let logResultText = "";

  if (didBidderWin) {
    loserPlayerName = activeChallenger.name;
    logResultText = `Enough! There were ${matchCount} matching 🎲${bid.face}s in the room (required at least ${bid.count}). ${loserPlayerName} loses a die!`;
    playTone(320, 0.45);
  } else {
    loserPlayerName = bid.bidder;
    logResultText = `Liar! There were only ${matchCount} matching 🎲${bid.face}s in the room (bid was ${bid.count}). ${loserPlayerName} loses a die!`;
    playTone(320, 0.45);
  }

  const loser = state.players.find(pl => pl.name === loserPlayerName);
  loser.diceCount--;

  const wasEliminated = loser.diceCount === 0;

  const resultTitle = el("h2", {
    text: didBidderWin ? "Challenger Lost!" : "Bidder was a Liar!",
    style: `font-size:1.8rem; font-weight:900; color:${didBidderWin ? "#ff5e5e" : "#00ffaa"}; margin: 0 0 10px;`
  });

  const btnNext = el("button", {
    className: "btn",
    text: wasEliminated ? `${loserPlayerName} is Eliminated! Next Round ➔` : "Next Round ➔",
    onClick: () => {
      state.currentRound++;
      startNewRound(state);
    }
  });

  mount(
    gameTopbar("Liar Challenge Reveal!", () => confirmQuit(state)),
    el("div", { className: "panel center", style: "max-width: 500px; margin: 0 auto;" }, [
      resultTitle,
      el("p", { className: "muted", text: logResultText, style: "font-size:1.05rem; margin-bottom:20px; line-height:1.4;" }),
      revealRows,
      el("div", { className: "spacer" }),
      btnNext
    ])
  );
}

function renderOnlineChallengeReveal(action) {
  const bid = gState.currentBid;
  const revealRows = [];

  gState.players.forEach(pl => {
    if (pl.diceCount >= 0) { // include zero dice count players just in case
      const cupWrap = el("div", { style: "display:flex; gap:6px; flex-wrap:wrap;" });
      pl.dice.forEach(val => {
        const isMatch = val === bid.face;
        const dFace = renderDiceFaceSVG(val, isMatch);
        const box = el("div", {
          style: `width: 32px; height: 32px; padding: 2px; background: ${isMatch ? "rgba(255,145,100,0.12)" : "rgba(255,255,255,0.01)"}; border: 1px solid ${isMatch ? "var(--sunset-soft)" : "rgba(255,255,255,0.08)"}; border-radius: 6px;`
        }, [dFace]);
        cupWrap.appendChild(box);
      });

      revealRows.push(el("div", {
        style: "display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:rgba(255,255,255,0.01); border-radius:10px; margin-bottom:8px; border:1px solid rgba(255,255,255,0.04);"
      }, [
        el("span", { text: pl.name, style: "font-weight: 500; font-size:0.88rem;" }),
        cupWrap
      ]));
    }
  });

  const didBidderWin = action.didBidderWin;
  const resultTitle = el("h2", {
    text: didBidderWin ? "Challenger Lost!" : "Bidder was a Liar!",
    style: `font-size:1.8rem; font-weight:900; color:${didBidderWin ? "#ff5e5e" : "#00ffaa"}; margin: 0 0 10px;`
  });

  let logResultText = didBidderWin
    ? `Enough! There were ${action.matchCount} matching 🎲${bid.face}s in the room (required at least ${bid.count}). ${action.loserName} loses a die!`
    : `Liar! There were only ${action.matchCount} matching 🎲${bid.face}s in the room (bid was ${bid.count}). ${action.loserName} loses a die!`;

  const btnNext = el("button", {
    className: "btn",
    text: action.wasEliminated ? `${action.loserName} is Eliminated! Next Round ➔` : "Next Round ➔",
    onClick: () => {
      relay({
        type: "next_round"
      });
    }
  });

  mount(
    gameTopbar("Liar Challenge Reveal!", () => confirmQuit(gState)),
    el("div", { className: "panel center", style: "max-width: 500px; margin: 0 auto;" }, [
      resultTitle,
      el("p", { className: "muted", text: logResultText, style: "font-size:1.05rem; margin-bottom:20px; line-height:1.4;" }),
      revealRows,
      el("div", { className: "spacer" }),
      isHost ? btnNext : el("p", { className: "muted center anim-pulse", text: "Waiting for host to start next round..." })
    ])
  );
}

function declareOnlineWinner() {
  const winner = masterState.players.find(p => p.diceCount > 0);
  const winnerName = winner ? winner.name : "No one";

  relay({
    type: "resolve_challenge",
    revealedPlayers: masterState.players,
    matchCount: 0,
    didBidderWin: true,
    loserName: "No one",
    wasEliminated: true
  });

  // Small delay then trigger game over screen
  setTimeout(() => {
    mount(
      gameTopbar("Liar's Dice — End", () => { resetAll(); goHome(); }),
      el("div", { className: "panel center", style: "max-width: 440px; margin: 0 auto;" }, [
        el("h1", { text: "Game Over!", style: "font-size:2.8rem; font-weight:900; color:var(--sunset-soft); margin-top:0;" }),
        el("p", { className: "muted", text: "Only one player remains with dice left in their cup:" }),
        el("h2", { text: `👑 ${winnerName} 👑`, style: "font-size:2.2rem; font-weight:bold; color:#00ffaa; margin:20px 0;" }),
        el("p", { className: "muted", text: "The master bluffer rules the lake house!" }),
        el("div", { className: "spacer" }),
        el("button", { className: "btn", text: "Back to Lobby", onClick: () => { resetAll(); goHome(); } })
      ])
    );
  }, 100);
}

// ── Declare Grand Winner ─────────────────────────────────────────────────────
function declareWinner(state) {
  const winner = state.players.find(p => p.diceCount > 0);
  const winnerName = winner ? winner.name : "No one";

  playTone(600, 0.1);
  setTimeout(() => playTone(800, 0.15), 100);

  mount(
    gameTopbar("Liar's Dice — End", () => { resetAll(); goHome(); }),
    el("div", { className: "panel center", style: "max-width: 440px; margin: 0 auto;" }, [
      el("h1", { text: "Game Over!", style: "font-size:2.8rem; font-weight:900; color:var(--sunset-soft); margin-top:0;" }),
      el("p", { className: "muted", text: "Only one player remains with dice left in their cup:" }),
      el("h2", { text: `👑 ${winnerName} 👑`, style: "font-size:2.2rem; font-weight:bold; color:#00ffaa; margin:20px 0;" }),
      el("p", { className: "muted", text: "The master bluffer rules the lake house!" }),
      el("div", { className: "spacer" }),
      el("button", { className: "btn", text: "Back to Lobby", onClick: () => { resetAll(); goHome(); } })
    ])
  );
}

// ── Web Audio Synth Tones ───────────────────────────────────────────────────
function playTone(freq, duration) {
  try {
    const audioCtx = getAudioCtx();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.01, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (_) {}
}

function confirmQuit(state) {
  if (confirm("Are you sure you want to end this Liar's Dice game?")) {
    if (isOnline) {
      relay({ type: "quit" });
    }
    resetAll();
    goHome();
  }
}
