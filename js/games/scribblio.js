// Modular Scribbl.io co-located drawing game engine.
import { el, mount, toast, store, shuffle } from "../ui.js";
import { icons } from "../icons.js";

let goHome = () => {};

const WORD_POOL = [
  "Canoe", "Marshmallow", "Mosquito", "Campfire", "Sleeping bag", "Pinecone", "Dock", 
  "Squirrel", "Cabin", "Beaver", "Fishing rod", "Compass", "Life jacket", "Bear", 
  "Wildfire", "Watermelon", "Sunscreen", "Flip flops", "Paddle board", "Treehouse", 
  "Sunglasses", "Flashlight", "Hammock", "Hot dog", "Thermos", "Rainbow", "Fire pit",
  "Sailboat", "Bicycle", "Acorn", "Turtle", "Spider web", "Fountain", "Anchor"
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
  renderSetup();
}

function renderSetup() {
  const savedNames = store.get("scribbl.names", ["Alice", "Bob", "Charlie"]);
  let names = savedNames.slice();

  const listWrap = el("div", { id: "scribPlayerList", style: "margin: 16px 0;" });

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
            if (names.length > 2) {
              names.splice(i, 1);
              drawList();
            } else {
              toast("Scribbl.io needs at least 2 players.");
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
        toast("Max 8 players for local play.");
      }
    }
  });

  const startBtn = el("button", {
    className: "btn",
    text: "Start Scribbl.io",
    onClick: () => {
      const cleaned = names.map(n => n.trim() || "Player").slice(0, 8);
      if (cleaned.length < 2) {
        toast("Scribbl.io needs at least 2 players.");
        return;
      }
      store.set("scribbl.names", cleaned);
      initGame(cleaned);
    }
  });

  drawList();

  mount(
    gameTopbar("Scribbl.io local", goHome),
    el("div", { className: "panel center", style: "max-width: 480px; margin: 0 auto;" }, [
      el("div", { style: "width:64px; height:64px; margin:0 auto 12px; color:var(--sunset-soft);" }, [icons.sibling()]),
      el("h2", { text: "Scribbl.io Setup" }),
      el("p", { className: "muted", text: "One player draws a secret word on canvas, while other players sit around and shout out guesses! Mark who got it right to score points." }),
      listWrap,
      addBtn,
      el("div", { className: "spacer" }),
      startBtn
    ])
  );
}

function initGame(players) {
  const scores = {};
  players.forEach(p => { scores[p] = 0; });

  const state = {
    players,
    scores,
    wordPool: shuffle(WORD_POOL),
    drawerIdx: 0,
    round: 1,
    maxRounds: 2,
    timerDuration: 60, // seconds
    activeWord: "",
    timeLeft: 60,
    timerInterval: null
  };

  startNextDrawerTurn(state);
}

function startNextDrawerTurn(state) {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }

  if (state.drawerIdx >= state.players.length) {
    // Round complete!
    state.drawerIdx = 0;
    state.round++;
    if (state.round > state.maxRounds) {
      renderGameResults(state);
      return;
    } else {
      renderRoundScores(state);
      return;
    }
  }

  const drawerName = state.players[state.drawerIdx];

  // Pick 3 word choices
  if (state.wordPool.length < 5) {
    state.wordPool = shuffle(WORD_POOL);
  }
  const choices = [
    state.wordPool.pop(),
    state.wordPool.pop(),
    state.wordPool.pop()
  ];

  // Pass screen
  const container = el("div", { className: "panel center", style: "max-width: 480px; margin: 30px auto; padding: 24px;" }, [
    el("h2", { text: `Pass the Device!` }),
    el("p", { className: "muted", style: "font-size: 1.1rem; margin: 20px 0;", html: `Hand the phone secretly to <strong style="color:var(--sunset-soft); font-size: 1.3rem;">${drawerName}</strong>.` }),
    el("button", {
      className: "btn",
      text: "I am the drawer",
      onClick: () => renderWordSelect(state, choices, drawerName)
    })
  ]);

  mount(gameTopbar(`Scribbl.io — Round ${state.round}`, () => confirmQuit(state)), container);
}

