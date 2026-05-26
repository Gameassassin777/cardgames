// Game engine for Cards Against Monkeys / Cabin.
// Supports: Local Pass-and-Play, Physical Cards, and Real-Time Online Play (Cloudflare Worker).
import { el, mount, shuffle, toast, store, fillPrompt } from "./ui.js";
import { BLANK, CUSTOM_CARD_TEXT } from "./data.js";

const HAND_SIZE = 4; // High-intensity, strategic hand size

// Dynamic WebSockets Server Discovery
const wsUrl = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "ws://localhost:3000"
  : "wss://lakehouse-cardgames-sync.gameassassin777.workers.dev";

let goHome = () => {};
let state = null;
let cfg = null;

// Online specific states
let onlineMode = false;
let socket = null;
let roomCode = "";
let myName = "";
let isHost = false;
let onlinePlayers = [];
let onlineCustomCards = []; // Store persistent custom cards fetched from Cloudflare GlobalStore
let connectionStatus = "offline"; // "offline" | "connecting" | "lobby"
let hasSubmittedThisRound = false;

export function makeGame(config) {
  return function start(home) {
    goHome = home;
    cfg = config;
    resetOnlineState();

    const saved = store.get(cfg.saveKey, null);
    if (saved && saved.phase && saved.phase !== "over" && !saved.isOnline) {
      renderResume(saved);
    } else {
      renderSetup();
    }
  };
}

function resetOnlineState() {
  if (socket) {
    try { socket.close(); } catch(e) {}
    socket = null;
  }
  onlineMode = false;
  roomCode = "";
  myName = "";
  isHost = false;
  onlinePlayers = [];
  onlineCustomCards = [];
  connectionStatus = "offline";
  hasSubmittedThisRound = false;
  state = null;
}

function topbar(title) {
  return el("div", { className: "topbar" }, [
    el("button", { className: "back", text: "‹ Lobby", onClick: confirmQuit }),
    el("div", { className: "title", text: title }),
    el("span", { style: "width:64px" }),
  ]);
}

function confirmQuit() {
  resetOnlineState();
  goHome();
}

/* ---------------- Resume ---------------- */
function renderResume(saved) {
  mount(
    topbar(cfg.title),
    el("div", { className: "panel center" }, [
      el("div", { className: "big-emoji", text: cfg.icon }),
      el("h2", { text: "Game in progress" }),
      el("p", { className: "muted", text: `Round ${saved.round} • ${saved.players.length} players. Pick up where you left off?` }),
      el("div", { className: "spacer" }),
      el("button", { className: "btn", text: "Resume game", onClick: () => { state = saved; render(); } }),
      el("div", { className: "spacer" }),
      el("button", { className: "btn ghost", text: "Start a new game", onClick: () => { store.del(cfg.saveKey); renderSetup(); } }),
    ])
  );
}

