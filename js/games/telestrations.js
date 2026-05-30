// Modular Telestrations game engine supporting Local Pass & Play and WebSockets Online Room mode.
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
let localNames = ["Alice", "Bob", "Charlie", "Dave"];

const STARTING_WORDS = [
  "Screaming Beaver", "Mosquito Bite", "Canoe Flip", "Burnt Hot Dog", "Sunburn Paint", 
  "Sleeping Bag Chase", "Tangled Fishing Line", "S'more Fight", "Bear in a Hammock", 
  "Pinecone Grenade", "Treehouse Party", "Leaky Tent", "Midnight Swim", "Chore Evader",
  "Raccoon Robber", "Skunk Spray", "Dirty Hiking Boot", "Cold Plunge", "Dock Jump", 
  "Lost Compass", "Frog Catching", "Squirrel Gang", "Lake Monster", "Wet Socks",
  "Tuxedo Cat on a Skateboard", "Angry Toaster throwing bread", "Dinosaur trying to use chopsticks",
  "Cactus hugging a balloon", "Banana slipping on a human peel", "Pompous Frog wearing a crown",
  "Squirrel piloting a tiny helicopter", "Gourmet Chef hotdog disaster", "Pajama party in the woods",
  "Dog wearing oversized sunglasses", "Raccoon attempting to use a laptop", "Staring contest with a stone wall",
  "Dancing pineapple under a spotlight", "T-Rex trying to make a bed", "Slow-motion high-five fail",
  "Sneaky crab taking a selfie", "Baby chick wearing heavy combat boots", "Highly dramatic loon",
  "Beaver wearing a tiny hardhat", "Grizzly bear doing yoga on a dock", "Raft built out of pizza slices",
  "Struggling to unpack a pop-up tent", "Sunburned strawberry wearing a hat", "Fish trying to ride a bicycle",
  "Owl wearing a tiny monocle", "Chipmunk hoarding a massive donut", "Turtle wearing jetpack boosters",
  "Raccoon eating spaghetti from a plate", "Waffle ironing a wrinkled shirt", "Octopus attempting to play eight guitars",
  "Very sleepy coffee cup", "Hamster running in a hamster wheel", "Snail winning a high-speed drag race",
  "Moose wearing a knit winter sweater", "Duck holding an umbrella in a storm", "Very tall sandwich about to fall over",
  "Panda attempting to do a cartwheel", "Happy cloud sprinkling green rain", "Wombat playing a tiny ukulele",
  "Walrus relaxing in a wooden hot tub", "Stray sock planning a secret escape", "Flamingo trying to stand on ice",
  "Sloth drinking a double espresso", "Gopher popping out of a saxophone", "Llama wearing a colorful winter scarf",
  "Penguin trying to slide down a slide", "Very angry onion making people cry", "Koala hanging onto a bamboo rocket",
  "Seagull stealing a pair of glasses", "Surfing pig catching a massive wave", "Hippo doing a delicate ballet spin",
  "Pigeon wearing a tiny delivery cap", "Very fluffy sheep wearing a sweater", "Bumblebee carrying a bucket of honey",
  "Otter juggling three round pebbles", "Badger digging a very deep tunnel", "Fox wearing detective clothes and monocle",
  "Hedgehog brushing its spiky quills", "Giraffe trying to look under a bed", "Camel walking across a snowy field",
  "Parrot talking into a megaphone", "Chameleon blending into a checkerboard", "Leopard trying to wipe off its spots",
  "Kangaroo carrying a smaller kangaroo", "Gorilla playing a grand piano", "Lion having a very bad hair day",
  "Zebra wearing checkerboard print pants", "Elephant trying to blow out a candle", "Meerkat looking through a telescope",
  "Stork carrying a very heavy package", "Rhino trying to balance on a ball", "Deer wearing high-top red sneakers",
  "Pelican with a giant fish in its beak", "Platypus wearing a detective hat", "Ostrich burying its head in a bucket",
  "Crab wearing tiny boxing gloves",
  "Sleeping Bag Monster chasing campers",
  "Midnight Ghost stealing a marshmallow",
  "Friendly skeleton roasting a hot dog",
  "Haunted tree singing opera",
  "Glow-in-the-dark owl reading a map",
  "Shadow monster afraid of its own shadow",
  "Vampire bat wearing sunscreen",
  "Spooky campfire telling human stories",
  "Werewolf getting a flea bath",
  "Mummy wrapped in colorful party streamers",
  "Witch flying on a vacuum cleaner",
  "Zombie doing a handstand on a pumpkin",
  "Haunted television showing only static static static",
  "Alien abducting a single cow",
  "Bigfoot doing a runway fashion walk",
  "Loch Ness Monster wearing a snorkel",
  "Floating sheet ghost playing chess",
  "Gargoyle trying to scratch an itch",
  "Spooky swamp bubble blowing a kiss",
  "Haunted grandfather clock with googly eyes",
  "Ghost bride throwing a bouquet of weeds",
  "Jack-o'-lantern wearing cool sunglasses",
  "Cute banshee singing into a karaoke mic",
  "Gothic castle with a bouncy slide",
  "Phantom organist playing baby shark",
  "Invisible man wearing bright neon socks",
  "Cursed chest spitting out gold coins",
  "Swamp monster wearing a mud facial mask",
  "Banshee screaming at a stubbed toe",
  "Spooky scarecrow doing a backflip",
  "Glow-in-the-dark jellyfish floating in a tent",
  "Creepy doll hosting a fancy tea party",
  "Haunted teapot pouring glowing green tea",
  "Ghostly knight tripping over his sword",
  "Skeleton walking a dog skeleton",
  "Vampire drinking a red juice box",
  "Witch's cauldron cooking a giant noodle",
  "Werewolf trying to paint its nails",
  "Bigfoot getting a professional pedicure",
  "Alien trying to learn how to whistle",
  "Haunted mirror showing a funny mustache",
  "Mummy trying to use a touch screen phone",
  "Spider weaving a web shaped like a smiley face",
  "Shadow hand playing rock paper scissors",
  "Zombie chef baking a brain-shaped cake",
  "Spooky floating key unlocking a cloud",
  "Haunted broom sweeping up stardust",
  "Gothic gargoyle drinking a milkshake",
  "Ghost pirate steering a cardboard ship",
  "Cursed amulet glowing bright purple",
  "Unloading the dishwasher very quietly",
  "Awkward elevator silence with a stranger",
  "Trying to plug in a USB on the first try",
  "Assembling flat-pack furniture with a missing screw",
  "Stepping on a tiny toy brick in the dark",
  "Trying to open a plastic grocery bag",
  "Fighting with a fitted bed sheet",
  "Searching for the cold spot on a pillow",
  "Opening a soda can that was shaken up",
  "Trying to swallow a pill that is too big",
  "Splashed by a passing car puddle",
  "Putting on wet jeans after swimming",
  "Ice cream cone dripping down an arm",
  "Brain freeze from a massive gulp of slushie",
  "Struggling to find the end of the tape roll",
  "Walking into a spiderweb face first",
  "Sneezing with a mouth full of crackers",
  "Dropping a phone directly on your own face",
  "Trying to parallel park with people watching",
  "Waving back at someone who was waving at someone else",
  "Dog refusing to walk in the light rain",
  "Cat knocking a glass off the table slowly",
  "Biting into a cookie expecting chocolate but getting raisin",
  "Trying to squeeze the last drop of toothpaste out",
  "Walking into a room and forgetting why you entered",
  "Stuck in a zipper that won't budge",
  "Slipping on ice and trying to look cool",
  "Burning your tongue on the very first sip of soup",
  "Struggling to open a new jar of pickles",
  "Trying to blow out a trick candle that won't go out",
  "Waiting for the microwave timer to hit one second",
  "Ironing a shirt only to make a new wrinkle",
  "Stepping into a puddle with a hole in your shoe",
  "Trying to fold a road map back together",
  "Accidentally turning on the front-facing camera",
  "Struggling to carry all grocery bags in one trip",
  "Sweating under a hand dryer in a public bathroom",
  "Your stomach growling loudly in a quiet library",
  "Trying to read someone else's messy handwriting",
  "Getting a papercut from a crisp dollar bill",
  "The absolute chaos of a fitted sheet folding attempt",
  "Spilling coffee on white pants before a big meeting",
  "An umbrella blowing inside out during a heavy storm",
  "Trying to sweep the last line of dust into the dustpan",
  "Dropping your keys down a storm drain",
  "Sitting on a bench that has a wet paint sign",
  "Stubbing your pinky toe on the corner of the bed",
  "Running to catch a bus that is already pulling away",
  "Getting peanut butter stuck to the roof of your mouth",
  "Trying to peel a price sticker off in one clean piece",
  "Looksmaxxing surgeon performing rhinoplasty",
  "TikTok rizz party in a Victorian parlor",
  "Skibidi toilet sitting in the Louvre museum",
  "Influencer taking selfies in a library",
  "Fancy butler doing a Fortnite dance",
  "Shakespeare writing a text message with emojis",
  "Monastery monk using a high-end gaming setup",
  "Astronaut eating instant ramen in zero gravity",
  "Ballet dancer wearing chunky combat boots",
  "Opera singer holding a golden megaphone",
  "Socrates arguing with an internet troll",
  "Cleopatra checking her notifications on a gold tablet",
  "Mona Lisa holding a cup of boba tea",
  "Knight in shining armor riding a hoverboard",
  "Viking warrior at a fancy day spa",
  "Renaissance painter using spray paint",
  "Neanderthal trying to build a smart home",
  "President doing a livestream gaming broadcast",
  "Beethoven wearing massive glowing DJ headphones",
  "Pharaoh walking a tiny French bulldog",
  "Greek statue wearing a designer puffer jacket",
  "Cyberpunk hacker sitting in a rocking chair",
  "Gothic cathedral with a neon exit sign",
  "Victoria era lady eating a spicy taco",
  "Billionaire tech CEO sleeping in a cardboard box",
  "Albert Einstein doing a popular dance trend",
  "Ancient Roman senator sipping a green smoothie",
  "Steampunk robot knitting a wool scarf",
  "French mime yelling through a megaphone",
  "Ninja delivery driver dropping off a pizza",
  "Caveman trying to scan a QR code",
  "Pirate captain using a GPS navigator",
  "Disco dancer at a silent retreat",
  "High-fashion model wearing a garbage bag outfit",
  "Cowboy riding a giant mechanical mechanical bull",
  "Sherlock Holmes looking for his lost vape",
  "Princess eating a bucket of fried chicken",
  "Sumo wrestler doing a delicate figure skating routine",
  "DJ playing classical music on vinyl",
  "Goth teenager at a bright pink birthday party",
  "Wizard using a microwave to heat a potion",
  "Supermodel eating a giant greasy cheeseburger",
  "Alien visiting a traditional farmer's market",
  "Royal guard laughing at a funny meme",
  "Gourmet chef cooking a single hot dog",
  "Professor lecturing to a classroom of teddy bears",
  "Aristocrat riding a very rusty bicycle",
  "Gladiator playing a game of mini golf",
  "Influencer recording a video in a rainstorm",
  "Yogi meditating on a crowded subway train",
  "Squirrel wearing a tiny business suit",
  "Pigeon riding a miniature skateboard",
  "Flamingo doing karate kicks",
  "Giraffe squeezing into a tiny sports car",
  "Goldfish looking out of a glass scuba helmet",
  "Chameleon changing into a disco ball",
  "Sloth piloting a high-speed jet plane",
  "Hedgehog wearing a tiny helmet",
  "Ostrich doing a handstand in the sand",
  "Cat playing electric guitar with its tail",
  "Hamster wearing a detective trench coat",
  "Hippo floating in a giant pink inflatable donut",
  "Octopus trying to knit four sweaters at once",
  "Penguin sunbathing on a beach chair",
  "Beaver building a dam out of books",
  "Cactus wearing a warm winter coat",
  "Crab playing the drums with its claws",
  "Angry chicken holding a protest sign",
  "Monkey wearing a top hat and monocle",
  "Walrus trying to hula hoop",
  "Koala bear launch a rocket ship",
  "Llama wearing a colorful party hat",
  "Panda sliding down a giant rainbow",
  "Raccoon washing a clean cell phone in a puddle",
  "Seagull wearing a tiny pirate hat",
  "Shark brushed its teeth with a giant toothbrush",
  "Sloth drinking a highly caffeinated energy drink",
  "Snail carrying a tiny camper trailer on its shell",
  "T-Rex trying to clap its hands",
  "Turtle wearing shiny golden roller skates",
  "Wombat playing a grand piano with its nose",
  "Zebra with colorful neon stripes",
  "Grizzly bear wearing a pink tutu doing ballet",
  "Bunny rabbit wearing a heavy space helmet",
  "Dog trying to herd a flock of balloon sheep",
  "Elephant doing a high-dive into a teacup",
  "Fox painting a portrait of a chicken",
  "Frog jumping over a giant mushroom",
  "Kangaroo jumping on a giant trampoline",
  "Lion getting a very fluffy blow dry",
  "Owl reading a newspaper upside down",
  "Parrot repeating what a microwave says",
  "Pelican catching a giant hot dog",
  "Pig wearing mud as a superhero mask",
  "Platypus playing the bagpipes",
  "Rhino wearing a delicate flower crown",
  "Sheep getting a haircut with scissors",
  "Snake wearing a very long scarf",
  "Spider spinning a web between two cactus needles",
  "Dinosaur eating a giant slice of watermelon",
  "Marshmallow roasting a campfire",
  "Speed bump surprise",
  "Photobomb ruining a perfect shot",
  "Trust fall gone wrong",
  "Awkward hug with stranger",
  "Brain freeze mid-sentence",
  "Stage fright at an empty mic",
  "Plot twist ending",
  "Rage quit controller throw",
  "Procrastination spiral",
  "Midnight snack mission",
  "Jump scare in a haunted house",
  "Selfie stick catastrophe",
  "Flat tire on a date night",
  "Food coma on the couch",
  "Road rage at a roundabout",
  "Sleepwalking into the kitchen",
  "Hypnotist putting the whole crowd to sleep",
  "Quicksand escape attempt",
  "Time traveler stuck in the wrong decade",
  "Invisibility cloak leaving shoes visible",
  "Laser tag sniper hiding behind a tiny pillar",
  "Escape room panic at one minute left",
  "Karaoke mic feedback screech",
  "Awkward silence at a dinner table",
  "Elevator music making everyone uncomfortable",
  "Jumbo shrimp identity crisis",
  "Cold shoulder at a warm party",
  "Butterfingers catching a wedding cake",
  "Walk of shame in broad daylight",
  "Drunk texting an ex at 2am",
  "Hangover cure that makes it worse",
  "Ghosting someone mid-conversation",
  "Wearing your ex's hoodie to their wedding",
  "Calling in sick while posting beach photos",
  "Doomscrolling at 3am in bed",
  "Deja vu in a grocery store aisle",
  "Jet lag attacking at a morning meeting",
  "Nap that turns into a full 8 hours",
  "Villain origin story moment",
  "Superhero landing with wobbly knees",
  "Embarrassing autocorrect sent to the wrong person",
  "Photo taken right at the perfect moment",
  "Dog trying to shake hands and failing",
  "Eating a hot dog at a hot dog eating contest",
  "Crying at a commercial alone",
  "Netflix asking if you're still watching",
  "Falling asleep standing up on the subway",
  "Missing a high-five completely",
  "Fake laugh that goes on too long",
  "Running in slow motion toward someone",
  "Stepping on bubble wrap in a quiet room",
  "Finding money in an old coat pocket",
  "Forgetting someone's name mid-introduction",
  "Dropping a mic on purpose",
  "Waving goodbye then walking the same direction",
  "Group selfie where everyone blinked",
  "Photogenic sneeze at the worst moment",
  "Dramatic slow-motion coffee spill",
  "Holding a door for someone too far away",
  "Sending a voice memo by accident",
  "Fire drill in the middle of a shower",
  "Power outage during a horror movie",
  "Getting rick-rolled at a business meeting",
  "Autocorrect changing 'duck' in a text",
  "Accidentally liking a 3-year-old photo",
  "Man overboard jumping for a floating hat",
  "Sandstorm hitting a beach volleyball game",
  "Astronaut floating a hot coffee past a black hole",
  "Pirate walking the plank in heels",
  "Cowboy riding a Roomba into the sunset",
  "Knight jousting on a mobility scooter",
  "Wizard accidentally summoning a pizza delivery guy",
  "Samurai slicing a watermelon at a luau",
  "Mermaid stuck in a revolving door",
  "Bigfoot photo ruined by a tourist",
  "Dragon blowing out birthday candles too hard",
  "Unicorn stuck in traffic",
  "Yeti ordering at a drive-thru window",
  "Leprechaun losing his pot of gold at the stock market",
  "Sphinx answering questions on a game show",
  "Centaur trying to use a revolving door",
  "Genie granting a wish that backfires",
  "Tooth fairy working a double shift",
  "Easter Bunny hiding eggs in the wrong yard",
  "Santa stuck in an air duct",
  "Elf on a shelf spying from a ceiling fan",
  "Jack-in-the-box at a yoga class",
  "Mime getting attacked by invisible bees",
  "Ventriloquist dummy taking control",
  "Tightrope walker checking their phone mid-wire",
  "Magician pulling out the wrong rabbit",
  "Clown squeezing into a tiny submarine",
  "Stuntman faking a fall and actually falling",
  "Olympic diver belly flopping on purpose",
  "Marathon runner stopping for a nap at mile 2",
  "Competitive eater being outmatched by a grandma",
  "Surfer wiping out into a shallow wave",
  "Skateboarder landing perfectly then tripping over a crack",
  "Rock climber freezing up three feet off the ground"
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
  if (__pj && __pj.game === "telestrations" && __pj.code && (Date.now() - __pj.ts) < 20000) {
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
}

function renderSetup() {  const savedName = localStorage.getItem("lakehouse.playerName") || localStorage.getItem("telestrations.name") || "";
  const nameInput = el("input", {
    type: "text",
    placeholder: "Your name…",
    value: savedName,
    id: "t-name",
    style: "font-size:1.1rem; border-radius:14px; text-align:center; margin-bottom:14px; width:100%;"
  });

  const codeInput = el("input", {
    type: "text",
    placeholder: "4-LETTER CODE",
    id: "t-code",
    maxLength: 4,
    style: "font-size:1.3rem; border-radius:14px; text-align:center; text-transform:uppercase; letter-spacing:6px; margin-bottom:10px; width:100%;"
  });
  codeInput.addEventListener("input", () => { codeInput.value = codeInput.value.toUpperCase(); });

  const getName = () => {
    const n = nameInput.value.trim();
    if (!n) { toast("Enter your name first!"); return null; }
    localStorage.setItem("telestrations.name", n);
    return n;
  };

  // Pass & Play players setup list
  const savedNames = store.get("telestrations.localNames", ["", "", "", ""]);
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
          store.set("telestrations.localNames", localNames);
        }
      });
      const row = el("div", { style: "display:flex; gap:8px; align-items:center; margin-bottom: 8px; width:100%;" }, [
        input,
        el("button", {
          className: "btn ghost small error",
          text: "✕",
          style: "margin:0; padding:6px 12px; border-radius:12px; font-size:1.1rem; line-height:1;",
          onClick: () => {
            if (localNames.length > 3) {
              localNames.splice(i, 1);
              store.set("telestrations.localNames", localNames);
              drawLocalList();
            } else {
              toast("Telestrations needs at least 3 players.");
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
        store.set("telestrations.localNames", localNames);
        drawLocalList();
      } else {
        toast("Max 8 players for local play.");
      }
    }
  });

  const startLocalBtn = el("button", {
    className: "btn",
    text: "Start Local Telestrations",
    style: "width:100%;",
    onClick: () => {
      const cleaned = localNames.map((n, idx) => n.trim() || `Player ${idx + 1}`).slice(0, 8);
      if (cleaned.length < 3) {
        toast("Telestrations needs at least 3 players.");
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
          el("li", { text: "Secret Word: Everyone starts with a secret word. If playing online, everyone plays concurrently!" }),
          el("li", { text: "Pass/Rotate: Your booklet passes to the next player. If they receive a word, they must draw it. If they receive a drawing, they must guess it!" }),
          el("li", { text: "Telephone Chain: Alternate drawing and writing guesses until your sketchbook returns to you." }),
          el("li", { text: "The Reveal: Flip through each booklet as a group to laugh at how the starting word mutated!" })
        ])
      ]);
      showRulesBtn.parentNode.insertBefore(rPanel, showRulesBtn.nextSibling);
    }
  });

  mount(
    gameTopbar("Telestrations Setup", () => { resetAll(); goHome(); }),
    el("div", { className: "panel center", style: "max-width: 440px; margin: 0 auto;" }, [
      el("div", { style: "width:64px; height:64px; margin:0 auto 12px; color:var(--sunset-soft);" }, [icons.doodles()]),
      el("h2", { text: "Telestrations", style: "margin-bottom: 4px;" }),
      el("p", { className: "muted", style: "margin-bottom:12px;", text: "A telephone game alternating between drawing and writing guesses. 3 to 8 players!" }),
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
      const res = await fetch(`${HTTP_BASE}/rooms/list?game=telestrations`).then(r => r.json());
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
    gameTopbar("Open Telestrations Rooms", () => { clearInterval(roomBrowserRefresh); renderSetup(); }),
    el("div", { className: "panel center" }, [
      el("p", { className: "muted", style: "margin:0; font-size:0.82rem;", text: "Tap Join to enter any open Telestrations lobby." })
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
    ? `${WS_BASE}/ws/create?name=${encodeURIComponent(myName)}&game=telestrations`
    : `${WS_BASE}/ws/join?code=${code}&name=${encodeURIComponent(myName)}&game=telestrations`;

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
      console.error("[Telestrations] Parse error:", e);
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
        game: "telestrations", private: false,
        lastPing: Date.now()
      }),
    });
  } catch (_) {}
}