function renderWordSelect(state, choices, drawerName) {
  const choicesDiv = el("div", { style: "display: flex; flex-direction: column; gap: 8px; margin: 16px 0;" });
  choices.forEach(word => {
    choicesDiv.appendChild(el("button", {
      className: "btn ghost",
      text: word,
      onClick: () => {
        state.activeWord = word;
        startDrawingCanvas(state, drawerName);
      }
    }));
  });

  const customInput = el("input", {
    type: "text",
    placeholder: "Or write a custom word...",
    maxlength: 20,
    style: "font-size: 1.1rem; border-radius: 12px; text-align: center; margin-top: 12px;"
  });

  const customBtn = el("button", {
    className: "btn",
    text: "Use Custom Word",
    onClick: () => {
      const val = customInput.value.trim();
      if (!val) {
        toast("Please enter a custom word!");
        return;
      }
      state.activeWord = val;
      startDrawingCanvas(state, drawerName);
    }
  });

  mount(
    gameTopbar(`Scribbl.io — Word Choice`, () => confirmQuit(state)),
    el("div", { className: "panel center", style: "max-width: 480px; margin: 0 auto;" }, [
      el("h3", { text: `${drawerName}'s Choice`, style: "color:var(--sunset-soft);" }),
      el("p", { className: "muted", text: "Select a secret word to draw. Do not show your screen to other players yet!" }),
      choicesDiv,
      el("div", { className: "spacer" }),
      customInput,
      customBtn
    ])
  );
}

function startDrawingCanvas(state, drawerName) {
  state.timeLeft = state.timerDuration;

  const canvas = el("canvas", {
    style: "background: #112228; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; cursor: crosshair; touch-action: none; width: 100%; display: block; box-shadow: inset 0 2px 8px rgba(0,0,0,0.5);"
  });

  const timerDisplay = el("div", {
    text: `${state.timeLeft}s`,
    style: "font-size: 1.8rem; font-weight: bold; color: var(--sunset-soft); text-align: center; margin-bottom: 8px;"
  });

  const wordLengthHint = state.activeWord.split("").map(c => c === " " ? "  " : "_").join(" ");
  const wordHintEl = el("div", {
    text: `Word length: ${wordLengthHint}`,
    style: "font-size: 0.95rem; font-weight: bold; margin-bottom: 12px; text-align: center; font-family: monospace; letter-spacing: 2px;"
  });

  const undoBtn = el("button", { className: "btn ghost small", text: "Undo", style: "margin: 0;" });
  const clearBtn = el("button", { className: "btn ghost small error", text: "Clear", style: "margin: 0;" });

  const colors = ["#ff9164", "#00ffaa", "#38bdf8", "#facc15", "#f3f4f6", "#0b1619"];
  const colorLabels = ["Sunset", "Aqua", "Sky", "Lemon", "White", "Eraser"];
  let activeColor = colors[0];

  const colorRow = el("div", { style: "display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; margin-bottom: 8px;" });
  colors.forEach((c, idx) => {
    const isEraser = c === "#0b1619";
    const btn = el("button", {
      className: idx === 0 ? "btn small" : "btn ghost small",
      text: colorLabels[idx],
      style: `padding: 4px 10px; margin:0; border: 1px solid ${c}; background: ${isEraser ? '#0b1619' : 'transparent'}; color: ${isEraser ? '#fff' : c};`,
      onClick: () => {
        activeColor = c;
        Array.from(colorRow.children).forEach(b => b.classList.add("ghost"));
        btn.classList.remove("ghost");
      }
    });
    colorRow.appendChild(btn);
  });

  let activeBrushSize = 5;
  const brushRow = el("div", { style: "display: flex; gap: 8px; justify-content: center; margin-bottom: 16px;" });
  [3, 6, 12].forEach((size, sIdx) => {
    const btn = el("button", {
      className: sIdx === 1 ? "btn small" : "btn ghost small",
      text: size === 3 ? "Thin" : (size === 6 ? "Medium" : "Thick"),
      style: "padding: 4px 12px; margin:0;",
      onClick: () => {
        activeBrushSize = size;
        Array.from(brushRow.children).forEach(b => b.classList.add("ghost"));
        btn.classList.remove("ghost");
      }
    });
    brushRow.appendChild(btn);
  });

  // Hotseat buttons for tracking guesses
  const guessedBtn = el("button", {
    className: "btn",
    text: "🎉 Guessed Correctly! 🎉",
    style: "background: linear-gradient(135deg, #00ffaa, #00b377); color: #071410; font-weight: bold;",
    onClick: () => {
      clearInterval(state.timerInterval);
      openWinnerModal(state, drawerName);
    }
  });

  const revealBtn = el("button", {
    className: "btn error ghost",
    text: "Forfeit / Reveal Word",
    onClick: () => {
      clearInterval(state.timerInterval);
      toast(`Word was: "${state.activeWord}"`);
      state.drawerIdx++;
      startNextDrawerTurn(state);
    }
  });

  const layout = el("div", { className: "panel center", style: "max-width: 500px; margin: 0 auto;" }, [
    el("div", { style: "display:flex; justify-content:space-between; align-items:center; width:100%; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:8px; margin-bottom:8px;" }, [
      el("div", { text: `Drawing: "${state.activeWord}"`, style: "font-weight: bold; color: var(--sunset-soft);" }),
      timerDisplay
    ]),
    wordHintEl,
    canvas,
    el("div", { style: "display:flex; gap:8px; justify-content:center; margin: 8px 0;" }, [undoBtn, clearBtn]),
    colorRow,
    brushRow,
    guessedBtn,
    revealBtn
  ]);

  mount(gameTopbar(`Scribbl.io — ${drawerName} is Drawing`, () => confirmQuit(state)), layout);

  // Setup canvas
  setupDrawingCanvas(canvas, undoBtn, clearBtn, () => activeColor, () => activeBrushSize);

  // Timer loop
  state.timerInterval = setInterval(() => {
    state.timeLeft--;
    timerDisplay.textContent = `${state.timeLeft}s`;

    // play quick beep for last 5 seconds
    if (state.timeLeft <= 5 && state.timeLeft > 0) {
      playBeep(800, 0.05);
    }

    if (state.timeLeft <= 0) {
      clearInterval(state.timerInterval);
      playBeep(250, 0.4); // buzzer
      toast(`⏱️ Time is up! The word was "${state.activeWord}".`);
      state.drawerIdx++;
      setTimeout(() => startNextDrawerTurn(state), 2000);
    }
  }, 1000);
}

