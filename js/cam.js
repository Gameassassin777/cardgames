// Pass-and-play "fill in the blank" party game (Cards Against Humanity style).
// One engine, configured per deck via makeGame() — e.g. Monkeys (sussy) and Cabin (normal).
import { el, mount, shuffle, toast, store, fillPrompt } from "./ui.js";
import { BLANK } from "./data.js";

const HAND_SIZE = 10;

let goHome = () => {};
let state = null;
let cfg = null;

// cfg: { title, icon, prompts, responses, winnerTitle, blurb, footer, saveKey, namesKey, targetKey }
export function makeGame(config) {
  return function start(home) {
    goHome = home;
    cfg = config;
    const saved = store.get(cfg.saveKey, null);
    if (saved && saved.phase && saved.phase !== "over") {
      renderResume(saved);
    } else {
      renderSetup();
    }
  };
}

function topbar(title) {
  return el("div", { className: "topbar" }, [
    el("button", { className: "back", text: "‹ Lobby", onClick: confirmQuit }),
    el("div", { className: "title", text: title }),
    el("span", { style: "width:64px" }),
  ]);
}

function confirmQuit() {
  // Leaving mid-game keeps the save so it can be resumed.
  goHome();
}

/* ---------------- Resume ---------------- */
function renderResume(saved) {
  mount(
    topbar(cfg.title),
    el("div", { className: "panel center" }, [
      el("div", { className: "big-emoji", text: cfg.icon }),
      el("h2", { text: "Game in progress" }),
      el("p", { className: "muted", text: `Round ${saved.round} • ${saved.players.length} players. Pick up where you left off?` }),
      el("div", { className: "spacer" }),
      el("button", { className: "btn", text: "Resume game", onClick: () => { state = saved; render(); } }),
      el("div", { className: "spacer" }),
      el("button", { className: "btn ghost", text: "Start a new game", onClick: () => { store.del(cfg.saveKey); renderSetup(); } }),
    ])
  );
}

/* ---------------- Setup ---------------- */
function renderSetup() {
  const savedNames = store.get(cfg.namesKey, ["", "", ""]);
  let names = savedNames.length >= 3 ? savedNames.slice() : ["", "", ""];
  let target = store.get(cfg.targetKey, 5);

  const listWrap = el("div", { id: "playerList" });

  function drawList() {
    listWrap.innerHTML = "";
    names.forEach((nm, i) => {
      const input = el("input", {
        type: "text",
        value: nm,
        maxlength: "16",
        placeholder: `Player ${i + 1}`,
        onInput: (e) => { names[i] = e.target.value; },
      });
      const row = el("div", { className: "player-row" }, [
        input,
        el("button", {
          className: "icon-btn",
          text: "✕",
          title: "Remove player",
          onClick: () => { if (names.length > 3) { names.splice(i, 1); drawList(); } else toast("Need at least 3 players."); },
        }),
      ]);
      listWrap.appendChild(row);
    });
  }
  drawList();

  const stepperVal = el("span", { className: "val", text: String(target) });
  const stepper = el("div", { className: "stepper" }, [
    el("button", { text: "−", onClick: () => { target = Math.max(1, target - 1); stepperVal.textContent = target; } }),
    stepperVal,
    el("button", { text: "+", onClick: () => { target = Math.min(20, target + 1); stepperVal.textContent = target; } }),
    el("span", { className: "muted", text: "points to win", style: "margin-left:6px" }),
  ]);

  mount(
    topbar(cfg.title),
    el("div", { className: "panel" }, [
      el("p", { className: "muted", html: cfg.blurb }),
    ]),
    el("div", { className: "panel" }, [
      el("label", { text: "Players (3+)" }),
      listWrap,
      el("button", {
        className: "btn ghost small",
        text: "+ Add player",
        onClick: () => { if (names.length < 12) { names.push(""); drawList(); } else toast("12 players max."); },
      }),
      el("hr", { className: "divider" }),
      el("label", { text: "Score to win" }),
      stepper,
    ]),
    el("button", { className: "btn", text: `Start game ${cfg.icon}`, onClick: () => beginGame(names, target) }),
    el("div", { className: "footer-note", text: cfg.footer })
  );
}