function applyLobby(playersList) {
  gState = {
    phase: "lobby",
    players: playersList,
    books: []
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
    el("p", { className: "muted", text: "Invite friends using this code. Once everyone has joined, start the game." }),
    el("div", { style: "margin: 16px 0; width:100%; max-height:240px; overflow-y:auto;" }, pRows),
    isHost
      ? el("button", {
          className: "btn",
          text: "Start Game ➔",
          style: "width:100%;",
          onClick: () => {
            if (playersList.length < 3) {
              toast("Need at least 3 players to start Telestrations!");
              return;
            }
            initOnlineGame();
          }
        })
      : el("p", { className: "muted center anim-pulse", text: "Waiting for host to start..." })
  ]);

  mount(gameTopbar(`Telestrations Lobby`, () => { resetAll(); renderSetup(); }), lobbyLayout);
}

// ── Game Loops Initialization ───────────────────────────────────────────────
function initLocalGame(players) {
  const N = players.length;
  const wordPool = shuffle(STARTING_WORDS);

  const books = players.map((pName, pIdx) => {
    const choices = [
      wordPool.pop() || "Campfire",
      wordPool.pop() || "Canoe",
      wordPool.pop() || "Sunburn"
    ];
    return {
      ownerIdx: pIdx,
      ownerName: pName,
      choices,
      steps: []
    };
  });

  gState = {
    players,
    books,
    currentStepIdx: 0,
    currentBookQueueIdx: 0
  };

  runLocalTurn();
}

