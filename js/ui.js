// Tiny DOM + utility helpers shared across the app.

export const app = () => document.getElementById("app");

// Create an element. `attrs` supports className, html, text, dataset, on{Event}, and plain attrs.
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "className") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k === "text") node.textContent = v;
    else if (k === "dataset") Object.assign(node.dataset, v);
    else if (k.startsWith("on") && typeof v === "function") {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}

// Replace the app contents with the given node(s).
//
// Every interaction in this app re-mounts the whole screen, so this function
// decides whether that feels like navigation or like a glitch. Two fixes here:
//
//  1. The scroll reset used to run in a setTimeout(…, 20), so the new content
//     painted at your old offset and then yanked to the top a frame later.
//     It is synchronous now, so there is no visible jump.
//  2. Re-rendering the SAME screen (selecting a card, casting a vote, toggling
//     an option) no longer replays the entrance animation or scrolls to the
//     top — it keeps you exactly where you were. Only real navigation animates.
let lastScreenSig = "";

export function mount(...nodes) {
  const root = app();
  if (!root) return;
  const prevY = window.scrollY || document.documentElement.scrollTop || 0;

  const wrap = el("div", {}, nodes);
  root.replaceChildren(wrap);

  // Cheap screen identity: the topbar title plus the node count. Games all
  // render a `.topbar .title`, so a repaint of the same screen matches.
  const titleEl = root.querySelector(".topbar .title");
  const sig = (titleEl ? titleEl.textContent : "") + "|" + nodes.length;
  const sameScreen = lastScreenSig !== "" && sig === lastScreenSig;
  lastScreenSig = sig;

  if (sameScreen) {
    window.scrollTo(0, prevY);
    return;
  }
  wrap.className = "fade-in";
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

// Forget the remembered screen so the next mount animates as fresh navigation.
export function resetScreenSig() { lastScreenSig = ""; }

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let toastTimer = null;
export function toast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

export const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v == null ? fallback : JSON.parse(v);
    } catch { return fallback; }
  },
  set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* ignore */ }
  },
  del(key) {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  },
};

// Render prompt text with the chosen blanks filled in (or shown as underlines).
export function fillPrompt(text, blank, fills = []) {
  const parts = text.split(blank);
  const frag = el("span");
  parts.forEach((part, i) => {
    frag.appendChild(document.createTextNode(part));
    if (i < parts.length - 1) {
      const fill = fills[i];
      if (fill) {
        frag.appendChild(el("span", { className: "blank-fill", text: stripPeriod(fill) }));
      } else {
        frag.appendChild(el("span", { className: "blank-fill", text: "_______" }));
      }
    }
  });
  return frag;
}

function stripPeriod(s) {
  return s.replace(/\.$/, "");
}

const isLocal = window.location.hostname === "localhost" || 
                window.location.hostname === "127.0.0.1" ||
                window.location.hostname.startsWith("192.168.") ||
                window.location.hostname.startsWith("10.") ||
                window.location.hostname.startsWith("172.") ||
                window.location.hostname.endsWith(".local");

export const HTTP_BASE = "https://lakehouse-cardgames-sync.gameassassin777.workers.dev";
export const WS_BASE = "wss://lakehouse-cardgames-sync.gameassassin777.workers.dev";

