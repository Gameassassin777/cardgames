// Modular Online Multiplayer Illustrated Storybook / Cozy Chronicles party game.
// Powered by WebSockets discovery synchronization.
import { el, mount, toast, shuffle, HTTP_BASE, WS_BASE } from "../ui.js";
import { icons } from "../icons.js";





let goHome = () => {};
let socket = null;
let roomCode = "";
let myName = "";
let isHost = false;
let myIdx = -1;
let gState = null;
let heartbeatInt = null;
let roomBrowserRefresh = null;

let isOnline = false;
let setupMode = "passplay"; // "passplay" or "online"
let localPlayers = ["", "", ""];
let passPlayState = {
  currentStage: "pass",
  currentIdx: 0,
  phase: "madlibs"
};

// Multi-sentence story templates with blanks tailored for player count N (3 to 8).
const STORIES = {
  3: [
    {
      title: "The Glowing Marshmallow 🏕️",
      blanks: [
        { key: "p1_animal", label: "Noun (Forest Animal)" },
        { key: "p1_adjective", label: "Adjective (Silly)" },
        { key: "p1_color", label: "Adjective (Glowing Color)" },
        { key: "p1_food", label: "Noun (Campfire Snack)" },
        { key: "p1_place", label: "Noun (Secret Hideout)" },
        { key: "p2_insect", label: "Noun (Plural Bug)" },
        { key: "p2_hat", label: "Noun (Funny Hat)" },
        { key: "p2_weapon", label: "Noun (Silly Object)" },
        { key: "p2_number", label: "Noun (Large Number)" },
        { key: "p2_sound", label: "Noun (Weird Sound)" },
        { key: "p3_verb", label: "Verb (Weird Action)" },
        { key: "p3_feeling", label: "Adjective (Emotion)" },
        { key: "p3_clothing", label: "Noun (Cozy Clothing)" },
        { key: "p3_drink", label: "Noun (Warm Beverage)" },
        { key: "p3_gesture", label: "Noun (Victory Gesture)" }
      ],
      sentences: [
        "A hungry {p1_adjective} {p1_animal} finds a legendary, {p1_color} {p1_food} hidden inside a secret {p1_place}.",
        "Suddenly, a swarm of angry {p2_insect} wearing tiny {p2_hat} guards the prize, wielding {p2_weapon} while shouting {p2_sound} {p2_number} times!",
        "To distract them, the camper decides to {p3_verb} in their {p3_clothing}, making everyone feel {p3_feeling} while sipping {p3_drink} and doing a {p3_gesture}."
      ]
    },
    {
      title: "The Dock Cannonball 💦",
      blanks: [
        { key: "p1_clothing", label: "Noun (Silly Swimwear)" },
        { key: "p1_animal", label: "Noun (Cute Critter)" },
        { key: "p1_adjective", label: "Adjective (Slippery)" },
        { key: "p1_dock", label: "Noun (Lake Object)" },
        { key: "p1_weather", label: "Adjective (Weather)" },
        { key: "p2_verb", label: "Verb (Action)" },
        { key: "p2_number", label: "Number" },
        { key: "p2_sound", label: "Noun (Loud Noise)" },
        { key: "p2_water", label: "Noun (Type of Liquid)" },
        { key: "p2_feeling", label: "Adjective (Shocked)" },
        { key: "p3_creature", label: "Noun (Giant Lake Monster)" },
        { key: "p3_mouth", label: "Noun (Body Part)" },
        { key: "p3_food", label: "Noun (Silly Snack)" },
        { key: "p3_color", label: "Adjective (Neon Color)" },
        { key: "p3_verb2", label: "Verb (Action)" }
      ],
      sentences: [
        "A brave {p1_animal} wearing professional {p1_clothing} stands on the {p1_adjective} {p1_dock} during a {p1_weather} night.",
        "He decides to {p2_verb} into the sky, performing {p2_number} backflips before hitting the {p2_water} with a loud {p2_sound}, making everyone feel {p2_feeling}!",
        "He splashes directly into the wide open {p3_mouth} of a giant {p3_color} {p3_creature} who was casually chewing {p3_food} and trying to {p3_verb2}."
      ]
    }
  ],
  4: [
    {
      title: "The Lost Explorer 🗺️",
      blanks: [
        { key: "p1_job", label: "Noun (Silly Profession)" },
        { key: "p1_hat", label: "Noun (Type of Hat)" },
        { key: "p1_color", label: "Adjective (Bright Color)" },
        { key: "p1_object", label: "Noun (Navigation Tool)" },
        { key: "p2_animal", label: "Noun (Sneaky Forest Critter)" },
        { key: "p2_glasses", label: "Noun (Type of Eyewear)" },
        { key: "p2_stolen", label: "Noun (Valuable Object)" },
        { key: "p2_dropped", label: "Noun (Silly Item)" },
        { key: "p3_verb", label: "Verb (Athletic Move)" },
        { key: "p3_chase", label: "Noun (Chasing Method)" },
        { key: "p3_sound", label: "Noun (Animal Noise)" },
        { key: "p3_place", label: "Noun (High Spot)" },
        { key: "p4_adjective", label: "Adjective (Funny)" },
        { key: "p4_pose", label: "Noun (Funny Face/Pose)" },
        { key: "p4_social", label: "Noun (Social Media Platform)" },
        { key: "p4_reward", label: "Noun (Shiny Prize)" }
      ],
      sentences: [
        "A lost {p1_job} wearing a {p1_color} {p1_hat} attempts to read a map using a {p1_object}.",
        "Suddenly, a sneaky {p2_animal} wearing {p2_glasses} steals the map, leaving a {p2_dropped} on the ground.",
        "The explorer has to {p3_verb} through the woods, executing a {p3_chase} while making a {p3_sound} to corner the thief on a {p3_place}.",
        "They end up taking a {p4_adjective} selfie making {p4_pose} faces for {p4_social}, rewarding themselves with a {p4_reward}."
      ]
    },
    {
      title: "The Canoe Captain 🛶",
      blanks: [
        { key: "p1_hat", label: "Noun (Fancy Hat)" },
        { key: "p1_animal", label: "Noun (Small Bird)" },
        { key: "p1_color", label: "Adjective (Shiny Color)" },
        { key: "p1_vehicle", label: "Noun (Type of Boat)" },
        { key: "p2_wave", label: "Adjective (Oceanic)" },
        { key: "p2_sound", label: "Noun (Loud Sound)" },
        { key: "p2_place", label: "Noun (High Location)" },
        { key: "p2_feeling", label: "Adjective (Scared)" },
        { key: "p3_creature", label: "Noun (Lake Monster Name)" },
        { key: "p3_color", label: "Adjective (Neon Color)" },
        { key: "p3_action", label: "Verb (Action)" },
        { key: "p3_body", label: "Noun (Body Part)" },
        { key: "p4_food", label: "Noun (Silly Snack)" },
        { key: "p4_adjective", label: "Adjective (Warm)" },
        { key: "p4_time", label: "Noun (Time of Day)" },
        { key: "p4_verb", label: "Verb (Action)" }
      ],
      sentences: [
        "A tiny {p1_animal} wearing a fancy {p1_hat} takes steering control of a {p1_color} {p1_vehicle}.",
        "Suddenly, a {p2_wave} wave hits with a loud {p2_sound}, sending the captain high into the {p2_place} while feeling {p2_feeling}.",
        "A friendly {p3_color} lake monster named {p3_creature} decides to {p3_action} and catches the falling bird perfectly on its {p3_body}.",
        "They sail off into the {p4_adjective} {p4_time} together, sharing a bucket of {p4_food} and trying to {p4_verb}."
      ]
    }
  ],
  5: [
    {
      title: "The Energetic Bear 🐻",
      blanks: [
        { key: "p1_animal", label: "Noun (Forest Animal)" },
        { key: "p1_adjective", label: "Adjective (Sleepy)" },
        { key: "p1_drink", label: "Noun (Silly Liquid)" },
        { key: "p2_dance", label: "Verb (Dance Move)" },
        { key: "p2_sound", label: "Noun (Exclamation)" },
        { key: "p2_place", label: "Noun (Cozy Spot)" },
        { key: "p3_container", label: "Noun (Large Container)" },
        { key: "p3_filled", label: "Noun (Slippery Stuff)" },
        { key: "p3_adjective2", label: "Adjective (Messy)" },
        { key: "p4_critter", label: "Noun (Plural Forest Bugs)" },
        { key: "p4_feeling", label: "Adjective (Emotional State)" },
        { key: "p4_look", label: "Noun (Facial Expression)" },
        { key: "p5_prize", label: "Noun (Silly Trophy)" },
        { key: "p5_material", label: "Noun (Natural Material)" },
        { key: "p5_verb", label: "Verb (Action)" }
      ],
      sentences: [
        "A {p1_adjective} {p1_animal} decides to brew a giant, steaming mug of {p1_drink}.",
        "He drinks it and gets so energized that he starts to {p2_dance} through the woods, shouting {p2_sound} toward the {p2_place}.",
        "He loses control and crashes face-first into a giant {p3_container} filled with {p3_filled}, making a {p3_adjective2} splash.",
        "All the nearby {p4_critter} gather around, looking extremely {p4_feeling} and wearing a {p4_look}.",
        "They award him a {p5_prize} made of {p5_material} to {p5_verb} his epic performance!"
      ]
    },
    {
      title: "The Spa Day 🧖‍♂️",
      blanks: [
        { key: "p1_animal", label: "Noun (Large Critter)" },
        { key: "p1_adjective", label: "Adjective (Stressed)" },
        { key: "p1_spring", label: "Noun (Wet Location)" },
        { key: "p2_assistant", label: "Noun (Plural Small Animal)" },
        { key: "p2_food", label: "Noun (Type of Food)" },
        { key: "p2_action", label: "Verb (Relieving Action)" },
        { key: "p3_fish", label: "Noun (Lake Creature)" },
        { key: "p3_adjective2", label: "Adjective (Vibrant)" },
        { key: "p3_sound", label: "Noun (Splash Sound)" },
        { key: "p4_item", label: "Noun (Slippery Toiletries)" },
        { key: "p4_direction", label: "Noun (Slope/Angle)" },
        { key: "p4_reaction", label: "Noun (Scream/Sound)" },
        { key: "p5_bed", label: "Noun (Cozy Spot)" },
        { key: "p5_sound2", label: "Noun (Sleeping Sound)" },
        { key: "p5_adjective3", label: "Adjective (Warm)" }
      ],
      sentences: [
        "A highly {p1_adjective} {p1_animal} decides to take a relaxing spa day inside a hot mud {p1_spring}.",
        "Two friendly {p2_assistant} place fresh slices of {p2_food} over his eyes and attempt to {p2_action} his back.",
        "Suddenly, a giant {p3_adjective2} {p3_fish} jumps out of the water with a loud {p3_sound} to join the spa session.",
        "The bear gets startled, slips on a bar of {p4_item}, and rolls down the muddy {p4_direction} while shouting {p4_reaction}!",
        "He lands perfectly inside a {p5_adjective3} {p5_bed}, completely warm and making {p5_sound2} noises as he falls asleep."
      ]
    }
  ],
  6: [
    {
      title: "The Frog Cowboy 🤠",
      blanks: [
        { key: "p1_hat", label: "Noun (Funny Hat)" },
        { key: "p1_animal", label: "Noun (Ridable Creature)" },
        { key: "p1_adjective", label: "Adjective (Tiny)" },
        { key: "p2_drink", label: "Noun (Silly Liquid)" },
        { key: "p2_bartender", label: "Noun (Forest Animal)" },
        { key: "p2_place", label: "Noun (Cozy Establishment)" },
        { key: "p3_gang", label: "Noun (Plural Animal Gang)" },
        { key: "p3_feeling", label: "Adjective (Angry)" },
        { key: "p3_door", label: "Noun (Weird Material)" },
        { key: "p4_weapon", label: "Noun (Silly Throwing Food)" },
        { key: "p4_adjective2", label: "Adjective (Messy)" },
        { key: "p4_sound", label: "Noun (Loud Sound)" },
        { key: "p5_vehicle", label: "Noun (Flying Object)" },
        { key: "p5_color", label: "Adjective (Neon Color)" },
        { key: "p5_escape", label: "Verb (Action)" },
        { key: "p6_camper", label: "Noun (Profession/Job)" },
        { key: "p6_container", label: "Noun (Cozy Mug)" },
        { key: "p6_verb", label: "Verb (Cozy Action)" }
      ],
      sentences: [
        "A {p1_adjective} frog wearing a ten-gallon {p1_hat} rides a majestic {p1_animal} like a horse.",
        "They arrive at the {p2_place} and order two shots of cold {p2_drink} from a {p2_bartender} bartender.",
        "Suddenly, a {p3_feeling} rival gang of {p3_gang} bursts through the swinging {p3_door} doors.",
        "The room erupts with a {p4_sound}, turning into a {p4_adjective2} food fight using {p4_weapon}.",
        "The frog decides to {p5_escape} the chaos by flying out the window on a {p5_color} {p5_vehicle}.",
        "He lands safely inside a warm {p6_container} of cocoa held by a cozy {p6_camper} who loves to {p6_verb}."
      ]
    }
  ],
  7: [
    {
      title: "The Close Encounter 👽",
      blanks: [
        { key: "p1_color", label: "Adjective (Neon Color)" },
        { key: "p1_ship", label: "Noun (Type of Vehicle)" },
        { key: "p1_sound", label: "Noun (Weird Noise)" },
        { key: "p2_clothing", label: "Noun (Cozy Clothing)" },
        { key: "p2_instrument", label: "Noun (Musical Instrument)" },
        { key: "p2_alien", label: "Noun (Weird Alien Creature)" },
        { key: "p3_dance", label: "Noun (Type of Dance)" },
        { key: "p3_adjective", label: "Adjective (Hypnotic)" },
        { key: "p3_verb", label: "Verb (Action)" },
        { key: "p4_effect", label: "Noun (Superpower/Effect)" },
        { key: "p4_feeling", label: "Adjective (Happy)" },
        { key: "p4_campers", label: "Noun (Plural Job)" },
        { key: "p5_job", label: "Noun (Profession/Job)" },
        { key: "p5_dropped", label: "Noun (Useful Object)" },
        { key: "p5_reaction", label: "Noun (Shocked Reaction)" },
        { key: "p6_animal", label: "Noun (Small Animal)" },
        { key: "p6_laser", label: "Noun (Silly Weapon)" },
        { key: "p6_sound2", label: "Noun (Zap Sound)" },
        { key: "p7_food", label: "Noun (Campfire Food)" },
        { key: "p7_rhythm", label: "Noun (Instrument/Object)" },
        { key: "p7_verb2", label: "Verb (Action)" }
      ],
      sentences: [
        "A glowing {p1_color} {p1_ship} lands quietly in a dark forest clearing with a soft {p1_sound}.",
        "A strange {p2_alien} steps out of the ship wearing a {p2_clothing} and holding a {p2_instrument}.",
        "He joins the group and performs a {p3_adjective} {p3_dance} song, trying to {p3_verb} under the stars.",
        "The alien teaches the {p4_feeling} {p4_campers} how to float and experience zero-gravity {p4_effect}.",
        "A local {p5_job} walks up, experiences pure {p5_reaction}, and drops his {p5_dropped} in absolute shock.",
        "The startled alien accidentally fires his {p6_laser}, and with a loud {p6_sound2} turns the ranger into a {p6_animal}.",
        "They all eat {p7_food} together while the ranger beats out the rhythm on a {p7_rhythm} and tries to {p7_verb2}."
      ]
    }
  ],
  8: [
    {
      title: "The Bigfoot Selfie 🤳",
      blanks: [
        { key: "p1_job", label: "Noun (Outdoor Hobbyist)" },
        { key: "p1_item", label: "Noun (Optical Gear)" },
        { key: "p1_place", label: "Noun (Forest Location)" },
        { key: "p2_drink", label: "Noun (Cold Beverage)" },
        { key: "p2_glasses", label: "Noun (Cool Eyewear)" },
        { key: "p2_beast", label: "Noun (Legendary Monster)" },
        { key: "p3_dropped", label: "Noun (Expensive Gadget)" },
        { key: "p3_feeling", label: "Adjective (Terrified)" },
        { key: "p3_sound", label: "Noun (Gasp Sound)" },
        { key: "p4_pose", label: "Noun (Funny Face/Pose)" },
        { key: "p4_pose_adj", label: "Adjective (Goofy)" },
        { key: "p4_camera", label: "Noun (Camera Type)" },
        { key: "p5_thief", label: "Noun (Sneaky Animal)" },
        { key: "p5_clothing", label: "Noun (Silly Outfit)" },
        { key: "p5_tree", label: "Noun (Type of Tree)" },
        { key: "p6_shower", label: "Noun (Plural Falling Items)" },
        { key: "p6_shaking", label: "Verb (Vigorous Action)" },
        { key: "p6_adjective2", label: "Adjective (Sticky)" },
        { key: "p7_device", label: "Noun (Smart Gadget)" },
        { key: "p7_condition", label: "Adjective (Dirty)" },
        { key: "p7_action", label: "Verb (Action)" },
        { key: "p8_gesture", label: "Noun (Victory Gesture)" },
        { key: "p8_celebration", label: "Noun (Festive Activity)" },
        { key: "p8_feeling2", label: "Adjective (Completely Satisfied)" }
      ],
      sentences: [
        "An excited {p1_job} looks through his {p1_item} near a spooky {p1_place}.",
        "Right behind him, a cool {p2_beast} is casually wearing {p2_glasses} and drinking {p2_drink}.",
        "The hiker turns around, makes a loud {p3_sound}, and drops his {p3_dropped} in a {p3_feeling} panic.",
        "The beast picks it up, sets up a {p4_camera}, and suggests they pose making {p4_pose_adj} {p4_pose} faces.",
        "A mischievous {p5_thief} wearing a {p5_clothing} steals the device and climbs a tall {p5_tree}.",
        "They shake the tree trunk, executing a {p6_shaking} move until a shower of {p6_adjective2} {p6_shower} falls down.",
        "They retrieve the {p7_condition} {p7_device} safely, and decide to {p7_action} it to clean it.",
        "They share a glorious {p8_gesture} and start a {p8_celebration}, feeling {p8_feeling2} under the starry sky."
      ]
    }
  ]
};