function initOnlineGame() {
  const N = gState.players.length;
  const wordPool = shuffle(STARTING_WORDS);

  const books = gState.players.map((pName, pIdx) => {
    const choices = [
      wordPool.pop() || "Campfire",
      wordPool.pop() || "Canoe",
      wordPool.pop() || "Sunburn"
    ];
    return {
      ownerIdx: pIdx,
      ownerName: pName,
      choices,
      steps: []
    };
  });

  relay({
    type: "start_game",
    books,
    players: gState.players
  });
}

function handleRelay(action, sender) {
  if (action.type === "start_game") {
    gState = {
      phase: "playing",
      players: action.players,
      books: action.books,
      currentStepIdx: 0
    };
    runOnlineTurn();
  } else if (action.type === "submit_step") {
    if (isHost) {
      const b = gState.books[action.bookIdx];
      b.steps[action.stepIdx] = action.stepContent;

      // Check if all players have submitted their steps
      const step = gState.currentStepIdx;
      const allDone = gState.books.every(bk => bk.steps[step] !== undefined);
      if (allDone) {
        if (step + 1 >= gState.players.length) {
          // Finished all steps! Go to slideshow
          relay({ type: "start_review", books: gState.books });
        } else {
          // Move to next step
          relay({ type: "next_step", books: gState.books, stepIdx: step + 1 });
        }
      }
    }
  } else if (action.type === "next_step") {
    gState.books = action.books;
    gState.currentStepIdx = action.stepIdx;
    runOnlineTurn();
  } else if (action.type === "start_review") {
    gState.books = action.books;
    gState.phase = "review";
    renderReviewBook(0, 0);
  } else if (action.type === "review_next") {
    renderReviewBook(action.bookIdx, action.stepIdx);
  }
}

