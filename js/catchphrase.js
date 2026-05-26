// Lake House Catchphrase — fast-paced hot-potato word guessing game!
import { el, mount, toast, store, shuffle } from "./ui.js";

// Standard Word Pools
const FAM_WORDS = [
  "marshmallow", "canoe", "campfire", "sleeping bag", "bear claw", "fishing rod", "paddle", 
  "mosquito", "treehouse", "hot dog", "pinecone", "beaver dam", "hiking boot", "cooler", 
  "flashlight", "marshmallow stick", "compass", "hammock", "squirrel", "lake house", "deck chair",
  "wild berries", "tent pole", "life jacket", "picnic basket", "acorn", "sleeping pad", "thermos",
  "muddy boots", "mosquito spray", "starry sky", "wooden dock", "fire pit", "frog catching"
];

const ONLINE_WORDS = [
  "Skibidi Toilet", "Ohio final boss", "mewing streak", "looksmaxxing", "sus impostor", 
  "W rizz", "Fanum tax", "looksmaxxing surgeon", "Baby Gronk", "Subway Surfers", "aura reading", 
  "Hawk Tuah", "Quandale Dingle", "John Pork", "Discord mod", "electrical vent", "sussy baka",
  "looksmaxxing invoice", "Sigma grindset", "Grimace shake", "TikTok rizz party"
];

const ADULT_WORDS = [
  "canoe full of regret", "burnt marshmallow", "soggy sandwich", "accidental cannonball", 
  "mosquito bite itch", "leaky air mattress", "unloading the dishwasher", "losing the remote", 
  "showering at night", "cereal is a soup", "touching grass", "burnt hot dog", "chore evasion",
  "embarrassing dad joke", "full middle name", "shredded cheese at 2 a.m.", "unwashed gym clothes"
];

// Discovery WebSockets URL
const wsUrl = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "ws://localhost:3000"
  : "wss://lakehouse-cardgames-sync.gameassassin777.workers.dev";

let goHome = () => {};
let timerInterval = null;

// Game State Engine
let game = {
  team1: "Team Blue",
  team2: "Team Green",
  score1: 0,
  score2: 0,
  targetScore: 7,
  roundDuration: 45, // seconds
  category: "family", // "family" | "online" | "adult"
  
  // Active round state
  activeTeam: 1, // 1 or 2
  timeLeft: 45,
  wordPool: [],
  wordIndex: 0,
  wordVisible: true
};

// Online Multiplayer variables
let onlineMode = false;
let socket = null;
let roomCode = "";
let myName = "";
let isHost = false;
let onlinePlayers = [];
let playerTeams = {}; // { player_name: team_id (1 or 2) }
let describerName = ""; // who is currently describing
let activePhase = "lobby"; // "lobby" | "play" | "buzzer" | "next_round" | "game_over"

export function start(homeCallback) {
  goHome = homeCallback;
  resetOnlineState();
  resetGame();
  renderSetup();
}

function resetGame() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  game.score1 = 0;
  game.score2 = 0;
  game.activeTeam = 1;
  game.wordVisible = true;
  describerName = "";
}

function resetOnlineState() {
  onlineMode = false;
  if (socket) {
    try { socket.close(); } catch (e) {}
    socket = null;
  }
  roomCode = "";
  myName = "";
  isHost = false;
  onlinePlayers = [];
  playerTeams = {};
  describerName = "";
  activePhase = "lobby";
}

function getWordPool() {
  let pool = [];
  if (game.category === "family") {
    pool = FAM_WORDS.slice();
  } else if (game.category === "online") {
    pool = ONLINE_WORDS.slice();
  } else {
    pool = ADULT_WORDS.slice();
  }

  // Mix in custom catchphrases saved in localStorage!
  const customs = store.get("catchphrase.game.v1.custom_cards", []);
  return shuffle(pool.concat(customs));
}

// Relaying actions across online sockets
function sendRelay(action) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "relay", action }));
  }
}

/* ---------------- 1. Setup / Lobby Screen ---------------- */
function renderSetup() {
  resetGame();

  // Mode Selection tab (Pass & Play vs Online)
  const passPlayBtn = el("button", {
    className: "btn" + (onlineMode ? " ghost" : ""),
    style: "flex:1; margin:0; font-weight:700; border-radius:12px; font-size:0.9rem; padding: 10px 14px;",
    text: "📱 Single Phone",
    onClick: () => { resetOnlineState(); renderSetup(); }
  });
  const onlineBtn = el("button", {
    className: "btn" + (onlineMode ? "" : " ghost"),
    style: "flex:1; margin:0; font-weight:700; border-radius:12px; font-size:0.9rem; padding: 10px 14px;",
    text: "🌐 Separate Phones",
    onClick: () => { onlineMode = true; renderSetup(); }
  });
  const modeTab = el("div", {
    className: "btn-row",
    style: "margin-bottom:14px; background:rgba(0,0,0,0.18); padding:6px; border-radius:14px; border:1px solid rgba(255,255,255,0.06);"
  }, [passPlayBtn, onlineBtn]);

  if (onlineMode) {
    if (roomCode) {
      renderOnlineLobby();
    } else {
      renderOnlineJoinHost(modeTab);
    }
  } else {
    renderOfflineSetup(modeTab);
  }
}

