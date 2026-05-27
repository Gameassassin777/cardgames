// Modular Quiplash local pass-and-play game engine.
import { el, mount, toast, store, shuffle } from "../ui.js";
import { icons } from "../icons.js";

let goHome = () => {};

const PROMPTS = [
  "The worst thing to find floating in the lake",
  "A terrible name for a boat",
  "Something you shouldn't bring to a camping trip",
  "What mosquitoes discuss when they swarm you",
  "The most awkward thing to say while sharing a cozy tent",
  "A funny warning sign to install on the lake dock",
  "The real reason the cabin has no Wi-Fi",
  "The absolute worst flavor of toasted marshmallow",
  "A name for a fish that is definitely lying to you",
  "A terrible chore to be assigned at the lake house",
  "What the bear is thinking when it looks in your cabin window",
  "A cheesy pick-up line for a park ranger",
  "The best thing to use as a paddle when you lose yours",
  "Something you don't want to hear from your canoe partner",
  "The title of a horror movie set at a cozy lake cabin",
  "A ridiculous rule to add to cabin board games",
  "The worst excuse for why you didn't catch any fish",
  "What actually happens at 2 AM in the cabin loft",
  "A funny name for a squirrel gang",
  "The secret ingredient in the campfire stew",
  "Something you shouldn't wear to go swimming in the lake",
  "The worst thing to hear from the woods at night",
  "A warning label that should be on a can of bug spray",
  "A funny name for a lake monster",
  "The worst way to wake up someone in a sleeping bag",
  "A bad topic for a campfire ghost story",
  "What sunscreen smells like to a sunburned person",
  "The most useless item to bring on a wilderness hike",
  "A strange thing to find inside a hollow log",
  "The real reason they call it 'roughing it'"
];

function gameTopbar(title, onBack) {
  return el("div", { className: "topbar" }, [
    el("button", { className: "back", onClick: onBack }, [
      el("span", { style: "width:16px; height:16px; display:inline-block;" }, [icons.back()]),
      el("span", { text: "Lobby" })
    ]),
    el("div", { className: "title", text: title }),
    el("span", { style: "width:64px" })
  ]);
}

export function start(home) {
  goHome = home;
  renderSetup();
}

function renderSetup() {
  const savedNames = store.get("quiplash.names", ["Alice", "Bob", "Charlie"]);
  let names = savedNames.slice();

  const listWrap = el("div", { id: "quipPlayerList", style: "margin: 16px 0;" });

  function drawList() {
    listWrap.innerHTML = "";
    names.forEach((nm, i) => {
      const input = el("input", {
        type: "text",
        value: nm,
        maxlength: "14",
        placeholder: `Player ${i + 1}`,
        onInput: (e) => { names[i] = e.target.value; }
      });
      const row = el("div", { className: "player-row", style: "margin-bottom: 8px;" }, [
        input,
        el("button", {
          className: "icon-btn",
          text: "✕",
          onClick: () => {
            if (names.length > 3) {
              names.splice(i, 1);
              drawList();
            } else {
              toast("Quiplash needs at least 3 players.");
            }
          }
        })
      ]);
      listWrap.appendChild(row);
    });
  }

  const addBtn = el("button", {
    className: "btn ghost small",
    text: "+ Add Player",
    onClick: () => {
      if (names.length < 8) {
        names.push(`Player ${names.length + 1}`);
        drawList();
      } else {
        toast("Max 8 players for local pass-and-play.");
      }
    }
  });

  const startBtn = el("button", {
    className: "btn",
    text: "Start Quiplash",
    onClick: () => {
      const cleaned = names.map(n => n.trim() || "Player").slice(0, 8);
      if (cleaned.length < 3) {
        toast("Quiplash needs at least 3 players.");
        return;
      }
      store.set("quiplash.names", cleaned);
      initGame(cleaned);
    }
  });

  drawList();

  mount(
    gameTopbar("Quiplash local", goHome),
    el("div", { className: "panel center", style: "max-width: 480px; margin: 0 auto;" }, [
      el("div", { style: "width:64px; height:64px; margin:0 auto 12px; color:var(--sunset-soft);" }, [icons.meeting()]),
      el("h2", { text: "Quiplash Setup" }),
      el("p", { className: "muted", text: "Write hilarious answers to prompts. Other players vote on the funniest combination. 3 to 8 players. Pass the device secretly during writing." }),
      listWrap,
      addBtn,
      el("div", { className: "spacer" }),
      startBtn
    ])
  );
}