/* ---------------- Setup ---------------- */
function renderSetup() {
  const savedNames = store.get(cfg.namesKey, ["", "", ""]);
  let names = savedNames.length >= 3 ? savedNames.slice() : ["", "", ""];
  let target = store.get(cfg.targetKey, 5);

  const listWrap = el("div", { id: "playerList" });

  function drawList() {
    listWrap.innerHTML = "";
    names.forEach((nm, i) => {
      const input = el("input", {
        type: "text",
        value: nm,
        maxlength: "16",
        placeholder: `Player ${i + 1}`,
        onInput: (e) => { names[i] = e.target.value; },
      });
      const row = el("div", { className: "player-row" }, [
        input,
        el("button", {
          className: "icon-btn",
          text: "✕",
          title: "Remove player",
          onClick: () => { if (names.length > 3) { names.splice(i, 1); drawList(); } else toast("Need at least 3 players."); },
        }),
      ]);
      listWrap.appendChild(row);
    });
  }
  drawList();

  const stepperVal = el("span", { className: "val", text: String(target) });
  const stepper = el("div", { className: "stepper" }, [
    el("button", { text: "−", onClick: () => { target = Math.max(1, target - 1); stepperVal.textContent = target; } }),
    stepperVal,
    el("button", { text: "+", onClick: () => { target = Math.min(20, target + 1); stepperVal.textContent = target; } }),
    el("span", { className: "muted", text: "points to win", style: "margin-left:6px" }),
  ]);

  let physical = store.get(cfg.physicalKey, false);
  const digitalBtn = el("button", { className: "btn", text: "📱 Digital Hand" });
  const physicalBtn = el("button", { className: "btn ghost", text: "🃏 Physical Cards" });
  const modeDesc = el("p", { className: "muted", style: "margin:8px 0 0; font-size:0.85rem;" });
  
  function setMode(p) {
    physical = p;
    digitalBtn.className = p ? "btn ghost" : "btn";
    physicalBtn.className = p ? "btn" : "btn ghost";
    modeDesc.textContent = p
      ? "You play with real cards. The app shows each prompt, runs the Card Czar, and keeps score."
      : "The app deals everyone a 4-card hand on this device and passes around to play. Discard unwanted cards freely.";
  }
  digitalBtn.onclick = () => setMode(false);
  physicalBtn.onclick = () => setMode(true);
  setMode(physical);

  const localTab = el("button", {
    className: "btn" + (!onlineMode ? " secondary" : " ghost"),
    text: "📱 Pass & Play",
    onClick: () => { onlineMode = false; renderSetup(); }
  });
  const onlineTab = el("button", {
    className: "btn" + (onlineMode ? " secondary" : " ghost"),
    text: "🌐 Play Online",
    onClick: () => { onlineMode = true; renderSetup(); }
  });

  const setupCard = el("div", { className: "panel" });

  if (!onlineMode) {
    setupCard.appendChild(el("label", { text: "Players (3+)" }));
    setupCard.appendChild(listWrap);
    setupCard.appendChild(el("button", {
      className: "btn ghost small",
      style: "margin-bottom: 12px;",
      text: "+ Add Player",
      onClick: () => { if (names.length < 12) { names.push(""); drawList(); } else toast("12 players max."); }
    }));
    setupCard.appendChild(el("hr", { className: "divider" }));
    setupCard.appendChild(el("label", { text: "Score to Win" }));
    setupCard.appendChild(stepper);
    setupCard.appendChild(el("hr", { className: "divider" }));
    setupCard.appendChild(el("label", { text: "Card Mode" }));
    setupCard.appendChild(el("div", { className: "btn-row" }, [digitalBtn, physicalBtn]));
    setupCard.appendChild(modeDesc);
    setupCard.appendChild(el("hr", { className: "divider" }));
    setupCard.appendChild(el("button", {
      className: "btn",
      text: `Start local game ${cfg.icon}`,
      onClick: () => beginGame(names, target, physical)
    }));
  } else {
    const nameInput = el("input", {
      type: "text",
      id: "onlineName",
      maxlength: "14",
      placeholder: "Your Username",
      value: myName
    });

    const codeInput = el("input", {
      type: "text",
      id: "roomCodeInput",
      maxlength: "4",
      placeholder: "LOBBY CODE (e.g. ABCD)",
      style: "text-transform: uppercase;"
    });

    setupCard.appendChild(el("label", { text: "1. Enter Your Name" }));
    setupCard.appendChild(nameInput);
    setupCard.appendChild(el("hr", { className: "divider" }));
    setupCard.appendChild(el("label", { text: "2. Host a New Online Room" }));
    setupCard.appendChild(el("button", {
      className: "btn",
      text: "🎮 Create Lobbies",
      onClick: () => {
        const val = nameInput.value.trim();
        if (!val) { toast("Please enter a name first."); return; }
        myName = val;
        createRoom();
      }
    }));
    setupCard.appendChild(el("hr", { className: "divider" }));
    setupCard.appendChild(el("label", { text: "3. Or Join an Existing Room" }));
    setupCard.appendChild(codeInput);
    setupCard.appendChild(el("button", {
      className: "btn ghost",
      style: "margin-top: 8px;",
      text: "🔗 Join Lobby",
      onClick: () => {
        const nameVal = nameInput.value.trim();
        const codeVal = codeInput.value.trim().toUpperCase();
        if (!nameVal) { toast("Please enter a name first."); return; }
        if (codeVal.length !== 4) { toast("Room code must be 4 letters."); return; }
        myName = nameVal;
        joinRoom(codeVal);
      }
    }));
  }

  mount(
    topbar(cfg.title),
    el("div", { className: "panel center" }, [
      el("p", { className: "muted", html: cfg.blurb }),
      el("div", { className: "btn-row", style: "margin-top:10px" }, [localTab, onlineTab])
    ]),
    setupCard,
    el("div", { className: "footer-note", text: cfg.footer })
  );
}

/* ---------------- Local Game Engine Initiator ---------------- */
function beginGame(rawNames, target, physical) {
  const players = rawNames.map((n) => n.trim()).filter(Boolean);
  if (players.length < 3) { toast("Add at least 3 player names."); return; }
  if (new Set(players.map((p) => p.toLowerCase())).size !== players.length) {
    toast("Player names must be unique."); return;
  }
  store.set(cfg.namesKey, players);
  store.set(cfg.targetKey, target);
  store.set(cfg.physicalKey, !!physical);

  // Mix persistent custom cards from localStorage for local mode!
  const localCustoms = store.get(cfg.saveKey + ".custom_cards", []);
  const fullResponses = cfg.responses.concat(localCustoms);

  state = {
    isOnline: false,
    players: players.map((name) => ({ name, score: 0 })),
    target,
    physical: !!physical,
    czar: 0,
    round: 1,
    deck: physical ? [] : shuffle(fullResponses),
    discard: [],
    promptDeck: shuffle(cfg.prompts.map((_, i) => i)),
    promptUsed: [],
    hands: players.map(() => []),
    prompt: null,
    submissions: [],
    order: [],     
    queue: [],     
    qi: 0,
    selected: [],
    chosen: null,
    phase: "intro",
  };
  if (!physical) state.hands = state.players.map(() => drawCards(HAND_SIZE));
  dealPrompt();
  render();
}

/* ---------------- ONLINE NETWORKING LAYER ---------------- */
function createRoom() {
  connectionStatus = "connecting";
  renderLobbySpinner("Creating online room...");

  socket = new WebSocket(`${wsUrl}/ws/create?name=${encodeURIComponent(myName)}`);
  setupSocketListeners();
}

function joinRoom(code) {
  connectionStatus = "connecting";
  renderLobbySpinner(`Connecting to room ${code}...`);

  socket = new WebSocket(`${wsUrl}/ws/join?code=${code}&name=${encodeURIComponent(myName)}`);
  setupSocketListeners();
}

function setupSocketListeners() {
  socket.onopen = () => {
    console.log("WebSocket connected.");
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data.type === "created") {
        roomCode = data.code;
        isHost = true;
        onlinePlayers = data.players;
        onlineCustomCards = data.customCards || [];
        connectionStatus = "lobby";
        renderOnlineLobby();
      } else if (data.type === "player_joined") {
        roomCode = data.code;
        onlinePlayers = data.players;
        onlineCustomCards = data.customCards || [];
        connectionStatus = "lobby";
        renderOnlineLobby();
      } else if (data.type === "player_left") {
        onlinePlayers = data.players;
        renderOnlineLobby();
        toast(`${data.name} disconnected.`);
      } else if (data.type === "error") {
        toast(data.message);
        resetOnlineState();
        renderSetup();
      } else if (data.type === "relay") {
        handleRelayedAction(data.action, data.sender);
      }
    } catch(e) {
      console.error("Socket error processing message:", e);
    }
  };

  socket.onclose = () => {
    console.log("WebSocket disconnected.");
    if (connectionStatus !== "offline") {
      toast("Disconnected from match server.");
      resetOnlineState();
      renderSetup();
    }
  };

  socket.onerror = (e) => {
    console.error("Socket encountered error:", e);
    toast("Server connection failed.");
    resetOnlineState();
    renderSetup();
  };
}

