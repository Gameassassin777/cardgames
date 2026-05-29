// Dedicated TV Host & Spectator presentation board for living-room screens.
// Supports: Manual Code Joining, Background Autoconnect, and real-time up to 2-way Split-Screen game views!
import { el, mount, toast, HTTP_BASE, WS_BASE } from "../ui.js";
import { icons } from "../icons.js";
import { renderDiceFaceSVG, playClickTone } from "./dice_hub.js";





let goHome = () => {};
let autoconnectInt = null;
let mode = "selector"; // "selector" | "manual" | "autoconnect"

// List of actively tracked sync rooms: { code, game, socket, state, revealedPlayers }
let liveRooms = [];

export function start(home) {
  goHome = home;
  resetAll();
  renderSelectorScreen();
}

function resetAll() {
  if (autoconnectInt) { clearInterval(autoconnectInt); autoconnectInt = null; }
  liveRooms.forEach(r => {
    if (r.socket) { try { r.socket.close(); } catch (_) {} }
  });
  liveRooms = [];
  mode = "selector";
}

function tvTopbar(title, onBack) {
  const showBack = onBack && onBack !== goHome;
  return el("div", { className: "topbar" }, [
    showBack 
      ? el("button", { className: "back", onClick: onBack }, [
          el("span", { style: "width:16px; height:16px; display:inline-block;" }, [icons.back()]),
          el("span", { text: "Back" })
        ])
      : el("span", { style: "width:64px" }),
    el("div", { className: "title", text: title }),
    el("span", { style: "width:64px" })
  ]);
}

function renderSelectorScreen() {
  resetAll();

  mount(
    tvTopbar("TV Broadcast Screen", goHome),
    el("div", { className: "panel center", style: "max-width: 480px; margin: 40px auto; padding: 24px;" }, [
      el("span", { style: "font-size:3.5rem; line-height:1; display:inline-block; margin-bottom:12px;" }, [document.createTextNode("📺")]),
      el("h2", { text: "TV Broadcast Screen", style: "margin:0 0 6px;" }),
      el("p", { className: "muted", text: "Transform this laptop, iPad, or TV into a live game monitor. Choose how you want to connect:" }),
      el("div", { style: "display:flex; flex-direction:column; gap:12px; width:100%; margin-top:20px;" }, [
        el("button", {
          className: "btn",
          text: "🚀 Enable Autoconnect Monitor",
          onClick: () => startAutoconnectMode()
        }),
        el("button", {
          className: "btn ghost",
          text: "🔑 Enter Room Code Manually",
          onClick: () => renderManualConnectScreen()
        })
      ])
    ])
  );
}

function renderManualConnectScreen() {
  resetAll();
  mode = "manual";

  const codeInput = el("input", {
    type: "text",
    placeholder: "4-LETTER CODE",
    id: "tv-room-code",
    maxLength: 4,
    style: "font-size:2rem; font-weight:bold; border-radius:16px; text-align:center; text-transform:uppercase; letter-spacing:8px; margin:20px 0 16px; width:100%; height:60px;"
  });
  codeInput.addEventListener("input", () => { codeInput.value = codeInput.value.toUpperCase(); });

  const connectBtn = el("button", {
    className: "btn",
    text: "📺 Connect as TV Spectator",
    style: "width:100%; font-size:1.1rem; padding:14px; font-weight:bold;",
    onClick: () => {
      const code = codeInput.value.trim().toUpperCase();
      if (!code || code.length !== 4) { toast("Enter a 4-letter room code!"); return; }
      connectRoom(code, "");
    }
  });

  mount(
    tvTopbar("Manual TV Setup", () => renderSelectorScreen()),
    el("div", { className: "panel center", style: "max-width: 480px; margin: 40px auto; padding: 24px;" }, [
      el("p", { className: "muted", text: "Input the 4-letter room code created by the host to spectate this specific game." }),
      codeInput,
      connectBtn
    ])
  );
}