/* --- A. Offline Pass & Play Setup --- */
function renderOfflineSetup(modeTab) {
  const name1Input = el("input", { type: "text", value: game.team1, placeholder: "Team 1 Name", onInput: (e) => { game.team1 = e.target.value.trim() || "Team Blue"; } });
  const name2Input = el("input", { type: "text", value: game.team2, placeholder: "Team 2 Name", onInput: (e) => { game.team2 = e.target.value.trim() || "Team Green"; } });

  // Steppers
  let targetVal = el("span", { className: "val", text: String(game.targetScore) });
  const targetStepper = el("div", { className: "stepper" }, [
    el("button", { text: "−", onClick: () => { game.targetScore = Math.max(3, game.targetScore - 1); targetVal.textContent = game.targetScore; } }),
    targetVal,
    el("button", { text: "+", onClick: () => { game.targetScore = Math.min(20, game.targetScore + 1); targetVal.textContent = game.targetScore; } }),
    el("span", { className: "muted", text: "points to win", style: "margin-left:6px" })
  ]);

  let timeVal = el("span", { className: "val", text: `${game.roundDuration}s` });
  const timeStepper = el("div", { className: "stepper" }, [
    el("button", { text: "−", onClick: () => { game.roundDuration = Math.max(15, game.roundDuration - 5); timeVal.textContent = `${game.roundDuration}s`; } }),
    timeVal,
    el("button", { text: "+", onClick: () => { game.roundDuration = Math.min(120, game.roundDuration + 5); timeVal.textContent = `${game.roundDuration}s`; } }),
    el("span", { className: "muted", text: "per round", style: "margin-left:6px" })
  ]);

  // Category Selector
  const weirdUnlocked = localStorage.getItem("lakehouse.weird_unlocked") === "true";
  const famBtn = el("button", { className: "btn" + (game.category === "family" ? "" : " ghost"), text: "🌲 Wholesome Campfire", onClick: () => selectCategory("family") });
  const onlineBtn = el("button", { className: "btn" + (game.category === "online" ? "" : " ghost"), text: "🔒 Sus Brain-rot", onClick: () => selectCategory("online") });
  const adultBtn = el("button", { className: "btn" + (game.category === "adult" ? "" : " ghost"), text: "🔒 Unhinged Cabin", onClick: () => selectCategory("adult") });

  function selectCategory(cat) {
    if (!weirdUnlocked && cat !== "family") {
      toast("🔒 Tap the header duck 🦆 5 times and enter the secret password!");
      return;
    }
    game.category = cat;
    famBtn.className = cat === "family" ? "btn" : "btn ghost";
    onlineBtn.className = cat === "online" ? "btn" : "btn ghost";
    adultBtn.className = cat === "adult" ? "btn" : "btn ghost";
  }

  if (weirdUnlocked) {
    onlineBtn.textContent = "🐒 Sus Brain-rot";
    adultBtn.textContent = "🤫 Unhinged Cabin";
  }

  const startBtn = el("button", {
    className: "btn",
    text: "🔥 Start Catchphrase!",
    onClick: () => {
      game.wordPool = getWordPool();
      if (game.wordPool.length === 0) {
        toast("Word deck is empty! Add custom words in Settings.");
        return;
      }
      game.wordIndex = 0;
      startRound();
    }
  });

  const setupCard = el("div", { className: "panel" }, [
    el("label", { text: "Set Team Names" }),
    el("div", { style: "display:flex; gap:10px; margin-bottom:12px;" }, [name1Input, name2Input]),
    el("hr", { className: "divider" }),
    el("label", { text: "Target Score" }),
    targetStepper,
    el("hr", { className: "divider" }),
    el("label", { text: "Round Timer" }),
    timeStepper,
    el("hr", { className: "divider" }),
    el("label", { text: "Word Category" }),
    el("div", { className: "btn-row", style: "gap:8px; flex-direction:column;" }, [famBtn, onlineBtn, adultBtn]),
    el("hr", { className: "divider" }),
    startBtn
  ]);

  mount(
    el("div", { className: "topbar" }, [
      el("button", { className: "back", text: "‹ Lobby", onClick: goHome }),
      el("div", { className: "title", text: "Lake House Catchphrase" }),
      el("span", { style: "width:64px" })
    ]),
    modeTab,
    el("div", { className: "panel center" }, [
      el("p", { className: "muted", html: "<b>Fast-paced hot-potato word guessing!</b> Describe the phrase to your team without saying the word. As soon as they guess it, click next and <i>pass the device</i> to the other team. Don't get caught holding it when the timer buzzes!" })
    ]),
    setupCard
  );
}

/* --- B. Online Play Join/Host Setup --- */
function renderOnlineJoinHost(modeTab) {
  const savedName = localStorage.getItem("catchphrase.myname") || "";
  const nameInput = el("input", {
    type: "text",
    value: savedName,
    placeholder: "Enter Your Display Name",
    style: "margin-bottom:12px; font-weight:700;",
    onInput: (e) => {
      myName = e.target.value.trim().substring(0, 14);
      localStorage.setItem("catchphrase.myname", myName);
    }
  });
  myName = savedName;

  const hostBtn = el("button", {
    className: "btn",
    text: "🪵 Host a New Online Room",
    onClick: () => {
      if (!myName) { toast("Please enter your display name first!"); return; }
      createRoom();
    }
  });

  const codeInput = el("input", {
    type: "text",
    placeholder: "4-Letter Room Code",
    style: "text-transform: uppercase; text-align: center; font-weight:bold; letter-spacing:3px; font-size:1.15rem; margin-bottom:10px;",
    maxLength: 4
  });

  const joinBtn = el("button", {
    className: "btn secondary",
    text: "⚡ Join Existing Room",
    onClick: () => {
      if (!myName) { toast("Please enter your display name first!"); return; }
      const code = codeInput.value.trim().toUpperCase();
      if (code.length !== 4) { toast("Room code must be exactly 4 letters!"); return; }
      joinRoom(code);
    }
  });

  mount(
    el("div", { className: "topbar" }, [
      el("button", { className: "back", text: "‹ Lobby", onClick: goHome }),
      el("div", { className: "title", text: "Lake House Catchphrase" }),
      el("span", { style: "width:64px" })
    ]),
    modeTab,
    el("div", { className: "panel center" }, [
      el("p", { className: "muted", text: "Play real-time cooperative hot-potato using separate phones! All timers, scores, and words synchronize instantly. Guessers' screens safely hide the word so nobody can cheat." })
    ]),
    el("div", { className: "panel" }, [
      el("label", { text: "1. Who is playing?" }),
      nameInput,
      el("hr", { className: "divider" }),
      el("label", { text: "2. Host a New Match" }),
      hostBtn,
      el("hr", { className: "divider" }),
      el("label", { text: "3. Or Join an Active Room" }),
      codeInput,
      joinBtn
    ])
  );
}