function openWinnerModal(state, drawerName) {
  // Modal listing all other players to award the guess points
  const guessers = state.players.filter(p => p !== drawerName);

  const title = el("h3", { text: "Who guessed correctly?", style: "margin-top:0;" });
  const buttonsDiv = el("div", { style: "display:flex; flex-direction:column; gap:8px; margin: 16px 0;" });

  const modal = el("div", {
    className: "modal-overlay",
    style: "position: fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.85); z-index:100000; display:flex; align-items:center; justify-content:center;"
  });

  guessers.forEach(gName => {
    buttonsDiv.appendChild(el("button", {
      className: "btn",
      text: gName,
      onClick: () => {
        // Calculate points
        const basePoints = state.timeLeft * 8; // e.g. 30s left = 240 points
        const drawerBonus = Math.floor(basePoints / 2);

        state.scores[gName] += basePoints;
        state.scores[drawerName] += drawerBonus;

        toast(`🎉 ${gName} guessed it! +${basePoints} pts. ${drawerName} gets +${drawerBonus} pts!`);
        modal.remove();

        state.drawerIdx++;
        startNextDrawerTurn(state);
      }
    }));
  });

  const noOneBtn = el("button", {
    className: "btn error ghost",
    text: "Cancel / No One",
    onClick: () => {
      modal.remove();
      startDrawingCanvas(state, drawerName); // Resume timer basically or just resume
    }
  });

  const content = el("div", {
    className: "panel center",
    style: "max-width:320px; width:90%; background:#0b1a20; border:1px solid rgba(255,255,255,0.1); border-radius:16px; padding:20px; box-shadow:0 10px 40px rgba(0,0,0,0.5);"
  }, [
    title,
    el("p", { className: "muted", text: `Remaining time: ${state.timeLeft} seconds.` }),
    buttonsDiv,
    noOneBtn
  ]);

  modal.appendChild(content);
  document.body.appendChild(modal);
}

