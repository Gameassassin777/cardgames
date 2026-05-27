// Modular Yahtzee Scorecard and Virtual Roller for PWA.
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

export function start(home) {
  goHome = home;
  renderSetup();
}

function renderSetup() {
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
      initGame(cleaned);
    }
  });

  drawList();

  mount(
    diceTopbar("Yahtzee Scorecard", goHome),
    el("div", { className: "panel center", style: "max-width: 480px; margin: 0 auto;" }, [
      el("div", { style: "width:64px; height:64px; margin:0 auto 12px; color:var(--sunset-soft);" }, [icons.canoe()]),
      el("h2", { text: "Yahtzee Setup" }),
      el("p", { className: "muted", text: "Enter up to 6 player names. Pass the device to fill in scores. Use physical dice or our built-in virtual roller!" }),
      listWrap,
      addBtn,
      el("div", { className: "spacer" }),
      startBtn
    ])
  );
}

function initGame(players) {
  const scores = players.map(() => {
    const pScore = {};
    YAHTZEE_CATEGORIES.forEach(c => { pScore[c.id] = null; });
    return pScore;
  });

  const yachtState = {
    players,
    scores,
    // Turn roller states
    rollsLeft: 3,
    virtualDice: Array(5).fill(null).map(() => ({ val: 1, held: false })),
    virtualRolling: false
  };

  renderBoard(yachtState);
}

function renderBoard(yState) {
  const players = yState.players;
  const scores = yState.scores;

  const playerStats = players.map((name, pIdx) => {
    const pScores = scores[pIdx];
    
    let upperSum = 0;
    const upperCats = YAHTZEE_CATEGORIES.filter(c => c.section === "upper");
    upperCats.forEach(c => {
      if (pScores[c.id] !== null) {
        upperSum += pScores[c.id];
      }
    });

    const upperBonus = upperSum >= 63 ? 35 : 0;
    const upperTotal = upperSum + upperBonus;

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
      grandTotal
    };
  });

  // Table header
  const headerCols = [el("th", { text: "Categories", style: "text-align: left; min-width: 120px;" })];
  players.forEach((pName) => {
    headerCols.push(el("th", { text: pName, style: "text-align: center;" }));
  });

  const rows = [];

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
        onClick: () => openScoreSelector(yState, pIdx, cat)
      });
      cols.push(el("td", { style: "text-align: center;" }, [btn]));
    });

    rows.push(el("tr", {}, cols));
  });

  const upperSumCols = [el("td", { text: "Upper Subtotal", style: "font-weight: bold; font-size: 0.85rem;" })];
  players.forEach((name, pIdx) => {
    upperSumCols.push(el("td", { text: `${playerStats[pIdx].upperSum} / 63`, style: "font-weight: bold; text-align: center; font-size: 0.85rem;" }));
  });
  rows.push(el("tr", { style: "background: rgba(255,255,255,0.01);" }, upperSumCols));

  const upperBonusCols = [el("td", { text: "Upper Bonus (+35)", style: "font-weight: bold; font-size: 0.85rem;" })];
  players.forEach((name, pIdx) => {
    upperBonusCols.push(el("td", {
      text: playerStats[pIdx].upperBonus > 0 ? "+35" : "0",
      className: playerStats[pIdx].upperBonus > 0 ? "text-success" : "muted",
      style: "font-weight: bold; text-align: center; font-size: 0.85rem;"
    }));
  });
  rows.push(el("tr", { style: "background: rgba(255,255,255,0.01);" }, upperBonusCols));

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
        onClick: () => openScoreSelector(yState, pIdx, cat)
      });
      cols.push(el("td", { style: "text-align: center;" }, [btn]));
    });

    rows.push(el("tr", {}, cols));
  });

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

  // Integrated Virtual Dice Roller panel (above scorecard or side-by-side)
  const rollerPanel = el("div", {
    className: "panel center",
    style: "background: #0b1a20; padding: 12px; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; width: 100%; margin-bottom: 20px;"
  });

  function drawRollerPanel() {
    rollerPanel.innerHTML = "";
    
    const titleRow = el("div", {
      style: "display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 8px;"
    }, [
      el("h4", { text: "Embedded Virtual Roller", style: "margin: 0; font-size: 0.9rem;" }),
      el("div", {
        text: `Rolls Left: ${yState.rollsLeft}`,
        style: "font-size: 0.8rem; font-weight: bold; color: var(--sunset-soft);"
      })
    ]);

    const diceGrid = el("div", { style: "display: flex; gap: 8px; justify-content: center; margin: 12px 0;" });
    yState.virtualDice.forEach((die, dIdx) => {
      const dFace = renderDiceFaceSVG(die.val, die.held);
      const card = el("div", {
        className: "dice-box" + (die.held ? " held" : "") + (yState.virtualRolling && !die.held ? " rolling" : ""),
        style: `width: 44px; height: 44px; padding: 2px; border: 2px solid ${die.held ? "var(--sunset-soft)" : "rgba(255,255,255,0.1)"}; border-radius: 8px; cursor: pointer;`,
        onClick: () => {
          if (yState.virtualRolling) return;
          die.held = !die.held;
          drawRollerPanel();
        }
      }, [dFace]);
      diceGrid.appendChild(card);
    });

    const rollBtn = el("button", {
      className: "btn small",
      text: yState.rollsLeft === 0 ? "No Rolls Left" : "Roll Dice",
      disabled: yState.rollsLeft === 0 || yState.virtualRolling,
      style: "margin: 0; flex: 1;",
      onClick: () => {
        if (yState.rollsLeft <= 0 || yState.virtualRolling) return;
        yState.virtualRolling = true;
        rollBtn.disabled = true;

        let clicks = 0;
        const limit = 8;
        const interval = setInterval(() => {
          yState.virtualDice.forEach(d => {
            if (!d.held) d.val = Math.floor(Math.random() * 6) + 1;
          });
          drawRollerPanel();
          playClickTone(480 + Math.random() * 120, 0.03);
          clicks++;

          if (clicks >= limit) {
            clearInterval(interval);
            yState.virtualRolling = false;
            
            yState.virtualDice.forEach(d => {
              if (!d.held) d.val = Math.floor(Math.random() * 6) + 1;
            });
            yState.rollsLeft--;
            playClickTone(750, 0.07);
            drawRollerPanel();
          }
        }, 80);
      }
    });

    const resetRollerBtn = el("button", {
      className: "btn ghost small error",
      text: "Reset",
      style: "margin: 0;",
      onClick: () => {
        yState.rollsLeft = 3;
        yState.virtualDice = Array(5).fill(null).map(() => ({ val: 1, held: false }));
        yState.virtualRolling = false;
        drawRollerPanel();
      }
    });

    const actionWrap = el("div", { style: "display: flex; gap: 8px; width:100%;" }, [resetRollerBtn, rollBtn]);

    rollerPanel.appendChild(titleRow);
    rollerPanel.appendChild(diceGrid);
    rollerPanel.appendChild(actionWrap);
  }

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
    el("div", { className: "panel center", style: "max-width: 720px; margin: 0 auto; padding: 12px;" }, [
      rollerPanel,
      table,
      el("div", { style: "display: flex; gap: 8px; justify-content: center;" }, [leaveBtn])
    ])
  );

  drawRollerPanel();
}