// ── Background Autoconnect Engine ───────────────────────────────────────────
function startAutoconnectMode() {
  resetAll();
  mode = "autoconnect";
  renderTVLayout(); // Draw initial idle view

  const pollRooms = async () => {
    if (mode !== "autoconnect") return;
    try {
      const res = await fetch(`${HTTP_BASE}/rooms/list`).then(r => r.json());
      const apiCodes = res.map(r => r.code);

      // 1. Clear any sockets whose rooms are no longer live
      liveRooms = liveRooms.filter(r => {
        const stillLive = apiCodes.includes(r.code);
        if (!stillLive && r.socket) {
          try { r.socket.close(); } catch (_) {}
          toast(`Room ${r.code} closed. Removing from monitor.`);
        }
        return stillLive;
      });

      // 2. Establish connections to newly opened rooms (cap at 2 concurrent split views)
      for (const apiRoom of res) {
        if (liveRooms.length >= 2) break; // Limit to 2 split views
        const alreadyTracking = liveRooms.some(r => r.code === apiRoom.code);
        if (!alreadyTracking) {
          toast(`🎉 Detected active room: ${apiRoom.code} (${apiRoom.game}). Connecting!`);
          connectRoom(apiRoom.code, apiRoom.game);
        }
      }

      if (res.length > 2) {
        // Just general heads-up toast
        toast(`Active lobbies exceed 2. Monitoring the first two rooms.`);
      }
    } catch (_) {}
  };

  pollRooms();
  autoconnectInt = setInterval(pollRooms, 2000);
}

function connectRoom(code, gameId = "") {
  // Create state holder
  const rState = {
    code,
    game: gameId,
    socket: null,
    state: null,
    revealedPlayers: null
  };

  const url = `${WS_BASE}/ws/join?code=${code}&name=__TV__&game=tv_spectator`;
  const ws = new WebSocket(url);
  rState.socket = ws;

  ws.onmessage = (ev) => {
    try {
      const d = JSON.parse(ev.data);
      if (d.type === "created" || d.type === "player_joined" || d.type === "player_left") {
        rState.players = d.players;
        renderTVLayout();
      } else if (d.type === "relay") {
        handleRoomRelay(rState, d.action, d.sender);
      } else if (d.type === "error") {
        ws.close();
      }
    } catch (e) {
      console.error("[TV Socket message error]:", e);
    }
  };

  ws.onclose = () => {
    // Remove from active list
    liveRooms = liveRooms.filter(r => r.code !== code);
    renderTVLayout();
  };

  liveRooms.push(rState);
  renderTVLayout();
}

