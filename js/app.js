// Lake House Card Games — app shell, home menu, routing, PWA wiring.
import { el, mount, toast } from "./ui.js";
import { APP_VERSION } from "./version.js";
import { makeGame as makeCardGame } from "./cam.js";
import * as meeting from "./meeting.js";
import { makeGame as makeDeck } from "./deckgame.js";
import { PROMPTS, RESPONSES, NORMAL_PROMPTS, NORMAL_RESPONSES, LAKE_TRUTHS, WOULD_YOU_RATHER, RED_GREEN, RIZZ_ROULETTE } from "./data.js";
import { openCustomCardsManager } from "./custom_cards_ui.js";

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
const rizzRoulette = makeDeck({ title: "Rizz Roulette", source: RIZZ_ROULETTE, saveKey: "rizz.game.v1" });
const wouldYouRather = makeDeck({ title: "Would You Rather", source: WOULD_YOU_RATHER, saveKey: "wyr.game.v1" });
const redGreen = makeDeck({ title: "Red Flag / Green Flag", source: RED_GREEN, saveKey: "flags.game.v1" });
const lakeTruths = makeDeck({ title: "Lake House Truths", source: LAKE_TRUTHS, saveKey: "truths.game.v1" });

const GAMES = [
  {
    id: "cam", icon: "🐒", title: "Cards Against Monkeys", badge: "18+",
    blurb: "Max-sus, chronically-online deck. Fill in the blanks, crown the funniest. 3+ players.",
    start: monkeys,
  },
  {
    id: "cabin", icon: "🛖", title: "Cards Against the Cabin", badge: "normal",
    blurb: "Same game, tamer deck — dark/absurd lake-house humor. Fill the blanks, crown the funniest. 3+ players.",
    start: cabin,
  },
  {
    id: "meeting", icon: "🚨", title: "Emergency Meeting", badge: "sus",
    blurb: "Vote on who's most likely to… then eject the sussiest baka. 3+ players.",
    start: meeting.start,
  },
  {
    id: "rizz", icon: "😏", title: "Rizz Roulette", badge: "spicy",
    blurb: "Draw and do it: deliver the rizz, spill the confession, take the dare, defend the hot take.",
    start: rizzRoulette,
  },
  {
    id: "wyr", icon: "🤔", title: "Would You Rather", badge: "unhinged",
    blurb: "Impossible, chronically-online dilemmas. Read both, everyone picks a side.",
    start: wouldYouRather,
  },
  {
    id: "flags", icon: "🚩", title: "Red Flag / Green Flag",
    blurb: "Judge the most cursed traits. Shout your verdict. Argue about it.",
    start: redGreen,
  },
  {
    id: "truths", icon: "🛶", title: "Lake House Truths",
    blurb: "Would-you-rather, truths & dares for around the firepit. Any group size.",
    start: lakeTruths,
  },
];

function home() {
  const menu = el("div", { className: "menu" });
  GAMES.forEach((g) => {
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

  const nodes = [
    el("div", { className: "brand" }, [
      el("div", { className: "scene", text: "🌙  🛶  🌲🏠🌲  🦆" }),
      el("div", { className: "logo", html: 'Lake House <span class="em">Card Games</span>' }),
      el("div", { className: "tagline", text: "Cozy by the water. Unhinged at the table." }),
    ]),
    menu,
    settingsPanel
  ];

  if (deferredInstall) nodes.push(installBanner());

  nodes.push(el("div", { className: "footer-note", html: `7 games • works offline • add to your home screen 🏕️ &nbsp;·&nbsp; v${APP_VERSION}` }));

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
