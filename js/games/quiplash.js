// Modular Quiplash game engine supporting Local Pass & Play and Online Multiplayer.
import { el, mount, toast, store, shuffle } from "../ui.js";
import { icons } from "../icons.js";

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
let gState = null;
let heartbeatInt = null;
let roomBrowserRefresh = null;

let isOnline = false;
let setupMode = "passplay"; // "passplay" or "online"
let localNames = ["Alice", "Bob", "Charlie"];

const PROMPTS = [
  "The worst thing to find floating in the lake",
  "A terrible name for a boat",
  "Something you shouldn't bring to a camping trip",
  "What mosquitoes discuss when they swarm you",
  "The most awkward thing to say while sharing a cozy tent",
  "A funny warning sign to install on the lake dock",
  "The real reason the cabin has no Wi-Fi",
  "The absolute worst flavor of toasted marshmallow",
  "A name for a fish that is definitely lying to you",
  "A terrible chore to be assigned at the lake house",
  "What the bear is thinking when it looks in your cabin window",
  "A cheesy pick-up line for a park ranger",
  "The best thing to use as a paddle when you lose yours",
  "Something you don't want to hear from your canoe partner",
  "The title of a horror movie set at a cozy lake cabin",
  "A ridiculous rule to add to cabin board games",
  "The worst excuse for why you didn't catch any fish",
  "What actually happens at 2 AM in the cabin loft",
  "A funny name for a squirrel gang",
  "The secret ingredient in the campfire stew",
  "Something you shouldn't wear to go swimming in the lake",
  "The worst thing to hear from the woods at night",
  "A warning label that should be on a can of bug spray",
  "A funny name for a lake monster",
  "The worst way to wake up someone in a sleeping bag",
  "A bad topic for a campfire ghost story",
  "What sunscreen smells like to a sunburned person",
  "The most useless item to bring on a wilderness hike",
  "A strange thing to find inside a hollow log",
  "The real reason they call it 'roughing it'"
];

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
  const savedName = localStorage.getItem("quiplash.name") || "";
  const nameInput = el("input", {
    type: "text",
    placeholder: "Your name…",
    value: savedName,
    id: "q-name",
    style: "font-size:1.1rem; border-radius:14px; text-align:center; margin-bottom:14px; width:100%;"
  });

  const codeInput = el("input", {
    type: "text",
    placeholder: "4-LETTER CODE",
    id: "q-code",
    maxLength: 4,
    style: "font-size:1.3rem; border-radius:14px; text-align:center; text-transform:uppercase; letter-spacing:6px; margin-bottom:10px; width:100%;"
  });
  codeInput.addEventListener("input", () => { codeInput.value = codeInput.value.toUpperCase(); });

  const getName = () => {
    const n = nameInput.value.trim();
    if (!n) { toast("Enter your name first!"); return null; }
    localStorage.setItem("quiplash.name", n);
    return n;
  };

  // Pass & Play Names List
  const savedNames = store.get("quiplash.localNames", ["", "", ""]);
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
          store.set("quiplash.localNames", localNames);
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
              store.set("quiplash.localNames", localNames);
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
        store.set("quiplash.localNames", localNames);
        drawLocalList();
      } else {
        toast("Max 8 players for local play.");
      }
    }
  });

  const startLocalBtn = el("button", {
    className: "btn",
    text: "Start Local Quiplash",
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
          el("li", { text: "Secret Prompts: Each player is secretly given funny fill-in-the-blank prompts to answer on their device." }),
          el("li", { text: "Matchup Battles: Wacky prompts are displayed alongside two players' anonymized answers." }),
          el("li", { text: "Anonymous Voting: Everyone else votes secretly on their favorite response." }),
          el("li", { text: "Points & Quiplashes: Points are scored based on vote percentages. Get 100% of the votes for a grand QUIPLASH!" })
        ])
      ]);
      showRulesBtn.parentNode.insertBefore(rPanel, showRulesBtn.nextSibling);
    }
  });
  mount(
    gameTopbar("Quiplash Setup", () => { resetAll(); goHome(); }),
    el("div", { className: "panel center", style: "max-width: 440px; margin: 0 auto;" }, [
      el("div", { style: "width:64px; height:64px; margin:0 auto 12px; color:var(--sunset-soft);" }, [icons.meeting()]),
      el("h2", { text: "Quiplash", style: "margin-bottom: 4px;" }),
      el("p", { className: "muted", style: "margin-bottom:12px;", text: "Write hilarious answers to wacky prompts, then vote anonymously on the funniest combinations!" }),
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
      const res = await fetch(`${HTTP_BASE}/rooms/list?game=quiplash`).then(r => r.json());
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
    gameTopbar("Open Quiplash Rooms", () => { clearInterval(roomBrowserRefresh); renderSetup(); }),
    el("div", { className: "panel center" }, [
      el("p", { className: "muted", style: "margin:0; font-size:0.82rem;", text: "Tap Join to enter any open Quiplash lobby." })
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
    ? `${WS_BASE}/ws/create?name=${encodeURIComponent(myName)}&game=quiplash`
    : `${WS_BASE}/ws/join?code=${code}&name=${encodeURIComponent(myName)}&game=quiplash`;

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
      console.error("[Quiplash] Parse error:", e);
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
        game: "quiplash", private: false,
        lastPing: Date.now()
      }),
    });
  } catch (_) {}
}

function applyLobby(players) {
  gState = { phase: "lobby", players };
  if (isHost && roomCode) {
    registerRoom();
    startHeartbeat(players.length);
  }
  renderLobby();
}

