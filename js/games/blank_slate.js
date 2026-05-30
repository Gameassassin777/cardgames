// Modular Blank Slate game engine supporting Local Pass & Play and Online Multiplayer.
import { el, mount, toast, store, shuffle, HTTP_BASE, WS_BASE } from "../ui.js";
import { icons } from "../icons.js";
import { BLANK_SLATE_PROMPTS } from "../data.js";





let goHome = () => {};
let socket = null;
let roomCode = "";
let myName = "";
let myPlayerIdx = -1;
let isHost = false;
let gState = null;
let heartbeatInt = null;
let wsKeepaliveInt = null;
let roomBrowserRefresh = null;

let isOnline = false;
let setupMode = "passplay"; // "passplay" or "online"
let localNames = ["Alice", "Bob", "Charlie"];

function getPersistentBlankSlateDeck() {
  let saved = store.get("blank_slate.persistent_deck", null);
  if (!saved || !Array.isArray(saved.deck) || saved.deck.length !== BLANK_SLATE_PROMPTS.length || typeof saved.pos !== "number") {
    saved = {
      deck: shuffle(BLANK_SLATE_PROMPTS.slice()),
      pos: 0
    };
    store.set("blank_slate.persistent_deck", saved);
  }
  return saved;
}

function advancePersistentBlankSlateDeck() {
  const pDeck = getPersistentBlankSlateDeck();
  pDeck.pos = (pDeck.pos + 2) % pDeck.deck.length;
  if (pDeck.pos === 0 || pDeck.pos >= pDeck.deck.length - 1) {
    toast("Blank Slate box empty! Reshuffling all cards...");
    pDeck.deck = shuffle(BLANK_SLATE_PROMPTS.slice());
    pDeck.pos = 0;
  }
  store.set("blank_slate.persistent_deck", pDeck);
  return pDeck;
}

