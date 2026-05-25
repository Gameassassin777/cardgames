// Lake House Truths — a cozy draw-a-card game (would you rather / truth / dare / etc.).
import { el, mount, shuffle } from "./ui.js";
import { LAKE_TRUTHS } from "./data.js";

let goHome = () => {};
let deck = [];
let pos = 0;

const typeEmoji = {
  "Would You Rather": "🤔",
  "Never Have I Ever": "🙊",
  "Truth": "💬",
  "Dare": "🔥",
  "Most Likely To": "👉",
};

export function start(home) {
  goHome = home;
  deck = shuffle(LAKE_TRUTHS);
  pos = 0;
  render();
}

function render() {
  const card = deck[pos];
  const remaining = deck.length - pos - 1;

  mount(
    el("div", { className: "topbar" }, [
      el("button", { className: "back", text: "‹ Lobby", onClick: goHome }),
      el("div", { className: "title", text: "Lake House Truths" }),
      el("span", { style: "width:64px" }),
    ]),
    el("div", { className: "panel center" }, [
      el("span", { className: "pill", text: `${typeEmoji[card.type] || "🎴"} ${card.type}` }),
      el("div", { className: "play-card response", style: "margin-top:14px; font-size:1.3rem; min-height:160px; justify-content:center; text-align:center;" }, [
        el("span", { text: card.text }),
      ]),
      el("p", { className: "muted", text: `${remaining} card${remaining === 1 ? "" : "s"} left in the deck` }),
    ]),
    el("div", { className: "spacer" }),
    pos < deck.length - 1
      ? el("button", { className: "btn", text: "Next card →", onClick: () => { pos++; render(); } })
      : el("button", { className: "btn", text: "🔀 Reshuffle & play again", onClick: () => { deck = shuffle(LAKE_TRUTHS); pos = 0; render(); } }),
    el("div", { className: "spacer" }),
    el("button", { className: "btn ghost", text: "Shuffle now", onClick: () => { deck = shuffle(LAKE_TRUTHS); pos = 0; render(); } })
  );
}
