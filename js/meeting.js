// Emergency Meeting — pass-and-play "who's most likely / who's the most sus" voting game.
import { el, mount, shuffle, toast, store } from "./ui.js";
import { icons } from "./icons.js";

let goHome = () => {};
let s = null;
let cfg = null;

export function makeGame(config) {
  return function start(home) {
    cfg = config;
    document.body.classList.add("spaceship-theme");
    goHome = () => {
      document.body.classList.remove("spaceship-theme");
      home();
    };
    renderSetup();
  };
}

function topbar(title) {
  return el("div", { className: "topbar spaceship-header" }, [
    el("button", { className: "back", text: "‹ Lobby", onClick: goHome }),
    el("div", { className: "title", text: title }),
    el("span", { style: "width:64px" }),
  ]);
}

/* ---------------- Setup ---------------- */
function renderSetup() {
  const saved = store.get(cfg.saveKey + ".names", ["", "", ""]);
  let names = saved.length >= 3 ? saved.slice() : ["", "", ""];
  const listWrap = el("div", { id: "mlist" });

  function draw() {
    listWrap.innerHTML = "";
    names.forEach((nm, i) => {
      listWrap.appendChild(el("div", { className: "player-row crew-input" }, [
        el("input", {
          type: "text", value: nm, maxlength: "16", placeholder: `Crewmate ${i + 1}`,
          onInput: (e) => { names[i] = e.target.value; },
        }),
        el("button", {
          className: "icon-btn", text: "✕",
          onClick: () => { if (names.length > 3) { names.splice(i, 1); draw(); } else toast("Need at least 3 crewmates."); },
        }),
      ]));
    });
  }
  draw();

  mount(
    topbar("Most Likely To"),
    el("div", { className: "sci-fi-panel center" }, [
      el("p", { className: "muted", html: "Each round, read a prompt and vote on which player it describes the most. Pass the device around to vote secretly — the most-voted player is revealed!" }),
    ]),
    el("div", { className: "sci-fi-panel" }, [
      el("label", { text: "PLAYERS (3+)" }),
      listWrap,
      el("button", { className: "btn ghost small", style: "margin-top:10px;", text: "+ Add Player", onClick: () => { if (names.length < 15) { names.push(""); draw(); } else toast("15 max."); } }),
    ]),
    el("button", { className: "btn danger-btn pulsing", text: "START GAME", onClick: () => begin(names) })
  );
}

function begin(raw) {
  const players = raw.map((n) => n.trim()).filter(Boolean);
  if (players.length < 3) { toast("Add at least 3 crewmates."); return; }
  if (new Set(players.map((p) => p.toLowerCase())).size !== players.length) { toast("Names must be unique."); return; }
  store.set(cfg.saveKey + ".names", players);
  s = {
    players: players.map((name) => ({ name, sus: 0 })),
    deck: shuffle(cfg.source),
    pos: 0,
    round: 1,
    votes: [],     // votes[voterIdx] = targetIdx
    vi: 0,
    phase: "prompt",
    ejected: [],
  };
  render();
}

function render() {
  switch (s.phase) {
    case "prompt": return renderPrompt();
    case "handoff": return renderHandoff();
    case "vote": return renderVote();
    case "reveal": return renderReveal();
    case "over": return renderOver();
  }
}

function prompt() { return s.deck[s.pos % s.deck.length]; }

/* ---------------- Prompt ---------------- */
function renderPrompt() {
  mount(
    topbar(`Round ${s.round}`),
    el("div", { className: "sci-fi-panel center" }, [
      el("span", { className: "pill sci-fi-badge", text: "SUSPECT IDENTIFICATION" }),
      el("div", { className: "play-card prompt sci-fi-card", style: "margin-top:14px; font-size:1.3rem; min-height:150px; justify-content:center; text-align:center;" }, [
        el("span", { text: prompt() }),
      ]),
    ]),
    el("p", { className: "muted center", text: "Identify the suspect. Read aloud, then pass around to vote secretly." }),
    el("div", { className: "spacer" }),
    el("button", { className: "btn", text: "INITIATE VOTING PROTOCOL", onClick: () => { s.votes = []; s.vi = 0; s.phase = "handoff"; render(); } }),
    susBoard()
  );
}