function renderLobbySpinner(msg) {
  mount(
    topbar(cfg.title),
    el("div", { className: "panel center" }, [
      el("div", { className: "big-emoji spin", style: "display: inline-block; font-size: 3rem;", text: "🛶" }),
      el("h3", { style: "margin-top: 15px;", text: msg }),
      el("p", { className: "muted", text: "Connecting to Cloudflare Workers Edge..." })
    ])
  );
}

function renderOnlineLobby() {
  const list = el("div", { className: "scoreboard" });
  onlinePlayers.forEach((p, idx) => {
    list.appendChild(el("div", { className: "score-row" }, [
      el("span", { className: "nm", text: `${idx + 1}. ${p} ${p === myName ? " (You)" : ""}` }),
      el("span", {
        className: "pill" + (idx === 0 ? " czar-pill" : ""),
        text: idx === 0 ? "👑 Host" : "Ready"
      })
    ]));
  });

  const lobbyPanel = el("div", { className: "wood-panel center" }, [
    el("p", { className: "muted", style: "margin: 0 0 4px;", text: "LOBBY ROOM CODE" }),
    el("h1", {
      style: "font-size: 3.2rem; letter-spacing: 6px; font-family: monospace; color: #fff; text-shadow: 0 2px 8px var(--shadow); margin: 0 0 10px;",
      text: roomCode
    }),
    el("p", { className: "muted", style: "font-size: 0.85rem; margin-bottom: 0;", text: "Share this code with your friends to play online!" })
  ]);

  const startBtn = el("button", {
    className: "btn",
    text: "Start Online Game 🎮",
    disabled: onlinePlayers.length < 3,
    onClick: startOnlineGame
  });

  const waitingDesc = el("p", {
    className: "muted center",
    text: onlinePlayers.length < 3 
      ? "Need at least 3 players to start."
      : "Waiting for host to start the game..."
  });

  mount(
    topbar("Online Match Lobby"),
    lobbyPanel,
    el("div", { className: "panel" }, [
      el("label", { text: `Connected Players (${onlinePlayers.length})` }),
      list
    ]),
    isHost ? startBtn : null,
    isHost ? null : waitingDesc
  );
}

/* ---------------- ONLINE HOST GAME LOOP MANAGEMENT ---------------- */
function startOnlineGame() {
  if (onlinePlayers.length < 3) return;

  // Mix persistent custom cards from DO GlobalStore
  const fullResponses = cfg.responses.concat(onlineCustomCards);

  state = {
    isOnline: true,
    players: onlinePlayers.map(name => ({ name, score: 0 })),
    target: store.get(cfg.targetKey, 5),
    physical: false,
    czar: 0,
    round: 1,
    deck: shuffle(fullResponses),
    discard: [],
    promptDeck: shuffle(cfg.prompts.map((_, i) => i)),
    promptUsed: [],
    hands: onlinePlayers.map(() => []),
    prompt: null,
    submissions: [],
    order: [],
    queue: [],
    qi: 0,
    selected: [],
    chosen: null,
    phase: "submit", // directly start with submissions
  };
  
  state.hands = state.players.map(() => drawCards(HAND_SIZE));
  dealPrompt();
  
  sendSyncAction({ type: "START_GAME", state });
  render();
}

function handleRelayedAction(action, sender) {
  if (!isHost) {
    if (action.type === "START_GAME" || action.type === "STATE_SYNC") {
      state = action.state;
      state.isOnline = true;
      state.roomCode = roomCode;
      state.myName = myName;
      state.isHost = false;
      render();
    }
    return;
  }

  // Host Action handlers
  if (action.type === "SUBMIT_CARDS") {
    const playerIdx = state.players.findIndex(p => p.name === sender);
    if (playerIdx === -1 || playerIdx === state.czar) return;

    if (state.submissions.find(s => s.player === playerIdx)) return;

    state.submissions.push({ player: playerIdx, cards: action.cards });
    
    const hand = state.hands[playerIdx];
    action.cards.forEach(c => {
      const idx = hand.indexOf(c);
      if (idx !== -1) {
        state.discard.push(hand[idx]);
        hand.splice(idx, 1);
      }
    });

    const expectedSubmissionsCount = state.players.length - 1;
    if (state.submissions.length >= expectedSubmissionsCount) {
      state.order = shuffle(state.submissions.map((_, i) => i));
      state.phase = "czar-pick";
    }

    sendSyncAction({ type: "STATE_SYNC", state });
    render();
  }

  else if (action.type === "DISCARD_CARD") {
    // Process guest discarding a card during draft
    const playerIdx = state.players.findIndex(p => p.name === sender);
    if (playerIdx !== -1) {
      const hand = state.hands[playerIdx];
      const card = hand.splice(action.cardIndex, 1)[0];
      if (card) {
        state.discard.push(card);
        console.log(`Host: Player ${sender} discarded: "${card}"`);
      }
      sendSyncAction({ type: "STATE_SYNC", state });
      render();
    }
  }

  else if (action.type === "CZAR_CHOSE") {
    const subIdx = state.order[action.chosenIdx];
    const sub = state.submissions[subIdx];
    state.players[sub.player].score++;
    state.winner = { player: sub.player, cards: sub.cards };
    state.phase = "result";

    // Detect if a custom-written card won and permanently save it!
    const winningCardText = sub.cards[0] || "";
    const isCustom = !cfg.responses.includes(winningCardText);
    
    if (isCustom && winningCardText.trim()) {
      // Save globally on Cloudflare DO database!
      sendSyncAction({
        type: "ADD_CUSTOM_CARD",
        card: winningCardText
      });
      toast("🎉 Custom card saved permanently to the Cloud!");
    }

    sendSyncAction({ type: "STATE_SYNC", state });
    render();
  }
}

