// Premium Custom Decks Manager — visual deck list, creator, JSON/TXT importer, sharing and downloader.
import { el, mount, toast, store, HTTP_BASE, WS_BASE } from "./ui.js";
import { icons } from "./icons.js";

const MANAGED_GAMES = [
  { id: "cabin", name: "Cabin Fever", iconFn: icons.cabin, saveKey: "cabin.game.v1", hasPrompts: true, placeholder: "e.g. Subway Surfers gameplay during a funeral" },
  { id: "roasts", name: "Campfire Roasts", iconFn: icons.roasts, saveKey: "roasts.game.v1", hasPrompts: false, placeholder: "e.g. Who at this table is secretly the biggest screen-time addict?" },
  { id: "cam", name: "Cards Against Monkeys", iconFn: icons.monkeys, saveKey: "cam.game.v1", hasPrompts: true, placeholder: "e.g. bootleg Elmo in an alleyway surrounded by mysterious gas" },
  { id: "rizz", name: "Rizz Roulette", iconFn: icons.rizz, saveKey: "rizz.game.v1", hasPrompts: false, placeholder: "e.g. Say it with rizz: \"Are you Ohio? Because you make me act crazy.\"" },
  { id: "wyr", name: "Would You Rather", iconFn: icons.wyr, saveKey: "wyr.game.v1", hasPrompts: false, placeholder: "e.g. Always step on a wet spot, OR chew on a dry sponge?" },
  { id: "flags", name: "Red Flag / Green Flag", iconFn: icons.flags, saveKey: "flags.game.v1", hasPrompts: false, placeholder: "e.g. They literally have zero internet presence." },
  { id: "truths", name: "Lake House Truths", iconFn: icons.truths, saveKey: "truths.game.v1", hasPrompts: false, placeholder: "e.g. Who in the cabin is secretly a duplicate agent?" },
  { id: "catchphrase", name: "Lake House Catchphrase", iconFn: icons.catchphrase, saveKey: "catchphrase.game.v1", hasPrompts: false, placeholder: "e.g. water skiing behind a rowboat" }
];



let activeGameId = "cabin";
let activeSubTab = "mydecks"; // "mydecks" | "import" | "community"
let currentHomeCallback = null;

export function openCustomCardsManager(homeCallback) {
  currentHomeCallback = homeCallback;
  activeSubTab = "mydecks";
  render();
}

