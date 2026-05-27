// Interactive Dice Game Scorekeepers (Yahtzee & Farkle) for PWA.
import { el, mount, toast, store } from "./ui.js";
import { icons } from "./icons.js";

let goHome = () => {};

// UI Helper to render a nice layout topbar
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

/* ============================================================
 * YAHTZEE SCORECARD ENGINE
 * ============================================================ */
const YAHTZEE_CATEGORIES = [
  { id: "ones", name: "Aces (ones)", section: "upper", desc: "Count and add only Aces" },
  { id: "twos", name: "Twos", section: "upper", desc: "Count and add only Twos" },
  { id: "threes", name: "Threes", section: "upper", desc: "Count and add only Threes" },
  { id: "fours", name: "Fours", section: "upper", desc: "Count and add only Fours" },
  { id: "fives", name: "Fives", section: "upper", desc: "Count and add only Fives" },
  { id: "sixes", name: "Sixes", section: "upper", desc: "Count and add only Sixes" },
  { id: "three_kind", name: "3 of a Kind", section: "lower", desc: "Add total of all dice" },
  { id: "four_kind", name: "4 of a Kind", section: "lower", desc: "Add total of all dice" },
  { id: "full_house", name: "Full House (25)", section: "lower", desc: "Score 25 points" },
  { id: "sm_straight", name: "Small Straight (30)", section: "lower", desc: "Score 30 points" },
  { id: "lg_straight", name: "Large Straight (40)", section: "lower", desc: "Score 40 points" },
  { id: "yahtzee", name: "YAHTZEE (50)", section: "lower", desc: "Score 50 points" },
  { id: "chance", name: "Chance", section: "lower", desc: "Add total of all dice" },
  { id: "bonus_yahtzee", name: "Yahtzee Bonus (+100)", section: "lower", desc: "Score 100 points per extra Yahtzee" }
];

export function startYacht(home) {
  goHome = home;
  renderYachtSetup();
}

function renderYachtSetup() {
  const savedNames = store.get("yacht.names", ["Player 1", "Player 2"]);
  let names = savedNames.slice();

  const listWrap = el("div", { id: "yachtPlayerList", style: "margin: 16px 0;" });

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
      if (names.length < 6) {
        names.push(`Player ${names.length + 1}`);
        drawList();
      } else {
        toast("Max 6 players for Yahtzee.");
      }
    }
  });

  const startBtn = el("button", {
    className: "btn",
    text: "Start Scorecard",
    onClick: () => {
      const cleaned = names.map(n => n.trim() || "Player");
      store.set("yacht.names", cleaned);
      initYachtGame(cleaned);
    }
  });

  drawList();

  mount(
    diceTopbar("Yahtzee Scorecard", goHome),
    el("div", { className: "panel center", style: "max-width: 480px; margin: 0 auto;" }, [
      el("div", { style: "width:64px; height:64px; margin:0 auto 12px; color:var(--sunset-soft);" }, [icons.canoe()]),
      el("h2", { text: "Yahtzee Setup" }),
      el("p", { className: "muted", text: "Enter up to 6 player names. Pass the device to fill in the scores after each roll." }),
      listWrap,
      addBtn,
      el("div", { className: "spacer" }),
      startBtn
    ])
  );
}

function initYachtGame(players) {
  // Setup empty scoreboard state
  // scores[playerIndex][categoryId] = null or number
  const scores = players.map(() => {
    const pScore = {};
    YAHTZEE_CATEGORIES.forEach(c => { pScore[c.id] = null; });
    return pScore;
  });

  renderYachtBoard(players, scores);
}