function beginGame(rawNames, target) {
  const players = rawNames.map((n) => n.trim()).filter(Boolean);
  if (players.length < 3) { toast("Add at least 3 player names."); return; }
  if (new Set(players.map((p) => p.toLowerCase())).size !== players.length) {
    toast("Player names must be unique."); return;
  }
  store.set(cfg.namesKey, players);
  store.set(cfg.targetKey, target);

  state = {
    players: players.map((name) => ({ name, score: 0 })),
    target,
    czar: 0,
    round: 1,
    deck: shuffle(cfg.responses),
    discard: [],
    promptDeck: shuffle(cfg.prompts.map((_, i) => i)),
    promptUsed: [],
    hands: players.map(() => []),
    prompt: null,
    submissions: [],
    order: [],     // shuffled submission display order (indices into submissions)
    queue: [],     // submitting player indices for the round
    qi: 0,
    selected: [],
    chosen: null,
    phase: "intro",
  };
  // Deal opening hands.
  state.hands = state.players.map(() => drawCards(HAND_SIZE));
  dealPrompt();
  render();
}

/* ---------------- Deck helpers ---------------- */
function drawCards(n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    if (state.deck.length === 0) {
      if (state.discard.length === 0) break;
      state.deck = shuffle(state.discard);
      state.discard = [];
    }
    out.push(state.deck.pop());
  }
  return out;
}

function dealPrompt() {
  if (state.promptDeck.length === 0) {
    state.promptDeck = shuffle(state.promptUsed);
    state.promptUsed = [];
  }
  const idx = state.promptDeck.pop();
  state.promptUsed.push(idx);
  state.prompt = cfg.prompts[idx];
}

function save() { store.set(cfg.saveKey, state); }

/* ---------------- Render dispatcher ---------------- */
function render() {
  save();
  switch (state.phase) {
    case "intro": return renderRoundIntro();
    case "handoff": return renderHandoff();
    case "submit": return renderSubmit();
    case "czar-handoff": return renderCzarHandoff();
    case "czar-pick": return renderCzarPick();
    case "result": return renderResult();
    case "over": return renderGameOver();
  }
}

function czarName() { return state.players[state.czar].name; }

/* ---------------- Round intro ---------------- */
function renderRoundIntro() {
  const promptCard = el("div", { className: "play-card prompt" }, [
    fillPrompt(state.prompt.text, BLANK, []),
    el("div", { className: "corner", text: state.prompt.pick === 2 ? "Pick 2" : "Pick 1" }),
  ]);

  mount(
    topbar(`Round ${state.round}`),
    el("div", { className: "panel center" }, [
      el("p", { className: "muted", text: "This round's Card Czar is" }),
      el("div", { className: "handoff", style: "padding:6px" }, [
        el("div", { className: "who", text: czarName() }),
        el("span", { className: "pill czar-pill", text: "👑 Card Czar" }),
      ]),
    ]),
    el("p", { className: "muted center", text: "Read this prompt aloud:" }),
    promptCard,
    el("div", { className: "spacer" }),
    el("button", { className: "btn", text: "Start submissions →", onClick: beginSubmissions }),
    scoreboardEl()
  );
}

function beginSubmissions() {
  state.queue = state.players.map((_, i) => i).filter((i) => i !== state.czar);
  state.qi = 0;
  state.submissions = [];
  state.selected = [];
  state.phase = "handoff";
  render();
}

/* ---------------- Submission handoff ---------------- */
function renderHandoff() {
  const pIdx = state.queue[state.qi];
  const name = state.players[pIdx].name;
  mount(
    topbar(`Round ${state.round}`),
    el("div", { className: "handoff panel" }, [
      el("div", { className: "big-emoji", text: "🤫" }),
      el("p", { className: "muted", text: "Pass the device to" }),
      el("div", { className: "who", text: name }),
      el("p", { className: "muted", text: `${state.qi + 1} of ${state.queue.length} players to submit` }),
      el("div", { className: "spacer" }),
      el("button", { className: "btn", text: `I'm ${name} — show my cards`, onClick: () => { state.selected = []; state.phase = "submit"; render(); } }),
    ])
  );
}

