// Emergency Meeting — pass-and-play "who's most likely / who's the most sus" voting game.
import { el, mount, shuffle, toast, store } from "./ui.js";
import { MOST_LIKELY } from "./data.js";

const NAMES_KEY = "meeting.names.v1";
let goHome = () => {};
let s = null;

export function start(home) {
  goHome = home;
  renderSetup();
}

function topbar(title) {
  return el("div", { className: "topbar" }, [
    el("button", { className: "back", text: "‹ Lobby", onClick: goHome }),
    el("div", { className: "title", text: title }),
    el("span", { style: "width:64px" }),
  ]);
}

/* ---------------- Setup ---------------- */
function renderSetup() {
  const saved = store.get(NAMES_KEY, ["", "", ""]);
  let names = saved.length >= 3 ? saved.slice() : ["", "", ""];
  const listWrap = el("div", { id: "mlist" });

  function draw() {
    listWrap.innerHTML = "";
    names.forEach((nm, i) => {
      listWrap.appendChild(el("div", { className: "player-row" }, [
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
    topbar("Emergency Meeting"),
    el("div", { className: "panel" }, [
      el("p", { className: "muted", html: "🚨 Someone's acting sus. Each round, the group gets a <b>“who's most likely to…”</b> prompt. Everyone secretly votes (pass the device around), then the most-voted crewmate gets <b>ejected</b>. Rack up the most votes and you're crowned the sussiest baka alive." }),
    ]),
    el("div", { className: "panel" }, [
      el("label", { text: "Crewmates (3+)" }),
      listWrap,
      el("button", { className: "btn ghost small", text: "+ Add crewmate", onClick: () => { if (names.length < 15) { names.push(""); draw(); } else toast("15 max."); } }),
    ]),
    el("button", { className: "btn", text: "Call the meeting 🚨", onClick: () => begin(names) })
  );
}

function begin(raw) {
  const players = raw.map((n) => n.trim()).filter(Boolean);
  if (players.length < 3) { toast("Add at least 3 crewmates."); return; }
  if (new Set(players.map((p) => p.toLowerCase())).size !== players.length) { toast("Names must be unique."); return; }
  store.set(NAMES_KEY, players);
  s = {
    players: players.map((name) => ({ name, sus: 0 })),
    deck: shuffle(MOST_LIKELY),
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
    el("div", { className: "panel center" }, [
      el("span", { className: "pill", text: "🚨 Who is most likely to…" }),
      el("div", { className: "play-card prompt", style: "margin-top:14px; font-size:1.3rem; min-height:150px; justify-content:center; text-align:center;" }, [
        el("span", { text: prompt() }),
      ]),
    ]),
    el("p", { className: "muted center", text: "Read it aloud, then pass around to vote secretly." }),
    el("div", { className: "spacer" }),
    el("button", { className: "btn", text: "Start voting 🗳️", onClick: () => { s.votes = []; s.vi = 0; s.phase = "handoff"; render(); } }),
    susBoard()
  );
}

/* ---------------- Voting handoff ---------------- */
function renderHandoff() {
  const voter = s.players[s.vi].name;
  mount(
    topbar(`Round ${s.round}`),
    el("div", { className: "handoff panel" }, [
      el("div", { className: "big-emoji", text: "🤫" }),
      el("p", { className: "muted", text: "Secret vote — pass the device to" }),
      el("div", { className: "who", text: voter }),
      el("p", { className: "muted", text: `${s.vi + 1} of ${s.players.length} votes` }),
      el("div", { className: "spacer" }),
      el("button", { className: "btn", text: `I'm ${voter} — let me vote`, onClick: () => { s.phase = "vote"; render(); } }),
    ])
  );
}

/* ---------------- Vote ---------------- */
function renderVote() {
  const voterIdx = s.vi;
  const grid = el("div", { className: "menu" });
  s.players.forEach((p, i) => {
    if (i === voterIdx) return; // can't vote for yourself
    grid.appendChild(el("button", { className: "tile", onClick: () => castVote(i) }, [
      el("div", { className: "icon", text: "👤" }),
      el("div", { className: "meta" }, [el("h3", { text: p.name })]),
    ]));
  });
  mount(
    topbar(`${s.players[voterIdx].name} votes`),
    el("div", { className: "panel center" }, [
      el("p", { className: "muted", text: "Who is most likely to…" }),
      el("div", { className: "play-card prompt", style: "font-size:1.05rem; min-height:90px; justify-content:center; text-align:center;" }, [
        el("span", { text: prompt() }),
      ]),
    ]),
    el("p", { className: "muted center", text: "Tap the sussiest crewmate:" }),
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
    ? `${names.join(" & ")} are equally sus. Nobody was ejected. 🌚`
    : `${names[0]} was ejected. ${flavor()}`;

  const tallies = el("div", { className: "scoreboard" });
  s.players
    .map((p, i) => ({ p, c: s.counts[i], ej: s.ejected.includes(i) }))
    .sort((a, b) => b.c - a.c)
    .forEach(({ p, c, ej }) => {
      tallies.appendChild(el("div", { className: "score-row" + (ej ? " leader" : "") }, [
        el("span", { className: "nm", text: `${ej ? "🚪 " : ""}${p.name}` }),
        el("span", { className: "pts", text: `${c} vote${c === 1 ? "" : "s"}` }),
      ]));
    });

  mount(
    topbar(`Round ${s.round}`),
    el("div", { className: "panel center" }, [
      el("div", { className: "big-emoji", text: tie ? "🤝" : "🚪🚀" }),
      el("h2", { text: tie ? "It's a sus standoff!" : `${names[0]}, you're sus.` }),
      el("p", { className: "muted", text: verdict }),
    ]),
    el("div", { className: "panel" }, [el("label", { text: "This round's votes" }), tallies]),
    el("div", { className: "spacer" }),
    el("button", { className: "btn", text: "Next prompt →", onClick: nextRound }),
    el("div", { className: "spacer" }),
    el("button", { className: "btn ghost", text: "End meeting & crown the baka", onClick: () => { s.phase = "over"; render(); } })
  );
}

const FLAVORS = [
  "Out the airlock you go. 🌌",
  "It was NOT close.",
  "The group has spoken. Stay zesty.",
  "Certified sussy baka behavior.",
  "0.5 impostors remaining...",
  "Honestly? Deserved.",
  "The vibes were immaculate. The verdict, less so.",
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
      el("span", { className: "nm", text: `${["👑", "🥈", "🥉"][i] || "•"} ${p.name}` }),
      el("span", { className: "pts", text: `${p.sus} sus` }),
    ]));
  });
  mount(
    topbar("Meeting adjourned"),
    el("div", { className: "panel center" }, [
      el("div", { className: "big-emoji", text: "🚨👑" }),
      el("h2", { text: champ.sus > 0 ? `${champ.name} is the Sussiest Baka Alive!` : "Somehow, nobody was sus." }),
      el("p", { className: "muted", text: champ.sus > 0 ? `Ejected ${champ.sus} time${champ.sus === 1 ? "" : "s"}.` : "A suspiciously clean crew." }),
    ]),
    el("div", { className: "panel" }, [el("label", { text: "Sus-o-meter" }), board]),
    el("div", { className: "spacer" }),
    el("button", { className: "btn", text: "Run it back", onClick: () => begin(s.players.map((p) => p.name)) }),
    el("div", { className: "spacer" }),
    el("button", { className: "btn ghost", text: "Back to lobby", onClick: goHome })
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
  return el("div", { className: "panel" }, [el("label", { text: "Sus-o-meter" }), board]);
}