function setupDrawingCanvas(canvas, undoBtn, clearBtn, getColor, getBrushSize) {
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const W = rect.width || 400;
  const H = 240;
  canvas.width = W * window.devicePixelRatio;
  canvas.height = H * window.devicePixelRatio;
  canvas.style.height = `${H}px`;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  let drawing = false;
  let strokeHistory = [];
  let currentStroke = [];

  function drawStart(x, y) {
    drawing = true;
    currentStroke = [{ x, y }];
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = getColor();
    ctx.lineWidth = getBrushSize();
    ctx.stroke();
  }

  function drawMove(x, y) {
    if (!drawing) return;
    currentStroke.push({ x, y });
    ctx.lineTo(x, y);
    ctx.strokeStyle = getColor();
    ctx.lineWidth = getBrushSize();
    ctx.stroke();
  }

  function drawEnd() {
    if (!drawing) return;
    drawing = false;
    strokeHistory.push({
      stroke: currentStroke,
      color: getColor(),
      size: getBrushSize()
    });
  }

  canvas.addEventListener("mousedown", (e) => {
    const r = canvas.getBoundingClientRect();
    drawStart(e.clientX - r.left, e.clientY - r.top);
  });
  canvas.addEventListener("mousemove", (e) => {
    const r = canvas.getBoundingClientRect();
    drawMove(e.clientX - r.left, e.clientY - r.top);
  });
  window.addEventListener("mouseup", drawEnd);

  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const r = canvas.getBoundingClientRect();
    drawStart(touch.clientX - r.left, touch.clientY - r.top);
  });
  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const r = canvas.getBoundingClientRect();
    drawMove(touch.clientX - r.left, touch.clientY - r.top);
  });
  canvas.addEventListener("touchend", drawEnd);

  clearBtn.addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokeHistory = [];
  });

  undoBtn.addEventListener("click", () => {
    if (strokeHistory.length === 0) return;
    strokeHistory.pop();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokeHistory.forEach(item => {
      ctx.beginPath();
      ctx.strokeStyle = item.color;
      ctx.lineWidth = item.size;
      item.stroke.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
    });
  });
}

function playBeep(freq, duration) {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.01, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (_) {}
}

function renderRoundScores(state) {
  const standings = state.players.map(p => ({ name: p, score: state.scores[p] }))
    .sort((a, b) => b.score - a.score);

  const rows = standings.map((st, i) => {
    return el("div", {
      style: "display:flex; justify-content:space-between; align-items:center; padding:8px 16px; background:rgba(255,255,255,0.02); border-radius:10px; margin-bottom:8px;"
    }, [
      el("span", { text: `${i + 1}. ${st.name}`, style: "font-weight: 500;" }),
      el("span", { text: String(st.score), style: "font-weight: bold; color:var(--sunset-soft);" })
    ]);
  });

  const nextBtn = el("button", {
    className: "btn",
    text: `Start Round ${state.round} ➜`,
    onClick: () => startNextDrawerTurn(state)
  });

  mount(
    gameTopbar(`Scribbl.io — End of Round ${state.round - 1}`, () => confirmQuit(state)),
    el("div", { className: "panel center", style: "max-width: 440px; margin: 0 auto;" }, [
      el("h2", { text: "Current Scores" }),
      ...rows,
      el("div", { className: "spacer" }),
      nextBtn
    ])
  );
}

function renderGameResults(state) {
  const standings = state.players.map(p => ({ name: p, score: state.scores[p] }))
    .sort((a, b) => b.score - a.score);

  const rows = standings.map((st, i) => {
    const isWinner = i === 0;
    return el("div", {
      style: `display:flex; justify-content:space-between; align-items:center; padding:12px 18px; background:${isWinner ? "rgba(255,145,100,0.06)" : "rgba(255,255,255,0.01)"}; border:${isWinner ? "1px solid var(--sunset-soft)" : "1px solid rgba(255,255,255,0.06)"}; border-radius:12px; margin-bottom:10px;`
    }, [
      el("span", { style: "font-weight:bold; display:flex; align-items:center; gap:8px;" }, [
        document.createTextNode(`${i + 1}. ${st.name}`),
        isWinner ? el("span", { text: "👑 DRAWER CHAMPION", style: "font-size:0.7rem; color:var(--sunset-soft); font-weight:bold;" }) : null
      ]),
      el("span", { text: String(st.score), style: "font-weight:bold; font-size:1.2rem; color:var(--sunset-soft);" })
    ]);
  });

  mount(
    gameTopbar("Scribbl.io — Game Over", goHome),
    el("div", { className: "panel center", style: "max-width: 440px; margin: 0 auto;" }, [
      el("h1", { text: "Game Completed!", style: "font-size:2rem; font-weight:900; color:var(--sunset-soft);" }),
      el("p", { className: "muted", text: "Incredible masterpieces were drawn. Here is the final scoreboard:" }),
      ...rows,
      el("div", { className: "spacer" }),
      el("button", { className: "btn", text: "Back to Lobby", onClick: goHome })
    ])
  );
}

function confirmQuit(state) {
  if (confirm("Are you sure you want to quit this Scribbl.io game?")) {
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
    }
    goHome();
  }
}
