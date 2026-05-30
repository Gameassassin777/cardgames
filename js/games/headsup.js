// Modular Heads Up forehead guessing game engine supporting Local Pass & Play and Online multiplayer.
import { el, mount, toast, store, shuffle, HTTP_BASE, WS_BASE } from "../ui.js";
import { icons } from "../icons.js";





let goHome = () => {};
let socket = null;
let roomCode = "";
let myName = "";
let isHost = false;
let gState = null;
let heartbeatInt = null;
let roomBrowserRefresh = null;

let isOnline = false;
let setupMode = "passplay"; // "passplay" or "online"

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

function requestOrientationPermission() {
  if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
    DeviceOrientationEvent.requestPermission()
      .then(response => {
        if (response === "granted") {
          console.log("DeviceOrientation permission granted.");
        }
      })
      .catch(err => console.warn("DeviceOrientation permission error:", err));
  }
}

const DECKS = {
  lake: {
    name: "Lake House Life 🛶",
    desc: "Cozy cabin, wild animals, and outdoor fun.",
    words: [
      "Canoe", "Marshmallow", "Campfire", "Mosquito", "Brown Bear", "Wooden Dock", 
      "Sleeping Bag", "S'mores", "Cooler", "Pinecone", "Fire Pit", "Sunburn", "Paddle",
      "Life Jacket", "Thermos", "Hiking Boot", "Starry Sky", "Fishing Rod", "Wet Socks",
      "Hammock", "Lake Monster", "Raccoon", "Beaver Dam", "Raft", "Hot Dog", "Watermelon"
    ]
  },
  animals: {
    name: "Animal Kingdom 🦁",
    desc: "From wild beasts to cute critters. Act them out!",
    words: [
      "Elephant", "Giraffe", "Kangaroo", "Lion", "Shark", "Penguin", "Monkey", "Beaver",
      "Raccoon", "Squirrel", "Green Frog", "Bat", "Owl", "Whale", "Dolphin", "Cheetah",
      "Flamingo", "Crocodile", "Hippo", "Chameleon", "Koala", "Sloth", "Snake", "Rooster"
    ]
  },
  blockbusters: {
    name: "Pop Culture & Movies 🎬",
    desc: "Famous movies, TV shows, and viral internet icons.",
    words: [
      "Spider-Man", "Shrek", "Harry Potter", "Barbie", "Batman", "Titanic", "Star Wars",
      "Minecraft", "TikTok", "Frozen", "Fortnite", "Iron Man", "The Matrix", "Jurassic Park",
      "Toy Story", "SpongeBob", "Wednesday Addams", "Taylor Swift", "Super Mario", "Pikachu"
    ]
  },
  accents: {
    name: "Accents & Impressions 🗣️",
    desc: "Must describe other words using these wild voices!",
    words: [
      "British Accent", "Pirate", "Texas Cowboy", "Robot", "Scary Zombie", "Laughing Baby",
      "Opera Singer", "Angry French Chef", "Deep Radio Host", "Surfer Bro", "Strict Teacher",
      "Dracula", "Whispering Spy", "Excited Dog", "Crying Toddler", "Alien", "High Pitch Voice"
    ]
  }
};

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
  roomCode = ""; myName = ""; isHost = false; gState = null; isOnline = false;
}

