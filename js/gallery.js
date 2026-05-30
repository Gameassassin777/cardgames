// Art Gallery — Browse and replay past Lake House Doodles games.
// Games marked isMonkey=true are hidden unless monkey mode is currently unlocked.
import { el, mount, toast, HTTP_BASE, WS_BASE } from "./ui.js";
import { icons } from "./icons.js";



let goHome = () => {};
let allGames  = [];    // full list fetched from server
let activeGame = null; // game object currently being viewed

// ── Entry point ───────────────────────────────────────────────────────────────
export function start(home) {
  goHome = home;
  activeGame = null;
  renderLoading();
  fetchGames();
}

// ── Fetch ─────────────────────────────────────────────────────────────────────
async function fetchGames() {
  try {
    const res = await fetch(`${HTTP_BASE}/gartic/gallery`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allGames = await res.json();
    renderGallery();
  } catch (e) {
    console.warn("[Gallery] Fetch failed:", e.message);
    renderError(e.message);
  }
}

// ── Gallery grid ──────────────────────────────────────────────────────────────
function renderGallery() {
  const weirdUnlocked = localStorage.getItem("lakehouse.weird_unlocked") === "true";

  // Filter by monkey mode visibility
  const visible = allGames.filter(g => !g.isMonkey || weirdUnlocked);

  const topbarEl = el("div", { className: "topbar" }, [
    el("button", { className: "back", text: "‹ Home",  onClick: () => goHome() }),
    el("div",    { className: "title", style: "display:flex; align-items:center; gap:6px;" }, [
      el("span", { style: "width:18px; height:18px; display:inline-block;" }, [icons.gallery()]),
      el("span", { text: "Art Gallery" })
    ]),
    el("span",   { style: "width:64px" })
  ]);

  if (visible.length === 0) {
    mount(
      topbarEl,
      el("div", { className: "panel center", style: "padding:40px 20px;" }, [
        el("div", { style: "width:64px; height:64px; margin:0 auto 12px; color:var(--water-foam);" }, [icons.doodles()]),
        el("h3",  { style: "margin:0 0 8px; color:var(--water-foam);", text: "No games yet!" }),
        el("p",   { className: "muted", style: "margin:0;",
          text: "Play a full game of Lake House Doodles to start the gallery." })
      ])
    );
    return;
  }

  const grid = el("div", { className: "gartic-gallery-grid" });

  visible.forEach(game => {
    // Use the first drawing in any chain as the thumbnail, else a placeholder
    let thumbSrc = null;
    outer: for (const chain of game.chains) {
      for (const entry of chain) {
        if (entry.type === "draw") { thumbSrc = entry.content; break outer; }
      }
    }

    const dateStr = formatDate(game.date);
    const players = (game.players || []).join(", ");
    const totalEntries = game.chains.reduce((acc, c) => acc + c.length, 0);

    const card = el("div", { className: "gartic-gallery-card", onClick: () => openGame(game) });

    if (thumbSrc) {
      const img = document.createElement("img");
      img.src = thumbSrc;
      img.style.cssText = "width:100%; height:110px; object-fit:cover; border-radius:10px 10px 0 0; display:block;";
      card.appendChild(img);
    } else {
      const placeholder = el("div", {
        style: "width:100%; height:110px; background:rgba(255,255,255,0.06); border-radius:10px 10px 0 0; display:flex; align-items:center; justify-content:center;"
      }, [ el("span", { style: "width:48px; height:48px; display:inline-block; color:rgba(255,255,255,0.15);" }, [icons.doodles()]) ]);
      card.appendChild(placeholder);
    }

    // Settings badges
    const badgeElements = [];
    if (game.settings) {
      const chaos = game.settings.chaosMode;
      const style = game.settings.drawStyle;
      if (chaos && chaos !== "none") {
        const labels = {
          rorschach: "Rorschach",
          whisper: "Whisper",
          classified: "Classified",
          threewords: "Three Words"
        };
        if (labels[chaos]) {
          badgeElements.push(el("span", {
            style: "display:inline-block; background:rgba(0,188,212,0.15); border:1px solid rgba(0,188,212,0.3); border-radius:4px; padding:1px 4px; font-size:0.65rem; color:var(--water-foam); font-weight:700; margin-right:4px; margin-top:4px;",
            text: labels[chaos]
          }));
        }
      }
      if (style && style !== "normal") {
        const labels = {
          mirror: "Mirror",
          night: "Night",
          impressionist: "Impressionist",
          speeddemon: "Speed"
        };
        if (labels[style]) {
          badgeElements.push(el("span", {
            style: "display:inline-block; background:rgba(255,109,0,0.15); border:1px solid rgba(255,109,0,0.3); border-radius:4px; padding:1px 4px; font-size:0.65rem; color:var(--sunset); font-weight:700; margin-right:4px; margin-top:4px;",
            text: labels[style]
          }));
        }
      }
    }

    const meta = el("div", { style: "padding:10px;" }, [
      el("p", { style: "margin:0 0 2px; font-size:0.78rem; color:var(--lake-light); font-weight:700;", text: dateStr }),
      el("p", { style: "margin:0 0 4px; font-size:0.88rem; color:#fff; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;", text: players }),
      el("p", { style: "margin:0 0 4px; font-size:0.75rem; color:rgba(255,255,255,0.45);", text: `${game.chains.length} chains · ${totalEntries} entries` }),
      badgeElements.length > 0 ? el("div", { style: "display:flex; flex-wrap:wrap; margin-top:2px;" }, badgeElements) : null
    ]);

    if (game.isMonkey) {
      card.appendChild(el("div", { style: "position:absolute; top:6px; right:6px; background:rgba(0,0,0,0.6); border-radius:8px; padding:2px 6px; font-size:0.7rem; font-weight:700; color:var(--sunset);", text: "MONKEY" }));
      card.style.position = "relative";
    }

    card.appendChild(meta);
    grid.appendChild(card);
  });

  mount(
    topbarEl,
    el("div", { style: "padding:0 0 10px;" }, [
      el("p", { style: "margin:0 0 10px; font-size:0.82rem; color:var(--lake-light); text-align:center;",
        text: `${visible.length} saved game${visible.length === 1 ? "" : "s"}${weirdUnlocked ? " (monkey games visible)" : ""}` }),
      grid
    ])
  );
}

// ── Single game viewer ────────────────────────────────────────────────────────
function openGame(game) {
  activeGame = game;
  renderGameViewer(0, -1); // start before first chain
}

function renderGameViewer(chainIdx, entryIdx) {
  if (!activeGame) return;

  const chain   = activeGame.chains[chainIdx];
  const totalC  = activeGame.chains.length;
  const author  = (activeGame.players || [])[chainIdx] || `Chain ${chainIdx + 1}`;
  const atEnd   = entryIdx >= chain.length - 1;
  const lastC   = chainIdx >= totalC - 1;

  const chainEl = el("div", { className: "gartic-chain" });

  if (entryIdx < 0) {
    chainEl.appendChild(el("p", {
      className: "muted center", style: "margin:20px 0; font-style:italic;",
      text: "Tap Reveal to start!"
    }));
  } else {
    chain.slice(0, entryIdx + 1).forEach((entry, i) => {
      const entryAuthor = (activeGame.players || [])[(chainIdx + i) % (activeGame.players || []).length] || "";
      const card = el("div", { className: "gartic-entry gartic-entry-in" });
      card.appendChild(el("p", {
        style: "font-size:0.72rem; color:var(--lake-light); margin:0 0 6px; font-weight:700; letter-spacing:0.5px;",
        text: entryAuthor.toUpperCase()
      }));
      if (entry.type === "text") {
        card.appendChild(el("div", {
          style: "font-size:1.1rem; font-weight:700; color:#fff; word-break:break-word; line-height:1.4;",
          text: `"${entry.content}"`
        }));
      } else {
        const img = document.createElement("img");
        img.src = entry.content;
        img.style.cssText = "width:100%; border-radius:10px; display:block;";
        card.appendChild(img);
      }
      chainEl.appendChild(card);
    });
  }

  // Navigation buttons
  let nextBtn;
  if (atEnd && lastC) {
    nextBtn = el("button", { 
      className: "btn", 
      style: "margin-top:12px; display:flex; align-items:center; justify-content:center; gap:6px; margin-left:auto; margin-right:auto;",
      onClick: () => { activeGame = null; renderGallery(); }
    }, [
      el("span", { style: "width:18px; height:18px; display:inline-block;" }, [icons.gallery()]),
      el("span", { text: "Back to Gallery" })
    ]);
  } else if (atEnd) {
    nextBtn = el("button", { 
      className: "btn", 
      style: "margin-top:12px; display:flex; align-items:center; justify-content:center; gap:6px; margin-left:auto; margin-right:auto;",
      onClick: () => renderGameViewer(chainIdx + 1, -1)
    }, [
      el("span", { style: "width:18px; height:18px; display:inline-block;" }, [icons.chevronRight()]),
      el("span", { text: "Next Chain" })
    ]);
  } else {
    nextBtn = el("button", { 
      className: "btn", 
      style: "margin-top:12px; display:flex; align-items:center; justify-content:center; gap:6px; margin-left:auto; margin-right:auto;",
      onClick: () => renderGameViewer(chainIdx, entryIdx + 1)
    }, [
      el("span", { style: "width:18px; height:18px; display:inline-block;" }, [icons.play()]),
      el("span", { text: "Reveal Next" })
    ]);
  }

  const dateStr = formatDate(activeGame.date);
  const players = (activeGame.players || []).join(", ");

  mount(
    el("div", { className: "topbar" }, [
      el("button", { className: "back", text: "‹ Gallery", onClick: () => { activeGame = null; renderGallery(); } }),
      el("div",    { className: "title", style: "display:flex; align-items:center; gap:6px;" }, [
        el("span", { style: "width:18px; height:18px; display:inline-block;" }, [icons.gallery()]),
        el("span", { text: "Art Gallery" })
      ]),
      el("span",   { style: "width:64px" })
    ]),
    el("div", { className: "panel", style: "padding:10px 14px;" }, [
      el("p", { style: "margin:0 0 2px; font-size:0.72rem; color:var(--lake-light); font-weight:700;", text: `${dateStr} · ${players}` }),
      el("p", { style: "margin:0 0 2px; font-size:0.75rem; color:rgba(255,255,255,0.45);", text: `Chain ${chainIdx + 1} of ${totalC}` }),
      el("h3", { style: "margin:0; color:var(--water-foam);", text: `${author}'s Chain` })
    ]),
    el("div", { className: "panel", style: "padding:14px; max-height:55vh; overflow-y:auto;" }, [chainEl]),
    nextBtn
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function renderLoading() {
  mount(
    el("div", { className: "topbar" }, [
      el("button", { className: "back", text: "‹ Home", onClick: () => goHome() }),
      el("div",    { className: "title", style: "display:flex; align-items:center; gap:6px;" }, [
        el("span", { style: "width:18px; height:18px; display:inline-block;" }, [icons.gallery()]),
        el("span", { text: "Art Gallery" })
      ]),
      el("span",   { style: "width:64px" })
    ]),
    el("div", { className: "panel center", style: "padding:40px 20px;" }, [
      el("div", { className: "spin", style: "width:64px; height:64px; margin:0 auto; color:var(--water-foam);" }, [icons.refresh()]),
      el("p",   { className: "muted", style: "margin-top:14px;", text: "Loading gallery…" })
    ])
  );
}

function renderError(msg) {
  mount(
    el("div", { className: "topbar" }, [
      el("button", { className: "back", text: "‹ Home", onClick: () => goHome() }),
      el("div",    { className: "title", style: "display:flex; align-items:center; gap:6px;" }, [
        el("span", { style: "width:18px; height:18px; display:inline-block;" }, [icons.gallery()]),
        el("span", { text: "Art Gallery" })
      ]),
      el("span",   { style: "width:64px" })
    ]),
    el("div", { className: "panel center", style: "padding:40px 20px;" }, [
      el("div", { style: "width:64px; height:64px; margin:0 auto 10px; color:var(--sunset);" }, [icons.warning()]),
      el("h3",  { style: "margin:0 0 6px; color:var(--sunset);", text: "Couldn't load gallery" }),
      el("p",   { className: "muted", style: "margin:0 0 16px; font-size:0.85rem;", text: msg }),
      el("button", { 
        className: "btn ghost", 
        style: "display:flex; align-items:center; justify-content:center; gap:6px; margin:0 auto;",
        onClick: () => { renderLoading(); fetchGames(); } 
      }, [
        el("span", { style: "width:16px; height:16px; display:inline-block;" }, [icons.refresh()]),
        el("span", { text: "Retry" })
      ])
    ])
  );
}

function formatDate(iso) {
  if (!iso) return "Unknown date";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
