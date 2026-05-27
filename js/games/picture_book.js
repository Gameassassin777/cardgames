// Modular Illustrated Storybook / Cozy Chronicles party game.
import { el, mount, toast, shuffle } from "../ui.js";
import { icons } from "../icons.js";
import { renderDiceFaceSVG } from "./dice_hub.js";

let goHome = () => {};

const STORIES = {
  3: [
    {
      title: "The Glowing Marshmallow 🏕️",
      sentences: [
        "A hungry camper finds a legendary, glowing golden marshmallow deep in the dark woods.",
        "A swarm of tiny mosquitoes wearing miniature pirate hats guards the marshmallow with pinecone swords.",
        "The camper distracts the mosquito pirates with bug spray and takes a massive, gooey bite."
      ]
    },
    {
      title: "The Dock Cannonball 💦",
      sentences: [
        "A brave beaver wearing professional swimming goggles prepares to jump off the high cabin dock.",
        "He launches into the starry sky, doing three backflips and a massive cannonball splash.",
        "He splashes directly into the mouth of an extremely surprised, giant green lake fish."
      ]
    }
  ],
  4: [
    {
      title: "The Lost Tourist 🗺️",
      sentences: [
        "A lost tourist wearing a bright yellow bucket hat attempts to read a upside-down map on a mossy log.",
        "A sneaky raccoon wearing sunglasses steals the map and climbs up a tall pine tree.",
        "The tourist climbs up the tree to retrieve the map but gets tangled in a giant, glowing spiderweb.",
        "The raccoon takes a silly selfie with the trapped tourist using a stolen smartphone."
      ]
    },
    {
      title: "The Canoe Captain 🛶",
      sentences: [
        "A duck wearing a fancy pirate hat takes steering control of a shiny red canoe.",
        "A sudden giant wave capsizes the canoe, sending the duck captain flying high into the clouds.",
        "A friendly blue lake monster catches the falling duck perfectly on its wet head.",
        "The lake monster and duck sail off into the sunset sharing a bag of potato chips."
      ]
    }
  ],
  5: [
    {
      title: "The Stressed Bear 🐻",
      sentences: [
        "A stressed-out brown bear decides to brew a giant, steaming mug of hot coffee in the cabin.",
        "He drinks it and gets so energized that he starts moonwalking through the forest path.",
        "The bear runs into a squirrel hip-hop dance battle taking place in a sunny clearing.",
        "He attempts a wild headspin but crashes face-first into a giant pile of soft autumn leaves.",
        "All the forest critters celebrate his performance and award him a gold pinecone trophy."
      ]
    },
    {
      title: "The Spa Day 🧖‍♂️",
      sentences: [
        "A tired bear decides to have a relaxing spa day inside a steaming hot spring.",
        "Two friendly raccoons place fresh cucumber slices over the bear's eyes and massage his shoulders.",
        "A giant trout jumps out of the water to join the hot tub spa session.",
        "The bear gets startled, slips on a bar of soap, and rolls down the muddy hill.",
        "He lands perfectly inside a cozy sleeping bag, completely warm and fast asleep."
      ]
    }
  ],
  6: [
    {
      title: "The Frog Saloon 🐸",
      sentences: [
        "A tiny green frog wearing a ten-gallon cowboy hat rides a majestic raccoon like a horse.",
        "They arrive at the Forest Saloon and order two shots of cold morning dew from a squirrel bartender.",
        "Suddenly, a rival gang of angry chipmunks bursts through the swinging wooden doors.",
        "The saloon erupts into a chaotic food fight, with everyone throwing wild berries and pinecones.",
        "The cowboy frog escapes the berry-throwing chaos by flying out the window on a paper airplane.",
        "He lands safely inside a warm cup of hot cocoa held by a cozy camper around the fire."
      ]
    }
  ],
  7: [
    {
      title: "The Close Encounter 👽",
      sentences: [
        "A glowing neon-green spaceship lands quietly in a dark forest clearing at midnight.",
        "An alien steps out of the ship wearing a cozy flannel shirt and holding an acoustic guitar.",
        "He joins three campers around a fire and begins singing an acoustic folk song.",
        "The alien teaches the campers how to perform a weird, zero-gravity floating dance.",
        "A park ranger walks up, spots the floating alien, and drops his flashlight in pure shock.",
        "The startled alien panics and accidentally zaps the ranger, turning him into a glowing green frog.",
        "They all eat s'mores together while the frog ranger croaks out the musical rhythm."
      ]
    }
  ],
  8: [
    {
      title: "The Bigfoot Sighting 👣",
      sentences: [
        "An excited hiker looks through massive binoculars, searching for the legendary Bigfoot.",
        "Directly behind the hiker, Bigfoot is casually wearing sunglasses and drinking pink lemonade.",
        "The hiker turns around, gasps in shock, and drops his retro camera into a puddle.",
        "Bigfoot picks up the camera, wipes the lens, and suggests they take a selfie together.",
        "They pose side-by-side making goofy duck faces under the pine trees.",
        "A mischievous squirrel steals the camera from Bigfoot and runs up a pine tree.",
        "Bigfoot and the hiker shake the tree trunk until a shower of pinecones falls down.",
        "They retrieve the camera safely and share an epic high-five under the starry night sky."
      ]
    }
  ]
};

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
  const savedNames = store.get("chronicles.names", ["Alice", "Bob", "Charlie", "David"]);
  let names = savedNames.slice();

  const listWrap = el("div", { id: "chronPlayerList", style: "margin: 16px 0;" });

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
              toast("Cozy Chronicles needs at least 3 players.");
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
        toast("Max 8 players for story drawing.");
      }
    }
  });

  const startBtn = el("button", {
    className: "btn",
    text: "Start Cozy Chronicles",
    onClick: () => {
      const cleaned = names.map(n => n.trim() || "Player").slice(0, 8);
      if (cleaned.length < 3) {
        toast("Cozy Chronicles needs at least 3 players.");
        return;
      }
      store.set("chronicles.names", cleaned);
      initGame(cleaned);
    }
  });

  drawList();

  mount(
    gameTopbar("Cozy Chronicles", goHome),
    el("div", { className: "panel center", style: "max-width: 480px; margin: 0 auto;" }, [
      el("div", { style: "width:64px; height:64px; margin:0 auto 12px; color:var(--sunset-soft);" }, [icons.pen()]),
      el("h2", { text: "Cozy Chronicles" }),
      el("p", { className: "muted", text: "A secret story drawing game. Each player is assigned a single sentence of a cozy story to draw. No one knows the full plot until the final Illustrated Slideshow review!" }),
      listWrap,
      addBtn,
      el("div", { className: "spacer" }),
      startBtn
    ])
  );
}