// ── Turn Distributors ────────────────────────────────────────────────────────
function runLocalTurn() {
  const N = gState.players.length;
  const step = gState.currentStepIdx;

  if (step >= N) {
    startLocalReview();
    return;
  }

  if (gState.currentBookQueueIdx >= N) {
    gState.currentStepIdx++;
    gState.currentBookQueueIdx = 0;
    runLocalTurn();
    return;
  }

  const bIdx = gState.currentBookQueueIdx;
  const book = gState.books[bIdx];
  const playerIdx = (bIdx + step) % N;
  const currentPlayerName = gState.players[playerIdx];

  const promptBlurb = step === 0 
    ? "pick their starting secret word"
    : (step % 2 === 1 ? "draw the secret word/phrase" : "guess the drawing");

  const container = el("div", { className: "panel center", style: "max-width: 480px; margin: 30px auto; padding: 24px;" }, [
    el("h2", { text: `Pass the Device!` }),
    el("p", { className: "muted", style: "font-size: 1.1rem; margin: 20px 0;", html: `Hand the phone secretly to <strong style="color:var(--sunset-soft); font-size: 1.3rem;">${currentPlayerName}</strong> to <strong style="color:var(--sunset-soft);">${promptBlurb}</strong>.` }),
    el("button", {
      className: "btn",
      text: "I am ready",
      onClick: () => {
        if (step === 0) {
          renderWordSelect(book, currentPlayerName);
        } else if (step % 2 === 1) {
          renderDrawingRound(book, book.steps[step - 1].value, currentPlayerName);
        } else {
          renderGuessingRound(book, book.steps[step - 1].value, currentPlayerName);
        }
      }
    })
  ]);

  mount(gameTopbar(`Telestrations — Turn`, () => confirmQuit()), container);
}

