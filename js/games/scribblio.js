// Modular Scribbl.io game engine supporting Local Pass & Play and WebSockets Online Room mode.
import { el, mount, toast, store, shuffle, HTTP_BASE, WS_BASE } from "../ui.js";
import { icons } from "../icons.js";





let goHome = () => {};
let socket = null;
let roomCode = "";
let myName = "";
let myPlayerIdx = -1;
let isHost = false;
let gState = null;
let heartbeatInt = null;
let roomBrowserRefresh = null;

let isOnline = false;
let setupMode = "passplay"; // "passplay" or "online"
let localNames = ["Alice", "Bob", "Charlie"];
let cleanupViewport = null;

// ── Shared AudioContext (reused to prevent CPU spikes) ─────────────────────
let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (_audioCtx.state === "suspended") {
    _audioCtx.resume();
  }
  return _audioCtx;
}

const WORD_POOL = [
  "Canoe", "Marshmallow", "Mosquito", "Campfire", "Sleeping bag", "Pinecone", "Dock", 
  "Squirrel", "Cabin", "Beaver", "Fishing rod", "Compass", "Life jacket", "Bear", 
  "Wildfire", "Watermelon", "Sunscreen", "Flip flops", "Paddle board", "Treehouse", 
  "Sunglasses", "Flashlight", "Hammock", "Hot dog", "Thermos", "Rainbow", "Fire pit",
  "Sailboat", "Bicycle", "Acorn", "Turtle", "Spider web", "Fountain", "Anchor",
  "Raccoon", "S'mores", "Binoculars", "Firefly", "Canteen", "Sunburn", "Jet Ski",
  "Lawnmower", "Backpack", "Goldfish", "Raincoat", "Thunderstorm", "Telescope",
  "Deck Chair", "Pebble", "Picnic", "Sandcastle", "Dolphin", "Seashell", "Sunflower",
  "BBQ Grill", "Map", "Boots", "Starfish", "Volcano", "Cloud", "Snail", "Feather",
  "Cactus", "Mushroom", "Tornado", "Igloo", "Submarine", "Spaceship", "Hot Air Balloon",
  "Helicopter", "Robot", "Castle", "Guitar", "Treasure Chest", "Trophy", "Butterfly",
  "Cottage", "Pineapple", "Watering Can", "Lollipop", "Popcorn", "Ice Cream", "Umbrella",
  "Snowman", "Kite", "Balloons", "Octopus", "Whale", "Shark", "Seahorse", "Jellyfish",
  "Parrot", "Monkey", "Tiger", "Lion", "Zebra", "Giraffe", "Elephant", "Penguin", "Koala",
  "Beaver in a tuxedo", "T-Rex making a bed", "Cat wearing a wizard hat", "Flamingo on a pogo stick",
  "Hamster running on a donut", "Squirrel stealing a laptop", "Dog driving a school bus", "Sloth riding a rocket",
  "Pigeon eating pizza slice", "Octopus playing the drums", "Shark in a bubble bath", "Giraffe with a short neck",
  "Elephant on a tightrope", "Penguin in a Hawaiian shirt", "Unicorn eating spaghetti", "Alien drinking a milkshake",
  "Bear doing yoga", "Owl wearing sunglasses", "Frog flying a helicopter", "Monkey typing on typewriter",
  "Gorilla on a unicycle", "Snail carrying a skyscraper", "Dolphin wearing a monocle", "Platypus playing golf",
  "Crab wearing boxing gloves", "Lobster in a hot tub", "Caterpillar wearing sneakers", "Chameleon painting a self-portrait",
  "Walrus brushing its teeth", "Ostrich burying head in sand", "Koala drinking bubble tea", "Panda sliding down a rainbow",
  "Rooster playing a guitar", "Pig doing a ballet dance", "Cow jumping over the moon", "Sheep getting a haircut",
  "Llama wearing a scarf", "Zebra with colorful stripes", "Fox drinking hot cocoa", "Raccoon washing a smartphone",
  "Moose driving a tractor", "Badger digging for treasure", "Turtle in a racing car", "Seahorse riding a bicycle",
  "Jellyfish wearing a top hat", "Parrot speaking into microphone", "Alligator on a skateboard", "Kangaroo carrying a laptop",
  "Lion getting a manicure", "Hippo doing a cannonball dive", "Unloading the dishwasher", "Awkward elevator silence",
  "Stepping on a Lego brick", "Tangled headphone wires", "Dropping toast butter-side down", "Forgetting your password",
  "Spilling coffee on a clean shirt", "Stubbing a pinky toe", "Opening a bag of chips loudly in library", "Looking for lost keys",
  "Stuck zipper on a winter coat", "Trying to sneeze but failing", "Wet socks on a rainy day", "Waving back at someone who was waving to someone else",
  "Running to catch a closing elevator door", "Awkward handshake that turns into a hug", "Trying to rip a perforated coupon cleanly", "Waiting for a slow loading screen",
  "Trying to find the end of a tape roll", "Biting your own tongue", "Getting brain freeze from ice cream",
  "Pumping gas and trying to stop exactly at a round dollar amount", "Assembling flat-pack furniture without instructions",
  "Struggling to open a plastic grocery bag", "Putting a USB drive in upside down twice", "Trying to parallel park with people watching",
  "A printer showing a paper jam error", "A tangled pile of power cords under the desk", "An umbrella blowing inside out",
  "Walking into a spiderweb across the path", "Ice cream cone melting too fast", "Hitting your funny bone on a table edge",
  "Trying to open a jar of pickles", "Wiping glasses only to make them smudgier", "Getting a popcorn kernel stuck in your teeth",
  "Pouring too much cereal into a tiny bowl", "The grocery cart with one squeaky broken wheel", "Slipping on an ice patch",
  "A very slow public transit bus", "Trying to write with a pen that is running out of ink", "Dropping a coin under the car seat",
  "Putting on a shirt inside out", "A fly that won't leave the room", "An overfilled trash can about to spill",
  "Waiting in a painfully long DMV line", "Squeezing the very last bit of toothpaste out", "Getting a papercut between your fingers",
  "Running out of toilet paper at the worst time", "Taking a sip of hot tea and burning your tongue", "Squeaky shoes in a silent hallway",
  "Looksmaxxing surgeon", "TikTok rizz party", "Skibidi toilet", "Sigma male grindset",
  "GigaChad chin", "Influencer doing an apology video", "ASMR soap cutting", "OnlyFans model for houseplants",
  "Cryptocurrency mining rig", "Meme lord on a throne", "Discord mod wearing a fedora", "iPad kid covered in sticky syrup",
  "Subway Surfers gameplay video split screen", "E-boy wearing a beanie", "VSCO girl holding a Hydroflask",
  "Hypebeast shoes made of gold", "Lofi hip hop radio girl studying", "NFT monkey in a fancy suit",
  "Vlogger with a circle light in eyes", "Selfie stick accident", "ASMR microphone being whispered into",
  "A green screen studio setup", "A highly detailed gamer chair", "Clickbait thumbnail with shocked face",
  "A glowing RGB keyboard", "A virtual reality headset on a cat", "A soundboard button being pressed repeatedly",
  "Unboxing video of a cardboard box", "A meme dog wearing sunglasses", "A viral dance in front of a phone",
  "A blue light blocking glass wearer", "A smartphone with a shattered screen", "A podcast microphone on a boom arm",
  "A hot tub streamer setup", "A gaming console overheating", "An internet router with blinking red lights",
  "An emoji keyboard with random symbols", "A digital drawing tablet with pen", "A smart watch displaying zero steps",
  "A livestream chat moving too fast to read", "A drone taking a scenic aerial selfie", "A suspicious looking email spam link",
  "A capybara taking a bath with lemons", "A goblin mode gamer eating chips in dark", "A gold chain on a pigeon",
  "A cybernetic enhancement monocle", "A futuristic hoverboard hovering over grass", "A high tech smart fridge displaying memes",
  "A meme cat screaming at salad", "A modern smart speaker listening silently", "Sleeping bag monster",
  "Ghost haunting a toaster", "Haunted grandfather clock with glowing eyes", "Witch flying on a vacuum cleaner",
  "Spooky campfire shadow", "Werewolf howling at a flashlight", "Ghostly pirate ship in a bottle", "Skeleton drinking milk",
  "Creepy doll sitting on a rocking chair", "Vampire avoiding garlic bread", "Mummy wrapped in toilet paper",
  "Haunted tree with a spooky face", "Flying bat carrying a tiny lantern", "Friendly ghost popping out of a mailbox",
  "Spooky floating glowing lantern", "Skeleton playing a bone flute", "Haunted house with glowing windows",
  "Witch brewing green potion in a cauldron", "Black cat with glowing purple eyes", "Jack o lantern with a funny mustache",
  "Ghost floating over a graveyard tombstone", "Werewolf getting a flea bath", "Mummy trying to untangle itself",
  "Zombie eating a brain shaped cake", "Vampire sleeping in a coffin with a nightlight", "A spooky scarecrow waving in a field",
  "A dark mysterious maze of hedges", "A glowing crystal ball showing a ghost", "A spooky grandfather clock striking midnight",
  "A mysterious cabinet that opens by itself", "A flying ghost sheet with sunglasses", "A spooky shadow under the bed",
  "A chest of drawers with monster teeth", "A skeleton wearing a winter beanie", "A haunted piano playing on its own",
  "A floating witch hat with no witch", "A mysterious key glowing blue", "A jar full of glowing spooky eyes",
  "A black cauldron spilling purple smoke", "A spooky looking gargoyle sitting on roof", "A mummy playing hopscotch",
  "A friendly spider wearing top hat", "A glowing green swamp monster", "A phantom ship sailing through clouds",
  "A skeleton doing a backflip", "A haunted mirror showing a funny reflection", "A spooky book that opens and whispers",
  "A ghost dog chasing a ghost bone", "A vampire checking its reflection in a mirror", "A witch broom parked next to a bicycle",
  "Pug wearing a raincoat", "Gopher in a construction helmet", "Cheetah wearing roller skates", "Platypus carrying a briefcase",
  "Polar bear wearing a grass skirt", "Goldfish bowl inside a giant fish", "Sloth swimming in a pool of jelly",
  "Squirrel with a magnifying glass", "Raccoon holding a magnifying glass", "Octopus wearing eight socks",
  "Walrus in a tutu doing ballet", "Hedgehog wearing a tiny party hat", "Flamingo playing a violin", "Otter juggling shiny seashells",
  "Chameleon blending into a disco ball", "Ostrich doing a karaoke song", "Badger eating spaghetti", "Beaver building a log cabin couch",
  "T-Rex trying to clap its hands", "Cat surfing on a slice of pizza", "Dolphin painting a picture on an easel",
  "Shark wearing a fancy monocle", "Koala riding a mechanical bull", "Panda playing a saxophone", "Frog sitting on a golden throne",
  "Gorilla knitting a tiny sweater", "Monkey using a metal detector on beach", "Meerkat looking through a telescope",
  "Pigeon wearing a gold crown", "Seahorse racing a snail", "Starfish playing a tambourine", "Turtle flying with balloon strings",
  "Owl reading a dictionary with a lamp", "Lion getting a stylish blow dry", "Tiger wearing pajamas", "Zebra playing checkers",
  "Giraffe painting the ceiling", "Elephant blowing a bubble gum bubble", "Penguin ice skating on a lake",
  "Hippopotamus in a giant pink inflatable tube", "Cactus wearing a woolen sweater", "Mushroom with a chimney exhaling smoke",
  "Pinecone flying like a rocket", "Watermelon slice wearing sunglasses", "Sunburn turning a ghost pink",
  "Hammock strung between two skyscrapers", "Hot Air Balloon shaped like a cat head", "Treasure Chest filled with rubber ducks",
  "Trophy cup overflowing with ice cream", "Lollipop growing on a giant flower stem", "An influencer crying with a filter on",
  "Unboxing a single tiny screw in a huge box", "Trying to fold a fitted sheet", "A modern smart watch telling you to stand up",
  "Spilling soup on a brand new keyboard", "A cat sitting directly on your computer keyboard", "An empty toilet paper roll on the holder",
  "A tangled mess of multi colored yarn", "Trying to sleep with a dripping faucet nearby", "A shopping cart with one squeaking wheel",
  "Stepping in a wet spot right after putting on fresh socks", "Trying to whisper but accidentally shouting", "A slice of pizza with the cheese sliding off completely",
  "An alarm clock ringing at 5am", "Struggling to find the cool side of the pillow", "Getting a brain freeze from a giant slushie",
  "Trying to plug in a cord behind a heavy couch", "A dog refusing to go outside in the rain", "A smartphone battery icon showing one percent",
  "A microwave that beeps aggressively when finished", "Stepping on a crunchy looking leaf that makes no sound", "Waiting for a slow elevator that stops on every single floor",
  "A drawer that is jammed shut by a ladle", "A cup of coffee that went cold before you could drink it", "Trying to lick your elbow",
  "A very loud car muffler waking up the neighborhood", "A fly that keeps landing on your forehead", "A computer mouse with a dying battery that jumps around",
  "A printer that prints a giant black streak across the page", "An umbrella that is missing one metal spoke", "A packet of instant noodles with no seasoning flavor packet",
  "A soda can tab that snaps off without opening the can", "A bag of potato chips that is ninety percent air", "A remote control with sticky buttons",
  "A white shirt with a ketchup stain", "An incredibly tangled string of holiday lights", "A banana that is slightly too green to peel",
  "A door that says pull but you pushed it", "A key that refuses to turn in the lock", "A barcode that won't scan at the self checkout",
  "A pen cap that you chewed on", "A sock that keeps sliding off inside your shoe", "A ceiling fan that wobbles violently on high speed",
  "A toaster that burns one side and leaves the other soft", "A milk carton that tears open the wrong way", "A soap bar that is so small it slips through your fingers",
  "A sticky note that lost its stickiness and fell off", "A screen protector with a giant air bubble in the middle", "A headphone ear pad that fell off and got lost",
  "An automatic faucet that won't turn on for your hands"
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
  resetAll();
  const __pj = (() => { try { return JSON.parse(sessionStorage.getItem("lakehouse.pendingJoin")||"null"); } catch(_) { return null; } })();
  if (__pj && __pj.game === "scribblio" && __pj.code && (Date.now() - __pj.ts) < 20000) {
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
  roomCode = ""; myName = ""; myPlayerIdx = -1; isHost = false; gState = null; isOnline = false;
  if (cleanupViewport) {
    try { cleanupViewport(); } catch (_) {}
    cleanupViewport = null;
  }
}

function renderSetup() {  const savedName = localStorage.getItem("lakehouse.playerName") || localStorage.getItem("scribblio.name") || "";
  const nameInput = el("input", {
    type: "text",
    placeholder: "Your name…",
    value: savedName,
    id: "s-name",
    style: "font-size:1.1rem; border-radius:14px; text-align:center; margin-bottom:14px; width:100%;"
  });

  const codeInput = el("input", {
    type: "text",
    placeholder: "4-LETTER CODE",
    id: "s-code",
    maxLength: 4,
    style: "font-size:1.3rem; border-radius:14px; text-align:center; text-transform:uppercase; letter-spacing:6px; margin-bottom:10px; width:100%;"
  });
  codeInput.addEventListener("input", () => { codeInput.value = codeInput.value.toUpperCase(); });

  const getName = () => {
    const n = nameInput.value.trim();
    if (!n) { toast("Enter your name first!"); return null; }
    localStorage.setItem("scribblio.name", n);
    localStorage.setItem("lakehouse.playerName", n);
    return n;
  };

  // Pass & Play Names List
  const savedNames = store.get("scribblio.localNames", ["", "", ""]);
  localNames = savedNames.slice();
  const localListWrap = el("div", { style: "margin: 16px 0; max-height:220px; overflow-y:auto; width:100%;" });

  function drawLocalList() {
    localListWrap.innerHTML = "";
    localNames.forEach((nm, i) => {
      const input = el("input", {
        type: "text",
        value: nm,
        maxlength: "14",
        placeholder: `Player ${i + 1}`,
        style: "flex:1; border-radius:12px; font-size:1rem; padding: 8px 12px; text-align:center;",
        onInput: (e) => { 
          localNames[i] = e.target.value; 
          store.set("scribblio.localNames", localNames);
        }
      });
      const row = el("div", { style: "display:flex; gap:8px; align-items:center; margin-bottom: 8px; width:100%;" }, [
        input,
        el("button", {
          className: "btn ghost small error",
          text: "✕",
          style: "margin:0; padding:6px 12px; border-radius:12px; font-size:1.1rem; line-height:1;",
          onClick: () => {
            if (localNames.length > 2) {
              localNames.splice(i, 1);
              store.set("scribblio.localNames", localNames);
              drawLocalList();
            } else {
              toast("Need at least 2 players.");
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
      if (localNames.length < 8) {
        localNames.push("");
        store.set("scribblio.localNames", localNames);
        drawLocalList();
      } else {
        toast("Max 8 players for local play.");
      }
    }
  });

  const startLocalBtn = el("button", {
    className: "btn",
    text: "Start Local Scribbl.io",
    style: "width:100%;",
    onClick: () => {
      const cleaned = localNames.map((n, idx) => n.trim() || `Player ${idx + 1}`).slice(0, 8);
      if (cleaned.length < 2) {
        toast("Scribbl.io needs at least 2 players.");
        return;
      }
      isOnline = false;
      initLocalGame(cleaned);
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
      [localListWrap, addPlayerBtn, startLocalBtn].forEach(c => dynamicFormWrap.appendChild(c));
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
          el("li", { text: "Artist Turn: The active drawer secretly chooses a secret word and starts painting on canvas!" }),
          el("li", { text: "Guessing: All other players watch the canvas in real time and type guesses in the chat input." }),
          el("li", { text: "Chat Synchronizations: The system automatically evaluates guesses. Getting it correct rewards points!" }),
          el("li", { text: "Timer Bonuses: Point value is based on the remaining seconds. Draw fast, guess faster!" })
        ])
      ]);
      showRulesBtn.parentNode.insertBefore(rPanel, showRulesBtn.nextSibling);
    }
  });

  mount(
    gameTopbar("Scribbl.io Setup", () => { resetAll(); goHome(); }),
    el("div", { className: "panel center", style: "max-width: 440px; margin: 0 auto;" }, [
      el("div", { style: "width:64px; height:64px; margin:0 auto 12px; color:var(--sunset-soft);" }, [icons.sibling()]),
      el("h2", { text: "Scribbl.io", style: "margin-bottom: 4px;" }),
      el("p", { className: "muted", style: "margin-bottom:12px;", text: "A rapid-fire multiplayer drawing game. Draw secret words in real time while others guess!" }),
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
      const res = await fetch(`${HTTP_BASE}/rooms/list?game=scribblio`).then(r => r.json());
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
    gameTopbar("Open Scribbl.io Rooms", () => { clearInterval(roomBrowserRefresh); renderSetup(); }),
    el("div", { className: "panel center" }, [
      el("p", { className: "muted", style: "margin:0; font-size:0.82rem;", text: "Tap Join to enter any open Scribbl.io lobby." })
    ]),
    el("div", { className: "panel" }, [listEl])
  );
}

// ── WebSockets Networking ──────────────────────────────────────────────────
function connectRoom(type, code = "") {
  if (!myName) myName = localStorage.getItem("lakehouse.playerName") || "Player";
  isOnline = true;
  mount(
    gameTopbar("Connecting", () => { resetAll(); renderSetup(); }),
    el("div", { className: "panel center", style: "margin:30px auto; max-width:320px;" }, [
      el("div", { className: "spin-indicator", style: "font-size:2rem; margin-bottom:12px;", text: "🌀" }),
      el("p", { text: type === "create" ? "Creating room…" : `Joining ${code}…` })
    ])
  );

  const url = type === "create"
    ? `${WS_BASE}/ws/create?name=${encodeURIComponent(myName)}&game=scribblio`
    : `${WS_BASE}/ws/join?code=${code}&name=${encodeURIComponent(myName)}&game=scribblio`;

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
      console.error("[Scribbl.io] Parse error:", e);
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
  if (typeof handleRelay === "function") {
    handleRelay(action, myName);
  }
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
        game: "scribblio", private: false,
        lastPing: Date.now()
      }),
    });
  } catch (_) {}
}

