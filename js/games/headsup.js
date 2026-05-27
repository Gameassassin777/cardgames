// Modular Heads Up forehead guessing game engine.
import { el, mount, toast, store, shuffle } from "../ui.js";
import { icons } from "../icons.js";

let goHome = () => {};

const DECKS = {
  lake: {
    name: "Lake House Life 🛶",
    desc: "Cozy cabin, wild animals, and outdoor fun.",
    words: [
      "Canoe", "Marshmallow", "Campfire", "Mosquito", "Brown Bear", "Wooden Dock", 
      "Sleeping Bag", "S'mores", "Cooler", "Pinecone", "Fire Pit", "Sunburn", "Paddle",
      "Life Jacket", "Thermos", "Hiking Boot", "Starry Sky", "Fishing Rod", "Wet Socks",
      "Hammock", "Lake Monster", "Raccoon", "Beaver Dam", "Raft", "Hot Dog", "Watermelon"
    ]
  },
  animals: {
    name: "Animal Kingdom 🦁",
    desc: "From wild beasts to cute critters. Act them out!",
    words: [
      "Elephant", "Giraffe", "Kangaroo", "Lion", "Shark", "Penguin", "Monkey", "Beaver",
      "Raccoon", "Squirrel", "Green Frog", "Bat", "Owl", "Whale", "Dolphin", "Cheetah",
      "Flamingo", "Crocodile", "Hippo", "Chameleon", "Koala", "Sloth", "Snake", "Rooster"
    ]
  },
  blockbusters: {
    name: "Pop Culture & Movies 🎬",
    desc: "Famous movies, TV shows, and viral internet icons.",
    words: [
      "Spider-Man", "Shrek", "Harry Potter", "Barbie", "Batman", "Titanic", "Star Wars",
      "Minecraft", "TikTok", "Frozen", "Fortnite", "Iron Man", "The Matrix", "Jurassic Park",
      "Toy Story", "SpongeBob", "Wednesday Addams", "Taylor Swift", "Super Mario", "Pikachu"
    ]
  },
  accents: {
    name: "Accents & Impressions 🗣️",
    desc: "Must describe other words using these wild voices!",
    words: [
      "British Accent", "Pirate", "Texas Cowboy", "Robot", "Scary Zombie", "Laughing Baby",
      "Opera Singer", "Angry French Chef", "Deep Radio Host", "Surfer Bro", "Strict Teacher",
      "Dracula", "Whispering Spy", "Excited Dog", "Crying Toddler", "Alien", "High Pitch Voice"
    ]
  }
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
  const deckListWrap = el("div", { style: "display: grid; grid-template-columns: 1fr; gap: 12px; margin: 16px 0;" });

  Object.entries(DECKS).forEach(([key, deck]) => {
    const btn = el("button", {
      className: "panel",
      style: "text-align: left; padding: 16px; border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; background: rgba(255,255,255,0.01); display: block; width: 100%; transition: transform 0.2s;",
      onClick: () => {
        startHeadsUpGame(deck);
      }
    }, [
      el("h3", { text: deck.name, style: "margin: 0 0 4px; color: var(--sunset-soft);" }),
      el("p", { className: "muted", text: deck.desc, style: "margin: 0; font-size: 0.85rem;" })
    ]);
    deckListWrap.appendChild(btn);
  });

  mount(
    gameTopbar("Heads Up Forehead Guessing", goHome),
    el("div", { className: "panel center", style: "max-width: 480px; margin: 0 auto;" }, [
      el("div", { style: "width:64px; height:64px; margin:0 auto 12px; color:var(--sunset-soft);" }, [icons.rizz()]),
      el("h2", { text: "Heads Up!" }),
      el("p", { className: "muted", text: "Hold the device up to your forehead (facing away from you). Your friends will shout clues or act it out. Tilt DOWN (or tap right side) if you guess it, tilt UP (or tap left side) to Pass!" }),
      el("h4", { text: "Select a Deck to Play:", style: "margin: 20px 0 8px; text-align: left;" }),
      deckListWrap
    ])
  );
}