function initGame(players) {
  const shuffledPrompts = shuffle(PROMPTS);
  const scores = {};
  players.forEach(p => { scores[p] = 0; });

  const state = {
    players,
    scores,
    promptsPool: shuffledPrompts,
    round: 1, // Round 1, Round 2 (double points), Round 3 (Last Lash)
    // active entries
    writingQueue: [], // list of { player, promptIndex, promptText, finished: false, answer: "" }
    votingQueue: [], // list of { promptText, p1, p2, ans1, ans2, votes: { pName: 1 or 2 } }
    roundAnswers: {}, // prompts mapped to player answers
  };

  startRoundWriting(state);
}

// ── Writing Phase ─────────────────────────────────────────────────────────────
function startRoundWriting(state) {
  // Reset per-round writing & voting queues
  state.writingQueue = [];
  state.votingQueue = [];

  const N = state.players.length;

  if (state.round < 3) {
    // Standard Quiplash distribution:
    // N players, N prompts.
    // Prompt i is answered by Player i and Player (i + 1) % N.
    const roundPrompts = [];
    for (let i = 0; i < N; i++) {
      roundPrompts.push(state.promptsPool.pop() || "A funny prompt.");
    }

    for (let i = 0; i < N; i++) {
      const p1 = state.players[i];
      const p2 = state.players[(i + 1) % N];
      const promptText = roundPrompts[i];

      state.writingQueue.push({ player: p1, promptIdx: i, promptText, answer: "" });
      state.writingQueue.push({ player: p2, promptIdx: i, promptText, answer: "" });
    }
  } else {
    // Round 3: The Last Lash. One single prompt for EVERY player.
    const lastLashPrompt = state.promptsPool.pop() || "The ultimate final prompt.";
    state.players.forEach(p => {
      state.writingQueue.push({ player: p, promptIdx: 0, promptText: lastLashPrompt, answer: "" });
    });
  }

  // Shuffle writing tasks so players don't write them in standard order
  state.writingQueue = shuffle(state.writingQueue);
  processNextWritingTask(state);
}

function processNextWritingTask(state) {
  const nextTask = state.writingQueue.find(t => !t.answer);

  if (!nextTask) {
    // Writing is complete! Let's prepare the voting queue.
    prepareVotingQueue(state);
    return;
  }

  // Show "Pass the device to [Player Name]" screen to preserve secret writing.
  const container = el("div", { className: "panel center", style: "max-width: 480px; margin: 30px auto; padding: 24px;" }, [
    el("h2", { text: `Pass the Device!` }),
    el("p", { className: "muted", style: "font-size: 1.1rem; margin: 20px 0;", html: `Hand the phone secretly to <strong style="color:var(--sunset-soft); font-size: 1.3rem;">${nextTask.player}</strong>.` }),
    el("button", {
      className: "btn",
      text: "I am ready to write",
      onClick: () => renderWritingInput(state, nextTask)
    })
  ]);

  mount(gameTopbar(`Quiplash — Round ${state.round}`, () => confirmQuit(state)), container);
}

function renderWritingInput(state, task) {
  const inputEl = el("input", {
    type: "text",
    placeholder: "Type your funny answer...",
    maxlength: "60",
    style: "font-size: 1.2rem; border-radius: 14px; text-align: center; margin: 16px 0; width: 100%;"
  });

  const submitBtn = el("button", {
    className: "btn",
    text: "Submit Answer",
    onClick: () => {
      const ans = inputEl.value.trim();
      if (!ans) {
        toast("Please write something funny!");
        return;
      }
      task.answer = ans;
      processNextWritingTask(state);
    }
  });

  const layout = el("div", { className: "panel center", style: "max-width: 480px; margin: 0 auto;" }, [
    el("h3", { text: `${task.player}'s Secret Turn`, style: "color:var(--sunset-soft); font-size: 0.9rem;" }),
    el("div", { className: "spacer" }),
    el("blockquote", { text: `"${task.promptText}"`, style: "font-size: 1.4rem; font-weight: bold; border-left: none; padding: 0; line-height: 1.4; margin: 12px 0;" }),
    inputEl,
    el("div", { className: "spacer" }),
    submitBtn
  ]);

  mount(gameTopbar(`Quiplash — Round ${state.round}`, () => confirmQuit(state)), layout);
  inputEl.focus();
}

