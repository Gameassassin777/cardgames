// Lake House Card Games — app shell, home menu, routing, PWA wiring.
import { el, mount, toast } from "./ui.js";
import { APP_VERSION } from "./version.js";
import * as cam from "./cam.js";
import * as meeting from "./meeting.js";
import { makeGame } from "./deckgame.js";
import { LAKE_TRUTHS, WOULD_YOU_RATHER, RED_GREEN } from "./data.js";

let deferredInstall = null;

const wouldYouRather = makeGame({ title: "Would You Rather", source: WOULD_YOU_RATHER });
const redGreen = makeGame({ title: "Red Flag / Green Flag", source: RED_GREEN });
const lakeTruths = makeGame({ title: "Lake House Truths", source: LAKE_TRUTHS });

const GAMES = [
  {
    id: "cam", icon: "🐒", title: "Cards Against Monkeys", badge: "18+",
    blurb: "Chronically-online party game. Fill in the blanks, crown the funniest. 3+ players.",
    start: cam.start,
  },
  {
    id: "meeting", icon: "🚨", title: "Emergency Meeting", badge: "sus",
    blurb: "Vote on who's most likely to… then eject the sussiest baka. 3+ players.",
    start: meeting.start,
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

  const nodes = [
    el("div", { className: "brand" }, [
      el("div", { className: "scene", text: "🌙  🛶  🌲🏠🌲  🦆" }),
      el("div", { className: "logo", html: 'Lake House <span class="em">Card Games</span>' }),
      el("div", { className: "tagline", text: "Cozy by the water. Unhinged at the table." }),
    ]),
    menu,
  ];

  if (deferredInstall) nodes.push(installBanner());

  nodes.push(el("div", { className: "footer-note", html: `5 games • works offline • add to your home screen 🏕️ &nbsp;·&nbsp; v${APP_VERSION}` }));

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
