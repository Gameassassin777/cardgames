// Lake House Card Games — app shell, home menu, routing, PWA wiring.
import { el, mount, toast } from "./ui.js";
import { APP_VERSION } from "./version.js";
import { makeGame as makeCardGame } from "./cam.js";
import * as meeting from "./meeting.js";
import { makeGame as makeDeck } from "./deckgame.js";
import { PROMPTS, RESPONSES, NORMAL_PROMPTS, NORMAL_RESPONSES, FAMILY_PROMPTS, FAMILY_RESPONSES, CAMPFIRE_ROASTS, LAKE_TRUTHS, WOULD_YOU_RATHER, RED_GREEN, RIZZ_ROULETTE } from "./data.js";
import { openCustomCardsManager } from "./custom_cards_ui.js";
import * as catchphrase from "./catchphrase.js";
import { pullFromCloud } from "./cloud_sync.js";
import * as gartic from "./gartic.js";
import * as gallery from "./gallery.js";
import { icons } from "./icons.js";
import { start as startYahtzee } from "./games/yahtzee.js";
import { start as startFarkle } from "./games/farkle.js";
import { start as startLiarsDice } from "./games/liars_dice.js";
import { startStandaloneRoller as startDiceRoller } from "./games/dice_hub.js";
import { start as startQuiplash } from "./games/quiplash.js";
import { start as startTelestrations } from "./games/telestrations.js";
import { start as startScribblio } from "./games/scribblio.js";
import { start as startHeadsup } from "./games/headsup.js";
import { start as startCharades } from "./games/charades.js";
import { start as startChronicles } from "./games/picture_book.js";
import { start as startTVHost } from "./games/tv_host.js";

// Force wholesome normal mode on every app restart/page load
localStorage.setItem("lakehouse.weird_unlocked", "false");

// Pull any cards other devices have added — fire-and-forget, merges silently into localStorage.
pullFromCloud();

let deferredInstall = null;

const monkeys = makeCardGame({
  title: "Cards Against Monkeys", icon: icons.monkeys,
  prompts: PROMPTS, responses: RESPONSES,
  winnerTitle: "Goon Commander",
  blurb: "A chronically-online party game. One player is the Card Czar each round; everyone else fills in the blank with their funniest card. The Czar picks the winner. Pass the device around — hands stay secret.",
  footer: "Chronically online humor. Best with friends who can take a joke.",
  saveKey: "cam.game.v1", namesKey: "cam.names.v1", targetKey: "cam.target", physicalKey: "cam.physical",
});

const combinedCabinPrompts = [...NORMAL_PROMPTS, ...FAMILY_PROMPTS];
const combinedCabinResponses = [
  "✍️ [Write your own answer...]",
  ...NORMAL_RESPONSES.filter(r => r !== "✍️ [Write your own answer...]"),
  ...FAMILY_RESPONSES.filter(r => r !== "✍️ [Write your own answer...]")
];

const cabin = makeCardGame({
  title: "Cabin Fever", icon: icons.cabin,
  prompts: combinedCabinPrompts, responses: combinedCabinResponses,
  winnerTitle: "Round Winner",
  blurb: "A cozy and unhinged fill-in-the-blank party game. Complete prompts using your funniest response cards; the judge decides the winner. Pass the device, hands stay secret.",
  footer: "Absurd, witty, and cozy card-game humor.",
  saveKey: "cabin.game.v1", namesKey: "cabin.names.v1", targetKey: "cabin.target", physicalKey: "cabin.physical",
});
const rizzRoulette = makeDeck({ title: "Rizz Roulette", source: RIZZ_ROULETTE, saveKey: "rizz.game.v1" });
const wouldYouRather = makeDeck({ title: "Would You Rather", source: WOULD_YOU_RATHER, saveKey: "wyr.game.v1" });
const redGreen = makeDeck({ title: "Red Flag / Green Flag", source: RED_GREEN, saveKey: "flags.game.v1" });
const lakeTruths = makeDeck({ title: "Truth or Dare", source: LAKE_TRUTHS, saveKey: "truths.game.v1" });
const campfireRoasts = makeDeck({ title: "Roast Me", source: CAMPFIRE_ROASTS, saveKey: "roasts.game.v1" });

