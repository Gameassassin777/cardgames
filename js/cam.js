// Game engine for Cards Against Monkeys / Cabin.
// Supports: Local Pass-and-Play, Physical Cards, and Real-Time Online Play (Cloudflare Worker).
import { el, mount, shuffle, toast, store, fillPrompt } from "./ui.js";
import { icons } from "./icons.js";
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
let guestCustomResponses = []; // Temporary guest-submitted custom responses in lobby
let guestCustomPrompts = [];   // Temporary guest-submitted custom prompts in lobby
let connectionStatus = "offline"; // "offline" | "connecting" | "lobby"
let hasSubmittedThisRound = false;

function compilePlayableDecks() {
  const enabled = store.get(cfg.saveKey + ".enabled_decks", ["core"]);
  const customDecks = store.get(cfg.saveKey + ".custom_decks", []);
  
  const disabledPrompts = store.get(cfg.saveKey + ".disabled_prompts", []);
  const disabledResponses = store.get(cfg.saveKey + ".disabled_responses", []);
  
  let activePrompts = [];
  let activeResponses = [];
  
  if (enabled.includes("core")) {
    activePrompts = cfg.prompts.filter(p => !disabledPrompts.includes(p.text));
    activeResponses = cfg.responses.filter(c => c !== CUSTOM_CARD_TEXT && !disabledResponses.includes(c));
  }
  
  customDecks.forEach(deck => {
    if (enabled.includes(deck.id)) {
      const deckPrompts = (deck.prompts || []).map(p => {
        if (typeof p === "string") {
          const count = (p.match(/_/g) || []).length;
          return { text: p.replace(/_/g, "_______"), pick: Math.max(1, count) };
        }
        return p;
      }).filter(p => !disabledPrompts.includes(p.text));
      
      const deckResponses = (deck.responses || deck.cards || []).filter(c => !disabledResponses.includes(c));
      
      activePrompts = activePrompts.concat(deckPrompts);
      activeResponses = activeResponses.concat(deckResponses);
    }
  });

  if (onlineMode) {
    const activeGuestPrompts = guestCustomPrompts.filter(p => !disabledPrompts.includes(p.text));
    activePrompts = activePrompts.concat(activeGuestPrompts);

    const activeOnlineCustoms = onlineCustomCards.filter(c => !disabledResponses.includes(c));
    const activeGuestCustoms = guestCustomResponses.filter(c => !disabledResponses.includes(c));
    activeResponses = activeResponses.concat(activeOnlineCustoms).concat(activeGuestCustoms);
  }
  
  return { prompts: activePrompts, responses: activeResponses };
}

// Online coordination
let heartbeatInt = null;
let roomBrowserRefresh = null;
const HTTP_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:3000"
  : "https://lakehouse-cardgames-sync.gameassassin777.workers.dev";

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

