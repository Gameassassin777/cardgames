// Dedicated Dice Games Hub and Standalone Virtual Dice Roller.
import { el, mount, toast } from "../ui.js";
import { icons } from "../icons.js";
import { start as startFarkle } from "./farkle.js";
import { start as startYahtzee } from "./yahtzee.js";
import { start as startLiarsDice } from "./liars_dice.js";

let goHome = () => {};

function hubTopbar(title, onBack) {
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
  renderHub();
}

function renderHub() {
  mount(
    hubTopbar("Dice Games Hub", goHome),
    el("div", { className: "panel center", style: "max-width: 480px; margin: 0 auto;" }, [
      el("div", { style: "width:64px; height:64px; margin:0 auto 12px; color:var(--sunset-soft);" }, [icons.dice()]),
      el("h2", { text: "Dice Games Hub" }),
      el("p", { className: "muted", text: "Welcome to the Dice Hub! Roll virtual dice for your own board games, play Yahtzee, bluff in Liar's Dice, or track high-stakes Farkle scores." }),
      el("div", { style: "display: flex; flex-direction: column; gap: 12px; margin-top: 24px; width: 100%;" }, [
        el("button", {
          className: "btn",
          text: "🎲 Play Yahtzee",
          onClick: () => startYahtzee(renderHub)
        }),
        el("button", {
          className: "btn",
          text: "🔥 Play Farkle",
          onClick: () => startFarkle(renderHub)
        }),
        el("button", {
          className: "btn",
          text: "🤫 Play Liar's Dice",
          onClick: () => startLiarsDice(renderHub)
        }),
        el("button", {
          className: "btn ghost",
          text: "✨ Standalone Virtual Roller",
          onClick: () => startStandaloneRoller()
        })
      ])
    ])
  );
}

// ── Standalone Virtual Dice Roller ───────────────────────────────────────────
function startStandaloneRoller() {
  let diceCount = 5;
  let rollsLeft = 3;
  let dice = Array(diceCount).fill({ val: 1, held: false });
  let rolling = false;

  const diceGrid = el("div", {
    style: "display: flex; gap: 12px; justify-content: center; margin: 24px 0; flex-wrap: wrap;"
  });

  const rollBtn = el("button", {
    className: "btn",
    text: "Roll Dice",
    style: "background: linear-gradient(135deg, #ff9164, #f45d22); font-weight: bold; width: 100%;",
    onClick: () => triggerRoll()
  });

  const selectCount = el("select", {
    style: "width: auto; font-size: 0.95rem; border-radius: 8px; padding: 6px 12px;",
    onChange: (e) => {
      diceCount = parseInt(e.target.value, 10);
      resetRoller();
    }
  }, [
    el("option", { value: "1", text: "1 Die" }),
    el("option", { value: "2", text: "2 Dice" }),
    el("option", { value: "3", text: "3 Dice" }),
    el("option", { value: "4", text: "4 Dice" }),
    el("option", { value: "5", text: "5 Dice", selected: true }),
    el("option", { value: "6", text: "6 Dice" })
  ]);

  const statsDisplay = el("div", {
    text: "Rolls this turn: 0",
    style: "font-size: 0.85rem; font-weight: 500; color: var(--sunset-soft);"
  });

  const resetBtn = el("button", {
    className: "btn ghost small error",
    text: "Reset Roller",
    style: "margin: 0;",
    onClick: () => resetRoller()
  });

  function resetRoller() {
    rollsLeft = 3;
    dice = Array(diceCount).fill(null).map(() => ({ val: 1, held: false }));
    rolling = false;
    statsDisplay.textContent = "Rolls this turn: 0";
    rollBtn.disabled = false;
    drawDice();
  }

  function drawDice() {
    diceGrid.innerHTML = "";
    dice.forEach((die, idx) => {
      const dieFace = renderDiceFaceSVG(die.val, die.held);
      
      const dieEl = el("div", {
        className: "dice-box" + (die.held ? " held" : "") + (rolling && !die.held ? " rolling" : ""),
        style: `width: 60px; height: 60px; padding: 4px; background: ${die.held ? "rgba(255,145,100,0.15)" : "rgba(255,255,255,0.02)"}; border: 2px solid ${die.held ? "var(--sunset-soft)" : "rgba(255,255,255,0.12)"}; border-radius: 12px; cursor: pointer; transition: transform 0.15s, border-color 0.15s;`,
        onClick: () => {
          if (rolling) return;
          die.held = !die.held;
          drawDice();
        }
      }, [dieFace]);

      diceGrid.appendChild(dieEl);
    });
  }

  function triggerRoll() {
    if (rolling) return;
    rolling = true;
    rollBtn.disabled = true;
    selectCount.disabled = true;

    let clicks = 0;
    const clickLimit = 8;
    const interval = setInterval(() => {
      // Shuffling unheld dice values
      dice.forEach(die => {
        if (!die.held) {
          die.val = Math.floor(Math.random() * 6) + 1;
        }
      });
      drawDice();
      playClickTone(500 + Math.random() * 150, 0.03);
      clicks++;

      if (clicks >= clickLimit) {
        clearInterval(interval);
        rolling = false;
        rollBtn.disabled = false;
        selectCount.disabled = false;
        
        // Finalize values
        dice.forEach(die => {
          if (!die.held) {
            die.val = Math.floor(Math.random() * 6) + 1;
          }
        });
        
        rollsLeft--;
        statsDisplay.textContent = `Rolls this turn: ${3 - rollsLeft}`;
        drawDice();
        playClickTone(800, 0.08); // High final ding
      }
    }, 80);
  }

  resetRoller();

  mount(
    hubTopbar("Standalone Dice Roller", renderHub),
    el("div", { className: "panel center", style: "max-width: 480px; margin: 0 auto;" }, [
      el("div", { style: "display:flex; justify-content:space-between; align-items:center; width:100%; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:8px; margin-bottom:8px;" }, [
        selectCount,
        statsDisplay
      ]),
      el("p", { className: "muted", text: "Tap any die to hold/lock it, then roll the remaining dice. Reset at any time.", style: "font-size:0.8rem;" }),
      diceGrid,
      el("div", { style: "display:flex; gap:12px; width:100%; margin-top:12px;" }, [
        resetBtn,
        rollBtn
      ])
    ])
  );
}