function renderLobby() {
  const players = gState.players;
  const list = el("div", { className: "scoreboard", style: "margin: 16px 0;" });
  
  players.forEach((p, i) => {
    list.appendChild(el("div", {
      className: "score-row",
      style: "display:flex; justify-content:space-between; padding:8px 12px; background:rgba(255,255,255,0.02); border-radius:10px; margin-bottom:8px;"
    }, [
      el("span", { text: `${i + 1}. ${p}${p === myName ? " (You)" : ""}`, style: "font-weight: 500;" }),
      i === 0 
        ? el("span", { className: "badge", text: "HOST", style: "background:rgba(255,145,100,0.1); color:var(--sunset-soft);" })
        : el("span", { className: "badge", text: "READY", style: "background:rgba(0,250,150,0.1); color:#00ffaa;" })
    ]));
  });

  const startBtn = isHost
    ? el("button", {
        className: "btn",
        text: "Start Quiplash",
        style: "width:100%;",
        onClick: () => {
          if (players.length < 3) {
            toast("Need at least 3 players to start Quiplash!");
            return;
          }
          triggerOnlineGameStart();
        }
      })
    : el("div", { className: "muted center", text: "Waiting for host to start..." });

  mount(
    gameTopbar(`Room Code: ${roomCode}`, () => confirmQuitOnline()),
    el("div", { className: "panel center", style: "max-width: 480px; margin: 0 auto;" }, [
      el("h2", { text: "Quiplash Lobby" }),
      el("p", { className: "muted", text: "Gather 3 to 8 players online. Submit wacky answers and vote simultaneously on your screens!" }),
      list,
      el("div", { className: "spacer" }),
      startBtn
    ])
  );
}

function confirmQuitOnline() {
  if (confirm(isOnline ? "Disconnect and quit Quiplash?" : "Quit Quiplash?")) {
    resetAll();
    renderSetup();
  }
}

// ── Quiplash Game Play Coordination ───────────────────────────────────────────
function initGame(players) {
  const shuffledPrompts = shuffle(PROMPTS);
  const scores = {};
  players.forEach(p => { scores[p] = 0; });

  gState = {
    phase: "writing",
    players,
    scores,
    promptsPool: shuffledPrompts,
    round: 1,
    writingQueue: [],
    votingQueue: [],
    submittedAnswers: {}, // key: player -> answers map
    localWritingIdx: 0,
    currentVoteIdx: 0,
    activeVotes: {}, // voter -> option (1 or 2)
    submittedVotesCount: 0
  };

  if (isOnline) {
    // Handled by triggerOnlineGameStart / handleRelay
  } else {
    startRoundWriting();
  }
}

function triggerOnlineGameStart() {
  const scores = {};
  gState.players.forEach(p => { scores[p] = 0; });

  const shuffledPrompts = shuffle(PROMPTS);

  const N = gState.players.length;
  const roundPrompts = [];
  for (let i = 0; i < N; i++) {
    roundPrompts.push(shuffledPrompts.pop());
  }

  // Construct writing queue assignments
  const writingQueue = [];
  for (let i = 0; i < N; i++) {
    const p1 = gState.players[i];
    const p2 = gState.players[(i + 1) % N];
    const promptText = roundPrompts[i];

    writingQueue.push({ player: p1, promptIdx: i, promptText, answer: "" });
    writingQueue.push({ player: p2, promptIdx: i, promptText, answer: "" });
  }

  const startPayload = {
    type: "QUIPLASH_START",
    scores,
    promptsPool: shuffledPrompts,
    writingQueue,
    round: 1
  };

  relay(startPayload);
  handleRelay(startPayload, myName);
}