function applyLobby(playersList) {
  gState = {
    phase: "lobby",
    players: playersList
  };
  myPlayerIdx = playersList.indexOf(myName);

  if (isHost) {
    registerRoom();
    startHeartbeat(playersList.length);
  }

  const pRows = playersList.map((p, i) => {
    return el("div", {
      style: "display:flex; justify-content:space-between; padding:10px 14px; background:rgba(255,255,255,0.02); border-radius:10px; margin-bottom:6px;"
    }, [
      el("span", { text: p, style: "font-weight: 500;" }),
      el("span", {
        text: i === 0 ? "👑 HOST" : "READY",
        style: `font-size:0.75rem; font-weight:bold; color:${i === 0 ? "var(--sunset-soft)" : "#00ffaa"};`
      })
    ]);
  });

  const lobbyLayout = el("div", { className: "panel center", style: "max-width: 440px; margin:0 auto;" }, [
    el("h3", { text: `Room Lobby: ${roomCode}`, style: "color:var(--sunset-soft); margin-top:0;" }),
    el("p", { className: "muted", text: "Invite friends using this room code." }),
    el("div", { style: "margin: 16px 0; width:100%; max-height:240px; overflow-y:auto;" }, pRows),
    isHost
      ? el("button", {
          className: "btn",
          text: "Start Game ➔",
          style: "width:100%;",
          onClick: () => {
            if (playersList.length < 2) {
              toast("Need at least 2 players to start Scribbl.io!");
              return;
            }
            initOnlineGame();
          }
        })
      : el("p", { className: "muted center anim-pulse", text: "Waiting for host to start..." })
  ]);

  mount(gameTopbar(`Scribbl.io Lobby`, () => { resetAll(); renderSetup(); }), lobbyLayout);
}

