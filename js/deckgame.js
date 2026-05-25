// Generic "draw a card" engine, configured per game.
// Card shape: { tag?, type?, text }. `tag` (or legacy `type`) shows as a pill.
import { el, mount, shuffle } from "./ui.js";

const TAG_EMOJI = {
  "Would You Rather": "🤔",
  "Never Have I Ever": "🙊",
  "Truth": "💬",
  "Dare": "🔥",
  "Most Likely To": "👉",
  "Red or Green?": "🚩",
};

export function makeGame({ title, source }) {
  return function start(home) {
    let deck = shuffle(source);
    let pos = 0;

    function reshuffle() { deck = shuffle(source); pos = 0; render(); }

    function render() {
      const card = deck[pos];
      const tag = card.tag || card.type || "Card";
      const remaining = deck.length - pos - 1;
      const last = pos >= deck.length - 1;

      mount(
        el("div", { className: "topbar" }, [
          el("button", { className: "back", text: "‹ Lobby", onClick: home }),
          el("div", { className: "title", text: title }),
          el("span", { style: "width:64px" }),
        ]),
        el("div", { className: "panel center" }, [
          el("span", { className: "pill", text: `${TAG_EMOJI[tag] || "🎴"} ${tag}` }),
          el("div", {
            className: "play-card response",
            style: "margin-top:14px; font-size:1.3rem; min-height:180px; justify-content:center; text-align:center;",
          }, [ el("span", { text: card.text }) ]),
          el("p", { className: "muted", text: `${remaining} card${remaining === 1 ? "" : "s"} left in the deck` }),
        ]),
        el("div", { className: "spacer" }),
        last
          ? el("button", { className: "btn", text: "🔀 Reshuffle & keep going", onClick: reshuffle })
          : el("button", { className: "btn", text: "Next card →", onClick: () => { pos++; render(); } }),
        el("div", { className: "spacer" }),
        el("button", { className: "btn ghost", text: "Shuffle now", onClick: reshuffle })
      );
    }

    render();
  };
}