function handleRelay(action, sender) {
  if (action.type === "QUIPLASH_START") {
    gState = {
      phase: "writing",
      players: gState.players,
      scores: action.scores,
      promptsPool: action.promptsPool,
      round: action.round,
      writingQueue: action.writingQueue,
      submittedAnswersCount: 0,
      myTasks: action.writingQueue.filter(t => t.player === myName),
      localWritingIdx: 0
    };
    renderWritingPhase();
  } 
  
  else if (action.type === "QUIPLASH_SUBMIT_WORD") {
    const task = gState.writingQueue.find(t => t.player === action.player && t.promptIdx === action.promptIdx);
    if (task) {
      task.answer = action.answer;
    }
    gState.submittedAnswersCount = gState.writingQueue.filter(t => t.answer).length;

    const waitingEl = document.getElementById("quip-waiting");
    if (waitingEl) {
      waitingEl.textContent = `Submitted: ${gState.submittedAnswersCount} / ${gState.writingQueue.length} answers`;
    }

    if (isHost) {
      const allAnswersIn = gState.writingQueue.every(t => t.answer);
      if (allAnswersIn) {
        // Compile standard voting queue!
        const N = gState.players.length;
        const votingQueue = [];
        for (let i = 0; i < N; i++) {
          const tasks = gState.writingQueue.filter(t => t.promptIdx === i);
          if (tasks.length === 2) {
            votingQueue.push({
              promptIdx: i,
              promptText: tasks[0].promptText,
              p1: tasks[0].player,
              p2: tasks[1].player,
              ans1: tasks[0].answer,
              ans2: tasks[1].answer,
              votes: {}
            });
          }
        }

        const votePayload = {
          type: "QUIPLASH_START_VOTING",
          votingQueue: shuffle(votingQueue)
        };
        relay(votePayload);
        handleRelay(votePayload, myName);
      }
    }
  }

  else if (action.type === "QUIPLASH_START_VOTING") {
    gState.phase = "voting";
    gState.votingQueue = action.votingQueue;
    gState.currentVoteIdx = 0;
    gState.activeVotes = {};
    gState.submittedVotesCount = 0;
    renderVotingRound();
  }

  else if (action.type === "QUIPLASH_CAST_VOTE") {
    const voteItem = gState.votingQueue[gState.currentVoteIdx];
    voteItem.votes[action.voter] = action.option; // 1 or 2
    gState.submittedVotesCount = Object.keys(voteItem.votes).length;

    const eligibleVoters = gState.players.filter(p => p !== voteItem.p1 && p !== voteItem.p2);
    const progressEl = document.getElementById("quip-vote-waiting");
    if (progressEl) {
      progressEl.textContent = `Submitted: ${gState.submittedVotesCount} / ${eligibleVoters.length} votes`;
    }

    if (isHost) {
      const allVotesIn = eligibleVoters.every(vName => voteItem.votes[vName] != null);
      if (allVotesIn) {
        let count1 = 0, count2 = 0;
        eligibleVoters.forEach(vName => {
          if (voteItem.votes[vName] === 1) count1++;
          if (voteItem.votes[vName] === 2) count2++;
        });

        const multiplier = gState.round === 2 ? 200 : 100;
        const pts1 = count1 * multiplier;
        const pts2 = count2 * multiplier;

        let q1 = (count1 > 0 && count2 === 0);
        let q2 = (count2 > 0 && count1 === 0);

        const revealPayload = {
          type: "QUIPLASH_REVEAL_VOTE",
          count1, count2, pts1, pts2, q1, q2
        };
        relay(revealPayload);
        handleRelay(revealPayload, myName);
      }
    }
  }

  else if (action.type === "QUIPLASH_REVEAL_VOTE") {
    gState.phase = "reveal";
    gState.scores[gState.votingQueue[gState.currentVoteIdx].p1] += action.pts1 + (action.q1 ? 150 : 0);
    gState.scores[gState.votingQueue[gState.currentVoteIdx].p2] += action.pts2 + (action.q2 ? 150 : 0);
    renderSynchedRevealScreen(action);
  }

  else if (action.type === "QUIPLASH_NEXT_VOTE") {
    gState.currentVoteIdx = action.nextIdx;
    gState.submittedVotesCount = 0;
    renderVotingRound();
  }

  else if (action.type === "QUIPLASH_LEADERBOARD") {
    gState.phase = "leaderboard";
    renderLeaderboardScreen();
  }

  else if (action.type === "QUIPLASH_LAST_LASH") {
    gState.phase = "lastlash";
    gState.votingQueue = action.votingQueue;
    gState.activeVotes = {};
    gState.submittedVotesCount = 0;
    renderLastLashVoteScreen();
  }

  else if (action.type === "QUIPLASH_CAST_LAST_LASH") {
    const voteItem = gState.votingQueue[0];
    voteItem.votes[action.voter] = action.ansIdx;
    gState.submittedVotesCount = Object.keys(voteItem.votes).length;

    const progressEl = document.getElementById("quip-vote-waiting");
    if (progressEl) {
      progressEl.textContent = `Submitted: ${gState.submittedVotesCount} / ${gState.players.length} votes`;
    }

    if (isHost) {
      const allVotesIn = gState.players.every(p => voteItem.votes[p] != null);
      if (allVotesIn) {
        const tallies = voteItem.answers.map(() => 0);
        gState.players.forEach(p => {
          tallies[voteItem.votes[p]]++;
        });

        // Award 300 points per vote
        voteItem.answers.forEach((ansObj, aIdx) => {
          const votes = tallies[aIdx];
          const pts = votes * 300;
          gState.scores[ansObj.player] += pts;
          ansObj.votes = votes;
          ansObj.pointsEarned = pts;
        });

        const lastReveal = {
          type: "QUIPLASH_LAST_REVEAL",
          answers: voteItem.answers
        };
        relay(lastReveal);
        handleRelay(lastReveal, myName);
      }
    }
  }

  else if (action.type === "QUIPLASH_LAST_REVEAL") {
    gState.phase = "lastreveal";
    gState.votingQueue[0].answers = action.answers;
    renderLastRevealScreen();
  }
}

// ── Synced Writing Phase ──────────────────────────────────────────────────────
function startRoundWriting() {
  gState.writingQueue = [];
  gState.votingQueue = [];

  const N = gState.players.length;
  if (gState.round < 3) {
    const roundPrompts = [];
    for (let i = 0; i < N; i++) {
      roundPrompts.push(gState.promptsPool.pop() || "A funny prompt.");
    }
    for (let i = 0; i < N; i++) {
      const p1 = gState.players[i];
      const p2 = gState.players[(i + 1) % N];
      const promptText = roundPrompts[i];

      gState.writingQueue.push({ player: p1, promptIdx: i, promptText, answer: "" });
      gState.writingQueue.push({ player: p2, promptIdx: i, promptText, answer: "" });
    }
  } else {
    const lastLashPrompt = gState.promptsPool.pop() || "The ultimate final prompt.";
    gState.players.forEach(p => {
      gState.writingQueue.push({ player: p, promptIdx: 0, promptText: lastLashPrompt, answer: "" });
    });
  }

  gState.writingQueue = shuffle(gState.writingQueue);
  gState.localWritingIdx = 0;
  
  if (isOnline) {
    // Done inside triggerOnlineGameStart
  } else {
    triggerLocalPassPlayWriting();
  }
}

function triggerLocalPassPlayWriting() {
  const nextTask = gState.writingQueue.find(t => !t.answer);
  if (!nextTask) {
    prepareVotingQueue();
    return;
  }

  mount(
    gameTopbar(`Quiplash — Round ${gState.round}`, () => confirmQuitLocal()),
    el("div", { className: "panel center", style: "max-width: 480px; margin: 30px auto; padding: 24px;" }, [
      el("h2", { text: `Pass the iPad!` }),
      el("p", { className: "muted", style: "font-size: 1.1rem; margin: 20px 0;", html: `Hand the device secretly to <strong style="color:var(--sunset-soft); font-size: 1.3rem;">${nextTask.player}</strong>.` }),
      el("button", {
        className: "btn",
        text: "I am ready to write",
        onClick: () => renderWritingInput(nextTask)
      })
    ])
  );
}

function confirmQuitLocal() {
  if (confirm("Quit Quiplash?")) {
    resetAll();
    renderSetup();
  }
}

