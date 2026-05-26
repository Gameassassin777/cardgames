// Lake House Catchphrase — fast-paced hot-potato word guessing game!
import { el, mount, toast, store, shuffle } from "./ui.js";

const FAM_WORDS = [
  "marshmallow", "canoe", "campfire", "sleeping bag", "bear claw", "fishing rod", "paddle", 
  "mosquito", "treehouse", "hot dog", "pinecone", "beaver dam", "hiking boot", "cooler", 
  "flashlight", "marshmallow stick", "compass", "hammock", "squirrel", "lake house", "deck chair",
  "wild berries", "tent pole", "life jacket", "picnic basket", "acorn", "sleeping pad", "thermos",
  "muddy boots", "mosquito spray", "starry sky", "wooden dock", "fire pit", "frog catching"
];

const ONLINE_WORDS = [
  "Skibidi Toilet", "Ohio final boss", "mewing streak", "looksmaxxing", "sus impostor", 
  "W rizz", "Fanum tax", "looksmaxxing surgeon", "Baby Gronk", "Subway Surfers", "aura reading", 
  "Hawk Tuah", "Quandale Dingle", "John Pork", "Discord mod", "electrical vent", "sussy baka",
  "looksmaxxing invoice", "Sigma grindset", "Grimace shake", "TikTok rizz party"
];

const ADULT_WORDS = [
  "canoe full of regret", "burnt marshmallow", "soggy sandwich", "accidental cannonball", 
  "mosquito bite itch", "leaky air mattress", "unloading the dishwasher", "losing the remote", 
  "showering at night", "cereal is a soup", "touching grass", "burnt hot dog", "chore evasion",
  "embarrassing dad joke", "full middle name", "shredded cheese at 2 a.m.", "unwashed gym clothes"
];

let goHome = () => {};
let timerInterval = null;

// Game State
let game = {
  team1: "Team Blue",
  team2: "Team Green",
  score1: 0,
  score2: 0,
  targetScore: 7,
  roundDuration: 45, // seconds
  category: "family", // "family" | "online" | "adult"
  
  // Active round state
  activeTeam: 1, // 1 or 2
  timeLeft: 45,
  wordPool: [],
  wordIndex: 0,
  wordVisible: true
};

export function start(homeCallback) {
  goHome = homeCallback;
  resetGame();
  renderSetup();
}

function resetGame() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  game.score1 = 0;
  game.score2 = 0;
  game.activeTeam = 1;
  game.wordVisible = true;
}

function getWordPool() {
  let pool = [];
  if (game.category === "family") {
    pool = FAM_WORDS.slice();
  } else if (game.category === "online") {
    pool = ONLINE_WORDS.slice();
  } else {
    pool = ADULT_WORDS.slice();
  }

  // Mix in custom catchphrases saved in localStorage!
  const customs = store.get("catchphrase.game.v1.custom_cards", []);
  return shuffle(pool.concat(customs));
}