function gameTopbar(title, onBack) {
  const showShuffle = gState && gState.phase && gState.phase !== "lobby" && gState.phase !== "done" && (!isOnline || isHost);

  const actionsGroup = showShuffle
    ? el("div", { style: "display:flex; gap:6px; align-items:center;" }, [
        el("button", {
          className: "btn ghost small",
          style: "margin:0; padding:6px 10px; border-radius:12px; font-size:0.75rem; display:flex; align-items:center; gap:4px; border-color:rgba(255,255,255,0.15);",
          onClick: () => {
            if (confirm("Skip the current cards and draw two new ones?")) {
              const pDeck = advancePersistentBlankSlateDeck();
              gState.phase = "select";
              gState.prompts = pDeck.deck;
              gState.promptIndex = pDeck.pos;
              gState.activePrompt = "";
              gState.answers = {};
              gState.localInputIdx = 0;
              
              if (isOnline && isHost) {
                const action = {
                  type: "BLANK_SLATE_NEXT_ROUND",
                  promptIndex: pDeck.pos,
                  selectorIdx: gState.selectorIdx
                };
                relay(action);
              } else {
                renderPromptScreen();
              }
              toast("Cards skipped!");
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
            if (confirm("Are you sure you want to reshuffle the cards box and draw new choices?")) {
              store.del("blank_slate.persistent_deck");
              const pDeck = getPersistentBlankSlateDeck();
              
              gState.phase = "select";
              gState.prompts = pDeck.deck;
              gState.promptIndex = pDeck.pos;
              gState.activePrompt = "";
              gState.answers = {};
              gState.localInputIdx = 0;
              
              if (isOnline && isHost) {
                const action = {
                  type: "BLANK_SLATE_NEXT_ROUND",
                  promptIndex: pDeck.pos,
                  selectorIdx: gState.selectorIdx
                };
                relay(action);
              } else {
                renderPromptScreen();
              }
              toast("Cards box reshuffled!");
            }
          }
        }, [
          el("span", { style: "width:12px; height:12px; display:inline-block;" }, [icons.refresh()]),
          el("span", { text: "Shuffle" })
        ])
      ])
    : el("span", { style: "width:64px" });

  return el("div", { className: "topbar" }, [
    el("button", { className: "back", onClick: onBack }, [
      el("span", { style: "width:16px; height:16px; display:inline-block;" }, [icons.back()]),
      el("span", { text: "Lobby" })
    ]),
    el("div", { className: "title", text: title }),
    actionsGroup
  ]);
}

export function start(home) {
  goHome = home;
  resetAll();
  const __pj = (() => { try { return JSON.parse(sessionStorage.getItem("lakehouse.pendingJoin")||"null"); } catch(_) { return null; } })();
  if (__pj && __pj.game === "blank_slate" && __pj.code && (Date.now() - __pj.ts) < 20000) {
    sessionStorage.removeItem("lakehouse.pendingJoin");
    myName = localStorage.getItem("lakehouse.playerName") || "";
    if (myName) { connectRoom("join", __pj.code); return; }
  }
  renderSetup();
}

function resetAll() {
  if (socket) { try { socket.close(); } catch (_) {} socket = null; }
  if (heartbeatInt) { clearInterval(heartbeatInt); heartbeatInt = null; }
  if (roomBrowserRefresh) { clearInterval(roomBrowserRefresh); roomBrowserRefresh = null; }
  roomCode = ""; myName = ""; myPlayerIdx = -1; isHost = false; gState = null; isOnline = false;
}

function renderSetup() {  const savedName = localStorage.getItem("lakehouse.playerName") || localStorage.getItem("blank_slate.name") || "";
  const nameInput = el("input", {
    type: "text",
    placeholder: "Your name…",
    value: savedName,
    id: "bs-name",
    style: "font-size:1.1rem; border-radius:14px; text-align:center; margin-bottom:14px; width:100%;"
  });

  const codeInput = el("input", {
    type: "text",
    placeholder: "4-LETTER CODE",
    id: "bs-code",
    maxLength: 4,
    style: "font-size:1.3rem; border-radius:14px; text-align:center; text-transform:uppercase; letter-spacing:6px; margin-bottom:10px; width:100%;"
  });
  codeInput.addEventListener("input", () => { codeInput.value = codeInput.value.toUpperCase(); });

  const getName = () => {
    const n = nameInput.value.trim();
    if (!n) { toast("Enter your name first!"); return null; }
    localStorage.setItem("blank_slate.name", n);
    return n;
  };

  // Pass & Play Names List
  const savedNames = store.get("blank_slate.localNames", ["Alice", "Bob", "Charlie"]);
  localNames = savedNames.slice();
  const localListWrap = el("div", { style: "margin: 16px 0; max-height:220px; overflow-y:auto; width:100%;" });

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
          store.set("blank_slate.localNames", localNames);
        }
      });
      const row = el("div", { style: "display:flex; gap:8px; align-items:center; margin-bottom: 8px; width:100%;" }, [
        input,
        el("button", {
          className: "btn ghost small error",
          text: "✕",
          style: "margin:0; padding:6px 12px; border-radius:12px; font-size:1.1rem; line-height:1;",
          onClick: () => {
            if (localNames.length > 3) {
              localNames.splice(i, 1);
              store.set("blank_slate.localNames", localNames);
              drawLocalList();
            } else {
              toast("Need at least 3 players.");
            }
          }
        })
      ]);
      localListWrap.appendChild(row);
    });
  }

  const addPlayerBtn = el("button", {
    className: "btn ghost small",
    text: "+ Add Player",
    style: "width:100%; margin-bottom:10px;",
    onClick: () => {
      if (localNames.length < 8) {
        localNames.push("");
        store.set("blank_slate.localNames", localNames);
        drawLocalList();
      } else {
        toast("Max 8 players for local play.");
      }
    }
  });

  const startLocalBtn = el("button", {
    className: "btn",
    text: "Start Local Blank Slate",
    style: "width:100%;",
    onClick: () => {
      const cleaned = localNames.map((n, idx) => n.trim() || `Player ${idx + 1}`).slice(0, 8);
      if (cleaned.length < 3) {
        toast("Need at least 3 players.");
        return;
      }
      isOnline = false;
      initGame(cleaned);
    }
  });

  // Category Toggles
  const modeSelector = el("div", {
    style: "display:flex; background:rgba(255,255,255,0.04); border-radius:14px; padding:4px; margin-bottom:20px; width:100%;"
  });

  const tabLocal = el("button", {
    className: setupMode === "passplay" ? "btn small" : "btn ghost small",
    text: "Pass & Play",
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
    text: "Online Room",
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
      drawLocalList();
      [localListWrap, addPlayerBtn, startLocalBtn].forEach(c => dynamicFormWrap.appendChild(c));
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
        })
      ]);
      dynamicFormWrap.appendChild(onlineLayout);
    }
  }

  renderSetupForm();

  const shuffleDeckBoxBtn = el("button", {
    className: "btn ghost small",
    style: "width:100%; margin-top:20px; display:flex; align-items:center; justify-content:center; gap:6px; font-size:0.8rem; font-weight:700;",
    onClick: () => {
      store.del("blank_slate.persistent_deck");
      toast("Blank Slate card box reshuffled!");
    }
  }, [
    el("span", { style: "width:12px; height:12px; display:inline-block;" }, [icons.refresh()]),
    el("span", { text: "Reshuffle Cards Box" })
  ]);

  mount(
    gameTopbar("Blank Slate", goHome),
    el("div", { className: "panel center", style: "max-width:440px; margin:0 auto;" }, [
      el("div", { style: "width:64px; height:64px; margin:0 auto 12px; color:var(--sunset-soft);" }, [icons.slate()]),
      el("h2", { text: "Blank Slate" }),
      el("p", { className: "muted", text: "Match exactly one player to score a whopping 3 points! If you match more, score 1 point. Go unique for 0 points. Cozy and unhinged!", style: "font-size:0.9rem; line-height:1.4; margin-bottom:20px;" }),
      modeSelector,
      dynamicFormWrap,
      shuffleDeckBoxBtn
    ])
  );
}