function gameTopbar(title, onBack) {
  return el("div", { className: "topbar" }, [
    el("button", { className: "back", onClick: onBack }, [
      el("span", { style: "width:16px; height:16px; display:inline-block;" }, [icons.back()]),
      el("span", { text: "Home" })
    ]),
    el("div", { className: "title", text: title }),
    el("span", { style: "width:64px" })
  ]);
}

export function start(home) {
  goHome = home;
  resetAll();
  const __pj = (() => { try { return JSON.parse(sessionStorage.getItem("lakehouse.pendingJoin")||"null"); } catch(_) { return null; } })();
  if (__pj && __pj.game === "chronicles" && __pj.code && (Date.now() - __pj.ts) < 20000) {
    sessionStorage.removeItem("lakehouse.pendingJoin");
    myName = localStorage.getItem("lakehouse.playerName") || "";
    if (myName) { connectRoom("join", __pj.code); return; }
  }
  renderSetup();
}

function resetAll() {
  if (socket) { try { socket.close(); } catch (_) {} socket = null; }
  if (heartbeatInt) { clearInterval(heartbeatInt); heartbeatInt = null; }
  if (roomBrowserRefresh) { clearInterval(roomBrowserRefresh); roomBrowserRefresh = null; }
  roomCode = ""; myName = ""; isHost = false; myIdx = -1; gState = null;
  isOnline = false;
}

