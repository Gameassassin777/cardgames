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

// Replace the app contents with the given node(s), with a subtle fade.
export function mount(...nodes) {
  const root = app();
  root.innerHTML = "";
  const wrap = el("div", { className: "fade-in" }, nodes);
  root.appendChild(wrap);
  setTimeout(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, 20);
}

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
                window.location.hostname === "127.0.0.1";

const httpProtocol = window.location.protocol === "https:" ? "https:" : "http:";
const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";

export const HTTP_BASE = isLocal
  ? `${httpProtocol}//${window.location.hostname}:3000`
  : "https://lakehouse-cardgames-sync.gameassassin777.workers.dev";

export const WS_BASE = isLocal
  ? `${wsProtocol}//${window.location.hostname}:3000`
  : "wss://lakehouse-cardgames-sync.gameassassin777.workers.dev";