/* --- C. Online Connected Lobby Screen --- */
function renderOnlineLobby() {
  const topbar = el("div", { className: "topbar" }, [
    el("button", { className: "back", text: "‹ Leave", onClick: () => { if (confirm("Leave this room?")) { resetOnlineState(); renderSetup(); } } }),
    el("div", { className: "title", text: `Room: ${roomCode}` }),
    el("span", { style: "width:64px" })
  ]);

  // Team Players mapping
  const bluePlayers = onlinePlayers.filter(p => playerTeams[p.name] === 1);
  const greenPlayers = onlinePlayers.filter(p => playerTeams[p.name] === 2);

  const team1List = el("div", { className: "scoreboard", style: "background:rgba(26,122,140,0.15); min-height:80px; padding:10px; border-radius:12px; margin-bottom:8px;" }, [
    el("h4", { style: "margin:0 0 6px 0; color:#57b6c4;", text: "🔵 Team Blue" }),
    ...bluePlayers.map(p => el("div", { style: "font-size:0.9rem; margin-bottom:3px; font-weight:700; color:#fff;", text: p.name + (p.name === myName ? " (You)" : "") })),
    el("button", {
      className: "btn ghost small",
      style: "width:100%; font-size:0.75rem; padding:4px 8px; margin-top:8px;",
      text: "Join Blue",
      disabled: playerTeams[myName] === 1,
      onClick: () => {
        playerTeams[myName] = 1;
        sendRelay({ type: "switch_team", name: myName, team: 1 });
        renderSetup();
      }
    })
  ]);

  const team2List = el("div", { className: "scoreboard", style: "background:rgba(47,90,61,0.15); min-height:80px; padding:10px; border-radius:12px; margin-bottom:8px;" }, [
    el("h4", { style: "margin:0 0 6px 0; color:#81c784;", text: "🟢 Team Green" }),
    ...greenPlayers.map(p => el("div", { style: "font-size:0.9rem; margin-bottom:3px; font-weight:700; color:#fff;", text: p.name + (p.name === myName ? " (You)" : "") })),
    el("button", {
      className: "btn ghost small",
      style: "width:100%; font-size:0.75rem; padding:4px 8px; margin-top:8px;",
      text: "Join Green",
      disabled: playerTeams[myName] === 2,
      onClick: () => {
        playerTeams[myName] = 2;
        sendRelay({ type: "switch_team", name: myName, team: 2 });
        renderSetup();
      }
    })
  ]);

  // Host configuration panels vs Non-Host view
  let settingsArea = null;
  if (isHost) {
    let targetVal = el("span", { className: "val", text: String(game.targetScore) });
    const targetStepper = el("div", { className: "stepper" }, [
      el("button", { text: "−", onClick: () => { game.targetScore = Math.max(3, game.targetScore - 1); targetVal.textContent = game.targetScore; syncLobbySettings(); } }),
      targetVal,
      el("button", { text: "+", onClick: () => { game.targetScore = Math.min(20, game.targetScore + 1); targetVal.textContent = game.targetScore; syncLobbySettings(); } }),
    ]);

    let timeVal = el("span", { className: "val", text: `${game.roundDuration}s` });
    const timeStepper = el("div", { className: "stepper" }, [
      el("button", { text: "−", onClick: () => { game.roundDuration = Math.max(15, game.roundDuration - 5); timeVal.textContent = `${game.roundDuration}s`; syncLobbySettings(); } }),
      timeVal,
      el("button", { text: "+", onClick: () => { game.roundDuration = Math.min(120, game.roundDuration + 5); timeVal.textContent = `${game.roundDuration}s`; syncLobbySettings(); } }),
    ]);

    // Categories Selection
    const weirdUnlocked = localStorage.getItem("lakehouse.weird_unlocked") === "true";
    const famBtn = el("button", { className: "btn small" + (game.category === "family" ? "" : " ghost"), text: "🌲 Wholesome", onClick: () => selectCategory("family") });
    const onlineBtn = el("button", { className: "btn small" + (game.category === "online" ? "" : " ghost"), text: "🔒 Sus", onClick: () => selectCategory("online") });
    const adultBtn = el("button", { className: "btn small" + (game.category === "adult" ? "" : " ghost"), text: "🔒 Unhinged", onClick: () => selectCategory("adult") });

    function selectCategory(cat) {
      if (!weirdUnlocked && cat !== "family") {
        toast("🔒 Unlock weird categories first!");
        return;
      }
      game.category = cat;
      famBtn.className = cat === "family" ? "btn small" : "btn small ghost";
      onlineBtn.className = cat === "online" ? "btn small" : "btn small ghost";
      adultBtn.className = cat === "adult" ? "btn small" : "btn small ghost";
      syncLobbySettings();
    }

    if (weirdUnlocked) {
      onlineBtn.textContent = "🐒 Sus";
      adultBtn.textContent = "🤫 Unhinged";
    }

    settingsArea = el("div", { className: "panel" }, [
      el("label", { text: "Configure Game (Host Controls)" }),
      el("div", { style: "display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;" }, [el("span", { text: "Target score" }), targetStepper]),
      el("div", { style: "display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;" }, [el("span", { text: "Round duration" }), timeStepper]),
      el("div", { style: "display:flex; justify-content:space-between; align-items:center;" }, [el("span", { text: "Category" }), el("div", { style: "display:flex; gap:4px;" }, [famBtn, onlineBtn, adultBtn])])
    ]);
  } else {
    // Read-only settings panel for guests
    settingsArea = el("div", { className: "panel", style: "background:rgba(255,255,255,0.02); text-align:center;" }, [
      el("label", { text: "🔒 Host Controlled Setup" }),
      el("p", { className: "muted", style: "margin:5px 0;", text: `Target Score: ${game.targetScore} points  ·  Duration: ${game.roundDuration}s  ·  Category: ${game.category.toUpperCase()}` })
    ]);
  }

  // Footer Start Button
  const playAreaBtn = isHost 
    ? el("button", {
        className: "btn",
        text: "🔥 Start Online Catchphrase!",
        onClick: () => {
          game.wordPool = getWordPool();
          if (game.wordPool.length === 0) {
            toast("Word deck is empty!");
            return;
          }
          sendRelay({ type: "start_game", wordPool: game.wordPool });
          game.wordIndex = 0;
          game.activeTeam = 1;
          game.timeLeft = game.roundDuration;
          describerName = "";
          activePhase = "play";
          startRound();
        }
      })
    : el("div", { className: "panel center", style: "background:none; border:none; margin:0;" }, [
        el("p", { className: "muted pulse", style: "font-weight:700;", text: "⏳ Waiting for host to start match..." })
      ]);

  mount(
    topbar,
    el("div", { style: "display:flex; gap:12px; margin-bottom:12px;" }, [
      el("div", { style: "flex:1" }, team1List),
      el("div", { style: "flex:1" }, team2List)
    ]),
    settingsArea,
    playAreaBtn
  );
}