function renderYachtBoard(players, scores) {
  // Calculate Totals for each player
  const playerStats = players.map((name, pIdx) => {
    const pScores = scores[pIdx];
    
    // Upper Section Subtotal
    let upperSum = 0;
    let upperFilledCount = 0;
    const upperCats = YAHTZEE_CATEGORIES.filter(c => c.section === "upper");
    upperCats.forEach(c => {
      if (pScores[c.id] !== null) {
        upperSum += pScores[c.id];
        upperFilledCount++;
      }
    });

    const upperBonus = upperSum >= 63 ? 35 : 0;
    const upperTotal = upperSum + upperBonus;

    // Lower Section Subtotal
    let lowerSum = 0;
    const lowerCats = YAHTZEE_CATEGORIES.filter(c => c.section === "lower");
    lowerCats.forEach(c => {
      if (pScores[c.id] !== null) {
        lowerSum += pScores[c.id];
      }
    });

    const grandTotal = upperTotal + lowerSum;

    return {
      upperSum,
      upperBonus,
      upperTotal,
      lowerSum,
      grandTotal,
      isFinished: Object.values(pScores).every(s => s !== null)
    };
  });

  // Table header: player names
  const headerCols = [el("th", { text: "Categories", style: "text-align: left; min-width: 120px;" })];
  players.forEach((pName, pIdx) => {
    headerCols.push(el("th", { text: pName, style: "text-align: center;" }));
  });

  const rows = [];

  // 1. Upper Section Categories
  rows.push(el("tr", { className: "section-header" }, [
    el("td", { text: "UPPER SECTION", colSpan: String(players.length + 1), style: "font-weight: bold; background: rgba(255,255,255,0.02); font-size: 0.75rem; letter-spacing: 1px;" })
  ]));

  const upperCats = YAHTZEE_CATEGORIES.filter(c => c.section === "upper");
  upperCats.forEach(cat => {
    const cols = [
      el("td", { style: "text-align: left; font-size: 0.85rem;" }, [
        el("div", { style: "font-weight: 500;" }, [document.createTextNode(cat.name)]),
        el("div", { className: "muted", style: "font-size: 0.7rem;" }, [document.createTextNode(cat.desc)])
      ])
    ];

    players.forEach((name, pIdx) => {
      const val = scores[pIdx][cat.id];
      const isFilled = val !== null;
      
      const btn = el("button", {
        className: isFilled ? "score-cell filled" : "score-cell empty",
        text: isFilled ? String(val) : "—",
        onClick: () => openScoreSelector(players, scores, pIdx, cat)
      });
      cols.push(el("td", { style: "text-align: center;" }, [btn]));
    });

    rows.push(el("tr", {}, cols));
  });

  // Upper Subtotal Row
  const upperSumCols = [el("td", { text: "Upper Subtotal", style: "font-weight: bold; font-size: 0.85rem;" })];
  players.forEach((name, pIdx) => {
    upperSumCols.push(el("td", { text: `${playerStats[pIdx].upperSum} / 63`, style: "font-weight: bold; text-align: center; font-size: 0.85rem;" }));
  });
  rows.push(el("tr", { style: "background: rgba(255,255,255,0.01);" }, upperSumCols));

  // Upper Bonus Row
  const upperBonusCols = [el("td", { text: "Upper Bonus (+35)", style: "font-weight: bold; font-size: 0.85rem;" })];
  players.forEach((name, pIdx) => {
    upperBonusCols.push(el("td", {
      text: playerStats[pIdx].upperBonus > 0 ? "+35" : "0",
      className: playerStats[pIdx].upperBonus > 0 ? "text-success" : "muted",
      style: "font-weight: bold; text-align: center; font-size: 0.85rem;"
    }));
  });
  rows.push(el("tr", { style: "background: rgba(255,255,255,0.01);" }, upperBonusCols));

  // 2. Lower Section Categories
  rows.push(el("tr", { className: "section-header" }, [
    el("td", { text: "LOWER SECTION", colSpan: String(players.length + 1), style: "font-weight: bold; background: rgba(255,255,255,0.02); font-size: 0.75rem; letter-spacing: 1px;" })
  ]));

  const lowerCats = YAHTZEE_CATEGORIES.filter(c => c.section === "lower");
  lowerCats.forEach(cat => {
    const cols = [
      el("td", { style: "text-align: left; font-size: 0.85rem;" }, [
        el("div", { style: "font-weight: 500;" }, [document.createTextNode(cat.name)]),
        el("div", { className: "muted", style: "font-size: 0.7rem;" }, [document.createTextNode(cat.desc)])
      ])
    ];

    players.forEach((name, pIdx) => {
      const val = scores[pIdx][cat.id];
      const isFilled = val !== null;
      
      const btn = el("button", {
        className: isFilled ? "score-cell filled" : "score-cell empty",
        text: isFilled ? String(val) : "—",
        onClick: () => openScoreSelector(players, scores, pIdx, cat)
      });
      cols.push(el("td", { style: "text-align: center;" }, [btn]));
    });

    rows.push(el("tr", {}, cols));
  });

  // Grand Total Row
  const grandTotalCols = [el("td", { text: "GRAND TOTAL", style: "font-weight: 900; font-size: 1rem; color: var(--sunset-soft);" })];
  players.forEach((name, pIdx) => {
    grandTotalCols.push(el("td", {
      text: String(playerStats[pIdx].grandTotal),
      style: "font-weight: 900; text-align: center; font-size: 1rem; color: var(--sunset-soft);"
    }));
  });
  rows.push(el("tr", { style: "background: rgba(255, 100, 100, 0.05); border-top: 2px solid rgba(255,255,255,0.15);" }, grandTotalCols));

  const table = el("table", { className: "yahtzee-table", style: "width: 100%; border-collapse: collapse; margin-bottom: 20px;" }, [
    el("thead", {}, [el("tr", {}, headerCols)]),
    el("tbody", {}, rows)
  ]);

  const leaveBtn = el("button", {
    className: "btn ghost small",
    text: "Quit Game",
    onClick: () => {
      if (confirm("Are you sure you want to end this game and lose the scores?")) {
        goHome();
      }
    }
  });

  mount(
    diceTopbar("Yahtzee Scorecard", goHome),
    el("div", { className: "panel center", style: "max-width: 720px; margin: 0 auto; overflow-x: auto; padding: 12px;" }, [
      table,
      el("div", { style: "display: flex; gap: 8px; justify-content: center;" }, [leaveBtn])
    ])
  );
}