// ── Voting Phase Setup ────────────────────────────────────────────────────────
function prepareVotingQueue(state) {
  if (state.round < 3) {
    const N = state.players.length;
    // We had N prompts.
    // For each prompt, we find the two tasks matching its index.
    for (let i = 0; i < N; i++) {
      const tasks = state.writingQueue.filter(t => t.promptIdx === i);
      if (tasks.length === 2) {
        state.votingQueue.push({
          promptText: tasks[0].promptText,
          p1: tasks[0].player,
          p2: tasks[1].player,
          ans1: tasks[0].answer,
          ans2: tasks[1].answer,
          votes: {} // player_name -> 1 or 2
        });
      }
    }
  } else {
    // Round 3: One prompt, all answers.
    // For voting, we compare answers in pairs or let players vote on all of them.
    // Let's make it a massive single screen listing ALL answers anonymously!
    // Players can vote on their single favorite.
    const tasks = state.writingQueue; // list of all player tasks
    state.votingQueue = [{
      promptText: tasks[0].promptText,
      answers: tasks.map(t => ({ player: t.player, answer: t.answer })),
      votes: {} // player_name -> index of answers array
    }];
  }

  // Shuffle voting rounds for standard matches
  state.votingQueue = shuffle(state.votingQueue);
  processNextVotingRound(state, 0);
}

// ── Voting Execution ──────────────────────────────────────────────────────────
function processNextVotingRound(state, idx) {
  if (idx >= state.votingQueue.length) {
    // Voting complete! Show Round Leaderboard
    renderRoundLeaderboard(state);
    return;
  }

  const voteItem = state.votingQueue[idx];

  if (state.round < 3) {
    renderStandardVoteScreen(state, voteItem, idx);
  } else {
    renderLastLashVoteScreen(state, voteItem, idx);
  }
}

function renderStandardVoteScreen(state, item, idx) {
  // Players who are NOT item.p1 and NOT item.p2 can vote
  const voters = state.players.filter(p => p !== item.p1 && p !== item.p2);

  // Layout components
  const voterGrid = el("div", { style: "margin: 20px 0; display: flex; flex-direction: column; gap: 8px;" });

  // Render a voting row for each eligible player
  const activeVotes = {}; // voterName -> 1 or 2
  voters.forEach(vName => {
    activeVotes[vName] = null;
  });

  function updateVoterRows() {
    voterGrid.innerHTML = "";
    voters.forEach(vName => {
      const voteVal = activeVotes[vName];
      const row = el("div", {
        style: "display: flex; justify-content: space-between; align-items: center; padding: 8px 16px; background: rgba(255,255,255,0.02); border-radius: 10px; border: 1px solid rgba(255,255,255,0.05);"
      }, [
        el("span", { text: vName, style: "font-weight: 500;" }),
        el("div", { style: "display: flex; gap: 8px;" }, [
          el("button", {
            className: voteVal === 1 ? "btn small" : "btn ghost small",
            text: "Left",
            style: "padding: 4px 14px; margin:0;",
            onClick: () => { activeVotes[vName] = 1; updateVoterRows(); checkSubmittable(); }
          }),
          el("button", {
            className: voteVal === 2 ? "btn small" : "btn ghost small",
            text: "Right",
            style: "padding: 4px 14px; margin:0;",
            onClick: () => { activeVotes[vName] = 2; updateVoterRows(); checkSubmittable(); }
          })
        ])
      ]);
      voterGrid.appendChild(row);
    });
  }

  const submitBtn = el("button", {
    className: "btn",
    text: "Submit & Reveal",
    disabled: true,
    onClick: () => {
      // Calculate scores
      let count1 = 0;
      let count2 = 0;
      voters.forEach(v => {
        if (activeVotes[v] === 1) count1++;
        if (activeVotes[v] === 2) count2++;
      });

      // points
      const multiplier = state.round === 2 ? 200 : 100;
      const pts1 = count1 * multiplier;
      const pts2 = count2 * multiplier;

      // Quiplash Bonus! If a player gets 100% of the votes
      let q1 = false, q2 = false;
      if (count1 > 0 && count2 === 0) {
        q1 = true;
      }
      if (count2 > 0 && count1 === 0) {
        q2 = true;
      }

      state.scores[item.p1] += pts1 + (q1 ? 150 : 0);
      state.scores[item.p2] += pts2 + (q2 ? 150 : 0);

      // Reveal Phase!
      renderStandardReveal(state, item, idx, count1, count2, pts1, pts2, q1, q2);
    }
  });

  function checkSubmittable() {
    const allVoted = voters.every(v => activeVotes[v] !== null);
    submitBtn.disabled = !allVoted;
  }

  updateVoterRows();

  const screen = el("div", { className: "panel center", style: "max-width: 600px; margin: 0 auto;" }, [
    el("blockquote", { text: `"${item.promptText}"`, style: "font-size: 1.4rem; font-weight: bold; padding: 0; border: none; margin-bottom: 24px;" }),
    el("div", { style: "display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;" }, [
      el("div", {
        className: "panel center",
        style: "background: rgba(255, 145, 100, 0.03); border: 1px solid rgba(255,145,100,0.1); border-radius: 12px; padding: 16px;"
      }, [
        el("div", { text: "Option A", style: "font-size: 0.75rem; text-transform: uppercase; color: var(--sunset-soft); margin-bottom: 8px;" }),
        el("div", { text: item.ans1, style: "font-size: 1.25rem; font-weight: bold;" })
      ]),
      el("div", {
        className: "panel center",
        style: "background: rgba(255, 145, 100, 0.03); border: 1px solid rgba(255,145,100,0.1); border-radius: 12px; padding: 16px;"
      }, [
        el("div", { text: "Option B", style: "font-size: 0.75rem; text-transform: uppercase; color: var(--sunset-soft); margin-bottom: 8px;" }),
        el("div", { text: item.ans2, style: "font-size: 1.25rem; font-weight: bold;" })
      ])
    ]),
    el("h4", { text: "Cast Votes (all other players)", style: "font-size: 0.9rem; letter-spacing: 0.5px;" }),
    voterGrid,
    submitBtn
  ]);

  mount(gameTopbar(`Quiplash — Voting`, () => confirmQuit(state)), screen);
}