function sendSyncAction(action) {
  if (!socket || socket.readyState !== 1) return;
  socket.send(JSON.stringify({
    type: "relay",
    code: roomCode,
    sender: myName,
    action
  }));
}

/* ---------------- Czar & Submitter online render methods ---------------- */
function renderOnlineCzarWaiting() {
  const list = el("div", { className: "scoreboard" });
  state.players.forEach((p, i) => {
    if (i === state.czar) return;
    const hasSubmitted = state.submissions.find(s => s.player === i) != null;
    list.appendChild(el("div", { className: "score-row" }, [
      el("span", { className: "nm", text: p.name }),
      el("span", {
        className: "pill" + (hasSubmitted ? " czar-pill" : ""),
        text: hasSubmitted ? "Submitted 🔒" : "Thinking... 🤫"
      })
    ]));
  });

  const promptCard = el("div", { className: "play-card prompt" }, [
    fillPrompt(state.prompt.text, BLANK, []),
    el("div", { className: "corner", text: state.prompt.pick === 2 ? "Pick 2" : "Pick 1" }),
  ]);

  mount(
    topbar(`Round ${state.round} (Czar)`),
    el("div", { className: "panel center" }, [
      el("p", { className: "muted", text: "You are the Card Czar this round!" }),
      el("div", { className: "handoff", style: "padding:6px" }, [
        el("div", { className: "who", text: "👑 Your Turn" }),
        el("span", { className: "pill czar-pill", text: "Waiting for submissions..." })
      ]),
    ]),
    promptCard,
    el("div", { className: "panel" }, [
      el("label", { text: "Players Submission Status" }),
      list
    ]),
    scoreboardEl()
  );
}

function renderOnlineSubmitterWaiting() {
  const myIdx = state.players.findIndex(p => p.name === myName);
  const hand = state.hands[myIdx];

  const promptCard = el("div", { className: "play-card prompt" }, [
    fillPrompt(state.prompt.text, BLANK, state.selectedCards || []),
    el("div", { className: "corner", text: "Submitting..." }),
  ]);

  // Trash panel for post-submission trashing/discarding
  const trashWrap = el("div", { className: "panel" });
  trashWrap.appendChild(el("label", { text: "Trash any cards you don't want for next round:" }));
  
  if (hand.length === 0) {
    trashWrap.appendChild(el("p", { className: "muted center", style: "margin: 0;", text: "Hand is empty." }));
  } else {
    const trashGrid = el("div", { className: "scoreboard" });
    hand.forEach((card, i) => {
      trashGrid.appendChild(el("div", { className: "score-row", style: "padding:8px 12px;" }, [
        el("span", { style: "font-size:0.95rem; font-weight:700; color:#fff;", text: card }),
        el("button", {
          className: "btn small",
          style: "width:auto; padding:4px 10px; background:#c62828; color:#fff; font-size:0.8rem; box-shadow:none;",
          text: "🗑️ Discard",
          onClick: () => {
            // Remove locally and sync to host
            hand.splice(i, 1);
            const discardAction = { type: "DISCARD_CARD", cardIndex: i };
            if (isHost) {
              handleRelayedAction(discardAction, myName);
            } else {
              sendSyncAction(discardAction);
            }
            render();
            toast("Card discarded. Fresh card dealt next round!");
          }
        })
      ]));
    });
    trashWrap.appendChild(trashGrid);
  }

  mount(
    topbar(`Round ${state.round}`),
    el("div", { className: "handoff panel center" }, [
      el("div", { className: "big-emoji", text: "🤫" }),
      el("h3", { text: "Submission Locked 🔒" }),
      el("p", { className: "muted", text: "Your cards were sent to the Host. Review your hand below." }),
    ]),
    promptCard,
    trashWrap,
    scoreboardEl()
  );
}

function renderOnlineSubmitterPick() {
  const myIdx = state.players.findIndex(p => p.name === myName);
  const hand = state.hands[myIdx];
  const need = state.prompt.pick;

  const promptCard = el("div", { className: "play-card prompt" }, [
    fillPrompt(state.prompt.text, BLANK, state.selected.map((i) => hand[i])),
    el("div", { className: "corner", text: need === 2 ? "Pick 2 — in order" : "Pick 1" }),
  ]);

  const handGrid = el("div", { className: "hand" });
  hand.forEach((card, i) => {
    const order = state.selected.indexOf(i);
    const selected = order !== -1;
    
    const cardEl = el("span", { text: card });
    const node = el("div", {
      className: "play-card response" + (selected ? " selected" : ""),
      onClick: () => toggleSelect(i, need),
    }, [ cardEl ]);
    
    // Add small Discard button on unselected cards for strategic trashing!
    if (!selected) {
      const trashBtn = el("button", {
        className: "icon-btn",
        style: "position:absolute; top:4px; right:4px; width:28px; height:28px; font-size:0.85rem; border-radius:50%; background:rgba(0,0,0,0.1); border:none; box-shadow:none; padding:0; display:grid; place-items:center;",
        text: "🗑️",
        title: "Discard card",
        onClick: (e) => {
          e.stopPropagation(); // Prevent card selection toggle!
          hand.splice(i, 1);
          const discardAction = { type: "DISCARD_CARD", cardIndex: i };
          if (isHost) {
            handleRelayedAction(discardAction, myName);
          } else {
            sendSyncAction(discardAction);
          }
          render();
          toast("Card discarded.");
        }
      });
      node.appendChild(trashBtn);
    }

    if (selected && need === 2) {
      node.appendChild(el("div", { className: "pick-order", text: String(order + 1) }));
    }
    handGrid.appendChild(node);
  });

  const ready = state.selected.length === need;
  mount(
    topbar(`Round ${state.round}`),
    promptCard,
    el("p", { className: "muted center", text: need === 2 ? "Tap two cards in the order they should appear." : "Tap a card to play it." }),
    handGrid,
    el("div", { className: "spacer" }),
    el("button", {
      className: "btn",
      text: ready ? "Lock in submission 🔒" : `Select ${need - state.selected.length} more`,
      disabled: !ready,
      onClick: submitCardsOnline
    }),
    scoreboardEl()
  );
}

