// Lake House Card Games — app shell, home menu, routing, PWA wiring.
import { el, mount, toast } from "./ui.js";
import { APP_VERSION } from "./version.js";
import { makeGame as makeCardGame } from "./cam.js";
import * as meeting from "./meeting.js";
import { makeGame as makeDeck } from "./deckgame.js";
import { PROMPTS, RESPONSES, NORMAL_PROMPTS, NORMAL_RESPONSES, FAMILY_PROMPTS, FAMILY_RESPONSES, SIBLING_RIVALRY, FAMILY_ROASTS, LAKE_TRUTHS, WOULD_YOU_RATHER, RED_GREEN, RIZZ_ROULETTE } from "./data.js";
import { openCustomCardsManager } from "./custom_cards_ui.js";
import * as catchphrase from "./catchphrase.js";

// Force wholesome normal mode on every app restart/page load
localStorage.setItem("lakehouse.weird_unlocked", "false");

let deferredInstall = null;

const monkeys = makeCardGame({
  title: "Cards Against Monkeys", icon: "🐒",
  prompts: PROMPTS, responses: RESPONSES,
  winnerTitle: "Goon Commander",
  blurb: "A chronically-online party game. One player is the <b>Card Czar</b> each round; everyone else fills in the blank with their funniest card. The Czar picks the winner. Pass the device around — hands stay secret.",
  footer: "18+ brain-rot humor. Best with friends who can take a joke.",
  saveKey: "cam.game.v1", namesKey: "cam.names.v1", targetKey: "cam.target", physicalKey: "cam.physical",
});
const cabin = makeCardGame({
  title: "Cards Against the Cabin", icon: "🛖",
  prompts: NORMAL_PROMPTS, responses: NORMAL_RESPONSES,
  winnerTitle: "Cabin Champion",
  blurb: "The same fill-in-the-blank game with a tamer (still very adult) deck — dark, absurd, lake-house humor. Card Czar each round; pass the device, hands stay secret.",
  footer: "A more normal deck. Still an adult party game.",
  saveKey: "cabin.game.v1", namesKey: "cabin.names.v1", targetKey: "cabin.target", physicalKey: "cabin.physical",
});
const family = makeCardGame({
  title: "Cards Against the Family", icon: "👨‍👩‍👧‍👦",
  prompts: FAMILY_PROMPTS, responses: FAMILY_RESPONSES,
  winnerTitle: "Family Champion",
  blurb: "A wholesome, silly, campfire fill-in-the-blanks party game. Perfect for kids, parents, and cabin nights.",
  footer: "100% wholesome, goofy fun for the whole family.",
  saveKey: "family.game.v1", namesKey: "family.names.v1", targetKey: "family.target", physicalKey: "family.physical",
});
const rizzRoulette = makeDeck({ title: "Rizz Roulette", source: RIZZ_ROULETTE, saveKey: "rizz.game.v1" });
const wouldYouRather = makeDeck({ title: "Would You Rather", source: WOULD_YOU_RATHER, saveKey: "wyr.game.v1" });
const redGreen = makeDeck({ title: "Red Flag / Green Flag", source: RED_GREEN, saveKey: "flags.game.v1" });
const lakeTruths = makeDeck({ title: "Lake House Truths", source: LAKE_TRUTHS, saveKey: "truths.game.v1" });
const siblingRivalry = makeDeck({ title: "Sibling Rivalry", source: SIBLING_RIVALRY, saveKey: "sibling.game.v1" });
const familyRoasts = makeDeck({ title: "Family Roasts", source: FAMILY_ROASTS, saveKey: "roasts.game.v1" });

