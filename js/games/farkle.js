// Modular Farkle Scorekeeper and Virtual Roller for PWA.
import { el, mount, toast, store } from "../ui.js";
import { icons } from "../icons.js";
import { renderDiceFaceSVG, playClickTone } from "./dice_hub.js";

let goHome = () => {};

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
  renderSetup();
}

function renderSetup() {
  const savedNames = store.get("farkle.names", ["Player 1", "Player 2", "Player 3"]);
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
        onInput: (e) => { names[i] = e.target.value; }
      });
      const row = el("div", { className: "player-row", style: "margin-bottom: 8px;" }, [
        input,
        el("button", {
          className: "icon-btn",
          text: "✕",
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
    onClick: () => {
      if (names.length < 8) {
        names.push(`Player ${names.length + 1}`);
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

  const startBtn = el("button", {
    className: "btn",
    text: "Start Farkle",
    onClick: () => {
      const cleaned = names.map(n => n.trim() || "Player");
      store.set("farkle.names", cleaned);
      initGame(cleaned, piggybackRule);
    }
  });

  drawList();

  mount(
    diceTopbar("Farkle Scorekeeper", goHome),
    el("div", { className: "panel center", style: "max-width: 480px; margin: 0 auto;" }, [
      el("div", { style: "width:64px; height:64px; margin:0 auto 12px; color:var(--sunset-soft);" }, [icons.roasts()]),
      el("h2", { text: "Farkle Setup" }),
      el("p", { className: "muted", text: "Farkle is a dice rolling game played to 10,000 points. Score 500+ to get on the board. Use physical dice or our embedded virtual roller!" }),
      listWrap,
      addBtn,
      ruleToggle,
      el("div", { className: "spacer" }),
      startBtn
    ])
  );
}

function initGame(players, piggybackRule) {
  const gameStates = players.map(() => ({
    total: 0,
    history: [],
    onBoard: false
  }));

  const globalState = {
    players,
    states: gameStates,
    activePlayerIdx: 0,
    piggybackRule,
    // Bank transfer fields for Piggyback Mode
    lastBankedScore: 0,
    lastBankedRemainingDice: 0,
    lastBankedPlayerName: "",
    // Active turn temporary scoring states
    turnTempScore: 0,
    turnRemainingDice: 6,
    turnIsPiggybacked: false,
    turnHasRolled: false,
    // Virtual dice roller states
    virtualDice: [], // list of { val, held, scored }
    virtualRolling: false
  };

  renderBoard(globalState);
}

function renderBoard(gState) {
  const players = gState.players;
  const states = gState.states;
  const activeIdx = gState.activePlayerIdx;
  const activePlayerName = players[activeIdx];
  const activeState = states[activeIdx];

  const standings = players.map((name, pIdx) => ({
    name,
    pIdx,
    total: states[pIdx].total,
    onBoard: states[pIdx].onBoard
  })).sort((a, b) => b.total - a.total);

  // Standings blocks
  const playerBlocks = players.map((name, pIdx) => {
    const state = states[pIdx];
    const isActive = pIdx === activeIdx;
    
    return el("div", {
      className: "farkle-player-card" + (isActive ? " active" : ""),
      style: `padding: 12px 16px; margin-bottom: 8px; border-radius: 12px; border: 1px solid ${isActive ? "var(--sunset-soft)" : "rgba(255,255,255,0.06)"}; background: ${isActive ? "rgba(255,145,100,0.04)" : "rgba(255,255,255,0.01)"}; display: flex; align-items: center; justify-content: space-between;`
    }, [
      el("div", {}, [
        el("div", { style: "display: flex; align-items: center; gap: 8px;" }, [
          el("h3", { text: name, style: "margin: 0;" }),
          state.onBoard 
            ? el("span", { className: "badge", style: "background: rgba(0,250,150,0.1); color: #00ffaa; font-size: 0.65rem; border: 1px solid rgba(0,250,150,0.3); padding: 1px 6px;", text: "ON BOARD" })
            : el("span", { className: "badge", style: "background: rgba(255,255,255,0.03); color: #888; font-size: 0.65rem; border: 1px dashed rgba(255,255,255,0.15); padding: 1px 6px;", text: "NOT ON BOARD" })
        ]),
        el("div", { className: "muted", style: "font-size: 0.75rem; margin-top: 4px;" }, [
          document.createTextNode(state.history.length > 0 ? `History: ${state.history.join(", ")}` : "No rounds logged yet")
        ])
      ]),
      el("div", { style: "text-align: right;" }, [
        el("div", { text: String(state.total), style: "font-size: 1.4rem; font-weight: bold; color: var(--sunset-soft);" }),
        el("div", { className: "muted", style: "font-size: 0.65rem;" }, [document.createTextNode("points")])
      ])
    ]);
  });

  // Setup turn panel
  const turnPanel = el("div", { className: "panel center", style: "align-self: flex-start; background: #0b1a20;" });
  
  function drawTurnPanel() {
    turnPanel.innerHTML = "";

    // Show details if piggyback is available
    const canPiggyback = gState.piggybackRule && 
                         gState.lastBankedScore > 0 && 
                         gState.lastBankedRemainingDice > 0 && 
                         gState.lastBankedPlayerName !== activePlayerName &&
                         !gState.turnHasRolled;

    const heading = el("h3", { text: `${activePlayerName}'s Turn`, style: "margin-top: 0;" });
    const desc = el("p", {
      className: "muted",
      style: "font-size: 0.85rem; margin-bottom: 12px;",
      text: activeState.onBoard
        ? `Running Score: ${gState.turnTempScore} • Remaining Dice: ${gState.turnRemainingDice}`
        : `Must score 500+ in a turn to get on the board! (Running: ${gState.turnTempScore})`
    });

    // Piggyback Option button
    let piggybackBtn = null;
    if (canPiggyback) {
      piggybackBtn = el("button", {
        className: "btn success",
        style: "background: linear-gradient(135deg, #00ffaa, #00b377); color: #051410; margin-bottom: 12px; font-weight: 700; width: 100%; border:none;",
        html: `🔥 Piggyback on ${gState.lastBankedPlayerName}<br><span style="font-size:0.75rem;">Start with +${gState.lastBankedScore} pts & ${gState.lastBankedRemainingDice} dice</span>`,
        onClick: () => {
          gState.turnTempScore = gState.lastBankedScore;
          gState.turnRemainingDice = gState.lastBankedRemainingDice;
          gState.turnIsPiggybacked = true;
          gState.turnHasRolled = true;
          toast(`Piggybacked! Starting with ${gState.turnTempScore} points using ${gState.turnRemainingDice} dice.`);
          drawTurnPanel();
          triggerVirtualRoll();
        }
      });
    }

    // Embed standalone dice roller for active player
    const rollerHeading = el("h4", { text: "Virtual Dice Roller", style: "margin: 16px 0 6px; font-size: 0.9rem;" });
    const virtualDiceGrid = el("div", { style: "display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-bottom: 8px;" });

    function drawVirtualDice() {
      virtualDiceGrid.innerHTML = "";
      if (gState.virtualDice.length === 0) {
        virtualDiceGrid.appendChild(el("div", { className: "muted", style: "font-size:0.8rem; padding: 12px;", text: "Dice ready to roll" }));
        return;
      }
      gState.virtualDice.forEach((die, dIdx) => {
        const dFace = renderDiceFaceSVG(die.val, die.held || die.scored);
        const card = el("div", {
          className: "dice-box" + (die.held ? " held" : "") + (die.scored ? " scored" : "") + (gState.virtualRolling && !die.held && !die.scored ? " rolling" : ""),
          style: `width: 44px; height: 44px; padding: 2px; border: 2px solid ${die.scored ? "#00ffaa" : (die.held ? "var(--sunset-soft)" : "rgba(255,255,255,0.1)")}; border-radius: 8px; cursor: ${die.scored || gState.virtualRolling ? "not-allowed" : "pointer"};`,
          onClick: () => {
            if (gState.virtualRolling || die.scored) return;
            die.held = !die.held;
            drawVirtualDice();
            updateRollerButtons();
          }
        }, [dFace]);
        virtualDiceGrid.appendChild(card);
      });
    }

    const actionRow = el("div", { style: "display: flex; gap: 8px; margin-top: 10px; width: 100%;" });
    const rollTriggerBtn = el("button", {
      className: "btn small",
      text: gState.turnHasRolled ? "Roll Remaining" : "Roll Dice",
      onClick: () => {
        gState.turnHasRolled = true;
        triggerVirtualRoll();
      }
    });

    const keepTriggerBtn = el("button", {
      className: "btn ghost small success",
      text: "Lock Selected & Keep Rolling",
      disabled: true,
      onClick: () => {
        const selected = gState.virtualDice.filter(d => d.held && !d.scored);
        const vals = selected.map(d => d.val);
        const score = getFarkleDiceScore(vals);

        if (score === 0) {
          toast("⚠️ Selected dice do not form a valid scoring combination!");
          return;
        }

        gState.turnTempScore += score;
        selected.forEach(d => { d.scored = true; d.held = false; });
        
        // Check remaining dice count
        let remaining = gState.virtualDice.filter(d => !d.scored).length;
        if (remaining === 0) {
          // Hot dice!
          remaining = 6;
          gState.virtualDice = [];
          toast("🔥 HOT DICE! All 6 dice reset for rolling!");
        }
        gState.turnRemainingDice = remaining;

        toast(`Locked selected dice! +${score} points. Running total: ${gState.turnTempScore}`);
        drawTurnPanel();
      }
    });

    function updateRollerButtons() {
      const selected = gState.virtualDice.filter(d => d.held && !d.scored);
      const vals = selected.map(d => d.val);
      const score = getFarkleDiceScore(vals);
      
      if (score > 0) {
        keepTriggerBtn.disabled = false;
        keepTriggerBtn.textContent = `Lock Selected (+${score} pts)`;
      } else {
        keepTriggerBtn.disabled = true;
        keepTriggerBtn.textContent = "Lock Selected";
      }
    }

    actionRow.appendChild(rollTriggerBtn);
    actionRow.appendChild(keepTriggerBtn);

    // Standard scoring pad for manual logging
    const manualHeading = el("h4", { text: "Or Log Score Manually", style: "margin: 20px 0 6px; font-size: 0.9rem; border-top: 1px solid rgba(255,255,255,0.06); padding-top:16px;" });
    let turnScoreInput = "";
    const inputDisplay = el("div", {
      className: "farkle-score-display",
      text: "0",
      style: "font-size: 2rem; font-weight: bold; text-align: center; color: var(--sunset-soft); padding: 12px; background: rgba(255,255,255,0.02); border-radius: 10px; margin-bottom: 8px;"
    });

    function pressKey(k) {
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
          style: "flex: 1; height: 38px; font-size: 1rem; font-weight: 700; border-radius: 6px; margin:0;",
          onClick: () => pressKey(k)
        }));
      });
      padGrid.appendChild(rowEl);
    });

    const bankBtn = el("button", {
      className: "btn",
      text: "Bank Score",
      style: "width: 100%;",
      onClick: () => {
        let scoreVal = parseInt(turnScoreInput, 10) || 0;
        
        // If they used the virtual roller, add running turnTempScore
        if (gState.turnTempScore > 0) {
          scoreVal += gState.turnTempScore;
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

        // Save for Piggyback mode
        if (gState.piggybackRule) {
          // If they rolled virtually, we know exactly remaining dice!
          // Otherwise, ask them how many unused dice they had (default 0)
          let remaining = gState.turnRemainingDice;
          
          if (gState.virtualDice.length > 0) {
            remaining = gState.virtualDice.filter(d => !d.scored).length;
          } else {
            // Manual prompt or just assume 0. To keep flow fast, ask via a quick input
            const ans = prompt("How many unused dice did you have? (0 to 5)", "0");
            remaining = parseInt(ans, 10) || 0;
          }

          if (remaining > 0 && remaining < 6) {
            gState.lastBankedScore = scoreVal;
            gState.lastBankedRemainingDice = remaining;
            gState.lastBankedPlayerName = activePlayerName;
          } else {
            gState.lastBankedScore = 0;
            gState.lastBankedRemainingDice = 0;
            gState.lastBankedPlayerName = "";
          }
        }

        checkWinAndPass();
      }
    });

    const farkleBtn = el("button", {
      className: "btn error ghost",
      text: "FARKLE (0)",
      style: "margin-top: 8px; width: 100%;",
      onClick: () => logFarkle(0)
    });

    const quitBtn = el("button", {
      className: "btn ghost",
      text: "Quit Game",
      style: "margin-top: 16px; width: 100%;",
      onClick: () => {
        if (confirm("Quit game and lose scores?")) goHome();
      }
    });

    // Assemble Turn elements
    turnPanel.appendChild(heading);
    turnPanel.appendChild(desc);
    if (piggybackBtn) turnPanel.appendChild(piggybackBtn);
    
    turnPanel.appendChild(rollerHeading);
    turnPanel.appendChild(virtualDiceGrid);
    turnPanel.appendChild(actionRow);
    
    turnPanel.appendChild(manualHeading);
    turnPanel.appendChild(inputDisplay);
    turnPanel.appendChild(padGrid);
    turnPanel.appendChild(bankBtn);
    turnPanel.appendChild(farkleBtn);
    turnPanel.appendChild(quitBtn);

    drawVirtualDice();
  }

  function logFarkle(scoreVal) {
    activeState.history.push(0);
    toast(`${activePlayerName} Farkled! 0 points logged.`);

    // Reset piggyback state because a Farkle broke the chain!
    gState.lastBankedScore = 0;
    gState.lastBankedRemainingDice = 0;
    gState.lastBankedPlayerName = "";

    checkWinAndPass();
  }

  function checkWinAndPass() {
    if (activeState.total >= 10000) {
      toast(`🏆🏆🏆 ${activePlayerName} wins the game with ${activeState.total} points!`);
    }

    // Reset turn states
    gState.turnTempScore = 0;
    gState.turnRemainingDice = 6;
    gState.turnIsPiggybacked = false;
    gState.turnHasRolled = false;
    gState.virtualDice = [];
    
    gState.activePlayerIdx = (activeIdx + 1) % players.length;
    renderBoard(gState);
  }

  // ── Animated Virtual Rolling for Farkle ────────────────────────────────────
  function triggerVirtualRoll() {
    if (gState.virtualRolling) return;
    gState.virtualRolling = true;
    
    // Count how many dice we need to roll
    const count = gState.turnRemainingDice;
    
    // Setup virtual dice array if empty or start fresh
    if (gState.virtualDice.length === 0 || gState.virtualDice.filter(d => !d.scored).length === 0) {
      gState.virtualDice = Array(6).fill(null).map(() => ({ val: 1, held: false, scored: false }));
      // Mark others as scored so they are locked out
      for (let i = count; i < 6; i++) {
        gState.virtualDice[i].scored = true;
      }
    }

    let clicks = 0;
    const limit = 8;
    const interval = setInterval(() => {
      gState.virtualDice.forEach(d => {
        if (!d.scored && !d.held) {
          d.val = Math.floor(Math.random() * 6) + 1;
        }
      });
      drawTurnPanel();
      playClickTone(450 + Math.random() * 100, 0.03);
      clicks++;

      if (clicks >= limit) {
        clearInterval(interval);
        gState.virtualRolling = false;

        // Finalize values
        gState.virtualDice.forEach(d => {
          if (!d.scored && !d.held) {
            d.val = Math.floor(Math.random() * 6) + 1;
          }
        });

        playClickTone(700, 0.06);

        // Check if there are ANY scoring dice in the rolled pool
        const unheldPool = gState.virtualDice.filter(d => !d.scored && !d.held).map(d => d.val);
        const maxUnheldScore = getFarkleDiceScore(unheldPool);

        if (maxUnheldScore === 0) {
          toast("💥 FARKLE! No scoring dice on this roll!");
          setTimeout(() => {
            logFarkle(0);
          }, 2000);
        } else {
          toast(`Rolled! Selected unheld dice have potential points. Tap dice to hold.`);
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

  mount(
    diceTopbar("Farkle Scorekeeper", goHome),
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

  // Verify that all provided dice are part of a scoring combo
  // If there are left-over unused dice that do NOT score, then the *entire group* is invalid 
  // (unless we are just computing the maximum possible score, but in Farkle, a locked selection
  // must contain ONLY scoring dice).
  // Let's check if the number of scoring dice matches the input length!
  let usedDiceCount = 0;
  // Let's re-calculate how many were used:
  // 1-6 straight uses 6
  if (vals.length === 6 && counts.slice(1).every(c => c === 1)) {
    usedDiceCount = 6;
  }
  // 3 pairs uses 6
  else if (vals.length === 6 && pairCount === 3) {
    usedDiceCount = 6;
  }
  // 2 triplets uses 6
  else if (vals.length === 6 && tripletCount === 2) {
    usedDiceCount = 6;
  }
  else {
    const freshCounts = Array(7).fill(0);
    vals.forEach(v => freshCounts[v]++);
    for (let face = 1; face <= 6; face++) {
      const qty = freshCounts[face];
      if (qty >= 3) {
        // All triplets, 4-of-a-kind, etc. are scoring
        usedDiceCount += qty;
      } else {
        if (face === 1 || face === 5) {
          usedDiceCount += qty; // single 1s and 5s are scoring
        }
      }
    }
  }

  if (usedDiceCount < vals.length) {
    return 0; // Contains non-scoring dice! Selection is invalid.
  }

  return totalScore;
}