const GAMES = [
  {
    id: "cabin", icon: icons.cabin, title: "Cabin Fever",
    blurb: "Complete prompts using your funniest response cards. The judge decides the winner. 3+ players.",
    start: cabin,
    familyFriendly: true,
  },
  {
    id: "cam", icon: icons.monkeys, title: "Cards Against Monkeys",
    blurb: "Fill in the blanks to complete prompts using response cards. Features internet culture topics. 3+ players.",
    start: monkeys,
    familyFriendly: false,
  },
  {
    id: "meeting", icon: icons.meeting, title: "Most Likely To",
    blurb: "Vote on which player is most likely to match a given prompt. 3+ players.",
    start: meeting.start,
    familyFriendly: false,
  },
  {
    id: "rizz", icon: icons.rizz, title: "Rizz Roulette",
    blurb: "Draw cards to complete interactive dares, answer questions, or discuss conversational prompts. 2+ players.",
    start: rizzRoulette,
    familyFriendly: false,
  },
  {
    id: "wyr", icon: icons.wyr, title: "Would You Rather",
    blurb: "Read a dilemma with two choices, and have players vote on their preference. 2+ players.",
    start: wouldYouRather,
    familyFriendly: false,
  },
  {
    id: "flags", icon: icons.flags, title: "Red Flag / Green Flag",
    blurb: "Discuss and judge character traits as positive, negative, or neutral. 2+ players.",
    start: redGreen,
    familyFriendly: true,
  },
  {
    id: "truths", icon: icons.truths, title: "Truth or Dare",
    blurb: "Choose between answering a truth question or completing a dare. Suitable for any group size.",
    start: lakeTruths,
    familyFriendly: true,
  },
  {
    id: "roasts", icon: icons.roasts, title: "Roast Me",
    blurb: "Lighthearted group roasts, goofy dares, and funny social dilemmas. 3+ players.",
    start: campfireRoasts,
    familyFriendly: true,
  },
  {
    id: "catchphrase", icon: icons.catchphrase, title: "Catchphrase",
    blurb: "Teams race to guess secret words described by their teammates before the round timer runs out. 4+ players.",
    start: catchphrase.start,
    familyFriendly: true,
  },
  {
    id: "doodles", icon: icons.doodles, title: "Telephone Doodles (online)",
    blurb: "Players alternate between writing prompts and drawing scenes online. 3+ players.",
    start: (home) => gartic.start(home),
    familyFriendly: true,
  },
  {
    id: "quiplash", icon: icons.meeting, title: "Quiplash",
    blurb: "Write hilarious answers to wacky prompts, then pass the device secretly to vote on the funniest combination. 3-8 players.",
    start: startQuiplash,
    familyFriendly: true,
  },
  {
    id: "telestrations", icon: icons.doodles, title: "Telestrations",
    blurb: "A classic telephone chain of alternating drawings and guesses. See the hilarious mutation at the end! 3-8 players.",
    start: startTelestrations,
    familyFriendly: true,
  },
  {
    id: "scribblio", icon: icons.sibling, title: "Scribbl.io",
    blurb: "A hot-seat canvas drawing game. One player draws a secret word on canvas, while other players sit around and shout guesses! 2-8 players.",
    start: startScribblio,
    familyFriendly: true,
  },
  {
    id: "headsup", icon: icons.rizz, title: "Heads Up",
    blurb: "Forehead word guessing game! Hold the phone to your head and guess words from your friends' clues. 2+ players.",
    start: startHeadsup,
    familyFriendly: true,
  },
  {
    id: "charades", icon: icons.flags, title: "Charades",
    blurb: "Forehead acting game! Guess the words from your friends' silent physical gestures. 2+ players.",
    start: startCharades,
    familyFriendly: true,
  },
  {
    id: "yahtzee", icon: icons.dice, title: "Yahtzee Scorecard",
    blurb: "Roll virtual dice to score full houses, straights, and Yahtzees on your scoreboard! 1-8 players.",
    start: startYahtzee,
    familyFriendly: true,
  },
  {
    id: "farkle", icon: icons.dice, title: "Farkle Tracker",
    blurb: "Roll high-stakes combinations, bank points, and try not to Farkle! Supports Piggyback Mode. 1-8 players.",
    start: startFarkle,
    familyFriendly: true,
  },
  {
    id: "liars_dice", icon: icons.dice, title: "Liar's Dice",
    blurb: "A classic high-stakes bluffing game! Bid on total dice faces in play, and call your friends out. 2-8 players.",
    start: startLiarsDice,
    familyFriendly: true,
  },
  {
    id: "virtual_roller", icon: icons.dice, title: "Virtual Dice Roller",
    blurb: "Need dice for other board games? Roll and lock up to 6 custom virtual dice in our premium 3D roller!",
    start: startDiceRoller,
    familyFriendly: true,
  },
  {
    id: "chronicles", icon: icons.pen, title: "Cozy Chronicles (online)",
    blurb: "Draw individual sentences of a secret story without knowing the rest online. At the end, read your illustrated picture book! 3-8 players.",
    start: startChronicles,
    familyFriendly: true,
  },
];