function initGame(players) {
  const N = players.length;
  // Get story templates matching player count
  // If count is not in 3-8 range, clamp it
  const clampedN = Math.max(3, Math.min(8, N));
  const availableStories = STORIES[clampedN];
  const storyObj = availableStories[Math.floor(Math.random() * availableStories.length)];

  // Shuffle players to assign random order of sentences
  const shuffledPlayers = shuffle(players.slice());

  // Set up game state
  // Each index i in sentences matches Player i
  const state = {
    players: shuffledPlayers,
    storyTitle: storyObj.title,
    sentences: storyObj.sentences,
    drawings: [], // list of dataUrls matching sentences index
    activeQueueIdx: 0, // active sentence to draw
  };

  runNextDrawingTurn(state);
}

function runNextDrawingTurn(state) {
  const idx = state.activeQueueIdx;
  if (idx >= state.sentences.length) {
    // All drawings complete! Go to Illustrated Slideshow
    startSlideshowReview(state);
    return;
  }

  const currentPlayer = state.players[idx];
  const currentSentence = state.sentences[idx];

  // Pass screen
  const container = el("div", { className: "panel center", style: "max-width: 480px; margin: 30px auto; padding: 24px;" }, [
    el("h2", { text: `Pass the Device!` }),
    el("p", { className: "muted", style: "font-size: 1.1rem; margin: 20px 0;", html: `Hand the phone secretly to <strong style="color:var(--sunset-soft); font-size: 1.3rem;">${currentPlayer}</strong>.` }),
    el("button", {
      className: "btn",
      text: "I am ready to draw",
      onClick: () => renderDrawingBoard(state, currentPlayer, currentSentence, idx)
    })
  ]);

  mount(gameTopbar(`Cozy Chronicles — Storybook`, () => confirmQuit(state)), container);
}

