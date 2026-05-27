// Modular Liar's Dice pass-and-play party game engine.
import { el, mount, toast, store, shuffle } from "../ui.js";
import { icons } from "../icons.js";
import { renderDiceFaceSVG, playClickTone } from "./dice_hub.js";

let goHome = () => {};

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
  renderSetup();
}

function renderSetup() {
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
      initGame(cleaned);
    }
  });

  drawList();

  mount(
    gameTopbar("Liar's Dice Setup", goHome),
    el("div", { className: "panel center", style: "max-width: 440px; margin: 0 auto;" }, [
      el("div", { style: "width:64px; height:64px; margin:0 auto 12px; color:var(--sunset-soft);" }, [icons.dice()]),
      el("h2", { text: "Liar's Dice", style: "margin-bottom: 4px;" }),
      el("p", { className: "muted", style: "margin-bottom:20px;", text: "A high-stakes bluffing game! Bid on how many total dice of a face exist in the room. Challenge bids by calling 'Liar!'" }),
      showRulesBtn,
      listWrap,
      addPlayerBtn,
      el("div", { className: "spacer" }),
      startBtn
    ])
  );
}

function initGame(players) {
  // Each player starts with 5 dice
  const pStates = players.map(name => ({
    name,
    diceCount: 5,
    dice: []
  }));

  const state = {
    players: pStates,
    currentRound: 1,
    activePlayerIdx: 0,
    currentBid: null, // { count: Number, face: Number, bidder: String }
    roundPhase: "reveal_cup", // "reveal_cup" (cycling so players see their secret dice) or "bidding"
    revealCycleIdx: 0 // who is secretly viewing their cup
  };

  startNewRound(state);
}

function startNewRound(state) {
  // Filter active players (diceCount > 0)
  const activeCount = state.players.filter(p => p.diceCount > 0).length;
  if (activeCount <= 1) {
    declareWinner(state);
    return;
  }

  // Roll secret dice for all active players
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

  // Find next active viewing player
  while (state.players[state.revealCycleIdx].diceCount === 0) {
    state.revealCycleIdx++;
  }

  renderCupCycle(state);
}

