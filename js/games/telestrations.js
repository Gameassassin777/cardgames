// Modular Telestrations local pass-and-play game engine.
import { el, mount, toast, store, shuffle } from "../ui.js";
import { icons } from "../icons.js";

let goHome = () => {};

const STARTING_WORDS = [
  "Screaming Beaver", "Mosquito Bite", "Canoe Flip", "Burnt Hot Dog", "Sunburn Paint", 
  "Sleeping Bag Monster", "Tangled Fishing Line", "S'more Fight", "Bear in a Hammock", 
  "Pinecone Grenade", "Treehouse Party", "Leaky Tent", "Midnight Ghost", "Chore Evader",
  "Raccoon Robber", "Skunk Spray", "Dirty Hiking Boot", "Cold Plunge", "Dock Jump", 
  "Lost Compass", "Frog Catching", "Squirrel Gang", "Lake Monster", "Wet Socks"
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
  const savedNames = store.get("telestrations.names", ["Alice", "Bob", "Charlie", "Dave"]);
  let names = savedNames.slice();

  const listWrap = el("div", { id: "telPlayerList", style: "margin: 16px 0;" });

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
            if (names.length > 3) {
              names.splice(i, 1);
              drawList();
            } else {
              toast("Telestrations needs at least 3 players.");
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
        toast("Max 8 players for local pass-and-play.");
      }
    }
  });

  const startBtn = el("button", {
    className: "btn",
    text: "Start Telestrations",
    onClick: () => {
      const cleaned = names.map(n => n.trim() || "Player").slice(0, 8);
      if (cleaned.length < 3) {
        toast("Telestrations needs at least 3 players.");
        return;
      }
      store.set("telestrations.names", cleaned);
      initGame(cleaned);
    }
  });

  drawList();

  mount(
    gameTopbar("Telestrations local", goHome),
    el("div", { className: "panel center", style: "max-width: 480px; margin: 0 auto;" }, [
      el("div", { style: "width:64px; height:64px; margin:0 auto 12px; color:var(--sunset-soft);" }, [icons.doodles()]),
      el("h2", { text: "Telestrations Setup" }),
      el("p", { className: "muted", text: "A telephone game alternating between drawing and writing guesses. 3 to 8 players. Pass the device secretly between turns." }),
      listWrap,
      addBtn,
      el("div", { className: "spacer" }),
      startBtn
    ])
  );
}

function initGame(players) {
  // Setup game state
  // We have N players, and N "books".
  // Book i starts with Player i (step 0).
  // At step j (from 1 to N-1), Book i is processed by Player (i + j) % N.
  // Book state: { owner: Player i, steps: [ { type: "text"|"draw", value: String, author: String } ] }
  const N = players.length;
  const wordPool = shuffle(STARTING_WORDS);

  const books = players.map((pName, pIdx) => {
    // Generate 3 word choices for step 0
    const choices = [
      wordPool.pop() || "Campfire",
      wordPool.pop() || "Canoe",
      wordPool.pop() || "Sunburn"
    ];
    return {
      ownerIdx: pIdx,
      ownerName: pName,
      choices,
      steps: [] // list of { type: "text" | "draw", value: String (text or dataUrl), author: String }
    };
  });

  const state = {
    players,
    books,
    currentStepIdx: 0, // 0 = picking initial words, 1 = first drawing, 2 = first guess...
    currentBookQueueIdx: 0, // index in books array for active step
  };

  runNextTurn(state);
}

function runNextTurn(state) {
  const N = state.players.length;
  const step = state.currentStepIdx;

  if (step >= N) {
    // Game completed! Go to review phase!
    startReviewPhase(state);
    return;
  }

  if (state.currentBookQueueIdx >= N) {
    // Completed this step for all books! Move to next step.
    state.currentStepIdx++;
    state.currentBookQueueIdx = 0;
    runNextTurn(state);
    return;
  }

  const bIdx = state.currentBookQueueIdx;
  const book = state.books[bIdx];

  // Who is processing this book at this step?
  // Step 0: owner (bIdx)
  // Step j: (bIdx + j) % N
  const playerIdx = (bIdx + step) % N;
  const currentPlayerName = state.players[playerIdx];

  // Render "Pass the device to [Name]"
  const promptBlurb = step === 0 
    ? "pick their starting secret word"
    : (step % 2 === 1 ? "draw the secret word/phrase" : "guess the drawing");

  const container = el("div", { className: "panel center", style: "max-width: 480px; margin: 30px auto; padding: 24px;" }, [
    el("h2", { text: `Pass the Device!` }),
    el("p", { className: "muted", style: "font-size: 1.1rem; margin: 20px 0;", html: `Hand the phone secretly to <strong style="color:var(--sunset-soft); font-size: 1.3rem;">${currentPlayerName}</strong> to <strong style="color:var(--sunset-soft);">${promptBlurb}</strong>.` }),
    el("button", {
      className: "btn",
      text: "I am ready",
      onClick: () => {
        if (step === 0) {
          renderWordSelect(state, book, currentPlayerName);
        } else if (step % 2 === 1) {
          // Drawing round
          const lastStep = book.steps[step - 1];
          renderDrawingRound(state, book, lastStep.value, currentPlayerName);
        } else {
          // Guessing round
          const lastStep = book.steps[step - 1];
          renderGuessingRound(state, book, lastStep.value, currentPlayerName);
        }
      }
    })
  ]);

  mount(gameTopbar(`Telestrations — Turn`, () => confirmQuit(state)), container);
}