/* ---------------- Voting handoff ---------------- */
function renderHandoff() {
  const voter = s.players[s.vi].name;
  mount(
    topbar(`Round ${s.round}`),
    el("div", { className: "handoff sci-fi-panel center" }, [
      el("div", { className: "big-icon sci-fi-pulse", style: "width:64px; height:64px; margin: 0 auto 12px; color: var(--sunset-soft);" }, [icons.eyeOff()]),
      el("p", { className: "muted", text: "Secret ballot — pass terminal to:" }),
      el("div", { className: "who", style: "font-size:2rem; font-weight:700; color:var(--cream); margin: 8px 0;", text: voter }),
      el("p", { className: "muted", text: `${s.vi + 1} of ${s.players.length} transmissions logged` }),
      el("div", { className: "spacer" }),
      el("button", { className: "btn pulsing", text: `I am ${voter} — Access Terminal`, onClick: () => { s.phase = "vote"; render(); } }),
    ])
  );
}

/* ---------------- Vote ---------------- */
function renderVote() {
  const voterIdx = s.vi;
  const grid = el("div", { className: "menu" });
  s.players.forEach((p, i) => {
    if (i === voterIdx) return; // can't vote for yourself
    grid.appendChild(el("button", { className: "tile sci-fi-tile", onClick: () => castVote(i) }, [
      el("div", { className: "icon", style: "width:36px; height:36px; color:var(--cream);" }, [icons.truths()]),
      el("div", { className: "meta" }, [el("h3", { text: p.name })]),
    ]));
  });
  mount(
    topbar(`${s.players[voterIdx].name} votes`),
    el("div", { className: "sci-fi-panel center" }, [
      el("p", { className: "muted", text: "WHO IS MOST LIKELY TO:" }),
      el("div", { className: "play-card prompt sci-fi-card", style: "font-size:1.05rem; min-height:90px; justify-content:center; text-align:center;" }, [
        el("span", { text: prompt() }),
      ]),
    ]),
    el("p", { className: "muted center", text: "LOG TRANSMISSION FOR TARGET SUSPECT:" }),
    grid
  );
}

function castVote(targetIdx) {
  s.votes[s.vi] = targetIdx;
  s.vi++;
  if (s.vi >= s.players.length) tallyVotes();
  else s.phase = "handoff";
  render();
}

function tallyVotes() {
  const counts = s.players.map(() => 0);
  s.votes.forEach((t) => { if (t != null) counts[t]++; });
  const max = Math.max(...counts);
  s.ejected = counts.map((c, i) => (c === max && max > 0 ? i : -1)).filter((i) => i >= 0);
  s.counts = counts;
  s.ejected.forEach((i) => s.players[i].sus++);
  s.phase = "reveal";
}