function renderWritingPhase() {
  const tasks = isOnline ? gState.myTasks : [gState.writingQueue.find(t => !t.answer)];
  const currentTask = isOnline ? tasks[gState.localWritingIdx] : tasks[0];

  if (!currentTask) {
    // Waiting for other online players
    mount(
      gameTopbar("Mad Libs", () => confirmQuitOnline()),
      el("div", { className: "panel center", style: "max-width: 400px; margin: 30px auto;" }, [
        el("div", { className: "spin-indicator", style: "font-size:2rem; margin-bottom:12px;", text: "⏳" }),
        el("h3", { text: "Awaiting other players..." }),
        el("p", { className: "muted", text: "You have completed your tasks. Relax, voting starts soon!" }),
        el("div", { id: "quip-waiting", style: "font-size:0.9rem; font-weight:bold; color:var(--sunset-soft); margin-top:8px;", text: `Submitted: ${gState.submittedAnswersCount} / ${gState.writingQueue.length} answers` })
      ])
    );
    return;
  }

  renderWritingInput(currentTask);
}

function renderWritingInput(task) {
  const inputEl = el("input", {
    type: "text",
    placeholder: "Type your funny answer...",
    maxlength: "60",
    style: "font-size: 1.2rem; border-radius: 14px; text-align: center; margin: 16px 0; width: 100%;"
  });

  const submitBtn = el("button", {
    className: "btn",
    text: "Submit Answer",
    onClick: () => {
      const ans = inputEl.value.trim();
      if (!ans) { toast("Please write something funny!"); return; }
      
      submitBtn.disabled = true;
      inputEl.disabled = true;

      if (isOnline) {
        const action = {
          type: "QUIPLASH_SUBMIT_WORD",
          player: myName,
          promptIdx: task.promptIdx,
          answer: ans
        };
        relay(action);
        handleRelay(action, myName); // update locally
      } else {
        task.answer = ans;
        triggerLocalPassPlayWriting();
      }
    }
  });

  const layout = el("div", { className: "panel center", style: "max-width: 480px; margin: 0 auto;" }, [
    el("h3", { text: `${task.player}'s Secret Turn`, style: "color:var(--sunset-soft); font-size: 0.9rem;" }),
    el("div", { className: "spacer" }),
    el("blockquote", { text: `"${task.promptText}"`, style: "font-size: 1.4rem; font-weight: bold; border-left: none; padding: 0; line-height: 1.4; margin: 12px 0;" }),
    inputEl,
    el("div", { className: "spacer" }),
    submitBtn
  ]);

  mount(gameTopbar(`Quiplash — Round ${gState.round}`, () => isOnline ? confirmQuitOnline() : confirmQuitLocal()), layout);
  inputEl.focus();
}

// ── Synced Voting Phase ───────────────────────────────────────────────────────
function prepareVotingQueue() {
  const N = gState.players.length;
  if (gState.round < 3) {
    for (let i = 0; i < N; i++) {
      const tasks = gState.writingQueue.filter(t => t.promptIdx === i);
      if (tasks.length === 2) {
        gState.votingQueue.push({
          promptIdx: i,
          promptText: tasks[0].promptText,
          p1: tasks[0].player,
          p2: tasks[1].player,
          ans1: tasks[0].answer,
          ans2: tasks[1].answer,
          votes: {}
        });
      }
    }
  } else {
    const tasks = gState.writingQueue;
    gState.votingQueue = [{
      promptIdx: 0,
      promptText: tasks[0].promptText,
      answers: tasks.map(t => ({ player: t.player, answer: t.answer })),
      votes: {}
    }];
  }

  gState.votingQueue = shuffle(gState.votingQueue);
  gState.currentVoteIdx = 0;
  renderVotingRound();
}

function renderVotingRound() {
  const idx = gState.currentVoteIdx;
  if (idx >= gState.votingQueue.length) {
    renderLeaderboardScreen();
    return;
  }

  const voteItem = gState.votingQueue[idx];
  if (gState.round < 3) {
    renderStandardVoteScreen(voteItem);
  } else {
    renderLastLashVoteScreen(voteItem);
  }
}

