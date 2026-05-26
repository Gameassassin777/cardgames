// Developer UI Dashboard for the Lake House Card Quality Evaluator (LCQE)
import { el, mount, toast } from "./ui.js";
import { PROMPTS, RESPONSES, NORMAL_PROMPTS, NORMAL_RESPONSES } from "./data.js";
import { runEvaluation } from "./evaluator.js";

let backToHome = () => {};
let activeDeck = "monkeys"; // "monkeys" | "cabin"
let activeTab = "responses"; // "responses" | "prompts"
let activeFilter = "flagged"; // "flagged" | "all"
let simulationRounds = 1000;
let currentReport = null;

export function openEvaluator(home) {
  backToHome = home;
  runAnalysis();
  render();
}

function runAnalysis() {
  const prompts = activeDeck === "monkeys" ? PROMPTS : NORMAL_PROMPTS;
  const responses = activeDeck === "monkeys" ? RESPONSES : NORMAL_RESPONSES;
  
  // Benchmark performance: run evaluation + simulation
  const t0 = performance.now();
  currentReport = runEvaluation(prompts, responses, simulationRounds);
  const t1 = performance.now();
  
  console.log(`LCQE: Evaluated ${prompts.length} prompts & ${responses.length} responses in ${(t1 - t0).toFixed(1)}ms.`);
}