function playQuack() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const filter = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(280, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(450, audioCtx.currentTime + 0.05);
    osc.frequency.exponentialRampToValueAtTime(260, audioCtx.currentTime + 0.18);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(800, audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.05);
    filter.frequency.exponentialRampToValueAtTime(700, audioCtx.currentTime + 0.18);
    filter.Q.setValueAtTime(4, audioCtx.currentTime);

    gain.gain.setValueAtTime(0.01, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, audioCtx.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.18);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
  } catch (e) {
    console.warn("Web Audio API is not supported or was blocked by browser autoplay policy:", e);
  }
}

function playDoubleQuack() {
  playQuack();
  setTimeout(playQuack, 130);
}

// Spawn `count` ducks (and yellow chicks if word is long) flying in random directions.
// Chaos level (angle spread, speed, spin) also increases with count.
function rainDucks(count, includeChicks = false) {
  const container = document.body;
  const W = window.innerWidth;
  const H = window.innerHeight;

  // Above a certain count we let ducks fly in ALL directions (not just downward)
  const omnidirectional = count > 20;

  for (let i = 0; i < count; i++) {
    // Stagger more tightly for big bursts so they all feel simultaneous
    const delay = i * Math.max(8, Math.floor(1200 / count));
    setTimeout(() => {
      const bird = document.createElement("div");
      bird.style.position = "fixed";
      bird.style.pointerEvents = "none";
      bird.style.zIndex = "99999";
      bird.style.fontSize = "2.5rem";
      bird.style.lineHeight = "1";
      bird.style.userSelect = "none";

      // Select emoji: ducks by default, yellow chicks if long word
      let emoji = "🦆";
      if (includeChicks) {
        const pool = ["🦆", "🦆", "🦆", "🐥", "🐣", "🐤"];
        emoji = pool[Math.floor(Math.random() * pool.length)];
      }
      bird.textContent = emoji;

      // Travel duration varies slightly per bird for organic feel
      const duration = 1400 + Math.random() * 800;
      bird.style.transition = `transform ${duration}ms linear, opacity ${duration}ms ease-out`;

      let startX, startY, targetX, targetY;

      if (omnidirectional) {
        // Pick a random edge to spawn from
        const edge = Math.floor(Math.random() * 4); // 0=top 1=bottom 2=left 3=right
        if (edge === 0) {
          // Top edge → fly downward, diagonally
          startX = Math.random() * W;
          startY = -40;
          targetX = (Math.random() - 0.5) * W * 1.2;
          targetY = H + 60 + Math.random() * 100;
        } else if (edge === 1) {
          // Bottom edge → fly upward, diagonally
          startX = Math.random() * W;
          startY = H + 40;
          targetX = (Math.random() - 0.5) * W * 1.2;
          targetY = -(H + 60 + Math.random() * 100);
        } else if (edge === 2) {
          // Left edge → fly rightward, diagonally
          startX = -40;
          startY = Math.random() * H;
          targetX = W + 60 + Math.random() * 100;
          targetY = (Math.random() - 0.5) * H * 1.2;
        } else {
          // Right edge → fly leftward, diagonally
          startX = W + 40;
          startY = Math.random() * H;
          targetX = -(W + 60 + Math.random() * 100);
          targetY = (Math.random() - 0.5) * H * 1.2;
        }
      } else {
        // Low count: classic rain from top, mild sway
        startX = Math.random() * W;
        startY = -40;
        targetX = (Math.random() - 0.5) * 200;
        targetY = H + 60;
      }

      bird.style.left = `${startX}px`;
      bird.style.top = `${startY}px`;
      container.appendChild(bird);

      // Force reflow before animating
      bird.offsetHeight;

      // Spin amount grows with count
      const maxSpin = Math.min(30 + count * 12, 1440);
      const rotate = (Math.random() - 0.5) * maxSpin;

      bird.style.transform = `translate(${targetX}px, ${targetY}px) rotate(${rotate}deg)`;
      bird.style.opacity = "0";

      setTimeout(() => bird.remove(), duration + 50);
    }, delay);
  }
}