function renderSetup() {  const savedName = localStorage.getItem("lakehouse.playerName") || localStorage.getItem("chronicles.name") || "";

  const nameInput = el("input", {
    type: "text",
    placeholder: "Your name…",
    value: savedName,
    id: "c-name",
    style: "font-size:1.1rem; border-radius:14px; text-align:center; margin-bottom:14px; width:100%;"
  });

  const codeInput = el("input", {
    type: "text",
    placeholder: "4-LETTER CODE",
    id: "c-code",
    maxLength: 4,
    style: "font-size:1.3rem; border-radius:14px; text-align:center; text-transform:uppercase; letter-spacing:6px; margin-bottom:10px; width:100%;"
  });
  codeInput.addEventListener("input", () => { codeInput.value = codeInput.value.toUpperCase(); });

  const getName = () => {
    const n = nameInput.value.trim();
    if (!n) { toast("Enter your name first!"); return null; }
    localStorage.setItem("chronicles.name", n);
    return n;
  };

  // Pass & Play players setup list
  const savedNames = localStorage.getItem("chronicles.localNames") 
    ? JSON.parse(localStorage.getItem("chronicles.localNames")) 
    : ["", "", "", ""];
  let localNamesList = savedNames.slice();

  const localListWrap = el("div", { style: "margin: 16px 0; max-height:220px; overflow-y:auto; width:100%;" });

  function drawLocalList() {
    localListWrap.innerHTML = "";
    localNamesList.forEach((nm, i) => {
      const input = el("input", {
        type: "text",
        value: nm,
        maxlength: "14",
        placeholder: `Player ${i + 1}`,
        style: "flex:1; border-radius:12px; font-size:1rem; padding: 8px 12px; text-align:center;",
        onInput: (e) => { 
          localNamesList[i] = e.target.value; 
          localStorage.setItem("chronicles.localNames", JSON.stringify(localNamesList));
        }
      });
      const row = el("div", { 
        style: "display:flex; gap:8px; align-items:center; margin-bottom: 8px; width:100%;" 
      }, [
        input,
        el("button", {
          className: "btn ghost small error",
          text: "✕",
          style: "margin:0; padding: 6px 12px; border-radius:12px; font-size:1.1rem; line-height:1;",
          onClick: () => {
            if (localNamesList.length > 3) {
              localNamesList.splice(i, 1);
              localStorage.setItem("chronicles.localNames", JSON.stringify(localNamesList));
              drawLocalList();
            } else {
              toast("Need at least 3 players.");
            }
          }
        })
      ]);
      localListWrap.appendChild(row);
    });
  }

  const addPlayerBtn = el("button", {
    className: "btn ghost small",
    text: "+ Add Player",
    style: "width:100%; margin-bottom:10px;",
    onClick: () => {
      if (localNamesList.length < 8) {
        localNamesList.push("");
        localStorage.setItem("chronicles.localNames", JSON.stringify(localNamesList));
        drawLocalList();
      } else {
        toast("Max 8 players for local pass-and-play.");
      }
    }
  });

  const showRulesBtn = el("button", {
    className: "btn ghost small",
    text: "📖 Rules & How to Play",
    style: "width:100%; margin-bottom:16px;",
    onClick: () => {
      const existing = document.querySelector(".rules-panel");
      if (existing) { existing.remove(); return; }
      const rPanel = el("div", {
        className: "rules-panel panel",
        style: "text-align:left; background:rgba(255,255,255,0.02); border:1px dashed rgba(255,255,255,0.12); border-radius:12px; padding:12px; margin-bottom:16px; font-size:0.82rem; line-height:1.4;"
      }, [
        el("h4", { text: "How to Play:", style: "margin:0 0 6px; color:var(--sunset-soft);" }),
        el("ul", { style: "margin:0; padding-left:16px; display:flex; flex-direction:column; gap:4px;" }, [
          el("li", { text: "Fill in Blanks: Players take turns filling in descriptive blanks (nouns, verbs, adjectives) to weave a unique lakeside story." }),
          el("li", { text: "Cooperative Illustration: Once the story is written, it gets broken up into sentences. Each player is secretly assigned a single sentence to illustrate!" }),
          el("li", { text: "Cozy Showcase: Finally, review the collaborative masterpiece together page-by-page as a synced slideshow book, complete with all your funny drawings and text!" })
        ])
      ]);
      showRulesBtn.parentNode.insertBefore(rPanel, showRulesBtn.nextSibling);
    }
  });

  const localStartBtn = el("button", {
    className: "btn",
    text: "Start Cozy Chronicles",
    style: "width:100%;",
    onClick: () => {
      const cleaned = localNamesList.map((n, idx) => n.trim() || `Player ${idx + 1}`).slice(0, 8);
      if (cleaned.length < 3) {
        toast("Need at least 3 players.");
        return;
      }
      startLocalGame(cleaned);
    }
  });

  // Toggles for Setup Mode
  const modeSelector = el("div", {
    style: "display:flex; background:rgba(255,255,255,0.04); border-radius:14px; padding:4px; margin-bottom:20px; width:100%;"
  });

  const tabLocal = el("button", {
    className: setupMode === "passplay" ? "btn small" : "btn ghost small",
    text: "🔄 Pass & Play",
    style: "flex:1; margin:0; font-size:0.85rem; padding: 8px 0; border:none; box-shadow:none;",
    onClick: () => {
      setupMode = "passplay";
      tabLocal.className = "btn small";
      tabOnline.className = "btn ghost small";
      renderSetupForm();
    }
  });

  const tabOnline = el("button", {
    className: setupMode === "online" ? "btn small" : "btn ghost small",
    text: "📱 Online Room",
    style: "flex:1; margin:0; font-size:0.85rem; padding: 8px 0; border:none; box-shadow:none;",
    onClick: () => {
      setupMode = "online";
      tabLocal.className = "btn ghost small";
      tabOnline.className = "btn small";
      renderSetupForm();
    }
  });

  modeSelector.appendChild(tabLocal);
  modeSelector.appendChild(tabOnline);

  const dynamicFormWrap = el("div", { style: "width:100%;" });

  function renderSetupForm() {
    dynamicFormWrap.innerHTML = "";
    if (setupMode === "passplay") {
      drawLocalList();
      [
        localListWrap,
        addPlayerBtn,
        localStartBtn
      ].forEach(child => dynamicFormWrap.appendChild(child));
    } else {
      const onlineLayout = el("div", { style: "width:100%;" }, [
        nameInput,
        el("button", {
          className: "btn",
          text: "Create Room",
          style: "width:100%; margin-bottom:10px;",
          onClick: () => {
            const n = getName();
            if (n) { myName = n; connectRoom("create"); }
          }
        }),
        el("div", { style: "display:flex; gap:8px; align-items:center; width:100%; margin: 8px 0;" }, [
          el("hr", { style: "flex:1; border:none; border-top:1px solid rgba(255,255,255,0.06);" }),
          el("span", { text: "OR JOIN EXISTING", className: "muted", style: "font-size:0.75rem; letter-spacing:1px;" }),
          el("hr", { style: "flex:1; border:none; border-top:1px solid rgba(255,255,255,0.06);" })
        ]),
        codeInput,
        el("button", {
          className: "btn ghost",
          text: "Join Room",
          style: "width:100%; margin-bottom:10px;",
          onClick: () => {
            const n = getName();
            const code = codeInput.value.trim().toUpperCase();
            if (!code || code.length !== 4) { toast("Enter a valid 4-letter room code!"); return; }
            if (n) { myName = n; connectRoom("join", code); }
          }
        }),
        el("button", {
          className: "btn ghost small",
          text: "🌐 Browse Open Rooms",
          style: "width:100%; margin-top: 8px;",
          onClick: () => renderRoomBrowser()
        })
      ]);
      dynamicFormWrap.appendChild(onlineLayout);
    }
  }

  mount(
    gameTopbar("Cozy Chronicles Setup", () => { resetAll(); goHome(); }),
    el("div", { className: "panel center", style: "max-width: 440px; margin: 0 auto;" }, [
      el("div", { style: "width:64px; height:64px; margin:0 auto 12px; color:var(--sunset-soft);" }, [icons.pen()]),
      el("h2", { text: "Cozy Chronicles", style: "margin-bottom: 4px;" }),
      el("p", { 
        className: "muted", 
        style: "margin-bottom:20px;", 
        text: "Illustrated Storybook party game! Cooperatively fill in the blanks, secretly illustrate assigned sentences, and reveal a synced slideshow at the end!" 
      }),
      showRulesBtn,
      modeSelector,
      dynamicFormWrap
    ])
  );

  renderSetupForm();
}