/* ---------------- Reveal ---------------- */
function renderReveal() {
  const names = s.ejected.map((i) => s.players[i].name);
  const tie = s.ejected.length > 1;
  const verdict = tie
    ? `${names.join(" & ")} are equally suspicious. No ejections made.`
    : `${names[0]} was ejected. ${flavor()}`;

  const tallies = el("div", { className: "scoreboard" });
  s.players
    .map((p, i) => ({ p, c: s.counts[i], ej: s.ejected.includes(i) }))
    .sort((a, b) => b.c - a.c)
    .forEach(({ p, c, ej }) => {
      tallies.appendChild(el("div", { className: "score-row" + (ej ? " leader" : "") }, [
        el("span", { className: "nm", text: `${ej ? "🛟 " : ""}${p.name}` }),
        el("span", { className: "pts", text: `${c} vote${c === 1 ? "" : "s"}` }),
      ]));
    });

  mount(
    topbar(`Round ${s.round}`),
    el("div", { className: "sci-fi-panel center" }, [
      el("div", { style: "width:64px; height:64px; margin:0 auto 12px; color: " + (tie ? "var(--sunset-soft);" : "red;") }, [
        tie ? icons.shield() : icons.warning()
      ]),
      el("h2", { text: tie ? "Suspect Standoff!" : `${names[0]} Ejected.` }),
      el("p", { className: "muted", text: verdict }),
    ]),
    el("div", { className: "sci-fi-panel" }, [el("label", { text: "ROUND VOTE TALLIES" }), tallies]),
    el("div", { className: "spacer" }),
    el("button", { className: "btn", text: "CONTINUE MISSION →", onClick: nextRound }),
    el("div", { className: "spacer" }),
    el("button", { className: "btn ghost", text: "END MISSION & REVIEW SUSPECT REPORT", onClick: () => { s.phase = "over"; render(); } })
  );
}

const FLAVORS = [
  "Into the deep vacuum of space.",
  "The vote margin was absolute.",
  "The transmissions have spoken.",
  "Certified high-risk anomaly detected.",
  "0.5 suspicious entities remaining...",
  "Honestly? Deserved.",
  "The diagnostics were clear. The verdict, absolute.",
];
function flavor() { return FLAVORS[Math.floor(Math.random() * FLAVORS.length)]; }

function nextRound() {
  s.pos++;
  s.round++;
  s.votes = [];
  s.vi = 0;
  s.ejected = [];
  s.phase = "prompt";
  render();
}

/* ---------------- Game over ---------------- */
function renderOver() {
  const ranked = s.players.slice().sort((a, b) => b.sus - a.sus);
  const champ = ranked[0];
  const board = el("div", { className: "scoreboard" });
  ranked.forEach((p, i) => {
    board.appendChild(el("div", { className: "score-row" + (i === 0 ? " leader" : "") }, [
      el("span", { className: "nm", text: `${i === 0 ? "★ " : "• "}${p.name}` }),
      el("span", { className: "pts", text: `${p.sus} sus` }),
    ]));
  });
  mount(
    topbar("Report Logged"),
    el("div", { className: "sci-fi-panel center" }, [
      el("div", { style: "width:64px; height:64px; margin:0 auto 12px; color:var(--sunset-soft);" }, [icons.warning()]),
      el("h2", { text: champ.sus > 0 ? `${champ.name} Identified as Suspect Leader!` : "No anomalies detected." }),
      el("p", { className: "muted", text: champ.sus > 0 ? `Ejected ${champ.sus} time${champ.sus === 1 ? "" : "s"}.` : "A completely verified clean crew." }),
    ]),
    el("div", { className: "sci-fi-panel" }, [el("label", { text: "FINAL SUS-O-METER" }), board]),
    el("div", { className: "spacer" }),
    el("button", { className: "btn", text: "RE-INITIATE VOYAGE", onClick: () => begin(s.players.map((p) => p.name)) }),
    el("div", { className: "spacer" }),
    el("button", { className: "btn ghost", text: "RETURN TO MAIN TERMINAL", onClick: goHome })
  );
}

/* ---------------- Sus board ---------------- */
function susBoard() {
  if (s.round === 1) return null;
  const board = el("div", { className: "scoreboard" });
  s.players.slice().sort((a, b) => b.sus - a.sus).forEach((p) => {
    board.appendChild(el("div", { className: "score-row" }, [
      el("span", { className: "nm", text: p.name }),
      el("span", { className: "pts", text: `${p.sus} sus` }),
    ]));
  });
  return el("div", { className: "sci-fi-panel" }, [el("label", { text: "SUSPECT REPORT PROGRESS" }), board]);
}
