// Custom Cards Settings manager — visually edit, delete, and manually add custom responses and prompts.
import { el, mount, toast, store } from "./ui.js";
import { pushToCloud } from "./cloud_sync.js";
import { icons } from "./icons.js";

const MANAGED_GAMES = [
  { id: "family", name: "Cards Against the Family", iconFn: icons.family, saveKey: "family.game.v1", hasPrompts: true, placeholder: "e.g. mom trying to buy sketchy bootleg fireworks off a guy named Slick", familyFriendly: true },
  { id: "sibling", name: "Sibling Rivalry", iconFn: icons.sibling, saveKey: "sibling.game.v1", hasPrompts: false, placeholder: "e.g. Do a dramatic reenactment of buying a cursed energy drink behind a sketchy laser tag arena.", familyFriendly: true },
  { id: "roasts", name: "Family Roasts", iconFn: icons.roasts, saveKey: "roasts.game.v1", hasPrompts: false, placeholder: "e.g. Who in the family is secretly the biggest screen-time addict.", familyFriendly: true },
  { id: "cam", name: "Cards Against Monkeys", iconFn: icons.monkeys, saveKey: "cam.game.v1", hasPrompts: true, placeholder: "e.g. Subway Surfers gameplay during a funeral", familyFriendly: false },
  { id: "cabin", name: "Cards Against the Cabin", iconFn: icons.cabin, saveKey: "cabin.game.v1", hasPrompts: true, placeholder: "e.g. bootleg Elmo in an alleyway surrounded by mysterious cloudy gas", familyFriendly: false },
  { id: "rizz", name: "Rizz Roulette", iconFn: icons.rizz, saveKey: "rizz.game.v1", hasPrompts: false, placeholder: "e.g. Say it with rizz: \"Are you Ohio? Because you make me act crazy.\"", familyFriendly: false },
  { id: "wyr", name: "Would You Rather", iconFn: icons.wyr, saveKey: "wyr.game.v1", hasPrompts: false, placeholder: "e.g. Always step on a wet spot, OR chew on a dry sponge?", familyFriendly: false },
  { id: "flags", name: "Red Flag / Green Flag", iconFn: icons.flags, saveKey: "flags.game.v1", hasPrompts: false, placeholder: "e.g. They literally have zero internet presence.", familyFriendly: true },
  { id: "truths", name: "Lake House Truths", iconFn: icons.truths, saveKey: "truths.game.v1", hasPrompts: false, placeholder: "e.g. Who in the cabin is secretly a duplicate agent?", familyFriendly: true },
  { id: "catchphrase", name: "Lake House Catchphrase", iconFn: icons.catchphrase, saveKey: "catchphrase.game.v1", hasPrompts: false, placeholder: "e.g. water skiing behind a rowboat", familyFriendly: true }
];

let activeGameId = "family";
let activeTab = "responses"; // "responses" | "prompts"
let editingIndex = null; // index of the card being edited
let currentHomeCallback = null;

export function openCustomCardsManager(homeCallback) {
  currentHomeCallback = homeCallback;
  render();
}