function submitCardsOnline() {
  const myIdx = state.players.findIndex(p => p.name === myName);
  const hand = state.hands[myIdx];
  const cards = state.selected.map((i) => hand[i]);

  state.selectedCards = cards;

  const submitAction = {
    type: "SUBMIT_CARDS",
    cards
  };

  if (isHost) {
    handleRelayedAction(submitAction, myName);
  } else {
    sendSyncAction(submitAction);
    hasSubmittedThisRound = true;
    render();
  }
}

function renderOnlineCzarPick() {
  const list = el("div", { className: "submission-list" });
  state.order.forEach((subIdx, displayIdx) => {
    const sub = state.submissions[subIdx];
    const stack = el("div", { className: "stack" });
    
    stack.appendChild(el("div", { className: "play-card prompt" }, [
      fillPrompt(state.prompt.text, BLANK, sub.cards),
    ]));
    
    const wrap = el("div", {
      className: "submission" + (state.chosen === displayIdx ? " selected" : ""),
      onClick: () => { state.chosen = displayIdx; renderOnlineCzarPick(); },
    }, [ stack ]);
    list.appendChild(wrap);
  });

  const ready = state.chosen != null;
  mount(
    topbar("Czar Choosing..."),
    el("div", { className: "play-card prompt" }, [
      fillPrompt(state.prompt.text, BLANK, []),
      el("div", { className: "corner", text: "Choose the winner!" }),
    ]),
    el("p", { className: "muted center", text: "Tap the funniest answer, then crown the winner." }),
    list,
    el("div", { className: "spacer" }),
    el("button", {
      className: "btn",
      text: "👑 Crown this winner",
      disabled: !ready,
      onClick: crownWinnerOnline
    })
  );
}

function crownWinnerOnline() {
  const chooseAction = {
    type: "CZAR_CHOSE",
    chosenIdx: state.chosen
  };

  if (isHost) {
    handleRelayedAction(chooseAction, myName);
  } else {
    sendSyncAction(chooseAction);
  }
}

function renderOnlineGuestWaitingCzar() {
  const promptCard = el("div", { className: "play-card prompt" }, [
    fillPrompt(state.prompt.text, BLANK, []),
    el("div", { className: "corner", text: "Choosing..." }),
  ]);

  mount(
    topbar(`Round ${state.round}`),
    el("div", { className: "handoff panel center" }, [
      el("div", { className: "big-emoji", text: "👑" }),
      el("h3", { text: `${czarName()} is choosing...` }),
      el("p", { className: "muted", text: "The Czar is reviewing all submissions. Get ready!" }),
    ]),
    promptCard,
    scoreboardEl()
  );
}

function renderOnlineResult() {
  const w = state.winner;
  const winnerName = state.players[w.player].name;
  const reached = state.players[w.player].score >= state.target;

  const nextBtn = el("button", {
    className: "btn",
    text: "Next Round →",
    onClick: nextRoundOnline
  });

  const waitingHost = el("p", {
    className: "muted center",
    text: "Waiting for host to start the next round..."
  });

  mount(
    topbar(`Round ${state.round} Results`),
    el("div", { className: "panel center" }, [
      el("div", { className: "big-emoji", text: "🏆" }),
      el("h2", { text: `${winnerName} wins the round!` }),
      el("div", { className: "play-card prompt", style: "text-align:left" }, [
        fillPrompt(state.prompt.text, BLANK, w.cards || []),
      ]),
    ]),
    scoreboardEl(),
    el("div", { className: "spacer" }),
    reached
      ? (isHost ? el("button", { className: "btn", text: "See final results 🎉", onClick: triggerGameOverOnline }) : el("p", { className: "muted center", text: "Match is over! Host will transition screens..." }))
      : (isHost ? nextBtn : waitingHost)
  );
}

function nextRoundOnline() {
  state.queue.forEach((pIdx) => {
    const need = HAND_SIZE - state.hands[pIdx].length;
    if (need > 0) state.hands[pIdx].push(...drawCards(need));
  });

  state.czar = (state.czar + 1) % state.players.length;
  state.round++;
  state.submissions = [];
  state.selected = [];
  state.chosen = null;
  state.winner = null;
  dealPrompt();
  state.phase = "submit";

  hasSubmittedThisRound = false;

  sendSyncAction({ type: "STATE_SYNC", state });
  render();
}

function triggerGameOverOnline() {
  state.phase = "over";
  sendSyncAction({ type: "STATE_SYNC", state });
  render();
}

