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
  title: "Fill in the Blank", icon: icons.cabin,
  prompts: combinedCabinPrompts, responses: combinedCabinResponses,
  winnerTitle: "Round Winner",
  blurb: "A fill-in-the-blank party game. Everyone picks the funniest response card to complete a prompt; the judge decides the winner. Pass the device, hands stay secret.",
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
    id: "cabin", icon: icons.cabin, title: "Fill in the Blank",
    blurb: "Everyone picks the funniest response card to complete a prompt. The judge decides the winner. 3+ players.",
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
    id: "doodles", icon: icons.doodles, title: "Telephone Doodles",
    blurb: "Players alternate between writing prompts and drawing scenes — see how the message changes! 3+ players.",
    start: (home) => gartic.start(home),
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

// Spawn `count` ducks flying in random directions from random edges.
// Chaos level (angle spread, speed, spin) also increases with count.
function rainDucks(count) {
  const container = document.body;
  const W = window.innerWidth;
  const H = window.innerHeight;

  // Above a certain count we let ducks fly in ALL directions (not just downward)
  const omnidirectional = count > 20;

  for (let i = 0; i < count; i++) {
    // Stagger more tightly for big bursts so they all feel simultaneous
    const delay = i * Math.max(8, Math.floor(1200 / count));
    setTimeout(() => {
      const duck = document.createElement("div");
      duck.style.position = "fixed";
      duck.style.pointerEvents = "none";
      duck.style.zIndex = "99999";

      // Render custom SVG duck instead of plain text emoji
      const duckSvg = icons.duck();
      duckSvg.style.width = "100%";
      duckSvg.style.height = "100%";
      duckSvg.style.color = "var(--sunset-soft)";
      duck.appendChild(duckSvg);

      // Size: tiny swarm for big counts, bigger individuals for small counts
      const minSize = omnidirectional ? 1.5 : 1.8;
      const maxExtra = omnidirectional ? 2.0 : 3.0;
      const sizeRem = minSize + Math.random() * maxExtra;
      duck.style.width = `${sizeRem}rem`;
      duck.style.height = `${sizeRem}rem`;

      // Travel duration varies slightly per duck for organic feel
      const duration = 1400 + Math.random() * 800;
      duck.style.transition = `transform ${duration}ms linear, opacity ${duration}ms ease-out`;

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

      duck.style.left = `${startX}px`;
      duck.style.top = `${startY}px`;
      container.appendChild(duck);

      // Force reflow before animating
      duck.offsetHeight;

      // Spin amount grows with count
      const maxSpin = Math.min(30 + count * 12, 1440);
      const rotate = (Math.random() - 0.5) * maxSpin;

      duck.style.transform = `translate(${targetX}px, ${targetY}px) rotate(${rotate}deg)`;
      duck.style.opacity = "0";

      setTimeout(() => duck.remove(), duration + 50);
    }, delay);
  }
}

// textLen = length of wrong text typed into the duck prompt
function startQuackStorm(textLen) {
  // 1 char → 5 ducks, each extra char adds ~3 more, hard cap at 120
  const count = Math.min(5 + (textLen || 0) * 3, 120);

  rainDucks(count);

  // More quacks for longer text
  const quackCount = Math.min(2 + Math.floor(textLen / 3), 10);
  playDoubleQuack();
  for (let q = 1; q < quackCount; q++) {
    setTimeout(playDoubleQuack, q * 350);
  }
}

function home() {
  const weirdUnlocked = localStorage.getItem("lakehouse.weird_unlocked") === "true";

  const activeGames = GAMES.filter(g => weirdUnlocked || g.familyFriendly);

  const menu = el("div", { className: "menu" });
  activeGames.forEach((g) => {
    const tile = el("button", { className: "tile", onClick: () => g.start(home) }, [
      el("div", { className: "icon" }, [g.icon()]),
      el("div", { className: "meta" }, [
        el("h3", {}, [document.createTextNode(g.title)]),
        el("p", { text: g.blurb }),
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
    style: "cursor: pointer; display: inline-block; transition: transform 0.2s; width: 36px; height: 36px; color: var(--sunset-soft); vertical-align: middle;",
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
          startQuackStorm(answer.trim().length);
          home(); // Re-render instantly to hide everything
        }
      }
    }
  }, [icons.duck()]);

  const logoScene = el("div", { 
    className: "scene",
    style: "display: flex; align-items: center; justify-content: center; gap: 14px; margin-bottom: 12px;"
  }, [
    el("div", { style: "width: 32px; height: 32px; color: var(--sunset-soft); opacity: 0.85;" }, [icons.moon()]),
    el("div", { style: "width: 32px; height: 32px; color: var(--lake-light); opacity: 0.85;" }, [icons.canoe()]),
    el("div", { style: "width: 32px; height: 32px; color: var(--sunset-soft); opacity: 0.85;" }, [icons.cabin()]),
    duckSpan
  ]);

  const taglineText = weirdUnlocked 
    ? "Cozy by the water. Unhinged at the table." 
    : "Cozy by the water. Playful at the table.";

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
