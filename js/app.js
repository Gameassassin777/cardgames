// Lake House Card Games — app shell, home menu, routing, PWA wiring.
import { el, mount, toast } from "./ui.js";
import { APP_VERSION } from "./version.js";
import { makeGame as makeCardGame } from "./cam.js";
import * as meeting from "./meeting.js";
import { makeGame as makeDeck } from "./deckgame.js";
import { PROMPTS, RESPONSES, NORMAL_PROMPTS, NORMAL_RESPONSES, FAMILY_PROMPTS, FAMILY_RESPONSES, CAMPFIRE_ROASTS, LAKE_TRUTHS, WOULD_YOU_RATHER, RED_GREEN, RIZZ_ROULETTE, COZY_WOULD_YOU_RATHER, COZY_MOST_LIKELY, COZY_RED_GREEN, COZY_CAMPFIRE_ROASTS, COZY_TRUTHS_DARES, ZESTY_TRUTHS_DARES } from "./data.js";
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
import { start as startBlankSlate } from "./games/blank_slate.js";

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
const cozyWouldYouRather = makeDeck({ title: "Cabin Would You Rather", source: COZY_WOULD_YOU_RATHER, saveKey: "cabin_wyr.game.v1" });
const zestyWouldYouRather = makeDeck({ title: "Zesty Would You Rather", source: WOULD_YOU_RATHER, saveKey: "wyr.game.v1" });
const cozyRedGreen = makeDeck({ title: "Cabin Red Flag / Green Flag", source: COZY_RED_GREEN, saveKey: "cabin_flags.game.v1" });
const zestyRedGreen = makeDeck({ title: "Zesty Red Flag / Green Flag", source: RED_GREEN, saveKey: "flags.game.v1" });
const cozyTruths = makeDeck({ title: "Truth or Dare", source: COZY_TRUTHS_DARES, saveKey: "truths.game.v1" });
const zestyTruths = makeDeck({ title: "Zesty Truth or Dare", source: ZESTY_TRUTHS_DARES, saveKey: "zesty_truths.game.v1" });
const cozyRoasts = makeDeck({ title: "Cabin Roasts", source: COZY_CAMPFIRE_ROASTS, saveKey: "cabin_roasts.game.v1" });
const zestyRoasts = makeDeck({ title: "Zesty Roasts", source: CAMPFIRE_ROASTS, saveKey: "roasts.game.v1" });
const cozyMeeting = meeting.makeGame({ title: "Cabin Most Likely To", source: COZY_MOST_LIKELY, saveKey: "cabin_meeting.game.v1" });
const zestyMeeting = meeting.makeGame({ title: "Zesty Most Likely To", source: MOST_LIKELY, saveKey: "meeting.game.v1" });