function syncLobbySettings() {
  sendRelay({
    type: "sync_setup",
    targetScore: game.targetScore,
    roundDuration: game.roundDuration,
    category: game.category,
    playerTeams: playerTeams
  });
}

/* ---------------- ONLINE NETWORKING ENGINE ---------------- */
function createRoom() {
  renderLobbySpinner("Creating online room...");
  socket = new WebSocket(`${wsUrl}/ws/create?name=${encodeURIComponent(myName)}`);
  setupSocketListeners();
}

function joinRoom(code) {
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
        playerTeams[myName] = 1; // Default Blue
        renderSetup();
      } else if (data.type === "player_joined") {
        onlinePlayers = data.players;
        // Distribute player team
        onlinePlayers.forEach(p => {
          if (!playerTeams[p.name]) {
            const t1 = onlinePlayers.filter(pl => playerTeams[pl.name] === 1).length;
            const t2 = onlinePlayers.filter(pl => playerTeams[pl.name] === 2).length;
            playerTeams[p.name] = t1 <= t2 ? 1 : 2;
          }
        });
        if (isHost) {
          syncLobbySettings();
        }
        renderSetup();
      } else if (data.type === "player_left") {
        onlinePlayers = data.players;
        toast(`${data.name} left the room.`);
        renderSetup();
      } else if (data.type === "error") {
        toast(data.message);
        resetOnlineState();
        renderSetup();
      } else if (data.type === "relay") {
        handleRelayAction(data.action);
      }
    } catch(e) {
      console.error("Socket error processing message:", e);
    }
  };

  socket.onclose = () => {
    console.log("WebSocket disconnected.");
    if (onlineMode && roomCode) {
      toast("Disconnected from match server.");
      resetOnlineState();
      renderSetup();
    }
  };

  socket.onerror = (e) => {
    console.error("Socket error:", e);
    toast("Server connection failed.");
    resetOnlineState();
    renderSetup();
  };
}

function renderLobbySpinner(msg) {
  mount(
    el("div", { className: "topbar" }, [
      el("div", { className: "title", text: "Lake House Catchphrase" })
    ]),
    el("div", { className: "panel center" }, [
      el("div", { className: "big-emoji spin", style: "display: inline-block; font-size: 3rem;", text: "🛶" }),
      el("h3", { style: "margin-top: 15px;", text: msg }),
      el("p", { className: "muted", text: "Connecting to Cloudflare Workers Edge..." })
    ])
  );
}