function render() {
  const topbar = el("div", { className: "topbar" }, [
    el("button", { className: "back", text: "‹ Home Menu", onClick: backToHome }),
    el("div", { className: "title", text: "📊 Card Quality Evaluator" }),
    el("span", { style: "width:64px" }),
  ]);

  // Deck selector row
  const deckSelect = el("div", { className: "panel" }, [
    el("label", { text: "Choose Deck to Analyze" }),
    el("div", { className: "btn-row" }, [
      el("button", {
        className: "btn" + (activeDeck === "monkeys" ? " secondary" : " ghost"),
        text: "🐒 Cards Against Monkeys",
        onClick: () => { activeDeck = "monkeys"; runAnalysis(); render(); }
      }),
      el("button", {
        className: "btn" + (activeDeck === "cabin" ? " secondary" : " ghost"),
        text: "🛖 Cards Against the Cabin",
        onClick: () => { activeDeck = "cabin"; runAnalysis(); render(); }
      })
    ]),
    el("hr", { className: "divider" }),
    el("div", { style: "display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;" }, [
      el("p", { className: "muted", style: "margin: 0; font-size: 0.9rem;", text: "Simulation runs 1,000 rounds of bot drafting/playtesting in real-time." }),
      el("button", {
        className: "btn small",
        style: "width: auto; background: var(--sunset); color: #3a1c0c;",
        text: "⚡ Re-Run Playtest Sim",
        onClick: () => {
          runAnalysis();
          toast("Simulated 1,000 rounds of bot vs bot!");
          render();
        }
      })
    ])
  ]);

  // Report Summary Card
  const sum = currentReport.summary;
  const summaryPanel = el("div", { className: "wood-panel center" }, [
    el("h2", { style: "margin:0 0 8px; font-size: 1.8rem;" }, [
      document.createTextNode("Deck Health Index: "),
      el("span", { style: "color: #fff; font-weight: 800; font-family: monospace; text-shadow: 0 0 10px rgba(255,255,255,0.4)", text: sum.healthIndex })
    ]),
    el("p", { className: "muted", style: "font-size: 0.9rem; margin-bottom: 12px;", text: "Health Index represents the percentage of cards meeting quality criteria (Grade C or above)." }),
    el("div", {
      style: "display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 8px;"
    }, [
      el("div", { style: "background: rgba(0,0,0,0.2); padding: 8px; border-radius: 10px;" }, [
        el("div", { style: "font-size: 1.3rem; font-weight: 800;", text: String(sum.totalResponses) }),
        el("div", { className: "muted", style: "font-size: 0.75rem;", text: "Total Responses" })
      ]),
      el("div", { style: "background: rgba(0,0,0,0.2); padding: 8px; border-radius: 10px;" }, [
        el("div", { style: "font-size: 1.3rem; font-weight: 800;", text: String(sum.totalPrompts) }),
        el("div", { className: "muted", style: "font-size: 0.75rem;", text: "Total Prompts" })
      ]),
      el("div", { style: "background: rgba(232,121,74,0.15); padding: 8px; border-radius: 10px; border: 1px solid rgba(232,121,74,0.3);" }, [
        el("div", { style: "font-size: 1.3rem; font-weight: 800; color: var(--sunset-soft)", text: String(sum.midResponsesCount) }),
        el("div", { className: "muted", style: "font-size: 0.75rem;", text: "Mid Cards Flagged" })
      ]),
      el("div", { style: "background: rgba(240,60,60,0.1); padding: 8px; border-radius: 10px; border: 1px solid rgba(240,60,60,0.25);" }, [
        el("div", { style: "font-size: 1.3rem; font-weight: 800; color: #ff6b6b", text: String(sum.awkwardResponsesCount) }),
        el("div", { className: "muted", style: "font-size: 0.75rem;", text: "Awkward Cards Flagged" })
      ])
    ])
  ]);

  // Tab switcher
  const tabRow = el("div", { className: "btn-row", style: "margin: 18px 0 10px;" }, [
    el("button", {
      className: "btn" + (activeTab === "responses" ? " secondary" : " ghost"),
      text: "🃏 Response Cards (White)",
      onClick: () => { activeTab = "responses"; render(); }
    }),
    el("button", {
      className: "btn" + (activeTab === "prompts" ? " secondary" : " ghost"),
      text: "⬛ Prompt Cards (Black)",
      onClick: () => { activeTab = "prompts"; render(); }
    })
  ]);

  // Filter Toggle (All vs Flagged)
  const filterRow = el("div", {
    style: "display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding: 0 4px;"
  }, [
    el("label", { style: "margin: 0; font-size: 0.95rem; color: var(--water-foam); font-weight:700;", text: activeTab === "responses" ? "Response Reports" : "Prompt Reports" }),
    el("div", { style: "display: flex; gap: 6px;" }, [
      el("button", {
        className: "btn small" + (activeFilter === "flagged" ? "" : " ghost"),
        style: activeFilter === "flagged" ? "background: var(--sunset); color: #3a1c0c;" : "",
        text: "⚠️ Show Flagged Only",
        onClick: () => { activeFilter = "flagged"; render(); }
      }),
      el("button", {
        className: "btn small" + (activeFilter === "all" ? "" : " ghost"),
        style: activeFilter === "all" ? "background: var(--sunset); color: #3a1c0c;" : "",
        text: "🔍 Show All",
        onClick: () => { activeFilter = "all"; render(); }
      })
    ])
  ]);

  // List of evaluations
  const listContainer = el("div", { className: "scoreboard", style: "margin-top: 10px;" });

  if (activeTab === "responses") {
    let list = currentReport.responses;
    if (activeFilter === "flagged") {
      list = list.filter(r => r.grade === "D" || r.grade === "F" || r.flags.length > 0);
    }

    if (list.length === 0) {
      listContainer.appendChild(el("div", {
        className: "score-row center muted",
        style: "padding: 30px 10px; display: block;",
        text: "Nice! No cards in this filter category have quality issues. ✨"
      }));
    } else {
      list.forEach(r => {
        // Grade element
        const gradeBadge = el("span", {
          className: "pill",
          style: `font-size: 1.1rem; width: 34px; height: 34px; display: inline-grid; place-items: center; border-radius: 50%; border: none; font-weight: 900; margin: 0; background: ${getGradeBg(r.grade)}; color: ${getGradeFg(r.grade)};`,
          text: r.grade
        });

        // Recommendations
        const recList = el("div", { className: "eval-recs", style: "display:none; border-top:1px dashed rgba(255,255,255,0.1); padding-top: 10px; margin-top: 10px;" });
        if (r.recommendations.length > 0) {
          r.recommendations.forEach(rec => {
            recList.appendChild(el("div", { style: "color: #ffb077; font-size: 0.85rem; text-align: left; margin: 3px 0; line-height: 1.3;" }, [
              el("span", { style: "margin-right:6px;", text: "👉" }),
              document.createTextNode(rec)
            ]));
          });
        }

        // Expanded trigger
        let expanded = false;
        const row = el("div", {
          className: "score-row",
          style: "display: block; cursor: pointer; padding: 14px; transition: background 0.15s ease;",
          onClick: () => {
            expanded = !expanded;
            recList.style.display = expanded ? "block" : "none";
            row.style.background = expanded ? "rgba(255,255,255,0.13)" : "rgba(255,255,255,0.08)";
          }
        }, [
          el("div", { style: "display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;" }, [
            el("div", { style: "flex: 1; text-align: left;" }, [
              el("div", { style: "font-weight: 700; color: #fff; font-size: 1.02rem; line-height: 1.35; margin-bottom: 6px;", text: `"${r.text}"` }),
              el("div", { style: "display: flex; gap: 5px; flex-wrap: wrap; align-items: center;" }, [
                r.drawn > 0 ? el("span", { className: "pill", style: "background: rgba(0,0,0,0.15); font-size: 0.72rem; margin: 0; padding: 2px 8px; opacity: 0.8;", text: `Sim play: ${r.playRate} (won ${r.winRate})` }) : null,
                r.flags.map(f => el("span", {
                  className: "pill",
                  style: `font-size: 0.72rem; margin: 0; padding: 2px 8px; border: none; background: ${f.includes("Awkward") ? "rgba(240,60,60,0.22)" : "rgba(232,121,74,0.22)"}; color: ${f.includes("Awkward") ? "#ff8b8b" : "#ffb07c"}; font-weight:800;`,
                  text: f
                }))
              ])
            ]),
            gradeBadge
          ]),
          recList
        ]);
        listContainer.appendChild(row);
      });
    }
  } else {
    // Black Cards (Prompts)
    let list = currentReport.prompts;
    if (activeFilter === "flagged") {
      list = list.filter(p => p.flags.length > 0 || p.grade === "D");
    }

    if (list.length === 0) {
      listContainer.appendChild(el("div", {
        className: "score-row center muted",
        style: "padding: 30px 10px; display: block;",
        text: "Brilliant! No prompts are flagged as awkward. 🌟"
      }));
    } else {
      list.forEach(p => {
        const gradeBadge = el("span", {
          className: "pill",
          style: `font-size: 1.1rem; width: 34px; height: 34px; display: inline-grid; place-items: center; border-radius: 50%; border: none; font-weight: 900; margin: 0; background: ${getGradeBg(p.grade)}; color: ${getGradeFg(p.grade)};`,
          text: p.grade
        });

        const recList = el("div", { className: "eval-recs", style: "display:none; border-top:1px dashed rgba(255,255,255,0.1); padding-top: 10px; margin-top: 10px;" });
        if (p.recommendations.length > 0) {
          p.recommendations.forEach(rec => {
            recList.appendChild(el("div", { style: "color: #ffb077; font-size: 0.85rem; text-align: left; margin: 3px 0; line-height: 1.3;" }, [
              el("span", { style: "margin-right:6px;", text: "👉" }),
              document.createTextNode(rec)
            ]));
          });
        }

        let expanded = false;
        const row = el("div", {
          className: "score-row",
          style: "display: block; cursor: pointer; padding: 14px; transition: background 0.15s ease;",
          onClick: () => {
            expanded = !expanded;
            recList.style.display = expanded ? "block" : "none";
            row.style.background = expanded ? "rgba(255,255,255,0.13)" : "rgba(255,255,255,0.08)";
          }
        }, [
          el("div", { style: "display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;" }, [
            el("div", { style: "flex: 1; text-align: left;" }, [
              el("div", { style: "font-weight: 700; color: #fff; font-size: 1.02rem; line-height: 1.35; margin-bottom: 6px;", text: `"${p.text}"` }),
              el("div", { style: "display: flex; gap: 5px; flex-wrap: wrap; align-items: center;" }, [
                el("span", { className: "pill", style: "background: rgba(0,0,0,0.15); font-size: 0.72rem; margin: 0; padding: 2px 8px; opacity: 0.8;", text: `Pick ${p.pick}` }),
                p.flags.map(f => el("span", {
                  className: "pill",
                  style: `font-size: 0.72rem; margin: 0; padding: 2px 8px; border: none; background: rgba(240,60,60,0.22); color: #ff8b8b; font-weight:800;`,
                  text: f
                }))
              ])
            ]),
            gradeBadge
          ]),
          recList
        ]);
        listContainer.appendChild(row);
      });
    }
  }

  mount(
    topbar,
    deckSelect,
    summaryPanel,
    tabRow,
    filterRow,
    listContainer
  );
}

function getGradeBg(grade) {
  switch (grade) {
    case "S": return "linear-gradient(135deg, #ffd700, #ff8c00)";
    case "A": return "#2e7d32";
    case "B": return "#1565c0";
    case "C": return "#555555";
    case "D": return "#d84315";
    case "F": return "#c62828";
    default: return "#555555";
  }
}

function getGradeFg(grade) {
  switch (grade) {
    case "S": return "#3a1c0c";
    default: return "#ffffff";
  }
}