function runOnlineTurn() {
  const N = gState.players.length;
  const step = gState.currentStepIdx;
  const myIdx = myPlayerIdx !== -1 ? myPlayerIdx : gState.players.indexOf(myName);

  // Find book this player works on at stepIdx
  // (bIdx + step) % N = myIdx  ==>  bIdx = (myIdx - step + N) % N
  const bIdx = (myIdx - step + N) % N;
  const book = gState.books[bIdx];

  if (step === 0) {
    renderWordSelect(book, myName);
  } else if (step % 2 === 1) {
    renderDrawingRound(book, book.steps[step - 1].value, myName);
  } else {
    renderGuessingRound(book, book.steps[step - 1].value, myName);
  }
}

function renderWaitingScreen() {
  const step = gState.currentStepIdx;
  const N = gState.players.length;

  const countFinished = gState.books.filter(b => b.steps[step] !== undefined).length;

  const layout = el("div", { className: "panel center", style: "max-width: 440px; margin: 30px auto;" }, [
    el("div", { className: "spin-indicator", style: "font-size:3rem; margin-bottom:16px;", text: "🌀" }),
    el("h2", { text: "Waiting...", style: "margin-bottom:8px;" }),
    el("p", { className: "muted", text: "Your turn is submitted! Waiting for other players to complete their tasks..." }),
    el("div", { 
      className: "pill", 
      style: "display:inline-block; margin-top:14px; font-weight:bold; background:rgba(255,255,255,0.06); color:var(--sunset-soft); font-size:0.85rem; padding:6px 16px; border-radius:20px;",
      text: `Submitted: ${countFinished}/${N} players`
    })
  ]);

  mount(gameTopbar(`Telestrations — Syncing`, () => confirmQuit()), layout);
}