const GAMES = [
  {
    id: "family", icon: "👨‍👩‍👧‍👦", title: "Cards Against the Family", badge: "family",
    blurb: "A wholesome campfire fill-in-the-blanks game. Silly, PG prompts. Perfect for kids and parents. 3+ players.",
    start: family,
    familyFriendly: true,
  },
  {
    id: "cam", icon: "🐒", title: "Cards Against Monkeys", badge: "18+",
    blurb: "Max-sus, chronically-online deck. Fill in the blanks, crown the funniest. 3+ players.",
    start: monkeys,
    familyFriendly: false,
  },
  {
    id: "cabin", icon: "🛖", title: "Cards Against the Cabin", badge: "normal",
    blurb: "Same game, tamer deck — dark/absurd lake-house humor. Fill the blanks, crown the funniest. 3+ players.",
    start: cabin,
    familyFriendly: false,
  },
  {
    id: "meeting", icon: "🚨", title: "Emergency Meeting", badge: "sus",
    blurb: "Vote on who's most likely to… then eject the sussiest baka. 3+ players.",
    start: meeting.start,
    familyFriendly: false,
  },
  {
    id: "rizz", icon: "😏", title: "Rizz Roulette", badge: "spicy",
    blurb: "Draw and do it: deliver the rizz, spill the confession, take the dare, defend the hot take.",
    start: rizzRoulette,
    familyFriendly: false,
  },
  {
    id: "wyr", icon: "🤔", title: "Would You Rather", badge: "unhinged",
    blurb: "Impossible, chronically-online dilemmas. Read both, everyone picks a side.",
    start: wouldYouRather,
    familyFriendly: false,
  },
  {
    id: "flags", icon: "🚩", title: "Red Flag / Green Flag",
    blurb: "Judge the most cursed traits. Shout your verdict. Argue about it.",
    start: redGreen,
    familyFriendly: true,
  },
  {
    id: "truths", icon: "🛶", title: "Lake House Truths",
    blurb: "Would-you-rather, truths & dares for around the firepit. Any group size.",
    start: lakeTruths,
    familyFriendly: true,
  },
  {
    id: "sibling", icon: "🥊", title: "Sibling Rivalry", badge: "rivalry",
    blurb: "Edgy PG-13 sibling roasts, goofy dares, and funny dilemmas. 2+ players.",
    start: siblingRivalry,
    familyFriendly: true,
  },
  {
    id: "roasts", icon: "🔥", title: "Family Roasts", badge: "roast",
    blurb: "Campfire truths and lighthearted PG-13 family roasts. 3+ players.",
    start: familyRoasts,
    familyFriendly: true,
  },
  {
    id: "catchphrase", icon: "🗣️", title: "Lake House Catchphrase", badge: "active",
    blurb: "Fast-paced hot-potato word guessing! Describe the phrase, guess, and pass before the timer buzzes! 4+ players.",
    start: catchphrase.start,
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

function rainDucks() {
  const container = document.body;
  const count = 40;
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const duck = document.createElement("div");
      duck.textContent = "🦆";
      duck.style.position = "fixed";
      duck.style.left = `${Math.random() * 100}vw`;
      duck.style.top = `-40px`;
      duck.style.fontSize = `${1.2 + Math.random() * 2.5}rem`;
      duck.style.pointerEvents = "none";
      duck.style.zIndex = "99999";
      duck.style.transition = "transform 1.8s linear, opacity 1.8s ease-out";
      container.appendChild(duck);

      // Force a reflow
      duck.offsetHeight;

      const targetY = window.innerHeight + 60;
      const targetX = (Math.random() - 0.5) * 200; // sway left/right
      const rotate = (Math.random() - 0.5) * 720; // spin

      duck.style.transform = `translate(${targetX}px, ${targetY}px) rotate(${rotate}deg)`;
      duck.style.opacity = "0";

      // Cleanup
      setTimeout(() => {
        duck.remove();
      }, 1850);
    }, i * 45); // Stagger spawning for a waterfall effect
  }
}

function startQuackStorm() {
  rainDucks();
  playDoubleQuack();
  setTimeout(playDoubleQuack, 400);
  setTimeout(playDoubleQuack, 800);
  setTimeout(playDoubleQuack, 1200);
}