function handleRelayAction(action) {
  if (action.type === "sync_setup") {
    game.targetScore = action.targetScore;
    game.roundDuration = action.roundDuration;
    game.category = action.category;
    if (action.playerTeams) {
      playerTeams = action.playerTeams;
    }
    renderSetup();
  } else if (action.type === "switch_team") {
    playerTeams[action.name] = action.team;
    renderSetup();
    toast(`${action.name} joined Team ${action.team === 1 ? "Blue" : "Green"}!`);
  } else if (action.type === "start_game") {
    game.wordPool = action.wordPool;
    game.wordIndex = 0;
    game.activeTeam = 1;
    game.timeLeft = game.roundDuration;
    describerName = "";
    activePhase = "play";
    startRound();
  } else if (action.type === "set_describer") {
    describerName = action.describerName;
    game.wordIndex = action.wordIndex;
    game.wordVisible = true;
    if (timerInterval) clearInterval(timerInterval);
    renderPlay();
    toast(`🗣️ ${describerName} is describing!`);
  } else if (action.type === "tick_timer") {
    game.timeLeft = action.timeLeft;
    // Update local timer visual
    const timerBox = document.getElementById("pulsingTimer");
    if (timerBox) {
      timerBox.textContent = `⏱️ ${game.timeLeft}s`;
      const ratio = game.timeLeft / game.roundDuration;
      if (ratio < 0.25) {
        timerBox.style.color = "#ef5350";
        timerBox.style.animation = "pulse 0.4s infinite alternate";
      } else if (ratio < 0.5) {
        timerBox.style.color = "#ffa726";
        timerBox.style.animation = "pulse 0.8s infinite alternate";
      } else {
        timerBox.style.color = "var(--water-foam)";
        timerBox.style.animation = "pulse 1.5s infinite alternate";
      }
    }
  } else if (action.type === "guess_success") {
    game.wordIndex = action.wordIndex;
    game.activeTeam = action.activeTeam;
    describerName = "";
    game.wordVisible = true;
    renderPlay();
    toast("👉 Passed to opposing team!");
  } else if (action.type === "skip") {
    game.timeLeft = action.timeLeft;
    game.wordIndex = action.wordIndex;
    game.wordVisible = true;
    renderPlay();
    toast("Skipped! -2 seconds penalty.");
  } else if (action.type === "time_up") {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    renderBuzzer();
  } else if (action.type === "award_point") {
    game.score1 = action.score1;
    game.score2 = action.score2;
    if (game.score1 >= game.targetScore || game.score2 >= game.targetScore) {
      renderGameOver();
    } else {
      game.activeTeam = action.nextActiveTeam;
      startNextRoundOverlay();
    }
  } else if (action.type === "start_next_round") {
    game.wordIndex = 0;
    describerName = "";
    game.timeLeft = game.roundDuration;
    startRound();
  } else if (action.type === "restart_lobby") {
    resetGame();
    activePhase = "lobby";
    renderSetup();
  }
}

/* ---------------- 2. Active Round Loop Screen ---------------- */
function startRound() {
  game.timeLeft = game.roundDuration;
  game.wordVisible = true;
  
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;

  // In offline mode, the countdown timer starts immediately!
  if (!onlineMode) {
    timerInterval = setInterval(() => {
      game.timeLeft--;
      
      const timerBox = document.getElementById("pulsingTimer");
      if (timerBox) {
        timerBox.textContent = `⏱️ ${game.timeLeft}s`;
        
        const ratio = game.timeLeft / game.roundDuration;
        if (ratio < 0.25) {
          timerBox.style.color = "#ef5350";
          timerBox.style.animation = "pulse 0.4s infinite alternate";
        } else if (ratio < 0.5) {
          timerBox.style.color = "#ffa726";
          timerBox.style.animation = "pulse 0.8s infinite alternate";
        } else {
          timerBox.style.color = "var(--water-foam)";
          timerBox.style.animation = "pulse 1.5s infinite alternate";
        }
      }

      if (game.timeLeft <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        renderBuzzer();
      }
    }, 1000);
  }

  renderPlay();
}

function renderPlay() {
  const currentWord = game.wordPool[game.wordIndex % game.wordPool.length];
  const activeName = game.activeTeam === 1 ? game.team1 : game.team2;

  const timerEl = el("div", {
    id: "pulsingTimer",
    style: "font-size:2.4rem; font-weight:800; text-align:center; margin-bottom:12px; color:var(--water-foam); transition: color 0.3s; animation: pulse 1.5s infinite alternate;",
    text: `⏱️ ${game.timeLeft}s`
  });

  const stopBtn = el("button", { 
    className: "back", 
    text: "✕ Stop", 
    onClick: () => { 
      if (confirm("Stop Catchphrase and return to lobby?")) { 
        if (onlineMode) {
          sendRelay({ type: "restart_lobby" });
        } else {
          resetGame(); 
          renderSetup(); 
        }
      } 
    } 
  });

  const topbar = el("div", { className: "topbar" }, [
    stopBtn,
    el("div", { className: "title", text: "Active Round!" }),
    el("span", { style: "width:64px" })
  ]);

  if (onlineMode) {
    renderOnlinePlay(topbar, timerEl, currentWord);
  } else {
    renderOfflinePlay(topbar, timerEl, currentWord, activeName);
  }
}

