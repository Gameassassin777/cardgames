// Generic "draw a card" engine, configured per game.
// Card shape: { tag?, type?, text }. `tag` (or legacy `type`) shows as a pill.
import { el, mount, shuffle, store } from "./ui.js";
import { icons } from "./icons.js";

const TAG_ICON = {
  "Would You Rather": icons.wyr,
  "Never Have I Ever": icons.monkeys,
  "Truth": icons.truths,
  "Dare": icons.fire,
  "Most Likely To": icons.speak,
  "Red or Green?": icons.flags,
  "Rizz Challenge": icons.rizz,
  "Confession": icons.eyeOff,
  "Hot Take": icons.sparkles,
  "Custom": icons.pen,
};

export function makeGame({ title, source, saveKey }) {
  return function start(home) {
    const isCampfire = title === "Campfire Roasts";
    if (isCampfire) document.body.classList.add("campfire-theme");

    const cleanHome = () => {
      if (isCampfire) document.body.classList.remove("campfire-theme");
      home();
    };

    function getFullSource() {
      const customs = saveKey ? store.get(saveKey + ".custom_cards", []) : [];
      const customObjects = customs.map(text => ({
        tag: "Custom",
        text: text
      }));
      return source.concat(customObjects);
    }

    let deck = shuffle(getFullSource());
    let pos = 0;

    function reshuffle() { deck = shuffle(getFullSource()); pos = 0; render(); }

    function render() {
      const card = deck[pos];
      const tag = card.tag || card.type || "Card";
      const remaining = deck.length - pos - 1;
      const last = pos >= deck.length - 1;

      mount(
        el("div", { className: "topbar" }, [
          el("button", { className: "back", text: "‹ Lobby", onClick: cleanHome }),
          el("div", { className: "title", text: title }),
          el("span", { style: "width:64px" }),
        ]),
        el("div", { className: "panel center" }, [
          el("span", { 
            className: "pill", 
            style: "display:inline-flex; align-items:center; gap:6px; background:rgba(255,255,255,0.06); padding:4px 10px; border-radius:16px; font-weight:700;" 
          }, [
            el("span", { style: "width:14px; height:14px; display:inline-block;" }, [TAG_ICON[tag] ? TAG_ICON[tag]() : icons.doodles()]),
            el("span", { text: tag })
          ]),
          el("div", {
            className: "play-card response",
            style: "margin-top:14px; font-size:1.3rem; min-height:180px; justify-content:center; text-align:center;",
          }, [ el("span", { text: card.text }) ]),
          el("p", { className: "muted", text: `${remaining} card${remaining === 1 ? "" : "s"} left in the deck` }),
        ]),
        el("div", { className: "spacer" }),
        last
          ? el("button", { 
              className: "btn", 
              style: "display:flex; align-items:center; justify-content:center; gap:6px; margin:0 auto;",
              onClick: reshuffle 
            }, [
              el("span", { style: "width:18px; height:18px; display:inline-block;" }, [icons.refresh()]),
              el("span", { text: "Reshuffle & keep going" })
            ])
          : el("button", { 
              className: "btn", 
              style: "display:flex; align-items:center; justify-content:center; gap:6px; margin:0 auto;",
              onClick: () => { pos++; render(); } 
            }, [
              el("span", { style: "width:18px; height:18px; display:inline-block;" }, [icons.chevronRight()]),
              el("span", { text: "Next card" })
            ]),
        el("div", { className: "spacer" }),
        el("button", { 
          className: "btn ghost", 
          style: "display:flex; align-items:center; justify-content:center; gap:6px; margin:0 auto;",
          onClick: reshuffle 
        }, [
          el("span", { style: "width:16px; height:16px; display:inline-block;" }, [icons.refresh()]),
          el("span", { text: "Shuffle now" })
        ])
      );
    }

    render();
  };
}
