// Modular Illustrated Storybook / Cozy Chronicles party game with Mad Libs pre-drawing.
import { el, mount, toast, shuffle } from "../ui.js";
import { icons } from "../icons.js";

let goHome = () => {};

// Multi-sentence story templates with blanks tailored for player count N (3 to 8).
// Each template requires exactly N inputs, so every player gets to input exactly one word!
const STORIES = {
  3: [
    {
      title: "The Glowing Marshmallow 🏕️",
      blanks: [
        { key: "animal", label: "Noun (Animal)" },
        { key: "adjective", label: "Adjective (Funny)" },
        { key: "verb", label: "Verb (Action)" }
      ],
      sentences: [
        "A hungry {animal} finds a legendary, glowing golden marshmallow deep in the dark woods.",
        "A swarm of {adjective} mosquitoes wearing pirate hats guards it with pinecone swords.",
        "The camper decides to {verb} to distract them, taking a massive, gooey bite."
      ]
    },
    {
      title: "The Dock Cannonball 💦",
      blanks: [
        { key: "clothing", label: "Noun (Silly Clothing)" },
        { key: "adjective", label: "Adjective (Cozy)" },
        { key: "animal", label: "Noun (Lake Animal)" }
      ],
      sentences: [
        "A brave beaver wearing a professional {clothing} prepares to jump off the high cabin dock.",
        "He launches into the starry sky, doing three {adjective} backflips and a massive splash.",
        "He splashes directly into the mouth of an extremely surprised, giant green {animal}."
      ]
    }
  ],
  4: [
    {
      title: "The Lost Explorer 🗺️",
      blanks: [
        { key: "job", label: "Noun (Profession/Job)" },
        { key: "object", label: "Noun (Silly Object)" },
        { key: "action", label: "Verb (Weird Action)" },
        { key: "adjective", label: "Adjective (Goofy)" }
      ],
      sentences: [
        "A lost {job} wearing a bright yellow bucket hat attempts to read a map on a mossy log.",
        "A sneaky raccoon wearing sunglasses steals the map and drops a {object} in its place.",
        "The explorer decides to {action} to retrieve the map from the raccoon.",
        "They become best friends and snap a {adjective} selfie together to post on Instagram."
      ]
    },
    {
      title: "The Canoe Captain 🛶",
      blanks: [
        { key: "hat", label: "Noun (Type of Hat)" },
        { key: "adjective", label: "Adjective (Screaming)" },
        { key: "monster", label: "Noun (Lake Monster Name)" },
        { key: "snack", label: "Noun (Silly Snack)" }
      ],
      sentences: [
        "A duck wearing a fancy {hat} takes steering control of a shiny red canoe.",
        "A sudden {adjective} wave capsizes the canoe, sending the duck captain flying high into the clouds.",
        "A friendly blue lake monster named {monster} catches the falling duck perfectly on its head.",
        "They sail off into the sunset together sharing a huge bucket of {snack}."
      ]
    }
  ],
  5: [
    {
      title: "The Energetic Bear 🐻",
      blanks: [
        { key: "animal", label: "Noun (Forest Animal)" },
        { key: "drink", label: "Noun (Silly Drink)" },
        { key: "dance", label: "Verb (Dance Move)" },
        { key: "container", label: "Noun (Large Container)" },
        { key: "feeling", label: "Adjective (Emotional)" }
      ],
      sentences: [
        "A sleepy {animal} decides to brew a giant, steaming mug of {drink}.",
        "He drinks it and gets so energized that he starts to {dance} through the forest path.",
        "He loses control and crashes face-first into a giant {container} of soft autumn leaves.",
        "All the forest critters gather around looking extremely {feeling}.",
        "They award him a gold pinecone trophy for the best performance of the lake season."
      ]
    },
    {
      title: "The Spa Day 🧖‍♂️",
      blanks: [
        { key: "adjective", label: "Adjective (Smelly)" },
        { key: "food", label: "Noun (Type of Food)" },
        { key: "fish", label: "Noun (Lake Creature)" },
        { key: "object", label: "Noun (Slippery Object)" },
        { key: "place", label: "Noun (Cozy Place)" }
      ],
      sentences: [
        "A stressed-out bear decides to have a relaxing spa day inside a {adjective} hot spring.",
        "Two friendly raccoons place fresh slices of {food} over the bear's eyes and massage his shoulders.",
        "A giant {fish} jumps out of the water to join the hot spa session.",
        "The bear gets startled, slips on a bar of {object}, and rolls down the muddy hill.",
        "He lands perfectly inside a cozy {place}, completely warm and fast asleep."
      ]
    }
  ],
  6: [
    {
      title: "The Frog Cowboy 🤠",
      blanks: [
        { key: "hat", label: "Noun (Funny Hat)" },
        { key: "mount", label: "Noun (Ridable Creature)" },
        { key: "drink", label: "Noun (Silly Liquid)" },
        { key: "rivals", label: "Noun (Plural Animal Gang)" },
        { key: "vehicle", label: "Noun (Flying Object)" },
        { key: "camper", label: "Noun (Job/Person)" }
      ],
      sentences: [
        "A tiny green frog wearing a ten-gallon {hat} rides a majestic {mount} like a horse.",
        "They arrive at the saloon and order two shots of cold {drink} from a squirrel bartender.",
        "Suddenly, a rival gang of angry {rivals} bursts through the swinging wooden doors.",
        "The saloon erupts into a chaotic food fight, with everyone throwing wild berries.",
        "The cowboy frog escapes the berry-throwing chaos by flying out the window on a {vehicle}.",
        "He lands safely inside a warm cup of cocoa held by a cozy {camper} around the fire."
      ]
    }
  ],
  7: [
    {
      title: "The Close Encounter 👽",
      blanks: [
        { key: "color", label: "Adjective (Neon Color)" },
        { key: "clothing", label: "Noun (Cozy Clothing)" },
        { key: "instrument", label: "Noun (Musical Instrument)" },
        { key: "dance", label: "Noun (Type of Dance)" },
        { key: "job", label: "Noun (Profession/Job)" },
        { key: "animal", label: "Noun (Small Animal)" },
        { key: "food", label: "Noun (Campfire Food)" }
      ],
      sentences: [
        "A glowing {color} spaceship lands quietly in a dark forest clearing at midnight.",
        "An alien steps out of the ship wearing a cozy {clothing} and holding a {instrument}.",
        "He joins three campers around a fire and begins performing a weird {dance} song.",
        "The alien teaches the campers how to float and do a zero-gravity spin.",
        "A park {job} walks up, spots the floating alien, and drops his flashlight in shock.",
        "The startled alien panics and accidentally zaps the ranger, turning him into a {animal}.",
        "They all eat {food} together while the transformed ranger beats out the musical rhythm."
      ]
    }
  ],
  8: [
    {
      title: "The Bigfoot Selfie 🤳",
      blanks: [
        { key: "item", label: "Noun (Outdoor Gear)" },
        { key: "drink", label: "Noun (Cold Drink)" },
        { key: "object", label: "Noun (Fragile Object)" },
        { key: "pose", label: "Noun (Funny Face/Pose)" },
        { key: "thief", label: "Noun (Sneaky Animal)" },
        { key: "tree", label: "Noun (Type of Tree)" },
        { key: "shower", label: "Noun (Plural Falling Object)" },
        { key: "gesture", label: "Noun (Victory Gesture)" }
      ],
      sentences: [
        "An excited hiker looks through his {item}, searching for the legendary Bigfoot.",
        "Directly behind the hiker, Bigfoot is casually wearing sunglasses and drinking {drink}.",
        "The hiker turns around, gasps in shock, and drops his {object} into a muddy puddle.",
        "Bigfoot picks up the item and suggests they pose side-by-side making {pose} faces.",
        "A mischievous {thief} steals the camera from Bigfoot and runs up a tall {tree}.",
        "Bigfoot and the hiker shake the tree trunk until a shower of {shower} falls down.",
        "They retrieve the device safely and share a glorious {gesture} under the starry night sky."
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
      el("p", { className: "muted", text: "A goated mashup of Mad Libs and secret drawing! Enter funny nouns, adjectives, or verbs. The story is compiled, split up, and secretly illustrated. Read the crazy illustrated storybook at the end!" }),
      listWrap,
      addBtn,
      el("div", { className: "spacer" }),
      startBtn
    ])
  );
}