function renderDrawingBoard(state, pName, sentence, idx) {
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
    text: "Submit Illustration",
    onClick: () => {
      const dataUrl = canvas.toDataURL("image/png", 0.4);
      state.drawings.push(dataUrl);
      state.activeQueueIdx++;
      runNextDrawingTurn(state);
    }
  });

  const drawingLayout = el("div", { className: "panel center", style: "max-width: 500px; margin: 0 auto;" }, [
    el("h3", { text: `${pName}'s Secret Sentence`, style: "color:var(--sunset-soft); margin-top:0;" }),
    el("blockquote", {
      html: `Draw this: <strong style="color:#00ffaa; font-size:1.15rem;">"${sentence}"</strong>`,
      style: "margin: 8px 0 16px; line-height: 1.4; border-left: none; padding: 0;"
    }),
    canvas,
    el("div", { style: "display:flex; gap:8px; justify-content:center; margin: 8px 0;" }, [undoBtn, clearBtn]),
    colorRow,
    brushRow,
    submitBtn
  ]);

  mount(gameTopbar("Cozy Chronicles — Drawing", () => confirmQuit(state)), drawingLayout);

  // Setup canvas
  setupDrawingCanvas(canvas, undoBtn, clearBtn, () => activeColor, () => activeBrushSize);
}

function setupDrawingCanvas(canvas, undoBtn, clearBtn, getColor, getBrushSize) {
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const W = rect.width || 400;
  const H = 250;
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
  }, { passive: false });
  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const r = canvas.getBoundingClientRect();
    drawMove(touch.clientX - r.left, touch.clientY - r.top);
  }, { passive: false });
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

// ── Illustrated Slideshow Review Phase ────────────────────────────────────────
function startSlideshowReview(state) {
  renderReviewSlide(state, 0);
}

function renderReviewSlide(state, slideIdx) {
  if (slideIdx >= state.sentences.length) {
    renderFinalScorecard(state);
    return;
  }

  const sentence = state.sentences[slideIdx];
  const drawingUrl = state.drawings[slideIdx];
  const illustrator = state.players[slideIdx];

  const slideWrap = el("div", {
    className: "panel center fade-in",
    style: "background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 16px; width: 100%; min-height: 320px;"
  }, [
    el("div", {
      text: `Illustration ${slideIdx + 1}/${state.sentences.length} • Drawn by ${illustrator}`,
      style: "font-size: 0.75rem; color: var(--sunset-soft); text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px; margin-bottom: 12px;"
    }),
    el("img", {
      src: drawingUrl,
      style: "background: #112228; border-radius: 12px; width: 100%; max-height: 260px; object-fit: contain; margin-bottom: 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.5);"
    }),
    el("blockquote", {
      text: `"${sentence}"`,
      style: "font-size: 1.3rem; font-weight: bold; margin: 0; line-height: 1.4; border-left: none; padding: 0; text-align: center;"
    })
  ]);

  const hasMore = slideIdx + 1 < state.sentences.length;
  const nextBtn = el("button", {
    className: "btn",
    text: hasMore ? "Read Next Page ➜" : "Close Storybook 📖",
    onClick: () => {
      renderReviewSlide(state, slideIdx + 1);
    }
  });

  mount(
    gameTopbar(`Illustrated Chronicles — "${state.storyTitle}"`, goHome),
    el("div", { className: "panel center", style: "max-width: 520px; margin: 0 auto;" }, [
      slideWrap,
      el("div", { className: "spacer" }),
      nextBtn
    ])
  );
}

function renderFinalScorecard(state) {
  mount(
    gameTopbar("Cozy Chronicles — Story Complete", goHome),
    el("div", { className: "panel center", style: "max-width: 480px; margin: 0 auto;" }, [
      el("h1", { text: "The End!", style: "color: var(--sunset-soft); font-size: 2.5rem; font-weight: 900; margin-top:0;" }),
      el("blockquote", {
        html: `You have successfully completed and self-illustrated:<br><strong style="color:#00ffaa; font-size:1.25rem;">"${state.storyTitle}"</strong>`,
        style: "border-left: none; padding: 0; text-align: center; margin: 16px 0;"
      }),
      el("p", { className: "muted", text: "A legendary illustrated chronicles is born! Thanks for drawing." }),
      el("div", { className: "spacer" }),
      el("button", {
        className: "btn",
        text: "Back to Lobby",
        onClick: goHome
      })
    ])
  );
}

function confirmQuit(state) {
  if (confirm("Are you sure you want to end this Cozy Chronicles game?")) {
    goHome();
  }
}