/* ---------------- 1. Setup / Lobby Screen ---------------- */
function renderSetup() {
  resetGame();

  const name1Input = el("input", { type: "text", value: game.team1, placeholder: "Team 1 Name", onInput: (e) => { game.team1 = e.target.value.trim() || "Team 1"; } });
  const name2Input = el("input", { type: "text", value: game.team2, placeholder: "Team 2 Name", onInput: (e) => { game.team2 = e.target.value.trim() || "Team 2"; } });

  // Steppers
  let targetVal = el("span", { className: "val", text: String(game.targetScore) });
  const targetStepper = el("div", { className: "stepper" }, [
    el("button", { text: "−", onClick: () => { game.targetScore = Math.max(3, game.targetScore - 1); targetVal.textContent = game.targetScore; } }),
    targetVal,
    el("button", { text: "+", onClick: () => { game.targetScore = Math.min(20, game.targetScore + 1); targetVal.textContent = game.targetScore; } }),
    el("span", { className: "muted", text: "points to win", style: "margin-left:6px" })
  ]);

  let timeVal = el("span", { className: "val", text: `${game.roundDuration}s` });
  const timeStepper = el("div", { className: "stepper" }, [
    el("button", { text: "−", onClick: () => { game.roundDuration = Math.max(15, game.roundDuration - 5); timeVal.textContent = `${game.roundDuration}s`; } }),
    timeVal,
    el("button", { text: "+", onClick: () => { game.roundDuration = Math.min(120, game.roundDuration + 5); timeVal.textContent = `${game.roundDuration}s`; } }),
    el("span", { className: "muted", text: "per round", style: "margin-left:6px" })
  ]);

  // Categories Selection (Check if weird unlocked)
  const weirdUnlocked = localStorage.getItem("lakehouse.weird_unlocked") === "true";

  const famBtn = el("button", { className: "btn" + (game.category === "family" ? "" : " ghost"), text: "🌲 Wholesome Campfire", onClick: () => selectCategory("family") });
  const onlineBtn = el("button", { className: "btn" + (game.category === "online" ? "" : " ghost"), text: "🐒 Sus Brain-rot", onClick: () => selectCategory("online") });
  const adultBtn = el("button", { className: "btn" + (game.category === "adult" ? "" : " ghost"), text: "🤫 Unhinged Cabin", onClick: () => selectCategory("adult") });

  function selectCategory(cat) {
    if (!weirdUnlocked && cat !== "family") {
      toast("🔒 Tap the header duck 🦆 5 times to unlock weird categories!");
      return;
    }
    game.category = cat;
    famBtn.className = cat === "family" ? "btn" : "btn ghost";
    onlineBtn.className = cat === "online" ? "btn" : "btn ghost";
    adultBtn.className = cat === "adult" ? "btn" : "btn ghost";
  }

  // If weird categories are locked, show locked icons
  if (!weirdUnlocked) {
    onlineBtn.textContent = "🔒 Sus Brain-rot (Locked)";
    adultBtn.textContent = "🔒 Unhinged Cabin (Locked)";
  }

  const startBtn = el("button", {
    className: "btn",
    text: "🔥 Start Catchphrase!",
    onClick: () => {
      game.wordPool = getWordPool();
      if (game.wordPool.length === 0) {
        toast("Word deck is empty! Add custom words in Settings.");
        return;
      }
      game.wordIndex = 0;
      startRound();
    }
  });

  const setupCard = el("div", { className: "panel" }, [
    el("label", { text: "Set Team Names" }),
    el("div", { style: "display:flex; gap:10px; margin-bottom:12px;" }, [name1Input, name2Input]),
    el("hr", { className: "divider" }),
    el("label", { text: "Target Score" }),
    targetStepper,
    el("hr", { className: "divider" }),
    el("label", { text: "Round Timer" }),
    timeStepper,
    el("hr", { className: "divider" }),
    el("label", { text: "Word Category" }),
    el("div", { className: "btn-row", style: "gap:8px; flex-direction:column;" }, [famBtn, onlineBtn, adultBtn]),
    el("hr", { className: "divider" }),
    startBtn
  ]);

  mount(
    el("div", { className: "topbar" }, [
      el("button", { className: "back", text: "‹ Lobby", onClick: goHome }),
      el("div", { className: "title", text: "Lake House Catchphrase" }),
      el("span", { style: "width:64px" })
    ]),
    el("div", { className: "panel center" }, [
      el("p", { className: "muted", html: "<b>Fast-paced hot-potato word guessing!</b> Describe the phrase to your team without saying the word. As soon as they guess it, click next and <i>pass the device</i> to the other team. Don't get caught holding it when the timer buzzes!" })
    ]),
    setupCard
  );
}

/* ---------------- 2. Active Round Loop Screen ---------------- */
function startRound() {
  game.timeLeft = game.roundDuration;
  game.wordVisible = true;
  
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    game.timeLeft--;
    
    // Pulse animation selector
    const timerBox = document.getElementById("pulsingTimer");
    if (timerBox) {
      timerBox.textContent = `⏱️ ${game.timeLeft}s`;
      
      // Color shifting
      const ratio = game.timeLeft / game.roundDuration;
      if (ratio < 0.25) {
        timerBox.style.color = "#ef5350";
        timerBox.style.animation = "pulse 0.4s infinite alternate";
      } else if (ratio < 0.5) {
        timerBox.style.color = "#ffa726";
        timerBox.style.animation = "pulse 0.8s infinite alternate";
      } else {
        timerBox.style.color = "var(--water-foam)";
        timerBox.style.animation = "pulse 1.5s infinite alternate";
      }
    }

    if (game.timeLeft <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      renderBuzzer();
    }
  }, 1000);

  renderPlay();
}