function renderSetup() {
  const savedName = localStorage.getItem("headsup.name") || "";
  const nameInput = el("input", {
    type: "text",
    placeholder: "Your name…",
    value: savedName,
    id: "h-name",
    style: "font-size:1.1rem; border-radius:14px; text-align:center; margin-bottom:14px; width:100%;"
  });

  const codeInput = el("input", {
    type: "text",
    placeholder: "4-LETTER CODE",
    id: "h-code",
    maxLength: 4,
    style: "font-size:1.3rem; border-radius:14px; text-align:center; text-transform:uppercase; letter-spacing:6px; margin-bottom:10px; width:100%;"
  });
  codeInput.addEventListener("input", () => { codeInput.value = codeInput.value.toUpperCase(); });

  const getName = () => {
    const n = nameInput.value.trim();
    if (!n) { toast("Enter your name first!"); return null; }
    localStorage.setItem("headsup.name", n);
    return n;
  };

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
      const savedNames = store.get("headsup.localNames", ["Player 1", "Player 2"]);
      let localNames = savedNames.slice();
      const localListWrap = el("div", { style: "margin: 16px 0; max-height:160px; overflow-y:auto; width:100%;" });

      function drawLocalList() {
        localListWrap.innerHTML = "";
        localNames.forEach((nm, i) => {
          const input = el("input", {
            type: "text",
            value: nm,
            maxlength: "14",
            placeholder: `Player ${i + 1}`,
            style: "flex:1; border-radius:12px; font-size:1rem; padding: 8px 12px; text-align:center;",
            onInput: (e) => { 
              localNames[i] = e.target.value; 
              store.set("headsup.localNames", localNames);
            }
          });
          const row = el("div", { style: "display:flex; gap:8px; align-items:center; margin-bottom: 8px; width:100%;" }, [
            input,
            el("button", {
              className: "btn ghost small error",
              text: "✕",
              style: "margin:0; padding:6px 12px; border-radius:12px; font-size:1.1rem; line-height:1;",
              onClick: () => {
                if (localNames.length > 2) {
                  localNames.splice(i, 1);
                  store.set("headsup.localNames", localNames);
                  drawLocalList();
                } else {
                  toast("Need at least 2 players.");
                }
              }
            })
          ]);
          localListWrap.appendChild(row);
        });
      }

      drawLocalList();

      const addPlayerBtn = el("button", {
        className: "btn ghost small",
        text: "+ Add Player",
        style: "width:100%; margin-bottom:14px;",
        onClick: () => {
          if (localNames.length < 8) {
            localNames.push("");
            store.set("headsup.localNames", localNames);
            drawLocalList();
          } else {
            toast("Max 8 players for local play.");
          }
        }
      });

      const localLayout = el("div", { style: "width:100%;" });
      localLayout.appendChild(el("label", { text: "Manage Local Guesser Turn List" }));
      localLayout.appendChild(localListWrap);
      localLayout.appendChild(addPlayerBtn);
      localLayout.appendChild(el("label", { text: "Select Category Deck Box to Start" }));

      Object.entries(DECKS).forEach(([key, deck]) => {
        const btn = el("button", {
          className: "panel",
          style: "text-align: left; padding: 16px; border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; background: rgba(255,255,255,0.01); display: block; width: 100%; margin-bottom:10px; transition: transform 0.2s;",
          onClick: () => {
            const cleaned = localNames.map((n, idx) => n.trim() || `Player ${idx + 1}`).slice(0, 8);
            if (cleaned.length < 2) {
              toast("Need at least 2 players.");
              return;
            }
            isOnline = false;
            requestOrientationPermission();
            startHeadsUpGame(deck, cleaned);
          }
        }, [
          el("h3", { text: deck.name, style: "margin: 0 0 4px; color: var(--sunset-soft);" }),
          el("p", { className: "muted", text: deck.desc, style: "margin: 0; font-size: 0.85rem;" })
        ]);
        localLayout.appendChild(btn);
      });
      dynamicFormWrap.appendChild(localLayout);
    } else {
      const onlineLayout = el("div", { style: "width:100%;" }, [
        nameInput,
        el("button", {
          className: "btn",
          text: "Create Room",
          style: "width:100%; margin-bottom:10px;",
          onClick: () => {
            const n = getName();
            if (n) { 
              requestOrientationPermission();
              myName = n; 
              connectRoom("create"); 
            }
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
            if (n) { 
              requestOrientationPermission();
              myName = n; 
              connectRoom("join", code); 
            }
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
          el("li", { text: "Forehead Placement: The guesser holds the phone/tablet to their forehead, screen facing outwards to the other players." }),
          el("li", { text: "Clue Giving: Other players shout hints, mimic sounds, or make gestures to describe the word. They must not spell or say any part of the word!" }),
          el("li", { text: "Guess & Score: If you guess correctly, tilt the phone DOWN (face to floor) to gain a point and get the next card." }),
          el("li", { text: "Pass & Skip: If you are stuck, tilt the phone UP (face to ceiling) to pass the word. Score as many as you can in 60 seconds!" })
        ])
      ]);
      showRulesBtn.parentNode.insertBefore(rPanel, showRulesBtn.nextSibling);
    }
  });

  mount(
    gameTopbar("Heads Up Forehead Setup", () => { resetAll(); goHome(); }),
    el("div", { className: "panel center", style: "max-width: 440px; margin: 0 auto;" }, [
      el("div", { style: "width:64px; height:64px; margin:0 auto 12px; color:var(--sunset-soft);" }, [icons.rizz()]),
      el("h2", { text: "Heads Up", style: "margin-bottom: 4px;" }),
      el("p", { className: "muted", style: "margin-bottom:20px;", text: "Forehead guessing game! Shout clues to help the guessing player name all words on the screen!" }),
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
      const res = await fetch(`${HTTP_BASE}/rooms/list?game=headsup`).then(r => r.json());
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
    gameTopbar("Open Heads Up Rooms", () => { clearInterval(roomBrowserRefresh); renderSetup(); }),
    el("div", { className: "panel center" }, [
      el("p", { className: "muted", style: "margin:0; font-size:0.82rem;", text: "Tap Join to enter any open Heads Up lobby." })
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
    ? `${WS_BASE}/ws/create?name=${encodeURIComponent(myName)}&game=headsup`
    : `${WS_BASE}/ws/join?code=${code}&name=${encodeURIComponent(myName)}&game=headsup`;

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
      console.error("[HeadsUp] Parse error:", e);
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
        game: "headsup", private: false,
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
    el("p", { className: "muted", text: "Invite friends using this code. Select a deck to begin." }),
    el("div", { style: "margin: 16px 0; width:100%; max-height:240px; overflow-y:auto;" }, pRows),
    isHost
      ? el("div", { style: "display:grid; grid-template-columns:1fr; gap:8px;" }, 
          Object.entries(DECKS).map(([k, d]) => {
            return el("button", {
              className: "btn ghost small",
              text: `Start: ${d.name}`,
              onClick: () => {
                if (playersList.length < 2) {
                  toast("Need at least 2 players!");
                  return;
                }
                requestOrientationPermission();
                initOnlineGame(d);
              }
            });
          })
        )
      : el("p", { className: "muted center anim-pulse", text: "Waiting for host to start..." })
  ]);

  mount(gameTopbar(`Heads Up Lobby`, () => { resetAll(); renderSetup(); }), lobbyLayout);
}

// ── Game Loops Initialization ───────────────────────────────────────────────
function startHeadsUpGame(deck, playerNames = ["You"]) {
  gState = {
    phase: "playing",
    deckName: deck.name,
    words: shuffle(deck.words.slice()),
    wordIdx: 0,
    history: [],
    timeLeft: 60,
    timerInterval: null,
    countdownLeft: 3,
    active: false,
    guesserIdx: 0,
    round: 1,
    players: playerNames.map(name => ({ name, score: 0 }))
  };

  run321Countdown();
}

function initOnlineGame(deck) {
  const pList = gState.players;
  relay({
    type: "start_game",
    deckName: deck.name,
    words: shuffle(deck.words.slice()),
    players: pList.map(name => ({ name, score: 0 }))
  });
}

// Global flash overlay references for synced cluers
let globalAppScreenOverlay = null;
let globalWordCardRef = null;

function handleRelay(action, sender) {
  if (action.type === "start_game") {
    gState = {
      phase: "playing",
      deckName: action.deckName,
      words: action.words,
      wordIdx: 0,
      history: [],
      timeLeft: 60,
      timerInterval: null,
      countdownLeft: 3,
      active: false,
      guesserIdx: 0,
      round: 1,
      players: action.players
    };
    run321Countdown();
  } else if (action.type === "headsup_next_round") {
    gState.phase = "playing";
    gState.guesserIdx = action.guesserIdx;
    gState.round = action.round;
    gState.players = action.players;
    gState.words = action.words;
    gState.wordIdx = 0;
    gState.timeLeft = 60;
    gState.countdownLeft = 3;
    gState.active = false;
    run321Countdown();
  } else if (action.type === "headsup_game_over") {
    gState.phase = "gameover";
    renderGameOverScreen();
  } else if (action.type === "countdown_tick") {
    gState.countdownLeft = action.count;
    if (globalWordCardRef) {
      globalWordCardRef.textContent = String(action.count);
    }
  } else if (action.type === "active_started") {
    gState.active = true;
    launchOnlineClueLoop();
  } else if (action.type === "word_change") {
    gState.wordIdx = action.wordIdx;
    if (globalWordCardRef) {
      globalWordCardRef.textContent = gState.words[gState.wordIdx] || "End of Deck!";
    }
  } else if (action.type === "guess_flash") {
    gState.history.push({ word: action.word, correct: action.correct });
    applySyncFlash(action.correct);
  } else if (action.type === "timer_tick") {
    gState.timeLeft = action.timeLeft;
    const timerDisplay = document.getElementById("h-timer");
    if (timerDisplay) {
      timerDisplay.textContent = `${action.timeLeft}s`;
    }
  } else if (action.type === "time_up") {
    gState.active = false;
    if (gState.timerInterval) clearInterval(gState.timerInterval);
    const correctCount = gState.history.filter(h => h.correct).length;
    gState.players[gState.guesserIdx].score += correctCount;
    renderSummaryScreen();
  }
}

function applySyncFlash(isCorrect) {
  const overlay = globalAppScreenOverlay;
  if (!overlay) return;

  if (isCorrect) {
    playTone(650, 0.08);
    setTimeout(() => playTone(820, 0.15), 80);
    overlay.style.backgroundColor = "rgba(0, 250, 150, 0.25)";
  } else {
    playTone(280, 0.25);
    overlay.style.backgroundColor = "rgba(255, 80, 80, 0.25)";
  }

  setTimeout(() => {
    overlay.style.backgroundColor = "transparent";
  }, 150);
}

// ── 3-2-1 Countdown ──────────────────────────────────────────────────────────
function run321Countdown() {
  playTone(400, 0.1);
  const textEl = el("h1", {
    text: String(gState.countdownLeft),
    style: "font-size: 8rem; font-weight: 900; color: var(--sunset-soft); margin: 40px 0;"
  });
  globalWordCardRef = textEl;

  const guesserName = typeof gState.players[gState.guesserIdx] === "string" ? gState.players[gState.guesserIdx] : gState.players[gState.guesserIdx].name;
  const isGuesser = !isOnline || (myName === guesserName);

  const container = el("div", { className: "panel center", style: "max-width: 400px; margin: 0 auto; text-align: center; padding: 24px;" }, [
    el("p", { className: "muted", text: isGuesser ? "Place the device on your forehead, facing outward!" : `${guesserName} is placing the phone on their forehead!` }),
    textEl,
    el("p", { text: `Deck: ${gState.deckName}`, style: "font-weight: 500; font-size: 1.1rem; color: #00ffaa;" }),
    el("p", { className: "muted", text: `Turn ${gState.round} of ${gState.players.length}`, style: "font-size:0.85rem;" })
  ]);

  mount(gameTopbar("Heads Up — Get Ready!", () => confirmQuit()), container);

  if (isGuesser) {
    const interval = setInterval(() => {
      gState.countdownLeft--;
      if (isOnline) relay({ type: "countdown_tick", count: gState.countdownLeft });

      if (gState.countdownLeft <= 0) {
        clearInterval(interval);
        playTone(800, 0.3);
        gState.active = true;
        if (isOnline) relay({ type: "active_started" });
        launchGuesserLoop();
      } else {
        textEl.textContent = String(gState.countdownLeft);
        playTone(400, 0.1);
      }
    }, 1000);
    gState.timerInterval = interval;
  }
}

// ── Guesser Device Loop ──────────────────────────────────────────────────────
function launchGuesserLoop() {
  if (gState.timerInterval) clearInterval(gState.timerInterval);

  let lastTiltTime = 0;
  let lastCheckTime = 0;

  function handleOrientation(e) {
    if (!gState.active) return;
    const now = Date.now();
    
    if (now - lastCheckTime < 80) return;
    lastCheckTime = now;

    if (now - lastTiltTime < 1400) return;

    const isLandscape = window.innerWidth > window.innerHeight;
    if (isLandscape) {
      const g = e.gamma;
      if (g !== null) {
        const absG = Math.abs(g);
        if (absG < 45) {
          lastTiltTime = now;
          triggerGuess(true);
        } else if (absG > 135) {
          lastTiltTime = now;
          triggerGuess(false);
        }
      }
    } else {
      const b = e.beta;
      if (b !== null) {
        if (b < 45) {
          lastTiltTime = now;
          triggerGuess(true);
        } else if (b > 135) {
          lastTiltTime = now;
          triggerGuess(false);
        }
      }
    }
  }

  window.addEventListener("deviceorientation", handleOrientation);

  function cleanupOrientation() {
    window.removeEventListener("deviceorientation", handleOrientation);
  }

  const wordCard = el("h2", {
    text: gState.words[gState.wordIdx] || "End of Deck!",
    style: "font-size: 3rem; font-weight: 900; text-align: center; margin: 40px 0; min-height: 90px; line-height: 1.2; text-shadow: 0 4px 20px rgba(0,0,0,0.6);"
  });

  const timerEl = el("div", {
    id: "h-timer",
    text: `${gState.timeLeft}s`,
    style: "font-size: 1.8rem; font-weight: bold; color: var(--sunset-soft);"
  });

  const passBtn = el("button", {
    className: "btn error",
    text: "PASS (Tilt Up)",
    style: "flex: 1; height: 60px; font-weight: bold;",
    onClick: () => triggerGuess(false)
  });

  const correctBtn = el("button", {
    className: "btn success",
    text: "CORRECT (Tilt Down)",
    style: "flex: 1; height: 60px; font-weight: bold; background: linear-gradient(135deg, #00ffaa, #00b377); color: #051410;",
    onClick: () => triggerGuess(true)
  });

  const appScreen = el("div", {
    className: "heads-up-gameplay",
    style: "position:fixed; top:0; left:0; right:0; bottom:0; display:flex; flex-direction:column; justify-content:space-between; padding: 24px; box-sizing:border-box; transition: background-color 0.15s ease; background:#071418; z-index:9999;"
  }, [
    el("div", { style: "display:flex; justify-content:space-between; align-items:center;" }, [
      el("div", { text: `Deck: ${gState.deckName}`, style: "font-size: 0.9rem; font-weight:500; color: #00ffaa;" }),
      timerEl
    ]),
    wordCard,
    el("div", { style: "display: flex; gap: 12px; margin-bottom:12px;" }, [passBtn, correctBtn])
  ]);
  globalAppScreenOverlay = appScreen;

  mount(appScreen);

  function triggerGuess(isCorrect) {
    if (!gState.active) return;
    const currentWord = gState.words[gState.wordIdx];
    if (!currentWord) return;

    gState.history.push({ word: currentWord, correct: isCorrect });

    if (isOnline) {
      relay({ type: "guess_flash", word: currentWord, correct: isCorrect });
    }

    applySyncFlash(isCorrect);

    gState.wordIdx++;
    if (gState.wordIdx >= gState.words.length) {
      gState.words = shuffle(gState.words);
      gState.wordIdx = 0;
    }

    wordCard.textContent = gState.words[gState.wordIdx];
    if (isOnline) relay({ type: "word_change", wordIdx: gState.wordIdx });
  }

  // 60-second Timer Loop controlled by Guesser
  gState.timerInterval = setInterval(() => {
    gState.timeLeft--;
    timerEl.textContent = `${gState.timeLeft}s`;
    if (isOnline) relay({ type: "timer_tick", timeLeft: gState.timeLeft });

    if (gState.timeLeft <= 10 && gState.timeLeft > 0) {
      playTone(880, 0.04);
    }

    if (gState.timeLeft <= 0) {
      clearInterval(gState.timerInterval);
      gState.active = false;
      cleanupOrientation();
      playTone(300, 0.2);
      setTimeout(() => playTone(300, 0.2), 220);
      
      const correctCount = gState.history.filter(h => h.correct).length;
      gState.players[gState.guesserIdx].score += correctCount;

      if (isOnline) relay({ type: "time_up" });
      renderSummaryScreen();
    }
  }, 1000);
}

// ── Clue Givers Device Loop ─────────────────────────────────────────────────
function launchOnlineClueLoop() {
  const guesserName = typeof gState.players[gState.guesserIdx] === "string" ? gState.players[gState.guesserIdx] : gState.players[gState.guesserIdx].name;

  const wordCard = el("h2", {
    text: gState.words[gState.wordIdx] || "End of Deck!",
    style: "font-size: 3.2rem; font-weight: 900; text-align: center; margin: 40px 0; min-height: 90px; line-height: 1.2; text-shadow: 0 4px 20px rgba(0,0,0,0.6); color:#00ffaa;"
  });
  globalWordCardRef = wordCard;

  const timerEl = el("div", {
    id: "h-timer",
    text: `${gState.timeLeft}s`,
    style: "font-size: 1.8rem; font-weight: bold; color: var(--sunset-soft);"
  });

  const appScreen = el("div", {
    style: "position:fixed; top:0; left:0; right:0; bottom:0; display:flex; flex-direction:column; justify-content:space-between; padding: 24px; box-sizing:border-box; transition: background-color 0.15s ease; background:#071418; z-index:9999;"
  }, [
    el("div", { style: "display:flex; justify-content:space-between; align-items:center;" }, [
      el("div", { text: `SHOUT CLUES TO ${guesserName}!`, style: "font-weight:bold; color: var(--sunset-soft);" }),
      timerEl
    ]),
    wordCard,
    el("p", { className: "muted center anim-pulse", text: "Do not show your screen to the guesser!" })
  ]);
  globalAppScreenOverlay = appScreen;

  mount(appScreen);
}

// ── Summary Scorecards ─────────────────────────────────────────────────────
function renderSummaryScreen() {
  const correctCount = gState.history.filter(h => h.correct).length;
  
  const wordRows = gState.history.map(item => {
    return el("div", {
      style: "display:flex; justify-content:space-between; align-items:center; padding:8px 16px; background:rgba(255,255,255,0.02); border-radius:10px; margin-bottom:6px; border:1px solid rgba(255,255,255,0.04);"
    }, [
      el("span", { text: item.word, style: "font-weight: 500;" }),
      item.correct
        ? el("span", { text: "✓ Correct", style: "color: #00ffaa; font-weight: bold; font-size: 0.85rem;" })
        : el("span", { text: "✕ Passed", style: "color: #ff5e5e; font-weight: bold; font-size: 0.85rem;" })
    ]);
  });

  const guesserObj = gState.players[gState.guesserIdx];
  const guesserName = typeof guesserObj === "string" ? guesserObj : guesserObj.name;

  const isGameOver = gState.round >= gState.players.length;

  const nextBtn = el("button", {
    className: "btn",
    text: isGameOver ? "See Final Results 🏆" : "Next Round ➡️",
    style: "width:100%; font-weight:bold;",
    onClick: () => {
      if (isGameOver) {
        gState.phase = "gameover";
        if (isOnline) {
          if (isHost) relay({ type: "headsup_game_over" });
        }
        renderGameOverScreen();
      } else {
        if (isOnline) {
          if (isHost) {
            const nextAction = {
              type: "headsup_next_round",
              guesserIdx: gState.guesserIdx + 1,
              round: gState.round + 1,
              players: gState.players,
              words: shuffle(gState.words.slice())
            };
            relay(nextAction);
            handleRelay(nextAction, myName);
          }
        } else {
          gState.guesserIdx++;
          gState.round++;
          gState.history = [];
          gState.timeLeft = 60;
          gState.countdownLeft = 3;
          gState.active = false;
          gState.wordIdx = 0;
          gState.words = shuffle(gState.words.slice());
          renderHandoffScreen();
        }
      }
    }
  });

  const scoreboard = el("div", { className: "scoreboard", style: "margin-top:20px; width:100%;" });
  gState.players.forEach(p => {
    scoreboard.appendChild(
      el("div", {
        style: `display:flex; justify-content:space-between; align-items:center; padding:10px 14px; border-bottom:1px solid rgba(255,255,255,0.04); font-weight:${p.name === guesserName ? "bold" : "600"}; ${p.name === guesserName ? "color:var(--sunset-soft);" : ""}`
      }, [
        el("span", { text: p.name + (p.name === guesserName ? " (Guessed)" : "") }),
        el("span", { text: `${p.score} pts` })
      ])
    );
  });

  mount(
    gameTopbar(`Round ${gState.round} Complete`, () => confirmQuit()),
    el("div", { className: "panel center", style: "max-width: 480px; margin: 0 auto;" }, [
      el("h1", { text: `${correctCount} Correct!`, style: "font-size:3rem; font-weight:900; color:var(--sunset-soft); margin-top:0;" }),
      el("p", { className: "muted", text: `Guesser: ${guesserName}. Scorecard Summary:` }),
      el("div", { style: "max-height: 200px; overflow-y: auto; margin: 16px 0; width: 100%;" }, wordRows),
      el("h4", { text: "Scoreboard", style: "margin-top:20px; text-align:left; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:6px;" }),
      scoreboard,
      el("div", { className: "spacer" }),
      (!isOnline || isHost || isGameOver) ? nextBtn : el("p", { className: "muted center anim-pulse", text: "Waiting for host to advance..." })
    ])
  );
}

function renderHandoffScreen() {
  const nextGuesser = gState.players[gState.guesserIdx].name;
  
  const startBtn = el("button", {
    className: "btn",
    text: "Start Turn 🚀",
    style: "width:100%;",
    onClick: () => {
      run321Countdown();
    }
  });

  mount(
    gameTopbar("Heads Up — Forehead Handoff", () => confirmQuit()),
    el("div", { className: "panel center", style: "max-width: 440px; margin: 0 auto; padding: 40px 20px;" }, [
      el("p", { className: "muted", text: "Pass the device to the guesser:" }),
      el("h2", { text: nextGuesser, style: "font-size:2.5rem; margin:16px 0; color:var(--sunset-soft);" }),
      el("p", { className: "muted", text: "Hold the screen facing away from you on your forehead!", style: "margin-bottom:24px; font-size:0.85rem;" }),
      startBtn
    ])
  );
}

function renderGameOverScreen() {
  const ranked = gState.players.slice().sort((a, b) => b.score - a.score);
  const winner = ranked[0];

  const exitBtn = el("button", {
    className: "btn ghost",
    text: "Leave Room & Lobby",
    style: "width:100%; margin-top:10px;",
    onClick: () => {
      resetAll();
      goHome();
    }
  });

  const playAgainBtn = el("button", {
    className: "btn",
    text: "Play Again 🔄",
    style: "width:100%;",
    onClick: () => {
      if (isOnline) {
        if (isHost) {
          relay({
            type: "start_game",
            deckName: gState.deckName,
            words: shuffle(gState.words.slice()),
            players: gState.players.map(p => ({ name: p.name, score: 0 }))
          });
        }
      } else {
        const names = gState.players.map(p => p.name);
        const defaultDeck = DECKS.lake;
        const matchingDeck = Object.values(DECKS).find(d => d.name === gState.deckName) || defaultDeck;
        startHeadsUpGame(matchingDeck, names);
      }
    }
  });

  const scoreboard = el("div", { className: "scoreboard", style: "margin-top:28px; width:100%;" });
  ranked.forEach((p, idx) => {
    const medal = idx === 0 ? "👑" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "👤";
    scoreboard.appendChild(
      el("div", {
        style: "display:flex; justify-content:space-between; align-items:center; padding:10px 14px; border-bottom:1px solid rgba(255,255,255,0.04); font-weight:600;"
      }, [
        el("span", { text: `${medal} ${p.name}` }),
        el("span", { text: `${p.score} pts`, style: "color:var(--sunset-soft);" })
      ])
    );
  });

  mount(
    gameTopbar("Game Over", () => confirmQuit()),
    el("div", { className: "panel center", style: "max-width: 440px; margin: 0 auto; padding: 40px 20px;" }, [
      el("div", { style: "display: flex; align-items: center; justify-content: center; gap: 8px; margin: 0 auto 12px;" }, [
        el("div", { style: "width:64px; height:64px; color:var(--sunset-soft);" }, [icons.rizz()]),
        el("span", { style: "font-size: 3rem;" }, "👑")
      ]),
      el("h2", { text: `${winner.name} wins!`, style: "color:var(--sunset-soft); margin-bottom:8px;" }),
      el("p", { className: "muted", text: `Crowned Heads Up Forehead Champion with ${winner.score} points!`, style: "margin-bottom:24px;" }),
      scoreboard,
      el("div", { className: "spacer" }),
      (!isOnline || isHost) ? playAgainBtn : el("p", { className: "muted center anim-pulse", text: "Waiting for host to replay..." }),
      exitBtn
    ])
  );
}

// ── Web Audio Synth Tone ─────────────────────────────────────────────────────
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

function confirmQuit() {
  if (confirm("Are you sure you want to end this Heads Up game?")) {
    resetAll();
    goHome();
  }
}