function openScoreSelector(players, scores, pIdx, category) {
  const currentVal = scores[pIdx][category.id];
  let inputVal = currentVal !== null ? String(currentVal) : "";

  const title = el("h3", { text: `Enter ${players[pIdx]}'s Score` });
  const subTitle = el("p", { className: "muted", text: `${category.name} (${category.desc})` });

  const inputDisplay = el("div", {
    className: "score-input-display",
    text: inputVal || "0",
    style: "font-size: 2.2rem; font-weight: 900; color: var(--sunset-soft); text-align: center; padding: 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; margin: 12px 0;"
  });

  function pressKey(k) {
    if (k === "C") {
      inputVal = "";
    } else if (k === "⌫") {
      inputVal = inputVal.slice(0, -1);
    } else {
      if (inputVal === "0") inputVal = "";
      inputVal += k;
    }
    inputDisplay.textContent = inputVal || "0";
  }

  // Pre-configured fast option scores based on category
  const quickOptions = [];
  if (category.id === "ones") [0, 1, 2, 3, 4, 5].forEach(v => quickOptions.push(v));
  if (category.id === "twos") [0, 2, 4, 6, 8, 10].forEach(v => quickOptions.push(v));
  if (category.id === "threes") [0, 3, 6, 9, 12, 15].forEach(v => quickOptions.push(v));
  if (category.id === "fours") [0, 4, 8, 12, 16, 20].forEach(v => quickOptions.push(v));
  if (category.id === "fives") [0, 5, 10, 15, 20, 25].forEach(v => quickOptions.push(v));
  if (category.id === "sixes") [0, 6, 12, 18, 24, 30].forEach(v => quickOptions.push(v));
  if (category.id === "full_house") [0, 25].forEach(v => quickOptions.push(v));
  if (category.id === "sm_straight") [0, 30].forEach(v => quickOptions.push(v));
  if (category.id === "lg_straight") [0, 40].forEach(v => quickOptions.push(v));
  if (category.id === "yahtzee") [0, 50].forEach(v => quickOptions.push(v));
  if (category.id === "bonus_yahtzee") [0, 100, 200, 300].forEach(v => quickOptions.push(v));

  const quickRow = el("div", { className: "quick-row", style: "display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; margin-bottom: 12px;" });
  quickOptions.forEach(opt => {
    quickRow.appendChild(el("button", {
      className: "btn ghost small",
      text: String(opt),
      style: "width: auto; padding: 6px 12px; font-weight: bold; border-radius: 8px;",
      onClick: () => {
        inputVal = String(opt);
        inputDisplay.textContent = inputVal;
      }
    }));
  });

  const keys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["C", "0", "⌫"]
  ];

  const padGrid = el("div", { className: "numpad-grid", style: "display: flex; flex-direction: column; gap: 8px; max-width: 280px; margin: 0 auto 16px;" });
  keys.forEach(rowKeys => {
    const rowEl = el("div", { style: "display: flex; gap: 8px;" });
    rowKeys.forEach(k => {
      rowEl.appendChild(el("button", {
        className: "btn ghost",
        text: k,
        style: "flex: 1; height: 50px; font-size: 1.2rem; font-weight: 700; border-radius: 10px;",
        onClick: () => pressKey(k)
      }));
    });
    padGrid.appendChild(rowEl);
  });

  const saveBtn = el("button", {
    className: "btn",
    text: "Save Score",
    onClick: () => {
      const parsed = parseInt(inputVal, 10);
      scores[pIdx][category.id] = isNaN(parsed) ? 0 : parsed;
      modal.remove();
      renderYachtBoard(players, scores);
    }
  });

  const scratchBtn = el("button", {
    className: "btn error ghost",
    text: "Scratch (0)",
    style: "margin-top: 8px;",
    onClick: () => {
      scores[pIdx][category.id] = 0;
      modal.remove();
      renderYachtBoard(players, scores);
    }
  });

  const cancelBtn = el("button", {
    className: "btn ghost",
    text: "Cancel",
    style: "margin-top: 8px;",
    onClick: () => modal.remove()
  });

  const modalContent = el("div", {
    className: "panel",
    style: "max-width: 320px; width: 90%; background: #0b1a20; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); text-align: center;"
  }, [
    title,
    subTitle,
    inputDisplay,
    quickOptions.length > 0 ? quickRow : el("div"),
    padGrid,
    saveBtn,
    scratchBtn,
    cancelBtn
  ]);

  const modal = el("div", {
    className: "modal-overlay",
    style: "position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 100000; display: flex; align-items: center; justify-content: center;"
  }, [modalContent]);

  document.body.appendChild(modal);
}