function renderRoomBrowser() {
  const listEl = el("div", { style: "display:flex; flex-direction:column; gap:8px; margin: 12px 0;" });

  const loadRooms = async () => {
    try {
      listEl.innerHTML = `<p class="muted center" style="margin:16px 0;">Loading active rooms…</p>`;
      const res = await fetch(`${HTTP_BASE}/rooms/list?game=chronicles`).then(r => r.json());
      listEl.innerHTML = "";
      if (res.length === 0) {
        listEl.innerHTML = `<p class="muted center" style="margin:16px 0;">No active public rooms found. Create one!</p>`;
        return;
      }
      res.forEach(r => {
        const info = el("div", { style: "text-align: left;" }, [
          el("div", { html: `Room <strong style="color:var(--sunset-soft);">${r.code}</strong> • Host: ${r.host}` }),
          el("div", { className: "muted", style: "font-size: 0.75rem;", text: `${r.playerCount} players active` })
        ]);
        const row = el("div", { className: "room-row" }, [
          info,
          el("button", {
            className: "btn small",
            style: "margin:0; padding:6px 14px;",
            text: "Join",
            onClick: () => {
              clearInterval(roomBrowserRefresh);
              connectRoom("join", r.code);
            }
          })
        ]);
        listEl.appendChild(row);
      });
    } catch (_) {
      listEl.innerHTML = `<p class="muted center" style="margin:16px 0;">Failed to fetch rooms.</p>`;
    }
  };

  loadRooms();
  roomBrowserRefresh = setInterval(loadRooms, 3000);

  mount(
    gameTopbar("Open Chronicles Rooms", () => { clearInterval(roomBrowserRefresh); renderSetup(); }),
    el("div", { className: "panel center" }, [
      el("p", { className: "muted", style: "margin:0; font-size:0.82rem;", text: "Tap Join to enter any open Cozy Chronicles lobby." })
    ]),
    el("div", { className: "panel" }, [listEl])
  );
}