/* ── Room connection mechanics ──────────────────────────────────────────────── */
function connectRoom(type, code = "") {
  mount(
    gameTopbar("Connecting", () => { resetAll(); renderSetup(); }),
    el("div", { className: "panel center", style: "margin:30px auto; max-width:320px;" }, [
      el("div", { className: "spin-indicator", style: "font-size:2rem; margin-bottom:12px;", text: "🌀" }),
      el("p", { text: type === "create" ? "Creating room…" : `Joining ${code}…` })
    ])
  );

  const url = type === "create"
    ? `${WS_BASE}/ws/create?name=${encodeURIComponent(myName)}&game=blank_slate`
    : `${WS_BASE}/ws/join?code=${code}&name=${encodeURIComponent(myName)}&game=blank_slate`;

  isHost = (type === "create");
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
        // If server stored a different name (e.g. "Guest" for empty-name join), sync myName
        if (!isHost && d.type === "player_joined" && d.name && !d.players.includes(myName)) {
          myName = d.name;
          localStorage.setItem("lakehouse.playerName", myName);
        }
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
      console.error("[Blank Slate] Parse error:", e);
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
        game: "blank_slate", private: false,
        lastPing: Date.now()
      }),
    });
  } catch (_) {}
}

function applyLobby(players) {
  gState = { phase: "lobby", players };
  myPlayerIdx = players.indexOf(myName);
  if (isHost && roomCode) {
    registerRoom();
    startHeartbeat(players.length);
  }
  renderLobby();
}

function renderLobby() {
  const playerList = el("div", { style: "display:flex; flex-direction:column; gap:8px; margin: 18px 0; text-align:left; width:100%;" });
  gState.players.forEach(p => {
    playerList.appendChild(
      el("div", {
        style: "background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:10px 14px; font-weight:600; display:flex; justify-content:space-between; align-items:center;"
      }, [
        el("span", { text: p }),
        p === myName ? el("span", { className: "muted", text: "You", style: "font-size:0.8rem;" }) : null
      ])
    );
  });

  const startBtn = el("button", {
    className: "btn",
    text: "Start Game 🎮",
    style: "width:100%; margin-top:20px;",
    onClick: () => {
      if (gState.players.length < 3) {
        toast("Need at least 3 players to start!");
        return;
      }
      const pDeck = getPersistentBlankSlateDeck();
      const action = {
        type: "BLANK_SLATE_START",
        players: gState.players,
        prompts: pDeck.deck,
        promptIndex: pDeck.pos
      };
      relay(action);
    }
  });

  const waitingMsg = el("p", { className: "muted center", text: "Waiting for host to start game…", style: "margin-top:24px;" });

  mount(
    gameTopbar(`Room: ${roomCode}`, () => { resetAll(); renderSetup(); }),
    el("div", { className: "panel center", style: "max-width:440px; margin:0 auto;" }, [
      el("h3", { text: "Blank Slate Lobby" }),
      el("p", { className: "muted", text: "Ready to match slates? Bring in 3+ players online!" }),
      playerList,
      isHost ? startBtn : waitingMsg
    ])
  );
}