// ── Game Loops Initialization ───────────────────────────────────────────────
function initLocalGame(players) {
  const scores = {};
  players.forEach(p => { scores[p] = 0; });

  gState = {
    players,
    scores,
    wordPool: shuffle(WORD_POOL),
    drawerIdx: 0,
    round: 1,
    maxRounds: 2,
    timerDuration: 60,
    activeWord: "",
    timeLeft: 60,
    timerInterval: null
  };

  startNextLocalDrawerTurn();
}

function initOnlineGame() {
  const scores = {};
  gState.players.forEach(p => { scores[p] = 0; });

  relay({
    type: "start_game",
    players: gState.players,
    scores,
    wordPool: shuffle(WORD_POOL)
  });
}

// Global drawing listener caches to stream/clear strokes
let globalCanvasRef = null;
let globalChatRef = null;
let globalCorrectGuessers = [];

function handleRelay(action, sender) {
  if (sender === myName) {
    if (action.type === "canvas_draw") return;
  }

  if (action.type === "start_game") {
    gState = {
      phase: "playing",
      players: action.players,
      scores: action.scores,
      wordPool: action.wordPool,
      drawerIdx: 0,
      round: 1,
      maxRounds: 2,
      timerDuration: 60,
      activeWord: "",
      timeLeft: 60,
      timerInterval: null
    };
    startNextOnlineDrawerTurn();
  } else if (action.type === "word_select") {
    gState.activeWord = action.word;
    launchOnlineMainLoop();
  } else if (action.type === "canvas_draw") {
    if (globalCanvasRef) {
      applyOnlineStroke(action);
    }
  } else if (action.type === "chat_guess") {
    const isCorrect = action.guess.trim().toLowerCase() === gState.activeWord.trim().toLowerCase();
    if (isCorrect) {
      if (globalCorrectGuessers.includes(sender)) return;
      globalCorrectGuessers.push(sender);

      // Score logic: quicker guessers get more points
      const basePoints = gState.timeLeft * 8;
      const drawerBonus = Math.floor(basePoints / 2);

      gState.scores[sender] += basePoints;
      gState.scores[gState.players[gState.drawerIdx]] += drawerBonus;

      addChatMessage(`🎉 ${sender} guessed correctly! (+${basePoints} pts)`, "#00ffaa");
      playBeep(650, 0.15);

      if (isHost) {
        // Check if all guessers have guessed correctly
        const allCorrect = gState.players.every(p => {
          if (p === gState.players[gState.drawerIdx]) return true; // drawer doesn't guess
          return globalCorrectGuessers.includes(p);
        });
        if (allCorrect) {
          if (gState.timerInterval) clearInterval(gState.timerInterval);
          relay({ type: "round_completed", scores: gState.scores, activeWord: gState.activeWord });
        }
      }
    } else {
      addChatMessage(`${sender}: ${action.guess}`, "rgba(255,255,255,0.6)");
    }
  } else if (action.type === "round_completed") {
    if (gState.roundComplete) return;
    gState.roundComplete = true;
    gState.scores = action.scores;
    if (gState.timerInterval) clearInterval(gState.timerInterval);
    if (action.isTimeUp) {
      toast(`⏱️ Time is up! The word was "${action.activeWord}".`);
    } else {
      toast(`All guessers finished! Word was: "${action.activeWord}"`);
    }
    gState.drawerIdx++;
    setTimeout(() => startNextOnlineDrawerTurn(), 2500);
  } else if (action.type === "start_next_round") {
    startNextOnlineDrawerTurn();
  } else if (action.type === "next_round") {
    gState.round = action.round;
    gState.drawerIdx = 0;
    renderRoundScores();
  } else if (action.type === "game_over") {
    gState.scores = action.scores;
    renderGameResults();
  }
}