// ── Pass cup cycle viewing phase ─────────────────────────────────────────────
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
      // Move to next active viewing player
      let next = state.revealCycleIdx + 1;
      while (next < state.players.length && state.players[next].diceCount === 0) {
        next++;
      }

      if (next < state.players.length) {
        state.revealCycleIdx = next;
        renderCupCycle(state);
      } else {
        // Everyone viewed! Start bidding
        state.roundPhase = "bidding";
        // Bidding starts with the player next to the one who lost the die, or host first round
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

// ── Bidding Screen ───────────────────────────────────────────────────────────
function renderBiddingScreen(state) {
  const p = state.players[state.activePlayerIdx];

  // Current active bid display
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

  // Create Bid Panel selectors
  let bidCount = state.currentBid ? state.currentBid.count : 1;
  let bidFace = state.currentBid ? state.currentBid.face : 2; // Default to 2

  const countDisplay = el("span", { text: String(bidCount), style: "font-size:2rem; font-weight:bold; color:var(--sunset-soft);" });
  
  const increaseCount = el("button", {
    className: "btn ghost small",
    text: "+",
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

  // Die Face Selector buttons
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
    style: "width:100%; font-weight:bold;",
    onClick: () => {
      state.currentBid = { count: bidCount, face: bidFace, bidder: p.name };
      // Move to next active player
      let nextIdx = (state.activePlayerIdx + 1) % state.players.length;
      while (state.players[nextIdx].diceCount === 0) {
        nextIdx = (nextIdx + 1) % state.players.length;
      }
      state.activePlayerIdx = nextIdx;
      playClickTone(600, 0.08);
      renderPassTurnInter(state);
    }
  });

  const liarBtn = el("button", {
    className: "btn error",
    text: "🚨 Challenger: LIAR!",
    style: "width:100%; font-weight:bold; margin-bottom:12px;",
    onClick: () => {
      resolveLiarChallenge(state);
    }
  });

  function validateBid() {
    // A bid is higher if:
    // 1. Quantity is higher.
    // 2. Quantity is same, but die face is higher.
    if (state.currentBid) {
      const curBid = state.currentBid;
      const countHigher = bidCount > curBid.count;
      const sameCountFaceHigher = (bidCount === curBid.count && bidFace > curBid.face);

      if (countHigher || sameCountFaceHigher) {
        bidBtn.disabled = false;
        bidBtn.classList.remove("ghost");
      } else {
        bidBtn.disabled = true;
        bidBtn.classList.add("ghost");
      }
    }
  }

  drawFaceSelector();
  validateBid();

  // Create an accordion or overlay to let the player secretly peak their cup again
  const peakBtn = el("button", {
    className: "btn ghost small",
    text: "👁️ Secretly Peak Cup",
    style: "margin-bottom: 12px;",
    onClick: () => {
      const cupWrap = el("div", { style: "display:flex; gap:8px; justify-content:center; margin-top:8px;" });
      p.dice.forEach(val => {
        const dFace = renderDiceFaceSVG(val);
        const box = el("div", { style: "width:34px; height:34px; padding:2px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.1); border-radius:6px;" }, [dFace]);
        cupWrap.appendChild(box);
      });

      const peakOverlay = el("div", {
        className: "panel",
        style: "border:1px dashed rgba(255,255,255,0.15); border-radius:12px; margin-top:12px; padding:12px;"
      }, [
        el("p", { className: "muted center", text: "Your secret cup:", style: "margin:0 0 4px; font-size:0.75rem;" }),
        cupWrap,
        el("button", {
          className: "btn ghost small error",
          text: "Hide Cup",
          style: "width:100%; margin-top:10px;",
          onClick: () => peakOverlay.remove()
        })
      ]);

      peakBtn.parentNode.insertBefore(peakOverlay, peakBtn.nextSibling);
    }
  });

  const totalActiveDice = state.players.reduce((sum, pl) => sum + pl.diceCount, 0);

  mount(
    gameTopbar(`Liar's Dice — Turn: ${p.name}`, () => confirmQuit(state)),
    el("div", { className: "panel center", style: "max-width: 480px; margin: 0 auto;" }, [
      el("h3", { text: `${p.name}'s Bid Turn`, style: "color:var(--sunset-soft); margin-top:0;" }),
      el("p", { className: "muted", text: `Active dice in play: ${totalActiveDice}`, style: "font-size:0.8rem; margin-bottom:12px;" }),
      bidDisplay,
      el("div", { style: "display:flex; align-items:center; justify-content:center; gap:16px; margin-bottom:12px;" }, [
        decreaseCount,
        countDisplay,
        increaseCount
      ]),
      el("p", { className: "muted", text: "Select Die Face:", style: "font-size:0.8rem; margin:0;" }),
      faceSelector,
      el("hr", { style: "border:none; border-top:1px solid rgba(255,255,255,0.06); margin:18px 0;" }),
      state.currentBid ? liarBtn : null,
      bidBtn,
      el("hr", { style: "border:none; border-top:1px solid rgba(255,255,255,0.06); margin:18px 0;" }),
      peakBtn
    ])
  );
}

function renderPassTurnInter(state) {
  const p = state.players[state.activePlayerIdx];

  const content = el("div", { className: "panel center", style: "max-width: 480px; margin: 30px auto;" }, [
    el("h2", { text: "Bid Submited!" }),
    el("p", { className: "muted", style: "font-size:1.1rem; margin:20px 0;", html: `Pass the phone secretly to <strong style="color:var(--sunset-soft); font-size:1.25rem;">${p.name}</strong> to make their turn bid.` }),
    el("button", {
      className: "btn",
      text: "I am ready",
      onClick: () => renderBiddingScreen(state)
    })
  ]);

  mount(gameTopbar("Secret Bidding Pass", () => confirmQuit(state)), content);
}

// ── Resolve Liar Challenge ───────────────────────────────────────────────────
function resolveLiarChallenge(state) {
  const bid = state.currentBid;
  const activeChallenger = state.players[state.activePlayerIdx];

  // Count matches in the whole room
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
    // Challenger loses
    loserPlayerName = activeChallenger.name;
    logResultText = `Enough! There were ${matchCount} matching 🎲${bid.face}s in the room (required at least ${bid.count}). ${loserPlayerName} loses a die!`;
    playTone(320, 0.45); // challenger lose tone
  } else {
    // Bidder loses
    loserPlayerName = bid.bidder;
    logResultText = `Liar! There were only ${matchCount} matching 🎲${bid.face}s in the room (bid was ${bid.count}). ${loserPlayerName} loses a die!`;
    playTone(320, 0.45); // bidder lose tone
  }

  // Deduct die from loser
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
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
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

function resetAll() {}

function confirmQuit(state) {
  if (confirm("Are you sure you want to end this Liar's Dice game?")) {
    resetAll();
    goHome();
  }
}