function renderPlay() {
  const currentWord = game.wordPool[game.wordIndex % game.wordPool.length];
  const activeName = game.activeTeam === 1 ? game.team1 : game.team2;

  const timerEl = el("div", {
    id: "pulsingTimer",
    style: "font-size:2.4rem; font-weight:800; text-align:center; margin-bottom:12px; color:var(--water-foam); transition: color 0.3s; animation: pulse 1.5s infinite alternate;",
    text: `⏱️ ${game.timeLeft}s`
  });

  const wordCardText = el("span", {
    style: "font-size:1.6rem; font-weight:800; color:#fff; transition: opacity 0.15s; " + (game.wordVisible ? "opacity:1" : "opacity:0;"),
    text: currentWord
  });

  const wordCard = el("div", {
    className: "play-card response",
    style: "min-height:160px; justify-content:center; align-items:center; text-align:center; padding:18px; margin: 18px 0; background:linear-gradient(135deg, rgba(8,40,47,0.85), rgba(8,40,47,0.5)); border:2px solid rgba(205,238,242,0.3);"
  }, [
    wordCardText,
    el("div", {
      className: "muted",
      style: "font-size:0.8rem; font-weight:normal; position:absolute; bottom:8px; width:100%; text-align:center; left:0; " + (game.wordVisible ? "display:none;" : "display:block;"),
      text: "⚠️ WORD HIDDEN (Tap show to read)"
    })
  ]);

  const toggleShowBtn = el("button", {
    className: "btn ghost small",
    style: "width:100%; margin-bottom:12px; font-weight:700;",
    text: game.wordVisible ? "👁️ Hide Word (Pass Device Safely)" : "👁️ Show Word",
    onClick: () => {
      game.wordVisible = !game.wordVisible;
      renderPlay();
    }
  });

  const correctBtn = el("button", {
    className: "btn",
    style: "background:#2e7d32; color:#fff; font-weight:800; font-size:1.1rem; box-shadow:0 4px #1b5e20; margin-bottom:8px;",
    text: "✅ Guessed! Next & Pass",
    onClick: () => {
      // Advance word
      game.wordIndex++;
      game.wordVisible = true;
      // Toggle team
      game.activeTeam = game.activeTeam === 1 ? 2 : 1;
      renderPlay();
      toast("👉 Passed to opposing team!");
    }
  });

  const skipBtn = el("button", {
    className: "btn ghost small",
    style: "width:100%; margin:0; border-color:#c62828; color:#ef5350; font-weight:700;",
    text: "⏭️ Skip (-2s Penalty)",
    onClick: () => {
      game.timeLeft = Math.max(0, game.timeLeft - 2);
      game.wordIndex++;
      game.wordVisible = true;
      renderPlay();
      toast("Skipped! -2 seconds penalty.");
    }
  });

  const turnPanel = el("div", {
    className: "panel center",
    style: "background:rgba(255,255,255,0.06); padding:10px; border-radius:12px; margin-bottom:12px;"
  }, [
    el("h3", {
      style: "margin:0; font-size:1.15rem; color:#fff; display:flex; align-items:center; justify-content:center; gap:8px;"
    }, [
      el("span", { style: "animation: pulse 1s infinite alternate;", text: "📣" }),
      el("span", { text: `${activeName}'s Turn to Describe!` })
    ])
  ]);

  mount(
    el("div", { className: "topbar" }, [
      el("button", { className: "back", text: "✕ Stop", onClick: () => { if (confirm("Stop Catchphrase and return to setup?")) { resetGame(); renderSetup(); } } }),
      el("div", { className: "title", text: "Active Round!" }),
      el("span", { style: "width:64px" })
    ]),
    turnPanel,
    timerEl,
    wordCard,
    toggleShowBtn,
    correctBtn,
    skipBtn
  );
}