function renderStandardVoteScreen(item) {
  const voters = gState.players.filter(p => p !== item.p1 && p !== item.p2);
  const userCanVote = voters.includes(isOnline ? myName : gState.players[0]);

  if (isOnline && !userCanVote) {
    // This player was one of the answers! They just have to wait.
    mount(
      gameTopbar("Quiplash — Voting", () => confirmQuitOnline()),
      el("div", { className: "panel center", style: "max-width: 440px; margin:30px auto;" }, [
        el("div", { className: "spin-indicator", style: "font-size:2rem; margin-bottom:12px;", text: "⏳" }),
        el("h3", { text: "Your Answer is Up!" }),
        el("p", { className: "muted", text: "You cannot vote on your own matchup! Relax while others decide." }),
        el("div", { id: "quip-vote-waiting", style: "font-size:0.9rem; font-weight:bold; color:var(--sunset-soft); margin-top:8px;", text: `Submitted: ${gState.submittedVotesCount} / ${voters.length} votes` })
      ])
    );
    return;
  }

  const activeVotes = {};
  if (isOnline) {
    activeVotes[myName] = null;
  } else {
    voters.forEach(v => { activeVotes[v] = null; });
  }

  const voterGrid = el("div", { style: "margin: 20px 0; display: flex; flex-direction: column; gap: 8px;" });

  function drawVoterGrid() {
    voterGrid.innerHTML = "";
    if (isOnline) {
      const voteVal = activeVotes[myName];
      voterGrid.appendChild(el("div", { style: "display:flex; justify-content:center; gap:12px; margin-top:12px;" }, [
        el("button", {
          className: voteVal === 1 ? "btn" : "btn ghost",
          text: "Vote Option A",
          style: "padding: 8px 24px; margin:0;",
          onClick: () => {
            activeVotes[myName] = 1;
            drawVoterGrid();
            submitOnlineVote(1);
          }
        }),
        el("button", {
          className: voteVal === 2 ? "btn" : "btn ghost",
          text: "Vote Option B",
          style: "padding: 8px 24px; margin:0;",
          onClick: () => {
            activeVotes[myName] = 2;
            drawVoterGrid();
            submitOnlineVote(2);
          }
        })
      ]));
    } else {
      voters.forEach(vName => {
        const voteVal = activeVotes[vName];
        voterGrid.appendChild(el("div", {
          style: "display: flex; justify-content: space-between; align-items: center; padding: 8px 16px; background: rgba(255,255,255,0.02); border-radius: 10px; border: 1px solid rgba(255,255,255,0.05);"
        }, [
          el("span", { text: vName, style: "font-weight: 500;" }),
          el("div", { style: "display: flex; gap: 8px;" }, [
            el("button", {
              className: voteVal === 1 ? "btn small" : "btn ghost small",
              text: "Left",
              style: "padding: 4px 14px; margin:0;",
              onClick: () => { activeVotes[vName] = 1; drawVoterGrid(); checkLocalSubmittable(); }
            }),
            el("button", {
              className: voteVal === 2 ? "btn small" : "btn ghost small",
              text: "Right",
              style: "padding: 4px 14px; margin:0;",
              onClick: () => { activeVotes[vName] = 2; drawVoterGrid(); checkLocalSubmittable(); }
            })
          ])
        ]));
      });
    }
  }

  function submitOnlineVote(opt) {
    const action = {
      type: "QUIPLASH_CAST_VOTE",
      voter: myName,
      option: opt
    };
    relay(action);
    handleRelay(action, myName);

    mount(
      gameTopbar("Quiplash — Voting", () => confirmQuitOnline()),
      el("div", { className: "panel center", style: "max-width: 440px; margin: 30px auto;" }, [
        el("div", { className: "spin-indicator", style: "font-size:2rem; margin-bottom:12px;", text: "⏳" }),
        el("h3", { text: "Vote Cast!" }),
        el("p", { className: "muted", text: "Waiting for other players to submit their votes..." }),
        el("div", { id: "quip-vote-waiting", style: "font-size:0.9rem; font-weight:bold; color:var(--sunset-soft); margin-top:8px;", text: `Submitted: ${gState.submittedVotesCount} / ${voters.length} votes` })
      ])
    );
  }

  const submitLocalBtn = el("button", {
    className: "btn",
    text: "Submit & Reveal",
    disabled: true,
    onClick: () => {
      let count1 = 0, count2 = 0;
      voters.forEach(v => {
        if (activeVotes[v] === 1) count1++;
        if (activeVotes[v] === 2) count2++;
      });

      const multiplier = gState.round === 2 ? 200 : 100;
      const pts1 = count1 * multiplier;
      const pts2 = count2 * multiplier;
      
      let q1 = (count1 > 0 && count2 === 0);
      let q2 = (count2 > 0 && count1 === 0);

      gState.scores[item.p1] += pts1 + (q1 ? 150 : 0);
      gState.scores[item.p2] += pts2 + (q2 ? 150 : 0);

      renderLocalStandardReveal(item, count1, count2, pts1, pts2, q1, q2);
    }
  });

  function checkLocalSubmittable() {
    const allVoted = voters.every(v => activeVotes[v] !== null);
    submitLocalBtn.disabled = !allVoted;
  }

  drawVoterGrid();

  const layout = el("div", { className: "panel center", style: "max-width: 600px; margin: 0 auto;" }, [
    el("blockquote", { text: `"${item.promptText}"`, style: "font-size: 1.4rem; font-weight: bold; padding: 0; border: none; margin-bottom: 24px;" }),
    el("div", { style: "display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;" }, [
      el("div", {
        className: "panel center",
        style: "background: rgba(255, 145, 100, 0.03); border: 1px solid rgba(255,145,100,0.1); border-radius: 12px; padding: 16px;"
      }, [
        el("div", { text: "Option A", style: "font-size: 0.75rem; text-transform: uppercase; color: var(--sunset-soft); margin-bottom: 8px;" }),
        el("div", { text: item.ans1, style: "font-size: 1.25rem; font-weight: bold;" })
      ]),
      el("div", {
        className: "panel center",
        style: "background: rgba(255, 145, 100, 0.03); border: 1px solid rgba(255,145,100,0.1); border-radius: 12px; padding: 16px;"
      }, [
        el("div", { text: "Option B", style: "font-size: 0.75rem; text-transform: uppercase; color: var(--sunset-soft); margin-bottom: 8px;" }),
        el("div", { text: item.ans2, style: "font-size: 1.25rem; font-weight: bold;" })
      ])
    ]),
    el("h4", { text: isOnline ? "Cast Your Vote" : "Cast Votes (all other players)", style: "font-size: 0.9rem; letter-spacing: 0.5px;" }),
    voterGrid,
    isOnline ? null : submitLocalBtn
  ]);

  mount(gameTopbar(`Quiplash — Voting`, () => isOnline ? confirmQuitOnline() : confirmQuitLocal()), layout);
}