function home() {
  const weirdUnlocked = localStorage.getItem("lakehouse.weird_unlocked") === "true";

  const activeGames = GAMES.filter(g => weirdUnlocked || g.familyFriendly);

  const menu = el("div", { className: "menu" });
  activeGames.forEach((g) => {
    menu.appendChild(el("button", { className: "tile", onClick: () => g.start(home) }, [
      el("div", { className: "icon", text: g.icon }),
      el("div", { className: "meta" }, [
        el("h3", {}, [
          document.createTextNode(g.title),
          g.badge ? el("span", { className: "badge", text: g.badge }) : null,
        ]),
        el("p", { text: g.blurb }),
      ]),
    ]));
  });

  const settingsPanel = el("div", {
    className: "panel center",
    style: "margin-top: 18px; padding: 12px; background: rgba(255,255,255,0.03); border: 1px dashed rgba(205, 238, 242, 0.2); border-radius: 16px;"
  }, [
    el("button", {
      className: "btn ghost small",
      style: "width:100%; display:flex; align-items:center; justify-content:center; gap:8px; font-weight:700; border-radius:12px; box-shadow:none; padding:10px 14px; margin: 0;",
      onClick: () => openCustomCardsManager(home)
    }, [
      el("span", { style: "font-size:1.15rem", text: "⚙️" }),
      el("span", { text: "Manage Custom Cards & Decks" })
    ])
  ]);

  // Clickable Duck Easter Egg to unlock secret adult/weird modes!
  const duckSpan = el("span", {
    style: "cursor: pointer; display: inline-block; transition: transform 0.2s;",
    text: "🦆",
    onClick: (e) => {
      e.stopPropagation();
      e.target.style.transform = "scale(1.4) rotate(15deg)";
      setTimeout(() => { e.target.style.transform = "scale(1)"; }, 150);

      const answer = prompt("💬 What do you want to say to the duck?");
      if (answer !== null) {
        if (answer.trim().toLowerCase() === "monkeys") {
          const nowUnlocked = !weirdUnlocked;
          localStorage.setItem("lakehouse.weird_unlocked", String(nowUnlocked));
          if (nowUnlocked) {
            toast("🎉 Sus & Chronically Online modes unlocked! 🤫");
          } else {
            toast("🔒 Wholesome Family Lock Activated! 👨‍👩‍👧‍👦");
          }
          home(); // Re-render!
        } else {
          // Reset to wholesome normal mode and re-render instantly
          localStorage.setItem("lakehouse.weird_unlocked", "false");
          toast("🦆 *The duck stares at you blankly, then starts quacking hysterically!*");
          startQuackStorm();
          home(); // Re-render instantly to hide everything
        }
      }
    }
  });

  const logoScene = el("div", { className: "scene" }, [
    document.createTextNode("🌙  🛶  🌲🏠🌲  "),
    duckSpan
  ]);

  const taglineText = weirdUnlocked 
    ? "Cozy by the water. Unhinged at the table. 🤫" 
    : "Cozy by the water. Playful at the table. 👨‍👩‍👧‍👦";

  const nodes = [
    el("div", { className: "brand" }, [
      logoScene,
      el("div", { className: "logo", html: 'Lake House <span class="em">Card Games</span>' }),
      el("div", { className: "tagline", text: taglineText }),
    ]),
    menu
  ];

  if (weirdUnlocked) {
    nodes.push(settingsPanel);
  }

  if (deferredInstall) nodes.push(installBanner());

  nodes.push(el("div", { className: "footer-note", html: `${activeGames.length} games • works offline • add to your home screen 🏕️ &nbsp;·&nbsp; v${APP_VERSION}` }));

  mount(...nodes);
}

function installBanner() {
  return el("div", { className: "install-banner" }, [
    el("span", { style: "font-size:1.6rem", text: "📲" }),
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