// ── WebSockets Networking ──────────────────────────────────────────────────
function connectRoom(type, code = "") {
  mount(
    gameTopbar("Connecting", () => { resetAll(); renderSetup(); }),
    el("div", { className: "panel center", style: "margin:30px auto; max-width:320px;" }, [
      el("div", { className: "spin-indicator", style: "font-size:2rem; margin-bottom:12px;", text: "🌀" }),
      el("p", { text: type === "create" ? "Creating room…" : `Joining ${code}…` })
    ])
  );

  const url = type === "create"
    ? `${WS_BASE}/ws/create?name=${encodeURIComponent(myName)}&game=chronicles`
    : `${WS_BASE}/ws/join?code=${code}&name=${encodeURIComponent(myName)}&game=chronicles`;

  isHost = (type === "create");
  socket = new WebSocket(url);

  socket.onmessage = (ev) => {
    try {
      const d = JSON.parse(ev.data);
      if (d.type === "created" || d.type === "player_joined") {
        roomCode = d.code;
        // If server stored a different name (e.g. "Guest" for empty-name join), sync myName
        if (!isHost && d.type === "player_joined" && d.name && !d.players.includes(myName)) {
          myName = d.name;
          localStorage.setItem("lakehouse.playerName", myName);
        }
        applyLobby(d.players);
      } else if (d.type === "player_left") {
        applyLobby(d.players);
        if (gState?.phase !== "lobby") toast(`${d.name} left the room.`);
      } else if (d.type === "relay") {
        handleRelay(d.action, d.sender);
      } else if (d.type === "error") {
        toast(d.message || "Connection error");
        resetAll();
        renderSetup();
      }
    } catch (e) {
      console.error("[Chronicles] Parse error:", e);
    }
  };

  socket.onclose = () => {
    stopHeartbeat();
    if (gState && gState.phase !== "done") {
      toast("Disconnected from room.");
      resetAll();
      renderSetup();
    }
  };
}

function relay(action) {
  if (!socket || socket.readyState !== 1) return;
  socket.send(JSON.stringify({ type: "relay", code: roomCode, sender: myName, action }));
  if (typeof handleRelay === "function") handleRelay(action, myName);
}

function startHeartbeat(playerCount = 1) {
  stopHeartbeat();
  const ping = () => fetch(`${HTTP_BASE}/rooms/heartbeat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: roomCode, playerCount: gState?.players?.length || playerCount })
  }).catch(() => {});
  ping();
  heartbeatInt = setInterval(ping, 5000);
}

function stopHeartbeat() {
  if (heartbeatInt) { clearInterval(heartbeatInt); heartbeatInt = null; }
}

async function registerRoom() {
  try {
    await fetch(`${HTTP_BASE}/rooms/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: roomCode, host: myName, playerCount: gState?.players?.length || 1,
        game: "chronicles", private: false,
        lastPing: Date.now()
      }),
    });
  } catch (_) {}
}

// ── Lobby Phase ─────────────────────────────────────────────────────────────
function applyLobby(players) {
  gState = { phase: "lobby", players };
  myIdx = players.indexOf(myName);

  if (isHost && roomCode) {
    registerRoom();
    startHeartbeat(players.length);
  }
  renderLobby();
}

function renderLobby() {
  const players = gState.players;
  const list = el("div", { className: "scoreboard", style: "margin: 16px 0;" });
  
  players.forEach((p, i) => {
    list.appendChild(el("div", {
      className: "score-row",
      style: "display:flex; justify-content:space-between; padding:8px 12px; background:rgba(255,255,255,0.02); border-radius:10px; margin-bottom:8px;"
    }, [
      el("span", { text: `${i + 1}. ${p}${p === myName ? " (You)" : ""}`, style: "font-weight: 500;" }),
      i === 0 
        ? el("span", { className: "badge", text: "HOST", style: "background:rgba(255,145,100,0.1); color:var(--sunset-soft);" })
        : el("span", { className: "badge", text: "READY", style: "background:rgba(0,250,150,0.1); color:#00ffaa;" })
    ]));
  });

  const startBtn = isHost
    ? el("button", {
        className: "btn",
        text: "Start Cozy Chronicles",
        style: "width:100%;",
        onClick: () => {
          if (players.length < 3) {
            toast("⚠️ Need at least 3 players to start Chronicles!");
            return;
          }
          triggerGameStart();
        }
      })
    : el("div", { className: "muted center", text: "Waiting for host to start..." });

  mount(
    gameTopbar(`Room Code: ${roomCode}`, () => confirmQuitLobby()),
    el("div", { className: "panel center", style: "max-width: 480px; margin: 0 auto;" }, [
      el("h2", { text: "Cozy Chronicles Lobby" }),
      el("p", { className: "muted", text: "Gather 3 to 8 players. Each person will enter a secret word on their own screen, illustrate their sentence, and share the story book at the end!" }),
      list,
      el("div", { className: "spacer" }),
      startBtn
    ])
  );
}

function triggerGameStart() {
  const N = gState.players.length;
  const clampedN = Math.max(3, Math.min(8, N));
  const availableStories = STORIES[clampedN];
  const storyObj = availableStories[Math.floor(Math.random() * availableStories.length)];

  // Shuffle player indices to assign random blanks
  const shuffledPlayers = shuffle(gState.players.slice());

  // Distribute blanks round-robin to all players
  const assignments = {};
  gState.players.forEach(pName => {
    assignments[pName] = [];
  });

  storyObj.blanks.forEach((blank, idx) => {
    const pName = shuffledPlayers[idx % shuffledPlayers.length];
    assignments[pName].push(blank);
  });

  const gameInitData = {
    type: "CHRONICLES_START",
    storyTitle: storyObj.title,
    rawSentences: storyObj.sentences,
    blanks: storyObj.blanks,
    assignments
  };

  relay(gameInitData);
}