// ── Turn 0: Word Selection ───────────────────────────────────────────────────
function renderWordSelect(book, pName) {
  const choicesDiv = el("div", { style: "display: flex; flex-direction: column; gap: 8px; margin: 16px 0;" });
  
  book.choices.forEach(word => {
    choicesDiv.appendChild(el("button", {
      className: "btn ghost",
      text: word,
      onClick: () => submitWord(word)
    }));
  });

  const customInput = el("input", {
    type: "text",
    placeholder: "Or write your own word...",
    maxlength: 30,
    style: "font-size: 1.1rem; border-radius: 12px; text-align: center; margin-top: 12px;"
  });

  const customBtn = el("button", {
    className: "btn",
    text: "Use Custom Word",
    onClick: () => {
      const val = customInput.value.trim();
      if (!val) { toast("Please write a secret word first!"); return; }
      submitWord(val);
    }
  });

  function submitWord(word) {
    const stepContent = { type: "text", value: word, author: pName };
    if (!isOnline) {
      book.steps.push(stepContent);
      gState.currentBookQueueIdx++;
      runLocalTurn();
    } else {
      const bIdx = gState.books.indexOf(book);
      // Immediately optimistic render
      book.steps[gState.currentStepIdx] = stepContent;
      relay({
        type: "submit_step",
        bookIdx: bIdx,
        stepIdx: gState.currentStepIdx,
        stepContent
      });
      renderWaitingScreen();
    }
  }

  mount(
    gameTopbar("Telestrations — Choose Word", () => confirmQuit()),
    el("div", { className: "panel center", style: "max-width: 480px; margin: 0 auto;" }, [
      el("h3", { text: `${pName}'s Turn`, style: "color: var(--sunset-soft);" }),
      el("p", { className: "muted", text: "Select a secret word/phrase that you will pass on to be drawn by the next player!" }),
      choicesDiv,
      el("div", { className: "spacer" }),
      customInput,
      customBtn
    ])
  );
}