/* ── Relayed events synchronization ────────────────────────────────────────── */
function handleRelay(action, sender) {
  if (action.type === "BLANK_SLATE_START") {
    isOnline = true;
    gState = {
      phase: "select",
      players: action.players.map(p => ({ name: p, score: 0 })),
      prompts: action.prompts,
      promptIndex: action.promptIndex,
      selectorIdx: 0,
      activePrompt: "",
      answers: {},
      submittedCount: 0
    };
    renderPromptScreen();
  }

  else if (action.type === "BLANK_SLATE_CHOSEN_PROMPT") {
    gState.phase = "cue";
    gState.activePrompt = action.prompt;
    gState.answers = {};
    gState.submittedCount = 0;
    renderPromptScreen();
  }

  else if (action.type === "BLANK_SLATE_SUBMIT_WORD") {
    gState.answers[action.player] = action.answer;
    gState.submittedCount = Object.keys(gState.answers).length;

    // Update screen counter if waiting
    const countEl = document.getElementById("bs-submit-count");
    if (countEl) countEl.textContent = `${gState.submittedCount} / ${gState.players.length} answered`;

    if (isHost) {
      const allIn = gState.players.every(p => gState.answers[p.name]);
      if (allIn) {
        const points = calculatePoints(gState.answers);
        const updatedPlayers = gState.players.map(p => ({
          name: p.name,
          score: p.score + (points[p.name] || 0)
        }));

        const revealAction = {
          type: "BLANK_SLATE_REVEAL",
          answers: gState.answers,
          pointsAwarded: points,
          players: updatedPlayers
        };
        relay(revealAction);
      }
    }
  }

  else if (action.type === "BLANK_SLATE_REVEAL") {
    gState.phase = "reveal";
    gState.answers = action.answers;
    gState.pointsAwarded = action.pointsAwarded;
    gState.players = action.players;
    renderRevealScreen();
  }

  else if (action.type === "BLANK_SLATE_NEXT_ROUND") {
    gState.phase = "select";
    gState.promptIndex = action.promptIndex;
    gState.selectorIdx = action.selectorIdx;
    gState.activePrompt = "";
    gState.answers = {};
    gState.submittedCount = 0;
    renderPromptScreen();
  }
}

/* ── Core scoring algorithm ─────────────────────────────────────────────────── */
function calculatePoints(answersMap) {
  const counts = {};
  Object.values(answersMap).forEach(ans => {
    const clean = ans.trim().toUpperCase();
    counts[clean] = (counts[clean] || 0) + 1;
  });

  const pointsAwarded = {};
  Object.entries(answersMap).forEach(([player, ans]) => {
    const clean = ans.trim().toUpperCase();
    const freq = counts[clean] || 0;
    if (freq === 2) {
      pointsAwarded[player] = 3;
    } else if (freq > 2) {
      pointsAwarded[player] = 1;
    } else {
      pointsAwarded[player] = 0;
    }
  });
  return pointsAwarded;
}

/* ── Local Pass & Play entry point ────────────────────────────────────────── */
function initGame(playerNames) {
  const pDeck = getPersistentBlankSlateDeck();
  gState = {
    phase: "select",
    players: playerNames.map(p => ({ name: p, score: 0 })),
    prompts: pDeck.deck,
    promptIndex: pDeck.pos,
    activePrompt: "",
    selectorIdx: 0,
    answers: {},
    localInputIdx: 0
  };
  renderPromptScreen();
}