// ── Relay Action Coordination Router ─────────────────────────────────────────
function handleRelay(action, sender) {
  if (action.type === "CHRONICLES_START") {
    gState = {
      phase: "madlibs",
      players: gState.players,
      storyTitle: action.storyTitle,
      rawSentences: action.rawSentences,
      blanks: action.blanks,
      myBlanks: action.assignments[gState.players[myIdx] ?? myName] || [],
      madlibsAnswers: {}, // key -> word
      drawings: {}, // player -> dataUrl
      submittedAnswersCount: 0,
      submittedDrawingsCount: 0
    };
    renderMadLibPhase();
  } 
  
  else if (action.type === "CHRONICLES_SUBMIT_WORD") {
    gState.madlibsAnswers[action.key] = action.val;
    gState.submittedAnswersCount = Object.keys(gState.madlibsAnswers).length;

    const waitingEl = document.getElementById("madlibs-waiting");
    if (waitingEl) {
      waitingEl.textContent = `Submitted: ${gState.submittedAnswersCount} / ${gState.blanks.length} words`;
    }

    if (isHost) {
      const allWordsIn = Object.keys(gState.madlibsAnswers).length === gState.blanks.length;
      if (allWordsIn) {
        // Compile the story and distribute sentences!
        // Alice gets sentence 1, Bob gets sentence 2, etc. (round-robin)
        const compiled = gState.rawSentences.map(sentence => {
          let temp = sentence;
          Object.entries(gState.madlibsAnswers).forEach(([k, v]) => {
            temp = temp.replaceAll(`{${k}}`, `<span style="color:#00ffaa; text-shadow:0 0 4px rgba(0,255,170,0.25);">${v}</span>`);
          });
          return temp;
        });

        const drawingAssignments = {};
        gState.players.forEach((pName, pIdx) => {
          drawingAssignments[pName] = compiled[pIdx % compiled.length];
        });

        const compiledPayload = {
          type: "CHRONICLES_COMPILED",
          compiledSentences: compiled,
          drawingAssignments
        };
        
        relay(compiledPayload);
      }
    }
  }

  else if (action.type === "CHRONICLES_COMPILED") {
    gState.phase = "illustrate";
    gState.compiledSentences = action.compiledSentences;
    gState.mySentence = action.drawingAssignments[gState.players[myIdx] ?? myName];
    renderIllustratePhase();
  }

  else if (action.type === "CHRONICLES_SUBMIT_DRAWING") {
    gState.drawings[action.player] = action.dataUrl;
    gState.submittedDrawingsCount = Object.keys(gState.drawings).length;

    // Show progress updates
    const waitingEl = document.getElementById("illustrate-waiting");
    if (waitingEl) {
      waitingEl.textContent = `Submitted: ${gState.submittedDrawingsCount} / ${gState.players.length} players`;
    }

    if (isHost) {
      const allDrawingsIn = Object.keys(gState.drawings).length === gState.players.length;
      if (allDrawingsIn) {
        // All drawings received! Distribute final slide compilation
        const reviewPayload = {
          type: "CHRONICLES_REVIEW",
          finalDrawings: gState.players.map(pName => gState.drawings[pName]) // aligned to compiledSentences
        };
        relay(reviewPayload);
      }
    }
  }

  else if (action.type === "CHRONICLES_REVIEW") {
    gState.phase = "review";
    gState.finalDrawings = action.finalDrawings;
    gState.activeSlideIdx = 0;
    renderReviewPhase();
  }

  else if (action.type === "CHRONICLES_NEXT_SLIDE") {
    gState.activeSlideIdx = action.slideIdx;
    renderReviewPhase();
  }
}

// ── Online Mad Libs Input ────────────────────────────────────────────────────
function renderMadLibPhase() {
  const blanks = gState.myBlanks || [];
  
  if (blanks.length === 0) {
    mount(
      gameTopbar("Mad Libs", () => confirmQuitOnline()),
      el("div", { className: "panel center", style: "max-width: 400px; margin: 30px auto;" }, [
        el("div", { className: "spin-indicator", style: "font-size:2rem; margin-bottom:12px;", text: "⏳" }),
        el("h3", { text: "Awaiting other players..." }),
        el("p", { className: "muted", text: "You don't have a blank to fill for this story length. Relax, you'll get a sentence to draw soon!" }),
        el("div", { id: "madlibs-waiting", style: "font-size:0.9rem; font-weight:bold; color:var(--sunset-soft); margin-top:8px;", text: `Submitted: ${gState.submittedAnswersCount} / ${gState.blanks.length} words` })
      ])
    );
    return;
  }

  // Create an array of input elements
  const inputs = [];
  const formFields = blanks.map(blank => {
    const inputEl = el("input", {
      type: "text",
      placeholder: `Enter a ${blank.label.toLowerCase()}...`,
      maxlength: "20",
      style: "font-size: 1.2rem; border-radius:14px; text-align:center; margin-bottom:14px; width:100%;"
    });
    inputs.push({ key: blank.key, label: blank.label, element: inputEl });
    
    return el("div", { style: "text-align: left; width: 100%; margin-bottom: 12px;" }, [
      el("label", { text: blank.label, style: "font-size:0.85rem; font-weight:bold; color:var(--sunset-soft); display:block; margin-bottom:4px;" }),
      inputEl
    ]);
  });

  const submitBtn = el("button", {
    className: "btn",
    text: blanks.length > 1 ? "Submit Words" : "Submit Word",
    style: "width:100%; margin-top:10px;",
    onClick: () => {
      // Validate all inputs
      const answers = [];
      for (const item of inputs) {
        const val = item.element.value.trim();
        if (!val) {
          toast(`Please fill in: ${item.label}!`);
          item.element.focus();
          return;
        }
        answers.push({ key: item.key, val: val });
      }

      // Disable inputs and button
      submitBtn.disabled = true;
      inputs.forEach(item => { item.element.disabled = true; });

      // Show waiting screen BEFORE relaying — prevents the waiting mount()
      // from overwriting an illustrate screen that the relay echo may have
      // already rendered (e.g. when the host completes the last blank).
      mount(
        gameTopbar("Mad Libs", () => confirmQuitOnline()),
        el("div", { className: "panel center", style: "max-width: 400px; margin: 30px auto;" }, [
          el("div", { className: "spin-indicator", style: "font-size:2rem; margin-bottom:12px;", text: "⏳" }),
          el("h3", { text: blanks.length > 1 ? "Words Submitted!" : "Word Submitted!" }),
          el("p", { className: "muted", text: "Waiting for all other players to complete their blanks..." }),
          el("div", { id: "madlibs-waiting", style: "font-size:0.9rem; font-weight:bold; color:var(--sunset-soft); margin-top:8px;", text: `Submitted: ${gState.submittedAnswersCount} / ${gState.blanks.length} words` })
        ])
      );

      // Relay each word — if this completes all blanks, the echo will call
      // renderIllustratePhase() and replace the waiting screen correctly.
      answers.forEach(ans => {
        relay({
          type: "CHRONICLES_SUBMIT_WORD",
          key: ans.key,
          val: ans.val
        });
      });
    }
  });

  mount(
    gameTopbar("Cozy Chronicles — Mad Libs", () => confirmQuitOnline()),
    el("div", { className: "panel center", style: "max-width: 480px; margin: 0 auto; overflow-y: auto; max-height: calc(100vh - 100px);" }, [
      el("h3", { text: blanks.length > 1 ? "Your Secret Blanks" : "Your Secret Blank", style: "color:var(--sunset-soft); margin-top:0;" }),
      el("p", { className: "muted", text: "Once everyone locks in their words, the custom sentences are compiled and distributed!" }),
      ...formFields,
      submitBtn
    ])
  );
  if (inputs.length > 0) inputs[0].element.focus();
}