/* --- A. Offline Play UI Controls --- */
function renderOfflinePlay(topbar, timerEl, currentWord, activeName) {
  const wordCardText = el("span", {
    style: "font-size:1.6rem; font-weight:800; color:#fff; transition: opacity 0.15s; " + (game.wordVisible ? "opacity:1" : "opacity:0;"),
    text: currentWord
  });

  const wordCard = el("div", {
    className: "play-card response",
    style: "min-height:160px; justify-content:center; align-items:center; text-align:center; padding:18px; margin: 18px 0; background:linear-gradient(135deg, rgba(8,40,47,0.85), rgba(8,40,47,0.5)); border:2px solid rgba(205,238,242,0.3);"
  }, [
    wordCardText,
    el("div", {
      className: "muted",
      style: "font-size:0.8rem; font-weight:normal; position:absolute; bottom:8px; width:100%; text-align:center; left:0; " + (game.wordVisible ? "display:none;" : "display:block;"),
      text: "⚠️ WORD HIDDEN (Tap show to read)"
    })
  ]);

  const toggleShowBtn = el("button", {
    className: "btn ghost small",
    style: "width:100%; margin-bottom:12px; font-weight:700;",
    text: game.wordVisible ? "👁️ Hide Word (Pass Device Safely)" : "👁️ Show Word",
    onClick: () => {
      game.wordVisible = !game.wordVisible;
      renderPlay();
    }
  });

  const correctBtn = el("button", {
    className: "btn",
    style: "background:#2e7d32; color:#fff; font-weight:800; font-size:1.1rem; box-shadow:0 4px #1b5e20; margin-bottom:8px;",
    text: "✅ Guessed! Next & Pass",
    onClick: () => {
      game.wordIndex++;
      game.wordVisible = true;
      game.activeTeam = game.activeTeam === 1 ? 2 : 1;
      renderPlay();
      toast("👉 Passed to opposing team!");
    }
  });

  const skipBtn = el("button", {
    className: "btn ghost small",
    style: "width:100%; margin:0; border-color:#c62828; color:#ef5350; font-weight:700;",
    text: "⏭️ Skip (-2s Penalty)",
    onClick: () => {
      game.timeLeft = Math.max(0, game.timeLeft - 2);
      game.wordIndex++;
      game.wordVisible = true;
      renderPlay();
      toast("Skipped! -2 seconds penalty.");
    }
  });

  const turnPanel = el("div", {
    className: "panel center",
    style: "background:rgba(255,255,255,0.06); padding:10px; border-radius:12px; margin-bottom:12px;"
  }, [
    el("h3", {
      style: "margin:0; font-size:1.15rem; color:#fff; display:flex; align-items:center; justify-content:center; gap:8px;"
    }, [
      el("span", { style: "animation: pulse 1s infinite alternate;", text: "📣" }),
      el("span", { text: `${activeName}'s Turn to Describe!` })
    ])
  ]);

  mount(
    topbar,
    turnPanel,
    timerEl,
    wordCard,
    toggleShowBtn,
    correctBtn,
    skipBtn
  );
}

/* --- B. Online Synced Separate-Phones Play UI --- */
function renderOnlinePlay(topbar, timerEl, currentWord) {
  const activeName = game.activeTeam === 1 ? "🔵 Team Blue" : "🟢 Team Green";
  const myTeam = playerTeams[myName] || 1;

  // Turn Header Panel
  const turnPanel = el("div", {
    className: "panel center",
    style: `background:${game.activeTeam === 1 ? "rgba(26,122,140,0.12)" : "rgba(47,90,61,0.12)"}; padding:10px; border-radius:12px; margin-bottom:12px; border:1px solid rgba(255,255,255,0.06);`
  }, [
    el("h3", {
      style: "margin:0; font-size:1.1rem; color:#fff; text-align:center;"
    }, [
      el("span", { text: `Turn: ${activeName}` })
    ])
  ]);

  // Phase 1: No active describer has claimed this turn yet
  if (!describerName) {
    let playActionNode = null;
    if (myTeam === game.activeTeam) {
      playActionNode = el("div", { className: "panel center", style: "padding:20px;" }, [
        el("p", { style: "font-weight:bold; margin-bottom:14px; font-size:1rem; color:var(--water-foam);", text: "Your team is active! Who will describe the phrase?" }),
        el("button", {
          className: "btn",
          text: "🗣️ I will Describe!",
          onClick: () => {
            describerName = myName;
            sendRelay({ type: "set_describer", describerName: myName, wordIndex: game.wordIndex });
            
            // Start local ticking interval (active describer drives the clock)
            if (timerInterval) clearInterval(timerInterval);
            timerInterval = setInterval(() => {
              game.timeLeft--;
              sendRelay({ type: "tick_timer", timeLeft: game.timeLeft });
              
              if (game.timeLeft <= 0) {
                clearInterval(timerInterval);
                timerInterval = null;
                sendRelay({ type: "time_up" });
                renderBuzzer();
              }
            }, 1000);
            
            renderPlay();
            toast("You are describing! Do not show your screen to guessers.");
          }
        })
      ]);
    } else {
      playActionNode = el("div", { className: "panel center", style: "padding:24px; background:rgba(0,0,0,0.15);" }, [
        el("div", { className: "big-emoji spin", style: "display:inline-block; font-size:2.2rem; margin-bottom:10px;", text: "🌀" }),
        el("p", { className: "muted", style: "font-weight:700;", text: "Waiting for the other team to choose their describer..." })
      ]);
    }

    mount(
      topbar,
      turnPanel,
      playActionNode
    );
    return;
  }

  // Phase 2: Active describer has been chosen
  const isMeDescribing = describerName === myName;

  let wordCardNode = null;
  let controlRowNode = null;
  let statusPanelNode = null;

  if (isMeDescribing) {
    // Active Describer: Sees word, next and skip actions
    const wordCardText = el("span", {
      style: "font-size:1.6rem; font-weight:800; color:#fff; transition: opacity 0.15s; " + (game.wordVisible ? "opacity:1" : "opacity:0;"),
      text: currentWord
    });

    wordCardNode = el("div", {
      className: "play-card response",
      style: "min-height:160px; justify-content:center; align-items:center; text-align:center; padding:18px; margin: 18px 0; background:linear-gradient(135deg, rgba(8,40,47,0.85), rgba(8,40,47,0.5)); border:2px solid rgba(205,238,242,0.3);"
    }, [
      wordCardText,
      el("div", {
        className: "muted",
        style: "font-size:0.8rem; font-weight:normal; position:absolute; bottom:8px; width:100%; text-align:center; left:0; " + (game.wordVisible ? "display:none;" : "display:block;"),
        text: "⚠️ WORD HIDDEN (Tap show to read)"
      })
    ]);

    const toggleShowBtn = el("button", {
      className: "btn ghost small",
      style: "width:100%; margin-bottom:12px; font-weight:700;",
      text: game.wordVisible ? "👁️ Hide Word (Pass Phone Safely)" : "👁️ Show Word",
      onClick: () => {
        game.wordVisible = !game.wordVisible;
        renderPlay();
      }
    });

    const correctBtn = el("button", {
      className: "btn",
      style: "background:#2e7d32; color:#fff; font-weight:800; font-size:1.1rem; box-shadow:0 4px #1b5e20; margin-bottom:8px;",
      text: "✅ Guessed! Next & Pass",
      onClick: () => {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = null;
        
        const nextTeam = game.activeTeam === 1 ? 2 : 1;
        game.wordIndex++;
        game.activeTeam = nextTeam;
        describerName = "";
        
        sendRelay({ type: "guess_success", wordIndex: game.wordIndex, activeTeam: nextTeam });
        renderPlay();
        toast("👉 Passed turn to the other team!");
      }
    });

    const skipBtn = el("button", {
      className: "btn ghost small",
      style: "width:100%; margin:0; border-color:#c62828; color:#ef5350; font-weight:700;",
      text: "⏭️ Skip (-2s Penalty)",
      onClick: () => {
        game.timeLeft = Math.max(0, game.timeLeft - 2);
        game.wordIndex++;
        sendRelay({ type: "skip", wordIndex: game.wordIndex, timeLeft: game.timeLeft });
        renderPlay();
        toast("Skipped! -2 seconds penalty.");
      }
    });

    statusPanelNode = el("div", {
      className: "panel center",
      style: "background:rgba(232,121,74,0.15); padding:10px; border-radius:12px; margin-bottom:12px; border:1px dashed var(--sunset);"
    }, [
      el("p", { style: "margin:0; font-size:0.95rem; font-weight:bold; color:var(--sunset-soft);", text: "🗣️ YOU ARE DESCRIBING! Guessers are listening..." })
    ]);

    controlRowNode = el("div", { style: "display:flex; flex-direction:column; width:100%;" }, [
      toggleShowBtn,
      correctBtn,
      skipBtn
    ]);
  } else {
    // Guesser (teammate or opponent): Word card is locked and blanked out
    wordCardNode = el("div", {
      className: "play-card response locked",
      style: "min-height:160px; justify-content:center; align-items:center; text-align:center; padding:18px; margin: 18px 0; background:linear-gradient(135deg, rgba(0,0,0,0.4), rgba(0,0,0,0.25)); border:2px dashed rgba(255,255,255,0.08);"
    }, [
      el("div", { className: "big-emoji", style: "font-size:2.4rem; margin-bottom:6px;", text: "🤫" }),
      el("span", { style: "font-size:1.15rem; font-weight:800; color:var(--water-foam);", text: "Word Hidden (Guessing Phase)" })
    ]);

    const isTeammate = myTeam === game.activeTeam;
    statusPanelNode = el("div", {
      className: "panel center",
      style: "background:rgba(255,255,255,0.04); padding:12px; border-radius:12px; margin-bottom:12px;"
    }, [
      el("p", {
        style: "margin:0; font-size:0.92rem; font-weight:700; color:#fff;",
        text: isTeammate 
          ? `👂 Listen closely! Teammate ${describerName} is describing!`
          : `🛡️ Intercept! Opponent ${describerName} is describing to their team!`
      })
    ]);

    controlRowNode = el("div", { className: "panel center", style: "background:none; border:none; margin:0;" }, [
      el("p", { className: "muted pulse", text: "⏳ Active word synchronization active..." })
    ]);
  }

  mount(
    topbar,
    turnPanel,
    statusPanelNode,
    timerEl,
    wordCardNode,
    controlRowNode
  );
}