/* ---------------- 3. Buzzer / Round Scoring Screen ---------------- */
function renderBuzzer() {
  const activeName = game.activeTeam === 1 ? game.team1 : game.team2;
  const winnerName = game.activeTeam === 1 ? game.team2 : game.team1;

  const scorePanel = el("div", { className: "scoreboard" }, [
    el("div", { className: "score-row" + (game.score1 >= game.score2 && game.score1 > 0 ? " leader" : "") }, [
      el("span", { className: "nm", text: `🔵 ${game.team1}` }),
      el("span", { className: "pts", text: `${game.score1}/${game.targetScore}` })
    ]),
    el("div", { className: "score-row" + (game.score2 >= game.score1 && game.score2 > 0 ? " leader" : "") }, [
      el("span", { className: "nm", text: `🟢 ${game.team2}` }),
      el("span", { className: "pts", text: `${game.score2}/${game.targetScore}` })
    ])
  ]);

  const scoreBtn = el("button", {
    className: "btn",
    text: `🏆 Award Point to ${winnerName}`,
    onClick: () => {
      if (game.activeTeam === 1) {
        game.score2++;
      } else {
        game.score1++;
      }
      
      // Check GameOver
      if (game.score1 >= game.targetScore || game.score2 >= game.targetScore) {
        renderGameOver();
      } else {
        // Opposing team gets first turn next round
        game.activeTeam = game.activeTeam === 1 ? 2 : 1;
        startNextRoundOverlay();
      }
    }
  });

  mount(
    el("div", { className: "topbar" }, [
      el("div", { className: "title", text: "Round Over!" }),
    ]),
    el("div", { className: "panel center", style: "background:rgba(198,40,40,0.15); border:1.5px solid #c62828; animation: shake 0.5s;" }, [
      el("div", { className: "big-emoji", style: "font-size:3.5rem; animation: pulse 0.5s infinite alternate;", text: "🚨" }),
      el("h2", { style: "color:#ef5350; margin:10px 0 4px 0;", text: "⏰ TIME'S UP!" }),
      el("p", { className: "muted", style: "margin:0;", text: `${activeName} was caught holding the device when the timer buzzed!` })
    ]),
    el("div", { className: "panel" }, [
      el("label", { text: "Current Scores" }),
      scorePanel
    ]),
    scoreBtn
  );
}

function startNextRoundOverlay() {
  const activeName = game.activeTeam === 1 ? game.team1 : game.team2;

  const scorePanel = el("div", { className: "scoreboard" }, [
    el("div", { className: "score-row" }, [
      el("span", { className: "nm", text: `🔵 ${game.team1}` }),
      el("span", { className: "pts", text: `${game.score1}/${game.targetScore}` })
    ]),
    el("div", { className: "score-row" }, [
      el("span", { className: "nm", text: `🟢 ${game.team2}` }),
      el("span", { className: "pts", text: `${game.score2}/${game.targetScore}` })
    ])
  ]);

  mount(
    el("div", { className: "topbar" }, [
      el("div", { className: "title", text: "Get Ready!" }),
    ]),
    el("div", { className: "panel center" }, [
      el("h3", { text: "Prepare to Pass!" }),
      el("p", { className: "muted", text: `Round scored! The first turn goes to ${activeName}. Get ready to describe and pass!` })
    ]),
    el("div", { className: "panel" }, [
      scorePanel
    ]),
    el("button", {
      className: "btn",
      text: `▶️ Start next round with ${activeName}`,
      onClick: () => {
        game.wordPool = getWordPool();
        game.wordIndex = 0;
        startRound();
      }
    })
  );
}

/* ---------------- 4. Game Over Screen ---------------- */
function renderGameOver() {
  const isWinner1 = game.score1 >= game.targetScore;
  const winnerName = isWinner1 ? game.team1 : game.team2;
  const winnerColor = isWinner1 ? "🔵" : "🟢";

  const board = el("div", { className: "scoreboard" }, [
    el("div", { className: "score-row leader" }, [
      el("span", { className: "nm", text: `${winnerColor} ${winnerName}` }),
      el("span", { className: "pts", text: `${Math.max(game.score1, game.score2)} points` })
    ]),
    el("div", { className: "score-row" }, [
      el("span", { className: "nm", text: `${isWinner1 ? "🟢" : "🔵"} ${isWinner1 ? game.team2 : game.team1}` }),
      el("span", { className: "pts", text: `${Math.min(game.score1, game.score2)} points` })
    ])
  ]);

  mount(
    el("div", { className: "topbar" }, [
      el("div", { className: "title", text: "Game Over" }),
    ]),
    el("div", { className: "panel center" }, [
      el("div", { className: "big-emoji", text: "👑🏆" }),
      el("h2", { text: `${winnerName} Wins the Match!` }),
      el("p", { className: "muted", text: "Absolute catchphrase legends!" })
    ]),
    el("div", { className: "panel" }, [
      board
    ]),
    el("button", { className: "btn", text: "Play Again", onClick: renderSetup }),
    el("div", { className: "spacer" }),
    el("button", { className: "btn ghost", text: "Back to Lobby", onClick: goHome })
  );
}