async function registerRoom() {
  const gameId = (cfg?.saveKey || "cam").split(".")[0];
  try {
    await fetch(`${HTTP_BASE}/rooms/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: roomCode, host: myName, playerCount: onlinePlayers.length || 1,
        game: gameId, private: false,
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
  onlineMode = false;
  stopHeartbeat();
  if (roomBrowserRefresh) { clearInterval(roomBrowserRefresh); roomBrowserRefresh = null; }
  if (socket) {
    try { socket.close(); } catch (e) {}
    socket = null;
  }
  roomCode = "";
  myName = "";
  isHost = false;
  onlinePlayers = [];
  state = null;
  connectionStatus = "offline";
  guestCustomResponses = [];
  guestCustomPrompts = [];
  hasSubmittedThisRound = false;
}

function topbar(title) {
  const showShuffle = state && state.phase && state.phase !== "intro" && state.phase !== "lobby" && state.phase !== "over" && (!state.isOnline || isHost);
  
  const actionsGroup = showShuffle
    ? el("div", { style: "display:flex; gap:6px; align-items:center;" }, [
        el("button", {
          className: "btn ghost small",
          style: "margin:0; padding:6px 10px; border-radius:12px; font-size:0.75rem; display:flex; align-items:center; gap:4px; border-color:rgba(255,255,255,0.15);",
          onClick: () => {
            if (confirm("Skip the current prompt card and draw the next one?")) {
              dealPrompt();
              if (state.isOnline && isHost) {
                sendSyncAction({ type: "STATE_SYNC", state });
              }
              toast("Prompt card skipped!");
              render();
            }
          }
        }, [
          el("span", { style: "width:12px; height:12px; display:inline-block;" }, [icons.chevronRight()]),
          el("span", { text: "Skip" })
        ]),
        el("button", {
          className: "btn ghost small",
          style: "margin:0; padding:6px 10px; border-radius:12px; font-size:0.75rem; display:flex; align-items:center; gap:4px; border-color:rgba(255,255,255,0.15);",
          onClick: () => {
            if (confirm("Are you sure you want to reshuffle the entire prompt deck box and draw a new card?")) {
              store.del(cfg.saveKey + ".persistent_prompt_deck");
              dealPrompt();
              if (state.isOnline && isHost) {
                sendSyncAction({ type: "STATE_SYNC", state });
              }
              toast("Prompt box reshuffled!");
              render();
            }
          }
        }, [
          el("span", { style: "width:12px; height:12px; display:inline-block;" }, [icons.refresh()]),
          el("span", { text: "Shuffle" })
        ])
      ])
    : el("span", { style: "width:64px" });

  return el("div", { className: "topbar" }, [
    el("button", { className: "back", onClick: confirmQuit }, [
      el("span", { style: "width:16px; height:16px; display:inline-block;" }, [icons.back()]),
      el("span", { text: "Lobby" })
    ]),
    el("div", { className: "title", text: title }),
    actionsGroup
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
      el("div", { style: "width:64px; height:64px; margin:0 auto 12px; color:var(--sunset-soft);" }, [cfg.icon()]),
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
    const disPrompts = store.get(cfg.saveKey + ".disabled_prompts", []);
    const disResponses = store.get(cfg.saveKey + ".disabled_responses", []);
    const totalDisabled = disPrompts.length + disResponses.length;

    const customizeBtn = el("button", {
      className: "btn ghost small",
      style: "width:100%; display:flex; align-items:center; justify-content:center; gap:6px; font-weight:700; border: 1.5px dashed var(--water-foam); border-radius:12px; padding:10px; margin-bottom:12px; margin-top:4px;",
      onClick: () => openDeckCustomizer()
    }, [
      el("span", { text: "🎴" }),
      el("span", { text: "Customize Playable Deck" }),
      totalDisabled > 0 
        ? el("span", { className: "badge", style: "background:#c62828; color:#fff; margin-left:4px; font-size:0.65rem; padding:1px 6px;", text: `${totalDisabled} filtered` })
        : el("span", { className: "badge", style: "background:#2e7d32; color:#fff; margin-left:4px; font-size:0.65rem; padding:1px 6px;", text: "Full Deck Active" })
    ]);

    setupCard.appendChild(el("hr", { className: "divider" }));
    setupCard.appendChild(el("label", { text: "Card Mode" }));
    setupCard.appendChild(el("div", { className: "btn-row" }, [digitalBtn, physicalBtn]));
    setupCard.appendChild(modeDesc);
    setupCard.appendChild(el("hr", { className: "divider" }));
    setupCard.appendChild(customizeBtn);
    setupCard.appendChild(el("hr", { className: "divider" }));
    setupCard.appendChild(el("button", {
      className: "btn",
      text: "Start local game",
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

    const disPrompts = store.get(cfg.saveKey + ".disabled_prompts", []);
    const disResponses = store.get(cfg.saveKey + ".disabled_responses", []);
    const totalDisabled = disPrompts.length + disResponses.length;

    const customizeBtn = el("button", {
      className: "btn ghost small",
      style: "width:100%; display:flex; align-items:center; justify-content:center; gap:6px; font-weight:700; border: 1.5px dashed var(--water-foam); border-radius:12px; padding:10px; margin-bottom:12px; margin-top:4px;",
      onClick: () => openDeckCustomizer()
    }, [
      el("span", { text: "🎴" }),
      el("span", { text: "Customize Playable Deck" }),
      totalDisabled > 0 
        ? el("span", { className: "badge", style: "background:#c62828; color:#fff; margin-left:4px; font-size:0.65rem; padding:1px 6px;", text: `${totalDisabled} filtered` })
        : el("span", { className: "badge", style: "background:#2e7d32; color:#fff; margin-left:4px; font-size:0.65rem; padding:1px 6px;", text: "Full Deck Active" })
    ]);

    setupCard.appendChild(el("label", { text: "1. Enter Your Name" }));
    setupCard.appendChild(nameInput);
    setupCard.appendChild(el("hr", { className: "divider" }));
    setupCard.appendChild(customizeBtn);
    setupCard.appendChild(el("hr", { className: "divider" }));
    setupCard.appendChild(el("label", { text: "2. Host a New Online Room" }));
    setupCard.appendChild(el("button", {
      className: "btn",
      text: "🎮 Create Lobby",
      onClick: () => {
        const val = nameInput.value.trim();
        if (!val) { toast("Please enter a name first."); return; }
        myName = val;
        createRoom();
      }
    }));
    setupCard.appendChild(el("label", { style: "margin-top:14px;", text: "👀 Or Browse Open Rooms" }));
    setupCard.appendChild(el("button", {
      className: "btn ghost",
      style: "width:100%; margin-top:6px;",
      text: "📋 Browse Rooms",
      onClick: () => {
        const val = nameInput.value.trim();
        if (!val) { toast("Please enter a name first."); return; }
        myName = val;
        renderRoomBrowser();
      }
    }));
    setupCard.appendChild(el("hr", { className: "divider" }));
    setupCard.appendChild(el("label", { text: "3. Or Join by Code" }));
    setupCard.appendChild(codeInput);
    setupCard.appendChild(el("button", {
      className: "btn ghost",
      style: "margin-top: 8px;",
      text: "🔗 Join Lobby",
      onClick: () => {
        const nameVal = nameInput.value.trim();
        const codeVal = codeInput.value.trim().toUpperCase();
        if (!nameVal) { toast("Please enter a name first."); return; }
        if (codeVal.length !== 4) { toast("Room code must be exactly 4 letters."); return; }
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

  const compiled = compilePlayableDecks();
  const fullPrompts = compiled.prompts;
  const blankCopies = Array(6).fill(CUSTOM_CARD_TEXT);
  const fullResponses = compiled.responses.concat(blankCopies);

  state = {
    isOnline: false,
    players: players.map((name) => ({ name, score: 0 })),
    target,
    physical: !!physical,
    czar: 0,
    round: 1,
    prompts: fullPrompts, // Store combined active prompts in state
    deck: physical ? [] : shuffle(fullResponses),
    discard: [],
    promptDeck: shuffle(fullPrompts.map((_, i) => i)),
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
  if (!physical) {
    state.players.forEach((_, idx) => {
      state.hands[idx] = drawCards(HAND_SIZE);
    });
  }
  dealPrompt();
  render();
}

/* ---------------- ONLINE NETWORKING LAYER ---------------- */
function createRoom() {
  connectionStatus = "connecting";
  renderLobbySpinner("Creating online room...");
  const gameId = (cfg.saveKey || "cam").split(".")[0];
  socket = new WebSocket(`${wsUrl}/ws/create?name=${encodeURIComponent(myName)}&game=${gameId}`);
  setupSocketListeners();
}

function joinRoom(code) {
  connectionStatus = "connecting";
  renderLobbySpinner(`Connecting to room ${code}...`);
  const gameId = (cfg.saveKey || "cam").split(".")[0];
  socket = new WebSocket(`${wsUrl}/ws/join?code=${code}&name=${encodeURIComponent(myName)}&game=${gameId}`);
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
        registerRoom();
        startHeartbeat(data.players.length);
        renderOnlineLobby();
      } else if (data.type === "player_joined") {
        roomCode = data.code;
        onlinePlayers = data.players;
        onlineCustomCards = data.customCards || [];
        isHost = (onlinePlayers[0] === myName);
        connectionStatus = "lobby";

        if (state && state.phase && state.phase !== "lobby" && state.phase !== "over") {
          // Send active state to rejoining player
          sendSyncAction({ type: "STATE_SYNC", state });
        } else {
          if (isHost) {
            registerRoom();
            startHeartbeat(data.players.length);
          }
          renderOnlineLobby();

          // If I am NOT the host, transmit my local custom cards/prompts to the host!
          if (!isHost) {
            const localCustoms = store.get(cfg.saveKey + ".custom_cards", []);
            const localPrompts = store.get(cfg.saveKey + ".custom_prompts", []);
            if (localCustoms.length > 0 || localPrompts.length > 0) {
              sendSyncAction({
                type: "GUEST_CUSTOM_SYNC",
                customs: localCustoms,
                prompts: localPrompts
              });
            }
          }
        }
      } else if (data.type === "player_left") {
        onlinePlayers = data.players;
        if (state && state.phase && state.phase !== "lobby" && state.phase !== "over") {
          // Keep active game running smoothly on disconnect
        } else {
          renderOnlineLobby();
        }
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
    stopHeartbeat();
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

function renderRoomBrowser() {
  if (roomBrowserRefresh) { clearInterval(roomBrowserRefresh); roomBrowserRefresh = null; }

  const listEl = el("div", { className: "room-browser-list", id: "room-list" });
  const gameId = (cfg?.saveKey || "cam").split(".")[0];

  const loadRooms = async () => {
    try {
      const res   = await fetch(`${HTTP_BASE}/rooms/list?game=${gameId}`, { signal: AbortSignal.timeout(5000) });
      const rooms = await res.json();
      listEl.innerHTML = "";
      const visible = rooms.filter(r => !r.private); // only show public
      if (visible.length === 0) {
        listEl.appendChild(el("p", { className: "muted center", style: "margin:20px 0; font-style:italic;", text: "No open rooms right now — create one!" }));
        return;
      }
      visible.forEach(r => {
        const row = el("div", { className: "room-row" }, [
          el("div", { className: "room-info" }, [
            el("div", { style: "display:flex; align-items:baseline;" }, [
              el("span", { style: "font-weight:700; color:#fff;", text: r.host }),
              el("span", { style: "margin-left:8px; font-size:0.8rem; color:var(--lake-light);", text: `${r.playerCount} player${r.playerCount !== 1 ? "s" : ""}` })
            ])
          ]),
          el("button", { className: "btn small", style: "margin:0; padding:6px 14px; font-size:0.85rem;", text: "Join",
            onClick: () => { clearInterval(roomBrowserRefresh); joinRoom(r.code); }
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

  const compiled = compilePlayableDecks();
  const fullPrompts = compiled.prompts;
  const blankCopies = Array(6).fill(CUSTOM_CARD_TEXT);
  const fullResponses = compiled.responses.concat(blankCopies);

  state = {
    isOnline: true,
    players: onlinePlayers.map(name => ({ name, score: 0 })),
    target: store.get(cfg.targetKey, 5),
    physical: false,
    czar: 0,
    round: 1,
    prompts: fullPrompts, // Store combined active prompts in state
    deck: shuffle(fullResponses),
    discard: [],
    promptDeck: shuffle(fullPrompts.map((_, i) => i)),
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
  
  state.players.forEach((_, idx) => {
    state.hands[idx] = drawCards(HAND_SIZE);
  });
  dealPrompt();
  
  sendSyncAction({ type: "START_GAME", state });
  unregisterRoom();
  stopHeartbeat();
  render();
}

function handleRelayedAction(action, sender) {
  if (action.type === "STATE_SYNC" && (!state || !isHost)) {
    state = action.state;
    state.isOnline = true;
    state.roomCode = roomCode;
    state.myName = myName;
    state.isHost = isHost;
    render();
    return;
  }

  if (!isHost) {
    if (action.type === "START_GAME") {
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
  if (action.type === "GUEST_CUSTOM_SYNC") {
    // Save guest's custom responses
    if (action.customs && Array.isArray(action.customs)) {
      action.customs.forEach(card => {
        if (!guestCustomResponses.includes(card)) {
          guestCustomResponses.push(card);
        }
      });
    }
    // Save guest's custom prompts
    if (action.prompts && Array.isArray(action.prompts)) {
      action.prompts.forEach(p => {
        if (!guestCustomPrompts.some(gp => gp.text === p.text)) {
          guestCustomPrompts.push(p);
        }
      });
    }
    console.log("Host: Synced custom cards from guest player:", sender);
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
    const statusSpan = hasSubmitted
      ? el("span", { className: "pill czar-pill", style: "display:inline-flex; align-items:center; gap:4px;" }, [
          el("span", { style: "width:12px; height:12px; display:inline-block;" }, [icons.lock()]),
          el("span", { text: "Submitted" })
        ])
      : el("span", { className: "pill", style: "display:inline-flex; align-items:center; gap:4px;" }, [
          el("span", { style: "width:12px; height:12px; display:inline-block;" }, [icons.eye()]),
          el("span", { text: "Thinking" })
        ]);
    list.appendChild(el("div", { className: "score-row" }, [
      el("span", { className: "nm", text: p.name }),
      statusSpan
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
        el("div", { className: "who", text: "Your Turn" }),
        el("span", { className: "pill czar-pill", style: "display:inline-flex; align-items:center; gap:4px;" }, [
          el("span", { style: "width:12px; height:12px; display:inline-block;" }, [icons.timer()]),
          el("span", { text: "Waiting for submissions..." })
        ])
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
          style: "width:auto; padding:4px 10px; background:#c62828; color:#fff; font-size:0.8rem; box-shadow:none; display:inline-flex; align-items:center; gap:4px;",
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
        }, [
          el("span", { style: "width:12px; height:12px; display:inline-block;" }, [icons.trash()]),
          el("span", { text: "Discard" })
        ])
      ]));
    });
    trashWrap.appendChild(trashGrid);
  }

  mount(
    topbar(`Round ${state.round}`),
    el("div", { className: "handoff panel center" }, [
      el("div", { style: "width:64px; height:64px; margin:0 auto 12px; color:var(--sunset-soft);" }, [icons.lock()]),
      el("h3", { text: "Submission Locked" }),
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
        style: "position:absolute; top:4px; right:4px; width:28px; height:28px; font-size:0.85rem; border-radius:50%; background:rgba(0,0,0,0.1); border:none; box-shadow:none; padding:0; display:grid; place-items:center; color:var(--sunset-soft);",
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
      }, [
        el("span", { style: "width:14px; height:14px; display:inline-block;" }, [icons.trash()])
      ]);
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
      disabled: !ready,
      onClick: submitCardsOnline
    }, ready ? [
        el("span", { style: "width:18px; height:18px; display:inline-block;" }, [icons.lock()]),
        el("span", { text: "Lock in submission" })
      ] : [
        el("span", { text: `Select ${need - state.selected.length} more` })
      ]
    ),
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

  const filledText = state.prompt.text.split(BLANK).map((part, i) => {
    const card = w.cards[i] || "";
    return part + (card ? ` ${card} ` : "");
  }).join("");

  const speak = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(filledText);
    u.rate = 0.88; u.pitch = 1.0;
    window.speechSynthesis.speak(u);
  };

  speak();

  const speakBtn = el("button", {
    className: "btn ghost small",
    style: "display:inline-flex; align-items:center; gap:4px; margin-top:8px; padding:4px 10px; font-size:0.75rem;",
    onClick: speak
  }, [
    el("span", { style: "width:12px; height:12px; display:inline-block;" }, [icons.speak()]),
    el("span", { text: "Read Aloud" })
  ]);

  mount(
    topbar(`Round ${state.round} Results`),
    el("div", { className: "panel center" }, [
      el("div", { style: "width:64px; height:64px; margin:0 auto 12px; color:var(--sunset-soft);" }, [icons.star()]),
      el("h2", { text: `${winnerName} wins the round!` }),
      el("div", { className: "play-card prompt", style: "text-align:left" }, [
        fillPrompt(state.prompt.text, BLANK, w.cards || []),
      ]),
      speakBtn
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
      el("div", { style: "display: flex; align-items: center; justify-content: center; gap: 8px; margin: 0 auto 12px;" }, [
        el("div", { style: "width:64px; height:64px; color:var(--sunset-soft);" }, [cfg.icon()]),
        el("span", { style: "font-size: 3rem;" }, "👑")
      ]),
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
  const compiled = compilePlayableDecks();
  const fullPrompts = compiled.prompts;
  const blankCopies = Array(6).fill(CUSTOM_CARD_TEXT);
  const fullResponses = compiled.responses.concat(blankCopies);

  state = {
    isOnline: true,
    players: onlinePlayers.map(name => ({ name, score: 0 })),
    target: state.target,
    physical: false,
    czar: 0,
    round: 1,
    prompts: fullPrompts, // Store combined active prompts in state
    deck: shuffle(fullResponses),
    discard: [],
    promptDeck: shuffle(fullPrompts.map((_, i) => i)),
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
  state.players.forEach((_, idx) => {
    state.hands[idx] = drawCards(HAND_SIZE);
  });
  dealPrompt();
  
  hasSubmittedThisRound = false;

  sendSyncAction({ type: "START_GAME", state });
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
    let card = state.deck.pop();
    // Guarantee uniqueness: if another player already holds this non-blank card in their hand, skip/discard it
    if (card && card !== CUSTOM_CARD_TEXT) {
      let isDuplicate = state.hands.some(hand => hand && hand.includes(card));
      let attempts = 0;
      while (isDuplicate && state.deck.length > 0 && attempts < 100) {
        state.discard.push(card);
        card = state.deck.pop();
        isDuplicate = state.hands.some(hand => hand && hand.includes(card));
        attempts++;
      }
    }
    if (card) out.push(card);
  }
  return out;
}

function dealPrompt() {
  const promptsList = (state && state.prompts) ? state.prompts : cfg.prompts;
  
  let pDeckState = store.get(cfg.saveKey + ".persistent_prompt_deck", null);
  if (!pDeckState || !Array.isArray(pDeckState.deck) || pDeckState.deck.length !== promptsList.length || typeof pDeckState.pos !== "number") {
    pDeckState = {
      deck: shuffle(promptsList.map((_, i) => i)),
      pos: 0
    };
  }
  
  if (pDeckState.pos >= pDeckState.deck.length) {
    toast("Deck box empty! Reshuffling all prompts...");
    pDeckState.deck = shuffle(promptsList.map((_, i) => i));
    pDeckState.pos = 0;
  }
  
  const idx = pDeckState.deck[pDeckState.pos];
  pDeckState.pos++;
  store.set(cfg.saveKey + ".persistent_prompt_deck", pDeckState);
  
  state.prompt = promptsList[idx];
  state.promptDeck = pDeckState.deck.slice(pDeckState.pos);
  state.promptUsed = pDeckState.deck.slice(0, pDeckState.pos);
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
    if (myIdx === -1) {
      mount(
        el("div", { className: "topbar" }, [
          el("button", { className: "back", onClick: () => { resetOnlineState(); renderSetup(); } }, [
            el("span", { style: "width:16px; height:16px; display:inline-block;" }, [icons.back()]),
            el("span", { text: "Leave" })
          ]),
          el("div",    { className: "title", text: "Spectating" }),
          el("span",   { style: "width:64px" })
        ]),
        el("div", { className: "panel center", style: "padding:40px 20px;" }, [
          el("div", { style: "width:64px; height:64px; margin:0 auto 12px; color:var(--sunset-soft);" }, [icons.spectator()]),
          el("h3",  { style: "margin:0 0 8px; color:var(--water-foam);", text: "Game in progress!" }),
          el("p",   { className: "muted", style: "margin:0;", text: "You are spectating this game. You will be able to join in the next lobby!" })
        ])
      );
      return;
    }

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

  const filledText = state.prompt.text.split(BLANK).map((part, i) => {
    const card = w.cards[i] || "";
    return part + (card ? ` ${card} ` : "");
  }).join("");

  const speak = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(filledText);
    u.rate = 0.88; u.pitch = 1.0;
    window.speechSynthesis.speak(u);
  };

  speak();

  const speakBtn = el("button", {
    className: "btn ghost small",
    style: "display:inline-flex; align-items:center; gap:4px; margin-top:8px; padding:4px 10px; font-size:0.75rem;",
    onClick: speak
  }, [
    el("span", { style: "width:12px; height:12px; display:inline-block;" }, [icons.speak()]),
    el("span", { text: "Read Aloud" })
  ]);

  mount(
    topbar(`Round ${state.round}`),
    el("div", { className: "panel center" }, [
      el("div", { style: "width:64px; height:64px; margin:0 auto 12px; color:var(--sunset-soft);" }, [icons.star()]),
      el("h2", { text: `${winnerName} wins the round!` }),
      el("div", { className: "play-card prompt", style: "text-align:left" }, [
        fillPrompt(state.prompt.text, BLANK, w.cards || []),
      ]),
      speakBtn
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
      el("div", { style: "display: flex; align-items: center; justify-content: center; gap: 8px; margin: 0 auto 12px;" }, [
        el("div", { style: "width:64px; height:64px; color:var(--sunset-soft);" }, [cfg.icon()]),
        el("span", { style: "font-size: 3rem;" }, "👑")
      ]),
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

/* ---------------- Playable Deck Customizer Overlay ---------------- */
let customizerTab = "responses"; // "responses" | "prompts"
let customizerSearch = "";

function openDeckCustomizer() {
  customizerSearch = "";
  renderCustomizer();
}

function renderCustomizer() {
  const localPrompts = store.get(cfg.saveKey + ".custom_prompts", []);
  const localCustoms = store.get(cfg.saveKey + ".custom_cards", []);

  const disabledPrompts = store.get(cfg.saveKey + ".disabled_prompts", []);
  const disabledResponses = store.get(cfg.saveKey + ".disabled_responses", []);

  // Topbar
  const topbarEl = el("div", { className: "topbar" }, [
    el("button", { className: "back", text: "‹ Setup", onClick: renderSetup }),
    el("div", { className: "title", text: "Customize Playable Deck" }),
    el("span", { style: "width:64px" })
  ]);

  // Tab buttons
  const tabRow = el("div", { className: "btn-row", style: "margin-bottom:12px; gap:8px;" }, [
    el("button", {
      className: "btn small" + (customizerTab === "responses" ? "" : " ghost"),
      style: "flex:1; font-weight:700; margin:0; padding:10px;",
      text: `⚪ White Cards (Responses)`,
      onClick: () => { customizerTab = "responses"; renderCustomizer(); }
    }),
    el("button", {
      className: "btn small" + (customizerTab === "prompts" ? "" : " ghost"),
      style: "flex:1; font-weight:700; margin:0; padding:10px;",
      text: `⚫ Black Cards (Prompts)`,
      onClick: () => { customizerTab = "prompts"; renderCustomizer(); }
    })
  ]);

  // Search input
  const searchBar = el("input", {
    type: "text",
    placeholder: "🔍 Search deck cards...",
    value: customizerSearch,
    style: "border-radius:12px; font-size:0.95rem; margin-bottom:12px;",
    onInput: (e) => {
      customizerSearch = e.target.value;
      filterCardRows();
    }
  });

  // Bulk Actions
  const bulkRow = el("div", { className: "btn-row", style: "margin-bottom:12px; gap:10px;" }, [
    el("button", {
      className: "btn small ghost",
      style: "flex:1; padding:6px; font-size:0.8rem; border-color:#2e7d32; color:#a5d6a7; margin:0;",
      text: "✅ Enable All",
      onClick: () => {
        if (customizerTab === "responses") {
          store.set(cfg.saveKey + ".disabled_responses", []);
        } else {
          store.set(cfg.saveKey + ".disabled_prompts", []);
        }
        renderCustomizer();
        toast("All cards active!");
      }
    }),
    el("button", {
      className: "btn small ghost",
      style: "flex:1; padding:6px; font-size:0.8rem; border-color:#c62828; color:#ef5350; margin:0;",
      text: "❌ Filter All",
      onClick: () => {
        if (customizerTab === "responses") {
          const allResp = cfg.responses.filter(c => c !== CUSTOM_CARD_TEXT).concat(localCustoms);
          store.set(cfg.saveKey + ".disabled_responses", allResp);
        } else {
          const allPromptsText = cfg.prompts.concat(localPrompts).map(p => p.text);
          store.set(cfg.saveKey + ".disabled_prompts", allPromptsText);
        }
        renderCustomizer();
        toast("All cards filtered out!");
      }
    })
  ]);

  // Create list wrap
  const listWrap = el("div", { className: "scoreboard", style: "max-height: 420px; overflow-y: auto;" });

  function filterCardRows() {
    listWrap.innerHTML = "";
    const term = customizerSearch.toLowerCase().trim();

    if (customizerTab === "responses") {
      const allResponses = cfg.responses.filter(c => c !== CUSTOM_CARD_TEXT).concat(localCustoms);
      
      allResponses.forEach(cardText => {
        if (term && !cardText.toLowerCase().includes(term)) return;

        const isDisabled = disabledResponses.includes(cardText);
        const toggleBtn = el("button", {
          className: "btn small" + (isDisabled ? " ghost" : ""),
          style: `width:92px; margin:0; padding:4px 8px; font-size:0.78rem; font-weight:700; ${isDisabled ? "border-color:#ef9a9a; color:#ef5350; background:rgba(198,40,40,0.05);" : "background:#2e7d32; color:#fff;"}`,
          text: isDisabled ? "❌ Filtered" : "✅ Active",
          onClick: () => {
            const list = store.get(cfg.saveKey + ".disabled_responses", []);
            if (isDisabled) {
              const idx = list.indexOf(cardText);
              if (idx !== -1) list.splice(idx, 1);
            } else {
              if (!list.includes(cardText)) list.push(cardText);
            }
            store.set(cfg.saveKey + ".disabled_responses", list);
            renderCustomizer();
          }
        });

        listWrap.appendChild(el("div", {
          className: "score-row",
          style: "padding:8px 10px; display:flex; align-items:center; justify-content:space-between;"
        }, [
          el("span", { style: "font-size:0.92rem; font-weight:700; color:#fff; word-break:break-word; flex:1; margin-right:8px;", text: cardText }),
          toggleBtn
        ]));
      });
    } else {
      const allPrompts = cfg.prompts.concat(localPrompts);

      allPrompts.forEach(p => {
        const displayPrompt = p.text.replace(/_______/g, "_");
        if (term && !displayPrompt.toLowerCase().includes(term)) return;

        const isDisabled = disabledPrompts.includes(p.text);
        const toggleBtn = el("button", {
          className: "btn small" + (isDisabled ? " ghost" : ""),
          style: `width:92px; margin:0; padding:4px 8px; font-size:0.78rem; font-weight:700; ${isDisabled ? "border-color:#ef9a9a; color:#ef5350; background:rgba(198,40,40,0.05);" : "background:#2e7d32; color:#fff;"}`,
          text: isDisabled ? "❌ Filtered" : "✅ Active",
          onClick: () => {
            const list = store.get(cfg.saveKey + ".disabled_prompts", []);
            if (isDisabled) {
              const idx = list.indexOf(p.text);
              if (idx !== -1) list.splice(idx, 1);
            } else {
              if (!list.includes(p.text)) list.push(p.text);
            }
            store.set(cfg.saveKey + ".disabled_prompts", list);
            renderCustomizer();
          }
        });

        const pickBadge = el("span", {
          className: "badge",
          style: "background:rgba(0,0,0,0.3); color:var(--water-foam); font-size:0.7rem; font-weight:700; margin:0 8px 0 0; padding:2px 6px; border:1px solid rgba(255,255,255,0.1);",
          text: `Pick ${p.pick}`
        });

        listWrap.appendChild(el("div", {
          className: "score-row",
          style: "padding:8px 10px; display:flex; align-items:center; justify-content:space-between;"
        }, [
          el("div", { style: "display:flex; align-items:center; flex:1; margin-right:8px;" }, [
            pickBadge,
            el("span", { style: "font-size:0.92rem; font-weight:700; color:#fff; word-break:break-word;", text: displayPrompt })
          ]),
          toggleBtn
        ]));
      });
    }

    if (listWrap.children.length === 0) {
      listWrap.appendChild(el("p", {
        className: "muted center",
        style: "margin:16px 0; font-style:italic;",
        text: "No matching cards found."
      }));
    }
  }

  filterCardRows();

  const shuffleDeckBoxBtn = el("button", {
    className: "btn small ghost",
    style: "width:100%; margin-top:12px; display:flex; align-items:center; justify-content:center; gap:6px; font-weight:700;",
    onClick: () => {
      store.del(cfg.saveKey + ".persistent_prompt_deck");
      toast("Prompt deck box shuffled!");
    }
  }, [
    el("span", { style: "width:14px; height:14px; display:inline-block;" }, [icons.refresh()]),
    el("span", { text: "Reshuffle Prompt Deck Box Now" })
  ]);

  mount(
    topbarEl,
    tabRow,
    searchBar,
    bulkRow,
    listWrap,
    shuffleDeckBoxBtn
  );
}