function renderOnlineGameOver() {
  const ranked = state.players.map((p) => p).sort((a, b) => b.score - a.score);
  const champ = ranked[0];

  const restartBtn = el("button", {
    className: "btn",
    text: "Play Again 🔄",
    onClick: playAgainOnline
  });

  const waitingHost = el("p", {
    className: "muted center",
    text: "Waiting for host to play again..."
  });

  mount(
    topbar("Game Over"),
    el("div", { className: "panel center" }, [
      el("div", { className: "big-emoji", text: `${cfg.icon}👑` }),
      el("h2", { text: `${champ.name} is the ${cfg.winnerTitle}!` }),
      el("p", { className: "muted", text: `${champ.score} points achieved` }),
    ]),
    finalBoard(ranked),
    el("div", { className: "spacer" }),
    isHost ? restartBtn : waitingHost,
    el("div", { className: "spacer" }),
    el("button", {
      className: "btn ghost",
      text: "Leave Room & Lobby",
      onClick: () => {
        resetOnlineState();
        goHome();
      }
    })
  );
}

function playAgainOnline() {
  // Clear persistent custom cards fetched from Cloudflare GlobalStore
  const fullResponses = cfg.responses.concat(onlineCustomCards);

  state = {
    isOnline: true,
    players: onlinePlayers.map(name => ({ name, score: 0 })),
    target: state.target,
    physical: false,
    czar: 0,
    round: 1,
    deck: shuffle(fullResponses),
    discard: [],
    promptDeck: shuffle(cfg.prompts.map((_, i) => i)),
    promptUsed: [],
    hands: onlinePlayers.map(() => []),
    prompt: null,
    submissions: [],
    order: [],
    queue: [],
    qi: 0,
    selected: [],
    chosen: null,
    phase: "submit",
  };
  state.hands = state.players.map(() => drawCards(HAND_SIZE));
  dealPrompt();
  
  hasSubmittedThisRound = false;

  sendSyncAction({ type: "STATE_SYNC", state });
  render();
}

/* ---------------- Deck helpers ---------------- */
function drawCards(n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    if (state.deck.length === 0) {
      if (state.discard.length === 0) break;
      state.deck = shuffle(state.discard);
      state.discard = [];
    }
    out.push(state.deck.pop());
  }
  return out;
}

function dealPrompt() {
  if (state.promptDeck.length === 0) {
    state.promptDeck = shuffle(state.promptUsed);
    state.promptUsed = [];
  }
  const idx = state.promptDeck.pop();
  state.promptUsed.push(idx);
  state.prompt = cfg.prompts[idx];
}

function save() {
  if (state && !state.isOnline) {
    store.set(cfg.saveKey, state);
  }
}

/* ---------------- Authoritative Render Dispatcher ---------------- */
function render() {
  save();

  if (state && state.isOnline) {
    const myIdx = state.players.findIndex(p => p.name === myName);
    if (myIdx === -1) return;

    state.hands = state.hands.map((h, i) => i === myIdx ? h : []);

    const isCzar = myIdx === state.czar;

    switch (state.phase) {
      case "submit":
        if (isCzar) return renderOnlineCzarWaiting();
        return hasSubmittedThisRound ? renderOnlineSubmitterWaiting() : renderOnlineSubmitterPick();
      case "czar-pick":
        if (isCzar) return renderOnlineCzarPick();
        return renderOnlineGuestWaitingCzar();
      case "result":
        return renderOnlineResult();
      case "over":
        return renderOnlineGameOver();
    }
    return;
  }

  // Pass & Play Mode
  switch (state.phase) {
    case "intro": return state.physical ? renderPhysicalIntro() : renderRoundIntro();
    case "pick": return renderPhysicalPick();
    case "handoff": return renderHandoff();
    case "submit": return renderSubmit();
    case "czar-handoff": return renderCzarHandoff();
    case "czar-pick": return renderCzarPick();
    case "result": return renderResult();
    case "over": return renderGameOver();
  }
}

/* ---------------- Physical-cards mode ---------------- */
function renderPhysicalIntro() {
  const promptCard = el("div", { className: "play-card prompt" }, [
    fillPrompt(state.prompt.text, BLANK, []),
    el("div", { className: "corner", text: state.prompt.pick === 2 ? "Pick 2" : "Pick 1" }),
  ]);
  mount(
    topbar(`Round ${state.round}`),
    el("div", { className: "panel center" }, [
      el("p", { className: "muted", text: "This round's Card Czar is" }),
      el("div", { className: "handoff", style: "padding:6px" }, [
        el("div", { className: "who", text: czarName() }),
        el("span", { className: "pill czar-pill", text: "👑 Card Czar" }),
      ]),
    ]),
    el("p", { className: "muted center", text: "Read this prompt aloud. Everyone else plays their physical card(s) to the Czar." }),
    promptCard,
    el("div", { className: "spacer" }),
    el("button", { className: "btn", text: "Everyone's in — pick the winner →", onClick: () => { state.phase = "pick"; render(); } }),
    scoreboardEl()
  );
}

function renderPhysicalPick() {
  const grid = el("div", { className: "menu" });
  state.players.forEach((p, i) => {
    if (i === state.czar) return;
    grid.appendChild(el("button", { className: "tile", onClick: () => awardPhysical(i) }, [
      el("div", { className: "icon", text: "🃏" }),
      el("div", { className: "meta" }, [el("h3", { text: p.name })]),
    ]));
  });
  mount(
    topbar(`${czarName()} chooses`),
    el("div", { className: "play-card prompt" }, [
      fillPrompt(state.prompt.text, BLANK, []),
      el("div", { className: "corner", text: "The prompt" }),
    ]),
    el("p", { className: "muted center", text: `${czarName()} picks the funniest card in real life — tap whose card won:` }),
    grid
  );
}

function awardPhysical(playerIdx) {
  state.players[playerIdx].score++;
  state.winner = { player: playerIdx, cards: null };
  state.phase = "result";
  render();
}

function czarName() { return state.players[state.czar].name; }