function render() {
  const weirdUnlocked = localStorage.getItem("lakehouse.weird_unlocked") === "true";
  const visibleGames = MANAGED_GAMES.filter(g => weirdUnlocked || g.familyFriendly);

  // If currently active game is not visible, fallback to first visible game
  if (!visibleGames.some(g => g.id === activeGameId)) {
    activeGameId = visibleGames[0].id;
  }

  const activeGame = visibleGames.find(g => g.id === activeGameId) || visibleGames[0];
  
  // Safe-guard tab
  if (!activeGame.hasPrompts && activeTab === "prompts") {
    activeTab = "responses";
  }

  const responsesKey = activeGame.saveKey + ".custom_cards";
  const promptsKey = activeGame.saveKey + ".custom_prompts";

  const responses = store.get(responsesKey, []);
  const prompts = store.get(promptsKey, []);

  // Topbar
  const topbar = el("div", { className: "topbar" }, [
    el("button", { className: "back", text: "‹ Home", onClick: currentHomeCallback }),
    el("div", { className: "title", text: "Custom Cards Settings" }),
    el("span", { style: "width:64px" })
  ]);

  // Tab row selectors (Monkey, Cabin, Rizz...)
  const tabRow = el("div", {
    className: "btn-row",
    style: "margin-top: 10px; margin-bottom: 14px; gap: 8px; justify-content: center;"
  });

  visibleGames.forEach(g => {
    const isActive = g.id === activeGameId;
    const tabBtn = el("button", {
      className: "btn small" + (isActive ? "" : " ghost"),
      style: "flex:1; min-width:60px; padding:8px 10px; font-size:0.85rem; font-weight:700; white-space:nowrap; display:flex; align-items:center; justify-content:center; gap:4px;",
      onClick: () => {
        activeGameId = g.id;
        activeTab = "responses";
        editingIndex = null;
        render();
      }
    }, [
      el("span", { style: "width:18px; height:18px; display:inline-block;" }, [g.iconFn()]),
      el("span", { text: g.id.toUpperCase() })
    ]);
    tabRow.appendChild(tabBtn);
  });

  // Game Intro Header
  const introHeader = el("div", { className: "panel center", style: "padding: 12px 18px;" }, [
    el("h3", { style: "margin:0 0 4px 0; color:var(--water-foam); font-size:1.15rem; display:flex; align-items:center; justify-content:center; gap:8px;" }, [
      el("span", { style: "width:22px; height:22px; display:inline-block;" }, [activeGame.iconFn()]),
      el("span", { text: activeGame.name })
    ]),
    el("p", {
      className: "muted",
      style: "margin:0; font-size:0.85rem;",
      text: `Expand or modify custom decks that show up in subsequent games.`
    })
  ]);

  // Secondary sub-tab selectors (Responses vs Prompts)
  let subTabRow = null;
  if (activeGame.hasPrompts) {
    const respSub = el("button", {
      className: "btn small" + (activeTab === "responses" ? " secondary" : " ghost"),
      style: "flex:1; font-weight:700; padding:6px 12px; font-size:0.85rem; margin:0;",
      text: `Responses (${responses.length})`,
      onClick: () => {
        activeTab = "responses";
        editingIndex = null;
        render();
      }
    });

    const promptSub = el("button", {
      className: "btn small" + (activeTab === "prompts" ? " secondary" : " ghost"),
      style: "flex:1; font-weight:700; padding:6px 12px; font-size:0.85rem; margin:0;",
      text: `Prompts (${prompts.length})`,
      onClick: () => {
        activeTab = "prompts";
        editingIndex = null;
        render();
      }
    });

    subTabRow = el("div", {
      className: "btn-row",
      style: "margin-bottom: 12px; gap:10px; background:rgba(0,0,0,0.15); padding:6px; border-radius:12px;"
    }, [respSub, promptSub]);
  }

  // Define input section
  let labelText = "Add New Custom Card Manually";
  let inputPlaceholder = activeGame.placeholder;
  let explanationBox = null;

  if (activeTab === "prompts") {
    labelText = "Add Custom Prompt Card (Black)";
    inputPlaceholder = "e.g. My favorite looksmaxxing technique involves cheating on _.";
    
    explanationBox = el("div", {
      className: "panel",
      style: "background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.06); padding:12px; margin-top:8px;"
    }, [
      el("h4", { style: "margin:0 0 6px 0; font-size:0.9rem; color:var(--sunset);" }, [
        el("span", { text: "Prompt Formatting Instructions:" })
      ]),
      el("ul", { style: "margin:0; padding-left:18px; font-size:0.82rem; line-height:1.4;" }, [
        el("li", {}, [
          document.createTextNode("Use the underscore symbol "),
          el("code", { style: "background:rgba(255,255,255,0.1); padding:1px 4px; border-radius:4px; font-weight:bold; color:#fff;", text: "_" }),
          document.createTextNode(" to represent a blank card space.")
        ]),
        el("li", { text: "Each underscore represents 1 response card the players must submit (e.g. _ + _ = Pick 2)." }),
        el("li", { text: "You can use up to 4 underscores per prompt card." }),
        el("li", { text: "If you don't type any underscores, the prompt will show as a simple question card." }),
        el("li", { text: "For TXT import, save each prompt on a new line using _ for blanks (no quotes)." })
      ])
    ]);
  } else {
    explanationBox = el("div", {
      className: "panel",
      style: "background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.06); padding:12px; margin-top:8px;"
    }, [
      el("h4", { style: "margin:0 0 6px 0; font-size:0.9rem; color:var(--sunset);" }, [
        el("span", { text: "TXT Import Instructions:" })
      ]),
      el("ul", { style: "margin:0; padding-left:18px; font-size:0.82rem; line-height:1.4;" }, [
        el("li", { text: "Prepare a plain text (.txt) file." }),
        el("li", { text: "Write each response card on a new line (no quotes)." }),
        el("li", { text: "Click the Import button below to batch upload them instantly!" })
      ])
    ]);
  }

  const newCardInput = el("input", {
    type: "text",
    placeholder: inputPlaceholder,
    style: "flex:1; border-radius:12px; font-size:0.95rem; margin-right:8px;"
  });

  const addBtn = el("button", {
    className: "btn small",
    style: "width:auto; margin:0; padding:12px 16px; font-weight:700; display:flex; align-items:center; justify-content:center; gap:4px;",
    onClick: () => {
      const text = newCardInput.value.trim();
      if (!text) { toast("Please enter some card text first!"); return; }

      if (activeTab === "responses") {
        if (responses.includes(text)) { toast("This card already exists!"); return; }
        responses.push(text);
        store.set(responsesKey, responses);
        toast("Response card added!");
        // Push to cloud immediately (fire-and-forget)
        pushToCloud(activeGame.id, [text], []);
      } else {
        // Count underscores
        const count = (text.match(/_/g) || []).length;
        if (count > 4) {
          toast("At most 4 blank blanks (_) allowed per prompt card!");
          return;
        }

        // Convert underscores to standard blank representation
        const convertedText = text.replace(/_/g, "_______");
        const existing = prompts.find(p => p.text === convertedText);
        if (existing) { toast("This prompt card already exists!"); return; }

        const newPrompt = { text: convertedText, pick: Math.max(1, count) };
        prompts.push(newPrompt);
        store.set(promptsKey, prompts);
        toast("Prompt card added!");
        // Push to cloud immediately (fire-and-forget)
        pushToCloud(activeGame.id, [], [newPrompt]);
      }

      newCardInput.value = "";
      editingIndex = null;
      render();
    }
  }, [
    el("span", { style: "width:14px; height:14px; display:inline-block;" }, [icons.plus()]),
    el("span", { text: "Add" })
  ]);

  // Client-side TXT File Batch Importer
  const fileInput = el("input", {
    type: "file",
    accept: ".txt",
    style: "display:none;",
    onChange: (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        const content = evt.target.result;
        const lines = content.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
        if (lines.length === 0) {
          toast("The uploaded file is empty!");
          return;
        }

        let addedCount = 0;
        let duplicateCount = 0;
        let errorCount = 0;

        const newlyAddedCards = [];
        const newlyAddedPrompts = [];

        if (activeTab === "responses") {
          lines.forEach(text => {
            if (responses.includes(text)) {
              duplicateCount++;
            } else {
              responses.push(text);
              newlyAddedCards.push(text);
              addedCount++;
            }
          });
          store.set(responsesKey, responses);
          // Push all newly added cards to cloud in one batch
          if (newlyAddedCards.length > 0) pushToCloud(activeGame.id, newlyAddedCards, []);
        } else {
          lines.forEach(text => {
            const count = (text.match(/_/g) || []).length;
            if (count > 4) {
              errorCount++;
            } else {
              const convertedText = text.replace(/_/g, "_______");
              const existing = prompts.find(p => p.text === convertedText);
              if (existing) {
                duplicateCount++;
              } else {
                const p = { text: convertedText, pick: Math.max(1, count) };
                prompts.push(p);
                newlyAddedPrompts.push(p);
                addedCount++;
              }
            }
          });
          store.set(promptsKey, prompts);
          // Push all newly added prompts to cloud in one batch
          if (newlyAddedPrompts.length > 0) pushToCloud(activeGame.id, [], newlyAddedPrompts);
        }

        let msg = `Successfully imported ${addedCount} card(s)!`;
        if (duplicateCount > 0) msg += ` (${duplicateCount} duplicate(s) skipped)`;
        if (errorCount > 0) msg += ` (${errorCount} prompt(s) skipped due to exceeding 4 blanks)`;
        toast(msg);

        fileInput.value = ""; // Reset
        render();
      };
      reader.readAsText(file);
    }
  });

  const importBtn = el("button", {
    className: "btn ghost small",
    style: "width:100%; font-weight:700; margin-top:8px; display:flex; align-items:center; justify-content:center; gap:8px; border-radius:12px;",
    onClick: () => fileInput.click()
  }, [
    el("span", { style: "width:16px; height:16px; display:inline-block;" }, [icons.plus()]),
    el("span", { text: "Import Cards from .txt File" })
  ]);

  const addPanel = el("div", { className: "panel" }, [
    el("label", { text: labelText }),
    el("div", { style: "display:flex; align-items:center;" }, [newCardInput, addBtn]),
    explanationBox,
    fileInput,
    importBtn
  ]);

  // List of items
  const items = activeTab === "responses" ? responses : prompts;
  const listPanel = el("div", { className: "panel" });
  listPanel.appendChild(el("label", { text: `Custom Deck List (${items.length} card${items.length === 1 ? "" : "s"})` }));

  if (items.length === 0) {
    listPanel.appendChild(el("p", {
      className: "muted center",
      style: "margin:16px 0; font-style:italic;",
      text: "No custom cards added yet in this list. Enter one above!"
    }));
  } else {
    const listContainer = el("div", { className: "scoreboard", style: "max-height: 380px; overflow-y: auto;" });
    
    items.forEach((item, idx) => {
      const isEditing = editingIndex === idx;
      let cardTextRaw = activeTab === "responses" ? item : item.text;
      
      // Convert standard blanks _______ back to simple underscores _ for editing/display ease
      const displayCardText = cardTextRaw.replace(/_______/g, "_");

      let cardContent;
      let actionButtons;

      if (isEditing) {
        const editInput = el("input", {
          type: "text",
          value: displayCardText,
          style: "flex:1; border-radius:8px; font-size:0.9rem; padding:6px 10px; margin-right:6px;"
        });

        const saveBtn = el("button", {
          className: "icon-btn",
          style: "width:34px; height:34px; border-radius:8px; background:#2e7d32; border:none; box-shadow:none; display:flex; align-items:center; justify-content:center; padding:0;",
          title: "Save Changes",
          onClick: () => {
            const updatedText = editInput.value.trim();
            if (!updatedText) { toast("Card text cannot be empty!"); return; }

            if (activeTab === "responses") {
              if (responses.includes(updatedText) && responses[idx] !== updatedText) {
                toast("This card already exists!");
                return;
              }
              responses[idx] = updatedText;
              store.set(responsesKey, responses);
            } else {
              const count = (updatedText.match(/_/g) || []).length;
              if (count > 4) {
                toast("At most 4 blank blanks (_) allowed per prompt!");
                return;
              }
              const convertedText = updatedText.replace(/_/g, "_______");
              const duplicate = prompts.find((p, pIdx) => p.text === convertedText && pIdx !== idx);
              if (duplicate) { toast("This prompt card already exists!"); return; }

              prompts[idx] = {
                text: convertedText,
                pick: Math.max(1, count)
              };
              store.set(promptsKey, prompts);
            }

            editingIndex = null;
            render();
            toast("Card updated!");
          }
        }, [
          el("span", { style: "width:16px; height:16px; display:inline-block; color:#fff;" }, [icons.checked()])
        ]);

        const cancelBtn = el("button", {
          className: "icon-btn",
          style: "width:34px; height:34px; border-radius:8px; background:#c62828; border:none; box-shadow:none; margin-left:4px; display:flex; align-items:center; justify-content:center; padding:0;",
          title: "Cancel Edit",
          onClick: () => {
            editingIndex = null;
            render();
          }
        }, [
          el("span", { style: "width:16px; height:16px; display:inline-block; color:#fff;" }, [icons.cross()])
        ]);

        cardContent = editInput;
        actionButtons = el("div", { style: "display:flex; align-items:center;" }, [saveBtn, cancelBtn]);
      } else {
        const textSpan = el("span", {
          style: "font-size:0.95rem; font-weight:700; color:#fff; word-break:break-word; flex:1;",
          text: displayCardText
        });

        // Add a small tag showing how many blanks a prompt requires
        let pickTag = null;
        if (activeTab === "prompts") {
          pickTag = el("span", {
            className: "badge",
            style: "background:rgba(0,0,0,0.3); color:var(--water-foam); font-size:0.7rem; font-weight:700; margin:0 8px 0 0; padding:2px 6px; border:1px solid rgba(255,255,255,0.1);",
            text: `Pick ${item.pick}`
          });
        }

        const editBtn = el("button", {
          className: "icon-btn",
          style: "width:32px; height:32px; border-radius:8px; background:rgba(255,255,255,0.08); border:none; box-shadow:none; display:flex; align-items:center; justify-content:center; padding:0;",
          title: "Edit Card",
          onClick: () => {
            editingIndex = idx;
            render();
          }
        }, [
          el("span", { style: "width:14px; height:14px; display:inline-block; color:#fff;" }, [icons.pen()])
        ]);

        const deleteBtn = el("button", {
          className: "icon-btn",
          style: "width:32px; height:32px; border-radius:8px; background:rgba(198,40,40,0.15); border:none; box-shadow:none; margin-left:4px; display:flex; align-items:center; justify-content:center; padding:0;",
          title: "Delete Card",
          onClick: () => {
            if (confirm(`Are you sure you want to permanently delete this custom card?`)) {
              items.splice(idx, 1);
              store.set(activeTab === "responses" ? responsesKey : promptsKey, items);
              editingIndex = null;
              render();
              toast("Card deleted!");
            }
          }
        }, [
          el("span", { style: "width:14px; height:14px; display:inline-block; color:#ef5350;" }, [icons.trash()])
        ]);

        cardContent = el("div", { style: "display:flex; align-items:center; flex:1; margin-right:8px;" }, [
          pickTag,
          textSpan
        ]);
        actionButtons = el("div", { style: "display:flex; align-items:center;" }, [editBtn, deleteBtn]);
      }

      const row = el("div", {
        className: "score-row",
        style: "padding:8px 10px; display:flex; align-items:center; justify-content:space-between;"
      }, [cardContent, actionButtons]);

      listContainer.appendChild(row);
    });

    listPanel.appendChild(listContainer);

    // Clear All Button
    const clearBtn = el("button", {
      className: "btn ghost small",
      style: "width:100%; margin-top: 14px; background:rgba(198,40,40,0.1); border:1px dashed #c62828; color:#ef5350; font-weight:700; box-shadow:none; display:flex; align-items:center; justify-content:center; gap:6px;",
      onClick: () => {
        if (confirm(`WARNING: This will permanently delete ALL custom ${activeTab} in this deck! Proceed?`)) {
          store.del(activeTab === "responses" ? responsesKey : promptsKey);
          editingIndex = null;
          render();
          toast("Wiped successfully!");
        }
      }
    }, [
      el("span", { style: "width:14px; height:14px; display:inline-block;" }, [icons.trash()]),
      el("span", { text: `Delete All Custom ${activeTab.toUpperCase()}` })
    ]);
    listPanel.appendChild(clearBtn);
  }

  mount(
    topbar,
    tabRow,
    introHeader,
    subTabRow,
    addPanel,
    listPanel
  );
}