// textLen = length of wrong text typed into the duck prompt
function startDuckStorm(textLen) {
  // 1 char → 5 ducks, each extra char adds ~3 more, hard cap at 120
  const count = Math.min(5 + (textLen || 0) * 3, 120);

  // If word is longer than 6 letters, yellow chicks are mixed in!
  const includeChicks = textLen > 6;
  rainDucks(count, includeChicks);

  // More quacks for longer text
  const quackCount = Math.min(2 + Math.floor(textLen / 3), 10);
  playDoubleQuack();
  for (let q = 1; q < quackCount; q++) {
    setTimeout(playDoubleQuack, q * 350);
  }
}

const CATEGORIES = [
  {
    id: "cards",
    title: "Cozy Card Games",
    blurb: "Cozy fill-in-the-blank prompt games, anonymous voting, truths, dares, and lighthearted campfire roasts.",
    icon: () => icons.monkeys(),
    gameIds: ["cabin", "cam", "meeting", "rizz", "wyr", "flags", "truths", "roasts"]
  },
  {
    id: "drawing",
    title: "Creative & Drawing",
    blurb: "Secret sketch-sharing, canvas-casting guessers, round-robin book chains, and illustrated chronicles.",
    icon: () => icons.doodles(),
    gameIds: ["chronicles", "doodles", "telestrations", "scribblio"]
  },
  {
    id: "guessing",
    title: "Party Words & Action",
    blurb: "Fast-paced team words guessers, sensor-based forehead actor screens, and wacky response vote matchups.",
    icon: () => icons.meeting(),
    gameIds: ["catchphrase", "headsup", "charades", "quiplash"]
  },
  {
    id: "dice",
    title: "Dice & Scoreboards",
    blurb: "Track high-stakes Farkle scores with Piggyback Mode, play Yahtzee scorecards, bluff in Liar's Dice, or roll virtual dice.",
    icon: () => icons.dice(),
    gameIds: ["yahtzee", "farkle", "liars_dice", "virtual_roller"]
  }
];

function openSubLobby(cat) {
  const weirdUnlocked = localStorage.getItem("lakehouse.weird_unlocked") === "true";
  const catGames = GAMES.filter(g => cat.gameIds.includes(g.id) && (weirdUnlocked || g.familyFriendly));

  const menu = el("div", { className: "menu" });
  catGames.forEach((g) => {
    const tile = el("button", { className: "tile", onClick: () => g.start(() => openSubLobby(cat)) }, [
      el("div", { className: "icon" }, [g.icon()]),
      el("div", { className: "meta" }, [
        el("h3", {}, [document.createTextNode(g.title)]),
        el("p", { text: g.blurb }),
      ]),
    ]);
    menu.appendChild(tile);
  });

  const topbar = el("div", { className: "topbar" }, [
    el("button", { className: "back", onClick: home }, [
      el("span", { style: "width:16px; height:16px; display:inline-block;" }, [icons.back()]),
      el("span", { text: "Main Lobby" })
    ]),
    el("div", { className: "title", text: cat.title }),
    el("span", { style: "width:64px" })
  ]);

  mount(
    topbar,
    el("div", { className: "panel center", style: "max-width: 480px; margin: 0 auto 16px;" }, [
      el("div", { style: "width:48px; height:48px; margin:0 auto 12px; color:var(--sunset-soft);" }, [cat.icon()]),
      el("h2", { text: cat.title, style: "margin:0 0 6px; color:var(--water-foam);" }),
      el("p", { className: "muted", text: cat.blurb })
    ]),
    menu
  );
}