function startHeadsUpGame(deck) {
  const state = {
    deckName: deck.name,
    words: shuffle(deck.words),
    wordIdx: 0,
    history: [], // list of { word, correct: Boolean }
    timeLeft: 60,
    timerInterval: null,
    countdownLeft: 3,
    active: false
  };

  run321Countdown(state);
}

function run321Countdown(state) {
  playTone(400, 0.1);
  const textEl = el("h1", {
    text: String(state.countdownLeft),
    style: "font-size: 8rem; font-weight: 900; color: var(--sunset-soft); margin: 40px 0;"
  });

  mount(
    gameTopbar("Heads Up — Get Ready!", () => confirmQuit(state)),
    el("div", { className: "panel center", style: "max-width: 400px; margin: 0 auto; text-align: center; padding: 24px;" }, [
      el("p", { className: "muted", text: "Place the device on your forehead, facing outward!" }),
      textEl,
      el("p", { text: `Deck: ${state.deckName}`, style: "font-weight: 500; font-size: 1.1rem; color: #00ffaa;" })
    ])
  );

  const interval = setInterval(() => {
    state.countdownLeft--;
    if (state.countdownLeft <= 0) {
      clearInterval(interval);
      playTone(800, 0.3); // High start beep
      state.active = true;
      launchMainLoop(state);
    } else {
      textEl.textContent = String(state.countdownLeft);
      playTone(400, 0.1);
    }
  }, 1000);

  state.timerInterval = interval; // save to clear if quit
}

function launchMainLoop(state) {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
  }

  // Tilt/sensor registration
  let lastTiltTime = 0;
  let lastCheckTime = 0;

  function handleOrientation(e) {
    if (!state.active) return;
    const now = Date.now();
    
    // Throttle event checks to 12.5Hz to prevent main-thread layout choking
    if (now - lastCheckTime < 80) return;
    lastCheckTime = now;

    if (now - lastTiltTime < 1400) return; // Debounce tilts

    // In portrait forehead position, beta is around 90.
    // Tilt screen down (Correct) -> beta decreases to 40-50 range.
    // Tilt screen up (Pass) -> beta increases to 130-140 range.
    const b = e.beta; // Tilt front/back
    
    if (b !== null) {
      if (b < 45) {
        // Tilt Down -> Correct!
        lastTiltTime = now;
        triggerGuess(true);
      } else if (b > 135) {
        // Tilt Up -> Pass!
        lastTiltTime = now;
        triggerGuess(false);
      }
    }
  }

  window.addEventListener("deviceorientation", handleOrientation);

  // Clean-up logic when turn ends
  function cleanupOrientation() {
    window.removeEventListener("deviceorientation", handleOrientation);
  }

  const wordCard = el("h2", {
    text: state.words[state.wordIdx] || "End of Deck!",
    style: "font-size: 3rem; font-weight: 900; text-align: center; margin: 40px 0; min-height: 90px; line-height: 1.2; text-shadow: 0 4px 20px rgba(0,0,0,0.6);"
  });

  const timerEl = el("div", {
    text: `${state.timeLeft}s`,
    style: "font-size: 1.8rem; font-weight: bold; color: var(--sunset-soft);"
  });

  // Touch zones to tap on screen
  const passBtn = el("button", {
    className: "btn error",
    text: "PASS (Tilt Up)",
    style: "flex: 1; height: 60px; font-weight: bold;",
    onClick: () => triggerGuess(false)
  });

  const correctBtn = el("button", {
    className: "btn success",
    text: "CORRECT (Tilt Down)",
    style: "flex: 1; height: 60px; font-weight: bold; background: linear-gradient(135deg, #00ffaa, #00b377); color: #051410;",
    onClick: () => triggerGuess(true)
  });

  const appScreen = el("div", {
    className: "heads-up-gameplay",
    style: "position:fixed; top:0; left:0; right:0; bottom:0; display:flex; flex-direction:column; justify-content:space-between; padding: 24px; box-sizing:border-box; transition: background-color 0.15s ease;"
  }, [
    el("div", { style: "display:flex; justify-content:space-between; align-items:center;" }, [
      el("div", { text: `Deck: ${state.deckName}`, style: "font-size: 0.9rem; font-weight:500; color: #00ffaa;" }),
      timerEl
    ]),
    wordCard,
    el("div", { style: "display: flex; gap: 12px; margin-bottom:12px;" }, [passBtn, correctBtn])
  ]);

  mount(appScreen);

  function triggerGuess(isCorrect) {
    if (!state.active) return;
    const currentWord = state.words[state.wordIdx];
    if (!currentWord) return;

    state.history.push({ word: currentWord, correct: isCorrect });

    // Sound effect and visual flash
    if (isCorrect) {
      playTone(650, 0.08);
      setTimeout(() => playTone(820, 0.15), 80);
      appScreen.style.backgroundColor = "rgba(0, 250, 150, 0.25)";
    } else {
      playTone(280, 0.25);
      appScreen.style.backgroundColor = "rgba(255, 80, 80, 0.25)";
    }

    setTimeout(() => {
      appScreen.style.backgroundColor = "transparent";
    }, 150);

    state.wordIdx++;
    if (state.wordIdx >= state.words.length) {
      // Re-shuffle to loop words just in case
      state.words = shuffle(state.words);
      state.wordIdx = 0;
    }

    wordCard.textContent = state.words[state.wordIdx];
  }

  // 60-second Timer Loop
  state.timerInterval = setInterval(() => {
    state.timeLeft--;
    timerEl.textContent = `${state.timeLeft}s`;

    if (state.timeLeft <= 10 && state.timeLeft > 0) {
      playTone(880, 0.04); // Ticking sound
    }

    if (state.timeLeft <= 0) {
      clearInterval(state.timerInterval);
      state.active = false;
      cleanupOrientation();
      playTone(300, 0.2); // Game finished beep
      setTimeout(() => playTone(300, 0.2), 220);
      renderSummaryScreen(state);
    }
  }, 1000);
}