const GAMES = [
  {
    id: "cabin", icon: icons.cabin, title: "Cabin Fever",
    blurb: "Complete prompts using your funniest response cards. The judge decides the winner. 3+ players.",
    start: cabin,
    familyFriendly: true,
    badgeColor: "linear-gradient(145deg, hsl(24,88%,58%), hsl(24,78%,40%))",
  },
  {
    id: "cam", icon: icons.monkeys, title: "Cards Against Monkeys",
    blurb: "Fill in the blanks to complete prompts using response cards. Features internet culture topics. 3+ players.",
    start: monkeys,
    familyFriendly: false,
    badgeColor: "linear-gradient(145deg, hsl(340,70%,50%), hsl(340,62%,34%))",
  },
  {
    id: "cabin_wyr", icon: icons.wyr, title: "Cabin Would You Rather",
    blurb: "Read a clean, cozy dilemma with two choices, and have players vote on their preference. 2+ players.",
    start: cozyWouldYouRather,
    familyFriendly: true,
    badgeColor: "linear-gradient(145deg, hsl(36,70%,50%), hsl(36,60%,34%))",
  },
  {
    id: "wyr", icon: icons.wyr, title: "Zesty Would You Rather",
    blurb: "Read an unhinged, chronically-online dilemma with two sussy choices, and vote. 2+ players.",
    start: zestyWouldYouRather,
    familyFriendly: false,
    badgeColor: "linear-gradient(145deg, hsl(36,90%,55%), hsl(36,80%,38%))",
  },
  {
    id: "cabin_meeting", icon: icons.meeting, title: "Cabin Most Likely To",
    blurb: "Identify the suspect! Vote on which player is most likely to match a clean cabin prompt. 3+ players.",
    start: cozyMeeting,
    familyFriendly: true,
    badgeColor: "linear-gradient(145deg, hsl(207,62%,46%), hsl(207,52%,30%))",
  },
  {
    id: "meeting", icon: icons.meeting, title: "Zesty Most Likely To",
    blurb: "Initiate voting protocol! Vote on which crewmate is the most suspicious or zesty. 3+ players.",
    start: zestyMeeting,
    familyFriendly: false,
    badgeColor: "linear-gradient(145deg, hsl(207,82%,56%), hsl(207,72%,38%))",
  },
  {
    id: "cabin_flags", icon: icons.flags, title: "Cabin Red / Green Flag",
    blurb: "Discuss and judge funny, normal-life character traits as positive, negative, or neutral. 2+ players.",
    start: cozyRedGreen,
    familyFriendly: true,
    badgeColor: "linear-gradient(145deg, hsl(116,45%,38%), hsl(116,38%,24%))",
  },
  {
    id: "flags", icon: icons.flags, title: "Zesty Red / Green Flag",
    blurb: "Discuss and judge chronically-online, sussy, and zesty traits. 2+ players.",
    start: zestyRedGreen,
    familyFriendly: false,
    badgeColor: "linear-gradient(145deg, hsl(116,55%,48%), hsl(116,48%,32%))",
  },
  {
    id: "truths", icon: icons.truths, title: "Cabin Truth or Dare",
    blurb: "Choose between answering a clean truth question or completing a goofy cabin dare. Suitable for any group size.",
    start: cozyTruths,
    familyFriendly: true,
    badgeColor: "linear-gradient(145deg, hsl(48,70%,45%), hsl(48,60%,30%))",
  },
  {
    id: "zesty_truths", icon: icons.fire, title: "Zesty Truth or Dare",
    blurb: "The adult version of Truth or Dare. Choose between revealing sussy secrets or doing exotic dares. 2+ players.",
    start: zestyTruths,
    familyFriendly: false,
    badgeColor: "linear-gradient(145deg, hsl(340,85%,55%), hsl(340,75%,38%))",
  },
  {
    id: "cabin_roasts", icon: icons.roasts, title: "Cabin Roasts",
    blurb: "Lighthearted group roasts, clean dares, and funny social dilemmas. 3+ players.",
    start: cozyRoasts,
    familyFriendly: true,
    badgeColor: "linear-gradient(145deg, hsl(18,65%,45%), hsl(18,55%,30%))",
  },
  {
    id: "roasts", icon: icons.roasts, title: "Zesty Roasts",
    blurb: "Absurd group roasts, edgy dares, and unhinged campfire dilemmas. 3+ players.",
    start: zestyRoasts,
    familyFriendly: false,
    badgeColor: "linear-gradient(145deg, hsl(18,85%,55%), hsl(18,75%,38%))",
  },
  {
    id: "rizz", icon: icons.rizz, title: "Rizz Roulette",
    blurb: "Draw cards to complete interactive zesty dares, confess secrets, or defend hot takes. 2+ players.",
    start: rizzRoulette,
    familyFriendly: false,
    badgeColor: "linear-gradient(145deg, hsl(310,65%,52%), hsl(310,55%,36%))",
  },
  {
    id: "catchphrase", icon: icons.catchphrase, title: "Catchphrase",
    blurb: "Teams race to guess secret words described by their teammates before the round timer runs out. 4+ players.",
    start: catchphrase.start,
    familyFriendly: true,
    badgeColor: "linear-gradient(145deg, hsl(270,60%,58%), hsl(270,52%,40%))",
  },
  {
    id: "doodles", icon: icons.doodles, title: "Telephone Doodles (online)",
    blurb: "Players alternate between writing prompts and drawing scenes online. 3+ players.",
    start: (home) => gartic.start(home),
    familyFriendly: true,
    badgeColor: "linear-gradient(145deg, hsl(170,60%,45%), hsl(170,52%,30%))",
  },
  {
    id: "quiplash", icon: icons.meeting, title: "Quiplash",
    blurb: "Write hilarious answers to wacky prompts, then pass the device secretly to vote on the funniest combination. 3-8 players.",
    start: startQuiplash,
    familyFriendly: true,
    badgeColor: "linear-gradient(145deg, hsl(195,75%,48%), hsl(195,65%,32%))",
  },
  {
    id: "telestrations", icon: icons.doodles, title: "Telestrations",
    blurb: "A classic telephone chain of alternating drawings and guesses. See the hilarious mutation at the end! 3-8 players.",
    start: startTelestrations,
    familyFriendly: true,
    badgeColor: "linear-gradient(145deg, hsl(140,55%,44%), hsl(140,48%,30%))",
  },
  {
    id: "scribblio", icon: icons.sibling, title: "Scribbl.io",
    blurb: "A hot-seat canvas drawing game. One player draws a secret word on canvas, while other players sit around and shout guesses! 2-8 players.",
    start: startScribblio,
    familyFriendly: true,
    badgeColor: "linear-gradient(145deg, hsl(155,58%,42%), hsl(155,50%,28%))",
  },
  {
    id: "headsup", icon: icons.rizz, title: "Heads Up",
    blurb: "Forehead word guessing game! Hold the phone to your head and guess words from your friends' clues. 2+ players.",
    start: startHeadsup,
    familyFriendly: true,
    badgeColor: "linear-gradient(145deg, hsl(207,82%,56%), hsl(207,72%,38%))",
  },
  {
    id: "charades", icon: icons.flags, title: "Charades",
    blurb: "Forehead acting game! Guess the words from your friends' silent physical gestures. 2+ players.",
    start: startCharades,
    familyFriendly: true,
    badgeColor: "linear-gradient(145deg, hsl(180,62%,44%), hsl(180,55%,30%))",
  },
  {
    id: "yahtzee", icon: icons.dice, title: "Yahtzee Scorecard",
    blurb: "Roll virtual dice to score full houses, straights, and Yahtzees on your scoreboard! 1-8 players.",
    start: startYahtzee,
    familyFriendly: true,
    badgeColor: "linear-gradient(145deg, hsl(270,60%,58%), hsl(270,52%,40%))",
  },
  {
    id: "farkle", icon: icons.dice, title: "Farkle Tracker",
    blurb: "Roll high-stakes combinations, bank points, and try not to Farkle! Supports Piggyback Mode. 1-8 players.",
    start: startFarkle,
    familyFriendly: true,
    badgeColor: "linear-gradient(145deg, hsl(288,58%,54%), hsl(288,50%,38%))",
  },
  {
    id: "liars_dice", icon: icons.dice, title: "Liar's Dice",
    blurb: "A classic high-stakes bluffing game! Bid on total dice faces in play, and call your friends out. 2-8 players.",
    start: startLiarsDice,
    familyFriendly: true,
    badgeColor: "linear-gradient(145deg, hsl(250,65%,56%), hsl(250,55%,40%))",
  },
  {
    id: "virtual_roller", icon: icons.dice, title: "Virtual Dice Roller",
    blurb: "Need dice for other board games? Roll and lock up to 6 custom virtual dice in our premium 3D roller!",
    start: startDiceRoller,
    familyFriendly: true,
    badgeColor: "linear-gradient(145deg, hsl(230,70%,58%), hsl(230,60%,40%))",
  },
  {
    id: "chronicles", icon: icons.pen, title: "Cozy Chronicles (online)",
    blurb: "Draw individual sentences of a secret story without knowing the rest online. At the end, read your illustrated picture book! 3-8 players.",
    start: startChronicles,
    familyFriendly: true,
    badgeColor: "linear-gradient(145deg, hsl(160,58%,44%), hsl(160,50%,30%))",
  },
  {
    id: "blank_slate", icon: icons.slate, title: "Blank Slate",
    blurb: "Write secret words to complete phrases! Score 3 points if you match exactly one other player, and 1 point if you match multiple. 3-8 players.",
    start: startBlankSlate,
    familyFriendly: true,
    badgeColor: "linear-gradient(145deg, hsl(200,80%,55%), hsl(200,70%,38%))",
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
    blurb: "Fill-in-the-blank prompts, anonymous voting, truths, dares & campfire roasts.",
    icon: () => icons.monkeys(),
    theme: "blue",
    gameIds: ["cabin", "cam", "cabin_wyr", "wyr", "cabin_meeting", "meeting", "cabin_flags", "flags", "truths", "zesty_truths", "cabin_roasts", "roasts", "rizz"]
  },
  {
    id: "drawing",
    title: "Creative & Drawing",
    blurb: "Sketch-sharing, canvas guessers, round-robin book chains & illustrated chronicles.",
    icon: () => icons.doodles(),
    theme: "green",
    gameIds: ["chronicles", "doodles", "telestrations", "scribblio"]
  },
  {
    id: "guessing",
    title: "Party Words & Action",
    blurb: "Fast team word guessers, forehead actor screens & wacky response vote-offs.",
    icon: () => icons.meeting(),
    theme: "orange",
    gameIds: ["catchphrase", "headsup", "charades", "quiplash", "blank_slate"]
  },
  {
    id: "dice",
    title: "Dice & Scoreboards",
    blurb: "Farkle, Yahtzee, Liar's Dice & a premium 3D virtual dice roller.",
    icon: () => icons.dice(),
    theme: "purple",
    gameIds: ["yahtzee", "farkle", "liars_dice", "virtual_roller"]
  }
];