function handleRoomRelay(rState, action, sender) {
  if (action.state) {
    rState.state = action.state;
  }

  // Automatic signature-based game identification for robust custom sub-views
  if (action.type === "quiplash_state" || action.type?.startsWith("QUIPLASH")) {
    rState.game = "quiplash";
    if (action.state) rState.state = action.state;
  } else if (action.type === "start_round" || action.type === "place_bid" || action.type === "resolve_challenge") {
    rState.game = "liars_dice";
  } else if (action.type === "state_update" && action.state?.virtualDice) {
    rState.game = "farkle";
  } else if (action.state?.prompt && action.state?.submissions) {
    rState.game = "cam";
  } else if (action.state?.text && action.state?.tag) {
    rState.game = "deck";
  }

  if (action.type === "quiplash_state") {
    rState.state = action.state;
  } else if (action.type === "start_game" && sender !== "__TV__") {
    rState.state = { phase: "play", players: action.players };
  } else if (action.type === "start_round" && action.diceMap) {
    rState.state = action.state;
  } else if (action.type === "place_bid") {
    if (rState.state) {
      rState.state.currentBid = action.bid;
      rState.state.activePlayerIdx = action.nextPlayerIdx;
      playClickTone(600, 0.08);
    }
  } else if (action.type === "resolve_challenge") {
    rState.revealedPlayers = action.revealedPlayers;
    rState.challengeAction = action;
  } else if (action.type === "BLANK_SLATE_START") {
    rState.game = "blank_slate";
    rState.state = {
      phase: "select",
      selectorName: action.players[0],
      players: action.players.map(p => ({ name: p, score: 0 })),
      prompts: action.prompts,
      promptIndex: action.promptIndex
    };
  } else if (action.type === "BLANK_SLATE_CHOSEN_PROMPT") {
    if (rState.state) {
      rState.state.phase = "cue";
      rState.state.prompt = action.prompt;
      rState.state.answers = {};
      rState.state.answersCount = 0;
    }
  } else if (action.type === "BLANK_SLATE_SUBMIT_WORD") {
    if (rState.state) {
      if (!rState.state.answers) rState.state.answers = {};
      rState.state.answers[action.player] = "Submitted";
      rState.state.answersCount = Object.keys(rState.state.answers).length;
    }
  } else if (action.type === "BLANK_SLATE_REVEAL") {
    if (rState.state) {
      rState.state.phase = "reveal";
      rState.state.answers = action.answers;
      rState.state.pointsAwarded = action.pointsAwarded;
      rState.state.players = action.players;
    }
  } else if (action.type === "BLANK_SLATE_NEXT_ROUND") {
    if (rState.state) {
      rState.state.phase = "select";
      rState.state.promptIndex = action.promptIndex;
      rState.state.selectorName = rState.state.players[action.selectorIdx].name;
      rState.state.prompt = "";
      rState.state.answers = {};
      rState.state.answersCount = 0;
    }
  } else if (action.type === "state_update" && rState.state) {
    rState.state = action.state;
  } else if (action.type === "trigger_roll") {
    triggerTVDiceAnimation(rState, action.diceValues);
  } else if (action.type === "STATE_SYNC") {
    rState.state = action.state;
  } else if (action.type === "quit") {
    if (rState.socket) rState.socket.close();
  }

  renderTVLayout();
}

// ── TV Layout Orchestrator (Full & Split-Screen views) ───────────────────────────
function renderTVLayout() {
  const container = el("div", {
    style: "display:flex; flex-direction:column; min-height:100vh; width:100%; background:#05141a;"
  });

  const header = tvTopbar(
    mode === "autoconnect" ? "Lake House Live TV Monitor" : `TV Spectator Board`,
    null
  );
  container.appendChild(header);

  // If no rooms are actively connected, display the gorgeous Cozy Idle Hearth!
  if (liveRooms.length === 0) {
    const idleHearth = el("div", {
      className: "panel center",
      style: "flex:1; display:flex; flex-direction:column; justify-content:center; align-items:center; max-width:600px; margin: 40px auto; padding:40px; box-shadow:0 8px 30px rgba(0,0,0,0.4);"
    }, [
      el("span", { style: "font-size:5rem; line-height:1; display:inline-block; margin-bottom:16px; filter:drop-shadow(0 4px 10px rgba(255,100,50,0.35));" }, [document.createTextNode("🔥")]),
      el("h1", { text: "Lake House Hearth", style: "margin:0 0 8px; font-weight:900;" }),
      el("p", { 
        className: "muted", 
        style: "font-size:1.15rem; line-height:1.5;", 
        text: mode === "autoconnect"
          ? "Live Autoconnect is active. Start a card, board, or dice game on your phone anywhere in the house to cast the broadcast board here instantly!"
          : "Lobby closed. Open a game setup on your device and type the code above to spectate!"
      }),
      el("div", {
        style: "margin-top:24px; padding:10px 18px; border-radius:12px; background:rgba(0,250,150,0.06); border:1.5px dashed rgba(0,250,150,0.25);"
      }, [
        el("span", { text: "📡 Listening for live rooms in background...", style: "font-size:0.9rem; font-weight:bold; color:#00ffaa;" })
      ])
    ]);
    container.appendChild(idleHearth);
    mount(container);
    return;
  }

  // Draw full or split screen column layouts
  const gameGrid = el("div", {
    style: `display: flex; flex: 1; width: 100%; gap: 16px; padding: 16px; justify-content: center; align-items: stretch; flex-wrap: wrap;`
  });

  liveRooms.forEach(room => {
    const colWidth = liveRooms.length === 2 ? "calc(50% - 8px)" : "100%";
    const wrapper = el("div", {
      style: `width: ${colWidth}; display:flex; flex-direction:column; border: 2px solid rgba(255,255,255,0.06); border-radius:16px; background:#0b1a20; overflow:hidden; min-height:480px;`
    }, [
      el("div", {
        style: "padding:10px 16px; border-bottom:1px solid rgba(255,255,255,0.06); background:rgba(0,0,0,0.18); display:flex; justify-content:space-between; align-items:center;"
      }, [
        el("strong", { text: `ROOM CODE: ${room.code}`, style: "color:var(--sunset-soft); font-size:1rem;" }),
        el("span", { 
          text: room.game ? room.game.toUpperCase() : "SYNCING", 
          style: "font-size:0.75rem; font-weight:900; background:rgba(255,255,255,0.06); border-radius:6px; padding:2px 8px;" 
        })
      ]),
      el("div", { style: "flex:1; display:flex; flex-direction:column; justify-content:center; align-items:center; padding:16px;" }, [
        renderRoomInnerContent(room)
      ])
    ]);
    gameGrid.appendChild(wrapper);
  });

  container.appendChild(gameGrid);
  mount(container);
}