function addChatMessage(text, color) {
  if (!globalChatRef) return;
  const msg = el("div", { style: `color:${color}; font-size:0.85rem; margin-bottom:4px; padding:2px 4px;` }, [
    document.createTextNode(text)
  ]);
  globalChatRef.appendChild(msg);
  globalChatRef.scrollTop = globalChatRef.scrollHeight;
}

// ── Turn Distributors ────────────────────────────────────────────────────────
function startNextLocalDrawerTurn() {
  if (gState.timerInterval) { clearInterval(gState.timerInterval); gState.timerInterval = null; }

  if (gState.drawerIdx >= gState.players.length) {
    gState.drawerIdx = 0;
    gState.round++;
    if (gState.round > gState.maxRounds) {
      renderGameResults();
      return;
    } else {
      renderRoundScores();
      return;
    }
  }

  const drawerName = gState.players[gState.drawerIdx];
  if (gState.wordPool.length < 30) gState.wordPool = shuffle(WORD_POOL);
  const choices = [popChoice(gState.wordPool), popChoice(gState.wordPool), popChoice(gState.wordPool)];

  const container = el("div", { className: "panel center", style: "max-width: 480px; margin: 30px auto; padding: 24px;" }, [
    el("h2", { text: `Pass the Device!` }),
    el("p", { className: "muted", style: "font-size: 1.1rem; margin: 20px 0;", html: `Hand the phone secretly to <strong style="color:var(--sunset-soft); font-size: 1.3rem;">${drawerName}</strong>.` }),
    el("button", {
      className: "btn",
      text: "I am the drawer",
      onClick: () => renderWordSelect(choices, drawerName)
    })
  ]);

  mount(gameTopbar(`Scribbl.io — Round ${gState.round}`, () => confirmQuit()), container);
}