function home() {
  const weirdUnlocked = localStorage.getItem("lakehouse.weird_unlocked") === "true";

  const getCatGamesCount = (cat) => {
    return GAMES.filter(g => cat.gameIds.includes(g.id) && (weirdUnlocked || g.familyFriendly)).length;
  };

  const menu = el("div", { className: "menu" });
  CATEGORIES.forEach((cat) => {
    const count = getCatGamesCount(cat);
    if (count === 0) return;

    const tile = el("button", { 
      className: "tile", 
      onClick: () => openSubLobby(cat) 
    }, [
      el("div", { className: "icon" }, [cat.icon()]),
      el("div", { className: "meta" }, [
        el("h3", {}, [document.createTextNode(cat.title)]),
        el("p", { text: cat.blurb }),
        el("span", { 
          style: "display:inline-block; font-size:0.75rem; font-weight:700; color:var(--sunset-soft); margin-top:6px;", 
          text: `➔ Choose from ${count} game${count !== 1 ? "s" : ""}` 
        })
      ]),
    ]);
    menu.appendChild(tile);
  });

  const settingsPanel = el("div", {
    className: "panel center",
    style: "margin-top: 18px; padding: 16px; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.1); border-radius: 16px;"
  }, [
    el("button", {
      className: "btn ghost small",
      style: "width:100%; display:flex; align-items:center; justify-content:center; gap:8px; font-weight:700; border-radius:12px; box-shadow:none; padding:10px 14px; margin: 0 0 8px; background:rgba(255,255,255,0.03); border-color:rgba(255,255,255,0.1);",
      onClick: () => {
        playQuack();
        startTVHost(home);
      }
    }, [
      el("span", { style: "display:inline-block; font-size:1.15rem; line-height:1; vertical-align:middle; margin-right:4px;" }, [document.createTextNode("📺")]),
      el("span", { text: "Connect as TV Broadcast Screen" })
    ]),
    el("button", {
      className: "btn ghost small",
      style: "width:100%; display:flex; align-items:center; justify-content:center; gap:8px; font-weight:700; border-radius:12px; box-shadow:none; padding:10px 14px; margin: 0 0 8px;",
      onClick: () => openCustomCardsManager(home)
    }, [
      el("span", { style: "width: 18px; height: 18px; display: inline-block;" }, [icons.settings()]),
      el("span", { text: "Manage Custom Cards & Decks" })
    ]),
    el("button", {
      className: "btn ghost small",
      style: "width:100%; display:flex; align-items:center; justify-content:center; gap:8px; font-weight:700; border-radius:12px; box-shadow:none; padding:10px 14px; margin: 0; background:rgba(255,255,255,0.03); border-color:rgba(255,255,255,0.1);",
      onClick: () => gallery.start(home)
    }, [
      el("span", { style: "width: 18px; height: 18px; display: inline-block;" }, [icons.gallery()]),
      el("span", { text: "Art Gallery (Past Doodles)" })
    ])
  ]);

  // Clickable Duck Easter Egg to unlock secret adult/weird modes!
  const duckSpan = el("span", {
    style: "cursor: pointer; display: inline-block; transition: transform 0.2s; font-size: 2.2rem; line-height: 1; vertical-align: middle; user-select: none;",
    onClick: (e) => {
      e.stopPropagation();
      e.currentTarget.style.transform = "scale(1.4) rotate(15deg)";
      setTimeout(() => { e.currentTarget.style.transform = "scale(1)"; }, 150);

      const answer = prompt("💬 What do you want to say to the duck?");
      if (answer !== null) {
        if (answer.trim().toLowerCase() === "monkeys") {
          const nowUnlocked = !weirdUnlocked;
          localStorage.setItem("lakehouse.weird_unlocked", String(nowUnlocked));
          if (nowUnlocked) {
            toast("Sus & Chronically Online modes unlocked!");
          } else {
            toast("Wholesome Family Lock Activated!");
          }
          home(); // Re-render!
        } else {
          // Reset to wholesome normal mode and re-render instantly
          localStorage.setItem("lakehouse.weird_unlocked", "false");
          toast("*The duck stares at you blankly, then starts quacking hysterically!*");
          startDuckStorm(answer.trim().length);
          home(); // Re-render instantly to hide everything
        }
      }
    }
  }, [document.createTextNode("🦆")]);

  const logoScene = el("div", { 
    className: "scene",
    style: "display: flex; align-items: center; justify-content: center; gap: 18px; margin-bottom: 16px; font-size: 2rem; line-height: 1; user-select: none;"
  }, [
    el("span", { style: "display: inline-block; transition: transform 0.2s;" }, [document.createTextNode("🌙")]),
    el("span", { style: "display: inline-block; transition: transform 0.2s;" }, [document.createTextNode("🛶")]),
    el("span", { style: "display: inline-block; transition: transform 0.2s;" }, [document.createTextNode("🏡")]),
    duckSpan
  ]);

  const taglineText = weirdUnlocked 
    ? "Cozy by the water. Unhinged at the table." 
    : "Cozy by the water. Playful at the table.";

  const activeGames = GAMES.filter(g => weirdUnlocked || g.familyFriendly);

  const nodes = [
    el("div", { className: "brand" }, [
      logoScene,
      el("div", { className: "logo", html: 'Lake House <span class="em">Card Games</span>' }),
      el("div", { className: "tagline", text: taglineText }),
    ]),
    menu
  ];

  nodes.push(settingsPanel);

  if (deferredInstall) nodes.push(installBanner());

  nodes.push(el("div", { className: "footer-note", html: `${activeGames.length} games &nbsp;·&nbsp; works offline &nbsp;·&nbsp; v${APP_VERSION}` }));

  mount(...nodes);
}

