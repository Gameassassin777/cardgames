// Lake House Card Games — app shell, home menu, routing, PWA wiring.
import { el, mount } from "./ui.js";
import * as cam from "./cam.js";
import * as truths from "./truths.js";

let deferredInstall = null;

const GAMES = [
  {
    id: "cam",
    icon: "🐒",
    title: "Cards Against Monkeys",
    blurb: "Chronically-online party game. Fill in the blanks, crown the funniest. 3+ players.",
    badge: "18+",
    start: cam.start,
  },
  {
    id: "truths",
    icon: "🛶",
    title: "Lake House Truths",
    blurb: "Would-you-rather, truths & dares for around the firepit. Any group size.",
    start: truths.start,
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
      el("div", { className: "scene", text: "🌅  🛶  🌲🏠🌲  🦆" }),
      el("div", { className: "logo", html: 'Lake House <span class="em">Card Games</span>' }),
      el("div", { className: "tagline", text: "Cozy by the water. Chaotic at the table." }),
    ]),
    menu,
  ];

  if (deferredInstall) {
    nodes.push(installBanner());
  }

  nodes.push(el("div", { className: "footer-note", html: "Works offline once loaded • Add to your home screen for the full lake-house experience 🏕️" }));

  mount(...nodes);
}

function installBanner() {
  return el("div", { className: "install-banner" }, [
    el("span", { style: "font-size:1.6rem", text: "📲" }),
    el("p", { text: "Install Lake House Card Games for offline, full-screen play." }),
    el("button", {
      className: "btn small",
      style: "width:auto",
      text: "Install",
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
  // Re-render home if it's showing, to surface the banner.
  if (document.querySelector(".brand")) home();
});

// Register the service worker for offline support.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => { /* offline support optional */ });
  });
}

home();