// ── Drawing Round ────────────────────────────────────────────────────────────
function renderDrawingRound(book, secretWord, pName) {
  const canvas = el("canvas", {
    style: "background: #112228; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; cursor: crosshair; touch-action: none; width: 100%; display: block; box-shadow: inset 0 2px 8px rgba(0,0,0,0.5);"
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
  const brushRow = el("div", { style: "display: flex; gap: 8px; justify-content: center; margin-bottom: 12px;" });
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
      const stepContent = { type: "draw", value: dataUrl, author: pName };
      if (!isOnline) {
        book.steps.push(stepContent);
        gState.currentBookQueueIdx++;
        runLocalTurn();
      } else {
        const bIdx = gState.books.indexOf(book);
        book.steps[gState.currentStepIdx] = stepContent;
        relay({
          type: "submit_step",
          bookIdx: bIdx,
          stepIdx: gState.currentStepIdx,
          stepContent
        });
        renderWaitingScreen();
      }
    }
  });

  const drawingLayout = el("div", { className: "panel center", style: "max-width: 500px; margin: 0 auto;" }, [
    el("h3", { text: `${pName} is Drawing!`, style: "color:var(--sunset-soft); margin-top:0;" }),
    el("p", { className: "muted", style: "margin: 4px 0 12px;", html: `Draw this: <strong style="color:#00ffaa; font-size:1.15rem;">${secretWord}</strong>` }),
    canvas,
    el("div", { style: "display:flex; gap:8px; justify-content:center; margin: 8px 0;" }, [undoBtn, clearBtn]),
    colorRow,
    brushRow,
    submitBtn
  ]);

  mount(gameTopbar("Telestrations — Drawing", () => confirmQuit()), drawingLayout);

  setupDrawingCanvas(canvas, undoBtn, clearBtn, () => activeColor, () => activeBrushSize);
}