function installBanner() {
  return el("div", { className: "install-banner" }, [
    el("div", { style: "width: 28px; height: 28px; color: var(--sunset-soft);" }, [icons.public()]),
    el("p", { text: "Install Lake House Card Games for offline, full-screen play." }),
    el("button", {
      className: "btn small", style: "width:auto", text: "Install",
      onClick: async () => {
        if (!deferredInstall) return;
        deferredInstall.prompt();
        await deferredInstall.userChoice;
        deferredInstall = null;
        home();
      },
    }),
  ]);
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstall = e;
  if (document.querySelector(".brand")) home();
});

/* ---------------- Universal Swipe-Back Gesture ---------------- */
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

window.addEventListener("touchstart", (e) => {
  if (e.touches.length !== 1) return;
  const touch = e.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  touchStartTime = Date.now();
}, { passive: true });

window.addEventListener("touchend", (e) => {
  if (e.changedTouches.length !== 1) return;
  const touch = e.changedTouches[0];
  const deltaX = touch.clientX - touchStartX;
  const deltaY = touch.clientY - touchStartY;
  const duration = Date.now() - touchStartTime;

  // Swiped left-to-right starting from left edge, reasonably quick, vertical deviation within bounds
  if (
    touchStartX < 80 &&
    deltaX > 70 &&
    Math.abs(deltaX) > Math.abs(deltaY) * 1.5 &&
    duration < 400 &&
    !document.querySelector("canvas")
  ) {
    const backBtn = document.querySelector(".topbar button.back");
    if (backBtn) {
      backBtn.click();
    }
  }
}, { passive: true });

/* ---------------- Bulletproof Auto-Update via Force Cache-Busting ---------------- */
async function checkForForcedUpdates() {
  try {
    const res = await fetch(`js/version.js?cb=${Date.now()}`);
    if (!res.ok) return;
    const text = await res.text();
    const match = text.match(/APP_VERSION\s*=\s*"([^"]+)"/);
    if (match && match[1] !== APP_VERSION) {
      toast(`New update v${match[1]} detected! Syncing fresh files…`);
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          await reg.unregister();
        }
      }
      const cacheKeys = await caches.keys();
      for (const key of cacheKeys) {
        await caches.delete(key);
      }
      setTimeout(() => {
        window.location.reload(true);
      }, 1200);
    }
  } catch (_) {}
}

/* ---------------- Auto-update via service worker ----------------
 * On every load we register the SW and ask it to check for a new version.
 * A freshly-installed SW calls skipWaiting() and takes control, which fires
 * `controllerchange` — we reload once so the user always gets the latest. */
if ("serviceWorker" in navigator) {
  let reloading = false;
  // Only auto-reload on an *update* (a controller already existed), not the
  // very first install — avoids a needless reload on a user's first visit.
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  });

  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("sw.js");
      // Check for an update immediately on this load.
      reg.update();
      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener("statechange", () => {
          // A new version is ready while an old one controls the page.
          if (sw.state === "installed" && navigator.serviceWorker.controller) {
            toast("Updating to the latest version…");
          }
        });
      });
    } catch { /* offline support is optional */ }
  });
}

home();
checkForForcedUpdates();