function renderSynchedRevealScreen(action) {
  const item = gState.votingQueue[gState.currentVoteIdx];
  const count1 = action.count1;
  const count2 = action.count2;

  const nextBtn = isHost
    ? el("button", {
        className: "btn",
        text: gState.currentVoteIdx + 1 < gState.votingQueue.length ? "Next Prompt" : "Show Standings",
        onClick: () => {
          const nextIdx = gState.currentVoteIdx + 1;
          if (nextIdx < gState.votingQueue.length) {
            const nextPayload = {
              type: "QUIPLASH_NEXT_VOTE",
              nextIdx
            };
            relay(nextPayload);
            handleRelay(nextPayload, myName);
          } else {
            const endPayload = {
              type: "QUIPLASH_LEADERBOARD"
            };
            relay(endPayload);
            handleRelay(endPayload, myName);
          }
        }
      })
    : el("div", { className: "muted center", text: "Waiting for host to flip page..." });

  const layout = el("div", { className: "panel center", style: "max-width: 600px; margin: 0 auto; text-align: center;" }, [
    el("blockquote", { text: `"${item.promptText}"`, style: "font-size: 1.3rem; border: none; padding: 0; font-weight: bold; margin-bottom: 24px;" }),
    el("div", { style: "display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;" }, [
      el("div", {
        className: "panel center",
        style: `border: 2px solid ${count1 >= count2 ? "var(--sunset-soft)" : "rgba(255,255,255,0.05)"}; background: rgba(255,255,255,0.01); border-radius: 12px; padding: 16px;`
      }, [
        el("h3", { text: item.ans1, style: "font-size: 1.3rem; font-weight: bold; margin-top: 0;" }),
        el("div", { text: `By ${item.p1}`, style: "font-weight: 500; font-size: 0.9rem; color: var(--sunset-soft);" }),
        el("div", { text: `${count1} ${count1 === 1 ? 'vote' : 'votes'} (+${action.pts1} pts)`, style: "font-size: 0.85rem; margin-top: 4px; font-weight: bold;" }),
        action.q1 ? el("div", { text: "QUIPLASH BONUS (+150 pts)", style: "font-size: 0.7rem; font-weight: bold; color: #00ffaa; margin-top: 6px; letter-spacing: 0.5px;" }) : null
      ]),
      el("div", {
        className: "panel center",
        style: `border: 2px solid ${count2 >= count1 ? "var(--sunset-soft)" : "rgba(255,255,255,0.05)"}; background: rgba(255,255,255,0.01); border-radius: 12px; padding: 16px;`
      }, [
        el("h3", { text: item.ans2, style: "font-size: 1.3rem; font-weight: bold; margin-top: 0;" }),
        el("div", { text: `By ${item.p2}`, style: "font-weight: 500; font-size: 0.9rem; color: var(--sunset-soft);" }),
        el("div", { text: `${count2} ${count2 === 1 ? 'vote' : 'votes'} (+${action.pts2} pts)`, style: "font-size: 0.85rem; margin-top: 4px; font-weight: bold;" }),
        action.q2 ? el("div", { text: "QUIPLASH BONUS (+150 pts)", style: "font-size: 0.7rem; font-weight: bold; color: #00ffaa; margin-top: 6px; letter-spacing: 0.5px;" }) : null
      ])
    ]),
    nextBtn
  ]);

  mount(gameTopbar(`Quiplash — Reveal`, () => confirmQuitOnline()), layout);
}

function renderLocalStandardReveal(item, c1, c2, pts1, pts2, q1, q2) {
  const container = el("div", { className: "panel center", style: "max-width: 600px; margin: 0 auto; text-align: center;" }, [
    el("blockquote", { text: `"${item.promptText}"`, style: "font-size: 1.3rem; border: none; padding: 0; font-weight: bold; margin-bottom: 24px;" }),
    el("div", { style: "display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;" }, [
      el("div", {
        className: "panel center",
        style: `border: 2px solid ${c1 >= c2 ? "var(--sunset-soft)" : "rgba(255,255,255,0.05)"}; background: rgba(255,255,255,0.01); border-radius: 12px; padding: 16px;`
      }, [
        el("h3", { text: item.ans1, style: "font-size: 1.3rem; font-weight: bold; margin-top: 0;" }),
        el("div", { text: `By ${item.p1}`, style: "font-weight: 500; font-size: 0.9rem; color: var(--sunset-soft);" }),
        el("div", { text: `${c1} ${c1 === 1 ? 'vote' : 'votes'} (+${pts1} pts)`, style: "font-size: 0.85rem; margin-top: 4px; font-weight: bold;" }),
        q1 ? el("div", { text: "QUIPLASH BONUS (+150 pts)", style: "font-size: 0.7rem; font-weight: bold; color: #00ffaa; margin-top: 6px; letter-spacing: 0.5px;" }) : null
      ]),
      el("div", {
        className: "panel center",
        style: `border: 2px solid ${c2 >= c1 ? "var(--sunset-soft)" : "rgba(255,255,255,0.05)"}; background: rgba(255,255,255,0.01); border-radius: 12px; padding: 16px;`
      }, [
        el("h3", { text: item.ans2, style: "font-size: 1.3rem; font-weight: bold; margin-top: 0;" }),
        el("div", { text: `By ${item.p2}`, style: "font-weight: 500; font-size: 0.9rem; color: var(--sunset-soft);" }),
        el("div", { text: `${c2} ${c2 === 1 ? 'vote' : 'votes'} (+${pts2} pts)`, style: "font-size: 0.85rem; margin-top: 4px; font-weight: bold;" }),
        q2 ? el("div", { text: "QUIPLASH BONUS (+150 pts)", style: "font-size: 0.7rem; font-weight: bold; color: #00ffaa; margin-top: 6px; letter-spacing: 0.5px;" }) : null
      ])
    ]),
    el("button", {
      className: "btn",
      text: "Next Prompt",
      onClick: () => {
        gState.currentVoteIdx++;
        renderVotingRound();
      }
    })
  ]);

  mount(gameTopbar(`Quiplash — Reveal`, () => confirmQuitLocal()), container);
}

