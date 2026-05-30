// Generic "draw a card" engine configured per game with full Online sync support.
import { el, mount, shuffle, store, toast, HTTP_BASE, WS_BASE } from "./ui.js";
import { icons } from "./icons.js";

const TAG_ICON = {
  "Would You Rather": icons.wyr,
  "Never Have I Ever": icons.monkeys,
  "Truth": icons.truths,
  "Dare": icons.fire,
  "Challenge": icons.fire,
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
    const isTruthOrDare = title === "Truth or Dare" || title === "Zesty Truth or Dare";
    
    if (isCampfire) document.body.classList.add("campfire-theme");

    const cleanHome = () => {
      resetOnline();
      if (isCampfire) document.body.classList.remove("campfire-theme");
      home();
    };

    let onlineMode = false;
    let socket = null;
    let roomCode = "";
    let myName = "";
    let isHost = false;
    let onlinePlayers = [];
    let chosenCard = null;

    function resetOnline() {
      if (socket) { try { socket.close(); } catch (_) {} socket = null; }
      onlineMode = false;
      roomCode = ""; myName = ""; isHost = false; onlinePlayers = [];
      chosenCard = null;
    }

    function getFullSource() {
      const customKey = saveKey ? saveKey.replace("cabin_", "").replace("zesty_", "") : "";
      const enabled = customKey ? store.get(customKey + ".enabled_decks", ["core"]) : ["core"];
      const customDecks = customKey ? store.get(customKey + ".custom_decks", []) : [];
      
      let cardPool = [];
      
      if (enabled.includes("core")) {
        cardPool = cardPool.concat(source);
      }
      
      customDecks.forEach(deck => {
        if (enabled.includes(deck.id)) {
          const cardsList = deck.responses || deck.cards || [];
          const customObjects = cardsList.map(text => ({
            tag: deck.name,
            text: text
          }));
          cardPool = cardPool.concat(customObjects);
        }
      });
      
      if (cardPool.length === 0) {
        cardPool = source;
      }
      
      return cardPool;
    }

    let deck = [];
    let pos = 0;

    function savePersistentDeck() {
      if (saveKey) {
        store.set(saveKey + ".persistent_deck", { deck, pos });
      }
    }

    function loadPersistentDeck() {
      const fullSource = getFullSource();
      const saved = saveKey ? store.get(saveKey + ".persistent_deck", null) : null;
      if (saved && Array.isArray(saved.deck) && saved.deck.length === fullSource.length && typeof saved.pos === "number") {
        deck = saved.deck;
        pos = saved.pos;
        if (pos >= deck.length) {
          reshuffleSilently(fullSource);
        }
      } else {
        reshuffleSilently(fullSource);
      }
    }

    function reshuffleSilently(fullSource = getFullSource()) {
      deck = shuffle(fullSource);
      pos = 0;
      savePersistentDeck();
    }

    function reshuffle() { 
      reshuffleSilently(); 
      chosenCard = null;
      if (onlineMode && isHost) {
        syncDeckState();
      } else {
        render(); 
      }
    }

    function chooseCard(category) {
      const isTruth = category === "truth";
      const matchFn = c => {
        const tag = c.tag || c.type || "Card";
        if (isTruth) {
          return tag === "Truth" || tag === "Confession";
        } else {
          return tag === "Dare" || tag === "Challenge" || tag === "Rizz Challenge";
        }
      };

      // Search forward from pos
      let foundIdx = -1;
      for (let i = pos; i < deck.length; i++) {
        if (matchFn(deck[i])) {
          foundIdx = i;
          break;
        }
      }

      if (foundIdx === -1) {
        // Reshuffle and search again
        reshuffleSilently();
        for (let i = 0; i < deck.length; i++) {
          if (matchFn(deck[i])) {
            foundIdx = i;
            break;
          }
        }
      }

      if (foundIdx !== -1) {
        // Swap found card to current position
        const temp = deck[pos];
        deck[pos] = deck[foundIdx];
        deck[foundIdx] = temp;

        chosenCard = deck[pos];
        savePersistentDeck();

        if (onlineMode && isHost) {
          syncDeckState();
        } else {
          render();
        }
      } else {
        toast("No cards found for this category!");
      }
    }

    function syncDeckState() {
      const card = chosenCard;
      if (isTruthOrDare && !card) {
        if (socket && socket.readyState === 1) {
          socket.send(JSON.stringify({
            type: "relay",
            code: roomCode,
            sender: myName,
            action: {
              type: "STATE_SYNC",
              state: {
                text: "Waiting for player to choose Truth or Dare...",
                tag: "Choice",
                remaining: deck.length - pos,
                last: pos >= deck.length - 1,
                deckSize: deck.length,
                isChoiceLobby: true
              }
            }
          }));
        }
        return;
      }

      const activeCard = card || deck[pos];
      const tag = activeCard ? (activeCard.tag || activeCard.type || "Card") : "Card";
      const remaining = deck.length - pos - 1;
      const last = pos >= deck.length - 1;

      if (socket && socket.readyState === 1) {
        socket.send(JSON.stringify({
          type: "relay",
          code: roomCode,
          sender: myName,
          action: {
            type: "STATE_SYNC",
            state: {
              text: activeCard ? activeCard.text : "Draw a card!",
              tag,
              remaining,
              last,
              deckSize: deck.length,
              isChoiceLobby: false
            }
          }
        }));
      }
    }

    function connectRoom(type, code = "") {
      onlineMode = true;
      mount(
        el("div", { className: "topbar" }, [
          el("button", { className: "back", text: "‹ Back", onClick: renderSetup })
        ]),
        el("div", { className: "panel center", style: "margin:40px auto; max-width:320px;" }, [
          el("div", { className: "spin-indicator", style: "font-size:2rem; margin-bottom:12px;", text: "🌀" }),
          el("p", { text: type === "create" ? "Creating room…" : `Joining ${code}…` })
        ])
      );

      const url = type === "create"
        ? `${WS_BASE}/ws/create?name=${encodeURIComponent(myName)}&game=deckgame`
        : `${WS_BASE}/ws/join?code=${code}&name=${encodeURIComponent(myName)}&game=deckgame`;

      isHost = (type === "create");
      socket = new WebSocket(url);

      socket.onmessage = (ev) => {
        try {
          const d = JSON.parse(ev.data);
          if (d.type === "created" || d.type === "player_joined") {
            roomCode = d.code;
            onlinePlayers = d.players;
            applyLobby();
          } else if (d.type === "player_left") {
            onlinePlayers = d.players;
            applyLobby();
          } else if (d.type === "relay") {
            if (d.action.type === "STATE_SYNC") {
              renderOnlineMirror(d.action.state);
            } else if (d.action.type === "quit") {
              toast("Lobby closed by host.");
              cleanHome();
            }
          } else if (d.type === "error") {
            toast(d.message || "Connection error");
            renderSetup();
          }
        } catch (_) {}
      };
    }

    function applyLobby() {
      const pRows = onlinePlayers.map((p, i) => {
        return el("div", {
          style: "display:flex; justify-content:space-between; padding:10px 14px; background:rgba(255,255,255,0.02); border-radius:10px; margin-bottom:6px;"
        }, [
          el("span", { text: p, style: "font-weight: 500;" }),
          el("span", {
            text: i === 0 ? "👑 HOST" : "READY",
            style: `font-size:0.75rem; font-weight:bold; color:${i === 0 ? "var(--sunset-soft)" : "#00ffaa"};`
          })
        ]);
      });

      const lobbyLayout = el("div", { className: "panel center", style: "max-width: 440px; margin:0 auto;" }, [
        el("h3", { text: `Room Lobby: ${roomCode}`, style: "color:var(--sunset-soft); margin-top:0;" }),
        el("p", { className: "muted", text: "Invite friends using this room code." }),
        el("div", { style: "margin: 16px 0; width:100%; max-height:240px; overflow-y:auto;" }, pRows),
        isHost
          ? el("button", {
              className: "btn",
              text: "Start Game ➔",
              style: "width:100%;",
              onClick: () => {
                syncDeckState();
              }
            })
          : el("p", { className: "muted center anim-pulse", text: "Waiting for host to start..." })
      ]);

      mount(
        el("div", { className: "topbar" }, [
          el("button", { className: "back", text: "‹ Leave", onClick: cleanHome }),
          el("div", { className: "title", text: title }),
          el("span", { style: "width:64px" }),
        ]),
        lobbyLayout
      );
    }

    function renderOnlineMirror(syncedState) {
      const last = syncedState.last;
      const isLobby = syncedState.isChoiceLobby;

      mount(
        el("div", { className: "topbar" }, [
          el("button", { className: "back", text: "‹ Leave", onClick: cleanHome }),
          el("div", { className: "title", text: `${title} (Online)` }),
          el("span", { style: "width:64px" }),
        ]),
        el("div", { className: "panel center" }, [
          el("span", { 
            className: "pill", 
            style: "display:inline-flex; align-items:center; gap:6px; background:rgba(255,255,255,0.06); padding:4px 10px; border-radius:16px; font-weight:700;" 
          }, [
            el("span", { style: "width:14px; height:14px; display:inline-block;" }, [
              isLobby ? icons.truths() : (TAG_ICON[syncedState.tag] ? TAG_ICON[syncedState.tag]() : icons.doodles())
            ]),
            el("span", { text: syncedState.tag })
          ]),
          el("div", {
            className: "play-card response" + (isLobby ? " anim-pulse" : ""),
            style: "margin-top:14px; font-size:1.3rem; min-height:180px; justify-content:center; text-align:center;",
          }, [ el("span", { text: syncedState.text }) ]),
          el("p", { className: "muted", text: `${syncedState.remaining} card${syncedState.remaining === 1 ? "" : "s"} left in the deck` }),
        ]),
        el("div", { className: "spacer" }),
        isHost
          ? (isLobby
            ? el("div", { style: "display:flex; flex-direction:column; gap:12px; max-width:280px; margin:0 auto; width:100%;" }, [
                el("button", {
                  className: "btn",
                  style: "background:linear-gradient(145deg, #00ffaa, #00aa77); border:none; width:100%;",
                  onClick: () => chooseCard("truth")
                }, [el("span", { text: "🔍 TRUTH" })]),
                el("button", {
                  className: "btn",
                  style: "background:linear-gradient(145deg, #ff4757, #c02d37); border:none; width:100%;",
                  onClick: () => chooseCard("dare")
                }, [el("span", { text: "🔥 DARE" })])
              ])
            : (last
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
                  onClick: () => { pos++; savePersistentDeck(); chosenCard = null; syncDeckState(); } 
                }, [
                  el("span", { style: "width:18px; height:18px; display:inline-block;" }, [icons.chevronRight()]),
                  el("span", { text: "Next Player ➔" })
                ])))
          : el("p", { className: "muted center anim-pulse", text: isLobby ? "Waiting for player to choose..." : "Host is presenting the card..." })
      );
    }

    function renderSetup() {
      resetOnline();
      
      const nameInput = el("input", {
        type: "text",
        placeholder: "Your name…",
        id: "d-name",
        style: "font-size:1.1rem; border-radius:14px; text-align:center; margin-bottom:14px; width:100%;"
      });

      const codeInput = el("input", {
        type: "text",
        placeholder: "4-LETTER CODE",
        id: "d-code",
        maxLength: 4,
        style: "font-size:1.3rem; border-radius:14px; text-align:center; text-transform:uppercase; letter-spacing:6px; margin-bottom:10px; width:100%;"
      });
      codeInput.addEventListener("input", () => { codeInput.value = codeInput.value.toUpperCase(); });

      mount(
        el("div", { className: "topbar" }, [
          el("button", { className: "back", text: "‹ Back", onClick: cleanHome }),
          el("div", { className: "title", text: title }),
          el("span", { style: "width:64px" }),
        ]),
        el("div", { className: "panel center", style: "max-width: 440px; margin: 0 auto;" }, [
          el("div", { style: "width:64px; height:64px; margin:0 auto 12px; color:var(--sunset-soft);" }, [TAG_ICON[title] ? TAG_ICON[title]() : icons.canoe()]),
          el("h2", { text: title }),
          el("p", { className: "muted", text: "Draw interactive cards, dilemmas, or dares. Play offline with standard pass-and-play, or launch an online room code to stream the cards to your TV!" }),
          el("div", { style: "display:flex; flex-direction:column; gap:10px; width:100%; margin-top:20px;" }, [
            el("button", {
              className: "btn",
              text: "🔄 Start Local Deck",
              onClick: () => { onlineMode = false; render(); }
            }),
            el("hr", { style: "border:none; border-top:1px solid rgba(255,255,255,0.06); margin:8px 0;" }),
            nameInput,
            el("button", {
              className: "btn ghost",
              text: "Create Online Room",
              onClick: () => {
                const n = nameInput.value.trim();
                if (!n) { toast("Enter your name first!"); return; }
                myName = n;
                connectRoom("create");
              }
            }),
            codeInput,
            el("button", {
              className: "btn ghost",
              text: "Join Online Room",
              onClick: () => {
                const n = nameInput.value.trim();
                const code = codeInput.value.trim().toUpperCase();
                if (!n) { toast("Enter your name first!"); return; }
                if (!code || code.length !== 4) { toast("Enter room code!"); return; }
                myName = n;
                connectRoom("join", code);
              }
            })
          ])
        ])
      );
    }

    function render() {
      if (isTruthOrDare && !chosenCard) {
        mount(
          el("div", { className: "topbar" }, [
            el("button", { className: "back", text: "‹ Back", onClick: renderSetup }),
            el("div", { className: "title", text: title }),
            el("span", { style: "width:64px" }),
          ]),
          el("div", { className: "panel center", style: "max-width:440px; margin:0 auto;" }, [
            el("div", { style: "width:64px; height:64px; margin:0 auto 12px; color:var(--sunset-soft);" }, [icons.truths()]),
            el("h2", { text: "Choose your fate" }),
            el("p", { className: "muted", text: "Pass the device to the active player. They must choose between answering a revealing Truth or performing a daring challenge!" }),
            el("div", { style: "display:flex; flex-direction:column; gap:16px; width:100%; margin-top:24px;" }, [
              el("button", {
                className: "btn",
                style: "display:flex; align-items:center; justify-content:center; gap:10px; padding:18px; font-size:1.2rem; background:linear-gradient(145deg, #00ffaa, #00aa77); border:none; width:100%;",
                onClick: () => chooseCard("truth")
              }, [
                el("span", { style: "width:24px; height:24px; display:inline-block;" }, [icons.truths()]),
                el("span", { text: "🔍 TRUTH" })
              ]),
              el("button", {
                className: "btn",
                style: "display:flex; align-items:center; justify-content:center; gap:24px; padding:18px; font-size:1.2rem; background:linear-gradient(145deg, #ff4757, #c02d37); border:none; width:100%;",
                onClick: () => chooseCard("dare")
              }, [
                el("span", { style: "width:24px; height:24px; display:inline-block;" }, [icons.fire()]),
                el("span", { text: "🔥 DARE" })
              ])
            ])
          ])
        );
        return;
      }

      const card = chosenCard || deck[pos];
      const tag = card.tag || card.type || "Card";
      const remaining = deck.length - pos - 1;
      const last = pos >= deck.length - 1;

      mount(
        el("div", { className: "topbar" }, [
          el("button", { className: "back", text: "‹ Back", onClick: renderSetup }),
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
              onClick: () => {
                pos++;
                savePersistentDeck();
                if (isTruthOrDare) {
                  chosenCard = null;
                  if (onlineMode && isHost) {
                    syncDeckState();
                  }
                }
                render();
              } 
            }, [
              el("span", { style: "width:18px; height:18px; display:inline-block;" }, [icons.chevronRight()]),
              el("span", { text: isTruthOrDare ? "Next Player ➔" : "Next card" })
            ]),
        el("div", { className: "spacer" }),
        el("button", { 
          className: "btn ghost", 
          style: "display:flex; align-items:center; justify-content:center; gap:6px; margin:0 auto;",
          onClick: () => {
            if (confirm("Are you sure you want to reshuffle the entire card box?")) {
              reshuffle();
            }
          }
        }, [
          el("span", { style: "width:16px; height:16px; display:inline-block;" }, [icons.refresh()]),
          el("span", { text: "Shuffle now" })
        ])
      );
    }

    loadPersistentDeck();
    renderSetup();
  };
}