function renderRoomInnerContent(room) {
  if (!room.state) {
    // Lobby view
    const pBadges = (room.players || []).filter(p => p !== "__TV__").map(p => {
      return el("div", {
        style: "padding: 8px 14px; font-size:0.95rem; font-weight:bold; background:rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius:10px; color: var(--sunset-soft);"
      }, [document.createTextNode(p)]);
    });

    return el("div", { className: "center", style: "width:100%;" }, [
      el("h3", { text: "Room Lobby Active", style: "margin:0; color:#00ffaa;" }),
      el("p", { className: "muted", text: "Waiting for host to start...", style: "font-size:0.85rem;" }),
      el("div", {
        style: "display:flex; flex-wrap:wrap; gap:8px; justify-content:center; margin-top:16px;"
      }, pBadges)
    ]);
  }

  // Detect and route game-specific TV sub-views
  const state = room.state;
  if (room.game === "quiplash") {
    return drawQuiplashTVSub(state);
  } else if (room.game === "blank_slate") {
    return drawBlankSlateTVSub(state);
  } else if (room.game === "liars_dice") {
    if (room.revealedPlayers) return drawLiarsDiceRevealSub(room);
    return drawLiarsDiceTVSub(state);
  } else if (room.game === "farkle") {
    return drawFarkleTVSub(state);
  } else if (state.prompt) {
    // Cards Against Monkeys / Cabin Fever
    return drawCardsTVSub(state);
  } else if (state.text) {
    // Online deck game dilemma (Would You Rather)
    return drawDeckTVSub(state);
  }

  // Fallback synced mirroring view
  return el("div", { className: "center" }, [
    el("div", { className: "play-card prompt", style: "font-size:1.4rem; padding:16px;" }, [
      el("span", { text: state.text || state.prompt || "Sync active..." })
    ])
  ]);
}

// ── Game sub-view creators ───────────────────────────────────────────────────