/* ============================================================
 * FARKLE SCOREKEEPER ENGINE
 * ============================================================ */
export function startFarkle(home) {
  goHome = home;
  renderFarkleSetup();
}

function renderFarkleSetup() {
  const savedNames = store.get("farkle.names", ["Player 1", "Player 2", "Player 3"]);
  let names = savedNames.slice();

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

  const startBtn = el("button", {
    className: "btn",
    text: "Start Game",
    onClick: () => {
      const cleaned = names.map(n => n.trim() || "Player");
      store.set("farkle.names", cleaned);
      initFarkleGame(cleaned);
    }
  });

  drawList();

  mount(
    diceTopbar("Farkle Scorekeeper", goHome),
    el("div", { className: "panel center", style: "max-width: 480px; margin: 0 auto;" }, [
      el("div", { style: "width:64px; height:64px; margin:0 auto 12px; color:var(--sunset-soft);" }, [icons.roasts()]),
      el("h2", { text: "Farkle Setup" }),
      el("p", { className: "muted", text: "Farkle is a dice rolling game played to 10,000 points. You must score 500+ points in a turn to get on the board!" }),
      listWrap,
      addBtn,
      el("div", { className: "spacer" }),
      startBtn
    ])
  );
}

function initFarkleGame(players) {
  // scores[pIdx] = { total: 0, history: [], onBoard: false }
  const gameStates = players.map(() => ({
    total: 0,
    history: [],
    onBoard: false
  }));

  renderFarkleBoard(players, gameStates, 0);
}