function render() {
  const weirdUnlocked = localStorage.getItem("lakehouse.weird_unlocked") === "true";
  const visibleGames = MANAGED_GAMES.filter(g => weirdUnlocked || g.id !== "cam" && g.id !== "rizz" && g.id !== "wyr");

  if (!visibleGames.some(g => g.id === activeGameId)) {
    activeGameId = visibleGames[0].id;
  }

  const activeGame = visibleGames.find(g => g.id === activeGameId) || visibleGames[0];

  // Legacy Migration
  const oldResponses = store.get(activeGame.saveKey + ".custom_cards", []);
  const oldPrompts = store.get(activeGame.saveKey + ".custom_prompts", []);
  if (oldResponses.length > 0 || oldPrompts.length > 0) {
    const customDecks = store.get(activeGame.saveKey + ".custom_decks", []);
    if (!customDecks.some(d => d.id === "legacy_custom")) {
      customDecks.push({
        id: "legacy_custom",
        name: "My Custom Pack",
        author: "Me",
        responses: oldResponses,
        prompts: oldPrompts
      });
      store.set(activeGame.saveKey + ".custom_decks", customDecks);
      const enabled = store.get(activeGame.saveKey + ".enabled_decks", ["core"]);
      if (!enabled.includes("legacy_custom")) {
        enabled.push("legacy_custom");
        store.set(activeGame.saveKey + ".enabled_decks", enabled);
      }
      store.del(activeGame.saveKey + ".custom_cards");
      store.del(activeGame.saveKey + ".custom_prompts");
    }
  }

  const customDecks = store.get(activeGame.saveKey + ".custom_decks", []);
  const enabledDecks = store.get(activeGame.saveKey + ".enabled_decks", ["core"]);

  // Header and Lobby
  const topbar = el("div", { className: "topbar" }, [
    el("button", { className: "back", text: "‹ Home", onClick: currentHomeCallback }),
    el("div", { className: "title", text: "Playable Decks Settings" }),
    el("span", { style: "width:64px" })
  ]);

  const gameTabsRow = el("div", {
    className: "btn-row",
    style: "margin-top: 10px; margin-bottom: 14px; gap: 8px; justify-content: center; overflow-x: auto; padding-bottom: 4px;"
  });

  visibleGames.forEach(g => {
    const isActive = g.id === activeGameId;
    gameTabsRow.appendChild(
      el("button", {
        className: "btn small" + (isActive ? "" : " ghost"),
        style: "flex:1; min-width:80px; padding:8px 10px; font-size:0.85rem; font-weight:700; white-space:nowrap; display:flex; align-items:center; justify-content:center; gap:4px; margin:0;",
        onClick: () => {
          activeGameId = g.id;
          activeSubTab = "mydecks";
          render();
        }
      }, [
        el("span", { style: "width:18px; height:18px; display:inline-block;" }, [g.iconFn()]),
        el("span", { text: g.name.replace("Lake House ", "") })
      ])
    );
  });

  // Frosted layout sub-menu
  const subMenu = el("div", {
    className: "btn-row",
    style: "margin-bottom:16px; gap:8px; background:rgba(0,0,0,0.12); padding:5px; border-radius:14px;"
  }, [
    el("button", {
      className: "btn small" + (activeSubTab === "mydecks" ? " secondary" : " ghost"),
      style: "flex:1; font-weight:700; padding:8px 0; font-size:0.85rem; margin:0;",
      text: "🎴 My Decks",
      onClick: () => { activeSubTab = "mydecks"; render(); }
    }),
    el("button", {
      className: "btn small" + (activeSubTab === "import" ? " secondary" : " ghost"),
      style: "flex:1; font-weight:700; padding:8px 0; font-size:0.85rem; margin:0;",
      text: "📥 Import Pack",
      onClick: () => { activeSubTab = "import"; render(); }
    }),
    el("button", {
      className: "btn small" + (activeSubTab === "community" ? " secondary" : " ghost"),
      style: "flex:1; font-weight:700; padding:8px 0; font-size:0.85rem; margin:0;",
      text: "🌐 Library",
      onClick: () => { activeSubTab = "community"; render(); }
    })
  ]);

  const mainPanel = el("div", { className: "panel center", style: "padding:20px;" });

  if (activeSubTab === "mydecks") {
    // MY DECKS VIEW
    const listWrap = el("div", { style: "display:flex; flex-direction:column; gap:12px; width:100%; text-align:left; margin-top:14px;" });

    // 1. Core Deck Row
    const isCoreEnabled = enabledDecks.includes("core");
    listWrap.appendChild(
      el("div", {
        style: "display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:14px 18px;"
      }, [
        el("div", { style: "display:flex; flex-direction:column; gap:2px;" }, [
          el("span", { text: "📖 Built-in Core Deck", style: "font-weight:bold; font-size:1.05rem;" }),
          el("span", { text: "Default curated house deck cards.", className: "muted", style: "font-size:0.8rem;" })
        ]),
        el("input", {
          type: "checkbox",
          checked: isCoreEnabled,
          style: "width:22px; height:22px; border-radius:6px; cursor:pointer;",
          onChange: (e) => {
            const enabled = enabledDecks.filter(id => id !== "core");
            if (e.target.checked) enabled.push("core");
            store.set(activeGame.saveKey + ".enabled_decks", enabled);
            render();
          }
        })
      ])
    );

    // 2. Custom Decks Rows
    customDecks.forEach(deck => {
      const isEnabled = enabledDecks.includes(deck.id);
      const respsCount = (deck.responses || deck.cards || []).length;
      const promptsCount = (deck.prompts || []).length;
      
      let countText = `${respsCount} responses`;
      if (activeGame.hasPrompts) {
        countText = `${respsCount} responses • ${promptsCount} prompts`;
      }

      const shareBtn = el("button", {
        className: "btn ghost small",
        style: "margin:0; padding:6px 12px; border-radius:10px; font-size:0.75rem; display:flex; align-items:center; gap:4px; border-color:var(--water-foam); color:var(--water-foam); font-weight:700;",
        onClick: () => {
          fetch(`${HTTP_BASE}/decks/upload`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              gameId: activeGame.id,
              id: deck.id,
              name: deck.name,
              author: deck.author || "Guest",
              responses: deck.responses || deck.cards || [],
              prompts: deck.prompts || []
            })
          })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              toast(`"${deck.name}" uploaded to server library successfully!`);
            } else {
              toast("Server share failed.");
            }
          })
          .catch(() => toast("Failed to contact upload server."));
        }
      }, [
        el("span", { style: "width:12px; height:12px; display:inline-block;" }, [icons.cloud() || ""]),
        el("span", { text: "Share 🌐" })
      ]);

      const deleteBtn = el("button", {
        className: "btn ghost small error",
        style: "margin:0; padding:6px 12px; border-radius:10px; font-size:0.75rem; font-weight:700;",
        onClick: () => {
          if (confirm(`Are you sure you want to permanently delete custom pack "${deck.name}"?`)) {
            const updated = customDecks.filter(d => d.id !== deck.id);
            store.set(activeGame.saveKey + ".custom_decks", updated);
            const enabled = enabledDecks.filter(id => id !== deck.id);
            store.set(activeGame.saveKey + ".enabled_decks", enabled);
            render();
            toast("Pack deleted successfully.");
          }
        }
      }, "Delete 🗑️");

      listWrap.appendChild(
        el("div", {
          style: "background:rgba(255,255,255,0.02); border:1.5px solid rgba(255,255,255,0.06); border-radius:14px; padding:14px 18px; margin-top:4px;"
        }, [
          el("div", { style: "display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;" }, [
            el("div", { style: "display:flex; flex-direction:column; gap:2px;" }, [
              el("span", { text: `📦 ${deck.name}`, style: "font-weight:800; font-size:1.05rem; color:var(--sunset-soft);" }),
              el("span", { text: `by ${deck.author || "Anonymous"} • ${countText}`, className: "muted", style: "font-size:0.8rem;" })
            ]),
            el("input", {
              type: "checkbox",
              checked: isEnabled,
              style: "width:22px; height:22px; border-radius:6px; cursor:pointer;",
              onChange: (e) => {
                const enabled = enabledDecks.filter(id => id !== deck.id);
                if (e.target.checked) enabled.push(deck.id);
                store.set(activeGame.saveKey + ".enabled_decks", enabled);
                render();
              }
            })
          ]),
          el("div", { style: "display:flex; gap:8px; justify-content:flex-end;" }, [shareBtn, deleteBtn])
        ])
      );
    });

    mainPanel.appendChild(el("h3", { text: "My Playable Decks", style: "margin:0;" }));
    mainPanel.appendChild(el("p", { className: "muted", text: "Toggle checkboxes to mix and match active deck packages for your gameplay.", style: "font-size:0.85rem;" }));
    mainPanel.appendChild(listWrap);

  } else if (activeSubTab === "import") {
    // IMPORT PACK VIEW
    const packNameInput = el("input", {
      type: "text",
      placeholder: "e.g. Lakeside Expansion...",
      style: "border-radius:12px; font-size:1rem; margin-bottom:12px; width:100%;"
    });

    const authorInput = el("input", {
      type: "text",
      placeholder: "Your name (optional)...",
      style: "border-radius:12px; font-size:1rem; margin-bottom:16px; width:100%;"
    });

    const whiteArea = el("textarea", {
      placeholder: "White Cards / Responses (one per line)...",
      style: "width:100%; height:120px; border-radius:12px; font-size:0.9rem; margin-bottom:12px;"
    });

    const blackArea = el("textarea", {
      placeholder: "Black Cards / Prompts (one per line, use _ for blank spaces)...",
      style: "width:100%; height:120px; border-radius:12px; font-size:0.9rem; margin-bottom:16px;"
    });

    const fileInput = el("input", {
      type: "file",
      accept: ".json,.txt",
      style: "display:none;",
      onChange: (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const raw = evt.target.result;
            if (file.name.endsWith(".json")) {
              const parsed = JSON.parse(raw);
              if (parsed.name && (parsed.responses || parsed.cards)) {
                packNameInput.value = parsed.name;
                authorInput.value = parsed.author || "Importer";
                whiteArea.value = (parsed.responses || parsed.cards || []).join("\n");
                blackArea.value = (parsed.prompts || []).join("\n");
                toast("JSON deck loaded! Click 'Save Custom Pack' to complete.");
              } else {
                toast("Invalid JSON deck structure.");
              }
            } else {
              whiteArea.value = raw;
              toast("TXT file lines loaded as White Cards!");
            }
          } catch (_) {
            toast("File import failed.");
          }
        };
        reader.readAsText(file);
      }
    });

    const fileBtn = el("button", {
      className: "btn ghost small",
      style: "width:100%; margin-bottom:16px; font-weight:700; display:flex; align-items:center; justify-content:center; gap:6px;",
      onClick: () => fileInput.click()
    }, "📂 Load Pack from JSON or TXT File");

    const saveBtn = el("button", {
      className: "btn",
      style: "width:100%; font-weight:bold;",
      text: "💾 Save Custom Pack",
      onClick: () => {
        const name = packNameInput.value.trim();
        if (!name) { toast("Deck pack must have a name!"); return; }

        const responses = whiteArea.value.split(/\n/).map(s => s.trim()).filter(s => s.length > 0);
        const prompts = blackArea.value.split(/\n/).map(s => s.trim()).filter(s => s.length > 0);

        if (responses.length === 0 && prompts.length === 0) {
          toast("Deck must have at least one response or prompt card!");
          return;
        }

        const deckId = "deck_" + Date.now();
        const newDeck = {
          id: deckId,
          name,
          author: authorInput.value.trim() || "Creator",
          responses,
          prompts
        };

        customDecks.push(newDeck);
        store.set(activeGame.saveKey + ".custom_decks", customDecks);

        // Auto-enable newly imported deck
        enabledDecks.push(deckId);
        store.set(activeGame.saveKey + ".enabled_decks", enabledDecks);

        toast(`Custom pack "${name}" saved and active!`);
        activeSubTab = "mydecks";
        render();
      }
    });

    mainPanel.appendChild(el("h3", { text: "Import & Create Custom Pack", style: "margin:0 0 4px;" }));
    mainPanel.appendChild(el("p", { className: "muted", text: "Create a named deck pack by loading files or manually pasting card texts below.", style: "font-size:0.85rem; margin-bottom:16px;" }));
    mainPanel.appendChild(packNameInput);
    mainPanel.appendChild(authorInput);
    mainPanel.appendChild(fileInput);
    mainPanel.appendChild(fileBtn);
    
    mainPanel.appendChild(el("label", { text: "White Cards / Responses (one per line)" }));
    mainPanel.appendChild(whiteArea);
    
    if (activeGame.hasPrompts) {
      mainPanel.appendChild(el("label", { text: "Black Cards / Prompts (one per line, use _ for blanks)" }));
      mainPanel.appendChild(blackArea);
    }
    
    mainPanel.appendChild(saveBtn);

  } else if (activeSubTab === "community") {
    // COMMUNITY DECKS LIBRARY VIEW
    const libraryWrap = el("div", { style: "display:flex; flex-direction:column; gap:12px; width:100%; text-align:left; margin-top:14px;" });

    mainPanel.appendChild(el("h3", { text: "Community Shared Decks", style: "margin:0;" }));
    mainPanel.appendChild(el("p", { className: "muted", text: "Browse and download creative deck packs uploaded to the local sharing server.", style: "font-size:0.85rem;" }));
    mainPanel.appendChild(libraryWrap);

    libraryWrap.appendChild(
      el("p", { className: "muted center anim-pulse", text: "Loading shared community library..." })
    );

    fetch(`${HTTP_BASE}/decks/list`)
      .then(res => res.json())
      .then(decks => {
        libraryWrap.innerHTML = "";
        const matches = decks.filter(d => d.gameId === activeGame.id);
        if (matches.length === 0) {
          libraryWrap.appendChild(
            el("p", { className: "muted center", style: "font-style:italic;", text: "No custom packs shared for this game yet. Be the first to share one!" })
          );
          return;
        }

        matches.forEach(deck => {
          const alreadyDownloaded = customDecks.some(d => d.name === deck.name);
          
          const respsCount = (deck.responses || deck.cards || []).length;
          const promptsCount = (deck.prompts || []).length;
          let countText = `${respsCount} responses`;
          if (activeGame.hasPrompts) {
            countText = `${respsCount} responses • ${promptsCount} prompts`;
          }

          const dlBtn = el("button", {
            className: "btn small" + (alreadyDownloaded ? " ghost" : ""),
            style: "margin:0; padding:8px 14px; border-radius:12px; font-weight:700;",
            disabled: alreadyDownloaded,
            onClick: () => {
              const deckId = "deck_" + Date.now();
              customDecks.push({
                id: deckId,
                name: deck.name,
                author: deck.author || "Shared",
                responses: deck.responses || deck.cards || [],
                prompts: deck.prompts || []
              });
              store.set(activeGame.saveKey + ".custom_decks", customDecks);
              
              // Enable downloaded deck instantly
              enabledDecks.push(deckId);
              store.set(activeGame.saveKey + ".enabled_decks", enabledDecks);
              
              toast(`"${deck.name}" downloaded and enabled!`);
              activeSubTab = "mydecks";
              render();
            }
          }, alreadyDownloaded ? "Downloaded ✅" : "Download 📥");

          libraryWrap.appendChild(
            el("div", {
              style: "display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:14px; padding:14px 18px;"
            }, [
              el("div", { style: "display:flex; flex-direction:column; gap:2px;" }, [
                el("span", { text: `🌐 ${deck.name}`, style: "font-weight:bold; font-size:1.05rem;" }),
                el("span", { text: `by ${deck.author || "Anonymous"} • ${countText}`, className: "muted", style: "font-size:0.8rem;" })
              ]),
              dlBtn
            ])
          );
        });
      })
      .catch(() => {
        libraryWrap.innerHTML = "";
        libraryWrap.appendChild(
          el("p", { className: "muted center error", text: "Failed to connect to shared decks server. Check that server.js is active." })
        );
      });
  }

  mount(
    topbar,
    gameTabsRow,
    subMenu,
    mainPanel
  );
}