/* ---------------- Round intro ---------------- */
function renderRoundIntro() {
  const promptCard = el("div", { className: "play-card prompt" }, [
    fillPrompt(state.prompt.text, BLANK, []),
    el("div", { className: "corner", text: state.prompt.pick === 2 ? "Pick 2" : "Pick 1" }),
  ]);

  mount(
    topbar(`Round ${state.round}`),
    el("div", { className: "panel center" }, [
      el("p", { className: "muted", text: "This round's Card Czar is" }),
      el("div", { className: "handoff", style: "padding:6px" }, [
        el("div", { className: "who", text: czarName() }),
        el("span", { className: "pill czar-pill", text: "👑 Card Czar" }),
      ]),
    ]),
    el("p", { className: "muted center", text: "Read this prompt aloud:" }),
    promptCard,
    el("div", { className: "spacer" }),
    el("button", { className: "btn", text: "Start submissions →", onClick: beginSubmissions }),
    scoreboardEl()
  );
}

function beginSubmissions() {
  state.queue = state.players.map((_, i) => i).filter((i) => i !== state.czar);
  state.qi = 0;
  state.submissions = [];
  state.selected = [];
  state.phase = "handoff";
  render();
}

/* ---------------- Submission handoff ---------------- */
function renderHandoff() {
  const pIdx = state.queue[state.qi];
  const name = state.players[pIdx].name;
  mount(
    topbar(`Round ${state.round}`),
    el("div", { className: "handoff panel" }, [
      el("div", { className: "big-emoji", text: "🤫" }),
      el("p", { className: "muted", text: "Pass the device to" }),
      el("div", { className: "who", text: name }),
      el("p", { className: "muted", text: `${state.qi + 1} of ${state.queue.length} players to submit` }),
      el("div", { className: "spacer" }),
      el("button", { className: "btn", text: `I'm ${name} — show my cards`, onClick: () => { state.selected = []; state.phase = "submit"; render(); } }),
    ])
  );
}

/* ---------------- Submit (pick cards) ---------------- */
function renderSubmit() {
  const pIdx = state.queue[state.qi];
  const hand = state.hands[pIdx];
  const need = state.prompt.pick;

  const promptCard = el("div", { className: "play-card prompt" }, [
    fillPrompt(state.prompt.text, BLANK, state.selected.map((i) => hand[i])),
    el("div", { className: "corner", text: need === 2 ? "Pick 2 — in order" : "Pick 1" }),
  ]);

  const handGrid = el("div", { className: "hand" });
  hand.forEach((card, i) => {
    const order = state.selected.indexOf(i);
    const selected = order !== -1;
    const node = el("div", {
      className: "play-card response" + (selected ? " selected" : ""),
      onClick: () => toggleSelect(i, need),
    }, [ el("span", { text: card }) ]);

    // Discard trash button on unselected cards for strategic Pass-and-play discarding!
    if (!selected) {
      const trashBtn = el("button", {
        className: "icon-btn",
        style: "position:absolute; top:4px; right:4px; width:28px; height:28px; font-size:0.85rem; border-radius:50%; background:rgba(0,0,0,0.1); border:none; box-shadow:none; padding:0; display:grid; place-items:center;",
        text: "🗑️",
        onClick: (e) => {
          e.stopPropagation();
          state.discard.push(hand[i]);
          hand.splice(i, 1);
          renderSubmit();
          toast("Card discarded.");
        }
      });
      node.appendChild(trashBtn);
    }

    if (selected && need === 2) {
      node.appendChild(el("div", { className: "pick-order", text: String(order + 1) }));
    }
    handGrid.appendChild(node);
  });

  const ready = state.selected.length === need;
  mount(
    topbar(`${state.players[pIdx].name}'s turn`),
    promptCard,
    el("p", { className: "muted center", text: need === 2 ? "Tap two cards in the order they should appear." : "Tap a card to play it." }),
    handGrid,
    el("div", { className: "spacer" }),
    el("button", { className: "btn", text: ready ? "Lock in submission 🔒" : `Select ${need - state.selected.length} more`, disabled: !ready, onClick: submitCards })
  );
}

function toggleSelect(i, need) {
  const pIdx = state.isOnline ? state.players.findIndex(p => p.name === myName) : state.queue[state.qi];
  const hand = state.hands[pIdx];
  const cardValue = hand[i];

  // Intercept the custom Blank card and prompt the player for input!
  if (cardValue === CUSTOM_CARD_TEXT) {
    const answer = prompt("✍️ Write your own custom card response (edgy but simple!):");
    if (answer && answer.trim()) {
      hand[i] = answer.trim(); // Replace placeholder in hand with their typed text
    } else {
      return; // Do nothing if cancelled
    }
  }

  const at = state.selected.indexOf(i);
  if (at !== -1) { state.selected.splice(at, 1); }
  else {
    if (state.selected.length >= need) {
      if (need === 1) state.selected = [i];
      else { toast(`Only pick ${need}.`); return; }
    } else state.selected.push(i);
  }
  
  if (state.isOnline) {
    renderOnlineSubmitterPick();
  } else {
    renderSubmit();
  }
}

function submitCards() {
  const pIdx = state.queue[state.qi];
  const hand = state.hands[pIdx];
  const cards = state.selected.map((i) => hand[i]);
  state.selected.slice().sort((a, b) => b - a).forEach((i) => {
    state.discard.push(hand[i]);
    hand.splice(i, 1);
  });
  state.submissions.push({ player: pIdx, cards });
  state.qi++;
  if (state.qi >= state.queue.length) {
    state.order = shuffle(state.submissions.map((_, i) => i));
    state.phase = "czar-handoff";
  } else {
    state.phase = "handoff";
  }
  render();
}