function renderFarkleBoard(players, states, activePlayerIdx) {
  // Sort standings to highlight the leader
  const standings = players.map((name, pIdx) => ({
    name,
    pIdx,
    total: states[pIdx].total,
    onBoard: states[pIdx].onBoard
  })).sort((a, b) => b.total - a.total);

  // List of player rows
  const playerBlocks = players.map((name, pIdx) => {
    const state = states[pIdx];
    const isActive = pIdx === activePlayerIdx;
    
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

  const activePlayerName = players[activePlayerIdx];
  const activeState = states[activePlayerIdx];

  // Scoring form for active player
  const promptTitle = el("h3", { text: `${activePlayerName}'s Turn` });
  const promptDesc = el("p", {
    className: "muted",
    text: activeState.onBoard
      ? "Enter score for this turn (or 0 for a Farkle)."
      : "Must score 500+ in a single turn to get on the board!"
  });

  let turnScore = "";
  const inputDisplay = el("div", {
    className: "farkle-score-display",
    text: "0",
    style: "font-size: 2.5rem; font-weight: bold; text-align: center; color: var(--sunset-soft); padding: 16px; background: rgba(255,255,255,0.02); border-radius: 12px; margin-bottom: 12px;"
  });

  function pressKey(k) {
    if (k === "C") {
      turnScore = "";
    } else if (k === "⌫") {
      turnScore = turnScore.slice(0, -1);
    } else {
      if (turnScore === "0") turnScore = "";
      turnScore += k;
    }
    inputDisplay.textContent = turnScore || "0";
  }

  const numpadKeys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["C", "0", "⌫"]
  ];

  const padGrid = el("div", { className: "numpad-grid", style: "display: flex; flex-direction: column; gap: 8px; max-width: 280px; margin: 0 auto 16px;" });
  numpadKeys.forEach(rowKeys => {
    const rowEl = el("div", { style: "display: flex; gap: 8px;" });
    rowKeys.forEach(k => {
      rowEl.appendChild(el("button", {
        className: "btn ghost",
        text: k,
        style: "flex: 1; height: 46px; font-size: 1.1rem; font-weight: 700; border-radius: 8px;",
        onClick: () => pressKey(k)
      }));
    });
    padGrid.appendChild(rowEl);
  });

  const submitBtn = el("button", {
    className: "btn",
    text: "Log Turn Score",
    onClick: () => {
      const scoreVal = parseInt(turnScore, 10) || 0;
      
      if (scoreVal === 0) {
        // Farkle / Pass
        activeState.history.push(0);
        toast(`${activePlayerName} Farkled!`);
      } else {
        if (!activeState.onBoard) {
          if (scoreVal < 500) {
            toast("⚠️ Must score at least 500 points to get on the board!");
            return;
          }
          activeState.onBoard = true;
          activeState.total = scoreVal;
          activeState.history.push(scoreVal);
          toast(`🎉 ${activePlayerName} is on the board with ${scoreVal} points!`);
        } else {
          activeState.total += scoreVal;
          activeState.history.push(scoreVal);
          toast(`Logged ${scoreVal} points for ${activePlayerName}.`);
        }
      }

      // Check win condition
      if (activeState.total >= 10000) {
        toast(`🏆🏆🏆 ${activePlayerName} has won the game with ${activeState.total} points!`);
      }

      // Go to next player
      const nextIdx = (activePlayerIdx + 1) % players.length;
      renderFarkleBoard(players, states, nextIdx);
    }
  });

  const farkleBtn = el("button", {
    className: "btn error ghost",
    text: "FARKLE (0)",
    style: "margin-top: 8px;",
    onClick: () => {
      activeState.history.push(0);
      toast(`${activePlayerName} Farkled!`);
      const nextIdx = (activePlayerIdx + 1) % players.length;
      renderFarkleBoard(players, states, nextIdx);
    }
  });

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
        // Left Column: Players list
        el("div", {}, [
          el("h2", { text: "Standings", style: "font-size: 1.1rem; margin-top: 0; letter-spacing: 0.5px;" }),
          ...playerBlocks,
          el("div", { className: "panel center", style: "margin-top: 16px;" }, [
            el("h3", { text: "Leaderboard Summary", style: "font-size: 0.9rem; margin-top: 0;" }),
            ...standingsList
          ])
        ]),
        // Right Column: Active Turn score log
        el("div", { className: "panel center", style: "align-self: flex-start; background: #0b1a20;" }, [
          promptTitle,
          promptDesc,
          inputDisplay,
          padGrid,
          submitBtn,
          farkleBtn,
          el("button", {
            className: "btn ghost",
            text: "Quit Game",
            style: "margin-top: 16px;",
            onClick: () => {
              if (confirm("Quit game and lose scores?")) goHome();
            }
          })
        ])
      ])
    ])
  );
}