function setupDrawingCanvas(canvas, undoBtn, clearBtn, getColor, getBrushSize) {
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const W = rect.width || 400;
  const H = 260;
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

// ── Guessing Round ───────────────────────────────────────────────────────────
function renderGuessingRound(book, drawingDataUrl, pName) {
  const drawingImg = el("img", {
    src: drawingDataUrl,
    style: "background: #112228; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; width: 100%; display: block; margin-bottom: 12px; max-height: 260px; object-fit: contain; box-shadow: 0 4px 16px rgba(0,0,0,0.5);"
  });

  const guessInput = el("input", {
    type: "text",
    placeholder: "What is this drawing? Guess...",
    maxlength: 30,
    style: "font-size: 1.15rem; border-radius: 14px; text-align: center; width: 100%;"
  });

  const submitBtn = el("button", {
    className: "btn",
    text: "Submit Guess",
    onClick: () => {
      const val = guessInput.value.trim();
      if (!val) { toast("Please make a guess first!"); return; }
      const stepContent = { type: "text", value: val, author: pName };
      if (!isOnline) {
        book.steps.push(stepContent);
        gState.currentBookQueueIdx++;
        runLocalTurn();
      } else {
        const bIdx = gState.books.indexOf(book);
        book.steps[gState.currentStepIdx] = stepContent;
        relay({
          type: "submit_step",
          bookIdx: bIdx,
          stepIdx: gState.currentStepIdx,
          stepContent
        });
        renderWaitingScreen();
      }
    }
  });

  const guessLayout = el("div", { className: "panel center", style: "max-width: 480px; margin: 0 auto;" }, [
    el("h3", { text: `${pName}'s Turn to Guess!`, style: "color:var(--sunset-soft); margin-top:0;" }),
    el("p", { className: "muted", text: "Look closely at the drawing below and write down what you think it represents." }),
    drawingImg,
    guessInput,
    el("div", { className: "spacer" }),
    submitBtn
  ]);

  mount(gameTopbar("Telestrations — Guessing", () => confirmQuit()), guessLayout);
  guessInput.focus();
}

// ── Review Phase ─────────────────────────────────────────────────────────────
function startLocalReview() {
  renderReviewBook(0, 0);
}

function renderReviewBook(bookIdx, stepIdx) {
  const book = gState.books[bookIdx];
  const step = book.steps[stepIdx];
  
  if (!step) {
    if (bookIdx + 1 < gState.books.length) {
      renderReviewBook(bookIdx + 1, 0);
    } else {
      renderFinalScreen();
    }
    return;
  }

  const chainWrap = el("div", { style: "margin: 16px 0; min-height: 240px; display: flex; flex-direction: column; align-items: center; justify-content: center;" });

  if (step.type === "text") {
    const isFirst = stepIdx === 0;
    chainWrap.appendChild(el("div", {
      className: "panel center",
      style: `background: ${isFirst ? "rgba(255,145,100,0.06)" : "rgba(255,255,255,0.02)"}; border: 1px solid ${isFirst ? "var(--sunset-soft)" : "rgba(255,255,255,0.08)"}; border-radius: 12px; padding: 24px 16px; width: 100%;`
    }, [
      el("div", { text: isFirst ? `${step.author}'s Starting Word` : `${step.author}'s Guess`, style: "font-size:0.75rem; text-transform:uppercase; color:var(--sunset-soft); margin-bottom:8px; font-weight:bold; letter-spacing:0.5px;" }),
      el("h2", { text: `"${step.value}"`, style: "font-size: 1.8rem; font-weight: 900; margin: 0;" })
    ]));
  } else {
    chainWrap.appendChild(el("div", {
      className: "panel center",
      style: "background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 12px; width: 100%;"
    }, [
      el("div", { text: `Drawn by ${step.author}`, style: "font-size:0.75rem; text-transform:uppercase; color:var(--sunset-soft); margin-bottom:8px; font-weight:bold; letter-spacing:0.5px;" }),
      el("img", { src: step.value, style: "background: #112228; border-radius: 8px; width:100%; max-height:220px; object-fit:contain;" })
    ]));
  }

  const hasMoreSteps = stepIdx + 1 < book.steps.length;
  const isLastBook = bookIdx + 1 === gState.books.length;

  const btnText = hasMoreSteps 
    ? "Reveal Next Chain Item ➜"
    : (isLastBook ? "Finish Game Review 🏆" : `Move to ${gState.books[bookIdx+1].ownerName}'s Book ➜`);

  const nextBtn = el("button", {
    className: "btn",
    text: btnText,
    onClick: () => {
      let nextBook = bookIdx;
      let nextStep = stepIdx + 1;
      if (!hasMoreSteps) {
        nextBook = bookIdx + 1;
        nextStep = 0;
      }
      if (!isOnline) {
        renderReviewBook(nextBook, nextStep);
      } else {
        relay({ type: "review_next", bookIdx: nextBook, stepIdx: nextStep });
      }
    }
  });

  const progressText = `${bookIdx + 1}/${gState.books.length} Books • Step ${stepIdx + 1}/${book.steps.length}`;

  const slideshowLayout = el("div", { className: "panel center", style: "max-width: 500px; margin: 0 auto;" }, [
    el("p", { className: "muted", text: progressText, style: "font-size:0.75rem;" }),
    chainWrap,
    el("div", { className: "spacer" }),
    (!isOnline || isHost) ? nextBtn : el("p", { className: "muted center anim-pulse", text: "Waiting for host to flip slides..." })
  ]);

  mount(gameTopbar(`${book.ownerName}'s Book Review`, () => confirmQuit()), slideshowLayout);
}

function renderFinalScreen() {
  mount(
    gameTopbar("Telestrations — End", () => { resetAll(); goHome(); }),
    el("div", { className: "panel center", style: "max-width: 480px; margin: 0 auto;" }, [
      el("h1", { text: "Review Complete!", style: "color:var(--sunset-soft); font-size:2.2rem; font-weight:900;" }),
      el("p", { className: "muted", text: "That was absolute chaotic gold. Thanks for playing!" }),
      el("div", { className: "spacer" }),
      el("button", { className: "btn", text: "Back to Lobby", onClick: () => { resetAll(); goHome(); } })
    ])
  );
}

function confirmQuit() {
  if (confirm("Are you sure you want to end this Telestrations game?")) {
    resetAll();
    goHome();
  }
}