/* ── Display Phrase Prompt Screen ────────────────────────────────────────────── */
function renderPromptScreen() {
  if (gState.phase === "select") {
    if (isOnline) {
      renderOnlinePromptSelection();
    } else {
      renderLocalPromptSelection();
    }
  } else {
    if (isOnline) {
      renderOnlineInput();
    } else {
      renderLocalPromptStep();
    }
  }
}

/* ── ONLINE PROMPT SELECTION VIEW ───────────────────────────────────────────── */
function renderOnlinePromptSelection() {
  const selectorName = gState.players[gState.selectorIdx].name;
  const isSelector = (gState.selectorIdx === myPlayerIdx);

  const choiceA = gState.prompts[gState.promptIndex];
  const choiceB = gState.prompts[(gState.promptIndex + 1) % gState.prompts.length];

  const selectPrompt = (chosen) => {
    const choiceAction = {
      type: "BLANK_SLATE_CHOSEN_PROMPT",
      prompt: chosen
    };
    relay(choiceAction);
  };

  if (isSelector) {
    mount(
      gameTopbar(`Round ${gState.promptIndex / 2 + 1} Selection`, () => { resetAll(); renderSetup(); }),
      el("div", { className: "panel center", style: "max-width:440px; margin:0 auto;" }, [
        el("p", { className: "muted", text: "You are the Selector! Choose a prompt card to play:" }),
        el("div", { style: "display:flex; flex-direction:column; gap:16px; margin:24px 0 10px; width:100%;" }, [
          el("button", {
            className: "btn",
            text: choiceA,
            style: "width:100%; font-size:1.2rem; padding:16px; font-weight:800; background:linear-gradient(135deg, hsl(200,80%,55%), hsl(200,70%,38%));",
            onClick: () => selectPrompt(choiceA)
          }),
          el("button", {
            className: "btn",
            text: choiceB,
            style: "width:100%; font-size:1.2rem; padding:16px; font-weight:800; background:linear-gradient(135deg, hsl(120,52%,48%), hsl(120,45%,32%));",
            onClick: () => selectPrompt(choiceB)
          })
        ])
      ])
    );
  } else {
    mount(
      gameTopbar("Prompt Selection", () => { resetAll(); renderSetup(); }),
      el("div", { className: "panel center", style: "max-width:440px; margin:0 auto;" }, [
        el("div", { className: "spin-indicator", style: "font-size:2rem; margin-bottom:12px;", text: "🃏" }),
        el("h3", { text: `${selectorName} is choosing a card…` }),
        el("p", { className: "muted", text: "Get ready to write down your matching words!", style: "font-size:0.9rem;" })
      ])
    );
  }
}

/* ── LOCAL PROMPT SELECTION VIEW ────────────────────────────────────────────── */
function renderLocalPromptSelection() {
  const selector = gState.players[gState.selectorIdx];
  const choiceA = gState.prompts[gState.promptIndex];
  const choiceB = gState.prompts[(gState.promptIndex + 1) % gState.prompts.length];

  // Screen 1: Handoff
  const goBtn = el("button", {
    className: "btn",
    text: `I am ${selector.name} ➡️`,
    style: "width:100%;",
    onClick: () => {
      // Screen 2: Choices
      mount(
        gameTopbar(`Card Choice: ${selector.name}`, () => { resetAll(); renderSetup(); }),
        el("div", { className: "panel center", style: "max-width:440px; margin:0 auto;" }, [
          el("p", { className: "muted", text: `${selector.name}, secretly choose one of the two card prompts below:` }),
          el("div", { style: "display:flex; flex-direction:column; gap:16px; margin:24px 0 10px; width:100%;" }, [
            el("button", {
              className: "btn",
              text: choiceA,
              style: "width:100%; font-size:1.2rem; padding:16px; font-weight:800; background:linear-gradient(135deg, hsl(200,80%,55%), hsl(200,70%,38%));",
              onClick: () => {
                gState.phase = "cue";
                gState.activePrompt = choiceA;
                gState.answers = {};
                gState.localInputIdx = 0;
                renderPromptScreen();
              }
            }),
            el("button", {
              className: "btn",
              text: choiceB,
              style: "width:100%; font-size:1.2rem; padding:16px; font-weight:800; background:linear-gradient(135deg, hsl(120,52%,48%), hsl(120,45%,32%));",
              onClick: () => {
                gState.phase = "cue";
                gState.activePrompt = choiceB;
                gState.answers = {};
                gState.localInputIdx = 0;
                renderPromptScreen();
              }
            })
          ])
        ])
      );
    }
  });

  mount(
    gameTopbar(`Round ${gState.promptIndex / 2 + 1} Card Selection`, () => { resetAll(); renderSetup(); }),
    el("div", { className: "panel center", style: "max-width:440px; margin:0 auto; padding:40px 20px;" }, [
      el("p", { className: "muted", text: "Pass the device to Selector:" }),
      el("h2", { text: selector.name, style: "font-size:2.5rem; margin:16px 0; color:var(--sunset-soft);" }),
      el("p", { className: "muted", text: "They will choose the round prompt secretly!", style: "margin-bottom:24px; font-size:0.85rem;" }),
      goBtn
    ])
  );
}