function initGame(players) {
  const N = players.length;
  const clampedN = Math.max(3, Math.min(8, N));
  const availableStories = STORIES[clampedN];
  const storyObj = availableStories[Math.floor(Math.random() * availableStories.length)];

  // Shuffle players to determine a random order of inputs and drawings
  const shuffledPlayers = shuffle(players.slice());

  const state = {
    players: shuffledPlayers,
    storyTitle: storyObj.title,
    rawSentences: storyObj.sentences,
    blanks: storyObj.blanks,
    madlibsAnswers: {}, // key -> user_input
    compiledSentences: [],
    drawings: [],
    // Iterators
    activeBlankIdx: 0,
    activeDrawIdx: 0
  };

  startMadLibsPhase(state);
}

// ── Mad Libs Word Collection Phase ───────────────────────────────────────────
function startMadLibsPhase(state) {
  const idx = state.activeBlankIdx;

  if (idx >= state.blanks.length) {
    // All words collected! Compile the storybook.
    compileStorybook(state);
    return;
  }

  const currentBlank = state.blanks[idx];
  // Assign this blank to Player i
  const currentPlayer = state.players[idx];

  // Pass screen to keep inputs secret/fun
  const container = el("div", { className: "panel center", style: "max-width: 480px; margin: 30px auto; padding: 24px;" }, [
    el("h3", { text: "Chronicles Mad Libs!", style: "color:var(--sunset-soft); text-transform:uppercase; margin-top:0;" }),
    el("h2", { text: `Pass the Device!` }),
    el("p", { className: "muted", style: "font-size: 1.1rem; margin: 20px 0;", html: `Hand the phone secretly to <strong style="color:var(--sunset-soft); font-size: 1.3rem;">${currentPlayer}</strong> to enter a word.` }),
    el("button", {
      className: "btn",
      text: "I am ready",
      onClick: () => renderMadLibInput(state, currentPlayer, currentBlank)
    })
  ]);

  mount(gameTopbar(`Cozy Chronicles — Mad Libs`, () => confirmQuit(state)), container);
}