// ── Turn 0: Word Selection ───────────────────────────────────────────────────
function renderWordSelect(state, book, pName) {
  const choicesDiv = el("div", { style: "display: flex; flex-direction: column; gap: 8px; margin: 16px 0;" });
  
  book.choices.forEach(word => {
    choicesDiv.appendChild(el("button", {
      className: "btn ghost",
      text: word,
      onClick: () => {
        book.steps.push({ type: "text", value: word, author: pName });
        state.currentBookQueueIdx++;
        runNextTurn(state);
      }
    }));
  });

  const customInput = el("input", {
    type: "text",
    placeholder: "Or write your own word...",
    maxlength: 30,
    style: "font-size: 1.1rem; border-radius: 12px; text-align: center; margin-top: 12px;"
  });

  const customBtn = el("button", {
    className: "btn",
    text: "Use Custom Word",
    onClick: () => {
      const val = customInput.value.trim();
      if (!val) {
        toast("Please write a secret word first!");
        return;
      }
      book.steps.push({ type: "text", value: val, author: pName });
      state.currentBookQueueIdx++;
      runNextTurn(state);
    }
  });

  mount(
    gameTopbar("Telestrations — Choose Word", () => confirmQuit(state)),
    el("div", { className: "panel center", style: "max-width: 480px; margin: 0 auto;" }, [
      el("h3", { text: `${pName}'s Turn`, style: "color: var(--sunset-soft);" }),
      el("p", { className: "muted", text: "Select a secret word/phrase that you will pass on to be drawn by the next player!" }),
      choicesDiv,
      el("div", { className: "spacer" }),
      customInput,
      customBtn
    ])
  );
}