function renderStandardReveal(state, item, idx, c1, c2, pts1, pts2, q1, q2) {
  const container = el("div", { className: "panel center", style: "max-width: 600px; margin: 0 auto; text-align: center;" }, [
    el("blockquote", { text: `"${item.promptText}"`, style: "font-size: 1.3rem; border: none; padding: 0; font-weight: bold; margin-bottom: 24px;" }),
    
    // Side by side reveals
    el("div", { style: "display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;" }, [
      el("div", {
        className: "panel center",
        style: `border: 2px solid ${c1 >= c2 ? "var(--sunset-soft)" : "rgba(255,255,255,0.05)"}; background: rgba(255,255,255,0.01); border-radius: 12px; padding: 16px;`
      }, [
        el("h3", { text: item.ans1, style: "font-size: 1.3rem; font-weight: bold; margin-top: 0;" }),
        el("div", { text: `By ${item.p1}`, style: "font-weight: 500; font-size: 0.9rem; color: var(--sunset-soft);" }),
        el("div", { text: `${c1} ${c1 === 1 ? 'vote' : 'votes'} (+${pts1} pts)`, style: "font-size: 0.85rem; margin-top: 4px; font-weight: bold;" }),
        q1 ? el("div", { text: "QUIPLASH BONUS (+150 pts)", style: "font-size: 0.7rem; font-weight: bold; color: #00ffaa; margin-top: 6px; letter-spacing: 0.5px;" }) : null
      ]),
      el("div", {
        className: "panel center",
        style: `border: 2px solid ${c2 >= c1 ? "var(--sunset-soft)" : "rgba(255,255,255,0.05)"}; background: rgba(255,255,255,0.01); border-radius: 12px; padding: 16px;`
      }, [
        el("h3", { text: item.ans2, style: "font-size: 1.3rem; font-weight: bold; margin-top: 0;" }),
        el("div", { text: `By ${item.p2}`, style: "font-weight: 500; font-size: 0.9rem; color: var(--sunset-soft);" }),
        el("div", { text: `${c2} ${c2 === 1 ? 'vote' : 'votes'} (+${pts2} pts)`, style: "font-size: 0.85rem; margin-top: 4px; font-weight: bold;" }),
        q2 ? el("div", { text: "QUIPLASH BONUS (+150 pts)", style: "font-size: 0.7rem; font-weight: bold; color: #00ffaa; margin-top: 6px; letter-spacing: 0.5px;" }) : null
      ])
    ]),

    el("button", {
      className: "btn",
      text: "Next Prompt",
      onClick: () => processNextVotingRound(state, idx + 1)
    })
  ]);

  mount(gameTopbar(`Quiplash — Reveal`, () => confirmQuit(state)), container);
}