/* ---------------- Submit (pick cards) ---------------- */
function renderSubmit() {
  const pIdx = state.queue[state.qi];
  const hand = state.hands[pIdx];
  const need = state.prompt.pick;

  const promptCard = el("div", { className: "play-card prompt" }, [
    fillPrompt(state.prompt.text, BLANK, state.selected.map((i) => hand[i])),
    el("div", { className: "corner", text: need === 2 ? "Pick 2 — in order" : "Pick 1" }),
  ]);

  const handGrid = el("div", { className: "hand" });
  hand.forEach((card, i) => {
    const order = state.selected.indexOf(i);
    const selected = order !== -1;
    const node = el("div", {
      className: "play-card response" + (selected ? " selected" : ""),
      onClick: () => toggleSelect(i, need),
    }, [ el("span", { text: card }) ]);
    if (selected && need === 2) {
      node.appendChild(el("div", { className: "pick-order", text: String(order + 1) }));
    }
    handGrid.appendChild(node);
  });

  const ready = state.selected.length === need;
  mount(
    topbar(`${state.players[pIdx].name}'s turn`),
    promptCard,
    el("p", { className: "muted center", text: need === 2 ? "Tap two cards in the order they should appear." : "Tap a card to play it." }),
    handGrid,
    el("div", { className: "spacer" }),
    el("button", { className: "btn", text: ready ? "Lock in submission 🔒" : `Select ${need - state.selected.length} more`, disabled: !ready, onClick: submitCards })
  );
}

function toggleSelect(i, need) {
  const at = state.selected.indexOf(i);
  if (at !== -1) { state.selected.splice(at, 1); }
  else {
    if (state.selected.length >= need) {
      if (need === 1) state.selected = [i];
      else { toast(`Only pick ${need}.`); return; }
    } else state.selected.push(i);
  }
  renderSubmit();
}

function submitCards() {
  const pIdx = state.queue[state.qi];
  const hand = state.hands[pIdx];
  const cards = state.selected.map((i) => hand[i]);
  // Remove played cards from hand (highest index first) and discard them.
  state.selected.slice().sort((a, b) => b - a).forEach((i) => {
    state.discard.push(hand[i]);
    hand.splice(i, 1);
  });
  state.submissions.push({ player: pIdx, cards });
  state.qi++;
  if (state.qi >= state.queue.length) {
    state.order = shuffle(state.submissions.map((_, i) => i));
    state.phase = "czar-handoff";
  } else {
    state.phase = "handoff";
  }
  render();
}

/* ---------------- Czar handoff ---------------- */
function renderCzarHandoff() {
  mount(
    topbar(`Round ${state.round}`),
    el("div", { className: "handoff panel" }, [
      el("div", { className: "big-emoji", text: "👑" }),
      el("p", { className: "muted", text: "All cards are in. Pass the device to the Card Czar" }),
      el("div", { className: "who", text: czarName() }),
      el("div", { className: "spacer" }),
      el("button", { className: "btn", text: "Reveal the submissions →", onClick: () => { state.chosen = null; state.phase = "czar-pick"; render(); } }),
    ])
  );
}

/* ---------------- Czar pick ---------------- */
function renderCzarPick() {
  const list = el("div", { className: "submission-list" });
  state.order.forEach((subIdx, displayIdx) => {
    const sub = state.submissions[subIdx];
    const stack = el("div", { className: "stack" });
    // Show the prompt with this submission's answers filled in.
    stack.appendChild(el("div", { className: "play-card prompt" }, [
      fillPrompt(state.prompt.text, BLANK, sub.cards),
    ]));
    const wrap = el("div", {
      className: "submission" + (state.chosen === displayIdx ? " selected" : ""),
      onClick: () => { state.chosen = displayIdx; renderCzarPick(); },
    }, [ stack ]);
    list.appendChild(wrap);
  });

  const ready = state.chosen != null;
  mount(
    topbar(`${czarName()} chooses`),
    el("div", { className: "play-card prompt" }, [
      fillPrompt(state.prompt.text, BLANK, []),
      el("div", { className: "corner", text: "The prompt" }),
    ]),
    el("p", { className: "muted center", text: "Tap the funniest answer, then crown the winner." }),
    list,
    el("div", { className: "spacer" }),
    el("button", { className: "btn", text: "👑 Crown this winner", disabled: !ready, onClick: crownWinner })
  );
}