/* ---------------- Czar handoff ---------------- */
function renderCzarHandoff() {
  mount(
    topbar(`Round ${state.round}`),
    el("div", { className: "handoff panel" }, [
      el("div", { className: "big-emoji", text: "👑" }),
      el("p", { className: "muted", text: "All cards are in. Pass the device to the Card Czar" }),
      el("div", { className: "who", text: czarName() }),
      el("div", { className: "spacer" }),
      el("button", { className: "btn", text: "Reveal the submissions →", onClick: () => { state.chosen = null; state.phase = "czar-pick"; render(); } }),
    ])
  );
}

/* ---------------- Czar pick ---------------- */
function renderCzarPick() {
  const list = el("div", { className: "submission-list" });
  state.order.forEach((subIdx, displayIdx) => {
    const sub = state.submissions[subIdx];
    const stack = el("div", { className: "stack" });
    stack.appendChild(el("div", { className: "play-card prompt" }, [
      fillPrompt(state.prompt.text, BLANK, sub.cards),
    ]));
    const wrap = el("div", {
      className: "submission" + (state.chosen === displayIdx ? " selected" : ""),
      onClick: () => { state.chosen = displayIdx; renderCzarPick(); },
    }, [ stack ]);
    list.appendChild(wrap);
  });

  const ready = state.chosen != null;
  mount(
    topbar(`${czarName()} chooses`),
    el("div", { className: "play-card prompt" }, [
      fillPrompt(state.prompt.text, BLANK, []),
      el("div", { className: "corner", text: "The prompt" }),
    ]),
    el("p", { className: "muted center", text: "Tap the funniest answer, then crown the winner." }),
    list,
    el("div", { className: "spacer" }),
    el("button", { className: "btn", text: "👑 Crown this winner", disabled: !ready, onClick: crownWinner })
  );
}

function crownWinner() {
  const subIdx = state.order[state.chosen];
  const sub = state.submissions[subIdx];
  state.players[sub.player].score++;
  state.winner = { player: sub.player, cards: sub.cards };
  state.phase = "result";

  // Check if a custom-written card won locally and permanently save it!
  const winningCardText = sub.cards[0] || "";
  const isCustom = !cfg.responses.includes(winningCardText);
  if (isCustom && winningCardText.trim()) {
    const localCustoms = store.get(cfg.saveKey + ".custom_cards", []);
    if (!localCustoms.includes(winningCardText)) {
      localCustoms.push(winningCardText);
      store.set(cfg.saveKey + ".custom_cards", localCustoms);
      toast("🎉 Custom card saved permanently!");
    }
  }

  render();
}

/* ---------------- Round result ---------------- */
function renderResult() {
  const w = state.winner;
  const winnerName = state.players[w.player].name;
  const reached = state.players[w.player].score >= state.target;

  mount(
    topbar(`Round ${state.round}`),
    el("div", { className: "panel center" }, [
      el("div", { className: "big-emoji", text: "🏆" }),
      el("h2", { text: `${winnerName} wins the round!` }),
      el("div", { className: "play-card prompt", style: "text-align:left" }, [
        fillPrompt(state.prompt.text, BLANK, w.cards || []),
      ]),
    ]),
    scoreboardEl(),
    el("div", { className: "spacer" }),
    reached
      ? el("button", { className: "btn", text: "See final results 🎉", onClick: () => { state.phase = "over"; render(); } })
      : el("button", { className: "btn", text: "Next round →", onClick: nextRound })
  );
}

function nextRound() {
  state.queue.forEach((pIdx) => {
    const need = HAND_SIZE - state.hands[pIdx].length;
    if (need > 0) state.hands[pIdx].push(...drawCards(need));
  });
  state.czar = (state.czar + 1) % state.players.length;
  state.round++;
  state.submissions = [];
  state.selected = [];
  state.chosen = null;
  state.winner = null;
  dealPrompt();
  state.phase = "intro";
  render();
}

/* ---------------- Game over ---------------- */
function renderGameOver() {
  store.del(cfg.saveKey);
  const ranked = state.players.map((p) => p).sort((a, b) => b.score - a.score);
  const champ = ranked[0];

  mount(
    topbar("Game over"),
    el("div", { className: "panel center" }, [
      el("div", { className: "big-emoji", text: `${cfg.icon}👑` }),
      el("h2", { text: `${champ.name} is the ${cfg.winnerTitle}!` }),
      el("p", { className: "muted", text: `${champ.score} points` }),
    ]),
    finalBoard(ranked),
    el("div", { className: "spacer" }),
    el("button", { className: "btn", text: "Play again", onClick: () => beginGame(state.players.map((p) => p.name), state.target, state.physical) }),
    el("div", { className: "spacer" }),
    el("button", { className: "btn ghost", text: "Back to lobby", onClick: goHome })
  );
}

function finalBoard(ranked) {
  const board = el("div", { className: "scoreboard" });
  ranked.forEach((p, i) => {
    board.appendChild(el("div", { className: "score-row" + (i === 0 ? " leader" : "") }, [
      el("span", { className: "nm", text: `${["🥇", "🥈", "🥉"][i] || "•"} ${p.name}` }),
      el("span", { className: "pts", text: String(p.score) }),
    ]));
  });
  return board;
}

/* ---------------- Scoreboard ---------------- */
function scoreboardEl() {
  const board = el("div", { className: "scoreboard" });
  state.players.forEach((p, i) => {
    const isLeader = p.score === Math.max(...state.players.map((x) => x.score)) && p.score > 0;
    board.appendChild(el("div", { className: "score-row" + (isLeader ? " leader" : "") }, [
      el("span", { className: "nm" }, [
        document.createTextNode(p.name),
        i === state.czar ? el("span", { className: "pill czar-pill", text: "👑" }) : null,
      ]),
      el("span", { className: "pts", text: `${p.score}/${state.target}` }),
    ]));
  });
  return el("div", { className: "panel" }, [el("label", { text: "Scores" }), board]);
}