function renderLastLashVoteScreen(state, item, idx) {
  // Last Lash! Everyone voted for one prompt.
  // Display all answers anonymously.
  // Each voter chooses their favorite (cannot vote for their own).
  const voterGrid = el("div", { style: "margin: 20px 0; display: flex; flex-direction: column; gap: 8px;" });

  const activeVotes = {}; // voterName -> index of answer chosen
  state.players.forEach(p => {
    activeVotes[p] = null;
  });

  function updateVoterRows() {
    voterGrid.innerHTML = "";
    state.players.forEach(pName => {
      // Find what answers this player can vote for (all except their own)
      const allowedOptions = item.answers
        .map((ansObj, aIdx) => ({ ansObj, aIdx }))
        .filter(entry => entry.ansObj.player !== pName);

      const selectOptions = [el("option", { value: "", text: "Choose an answer..." })];
      allowedOptions.forEach(opt => {
        selectOptions.push(el("option", { value: String(opt.aIdx), text: `"${opt.ansObj.answer}"` }));
      });

      const select = el("select", {
        style: "max-width: 260px; font-size: 0.85rem; border-radius: 8px;",
        onChange: (e) => {
          activeVotes[pName] = e.target.value === "" ? null : parseInt(e.target.value, 10);
          checkSubmittable();
        }
      }, selectOptions);

      if (activeVotes[pName] !== null) {
        select.value = String(activeVotes[pName]);
      }

      const row = el("div", {
        style: "display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; background: rgba(255,255,255,0.02); border-radius: 10px; border: 1px solid rgba(255,255,255,0.05);"
      }, [
        el("span", { text: pName, style: "font-weight: 500;" }),
        select
      ]);

      voterGrid.appendChild(row);
    });
  }

  const submitBtn = el("button", {
    className: "btn",
    text: "Reveal Last Lash",
    disabled: true,
    onClick: () => {
      // Tally up votes
      const answerVoteCounts = item.answers.map(() => 0);
      state.players.forEach(p => {
        const choice = activeVotes[p];
        if (choice !== null) {
          answerVoteCounts[choice]++;
        }
      });

      // Award points (300 points per vote)
      item.answers.forEach((ansObj, aIdx) => {
        const votes = answerVoteCounts[aIdx];
        const pts = votes * 300;
        state.scores[ansObj.player] += pts;
        ansObj.votes = votes;
        ansObj.pointsEarned = pts;
      });

      // Show final results review
      renderLastLashReveal(state, item, idx);
    }
  });

  function checkSubmittable() {
    const allVoted = state.players.every(p => activeVotes[p] !== null);
    submitBtn.disabled = !allVoted;
  }

  updateVoterRows();

  const screen = el("div", { className: "panel center", style: "max-width: 600px; margin: 0 auto;" }, [
    el("h3", { text: "THE LAST LASH", style: "color:var(--sunset-soft); letter-spacing:1px; margin-top:0;" }),
    el("blockquote", { text: `"${item.promptText}"`, style: "font-size: 1.4rem; font-weight: bold; border: none; padding: 0;" }),
    el("div", { className: "spacer" }),
    el("p", { className: "muted", text: "Select your favorite response. You cannot vote for your own answer!" }),
    voterGrid,
    submitBtn
  ]);

  mount(gameTopbar(`Quiplash — The Last Lash`, () => confirmQuit(state)), screen);
}