function crownWinner() {
  const subIdx = state.order[state.chosen];
  const sub = state.submissions[subIdx];
  state.players[sub.player].score++;
  state.winner = { player: sub.player, cards: sub.cards };
  state.phase = "result";
  render();
}

/* ---------------- Round result ---------------- */
function renderResult() {
  const w = state.winner;
  const winnerName = state.players[w.player].name;
  const reached = state.players[w.player].score >= state.target;

  mount(
    topbar(`Round ${state.round}`),
    el("div", { className: "panel center" }, [
      el("div", { className: "big-emoji", text: "🏆" }),
      el("h2", { text: `${winnerName} wins the round!` }),
      el("div", { className: "play-card prompt", style: "text-align:left" }, [
        fillPrompt(state.prompt.text, BLANK, w.cards),
      ]),
    ]),
    scoreboardEl(),
    el("div", { className: "spacer" }),
    reached
      ? el("button", { className: "btn", text: "See final results 🎉", onClick: () => { state.phase = "over"; render(); } })
      : el("button", { className: "btn", text: "Next round →", onClick: nextRound })
  );
}

function nextRound() {
  // Replenish submitters' hands back to full.
  state.queue.forEach((pIdx) => {
    const need = HAND_SIZE - state.hands[pIdx].length;
    if (need > 0) state.hands[pIdx].push(...drawCards(need));
  });
  state.czar = (state.czar + 1) % state.players.length;
  state.round++;
  state.submissions = [];
  state.selected = [];
  state.chosen = null;
  state.winner = null;
  dealPrompt();
  state.phase = "intro";
  render();
}

/* ---------------- Game over ---------------- */
function renderGameOver() {
  store.del(cfg.saveKey);
  const ranked = state.players.map((p) => p).sort((a, b) => b.score - a.score);
  const champ = ranked[0];

  mount(
    topbar("Game over"),
    el("div", { className: "panel center" }, [
      el("div", { className: "big-emoji", text: `${cfg.icon}👑` }),
      el("h2", { text: `${champ.name} is the ${cfg.winnerTitle}!` }),
      el("p", { className: "muted", text: `${champ.score} points` }),
    ]),
    finalBoard(ranked),
    el("div", { className: "spacer" }),
    el("button", { className: "btn", text: "Play again", onClick: () => beginGame(state.players.map((p) => p.name), state.target) }),
    el("div", { className: "spacer" }),
    el("button", { className: "btn ghost", text: "Back to lobby", onClick: goHome })
  );
}

function finalBoard(ranked) {
  const board = el("div", { className: "scoreboard" });
  ranked.forEach((p, i) => {
    board.appendChild(el("div", { className: "score-row" + (i === 0 ? " leader" : "") }, [
      el("span", { className: "nm", text: `${["🥇", "🥈", "🥉"][i] || "•"} ${p.name}` }),
      el("span", { className: "pts", text: String(p.score) }),
    ]));
  });
  return board;
}

/* ---------------- Scoreboard ---------------- */
function scoreboardEl() {
  const board = el("div", { className: "scoreboard" });
  state.players.forEach((p, i) => {
    const isLeader = p.score === Math.max(...state.players.map((x) => x.score)) && p.score > 0;
    board.appendChild(el("div", { className: "score-row" + (isLeader ? " leader" : "") }, [
      el("span", { className: "nm" }, [
        document.createTextNode(p.name),
        i === state.czar ? el("span", { className: "pill czar-pill", text: "👑" }) : null,
      ]),
      el("span", { className: "pts", text: `${p.score}/${state.target}` }),
    ]));
  });
  return el("div", { className: "panel" }, [el("label", { text: "Scores" }), board]);
}