// Inject animated bokeh bubbles once into the DOM
(function injectBokeh() {
  if (document.querySelector(".bokeh-layer")) return;
  const layer = document.createElement("div");
  layer.className = "bokeh-layer";
  const bubbles = [
    { w: 280, x: 8,  y: 5,  dur: 18, delay: 0,    tx: 30,  ty: -50, olo: 0.35, ohi: 0.65 },
    { w: 180, x: 72, y: 12, dur: 14, delay: -3,   tx: -20, ty: -40, olo: 0.25, ohi: 0.55 },
    { w: 340, x: 55, y: 45, dur: 22, delay: -7,   tx: 40,  ty: 30,  olo: 0.2,  ohi: 0.45 },
    { w: 150, x: 85, y: 68, dur: 16, delay: -2,   tx: -30, ty: -25, olo: 0.3,  ohi: 0.6  },
    { w: 220, x: 20, y: 75, dur: 20, delay: -10,  tx: 25,  ty: -35, olo: 0.2,  ohi: 0.5  },
    { w: 120, x: 45, y: 88, dur: 12, delay: -5,   tx: -15, ty: -20, olo: 0.4,  ohi: 0.7  },
    { w: 200, x: 90, y: 20, dur: 17, delay: -8,   tx: -25, ty: 30,  olo: 0.25, ohi: 0.5  },
    { w: 160, x: 35, y: 30, dur: 13, delay: -1,   tx: 20,  ty: 25,  olo: 0.3,  ohi: 0.6  },
  ];
  bubbles.forEach(b => {
    const d = document.createElement("div");
    d.className = "bokeh-bubble";
    d.style.cssText = [
      `width:${b.w}px`, `height:${b.w}px`,
      `left:${b.x}%`,  `top:${b.y}%`,
      `--dur:${b.dur}s`, `--delay:${b.delay}s`,
      `--tx:${b.tx}px`,  `--ty:${b.ty}px`,
      `--op-lo:${b.olo}`, `--op-hi:${b.ohi}`,
    ].join(";");
    layer.appendChild(d);
  });
  document.body.insertBefore(layer, document.body.firstChild);
}());