// Online Player Prompt input
function renderOnlineInput() {
  const hasAnswered = !!gState.answers[myName];
  if (hasAnswered) {
    mount(
      gameTopbar("Blank Slate", () => { resetAll(); renderSetup(); }),
      el("div", { className: "panel center", style: "max-width:440px; margin:0 auto;" }, [
        el("h3", { text: gState.activePrompt, style: "font-size:2rem; letter-spacing:1px; margin:20px 0; color:var(--sunset-soft);" }),
        el("div", { className: "spin-indicator", style: "font-size:2rem; margin-bottom:12px;", text: "✍️" }),
        el("p", { text: "Slate submitted! Waiting for other players…" }),
        el("div", {
          id: "bs-submit-count",
          text: `${gState.submittedCount} / ${gState.players.length} answered`,
          style: "font-size:1.1rem; font-weight:bold; color:var(--water-foam); margin-top:16px;"
        })
      ])
    );
    return;
  }

  const wordInput = el("input", {
    type: "text",
    placeholder: "Single word…",
    id: "bs-word-input",
    style: "font-size:1.2rem; border-radius:12px; text-align:center; padding:12px; margin-bottom:14px; width:100%;"
  });

  const submitBtn = el("button", {
    className: "btn",
    text: "Submit My Slate",
    style: "width:100%;",
    onClick: () => {
      const val = wordInput.value.trim().toUpperCase();
      if (!val) { toast("Write a word!"); return; }
      if (val.split(/\s+/).length > 1) {
        toast("Must be a single word!");
        return;
      }
      relay({
        type: "BLANK_SLATE_SUBMIT_WORD",
        player: myName,
        answer: val
      });
      gState.answers[myName] = val;
      renderOnlineInput();
    }
  });

  mount(
    gameTopbar(`Round ${gState.promptIndex / 2 + 1}`, () => { resetAll(); renderSetup(); }),
    el("div", { className: "panel center", style: "max-width:440px; margin:0 auto;" }, [
      el("p", { className: "muted", text: "Fill in the blank secretly with a single word:" }),
      el("h3", { text: gState.activePrompt, style: "font-size:2rem; letter-spacing:1px; margin:20px 0; color:var(--sunset-soft);" }),
      wordInput,
      submitBtn
    ])
  );
}

// Local Pass & Play secret inputs coordination
function renderLocalPromptStep() {
  const currentPlayer = gState.players[gState.localInputIdx];

  const goBtn = el("button", {
    className: "btn",
    text: `I am ${currentPlayer.name} ➡️`,
    style: "width:100%;",
    onClick: () => {
      renderLocalInputScreen(currentPlayer);
    }
  });

  mount(
    gameTopbar(`Round ${gState.promptIndex / 2 + 1}`, () => { resetAll(); renderSetup(); }),
    el("div", { className: "panel center", style: "max-width:440px; margin:0 auto; padding:40px 20px;" }, [
      el("p", { className: "muted", text: "Pass the device to:" }),
      el("h2", { text: currentPlayer.name, style: "font-size:2.5rem; margin:16px 0; color:var(--sunset-soft);" }),
      el("p", { className: "muted", text: "Keep the screen hidden from everyone else!", style: "margin-bottom:24px; font-size:0.85rem;" }),
      goBtn
    ])
  );
}