function renderMadLibInput(state, pName, blank) {
  const inputEl = el("input", {
    type: "text",
    placeholder: `Write a ${blank.label.toLowerCase()}...`,
    maxlength: "20",
    style: "font-size: 1.25rem; border-radius: 14px; text-align: center; margin: 20px 0; width: 100%;"
  });

  const submitBtn = el("button", {
    className: "btn",
    text: "Lock Word",
    onClick: () => {
      const val = inputEl.value.trim();
      if (!val) {
        toast(`Please write a valid ${blank.label}!`);
        return;
      }
      state.madlibsAnswers[blank.key] = val;
      state.activeBlankIdx++;
      startMadLibsPhase(state);
    }
  });

  const layout = el("div", { className: "panel center", style: "max-width: 480px; margin: 0 auto;" }, [
    el("h3", { text: `${pName}'s Turn to contribute`, style: "color: var(--sunset-soft); margin-top:0;" }),
    el("h2", { text: `Enter a ${blank.label}`, style: "font-size: 1.5rem;" }),
    el("p", { className: "muted", text: "Think of something absolutely wacky, cozy, or funny!" }),
    inputEl,
    submitBtn
  ]);

  mount(gameTopbar(`Cozy Chronicles — Mad Libs`, () => confirmQuit(state)), layout);
  inputEl.focus();
}

function compileStorybook(state) {
  // Plug all answers into the raw sentence templates
  state.compiledSentences = state.rawSentences.map(sentence => {
    let compiled = sentence;
    Object.entries(state.madlibsAnswers).forEach(([key, val]) => {
      compiled = compiled.replaceAll(`{${key}}`, `<span style="color:#00ffaa; text-shadow:0 0 4px rgba(0,255,170,0.25);">${val}</span>`);
    });
    return compiled;
  });

  toast("📖 Story successfully compiled! Illustrating begins...");
  setTimeout(() => {
    runNextDrawingTurn(state);
  }, 1200);
}

// ── Drawing Illustrating Phase ───────────────────────────────────────────────
function runNextDrawingTurn(state) {
  const idx = state.activeDrawIdx;
  if (idx >= state.compiledSentences.length) {
    // All drawings complete! Go to Illustrated Slideshow
    startSlideshowReview(state);
    return;
  }

  const currentPlayer = state.players[idx];
  const currentSentence = state.compiledSentences[idx];

  // Pass screen
  const container = el("div", { className: "panel center", style: "max-width: 480px; margin: 30px auto; padding: 24px;" }, [
    el("h2", { text: `Pass the Device!` }),
    el("p", { className: "muted", style: "font-size: 1.1rem; margin: 20px 0;", html: `Hand the phone secretly to <strong style="color:var(--sunset-soft); font-size: 1.3rem;">${currentPlayer}</strong>.` }),
    el("button", {
      className: "btn",
      text: "I am ready to illustrate",
      onClick: () => renderDrawingBoard(state, currentPlayer, currentSentence)
    })
  ]);

  mount(gameTopbar(`Cozy Chronicles — Illustrating`, () => confirmQuit(state)), container);
}

function renderDrawingBoard(state, pName, sentenceHtml) {
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
      state.activeDrawIdx++;
      runNextDrawingTurn(state);
    }
  });

  const drawingLayout = el("div", { className: "panel center", style: "max-width: 500px; margin: 0 auto;" }, [
    el("h3", { text: `${pName}'s Turn to Draw`, style: "color:var(--sunset-soft); margin-top:0;" }),
    el("blockquote", {
      html: `Draw this custom sentence:<br><strong style="font-size:1.15rem; color:#fff;">"${sentenceHtml}"</strong>`,
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
  if (slideIdx >= state.compiledSentences.length) {
    renderFinalScorecard(state);
    return;
  }

  const sentenceHtml = state.compiledSentences[slideIdx];
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
      html: `"${sentenceHtml}"`,
      style: "font-size: 1.3rem; font-weight: bold; margin: 0; line-height: 1.4; border-left: none; padding: 0; text-align: center; color:#fff;"
    })
  ]);

  const hasMore = slideIdx + 1 < state.compiledSentences.length;
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