function startNextOnlineDrawerTurn() {
  if (gState.timerInterval) { clearInterval(gState.timerInterval); gState.timerInterval = null; }

  if (gState.drawerIdx >= gState.players.length) {
    if (isHost) {
      const nextRound = gState.round + 1;
      if (nextRound > gState.maxRounds) {
        relay({ type: "game_over", scores: gState.scores });
      } else {
        relay({ type: "next_round", round: nextRound });
      }
    }
    return;
  }

  const drawerName = gState.players[gState.drawerIdx];
  // Re-derive myPlayerIdx if stale (e.g. name set after applyLobby ran)
  if (myPlayerIdx === -1 && myName) myPlayerIdx = gState.players.indexOf(myName);
  const isMyTurn = (myPlayerIdx !== -1 && myPlayerIdx === gState.drawerIdx);
  console.log("[Scribblio] turn", gState.drawerIdx, "drawerName:", drawerName, "myName:", myName, "myPlayerIdx:", myPlayerIdx, "isMyTurn:", isMyTurn);
  if (isMyTurn) {
    if (gState.wordPool.length < 30) gState.wordPool = shuffle(WORD_POOL);
    const choices = [popChoice(gState.wordPool), popChoice(gState.wordPool), popChoice(gState.wordPool)];
    renderWordSelect(choices, drawerName);
  } else {
    // Guessers wait screen
    const container = el("div", { className: "panel center", style: "max-width: 480px; margin: 30px auto;" }, [
      el("div", { className: "spin-indicator", style: "font-size:3rem; margin-bottom:16px;", text: "🎨" }),
      el("h2", { text: `${drawerName} is choosing...`, style: "margin-bottom:8px;" }),
      el("p", { className: "muted", text: "Waiting for the artist to pick a masterpiece word!" })
    ]);
    mount(gameTopbar(`Scribbl.io — Round ${gState.round}`, () => confirmQuit()), container);
  }
}

function popChoice(pool) {
  while (pool.length > 0) {
    const w = pool.pop();
    if (w && w.trim().split(/\s+/).filter(Boolean).length <= 2) {
      return w;
    }
  }
  return "Pinecone";
}

function renderWordSelect(choices, drawerName) {
  const choicesDiv = el("div", { style: "display: flex; flex-direction: column; gap: 8px; margin: 16px 0;" });
  choices.forEach(word => {
    choicesDiv.appendChild(el("button", {
      className: "btn ghost",
      text: word,
      onClick: () => selectWord(word)
    }));
  });

  const customInput = el("input", {
    type: "text",
    placeholder: "Or write a custom word...",
    maxlength: 20,
    style: "font-size: 1.1rem; border-radius: 12px; text-align: center; margin-top: 12px;"
  });

  const customBtn = el("button", {
    className: "btn",
    text: "Use Custom Word",
    onClick: () => {
      const val = customInput.value.trim();
      if (!val) { toast("Please enter a custom word!"); return; }
      selectWord(val);
    }
  });

  function selectWord(word) {
    if (!isOnline) {
      gState.activeWord = word;
      launchLocalMainLoop();
    } else {
      relay({ type: "word_select", word });
    }
  }

  mount(
    gameTopbar(`Scribbl.io — Word Choice`, () => confirmQuit()),
    el("div", { className: "panel center", style: "max-width: 480px; margin: 0 auto;" }, [
      el("h3", { text: `${drawerName}'s Choice`, style: "color:var(--sunset-soft);" }),
      el("p", { className: "muted", text: "Select a secret word to draw. Do not show your screen to other players yet!" }),
      choicesDiv,
      el("div", { className: "spacer" }),
      customInput,
      customBtn
    ])
  );
}