// ── Last Lash Synced Voting ──────────────────────────────────────────────────
function renderLastLashVoteScreen(item) {
  const voteItem = item || gState.votingQueue[0];
  const userAnswers = voteItem.answers.filter(a => a.player === myName);
  const userHasAnswer = userAnswers.length > 0;

  const allowedOptions = voteItem.answers
    .map((ansObj, aIdx) => ({ ansObj, aIdx }))
    .filter(entry => !isOnline || entry.ansObj.player !== myName);

  if (isOnline) {
    const activeVoteVal = gState.activeVotes[myName];
    const selectOptions = [el("option", { value: "", text: "Choose your favorite..." })];
    allowedOptions.forEach(opt => {
      selectOptions.push(el("option", { value: String(opt.aIdx), text: `"${opt.ansObj.answer}"` }));
    });

    const selectEl = el("select", {
      style: "width: 100%; border-radius: 12px; margin-top:16px;",
      onChange: (e) => {
        if (e.target.value !== "") {
          const opt = parseInt(e.target.value, 10);
          submitOnlineLastLashVote(opt);
        }
      }
    }, selectOptions);

    function submitOnlineLastLashVote(ansIdx) {
      const action = {
        type: "QUIPLASH_CAST_LAST_LASH",
        voter: myName,
        ansIdx
      };
      relay(action);
      handleRelay(action, myName);

      mount(
        gameTopbar("Quiplash — Final Lash", () => confirmQuitOnline()),
        el("div", { className: "panel center", style: "max-width: 440px; margin: 30px auto;" }, [
          el("div", { className: "spin-indicator", style: "font-size:2rem; margin-bottom:12px;", text: "⏳" }),
          el("h3", { text: "Final Vote Cast!" }),
          el("p", { className: "muted", text: "Waiting for other players to submit their votes..." }),
          el("div", { id: "quip-vote-waiting", style: "font-size:0.9rem; font-weight:bold; color:var(--sunset-soft); margin-top:8px;", text: `Submitted: ${gState.submittedVotesCount} / ${gState.players.length} votes` })
        ])
      );
    }

    mount(
      gameTopbar(`Quiplash — The Last Lash`, () => confirmQuitOnline()),
      el("div", { className: "panel center", style: "max-width: 600px; margin: 0 auto;" }, [
        el("h3", { text: "THE LAST LASH", style: "color:var(--sunset-soft); letter-spacing:1px; margin-top:0;" }),
        el("blockquote", { text: `"${voteItem.promptText}"`, style: "font-size: 1.4rem; font-weight: bold; border: none; padding: 0;" }),
        el("div", { className: "spacer" }),
        userHasAnswer ? el("p", { className: "muted", text: "Your answer is up! Choose your favorite anonymously from the others." }) : el("p", { className: "muted", text: "Select your favorite answer below." }),
        selectEl
      ])
    );
  } else {
    // Local P&P selection dropdowns for all players
    const activeVotes = {};
    gState.players.forEach(p => { activeVotes[p] = null; });

    const voterGrid = el("div", { style: "margin: 20px 0; display: flex; flex-direction: column; gap: 8px;" });

    function drawVoterGrid() {
      voterGrid.innerHTML = "";
      gState.players.forEach(pName => {
        const allowed = voteItem.answers
          .map((ansObj, aIdx) => ({ ansObj, aIdx }))
          .filter(entry => entry.ansObj.player !== pName);

        const selectOptions = [el("option", { value: "", text: "Choose an answer..." })];
        allowed.forEach(opt => {
          selectOptions.push(el("option", { value: String(opt.aIdx), text: `"${opt.ansObj.answer}"` }));
        });

        const select = el("select", {
          style: "max-width: 260px; font-size: 0.85rem; border-radius: 8px;",
          onChange: (e) => {
            activeVotes[pName] = e.target.value === "" ? null : parseInt(e.target.value, 10);
            checkSubmittable();
          }
        }, selectOptions);

        voterGrid.appendChild(el("div", {
          style: "display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; background: rgba(255,255,255,0.02); border-radius: 10px; border: 1px solid rgba(255,255,255,0.05);"
        }, [
          el("span", { text: pName, style: "font-weight: 500;" }),
          select
        ]));
      });
    }

    const submitBtn = el("button", {
      className: "btn",
      text: "Reveal Last Lash",
      disabled: true,
      onClick: () => {
        const tallies = voteItem.answers.map(() => 0);
        gState.players.forEach(p => {
          const choice = activeVotes[p];
          if (choice !== null) tallies[choice]++;
        });

        voteItem.answers.forEach((ansObj, aIdx) => {
          const votes = tallies[aIdx];
          const pts = votes * 300;
          gState.scores[ansObj.player] += pts;
          ansObj.votes = votes;
          ansObj.pointsEarned = pts;
        });

        renderSynchedRevealScreenLastLash(voteItem.answers);
      }
    });

    function checkSubmittable() {
      const allVoted = gState.players.every(p => activeVotes[p] !== null);
      submitBtn.disabled = !allVoted;
    }

    drawVoterGrid();

    mount(
      gameTopbar("Quiplash — Final Lash", () => confirmQuitLocal()),
      el("div", { className: "panel center", style: "max-width: 600px; margin: 0 auto;" }, [
        el("h3", { text: "THE LAST LASH", style: "color:var(--sunset-soft); letter-spacing:1px; margin-top:0;" }),
        el("blockquote", { text: `"${voteItem.promptText}"`, style: "font-size: 1.4rem; font-weight: bold; border: none; padding: 0;" }),
        el("div", { className: "spacer" }),
        voterGrid,
        submitBtn
      ])
    );
  }
}

function renderSynchedRevealScreenLastLash(answers) {
  const voteItem = gState.votingQueue[0];
  const sorted = answers.slice().sort((a, b) => b.votes - a.votes);

  const blockRows = sorted.map((ansObj) => {
    return el("div", {
      className: "panel",
      style: "display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border:1px solid rgba(255,255,255,0.08); padding: 12px 18px;"
    }, [
      el("div", { style: "text-align: left;" }, [
        el("div", { text: `"${ansObj.answer}"`, style: "font-size: 1.15rem; font-weight: bold;" }),
        el("div", { text: `By ${ansObj.player}`, style: "font-size: 0.85rem; color:var(--sunset-soft); font-weight: 500;" })
      ]),
      el("div", { style: "text-align: right;" }, [
        el("div", { text: `${ansObj.votes} ${ansObj.votes === 1 ? 'vote' : 'votes'}`, style: "font-weight: bold;" }),
        el("div", { text: `+${ansObj.pointsEarned} pts`, style: "font-size: 0.85rem; color:#00ffaa;" })
      ])
    ]);
  });

  const nextBtn = isOnline && !isHost
    ? el("div", { className: "muted center", text: "Waiting for host to flip page..." })
    : el("button", {
        className: "btn",
        text: "Show Final Standings",
        onClick: () => {
          if (isOnline) {
            const endPayload = { type: "QUIPLASH_LEADERBOARD" };
            relay(endPayload);
            handleRelay(endPayload, myName);
          } else {
            renderGameResults();
          }
        }
      });

  mount(
    gameTopbar("Quiplash — Final Lash Reveal", () => isOnline ? confirmQuitOnline() : confirmQuitLocal()),
    el("div", { className: "panel center", style: "max-width: 600px; margin: 0 auto;" }, [
      el("blockquote", { text: `"${voteItem.promptText}"`, style: "font-size: 1.3rem; border:none; padding:0; font-weight:bold; margin-bottom:20px;" }),
      ...blockRows,
      el("div", { className: "spacer" }),
      nextBtn
    ])
  );
}