/* ---------------- 3. Buzzer / Round Scoring Screen ---------------- */
function renderBuzzer() {
  const activeName = game.activeTeam === 1 ? game.team1 : game.team2;
  const winnerName = game.activeTeam === 1 ? game.team2 : game.team1;
  const winningTeamId = game.activeTeam === 1 ? 2 : 1;

  const scorePanel = el("div", { className: "scoreboard" }, [
    el("div", { className: "score-row" + (game.score1 >= game.score2 && game.score1 > 0 ? " leader" : "") }, [
      el("span", { className: "nm", text: `🔵 ${game.team1}` }),
      el("span", { className: "pts", text: `${game.score1}/${game.targetScore}` })
    ]),
    el("div", { className: "score-row" + (game.score2 >= game.score1 && game.score2 > 0 ? " leader" : "") }, [
      el("span", { className: "nm", text: `🟢 ${game.team2}` }),
      el("span", { className: "pts", text: `${game.score2}/${game.targetScore}` })
    ])
  ]);

  let scoreAction = null;
  if (onlineMode) {
    if (isHost) {
      scoreAction = el("button", {
        className: "btn",
        text: `🏆 Award Point to ${winnerName}`,
        onClick: () => {
          if (game.activeTeam === 1) {
            game.score2++;
          } else {
            game.score1++;
          }
          sendRelay({
            type: "award_point",
            team: winningTeamId,
            score1: game.score1,
            score2: game.score2,
            nextActiveTeam: game.activeTeam === 1 ? 2 : 1
          });

          if (game.score1 >= game.targetScore || game.score2 >= game.targetScore) {
            renderGameOver();
          } else {
            game.activeTeam = game.activeTeam === 1 ? 2 : 1;
            startNextRoundOverlay();
          }
        }
      });
    } else {
      scoreAction = el("div", { className: "panel center", style: "background:none; border:none; margin:0;" }, [
        el("p", { className: "muted pulse", style: "font-weight:700;", text: `Waiting for Host to award point to ${winnerName}...` })
      ]);
    }
  } else {
    // Offline scoring button
    scoreAction = el("button", {
      className: "btn",
      text: `🏆 Award Point to ${winnerName}`,
      onClick: () => {
        if (game.activeTeam === 1) {
          game.score2++;
        } else {
          game.score1++;
        }
        
        if (game.score1 >= game.targetScore || game.score2 >= game.targetScore) {
          renderGameOver();
        } else {
          game.activeTeam = game.activeTeam === 1 ? 2 : 1;
          startNextRoundOverlay();
        }
      }
    });
  }

  mount(
    el("div", { className: "topbar" }, [
      el("div", { className: "title", text: "Round Over!" }),
    ]),
    el("div", { className: "panel center", style: "background:rgba(198,40,40,0.15); border:1.5px solid #c62828; animation: shake 0.5s;" }, [
      el("div", { className: "big-emoji", style: "font-size:3.5rem; animation: pulse 0.5s infinite alternate;", text: "🚨" }),
      el("h2", { style: "color:#ef5350; margin:10px 0 4px 0;", text: "⏰ TIME'S UP!" }),
      el("p", { className: "muted", style: "margin:0;", text: `${activeName} was caught holding the device when the timer buzzed!` })
    ]),
    el("div", { className: "panel" }, [
      el("label", { text: "Current Scores" }),
      scorePanel
    ]),
    scoreAction
  );
}