// ── Online Illustrate Phase ──────────────────────────────────────────────────
function renderIllustratePhase() {
  const sentence = gState.mySentence;

  if (!sentence) {
    mount(
      gameTopbar("Illustrating", () => confirmQuitOnline()),
      el("div", { className: "panel center", style: "max-width: 400px; margin:30px auto;" }, [
        el("div", { className: "spin-indicator", style: "font-size:2rem; margin-bottom:12px;", text: "⏳" }),
        el("h3", { text: "Waiting for other illustrators..." })
      ])
    );
    return;
  }

  const canvas = el("canvas", {
    style: "background:#112228; border:1px solid rgba(255,255,255,0.1); border-radius:12px; touch-action:none; width:100%; display:block; cursor:crosshair; box-shadow:inset 0 2px 8px rgba(0,0,0,0.5);"
  });

  const undoBtn = el("button", { className: "btn ghost small", text: "Undo", style: "margin:0;" });
  const clearBtn = el("button", { className: "btn ghost small error", text: "Clear", style: "margin:0;" });

  const colors = ["#ff9164", "#00ffaa", "#38bdf8", "#facc15", "#f3f4f6", "#0b1619"];
  const colorLabels = ["Sunset", "Aqua", "Sky", "Lemon", "White", "Eraser"];
  let activeColor = colors[0];

  const colorRow = el("div", { style: "display:flex; gap:6px; justify-content:center; flex-wrap:wrap; margin-bottom:8px;" });
  colors.forEach((c, idx) => {
    const isEraser = c === "#0b1619";
    const btn = el("button", {
      className: idx === 0 ? "btn small" : "btn ghost small",
      text: colorLabels[idx],
      style: `padding: 4px 10px; margin:0; border: 1px solid ${c}; background: ${isEraser ? '#0b1619' : 'transparent'}; color: ${isEraser ? '#fff' : c};`,
      onClick: () => {
        activeColor = c;
        Array.from(colorRow.children).forEach(b => b.classList.add("ghost"));
        btn.classList.remove("ghost");
      }
    });
    colorRow.appendChild(btn);
  });

  let activeBrushSize = 5;
  const brushRow = el("div", { style: "display:flex; gap:8px; justify-content:center; margin-bottom:12px;" });
  [3, 6, 12].forEach((size, sIdx) => {
    const btn = el("button", {
      className: sIdx === 1 ? "btn small" : "btn ghost small",
      text: size === 3 ? "Thin" : (size === 6 ? "Medium" : "Thick"),
      style: "padding: 4px 12px; margin:0;",
      onClick: () => {
        activeBrushSize = size;
        Array.from(brushRow.children).forEach(b => b.classList.add("ghost"));
        btn.classList.remove("ghost");
      }
    });
    brushRow.appendChild(btn);
  });

  const submitBtn = el("button", {
    className: "btn",
    text: "Submit Drawing",
    onClick: () => {
      const dataUrl = canvas.toDataURL("image/png", 0.4);
      submitBtn.disabled = true;

      const action = {
        type: "CHRONICLES_SUBMIT_DRAWING",
        player: myName,
        dataUrl: dataUrl
      };

      // Show waiting screen BEFORE relaying — same reason as CHRONICLES_SUBMIT_WORD:
      // if this completes all drawings, the relay echo fires CHRONICLES_REVIEW which
      // mounts the slideshow; that overrides this waiting screen correctly.
      mount(
        gameTopbar("Cozy Chronicles — Illustrating", () => confirmQuitOnline()),
        el("div", { className: "panel center", style: "max-width: 440px; margin: 30px auto;" }, [
          el("div", { className: "spin-indicator", style: "font-size:2rem; margin-bottom:12px;", text: "⏳" }),
          el("h3", { text: "Drawing Submitted!" }),
          el("p", { className: "muted", text: "Waiting for all other players to complete their drawings..." }),
          el("div", { id: "illustrate-waiting", style: "font-size:0.9rem; font-weight:bold; color:var(--sunset-soft); margin-top:8px;", text: `Submitted: ${gState.submittedDrawingsCount} / ${gState.players.length} players` })
        ])
      );

      relay(action);
    }
  });

  const drawingLayout = el("div", { className: "panel center", style: "max-width: 500px; margin: 0 auto;" }, [
    el("blockquote", {
      html: `Your assigned sentence to draw:<br><strong style="font-size:1.15rem; color:#fff;">"${sentence}"</strong>`,
      style: "margin: 8px 0 16px; line-height: 1.4; border-left: none; padding: 0;"
    }),
    canvas,
    el("div", { style: "display:flex; gap:8px; justify-content:center; margin: 8px 0;" }, [undoBtn, clearBtn]),
    colorRow,
    brushRow,
    submitBtn
  ]);

  mount(gameTopbar("Cozy Chronicles — Draw", () => confirmQuitOnline()), drawingLayout);

  setupDrawingCanvas(canvas, undoBtn, clearBtn, () => activeColor, () => activeBrushSize);
}

function setupDrawingCanvas(canvas, undoBtn, clearBtn, getColor, getBrushSize) {
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const W = rect.width || 400;
  const H = 250;
  canvas.width = W * window.devicePixelRatio;
  canvas.height = H * window.devicePixelRatio;
  canvas.style.height = `${H}px`;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  let drawing = false;
  let strokeHistory = [];
  let currentStroke = [];

  function drawStart(x, y) {
    drawing = true;
    currentStroke = [{ x, y }];
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = getColor();
    ctx.lineWidth = getBrushSize();
    ctx.stroke();
  }

  function drawMove(x, y) {
    if (!drawing) return;
    currentStroke.push({ x, y });
    ctx.lineTo(x, y);
    ctx.strokeStyle = getColor();
    ctx.lineWidth = getBrushSize();
    ctx.stroke();
  }

  function drawEnd() {
    if (!drawing) return;
    drawing = false;
    strokeHistory.push({
      stroke: currentStroke,
      color: getColor(),
      size: getBrushSize()
    });
  }

  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    const r = canvas.getBoundingClientRect();
    drawStart(e.clientX - r.left, e.clientY - r.top);
  });
  canvas.addEventListener("pointermove", (e) => {
    e.preventDefault();
    if (!drawing) return;
    const r = canvas.getBoundingClientRect();
    drawMove(e.clientX - r.left, e.clientY - r.top);
  });
  const endStroke = (e) => {
    e.preventDefault();
    drawEnd();
  };
  canvas.addEventListener("pointerup", endStroke);
  canvas.addEventListener("pointercancel", endStroke);

  clearBtn.addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokeHistory = [];
  });

  undoBtn.addEventListener("click", () => {
    if (strokeHistory.length === 0) return;
    strokeHistory.pop();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokeHistory.forEach(item => {
      ctx.beginPath();
      ctx.strokeStyle = item.color;
      ctx.lineWidth = item.size;
      item.stroke.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
    });
  });
}

// ── Synchronized Slideshow Review Phase ───────────────────────────────────────
function renderReviewPhase() {
  const slideIdx = gState.activeSlideIdx;

  if (slideIdx >= gState.finalDrawings.length) {
    renderFinalScorecard();
    return;
  }

  const sentenceHtml = gState.compiledSentences[slideIdx % gState.compiledSentences.length];
  const drawingUrl = gState.finalDrawings[slideIdx];
  const illustrator = gState.players[slideIdx];

  const slideWrap = el("div", {
    className: "panel center fade-in",
    style: "background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 16px; width: 100%; min-height: 320px;"
  }, [
    el("div", {
      text: `Illustration ${slideIdx + 1}/${gState.finalDrawings.length} • Illustrated by ${illustrator}`,
      style: "font-size: 0.75rem; color: var(--sunset-soft); text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px; margin-bottom: 12px;"
    }),
    el("img", {
      src: drawingUrl,
      style: "background: #112228; border-radius: 12px; width: 100%; max-height: 260px; object-fit: contain; margin-bottom: 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.5);"
    }),
    el("blockquote", {
      html: `"${sentenceHtml}"`,
      style: "font-size: 1.3rem; font-weight: bold; margin: 0; line-height: 1.4; border-left: none; padding: 0; text-align: center; color:#fff;"
    })
  ]);

  const hasMore = slideIdx + 1 < gState.finalDrawings.length;
  
  let nextBtn = null;
  if (isHost || !isOnline) {
    nextBtn = el("button", {
      className: "btn",
      text: hasMore ? "Read Next Page ➜" : "Close Storybook 📖",
      onClick: () => {
        const nextIdx = slideIdx + 1;
        if (isOnline) {
          relay({
            type: "CHRONICLES_NEXT_SLIDE",
            slideIdx: nextIdx
          });
        }
        gState.activeSlideIdx = nextIdx;
        renderReviewPhase();
      }
    });
  } else {
    nextBtn = el("div", { className: "muted center", text: "Waiting for host to flip page..." });
  }

  mount(
    gameTopbar(`Chronicles — "${gState.storyTitle}"`, () => confirmQuitOnline()),
    el("div", { className: "panel center", style: "max-width: 520px; margin: 0 auto;" }, [
      slideWrap,
      el("div", { className: "spacer" }),
      nextBtn
    ])
  );
}