function openSubLobby(cat) {
  const weirdUnlocked = localStorage.getItem("lakehouse.weird_unlocked") === "true";
  const catGames = GAMES.filter(g => cat.gameIds.includes(g.id) && (weirdUnlocked || g.familyFriendly));

  // Game-list row layout
  const menu = el("div", { className: "menu game-list" });
  catGames.forEach((g) => {
    // Icon badge with per-game gradient color
    const iconBadge = el("div", { className: "icon" }, [g.icon()]);
    iconBadge.style.background = g.badgeColor || "linear-gradient(145deg, hsl(207,82%,56%), hsl(207,72%,38%))";

    const titleNode = el("h3", {}, [document.createTextNode(g.title)]);
    if (!g.familyFriendly) {
      titleNode.appendChild(el("span", { className: "badge", text: "Adult" }));
    }

    const tile = el("button", { className: "tile", onClick: () => g.start(() => openSubLobby(cat)) }, [
      iconBadge,
      el("div", { className: "meta" }, [
        titleNode,
        el("p", { text: g.blurb }),
      ]),
    ]);
    menu.appendChild(tile);
  });

  const topbar = el("div", { className: "topbar" }, [
    el("button", { className: "back", onClick: home }, [
      el("span", { style: "width:16px; height:16px; display:inline-block;" }, [icons.back()]),
      el("span", { text: "Back" })
    ]),
    el("div", { className: "title", text: cat.title }),
    el("span", { style: "width:64px" })
  ]);

  // Blurb panel in Aero glass style
  const blurbPanel = el("div", { className: "panel", style: "margin: 0 0 12px; padding: 16px 18px; display:flex; align-items:center; gap:14px;" }, [
    el("div", { style: "width:40px; height:40px; flex-shrink:0; color:var(--aero-sky-deep);" }, [cat.icon()]),
    el("p", { style: "margin:0; font-size:0.88rem; color:var(--text-mid); line-height:1.4;", text: cat.blurb })
  ]);

  mount(
    topbar,
    blurbPanel,
    menu
  );
}