// ── Game Playing Main Loops ──────────────────────────────────────────────────
function launchLocalMainLoop() {
  const drawerName = gState.players[gState.drawerIdx];
  gState.timeLeft = gState.timerDuration;

  const canvas = el("canvas", {
    style: "background: #112228; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; cursor: crosshair; touch-action: none; width: 100%; display: block; box-shadow: inset 0 2px 8px rgba(0,0,0,0.5);"
  });

  const timerDisplay = el("div", {
    text: `${gState.timeLeft}s`,
    style: "font-size: 1.8rem; font-weight: bold; color: var(--sunset-soft); text-align: center; margin-bottom: 8px;"
  });

  const wordLengthHint = gState.activeWord.split("").map(c => c === " " ? "  " : "_").join(" ");
  const wordHintEl = el("div", {
    text: `Word length: ${wordLengthHint}`,
    style: "font-size: 0.95rem; font-weight: bold; margin-bottom: 12px; text-align: center; font-family: monospace; letter-spacing: 2px;"
  });

  const undoBtn = el("button", { className: "btn ghost small", text: "Undo", style: "margin: 0;" });
  const clearBtn = el("button", { className: "btn ghost small error", text: "Clear", style: "margin: 0;" });

  const colors = ["#ff9164", "#00ffaa", "#38bdf8", "#facc15", "#f3f4f6", "#0b1619"];
  const colorLabels = ["Sunset", "Aqua", "Sky", "Lemon", "White", "Eraser"];
  let activeColor = colors[0];

  const colorRow = el("div", { style: "display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; margin-bottom: 8px;" });
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
  const brushRow = el("div", { style: "display: flex; gap: 8px; justify-content: center; margin-bottom: 16px;" });
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

  const guessedBtn = el("button", {
    className: "btn",
    text: "🎉 Guessed Correctly! 🎉",
    style: "background: linear-gradient(135deg, #00ffaa, #00b377); color: #071410; font-weight: bold;",
    onClick: () => {
      clearInterval(gState.timerInterval);
      openWinnerModal(drawerName);
    }
  });

  const revealBtn = el("button", {
    className: "btn error ghost",
    text: "Forfeit / Reveal Word",
    onClick: () => {
      clearInterval(gState.timerInterval);
      toast(`Word was: "${gState.activeWord}"`);
      gState.drawerIdx++;
      startNextLocalDrawerTurn();
    }
  });

  const layout = el("div", { className: "panel center", style: "max-width: 500px; margin: 0 auto;" }, [
    el("div", { style: "display:flex; justify-content:space-between; align-items:center; width:100%; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:8px; margin-bottom:8px;" }, [
      el("div", { text: `Drawing: "${gState.activeWord}"`, style: "font-weight: bold; color: var(--sunset-soft);" }),
      timerDisplay
    ]),
    wordHintEl,
    canvas,
    el("div", { style: "display:flex; gap:8px; justify-content:center; margin: 8px 0;" }, [undoBtn, clearBtn]),
    colorRow,
    brushRow,
    guessedBtn,
    revealBtn
  ]);

  mount(gameTopbar(`Scribbl.io — ${drawerName} is Drawing`, () => confirmQuit()), layout);

  setupDrawingCanvas(canvas, undoBtn, clearBtn, () => activeColor, () => activeBrushSize);

  gState.timerInterval = setInterval(() => {
    gState.timeLeft--;
    timerDisplay.textContent = `${gState.timeLeft}s`;

    if (gState.timeLeft <= 5 && gState.timeLeft > 0) playBeep(800, 0.05);

    if (gState.timeLeft <= 0) {
      clearInterval(gState.timerInterval);
      playBeep(250, 0.4);
      toast(`⏱️ Time is up! The word was "${gState.activeWord}".`);
      gState.drawerIdx++;
      setTimeout(() => startNextLocalDrawerTurn(), 2000);
    }
  }, 1000);
}