function drawQuiplashTVSub(state) {
  if (state.phase === "writing") {
    return el("div", { className: "center anim-pulse" }, [
      el("span", { style: "font-size:2.5rem;", text: "✍️" }),
      el("h3", { text: "Writing answers...", style: "margin-top:8px;" })
    ]);
  }

  const promptEl = el("div", {
    className: "play-card prompt",
    style: "font-size:1.3rem; min-height:80px; text-align:center; padding:12px; margin-bottom:16px; width:100%;"
  }, [el("span", { text: state.prompt })]);

  if (state.phase === "battle") {
    const battle = el("div", { style: "display:flex; gap:12px; width:100%;" }, [
      el("div", { className: "panel center", style: "flex:1; padding:12px; background:rgba(255,145,100,0.03); border-radius:12px;" }, [
        el("p", { className: "muted", text: "ANSWER A", style: "font-size:0.7rem; margin:0 0 4px;" }),
        el("h3", { text: state.answerA || "???", style: "margin:0; font-size:1.1rem; color:#ff9164;" })
      ]),
      el("div", { className: "panel center", style: "flex:1; padding:12px; background:rgba(100,180,255,0.03); border-radius:12px;" }, [
        el("p", { className: "muted", text: "ANSWER B", style: "font-size:0.7rem; margin:0 0 4px;" }),
        el("h3", { text: state.answerB || "???", style: "margin:0; font-size:1.1rem; color:#64b4ff;" })
      ])
    ]);
    return el("div", { style: "width:100%;" }, [promptEl, battle]);
  }

  if (state.phase === "standings") {
    const rows = state.players.slice(0, 4).map((p, i) => {
      return el("div", {
        style: "display:flex; justify-content:space-between; padding:8px 12px; background:rgba(255,255,255,0.01); border-radius:8px; margin-bottom:6px; font-size:0.85rem;"
      }, [
        el("span", { text: `${i + 1}. ${p.name}` }),
        el("strong", { text: `${p.score} pts`, style: "color:var(--sunset-soft);" })
      ]);
    });
    return el("div", { style: "width:100%;" }, [
      el("h3", { text: "Leaderboard", style: "color:#00ffaa; margin:0 0 10px;" }),
      ...rows
    ]);
  }

  return el("div", { text: "Quiplash Active" });
}

function drawLiarsDiceTVSub(state) {
  let bidDisplay = el("h3", { text: "No active bids on the table.", className: "muted center" });
  if (state.currentBid) {
    const curDieSVG = renderDiceFaceSVG(state.currentBid.face);
    curDieSVG.style.width = "26px";
    curDieSVG.style.height = "26px";
    curDieSVG.style.display = "inline-block";
    curDieSVG.style.verticalAlign = "middle";
    curDieSVG.style.marginLeft = "6px";

    bidDisplay = el("div", {
      className: "panel center",
      style: "border: 1px solid var(--sunset-soft); background:rgba(255,145,100,0.04); border-radius:12px; padding:12px; margin-bottom:12px;"
    }, [
      el("span", { text: "Current Bid: ", className: "muted", style: "font-size:0.75rem;" }),
      el("h3", { style: "margin: 2px 0 0; color: var(--sunset-soft); font-size:1.25rem;" }, [
        document.createTextNode(`${state.currentBid.count} of `),
        curDieSVG,
        document.createTextNode(` (by ${state.currentBid.bidder})`)
      ])
    ]);
  }

  const activePlayer = state.players[state.activePlayerIdx];
  const activeLabel = el("div", {
    className: "panel center anim-pulse",
    style: "padding:12px; background:rgba(255,255,255,0.02); border-radius:12px;"
  }, [
    el("span", { text: "Current Turn:", className: "muted", style: "font-size:0.75rem;" }),
    el("h3", { text: activePlayer ? activePlayer.name : "Waiting...", style: "margin:2px 0 0; color:#00ffaa; font-size:1.3rem;" })
  ]);

  const totalDice = state.players.reduce((sum, pl) => sum + pl.diceCount, 0);

  return el("div", { style: "width:100%;" }, [
    el("p", { className: "muted", text: `Active dice: ${totalDice}`, style: "font-size:0.85rem; font-weight:bold; margin:0 0 12px; text-align:center;" }),
    bidDisplay,
    activeLabel
  ]);
}