function startNextRoundOverlay() {
  const activeName = game.activeTeam === 1 ? game.team1 : game.team2;

  const scorePanel = el("div", { className: "scoreboard" }, [
    el("div", { className: "score-row" }, [
      el("span", { className: "nm", text: `🔵 ${game.team1}` }),
      el("span", { className: "pts", text: `${game.score1}/${game.targetScore}` })
    ]),
    el("div", { className: "score-row" }, [
      el("span", { className: "nm", text: `🟢 ${game.team2}` }),
      el("span", { className: "pts", text: `${game.score2}/${game.targetScore}` })
    ])
  ]);

  let nextActionBtn = null;
  if (onlineMode) {
    if (isHost) {
      nextActionBtn = el("button", {
        className: "btn",
        text: `▶️ Start next round with ${activeName}`,
        onClick: () => {
          sendRelay({ type: "start_next_round" });
          game.wordIndex = 0;
          describerName = "";
          game.timeLeft = game.roundDuration;
          startRound();
        }
      });
    } else {
      nextActionBtn = el("div", { className: "panel center", style: "background:none; border:none; margin:0;" }, [
        el("p", { className: "muted pulse", style: "font-weight:700;", text: `Waiting for Host to start next round with ${activeName}...` })
      ]);
    }
  } else {
    // Offline start next round button
    nextActionBtn = el("button", {
      className: "btn",
      text: `▶️ Start next round with ${activeName}`,
      onClick: () => {
        game.wordPool = getWordPool();
        game.wordIndex = 0;
        startRound();
      }
    });
  }

  mount(
    el("div", { className: "topbar" }, [
      el("div", { className: "title", text: "Get Ready!" }),
    ]),
    el("div", { className: "panel center" }, [
      el("h3", { text: "Prepare to Pass!" }),
      el("p", { className: "muted", text: `Round scored! The first turn goes to ${activeName}. Get ready to describe and pass!` })
    ]),
    el("div", { className: "panel" }, [
      scorePanel
    ]),
    nextActionBtn
  );
}

/* ---------------- 4. Game Over Screen ---------------- */
function renderGameOver() {
  const isWinner1 = game.score1 >= game.targetScore;
  const winnerName = isWinner1 ? game.team1 : game.team2;
  const winnerColor = isWinner1 ? "🔵" : "🟢";

  const board = el("div", { className: "scoreboard" }, [
    el("div", { className: "score-row leader" }, [
      el("span", { className: "nm", text: `${winnerColor} ${winnerName}` }),
      el("span", { className: "pts", text: `${Math.max(game.score1, game.score2)} points` })
    ]),
    el("div", { className: "score-row" }, [
      el("span", { className: "nm", text: `${isWinner1 ? "🟢" : "🔵"} ${isWinner1 ? game.team2 : game.team1}` }),
      el("span", { className: "pts", text: `${Math.min(game.score1, game.score2)} points` })
    ])
  ]);

  let actionBtns = [];
  if (onlineMode) {
    if (isHost) {
      actionBtns.push(el("button", {
        className: "btn",
        text: "Play Again",
        onClick: () => {
          sendRelay({ type: "restart_lobby" });
          resetGame();
          activePhase = "lobby";
          renderSetup();
        }
      }));
    } else {
      actionBtns.push(el("div", { className: "panel center", style: "background:none; border:none; margin:0;" }, [
        el("p", { className: "muted pulse", style: "font-weight:700;", text: "Waiting for Host to return to lobby..." })
      ]));
    }
    actionBtns.push(el("div", { className: "spacer" }));
    actionBtns.push(el("button", {
      className: "btn ghost",
      text: "Leave Room",
      onClick: () => {
        resetOnlineState();
        renderSetup();
      }
    }));
  } else {
    // Offline game over buttons
    actionBtns.push(el("button", { className: "btn", text: "Play Again", onClick: renderSetup }));
    actionBtns.push(el("div", { className: "spacer" }));
    actionBtns.push(el("button", { className: "btn ghost", text: "Back to Lobby", onClick: goHome }));
  }

  mount(
    el("div", { className: "topbar" }, [
      el("div", { className: "title", text: "Game Over" }),
    ]),
    el("div", { className: "panel center" }, [
      el("div", { className: "big-emoji", text: "👑🏆" }),
      el("h2", { text: `${winnerName} Wins the Match!` }),
      el("p", { className: "muted", text: "Absolute catchphrase legends!" })
    ]),
    el("div", { className: "panel" }, [
      board
    ]),
    ...actionBtns
  );
}