function launchOnlineMainLoop() {
  const drawerName = gState.players[gState.drawerIdx];
  const isDrawer = (myName === drawerName);
  gState.timeLeft = gState.timerDuration;
  globalCorrectGuessers = [];
  if (gState) gState.roundComplete = false;

  const canvas = el("canvas", {
    style: "background: #112228; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; cursor: crosshair; touch-action: none; width: 100%; display: block; box-shadow: inset 0 2px 8px rgba(0,0,0,0.5);"
  });
  globalCanvasRef = canvas;

  const timerDisplay = el("div", {
    text: `${gState.timeLeft}s`,
    style: "font-size: 1.8rem; font-weight: bold; color: var(--sunset-soft); text-align: center; margin-bottom: 8px;"
  });

  const hiddenWord = gState.activeWord.split("").map(c => c === " " ? "  " : "_").join(" ");
  const wordHintEl = el("div", {
    text: isDrawer ? `SECRET WORD: ${gState.activeWord}` : `Word: ${hiddenWord}`,
    style: "font-size: 0.95rem; font-weight: bold; margin-bottom: 12px; text-align: center; font-family: monospace; letter-spacing: 2px; color:var(--water-foam);"
  });

  const undoBtn = el("button", { className: "btn ghost small", text: "Undo", style: "margin: 0;" });
  const clearBtn = el("button", { className: "btn ghost small error", text: "Clear", style: "margin: 0;" });

  const colors = ["#ff9164", "#00ffaa", "#38bdf8", "#facc15", "#f3f4f6", "#0b1619"];
  const colorLabels = ["Sunset", "Aqua", "Sky", "Lemon", "White", "Eraser"];
  let activeColor = colors[0];

  const colorRow = el("div", { style: "display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; margin-bottom: 8px;" });
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
  const brushRow = el("div", { style: "display: flex; gap: 8px; justify-content: center; margin-bottom: 16px;" });
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

  const chatContainer = el("div", {
    className: "scribblio-chat",
    style: "background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:8px; height:120px; overflow-y:auto; margin-bottom:8px; text-align:left;"
  });
  globalChatRef = chatContainer;

  const guessInput = el("input", {
    type: "text",
    placeholder: "Type your guess here...",
    style: "font-size: 1.1rem; border-radius: 12px; text-align: center; width: 100%; margin-bottom: 8px;"
  });

  guessInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const g = guessInput.value.trim();
      if (!g) return;
      guessInput.value = "";
      relay({ type: "chat_guess", guess: g });
    }
  });

  const contentLayout = el("div", { className: "panel center scribblio-layout", style: "max-width: 500px; margin: 0 auto; display: flex; flex-direction: column;" }, [
    el("div", { style: "display:flex; justify-content:space-between; align-items:center; width:100%; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:8px; margin-bottom:8px;" }, [
      el("div", { text: isDrawer ? `You are Drawing!` : `Artist: ${drawerName}`, style: "font-weight: bold; color: var(--sunset-soft);" }),
      timerDisplay
    ]),
    wordHintEl,
    canvas,
    isDrawer 
      ? el("div", { style: "display:flex; gap:8px; justify-content:center; margin: 8px 0;" }, [undoBtn, clearBtn]) 
      : null,
    isDrawer ? colorRow : null,
    isDrawer ? brushRow : null,
    el("div", { className: "spacer", style: "height:12px" }),
    !isDrawer ? guessInput : el("p", { className: "muted center anim-pulse", text: "Cast strokes dynamically to everyone's screen!" }),
    chatContainer
  ]);

  // Inject iOS visual centering styles if they don't exist yet
  if (!document.getElementById("scribblio-ios-styles")) {
    const style = el("style", {
      id: "scribblio-ios-styles",
      text: `
        .scribblio-layout.keyboard-active {
          padding: 8px 12px !important;
          margin: 0 auto !important;
        }
        .scribblio-layout.keyboard-active canvas {
          height: 140px !important;
        }
        .scribblio-layout.keyboard-active .scribblio-chat {
          height: 48px !important;
          margin-bottom: 4px !important;
        }
        .scribblio-layout.keyboard-active .spacer {
          height: 4px !important;
        }
      `
    });
    document.head.appendChild(style);
  }

  // Set up Visual Viewport dynamic resize listener to maintain vertical height centering
  if (cleanupViewport) {
    try { cleanupViewport(); } catch (_) {}
    cleanupViewport = null;
  }
  if (window.visualViewport) {
    const applyKeyboardLayout = () => {
      if (window.visualViewport.height < window.screen.height * 0.6) {
        contentLayout.classList.add("keyboard-active");
      } else {
        contentLayout.classList.remove("keyboard-active");
      }
    };
    guessInput.addEventListener("focus", () => setTimeout(applyKeyboardLayout, 150));
    guessInput.addEventListener("blur", () => {
      contentLayout.classList.remove("keyboard-active");
    });
    cleanupViewport = () => {};
  }

  mount(gameTopbar(`Scribbl.io — Synchronized`, () => confirmQuit()), contentLayout);

  if (isDrawer) {
    setupDrawingCanvas(canvas, undoBtn, clearBtn, () => activeColor, () => activeBrushSize, true);
  } else {
    setupDrawingCanvas(canvas, undoBtn, clearBtn, () => activeColor, () => activeBrushSize, false);
    guessInput.focus();
  }

  gState.timerInterval = setInterval(() => {
    gState.timeLeft--;
    timerDisplay.textContent = `${gState.timeLeft}s`;

    if (gState.timeLeft <= 5 && gState.timeLeft > 0) playBeep(800, 0.05);

    if (gState.timeLeft <= 0) {
      clearInterval(gState.timerInterval);
      playBeep(250, 0.4);
      if (isOnline) {
        if (isHost) {
          relay({ type: "round_completed", scores: gState.scores, activeWord: gState.activeWord, isTimeUp: true });
        }
      } else {
        toast(`⏱️ Time is up! The word was "${gState.activeWord}".`);
        gState.drawerIdx++;
        setTimeout(() => startNextLocalDrawerTurn(), 2000);
      }
    }
  }, 1000);
}

function openWinnerModal(drawerName) {
  const guessers = gState.players.filter(p => p !== drawerName);

  const title = el("h3", { text: "Who guessed correctly?", style: "margin-top:0;" });
  const buttonsDiv = el("div", { style: "display:flex; flex-direction:column; gap:8px; margin: 16px 0;" });

  const modal = el("div", {
    className: "modal-overlay",
    style: "position: fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.85); z-index:100000; display:flex; align-items:center; justify-content:center;"
  });

  guessers.forEach(gName => {
    buttonsDiv.appendChild(el("button", {
      className: "btn",
      text: gName,
      onClick: () => {
        const basePoints = gState.timeLeft * 8;
        const drawerBonus = Math.floor(basePoints / 2);

        gState.scores[gName] += basePoints;
        gState.scores[drawerName] += drawerBonus;

        toast(`🎉 ${gName} guessed it! +${basePoints} pts. ${drawerName} gets +${drawerBonus} pts!`);
        modal.remove();

        gState.drawerIdx++;
        startNextLocalDrawerTurn();
      }
    }));
  });

  const noOneBtn = el("button", {
    className: "btn error ghost",
    text: "Cancel / No One",
    onClick: () => {
      modal.remove();
      launchLocalMainLoop();
    }
  });

  const content = el("div", {
    className: "panel center",
    style: "max-width:320px; width:90%; background:#0b1a20; border:1px solid rgba(255,255,255,0.1); border-radius:16px; padding:20px; box-shadow:0 10px 40px rgba(0,0,0,0.5);"
  }, [
    title,
    el("p", { className: "muted", text: `Remaining time: ${gState.timeLeft} seconds.` }),
    buttonsDiv,
    noOneBtn
  ]);

  modal.appendChild(content);
  document.body.appendChild(modal);
}