// Local Pass & Play actual typing screen
function renderLocalInputScreen(player) {
  const wordInput = el("input", {
    type: "password",
    placeholder: "Type secret word…",
    style: "font-size:1.2rem; border-radius:12px; text-align:center; padding:12px; margin-bottom:14px; width:100%;"
  });

  const toggleVisibility = el("button", {
    className: "btn ghost small",
    text: "Show Word 👁️",
    style: "margin:0 0 16px; padding:6px 12px; font-size:0.8rem; width:auto;",
    onClick: () => {
      if (wordInput.type === "password") {
        wordInput.type = "text";
        toggleVisibility.textContent = "Hide Word 🙈";
      } else {
        wordInput.type = "password";
        toggleVisibility.textContent = "Show Word 👁️";
      }
    }
  });

  const submitBtn = el("button", {
    className: "btn",
    text: "Save Secret Slate",
    style: "width:100%;",
    onClick: () => {
      const val = wordInput.value.trim().toUpperCase();
      if (!val) { toast("Write a word first!"); return; }
      if (val.split(/\s+/).length > 1) {
        toast("Must be a single word!");
        return;
      }
      gState.answers[player.name] = val;

      if (gState.localInputIdx < gState.players.length - 1) {
        gState.localInputIdx++;
        renderPromptScreen();
      } else {
        const points = calculatePoints(gState.answers);
        gState.pointsAwarded = points;
        gState.players = gState.players.map(p => ({
          name: p.name,
          score: p.score + (points[p.name] || 0)
        }));
        gState.phase = "reveal";
        renderRevealScreen();
      }
    }
  });

  mount(
    gameTopbar(`Secret Input: ${player.name}`, () => { resetAll(); renderSetup(); }),
    el("div", { className: "panel center", style: "max-width:440px; margin:0 auto;" }, [
      el("p", { className: "muted", text: `${player.name}, complete this phrase secretly:` }),
      el("h3", { text: gState.activePrompt, style: "font-size:1.8rem; letter-spacing:1px; margin:20px 0; color:var(--sunset-soft);" }),
      wordInput,
      toggleVisibility,
      el("br"),
      submitBtn
    ])
  );
}