function drawLiarsDiceRevealSub(room) {
  const bid = room.state.currentBid;
  const list = room.revealedPlayers.map(pl => {
    const cupWrap = el("div", { style: "display:flex; gap:4px;" });
    pl.dice.forEach(val => {
      const isMatch = val === bid.face;
      const dFace = renderDiceFaceSVG(val, isMatch);
      const box = el("div", {
        style: `width: 26px; height: 26px; padding: 2px; background: ${isMatch ? "rgba(255,145,100,0.12)" : "rgba(255,255,255,0.01)"}; border: 1px solid ${isMatch ? "var(--sunset-soft)" : "rgba(255,255,255,0.08)"}; border-radius: 4px;`
      }, [dFace]);
      cupWrap.appendChild(box);
    });

    return el("div", {
      style: "display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:rgba(255,255,255,0.01); border-radius:10px; margin-bottom:6px; font-size:0.8rem;"
    }, [
      el("span", { text: pl.name }),
      cupWrap
    ]);
  });

  return el("div", { style: "width:100%; text-align:left;" }, [
    el("h3", { text: "Challenge Reveal!", style: "text-align:center; color:#ff5e5e; margin:0 0 10px;" }),
    ...list
  ]);
}

function drawFarkleTVSub(state) {
  const rows = state.players.slice(0, 4).map((name, pIdx) => {
    const pState = state.states[pIdx];
    const isActive = pIdx === state.activePlayerIdx;
    return el("div", {
      style: `padding: 8px 12px; margin-bottom: 6px; border-radius: 10px; border: 1px solid ${isActive ? "var(--sunset-soft)" : "rgba(255,255,255,0.06)"}; background: ${isActive ? "rgba(255,145,100,0.03)" : "rgba(255,255,255,0.01)"}; display: flex; align-items: center; justify-content: space-between; font-size:0.85rem;`
    }, [
      el("span", { text: name, style: "font-weight:bold;" }),
      el("span", { text: String(pState.total), style: "font-weight:bold; color:var(--sunset-soft);" })
    ]);
  });

  const diceGrid = el("div", { style: "display: flex; gap: 6px; justify-content: center; margin: 10px 0; flex-wrap:wrap;" });
  if (state.virtualDice && state.virtualDice.length > 0) {
    state.virtualDice.forEach(die => {
      const dFace = renderDiceFaceSVG(die.val, die.held || die.scored);
      const box = el("div", {
        style: `width: 32px; height: 32px; padding: 2px; border: 1.5px solid ${die.scored ? "#00ffaa" : (die.held ? "var(--sunset-soft)" : "rgba(255,255,255,0.1)")}; border-radius: 6px;`
      }, [dFace]);
      diceGrid.appendChild(box);
    });
  }

  return el("div", { style: "width:100%; text-align:left;" }, [
    el("h3", { text: "Farkle Scoreboard", style: "color:#00ffaa; margin:0 0 10px; text-align:center;" }),
    ...rows,
    diceGrid
  ]);
}

function triggerTVDiceAnimation(rState, diceValues) {
  rState.state.virtualRolling = true;
  if (rState.state.virtualDice.length === 0) {
    rState.state.virtualDice = Array(6).fill(null).map(() => ({ val: 1, held: false, scored: false }));
  }

  let clicks = 0;
  const limit = 8;
  const interval = setInterval(() => {
    rState.state.virtualDice.forEach(d => {
      if (!d.scored && !d.held) d.val = Math.floor(Math.random() * 6) + 1;
    });
    renderTVLayout();
    playClickTone(450 + Math.random() * 100, 0.03);
    clicks++;

    if (clicks >= limit) {
      clearInterval(interval);
      rState.state.virtualRolling = false;
      rState.state.virtualDice.forEach((d, idx) => {
        d.val = diceValues[idx];
      });
      playClickTone(700, 0.06);
      renderTVLayout();
    }
  }, 80);
}

function drawCardsTVSub(state) {
  return el("div", { className: "center", style: "width:100%;" }, [
    el("div", {
      className: "play-card prompt",
      style: "font-size:1.15rem; min-height:100px; padding:12px; margin-bottom:10px; display:flex; align-items:center; justify-content:center;"
    }, [el("span", { text: state.prompt.text })]),
    state.submissions ? el("p", {
      className: "muted anim-pulse",
      style: "font-size:0.8rem; margin:0;",
      text: `Cards: ${state.submissions.length} / ${state.players.length - 1} in`
    }) : null
  ]);
}

