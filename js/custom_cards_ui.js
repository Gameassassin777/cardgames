// Custom Cards Settings manager — visually edit, delete, and manually add custom cards for all games.
import { el, mount, toast, store } from "./ui.js";

const MANAGED_GAMES = [
  { id: "cam", name: "Cards Against Monkeys", icon: "🐒", saveKey: "cam.game.v1", placeholder: "e.g. Subway Surfers gameplay during a funeral" },
  { id: "cabin", name: "Cards Against the Cabin", icon: "🛖", saveKey: "cabin.game.v1", placeholder: "e.g. an aggressive beaver defending the dock" },
  { id: "rizz", name: "Rizz Roulette", icon: "😏", saveKey: "rizz.game.v1", placeholder: "e.g. Say it with rizz: \"Are you Ohio? Because you make me act crazy.\"" },
  { id: "wyr", name: "Would You Rather", icon: "🤔", saveKey: "wyr.game.v1", placeholder: "e.g. Always step on a wet spot, OR chew on a dry sponge?" },
  { id: "flags", name: "Red Flag / Green Flag", icon: "🚩", saveKey: "flags.game.v1", placeholder: "e.g. They literally have zero internet presence." },
  { id: "truths", name: "Lake House Truths", icon: "🛶", saveKey: "truths.game.v1", placeholder: "e.g. Who in the cabin is secretly a duplicate agent?" }
];

let activeGameId = "cam";
let editingIndex = null; // index of the card being edited
let currentHomeCallback = null;

export function openCustomCardsManager(homeCallback) {
  currentHomeCallback = homeCallback;
  render();
}