function renderLastLashReveal(state, item, idx) {
  // Sort answers by votes to show the winner of the Last Lash
  const sorted = item.answers.slice().sort((a, b) => b.votes - a.votes);

  const blockRows = sorted.map((ansObj) => {
    return el("div", {
      className: "panel",
      style: "display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border:1px solid rgba(255,255,255,0.08); padding: 12px 18px;"
    }, [
      el("div", { style: "text-align: left;" }, [
        el("div", { text: `"${ansObj.answer}"`, style: "font-size: 1.15rem; font-weight: bold;" }),
        el("div", { text: `By ${ansObj.player}`, style: "font-size: 0.85rem; color:var(--sunset-soft); font-weight: 500;" })
      ]),
      el("div", { style: "text-align: right;" }, [
        el("div", { text: `${ansObj.votes} ${ansObj.votes === 1 ? 'vote' : 'votes'}`, style: "font-weight: bold;" }),
        el("div", { text: `+${ansObj.pointsEarned} pts`, style: "font-size: 0.8rem; color:#00ffaa;" })
      ])
    ]);
  });

  const btn = el("button", {
    className: "btn",
    text: "Show Final Standings",
    onClick: () => renderGameResults(state)
  });

  mount(
    gameTopbar("Quiplash — Final Lash Reveal", () => confirmQuit(state)),
    el("div", { className: "panel center", style: "max-width: 600px; margin: 0 auto;" }, [
      el("blockquote", { text: `"${item.promptText}"`, style: "font-size: 1.3rem; border:none; padding:0; font-weight:bold; margin-bottom:20px;" }),
      ...blockRows,
      el("div", { className: "spacer" }),
      btn
    ])
  );
}

// ── Scoreboard Screens ────────────────────────────────────────────────────────
function renderRoundLeaderboard(state) {
  const standings = state.players.map(pName => ({
    name: pName,
    score: state.scores[pName]
  })).sort((a, b) => b.score - a.score);

  const listRows = standings.map((st, i) => {
    return el("div", {
      style: "display:flex; justify-content:space-between; align-items:center; padding:10px 16px; background:rgba(255,255,255,0.02); border-radius:10px; margin-bottom:8px;"
    }, [
      el("div", { style: "font-weight:500;" }, [document.createTextNode(`${i + 1}. ${st.name}`)]),
      el("div", { text: String(st.score), style: "font-weight:bold; color:var(--sunset-soft);" })
    ]);
  });

  let btnText = "Start Round 2 (Double Points)";
  if (state.round === 2) {
    btnText = "Start Round 3 (The Last Lash)";
  }

  const nextBtn = el("button", {
    className: "btn",
    text: btnText,
    onClick: () => {
      state.round++;
      startRoundWriting(state);
    }
  });

  mount(
    gameTopbar(`Quiplash — Round ${state.round} Scores`, () => confirmQuit(state)),
    el("div", { className: "panel center", style: "max-width: 480px; margin: 0 auto;" }, [
      el("h2", { text: "Current Standings" }),
      ...listRows,
      el("div", { className: "spacer" }),
      nextBtn
    ])
  );
}

function renderGameResults(state) {
  const standings = state.players.map(pName => ({
    name: pName,
    score: state.scores[pName]
  })).sort((a, b) => b.score - a.score);

  const listRows = standings.map((st, i) => {
    const isWinner = i === 0;
    return el("div", {
      className: isWinner ? "panel" : "",
      style: `display:flex; justify-content:space-between; align-items:center; padding:12px 18px; background:${isWinner ? "rgba(255,145,100,0.06)" : "rgba(255,255,255,0.01)"}; border:${isWinner ? "1px solid var(--sunset-soft)" : "1px solid rgba(255,255,255,0.05)"}; border-radius:12px; margin-bottom:10px;`
    }, [
      el("div", { style: "font-weight: bold; display: flex; align-items: center; gap: 8px;" }, [
        document.createTextNode(`${i + 1}. ${st.name}`),
        isWinner ? el("span", { text: "👑 WINNER", style: "color:var(--sunset-soft); font-size:0.75rem; font-weight:bold; letter-spacing:0.5px;" }) : null
      ]),
      el("div", { text: String(st.score), style: "font-weight:bold; color:var(--sunset-soft); font-size: 1.2rem;" })
    ]);
  });

  const lobbyBtn = el("button", {
    className: "btn",
    text: "Back to Lobby",
    onClick: goHome
  });

  mount(
    gameTopbar("Quiplash — Final Standings", goHome),
    el("div", { className: "panel center", style: "max-width: 480px; margin: 0 auto;" }, [
      el("h1", { text: "Game Over!", style: "color: var(--sunset-soft); font-size: 2.2rem; font-weight: 900; margin-top: 0;" }),
      el("p", { className: "muted", text: "Congratulations to the champion! Here are the final scores:" }),
      ...listRows,
      el("div", { className: "spacer" }),
      lobbyBtn
    ])
  );
}

function confirmQuit(state) {
  if (confirm("Are you sure you want to end this Quiplash game?")) {
    goHome();
  }
}