function openScoreSelector(yState, pIdx, category) {
  const currentVal = yState.scores[pIdx][category.id];
  let inputVal = currentVal !== null ? String(currentVal) : "";

  // Auto-fill suggestion if they used the virtual roller!
  const hasRolledVals = yState.virtualDice.map(d => d.val);
  const suggestedScore = getSuggestedYahtzeeScore(category.id, hasRolledVals);
  
  if (suggestedScore !== null && inputVal === "") {
    inputVal = String(suggestedScore);
  }

  const title = el("h3", { text: `Enter ${yState.players[pIdx]}'s Score` });
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

  // If there's an active virtual roll, add it as a suggested button!
  if (suggestedScore !== null) {
    if (!quickOptions.includes(suggestedScore)) {
      quickOptions.unshift(suggestedScore);
    }
  }

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
      yState.scores[pIdx][category.id] = isNaN(parsed) ? 0 : parsed;
      
      // Auto-reset virtual roller for the next player!
      yState.rollsLeft = 3;
      yState.virtualDice = Array(5).fill(null).map(() => ({ val: 1, held: false }));
      yState.virtualRolling = false;

      modal.remove();
      renderBoard(yState);
    }
  });

  const scratchBtn = el("button", {
    className: "btn error ghost",
    text: "Scratch (0)",
    style: "margin-top: 8px;",
    onClick: () => {
      yState.scores[pIdx][category.id] = 0;
      
      yState.rollsLeft = 3;
      yState.virtualDice = Array(5).fill(null).map(() => ({ val: 1, held: false }));
      yState.virtualRolling = false;

      modal.remove();
      renderBoard(yState);
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

// ── Yahtzee Score computation helper for roller suggestions ──────────────────
function getSuggestedYahtzeeScore(catId, vals) {
  if (!vals || vals.length === 0) return null;

  const counts = Array(7).fill(0);
  vals.forEach(v => counts[v]++);
  const sumOfAll = vals.reduce((a, b) => a + b, 0);

  // Upper section cats sug
  if (catId === "ones") return counts[1] * 1;
  if (catId === "twos") return counts[2] * 2;
  if (catId === "threes") return counts[3] * 3;
  if (catId === "fours") return counts[4] * 4;
  if (catId === "fives") return counts[5] * 5;
  if (catId === "sixes") return counts[6] * 6;

  // 3 of a kind
  if (catId === "three_kind") {
    const ok = counts.some(c => c >= 3);
    return ok ? sumOfAll : 0;
  }
  // 4 of a kind
  if (catId === "four_kind") {
    const ok = counts.some(c => c >= 4);
    return ok ? sumOfAll : 0;
  }

  // Full house
  if (catId === "full_house") {
    const has3 = counts.some(c => c === 3);
    const has2 = counts.some(c => c === 2);
    // Yahtzee can also act as full house
    const has5 = counts.some(c => c === 5);
    return (has3 && has2) || has5 ? 25 : 0;
  }

  // Small straight (4 consecutive)
  if (catId === "sm_straight") {
    // Check subsets: 1234, 2345, 3456
    const has = (f) => counts[f] > 0;
    const ok = (has(1) && has(2) && has(3) && has(4)) ||
               (has(2) && has(3) && has(4) && has(5)) ||
               (has(3) && has(4) && has(5) && has(6));
    return ok ? 30 : 0;
  }

  // Large straight (5 consecutive)
  if (catId === "lg_straight") {
    const has = (f) => counts[f] > 0;
    const ok = (has(1) && has(2) && has(3) && has(4) && has(5)) ||
               (has(2) && has(3) && has(4) && has(5) && has(6));
    return ok ? 40 : 0;
  }

  // Yahtzee
  if (catId === "yahtzee") {
    const ok = counts.some(c => c === 5);
    return ok ? 50 : 0;
  }

  // Chance
  if (catId === "chance") {
    return sumOfAll;
  }

  return null;
}