function render() {
  const activeGame = MANAGED_GAMES.find(g => g.id === activeGameId) || MANAGED_GAMES[0];
  const saveKey = activeGame.saveKey + ".custom_cards";
  const cards = store.get(saveKey, []);

  // Topbar
  const topbar = el("div", { className: "topbar" }, [
    el("button", { className: "back", text: "‹ Home", onClick: currentHomeCallback }),
    el("div", { className: "title", text: "Custom Cards Settings" }),
    el("span", { style: "width:64px" })
  ]);

  // Tab row selectors
  const tabRow = el("div", {
    className: "btn-row",
    style: "margin-top: 10px; margin-bottom: 14px; gap: 8px; justify-content: center;"
  });

  MANAGED_GAMES.forEach(g => {
    const isActive = g.id === activeGameId;
    const tabBtn = el("button", {
      className: "btn small" + (isActive ? "" : " ghost"),
      style: "flex:1; min-width:60px; padding:8px 10px; font-size:0.85rem; font-weight:700; white-space:nowrap; display:flex; align-items:center; justify-content:center; gap:4px;",
      onClick: () => {
        activeGameId = g.id;
        editingIndex = null;
        render();
      }
    }, [
      el("span", { style: "font-size:1.1rem", text: g.icon }),
      el("span", { text: g.id.toUpperCase() })
    ]);
    tabRow.appendChild(tabBtn);
  });

  // Game Intro Header
  const introHeader = el("div", { className: "panel center", style: "padding: 12px 18px;" }, [
    el("h3", { style: "margin:0 0 4px 0; color:var(--water-foam); font-size:1.15rem; display:flex; align-items:center; justify-content:center; gap:8px;" }, [
      el("span", { text: activeGame.icon }),
      el("span", { text: activeGame.name })
    ]),
    el("p", {
      className: "muted",
      style: "margin:0; font-size:0.85rem;",
      text: `Manage custom winning cards that show up in subsequent games. (Saved cards: ${cards.length})`
    })
  ]);

  // Create card input section
  const newCardInput = el("input", {
    type: "text",
    placeholder: activeGame.placeholder,
    style: "flex:1; border-radius:12px; font-size:0.95rem; margin-right:8px;"
  });

  const addBtn = el("button", {
    className: "btn small",
    style: "width:auto; margin:0; padding:12px 16px; font-weight:700;",
    text: "➕ Add",
    onClick: () => {
      const text = newCardInput.value.trim();
      if (!text) { toast("Please enter some card text first!"); return; }
      
      if (cards.includes(text)) {
        toast("This custom card already exists!");
        return;
      }
      
      cards.push(text);
      store.set(saveKey, cards);
      newCardInput.value = "";
      editingIndex = null;
      render();
      toast("Card added successfully!");
    }
  });

  const addPanel = el("div", { className: "panel" }, [
    el("label", { text: "Add New Custom Card Manually" }),
    el("div", { style: "display:flex; align-items:center;" }, [newCardInput, addBtn])
  ]);

  // List of Custom Cards
  const listPanel = el("div", { className: "panel" });
  listPanel.appendChild(el("label", { text: `Active Custom Deck (${cards.length} card${cards.length === 1 ? "" : "s"})` }));

  if (cards.length === 0) {
    listPanel.appendChild(el("p", {
      className: "muted center",
      style: "margin:16px 0; font-style:italic;",
      text: "No custom cards in this deck yet. Win a round with a blank card or type one in above!"
    }));
  } else {
    const listContainer = el("div", { className: "scoreboard", style: "max-height: 380px; overflow-y: auto;" });
    
    cards.forEach((card, idx) => {
      const isEditing = editingIndex === idx;

      let cardContent;
      let actionButtons;

      if (isEditing) {
        const editInput = el("input", {
          type: "text",
          value: card,
          style: "flex:1; border-radius:8px; font-size:0.9rem; padding:6px 10px; margin-right:6px;"
        });

        const saveBtn = el("button", {
          className: "icon-btn",
          style: "width:34px; height:34px; border-radius:8px; font-size:0.9rem; background:#2e7d32; border:none; box-shadow:none;",
          text: "💾",
          title: "Save Changes",
          onClick: () => {
            const updatedText = editInput.value.trim();
            if (!updatedText) { toast("Card text cannot be empty!"); return; }
            if (cards.includes(updatedText) && cards[idx] !== updatedText) {
              toast("This card already exists!");
              return;
            }
            cards[idx] = updatedText;
            store.set(saveKey, cards);
            editingIndex = null;
            render();
            toast("Card updated successfully!");
          }
        });

        const cancelBtn = el("button", {
          className: "icon-btn",
          style: "width:34px; height:34px; border-radius:8px; font-size:0.9rem; background:#c62828; border:none; box-shadow:none; margin-left:4px;",
          text: "✕",
          title: "Cancel Edit",
          onClick: () => {
            editingIndex = null;
            render();
          }
        });

        cardContent = editInput;
        actionButtons = el("div", { style: "display:flex; align-items:center;" }, [saveBtn, cancelBtn]);
      } else {
        const cardText = el("span", {
          style: "font-size:0.95rem; font-weight:700; color:#fff; word-break:break-word; flex:1;",
          text: card
        });

        const editBtn = el("button", {
          className: "icon-btn",
          style: "width:32px; height:32px; border-radius:8px; font-size:0.85rem; background:rgba(255,255,255,0.08); border:none; box-shadow:none;",
          text: "✏️",
          title: "Edit Card",
          onClick: () => {
            editingIndex = idx;
            render();
          }
        });

        const deleteBtn = el("button", {
          className: "icon-btn",
          style: "width:32px; height:32px; border-radius:8px; font-size:0.85rem; background:rgba(198,40,40,0.15); border:none; box-shadow:none; margin-left:4px;",
          text: "🗑️",
          title: "Delete Card",
          onClick: () => {
            if (confirm(`Are you sure you want to permanently delete: "${card}"?`)) {
              cards.splice(idx, 1);
              store.set(saveKey, cards);
              editingIndex = null;
              render();
              toast("Card deleted!");
            }
          }
        });

        cardContent = cardText;
        actionButtons = el("div", { style: "display:flex; align-items:center;" }, [editBtn, deleteBtn]);
      }

      const row = el("div", {
        className: "score-row",
        style: "padding:8px 10px; display:flex; align-items:center; justify-content:space-between;"
      }, [cardContent, actionButtons]);

      listContainer.appendChild(row);
    });

    listPanel.appendChild(listContainer);

    // Clear All / Reset Button
    const clearBtn = el("button", {
      className: "btn ghost small",
      style: "width:100%; margin-top: 14px; background:rgba(198,40,40,0.1); border:1px dashed #c62828; color:#ef5350; font-weight:700; box-shadow:none;",
      text: "🧹 Reset/Delete All Custom Cards",
      onClick: () => {
        if (confirm(`⚠️ WARNING: This will permanently delete ALL ${cards.length} custom cards in ${activeGame.name}! This cannot be undone. Proceed?`)) {
          store.del(saveKey);
          editingIndex = null;
          render();
          toast("Deck reset successfully!");
        }
      }
    });
    listPanel.appendChild(clearBtn);
  }

  mount(
    topbar,
    tabRow,
    introHeader,
    addPanel,
    listPanel
  );
}