// ── Drawing Core Engines ─────────────────────────────────────────────────────
function setupDrawingCanvas(canvas, undoBtn, clearBtn, getColor, getBrushSize, isAllowedToDraw) {
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const W = rect.width || 400;
  const H = 240;
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

    if (isOnline && isAllowedToDraw) {
      relay({
        type: "canvas_draw",
        drawType: "start",
        x: x / W,
        y: y / H,
        color: getColor(),
        size: getBrushSize()
      });
    }
  }

  function drawMove(x, y) {
    if (!drawing) return;
    currentStroke.push({ x, y });
    ctx.lineTo(x, y);
    ctx.strokeStyle = getColor();
    ctx.lineWidth = getBrushSize();
    ctx.stroke();

    if (isOnline && isAllowedToDraw) {
      relay({
        type: "canvas_draw",
        drawType: "move",
        x: x / W,
        y: y / H
      });
    }
  }

  function drawEnd() {
    if (!drawing) return;
    drawing = false;
    strokeHistory.push({
      stroke: currentStroke,
      color: getColor(),
      size: getBrushSize()
    });

    if (isOnline && isAllowedToDraw) {
      relay({
        type: "canvas_draw",
        drawType: "end"
      });
    }
  }

  if (isAllowedToDraw) {
    canvas.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      const r = canvas.getBoundingClientRect();
      const rawX = e.clientX - r.left;
      const rawY = e.clientY - r.top;
      const x = rawX * (W / r.width);
      const y = rawY * (H / r.height);
      drawStart(x, y);
    });
    canvas.addEventListener("pointermove", (e) => {
      e.preventDefault();
      if (!drawing) return;
      const r = canvas.getBoundingClientRect();
      const rawX = e.clientX - r.left;
      const rawY = e.clientY - r.top;
      const x = rawX * (W / r.width);
      const y = rawY * (H / r.height);
      drawMove(x, y);
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
      if (isOnline) relay({ type: "canvas_draw", drawType: "clear" });
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
      if (isOnline) relay({ type: "canvas_draw", drawType: "undo" });
    });
  }
}

// ── Apply WebSocket Stroke ──────────────────────────────────────────────────
let receiverDrawing = false;
let receiverHistory = [];
let receiverCurrentStroke = [];
let receiverColor = "#ff9164";
let receiverSize = 5;

function applyOnlineStroke(action) {
  const canvas = globalCanvasRef;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const W = rect.width || 400;
  const H = 240;

  if (action.drawType === "start") {
    receiverDrawing = true;
    receiverColor = action.color;
    receiverSize = action.size;
    const x = action.x * W;
    const y = action.y * H;
    receiverCurrentStroke = [{ x, y }];
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = receiverColor;
    ctx.lineWidth = receiverSize;
    ctx.stroke();
  } else if (action.drawType === "move") {
    if (!receiverDrawing) return;
    const x = action.x * W;
    const y = action.y * H;
    receiverCurrentStroke.push({ x, y });
    ctx.lineTo(x, y);
    ctx.strokeStyle = receiverColor;
    ctx.lineWidth = receiverSize;
    ctx.stroke();
  } else if (action.drawType === "end") {
    if (!receiverDrawing) return;
    receiverDrawing = false;
    receiverHistory.push({
      stroke: receiverCurrentStroke,
      color: receiverColor,
      size: receiverSize
    });
  } else if (action.drawType === "clear") {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    receiverHistory = [];
    receiverDrawing = false;
  } else if (action.drawType === "undo") {
    if (receiverHistory.length === 0) return;
    receiverHistory.pop();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    receiverHistory.forEach(item => {
      ctx.beginPath();
      ctx.strokeStyle = item.color;
      ctx.lineWidth = item.size;
      item.stroke.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
    });
  }
}

// ── Web Audio Synth ─────────────────────────────────────────────────────────
function playTone(freq, duration) {
  try {
    const audioCtx = getAudioCtx();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.01, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (_) {}
}

function playBeep(freq, duration) {
  playTone(freq, duration);
}

// ── SCOREBOARDS & STATS ─────────────────────────────────────────────────────
function renderRoundScores() {
  const standings = gState.players.map(p => ({ name: p, score: gState.scores[p] }))
    .sort((a, b) => b.score - a.score);

  const rows = standings.map((st, i) => {
    return el("div", {
      style: "display:flex; justify-content:space-between; align-items:center; padding:8px 16px; background:rgba(255,255,255,0.02); border-radius:10px; margin-bottom:8px;"
    }, [
      el("span", { text: `${i + 1}. ${st.name}`, style: "font-weight: 500;" }),
      el("span", { text: String(st.score), style: "font-weight: bold; color:var(--sunset-soft);" })
    ]);
  });

  const nextBtn = el("button", {
    className: "btn",
    text: `Start Round ${gState.round} ➜`,
    onClick: () => {
      if (!isOnline) {
        startNextLocalDrawerTurn();
      } else {
        relay({ type: "start_next_round" });
      }
    }
  });

  mount(
    gameTopbar(`Scribbl.io — End of Round ${gState.round - 1}`, () => confirmQuit()),
    el("div", { className: "panel center", style: "max-width: 440px; margin: 0 auto;" }, [
      el("h2", { text: "Current Scores" }),
      ...rows,
      el("div", { className: "spacer" }),
      (!isOnline || isHost) ? nextBtn : el("p", { className: "muted center anim-pulse", text: "Waiting for host to launch next round..." })
    ])
  );
}

function renderGameResults() {
  const standings = gState.players.map(p => ({ name: p, score: gState.scores[p] }))
    .sort((a, b) => b.score - a.score);

  const rows = standings.map((st, i) => {
    const isWinner = i === 0;
    return el("div", {
      style: `display:flex; justify-content:space-between; align-items:center; padding:12px 18px; background:${isWinner ? "rgba(255,145,100,0.06)" : "rgba(255,255,255,0.01)"}; border:${isWinner ? "1px solid var(--sunset-soft)" : "1px solid rgba(255,255,255,0.06)"}; border-radius:12px; margin-bottom:10px;`
    }, [
      el("span", { style: "font-weight:bold; display:flex; align-items:center; gap:8px;" }, [
        document.createTextNode(`${i + 1}. ${st.name}`),
        isWinner ? el("span", { text: "👑 DRAWER CHAMPION", style: "font-size:0.7rem; color:var(--sunset-soft); font-weight:bold;" }) : null
      ]),
      el("span", { text: String(st.score), style: "font-weight:bold; font-size:1.2rem; color:var(--sunset-soft);" })
    ]);
  });

  mount(
    gameTopbar("Scribbl.io — Game Over", () => { resetAll(); goHome(); }),
    el("div", { className: "panel center", style: "max-width: 440px; margin: 0 auto;" }, [
      el("h1", { text: "Game Completed!", style: "font-size:2rem; font-weight:900; color:var(--sunset-soft);" }),
      el("p", { className: "muted", text: "Incredible masterpieces were drawn. Here is the final scoreboard:" }),
      ...rows,
      el("div", { className: "spacer" }),
      el("button", { className: "btn", text: "Back to Lobby", onClick: () => { resetAll(); goHome(); } })
    ])
  );
}

function confirmQuit() {
  if (confirm("Are you sure you want to quit this Scribbl.io game?")) {
    resetAll();
    goHome();
  }
}