function home() {
  const weirdUnlocked = localStorage.getItem("lakehouse.weird_unlocked") === "true";

  const getCatGamesCount = (cat) => {
    return GAMES.filter(g => cat.gameIds.includes(g.id) && (weirdUnlocked || g.familyFriendly)).length;
  };

  // 2×2 category grid
  const menu = el("div", { className: "menu" });
  CATEGORIES.forEach((cat) => {
    const count = getCatGamesCount(cat);
    if (count === 0) return;

    // Header strip (colored gloss, houses icon + title)
    const header = el("div", { className: "tile-header" }, [
      el("div", { className: "tile-icon" }, [cat.icon()]),
      el("div", { className: "meta" }, [
        el("h3", {}, [document.createTextNode(cat.title)]),
      ]),
    ]);

    // Body below the colored header
    const body = el("div", { className: "tile-body" }, [
      el("p", { className: "meta", text: cat.blurb }),
      el("span", { className: "tile-count", text: `${count} game${count !== 1 ? "s" : ""} →` }),
    ]);

    const tile = el("button", {
      className: "tile",
      onClick: () => openSubLobby(cat)
    }, [header, body]);

    // Attach the theme so CSS can color it
    tile.dataset.theme = cat.theme;

    menu.appendChild(tile);
  });

  const settingsPanel = el("div", {
    className: "panel",
    style: "margin-top: 14px; padding: 14px 16px;"
  }, [
    el("div", { style: "display:flex; gap:10px; flex-wrap:wrap; margin-bottom:10px;" }, [
      el("button", {
        className: "btn ghost small",
        style: "flex:1; display:flex; align-items:center; justify-content:center; gap:8px; min-width:140px;",
        onClick: () => openCustomCardsManager(home)
      }, [
        el("span", { style: "width:18px; height:18px; display:inline-block;" }, [icons.settings()]),
        el("span", { text: "Custom Cards" })
      ]),
      el("button", {
        className: "btn ghost small",
        style: "flex:1; display:flex; align-items:center; justify-content:center; gap:8px; min-width:140px;",
        onClick: () => gallery.start(home)
      }, [
        el("span", { style: "width:18px; height:18px; display:inline-block;" }, [icons.eye()]),
        el("span", { text: "Doodle Gallery" })
      ]),
    ]),
    el("hr", { style: "border:none; border-top:1px solid rgba(0,80,180,0.1); border-bottom:1px solid rgba(255,255,255,0.5); margin: 6px 0 10px;" }),
    el("div", { className: "tv-switch-container" }, [
      el("div", { style: "text-align: left;" }, [
        el("div", { className: "tv-switch-label" }, [
          el("span", { style: "display:inline-block; font-size:1.2rem; line-height:1; margin-right:4px;" }, [document.createTextNode("📺")]),
          el("span", { text: "TV Broadcast Device" })
        ]),
        el("div", { className: "tv-switch-subtext", text: "Transform this screen into a live game monitor" })
      ]),
      el("label", { className: "ios-switch" }, [
        el("input", {
          type: "checkbox",
          id: "tv-device-toggle",
          onChange: (e) => {
            if (e.target.checked) {
              playQuack();
              startTVHost(home);
            }
          }
        }),
        el("span", { className: "ios-switch-slider" })
      ])
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

// TV direct-entry auto-detection disabled - only manually activated via settings
home();
checkForForcedUpdates();