// ── Drawing Round ────────────────────────────────────────────────────────────
function renderDrawingRound(state, book, secretWord, pName) {
  // Standard drawing board container
  const canvas = el("canvas", {
    style: "background: #112228; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; cursor: crosshair; touch-action: none; width: 100%; display: block; box-shadow: inset 0 2px 8px rgba(0,0,0,0.5);"
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
  const brushRow = el("div", { style: "display: flex; gap: 8px; justify-content: center; margin-bottom: 12px;" });
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

  const submitBtn = el("button", {
    className: "btn",
    text: "Submit Drawing",
    onClick: () => {
      const dataUrl = canvas.toDataURL("image/png", 0.4); // Compress a bit
      book.steps.push({ type: "draw", value: dataUrl, author: pName });
      state.currentBookQueueIdx++;
      runNextTurn(state);
    }
  });

  const drawingLayout = el("div", { className: "panel center", style: "max-width: 500px; margin: 0 auto;" }, [
    el("h3", { text: `${pName} is Drawing!`, style: "color:var(--sunset-soft); margin-top:0;" }),
    el("p", { className: "muted", style: "margin: 4px 0 12px;", html: `Draw this: <strong style="color:#00ffaa; font-size:1.15rem;">${secretWord}</strong>` }),
    canvas,
    el("div", { style: "display:flex; gap:8px; justify-content:center; margin: 8px 0;" }, [undoBtn, clearBtn]),
    colorRow,
    brushRow,
    submitBtn
  ]);

  mount(gameTopbar("Telestrations — Drawing", () => confirmQuit(state)), drawingLayout);

  // Setup canvas interaction
  setupDrawingCanvas(canvas, undoBtn, clearBtn, () => activeColor, () => activeBrushSize);
}

function setupDrawingCanvas(canvas, undoBtn, clearBtn, getColor, getBrushSize) {
  const ctx = canvas.getContext("2d");
  
  // Set dimensions based on client bounds
  const rect = canvas.getBoundingClientRect();
  const W = rect.width || 400;
  const H = 260;
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

  // Mouse bindings
  canvas.addEventListener("mousedown", (e) => {
    const r = canvas.getBoundingClientRect();
    drawStart(e.clientX - r.left, e.clientY - r.top);
  });
  canvas.addEventListener("mousemove", (e) => {
    const r = canvas.getBoundingClientRect();
    drawMove(e.clientX - r.left, e.clientY - r.top);
  });
  window.addEventListener("mouseup", drawEnd);

  // Touch bindings
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

  // Clear Canvas
  clearBtn.addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokeHistory = [];
  });

  // Undo Functionality
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

// ── Guessing Round ───────────────────────────────────────────────────────────
function renderGuessingRound(state, book, drawingDataUrl, pName) {
  const drawingImg = el("img", {
    src: drawingDataUrl,
    style: "background: #112228; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; width: 100%; display: block; margin-bottom: 12px; max-height: 260px; object-fit: contain; box-shadow: 0 4px 16px rgba(0,0,0,0.5);"
  });

  const guessInput = el("input", {
    type: "text",
    placeholder: "What is this drawing? Guess...",
    maxlength: 30,
    style: "font-size: 1.15rem; border-radius: 14px; text-align: center; width: 100%;"
  });

  const submitBtn = el("button", {
    className: "btn",
    text: "Submit Guess",
    onClick: () => {
      const val = guessInput.value.trim();
      if (!val) {
        toast("Please make a guess first!");
        return;
      }
      book.steps.push({ type: "text", value: val, author: pName });
      state.currentBookQueueIdx++;
      runNextTurn(state);
    }
  });

  const guessLayout = el("div", { className: "panel center", style: "max-width: 480px; margin: 0 auto;" }, [
    el("h3", { text: `${pName}'s Turn to Guess!`, style: "color:var(--sunset-soft); margin-top:0;" }),
    el("p", { className: "muted", text: "Look closely at the drawing below and write down what you think it represents." }),
    drawingImg,
    guessInput,
    el("div", { className: "spacer" }),
    submitBtn
  ]);

  mount(gameTopbar("Telestrations — Guessing", () => confirmQuit(state)), guessLayout);
  guessInput.focus();
}

// ── Review Phase ─────────────────────────────────────────────────────────────
function startReviewPhase(state) {
  renderReviewBook(state, 0, 0);
}

function renderReviewBook(state, bookIdx, stepIdx) {
  const book = state.books[bookIdx];
  const step = book.steps[stepIdx];
  
  if (!step) {
    // Completed review for this book! Go to next book
    if (bookIdx + 1 < state.books.length) {
      renderReviewBook(state, bookIdx + 1, 0);
    } else {
      // Completed all books! Return to Lobby
      renderFinalScreen(state);
    }
    return;
  }

  // Draw chain components
  const chainWrap = el("div", { style: "margin: 16px 0; min-height: 240px; display: flex; flex-direction: column; align-items: center; justify-content: center;" });

  if (step.type === "text") {
    const isFirst = stepIdx === 0;
    chainWrap.appendChild(el("div", {
      className: "panel center",
      style: `background: ${isFirst ? "rgba(255,145,100,0.06)" : "rgba(255,255,255,0.02)"}; border: 1px solid ${isFirst ? "var(--sunset-soft)" : "rgba(255,255,255,0.08)"}; border-radius: 12px; padding: 24px 16px; width: 100%;`
    }, [
      el("div", { text: isFirst ? `${step.author}'s Starting Word` : `${step.author}'s Guess`, style: "font-size:0.75rem; text-transform:uppercase; color:var(--sunset-soft); margin-bottom:8px; font-weight:bold; letter-spacing:0.5px;" }),
      el("h2", { text: `"${step.value}"`, style: "font-size: 1.8rem; font-weight: 900; margin: 0;" })
    ]));
  } else {
    // Drawing
    chainWrap.appendChild(el("div", {
      className: "panel center",
      style: "background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 12px; width: 100%;"
    }, [
      el("div", { text: `Drawn by ${step.author}`, style: "font-size:0.75rem; text-transform:uppercase; color:var(--sunset-soft); margin-bottom:8px; font-weight:bold; letter-spacing:0.5px;" }),
      el("img", { src: step.value, style: "background: #112228; border-radius: 8px; width:100%; max-height:220px; object-fit:contain;" })
    ]));
  }

  // Next steps or next book button
  const hasMoreSteps = stepIdx + 1 < book.steps.length;
  const isLastBook = bookIdx + 1 === state.books.length;

  const btnText = hasMoreSteps 
    ? "Reveal Next Chain Item ➜"
    : (isLastBook ? "Finish Game Review 🏆" : `Move to ${state.books[bookIdx+1].ownerName}'s Book ➜`);

  const nextBtn = el("button", {
    className: "btn",
    text: btnText,
    onClick: () => {
      if (hasMoreSteps) {
        renderReviewBook(state, bookIdx, stepIdx + 1);
      } else {
        renderReviewBook(state, bookIdx + 1, 0);
      }
    }
  });

  const progressText = `${bookIdx + 1}/${state.books.length} Books • Step ${stepIdx + 1}/${book.steps.length}`;

  mount(
    gameTopbar(`${book.ownerName}'s Book Review`, goHome),
    el("div", { className: "panel center", style: "max-width: 500px; margin: 0 auto;" }, [
      el("p", { className: "muted", text: progressText, style: "font-size:0.75rem;" }),
      chainWrap,
      el("div", { className: "spacer" }),
      nextBtn
    ])
  );
}

function renderFinalScreen(state) {
  mount(
    gameTopbar("Telestrations — End", goHome),
    el("div", { className: "panel center", style: "max-width: 480px; margin: 0 auto;" }, [
      el("h1", { text: "Review Complete!", style: "color:var(--sunset-soft); font-size:2.2rem; font-weight:900;" }),
      el("p", { className: "muted", text: "That was absolute chaotic gold. Thanks for playing!" }),
      el("div", { className: "spacer" }),
      el("button", { className: "btn", text: "Back to Lobby", onClick: goHome })
    ])
  );
}

function confirmQuit(state) {
  if (confirm("Are you sure you want to end this Telestrations game?")) {
    goHome();
  }
}