/* ── Reveal & Scoreboard Phase ──────────────────────────────────────────────── */
function renderRevealScreen() {
  const ranked = gState.players.map(p => p).sort((a, b) => b.score - a.score);
  const isWinnerFound = ranked.some(p => p.score >= 25);

  const slatesList = el("div", { style: "display:flex; flex-direction:column; gap:10px; margin:20px 0; width:100%;" });
  
  const wordGroups = {};
  Object.entries(gState.answers).forEach(([name, ans]) => {
    const clean = ans.trim().toUpperCase();
    if (!wordGroups[clean]) wordGroups[clean] = [];
    wordGroups[clean].push(name);
  });

  Object.entries(wordGroups).forEach(([word, players]) => {
    const numMatches = players.length;
    let pointsBadge = "";
    let borderStyle = "border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02);";

    if (numMatches === 2) {
      pointsBadge = "⭐ +3 pts (Perfect Pair)";
      borderStyle = "border: 1.5px solid var(--sunset-soft); background: rgba(230,106,54,0.07);";
    } else if (numMatches > 2) {
      pointsBadge = "🤝 +1 pt (Multi Match)";
      borderStyle = "border: 1px solid rgba(68,165,180,0.4); background: rgba(68,165,180,0.05);";
    } else {
      pointsBadge = "❌ +0 pts (Unique)";
    }

    const row = el("div", {
      style: `border-radius:14px; padding:12px 16px; text-align:left; transition: transform 0.15s; ${borderStyle}`
    }, [
      el("div", { style: "display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;" }, [
        el("span", { text: word, style: "font-size:1.25rem; font-weight:800; color:var(--cream); letter-spacing:1px;" }),
        el("span", { text: pointsBadge, style: "font-size:0.75rem; font-weight:bold; color:var(--sunset-soft);" })
      ]),
      el("div", { text: `Written by: ${players.join(", ")}`, className: "muted", style: "font-size:0.85rem;" })
    ]);
    slatesList.appendChild(row);
  });

  const nextBtn = el("button", {
    className: "btn",
    text: "Next Round ➡️",
    style: "width:100%; margin-top:20px;",
    onClick: () => {
      if (isWinnerFound) {
        renderGameOverScreen(ranked);
        return;
      }

      if (isOnline) {
        if (isHost) {
          const pDeck = advancePersistentBlankSlateDeck();
          const action = {
            type: "BLANK_SLATE_NEXT_ROUND",
            promptIndex: pDeck.pos,
            selectorIdx: (gState.selectorIdx + 1) % gState.players.length
          };
          relay(action);
        }
      } else {
        const pDeck = advancePersistentBlankSlateDeck();
        gState.phase = "select";
        gState.prompts = pDeck.deck;
        gState.promptIndex = pDeck.pos;
        gState.selectorIdx = (gState.selectorIdx + 1) % gState.players.length;
        gState.activePrompt = "";
        gState.answers = {};
        gState.localInputIdx = 0;
        renderPromptScreen();
      }
    }
  });

  const lobbyLeaderboard = el("div", { className: "scoreboard", style: "margin-top:28px; width:100%;" });
  ranked.forEach((p, idx) => {
    const medal = idx === 0 ? "👑" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "👤";
    lobbyLeaderboard.appendChild(
      el("div", {
        style: "display:flex; justify-content:space-between; align-items:center; padding:10px 14px; border-bottom:1px solid rgba(255,255,255,0.04); font-weight:600;"
      }, [
        el("span", { text: `${medal} ${p.name}` }),
        el("span", { text: `${p.score} pts`, style: "color:var(--sunset-soft);" })
      ])
    );
  });

  mount(
    gameTopbar(`Phrase: ${gState.activePrompt}`, () => { resetAll(); renderSetup(); }),
    el("div", { className: "panel center", style: "max-width:440px; margin:0 auto;" }, [
      el("h3", { text: "Slates Revealed!", style: "margin-bottom:4px;" }),
      el("p", { className: "muted", text: "Here is how everyone answered:", style: "font-size:0.85rem;" }),
      slatesList,
      (!isOnline || isHost || isWinnerFound) ? nextBtn : el("p", { className: "muted center", text: "Waiting for host to advance…", style: "margin-top:16px;" }),
      el("h4", { text: "Scoreboard", style: "margin-top:30px; text-align:left; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:6px;" }),
      lobbyLeaderboard
    ])
  );
}

/* ── Game Over layout ──────────────────────────────────────────────────────── */
function renderGameOverScreen(ranked) {
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

  const replayBtn = el("button", {
    className: "btn",
    text: "Play Again 🔄",
    style: "width:100%;",
    onClick: () => {
      if (isOnline) {
        if (isHost) {
          const pDeck = getPersistentBlankSlateDeck();
          const action = {
            type: "BLANK_SLATE_START",
            players: gState.players.map(p => p.name),
            prompts: pDeck.deck,
            promptIndex: pDeck.pos
          };
          relay(action);
        }
      } else {
        initGame(gState.players.map(p => p.name));
      }
    }
  });

  const waitingHost = el("p", { className: "muted center", text: "Waiting for host to play again…", style: "margin-top:16px;" });

  mount(
    gameTopbar("Game Over", () => { resetAll(); renderSetup(); }),
    el("div", { className: "panel center", style: "max-width:440px; margin:0 auto; padding:40px 20px;" }, [
      el("div", { style: "display: flex; align-items: center; justify-content: center; gap: 8px; margin: 0 auto 12px;" }, [
        el("div", { style: "width:64px; height:64px; color:var(--sunset-soft);" }, [icons.slate()]),
        el("span", { style: "font-size: 3rem;" }, "👑")
      ]),
      el("h2", { text: `${winner.name} wins!`, style: "color:var(--sunset-soft); margin-bottom:8px;" }),
      el("p", { className: "muted", text: `Crowned Blank Slate Champion with ${winner.score} points!`, style: "margin-bottom:24px;" }),
      (!isOnline || isHost) ? replayBtn : waitingHost,
      exitBtn
    ])
  );
}