async function saveChroniclesGallery() {
  if (!gState?.finalDrawings?.length) return;
  try {
    const chains = gState.finalDrawings.map((drawing, i) => [
      { type: "text", content: gState.compiledSentences[i % gState.compiledSentences.length] },
      { type: "draw", content: drawing }
    ]);
    const game = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      date: new Date().toISOString(),
      players: gState.players,
      storyTitle: gState.storyTitle,
      isChronicles: true,
      isMonkey: false,
      settings: { rounds: 1 },
      chains,
    };
    await fetch(`${HTTP_BASE}/gartic/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(game),
      signal: AbortSignal.timeout(20000),
    });
    console.log("[Chronicles] ✓ Saved to gallery.");
  } catch (e) {
    console.warn("[Chronicles] Gallery save failed:", e.message);
  }
}

function renderFinalScorecard() {
  // Save to gallery when host reaches the end (only once)
  if (isHost || !isOnline) saveChroniclesGallery();

  mount(
    gameTopbar("Chronicles — Story Complete", () => { resetAll(); renderSetup(); }),
    el("div", { className: "panel center", style: "max-width: 480px; margin: 0 auto;" }, [
      el("h1", { text: "The End!", style: "color: var(--sunset-soft); font-size: 2.5rem; font-weight: 900; margin-top:0;" }),
      el("blockquote", {
        html: `You have successfully completed and self-illustrated:<br><strong style="color:#00ffaa; font-size:1.25rem;">"${gState.storyTitle}"</strong>`,
        style: "border-left: none; padding: 0; text-align: center; margin: 16px 0;"
      }),
      el("p", { className: "muted", text: "A legendary collaborative illustrated chronicles is born!" }),
      el("div", { className: "spacer" }),
      el("button", {
        className: "btn",
        text: "View in Gallery 🖼️",
        style: "margin-bottom:8px;",
        onClick: () => { resetAll(); renderSetup(); }
      }),
      el("button", {
        className: "btn ghost small",
        text: "Back to Lobby",
        onClick: () => { resetAll(); renderSetup(); }
      })
    ])
  );
}

function confirmQuitLobby() {
  if (confirm("Leave this lobby and disconnect?")) {
    resetAll();
    renderSetup();
  }
}

function confirmQuitOnline() {
  if (confirm(isOnline ? "Disconnect and quit Cozy Chronicles?" : "Quit Cozy Chronicles?")) {
    resetAll();
    renderSetup();
  }
}

// ── Pass & Play Local Game Engine Helpers ─────────────────────────────────────
function renderPassDeviceScreen(pName, actionText, onConfirm) {
  mount(
    gameTopbar("Cozy Chronicles — Pass & Play", () => confirmQuitPassPlay()),
    el("div", { className: "panel center", style: "max-width: 480px; margin: 30px auto; padding: 24px;" }, [
      el("h2", { text: `Pass the iPad!` }),
      el("p", { 
        className: "muted", 
        style: "font-size: 1.15rem; margin: 20px 0; line-height: 1.5;", 
        html: `Hand the device secretly to <strong style="color:var(--sunset-soft); font-size: 1.35rem;">${pName}</strong> to <strong style="color:var(--sunset-soft);">${actionText}</strong>.` 
      }),
      el("p", { className: "muted", style: "font-size: 0.85rem; display:block; margin-bottom: 20px;", text: "Ensure no other players can see your screen during your turn!" }),
      el("button", {
        className: "btn",
        text: "I am ready",
        onClick: onConfirm
      })
    ])
  );
}

function confirmQuitPassPlay() {
  if (confirm("Quit this Cozy Chronicles game?")) {
    resetAll();
    renderSetup();
  }
}

function startLocalGame(playersList) {
  isOnline = false;
  localPlayers = playersList;
  passPlayState = {
    currentStage: "pass",
    currentIdx: 0,
    phase: "madlibs"
  };

  const N = localPlayers.length;
  const clampedN = Math.max(3, Math.min(8, N));
  const availableStories = STORIES[clampedN];
  const storyObj = availableStories[Math.floor(Math.random() * availableStories.length)];

  // Shuffle players to assign random blanks
  const shuffledPlayers = shuffle(localPlayers.slice());

  const assignments = {};
  localPlayers.forEach(pName => {
    assignments[pName] = [];
  });

  storyObj.blanks.forEach((blank, idx) => {
    const pName = shuffledPlayers[idx % shuffledPlayers.length];
    assignments[pName].push(blank);
  });

  gState = {
    phase: "madlibs",
    players: localPlayers,
    storyTitle: storyObj.title,
    rawSentences: storyObj.sentences,
    blanks: storyObj.blanks,
    assignments: assignments,
    madlibsAnswers: {},
    drawings: {},
    submittedAnswersCount: 0,
    submittedDrawingsCount: 0
  };

  // Start with Pass the Device screen for Player 0
  triggerLocalMadLibPass();
}

function triggerLocalMadLibPass() {
  const pName = localPlayers[passPlayState.currentIdx];
  const myBlanks = gState.assignments[pName] || [];
  
  if (myBlanks.length === 0) {
    // Skip if no blanks (e.g. N > 8)
    passPlayState.currentIdx++;
    if (passPlayState.currentIdx < localPlayers.length) {
      triggerLocalMadLibPass();
    } else {
      compileLocalStory();
    }
    return;
  }

  renderPassDeviceScreen(pName, "fill in their secret blanks", () => {
    gState.myBlanks = myBlanks;
    renderMadLibPhase();
  });
}

function compileLocalStory() {
  const compiled = gState.rawSentences.map(sentence => {
    let temp = sentence;
    Object.entries(gState.madlibsAnswers).forEach(([k, v]) => {
      temp = temp.replaceAll(`{${k}}`, `<span style="color:#00ffaa; text-shadow:0 0 4px rgba(0,255,170,0.25);">${v}</span>`);
    });
    return temp;
  });

  const drawingAssignments = {};
  localPlayers.forEach((pName, pIdx) => {
    drawingAssignments[pName] = compiled[pIdx % compiled.length];
  });

  gState.compiledSentences = compiled;
  gState.drawingAssignments = drawingAssignments;
  
  passPlayState.phase = "illustrate";
  passPlayState.currentIdx = 0;
  triggerLocalIllustratePass();
}

function triggerLocalIllustratePass() {
  const pName = localPlayers[passPlayState.currentIdx];
  renderPassDeviceScreen(pName, "illustrate their secret sentence", () => {
    gState.mySentence = gState.drawingAssignments[pName];
    renderIllustratePhase();
  });
}
