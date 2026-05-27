// Modular Farkle Scorekeeper for PWA.
import { el, mount, toast, store } from "../ui.js";
import { icons } from "../icons.js";

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
      initGame(cleaned);
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

function initGame(players) {
  const gameStates = players.map(() => ({
    total: 0,
    history: [],
    onBoard: false
  }));
  renderBoard(players, gameStates, 0);
}

function renderBoard(players, states, activePlayerIdx) {
  const standings = players.map((name, pIdx) => ({
    name,
    pIdx,
    total: states[pIdx].total,
    onBoard: states[pIdx].onBoard
  })).sort((a, b) => b.total - a.total);

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

      if (activeState.total >= 10000) {
        toast(`🏆🏆🏆 ${activePlayerName} has won the game with ${activeState.total} points!`);
      }

      const nextIdx = (activePlayerIdx + 1) % players.length;
      renderBoard(players, states, nextIdx);
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
      renderBoard(players, states, nextIdx);
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
        el("div", {}, [
          el("h2", { text: "Standings", style: "font-size: 1.1rem; margin-top: 0; letter-spacing: 0.5px;" }),
          ...playerBlocks,
          el("div", { className: "panel center", style: "margin-top: 16px;" }, [
            el("h3", { text: "Leaderboard Summary", style: "font-size: 0.9rem; margin-top: 0;" }),
            ...standingsList
          ])
        ]),
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