function drawDeckTVSub(state) {
  return el("div", { className: "center", style: "width:100%;" }, [
    el("span", {
      className: "pill",
      style: "display:inline-block; font-size:0.7rem; background:rgba(255,255,255,0.06); border-radius:12px; padding:2px 8px; margin-bottom:10px;"
    }, [document.createTextNode(state.tag || "Dilemma")]),
    el("div", {
      className: "play-card response",
      style: "font-size:1.2rem; min-height:110px; justify-content:center; text-align:center; padding:12px;"
    }, [el("span", { text: state.text })])
  ]);
}

function drawBlankSlateTVSub(state) {
  if (!state) return el("p", { text: "Connecting..." });

  // 1. Prompt Selection Phase
  if (state.phase === "select" || !state.phase) {
    const selectorName = state.selectorName || "Someone";
    return el("div", { className: "center anim-pulse" }, [
      el("div", { style: "width:64px; height:64px; margin:0 auto 12px; color:var(--sunset-soft);" }, [icons.slate()]),
      el("h2", { text: `${selectorName} is choosing a card…`, style: "margin-top:8px;" }),
      el("p", { className: "muted", text: "Two options are presented secretly on their device.", style: "font-size:0.9rem;" })
    ]);
  }

  // 2. Cue/Writing Phase
  if (state.phase === "cue") {
    const totalCount = state.players?.length || 0;
    const answeredCount = state.answersCount || 0;
    return el("div", { className: "center" }, [
      el("p", { className: "muted", text: "COMPLETE THE PHRASE CUE", style: "font-size: 0.95rem; letter-spacing:1px; margin-bottom:12px;" }),
      el("h1", { text: state.prompt || "_____", style: "font-size: 3.5rem; color: var(--sunset-soft); text-shadow: 0 2px 10px rgba(0,0,0,0.5); font-family: Segoe UI, sans-serif; font-weight:800; margin: 10px 0 24px;" }),
      el("div", { className: "panel center", style: "background:rgba(255,255,255,0.05); padding:16px; border-radius:14px; max-width:320px; margin:0 auto;" }, [
        el("div", { className: "spin-indicator", style: "font-size:2rem; margin-bottom:8px;", text: "✍️" }),
        el("h3", { text: `${answeredCount} / ${totalCount} Submitted`, style: "margin:0; font-size:1.2rem; color:var(--cream);" })
      ])
    ]);
  }

  // 2. Reveal Phase
  if (state.phase === "reveal") {
    const slatesList = el("div", { style: "display:flex; flex-direction:column; gap:10px; margin:20px 0; width:100%; text-align:left;" });
    
    // Group answers by frequency/similarity
    const wordGroups = {};
    Object.entries(state.answers || {}).forEach(([name, ans]) => {
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
        style: `border-radius:14px; padding:12px 16px; ${borderStyle}`
      }, [
        el("div", { style: "display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;" }, [
          el("span", { text: word, style: "font-size:1.3rem; font-weight:800; color:var(--cream); letter-spacing:1px;" }),
          el("span", { text: pointsBadge, style: "font-size:0.8rem; font-weight:bold; color:var(--sunset-soft);" })
        ]),
        el("div", { text: `Written by: ${players.join(", ")}`, className: "muted", style: "font-size:0.85rem;" })
      ]);
      slatesList.appendChild(row);
    });

    const scoreboard = el("div", { className: "scoreboard", style: "margin-top:24px; text-align:left; width:100%;" });
    const ranked = (state.players || []).slice().sort((a, b) => b.score - a.score);
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

    return el("div", { style: "width:100%; max-width:480px; margin:0 auto;" }, [
      el("p", { className: "muted center", text: "ROUND REVEAL" }),
      el("h2", { text: state.prompt || "_____", style: "font-size: 2.2rem; text-align:center; color: var(--sunset-soft); margin: 6px 0 20px;" }),
      slatesList,
      el("h3", { text: "Scoreboard", style: "margin-top:28px; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:6px;" }),
      scoreboard
    ]);
  }

  return el("div", { text: "Blank Slate Synchronized" });
}