// ── Helper to render beautiful dice faces as high-detail SVGs ─────────────────
export function renderDiceFaceSVG(val, held = false) {
  const color = held ? "var(--sunset-soft)" : "#f3f4f6";
  const dots = [];

  // Define dot coordinates for 1 to 6 on a 24x24 canvas
  // Coordinates are [cx, cy]
  const center = [12, 12];
  const topLeft = [7, 7];
  const topRight = [17, 7];
  const middleLeft = [7, 12];
  const middleRight = [17, 12];
  const bottomLeft = [7, 17];
  const bottomRight = [17, 17];

  if (val === 1) {
    dots.push(center);
  } else if (val === 2) {
    dots.push(topLeft, bottomRight);
  } else if (val === 3) {
    dots.push(topLeft, center, bottomRight);
  } else if (val === 4) {
    dots.push(topLeft, topRight, bottomLeft, bottomRight);
  } else if (val === 5) {
    dots.push(topLeft, topRight, center, bottomLeft, bottomRight);
  } else if (val === 6) {
    dots.push(topLeft, topRight, middleLeft, middleRight, bottomLeft, bottomRight);
  }

  const svgPaths = [];
  dots.forEach(([cx, cy]) => {
    svgPaths.push({
      tag: "circle",
      cx: String(cx),
      cy: String(cy),
      r: "1.8",
      fill: color
    });
  });

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.style.cssText = "width:100%; height:100%; display:block;";
  
  // Outer rectangle for die border
  const outerBorder = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  outerBorder.setAttribute("x", "2");
  outerBorder.setAttribute("y", "2");
  outerBorder.setAttribute("width", "20");
  outerBorder.setAttribute("height", "20");
  outerBorder.setAttribute("rx", "4");
  outerBorder.setAttribute("ry", "4");
  outerBorder.setAttribute("fill", "none");
  outerBorder.setAttribute("stroke", color);
  outerBorder.setAttribute("stroke-width", "1.5");
  svg.appendChild(outerBorder);

  svgPaths.forEach(pDef => {
    const cNode = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    cNode.setAttribute("cx", pDef.cx);
    cNode.setAttribute("cy", pDef.cy);
    cNode.setAttribute("r", pDef.r);
    cNode.setAttribute("fill", pDef.fill);
    svg.appendChild(cNode);
  });

  return svg;
}

// ── Web Audio API synth tones for rolls ──────────────────────────────────────
export function playClickTone(freq, duration) {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.005, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.06, audioCtx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (_) {}
}