function renderSummaryScreen(state) {
  const correctCount = state.history.filter(h => h.correct).length;
  
  const wordRows = state.history.map(item => {
    return el("div", {
      style: "display:flex; justify-content:space-between; align-items:center; padding:8px 16px; background:rgba(255,255,255,0.02); border-radius:10px; margin-bottom:6px; border:1px solid rgba(255,255,255,0.04);"
    }, [
      el("span", { text: item.word, style: "font-weight: 500;" }),
      item.correct
        ? el("span", { text: "✓ Correct", style: "color: #00ffaa; font-weight: bold; font-size: 0.85rem;" })
        : el("span", { text: "✕ Passed", style: "color: #ff5e5e; font-weight: bold; font-size: 0.85rem;" })
    ]);
  });

  const lobbyBtn = el("button", {
    className: "btn",
    text: "Back to Lobby",
    onClick: goHome
  });

  mount(
    gameTopbar("Heads Up — Round Complete", goHome),
    el("div", { className: "panel center", style: "max-width: 480px; margin: 0 auto;" }, [
      el("h1", { text: `${correctCount} Correct!`, style: "font-size:3rem; font-weight:900; color:var(--sunset-soft); margin-top:0;" }),
      el("p", { className: "muted", text: `Deck played: ${state.deckName}. Check out how you performed:` }),
      el("div", { style: "max-height: 280px; overflow-y: auto; margin: 16px 0; width: 100%;" }, wordRows),
      el("div", { className: "spacer" }),
      lobbyBtn
    ])
  );
}

// ── Web Audio API Sound Synth ────────────────────────────────────────────────
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

function confirmQuit(state) {
  if (confirm("Are you sure you want to end this Heads Up game?")) {
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
    }
    goHome();
  }
}