function renderLastRevealScreen() {
  renderSynchedRevealScreenLastLash(gState.votingQueue[0].answers);
}

// ── Sync Leaderboard & Scores ────────────────────────────────────────────────
function renderLeaderboardScreen() {
  const standings = gState.players.map(pName => ({
    name: pName,
    score: gState.scores[pName]
  })).sort((a, b) => b.score - a.score);

  const listRows = standings.map((st, i) => {
    return el("div", {
      style: "display:flex; justify-content:space-between; align-items:center; padding:10px 16px; background:rgba(255,255,255,0.02); border-radius:10px; margin-bottom:8px;"
    }, [
      el("div", { style: "font-weight:500;" }, [document.createTextNode(`${i + 1}. ${st.name}${isOnline && st.name === myName ? " (You)" : ""}`)]),
      el("div", { text: String(st.score), style: "font-weight:bold; color:var(--sunset-soft);" })
    ]);
  });

  const isFinal = gState.round >= 3;
  let btnText = "Start Round 2 (Double Points)";
  if (gState.round === 2) {
    btnText = "Start Round 3 (The Last Lash)";
  }

  let nextBtn = null;
  if (isFinal) {
    nextBtn = isOnline && !isHost
      ? el("div", { className: "muted center", text: "Waiting for host to end game..." })
      : el("button", {
          className: "btn",
          text: "Show Final Standings",
          onClick: () => {
            if (isOnline) {
              // Final results synced
              renderGameResults();
            } else {
              renderGameResults();
            }
          }
        });
  } else {
    nextBtn = isOnline && !isHost
      ? el("div", { className: "muted center", text: "Waiting for host to start next round..." })
      : el("button", {
          className: "btn",
          text: btnText,
          onClick: () => {
            const nextRound = gState.round + 1;
            if (isOnline) {
              const shuffledPrompts = shuffle(gState.promptsPool);
              const N = gState.players.length;
              const writingQueue = [];

              if (nextRound === 2) {
                const roundPrompts = [];
                for (let i = 0; i < N; i++) {
                  roundPrompts.push(shuffledPrompts.pop());
                }
                for (let i = 0; i < N; i++) {
                  const p1 = gState.players[i];
                  const p2 = gState.players[(i + 1) % N];
                  const promptText = roundPrompts[i];

                  writingQueue.push({ player: p1, promptIdx: i, promptText, answer: "" });
                  writingQueue.push({ player: p2, promptIdx: i, promptText, answer: "" });
                }
              } else {
                const lastLashPrompt = shuffledPrompts.pop();
                gState.players.forEach(p => {
                  writingQueue.push({ player: p, promptIdx: 0, promptText: lastLashPrompt, answer: "" });
                });
              }

              const nextPayload = {
                type: "QUIPLASH_START",
                scores: gState.scores,
                promptsPool: shuffledPrompts,
                writingQueue,
                round: nextRound
              };
              relay(nextPayload);
              handleRelay(nextPayload, myName);
            } else {
              gState.round++;
              startRoundWriting();
            }
          }
        });
  }

  mount(
    gameTopbar(isFinal ? "Final Leaderboard" : `Quiplash — Round ${gState.round} Scores`, () => isOnline ? confirmQuitOnline() : confirmQuitLocal()),
    el("div", { className: "panel center", style: "max-width: 480px; margin: 0 auto;" }, [
      el("h2", { text: isFinal ? "Final Scores" : "Current Standings" }),
      ...listRows,
      el("div", { className: "spacer" }),
      nextBtn
    ])
  );
}

function renderGameResults() {
  const standings = gState.players.map(pName => ({
    name: pName,
    score: gState.scores[pName]
  })).sort((a, b) => b.score - a.score);

  const listRows = standings.map((st, i) => {
    const isWinner = i === 0;
    return el("div", {
      className: isWinner ? "panel" : "",
      style: `display:flex; justify-content:space-between; align-items:center; padding:12px 18px; background:${isWinner ? "rgba(255,145,100,0.06)" : "rgba(255,255,255,0.01)"}; border:${isWinner ? "1px solid var(--sunset-soft)" : "1px solid rgba(255,255,255,0.05)"}; border-radius:12px; margin-bottom:10px;`
    }, [
      el("div", { style: "font-weight: bold; display: flex; align-items: center; gap: 8px;" }, [
        document.createTextNode(`${i + 1}. ${st.name}`),
        isWinner ? el("span", { text: "👑 WINNER", style: "color:var(--sunset-soft); font-size:0.75rem; font-weight:bold; letter-spacing:0.5px;" }) : null
      ]),
      el("div", { text: String(st.score), style: "font-weight:bold; color:var(--sunset-soft); font-size: 1.2rem;" })
    ]);
  });

  const lobbyBtn = el("button", {
    className: "btn",
    text: "Back to Lobby",
    onClick: () => {
      resetAll();
      goHome();
    }
  });

  mount(
    gameTopbar("Quiplash — Final Standings", () => { resetAll(); goHome(); }),
    el("div", { className: "panel center", style: "max-width: 480px; margin: 0 auto;" }, [
      el("h1", { text: "Game Over!", style: "color: var(--sunset-soft); font-size: 2.2rem; font-weight: 900; margin-top: 0;" }),
      el("p", { className: "muted", text: "Congratulations to the champion! Here are the final scores:" }),
      ...listRows,
      el("div", { className: "spacer" }),
      lobbyBtn
    ])
  );
}
