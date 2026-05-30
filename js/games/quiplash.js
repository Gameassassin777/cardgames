// Modular Quiplash game engine supporting Local Pass & Play and Online Multiplayer.
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
  "The title of a comedy movie set at a cozy lake cabin",
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
  "A bad topic for a campfire story",
  "What sunscreen smells like to a sunburned person",
  "The most useless item to bring on a wilderness hike",
  "A strange thing to find inside a hollow log",
  "The real reason they call it 'roughing it'",
  "The worst thing to accidentally send to the family group chat instead of a meme",
  "A highly sophisticated loon call delivered with dead-eyed seriousness",
  "The worst song for a dentist to hum while drilling your teeth",
  "A funny name for a high-end luxury brand that only sells mud",
  "What the lawnmower is secretly whispering to the grass",
  "The awkward thing your dog does while making direct eye contact with you",
  "A terrible slogan for a gourmet restaurant that serves cold, raw hotdogs",
  "What the cabin raccoon writes in its tiny diary at night",
  "A sibling's reaction when they realize you took the last slice of pizza",
  "The worst thing to say during a quiet moment in a library",
  "A name for a smartphone app designed exclusively for grumpy cats",
  "What plants are actually thinking when you forget to water them",
  "A terrible theme for a high school prom",
  "The worst thing to find inside your hiking boot before putting it on",
  "Something you shouldn't say during a corporate presentation",
  "A funny name for a superhero whose only power is finding lost socks",
  "The absolute worst time to experience a sudden sneeze",
  "What the refrigerator is secretly thinking when you open it for the tenth time",
  "A ridiculous excuse for being late to a virtual meeting",
  "The worst item to use as a makeshift bookmark",
  "Something that would make everyone instantly leave a hot tub",
  "A terrible name for a new brand of ultra-sour candy",
  "What happens when you let your dad pick out your haircut",
  "The worst thing to write in a professional thank-you card",
  "A funny name for a pet squirrel that behaves like a guard dog",
  "What you shouldn't whisper to the person sitting next to you on a plane",
  "A terrible theme for a child's birthday party",
  "The most awkward thing to say after accidentally walking into the wrong restroom",
  "What you shouldn't say when meeting the leader of a small country",
  "A funny name for a luxury hotel that is actually just a wet cardboard box",
  "The worst thing to find at the bottom of your morning coffee mug",
  "Something you shouldn't say to a police officer who just pulled you over",
  "A terrible name for a new baby food flavor",
  "What the Wi-Fi router is secretly thinking when the internet goes down",
  "A funny excuse for why you didn't do the dishes",
  "The worst thing to hear from your GPS navigator while driving at night",
  "Something you shouldn't bring to a high-stakes job interview",
  "A ridiculous fashion trend that will definitely start next year",
  "What the toaster is thinking when you toast a slice of bread on maximum heat",
  "The absolute worst song to play at a wedding reception",
  "A funny name for a penguin gang in Antarctica",
  "The worst thing to say to someone who just finished running a marathon",
  "Something you shouldn't do during a quiet moment of a movie",
  "A terrible name for a new line of activewear",
  "What the moon is secretly thinking when people look at it through telescopes",
  "A ridiculous reason to call an emergency family meeting",
  "The worst thing to discover inside a luxury gift bag",
  "Something that would make a librarian instantly lose their calm",
  "A funny name for a tiny bird with a very loud voice",
  "What you shouldn't say when someone shows you their new pet lizard",
  "A terrible flavor for a new brand of toothpaste",
  "What the couch is thinking when you drop a potato chip down the cushions",
  "A ridiculous excuse for why you forgot your sibling's birthday",
  "The worst thing to say during a formal dinner party",
  "Something you shouldn't do while standing in a very long line",
  "A funny name for a very lazy squirrel",
  "What the trees are secretly saying to each other during a heavy windstorm",
  "A terrible theme for a community garden",
  "The worst thing to find inside your sleeping bag before sliding in",
  "Something you shouldn't say to a personal trainer on your first day",
  "A funny name for a small dog that thinks it is a grizzly bear",
  "What the ocean is thinking when people build sandcastles on the beach",
  "A ridiculous reason to skip a family vacation",
  "The worst thing to hear when you turn on a new electronic device",
  "Something that would make a tour guide instantly abandon the group",
  "A funny name for a bird that refuses to fly and only walks",
  "What you shouldn't say when someone asks for your honest opinion on their art",
  "A terrible flavor for a gourmet popcorn brand",
  "What the alarm clock is thinking when you hit the snooze button for the fifth time",
  "A ridiculous excuse for why you are wearing sunglasses indoors",
  "A beaver in a tuxedo trying to negotiate a corporate merger",
  "A T-Rex struggling to make a hotel bed with its tiny arms",
  "The most awkward thing to say when you get stuck in a elevator silence",
  "A looksmaxxing brain surgeon explaining a procedure using Gen-Z slang",
  "The real reason the spooky Victorian ghost refuses to haunt your kitchen",
  "A fancy Michelin-star chef reacting to a TikTok rizz party menu",
  "What a sleeping bag monster is actually doing with all your missing socks",
  "A highly sophisticated squirrel giving a TED Talk on acorn hoard strategy",
  "A terrible excuse for why you brought a leaf blower to a first date",
  "The worst thing to hear from the person sitting next to you at a classical concert",
  "A funny name for an influencer who only does silent screaming videos",
  "What a houseplant is plotting when it stares at you from the windowsill",
  "The awkward moment when you realize you've been waving at a stranger for three minutes",
  "A pretentious sommelier describing the delicate notes of canned hot dog water",
  "The absolute worst song choice for a dramatic exit from a room",
  "A ridiculous title for a self-help book written by a very dramatic golden retriever",
  "The secret ingredient that makes the spooky cabin stew taste like copper",
  "A terrible slogan for an upscale retirement home for retired supervillains",
  "The most embarrassing thing to have projected on the screen during a Zoom meeting",
  "What you shouldn't say to the flight attendant when they ask if you want the chicken or beef",
  "A funny name for a haunted Victorian doll that just wants to play board games",
  "The most stressful way to unload the dishwasher while everyone is watching",
  "A luxury fashion brand that sells nothing but oversized, wet cardboard boxes",
  "What the spider in the corner of your bathroom is actually planning",
  "A terrible name for a petting zoo that only has slightly irritated geese",
  "The real reason your smart fridge is refusing to open its door",
  "The most awkward thing to ask a ghost during a midnight seance",
  "A ridiculous explanation for why you have a bag of frozen peas taped to your head",
  "A fancy opera singer trying to order a crunchwrap supreme at the drive-thru",
  "What the gargoyle on the cathedral roof is thinking about your outfit",
  "The absolute worst thing to say right after a beautiful violin solo",
  "A funny name for a wellness retreat where you just complain for three days",
  "The real reason you should never invite a woodland fairy to a brunch buffet",
  "What the dust bunnies under your bed are whispering about your cleaning habits",
  "A highly dramatic raccoon reciting Shakespeare on a dumpster",
  "The worst possible excuse for why you are wearing a snorkeling mask in a bank",
  "Something you should never say when someone shows you their newborn baby",
  "A funny name for a startup that delivers organic dirt to your door",
  "The awkward silence that follows a terrible high-five attempt",
  "A posh gentleman trying to explain the rules of a TikTok challenge",
  "What the ghost of a Victorian child thinks of modern energy drinks",
  "A terrible name for a new roller coaster that is actually very slow",
  "The worst thing to discover written in the guestbook of a remote cabin",
  "What the pigeons in the park are secretly plotting against the local baker",
  "A highly specific instruction manual for assembling a very wobbly chair",
  "The most pretentious way to describe eating a slice of cheap pizza",
  "A funny name for a support group for people who hate small talk",
  "The real reason why the ancient mummy refuses to leave its sarcophagus",
  "Something you shouldn't do while trying to impress a professional skateboarder",
  "A terrible thing to say to the barber who just completely ruined your hair",
  "A funny name for a luxury cruise ship that never leaves the harbor",
  "What the local frogs are chanting at the edge of the lake at 3 AM",
  "The most awkward thing to find in your pocket during a high-stakes poker game",
  "A ridiculous excuse for why you brought a live chicken to a board meeting",
  "What a very polite vampire says before biting your neck",
  "A high-fashion runway model wearing a literal garbage bag and looking smug",
  "The worst possible song to hum while walking through a dark, misty forest",
  "A funny name for a superhero whose only ability is making toast perfectly brown",
  "What the grocery store checkout scanner is thinking when it refuses to scan your item",
  "A terrible name for an artisanal cheese that smells like gym socks",
  "The most awkward thing to say when you accidentally bump shopping carts with a stranger",
  "What the ancient trees in the woods are gossiping about you",
  "A highly sophisticated loon trying to explain the stock market",
  "The worst thing to find inside a spooky wooden chest in the attic",
  "A funny name for a tiny pocket-sized dragon that only breathes sparks",
  "The real reason the lawnmower is refusing to start on a Saturday morning",
  "Something you shouldn't whisper to your horse before a race",
  "A terrible theme for a high-end luxury cocktail bar",
  "What the ghost in your attic is writing on the dusty window pane",
  "A funny name for a pet cat that behaves like an elite tactical soldier",
  "The awkward moment when you realize your microphone was unmuted during a yawn",
  "A classy butler delivering a bag of fast food on a silver platter",
  "What the crows are thinking when they watch you struggle with your umbrella",
  "The worst possible excuse for why you have a pumpkin on your head",
  "A funny name for a very bad pirate ship",
  "The most pretentious way to complain about a slightly drafty room",
  "What a sleeping bag monster thinks about your choice of pajamas",
  "A terrible thing to hear from your pilot right before takeoff",
  "A ridiculous fashion trend that involves wearing kitchen utensils",
  "What the squirrel is planning to do with the car keys it just stole",
  "A funny name for a gourmet restaurant that only serves cereal",
  "The worst thing to say during a quiet moment in a crowded elevator",
  "A highly sophisticated dog analyzing the vintage of a puddle",
  "The real reason the creepy portrait's eyes are moving",
  "Something you shouldn't say to a ghost who is trying to haunt you",
  "A terrible name for a new brand of sparkling water",
  "What the microwave is thinking when you heat up fish in the office breakroom",
  "A funny name for a penguin trying to pass as a waiter at a fancy gala",
  "The most awkward thing to happen during a serious hand-shake",
  "What the forest spirits are whispering to the lost hikers",
  "A pretentious artist describing their painting of a single wet noodle",
  "The worst thing to discover at the bottom of a fancy pool",
  "A funny name for a detective agency run entirely by owls",
  "A ridiculous excuse for why you have green paint all over your face",
  "What the moon says to the sun when they pass each other",
  "The absolute worst choice of music for a dramatic sword fight",
  "A terrible slogan for an organic vegetable farm",
  "Something you shouldn't do when meeting a giant forest troll",
  "A funny name for a haunted grandfather clock that is always late",
  "What the dishwasher is thinking when you load it completely wrong",
  "A highly dramatic squirrel swooning on a park bench",
  "The worst thing to find inside your vintage leather jacket",
  "A posh British aristocrat trying to explain a rap battle",
  "What the ghost of a Victorian maid thinks of your vacuum cleaner",
  "A terrible name for a luxury mattress brand",
  "The most awkward thing to say when you forget someone's name mid-sentence",
  "A funny name for an octopus that is trying to play the drums",
  "What the mushrooms in the damp woods are secretly discussing",
  "A ridiculous excuse for why you brought a metal detector to a wedding",
  "The absolute worst song to sing during a quiet mountain hike",
  "A terrible theme for an upscale fashion show",
  "What the fireplace is thinking when you throw damp wood onto it",
  "A funny name for a guard dog that is easily bribed with cheese",
  "Something you shouldn't whisper to the person in the middle seat on a long flight",
  "The most pretentious description of a simple peanut butter sandwich",
  "What the spooky owls are actually saying when they hoot at midnight",
  "A funny name for an elite secret society that meets in a basement laundry room",
  "The worst thing to find floating in your elegant afternoon tea",
  "A ridiculous fashion trend that requires wearing three hats at once",
  "What the raccoon thinks of your outdoor patio furniture",
  "A terrible name for an artisanal hot sauce",
  "The most awkward thing to say after a long, intense silence on a video call",
  "A highly dramatic beaver complaining about the quality of the local birch",
  "What the ghost in the basement does when you aren't looking",
  "A funny name for a wizard who only knows parlor tricks",
  "The real reason the ancient stone circle is glowing at night",
  "Something you shouldn't do during a highly formal tea ceremony",
  "A terrible excuse for why you are late to a medieval tournament",
  "What the forest creatures do when the campers finally fall asleep",
  "A funny name for a very moody lighthouse keeper",
  "The most pretentious way to describe a spilled cup of coffee",
  "What the scarecrow is secretly thinking about the crows",
  "A ridiculous reason to build a giant moat around your suburban house",
  "The worst thing to hear from a museum tour guide",
  "A funny name for a pigeon that thinks it's a high-society fashion critic",
  "What a posh vampire says when they accidentally burn their tongue on hot tea",
  "The awkward moment when you realize you've been talking to a mannequin",
  "What the forest owls think of your campfire singing voice",
  "A funny name for a pet ferret that is trained in martial arts",
  "The absolute worst song to play while escaping a swarm of bees",
  "A ridiculous excuse for why you are covered in glitter at a funeral",
  "What the grandfather clock is thinking when it strikes 13 times",
  "A pretentious wine critic reviewing the vintage of a juice box",
  "The worst thing to say during a quiet moment at a high-stakes chess match",
  "A funny name for a ghost that only haunts your kitchen pantry",
  "What the squirrels in the park think about your jogging technique",
  "A terrible name for an elegant perfume that smells like old library books",
  "Something you shouldn't say when you get lost in a hedge maze",
  "A funny name for a turtle that is trying to break the land speed record",
  "The real reason the spooky scarecrow is wearing a tailored suit",
  "What the local bats are discussing when they fly in circles at dusk",
  "A ridiculous excuse for why you brought a telescope to a diner",
  "The most awkward thing to say to a mime who won't stop following you",
  "A highly sophisticated frog writing a review of a local pond",
  "What the ghost of a medieval knight thinks of your smart TV",
  "A terrible theme for a luxury wedding on a yacht",
  "A funny name for a squirrel that is always trying to sell you insurance",
  "The worst thing to find inside a hollow pumpkin on Halloween",
  "Something you shouldn't do during a quiet moment in a cathedral",
  "A ridiculous fashion trend that involves wearing giant inflatable boots",
  "What the garden gnome is secretly writing down in its notebook",
  "A pretentious food critic describing the mouthfeel of a soggy potato chip",
  "The awkward silence after you tell a joke that only you find hilarious",
  "What the spooky old house is thinking when new tenants move in",
  "A funny name for a cat that thinks it is a renowned detective",
  "A terrible excuse for why you have a bird nest in your hair",
  "The absolute worst song to play during a high-stakes space mission",
  "What the smart toaster is secretly planning with the smart fridge",
  "A highly dramatic loon singing an opera about a lost fish",
  "The most awkward thing to say during a silent elevator ride with your boss",
  "A funny name for a ghost that only haunts your laundry basket",
  "What the crows think of your attempts to be stylish",
  "A terrible slogan for an upscale organic soap brand",
  "Something you shouldn't do when trying to impress a dragon",
  "A ridiculous reason to wear a suit of armor to the supermarket",
  "What the gargoyles on the roof do when it starts pouring rain",
  "A funny name for an owl that is terrible at keeping secrets",
  "The worst thing to find inside a vintage velvet chest",
  "A posh lady trying to explain how to do a kickflip on a skateboard",
  "What the trees in the forest whisper when a lumberjack walks by",
  "The one text you should never have sent but absolutely did",
  "What your browser history would say if it testified against you in court",
  "The world's worst podcast name and its completely niche topic",
  "A fortune cookie message that is alarmingly specific to your life right now",
  "What your pet would tell a therapist about living with you",
  "The lie your GPS is definitely telling you",
  "The unspoken rule at every wedding that nobody ever mentions",
  "What the first five minutes of therapy sound like when you're not ready to talk",
  "The least inspiring motivational poster ever hung in an office",
  "The real reason you stayed in that job for three extra years",
  "A breakup text written entirely in food delivery app lingo",
  "The one thing you pretend not to know how to do so nobody asks you to do it",
  "What doomscrolling at 2 AM is actually doing to your personality",
  "The most passive-aggressive way to leave a note for a roommate",
  "A rejected Hallmark movie title that's a little too real",
  "What the friend group chat looks like after someone cancels plans last minute",
  "The internal monologue of someone who just accidentally liked a photo from 2017",
  "A job title that sounds important but is completely made up",
  "The worst Wikipedia rabbit hole to fall into at midnight",
  "What your coworker is actually thinking during the all-hands meeting",
  "The most chaotic energy a person can bring to a potluck",
  "A dating app bio that is technically accurate but deeply concerning",
  "The thing everyone pretends they didn't see at the office holiday party",
  "What your search history says about you as a person",
  "A reality TV show that would ruin every friendship it touched",
  "The most cursed thing to say during the silence after someone says 'I love you' first",
  "What someone's Spotify Wrapped says about their entire personality",
  "A headline from a newspaper in a timeline where everything went slightly wrong",
  "The worst icebreaker question ever used at a team-building retreat",
  "What happens when two passive-aggressive people try to have an argument",
  "The thing you have to explain to a tourist that makes your city sound unhinged",
  "A secret society that sounds sinister but is actually just about something mundane",
  "The most dramatic possible response to running out of coffee",
  "What airport security is actually thinking while they wave you through",
  "A self-help book title written by someone who clearly needs help",
  "The worst possible way to end a first date that was actually going well",
  "What your houseplants would write in their Yelp review of you",
  "The thing your GPS reroutes around that it will never explain",
  "A conspiracy theory about why printers always break at the worst moment",
  "What the group chat looks like when someone asks 'what does everyone want for dinner'",
  "The most awkward way to run into an ex at a grocery store",
  "A name for the specific emotion you feel when your phone dies at 3%",
  "The thing every adult secretly still doesn't understand how to do",
  "What the delivery driver is thinking when they take a photo of your package",
  "A phrase that sounds encouraging but is actually devastating",
  "The most chaotic energy you can bring to a game night",
  "What someone's LinkedIn profile reveals about their deepest insecurities",
  "The worst possible person to get stuck next to on a red-eye flight",
  "A travel destination that sounds glamorous until you look it up",
  "What happens inside every person's brain when a meeting could've been an email",
  "The thing someone does that instantly tells you they were never in band",
  "A text you send that has a very different meaning with and without a period",
  "The most chaotic possible advice column response",
  "What a ghost from 1987 is most confused about in the modern world",
  "The unwritten rule of every neighborhood that nobody will officially admit to",
  "A very specific reason to ghost someone that is somehow totally valid",
  "What the vending machine is judging you for at 11:30 PM",
  "The moment you realized you had become your parents",
  "A way to describe your personality that sounds like a red flag but isn't",
  "The most unnecessary thing that exists and yet somehow you own one",
  "What adult you would say to teenage you, besides 'put down the phone'",
  "The worst possible thing to admit on a first date that is also totally true",
  "A conspiracy theory about what happens inside a car wash",
  "The thing every generation thinks it invented that it absolutely did not",
  "A job that sounds fictional but somehow requires a real degree",
  "What your dog is actually doing while you're at work",
  "The most chaotic energy you can bring to a baby shower",
  "A rejected name for a social media platform that explains why it was rejected",
  "What the person behind you in line is silently judging you for",
  "The phrase that sounds like an insult but is technically a compliment",
  "A completely unhinged reason to be late that is somehow true",
  "What the checkout self-scanner is thinking when it says 'unexpected item'",
  "The thing you lie about on a regular basis that doesn't even matter",
  "A children's book title that is way too real for adults",
  "What someone's home screen arrangement says about their mental state",
  "The most chaotic energy you can bring to a work presentation",
  "A plot twist ending to the last argument you had",
  "What the skeleton in a haunted house is actually tired of doing",
  "The most ominous possible out-of-office email auto-reply",
  "A very specific thing that makes you feel like a real adult",
  "What happens in your brain the moment you realize you left the stove on",
  "The worst possible thing to say immediately after you win an argument",
  "A name for the feeling you get when someone starts a sentence with 'no offense but'",
  "What a toddler and a CEO have in common",
  "The most unhinged possible reason to end a friendship that somehow feels fair",
  "A job interview question that would actually reveal a person's true character",
  "What your skeleton is doing while you're pretending everything's fine",
  "The thing every person Googles at 1 AM that they refuse to admit to",
  "A bumper sticker that perfectly describes your energy this week",
  "What happens when two people who are both 'bad at texting' date each other",
  "The most depressing phrase to hear from a smart speaker at full volume",
  "A very specific sign that someone was raised without Wi-Fi",
  "What your inner monologue sounds like in the checkout line at IKEA",
  "The most passive-aggressive thing you can put on a gift card",
  "A name for the specific pain of watching someone else explain your own joke",
  "What happens to a person the moment they discover they've been mispronouncing a word for years",
  "The most dramatic thing that can happen at a silent retreat",
  "A completely honest tagline for a popular social media app",
  "What a raccoon would put on its LinkedIn profile",
  "The internal debate you have every time you RSVP 'maybe'",
  "A reality check that arrives exactly ten years too late",
  "What the little voice in your head says right before you make a questionable decision",
  "The most unsettling compliment a stranger can give you",
  "A sign that a vacation has gone slightly off the rails",
  "What three-day-old leftovers would say if they could speak",
  "The worst possible time to receive an inspirational quote notification",
  "A term for the specific exhaustion of being perceived by other people",
  "What your alarm clock is actually trying to tell you",
  "The most chaotic possible last will and testament",
  "A thing that sounds like wisdom but is actually just a cry for help",
  "What it means when someone describes themselves as 'brutally honest'",
  "The most ominous fortune you could pull from a fortune cookie",
  "A job description that is technically accurate but sounds unhinged",
  "What happens inside every introvert's brain thirty minutes into a party",
  "The most unhinged advice your dad has ever given that turned out to be correct",
  "A phrase that means different things before and after you have kids",
  "What the ghost haunting your apartment is actually upset about",
  "The most passive-aggressive thing you can do at a potluck",
  "A sign that someone has been watching too much true crime",
  "What a motivational speaker would say if they were being completely honest"
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
  if (__pj && __pj.game === "quiplash" && __pj.code && (Date.now() - __pj.ts) < 20000) {
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

function renderSetup() {  const savedName = localStorage.getItem("lakehouse.playerName") || localStorage.getItem("quiplash.name") || "";
  const nameInput = el("input", {
    type: "text",
    placeholder: "Your name…",
    value: savedName,
    id: "q-name",
    style: "font-size:1.1rem; border-radius:14px; text-align:center; margin-bottom:14px; width:100%;"
  });

  const codeInput = el("input", {
    type: "text",
    placeholder: "4-LETTER CODE",
    id: "q-code",
    maxLength: 4,
    style: "font-size:1.3rem; border-radius:14px; text-align:center; text-transform:uppercase; letter-spacing:6px; margin-bottom:10px; width:100%;"
  });
  codeInput.addEventListener("input", () => { codeInput.value = codeInput.value.toUpperCase(); });

  const getName = () => {
    const n = nameInput.value.trim();
    if (!n) { toast("Enter your name first!"); return null; }
    localStorage.setItem("quiplash.name", n);
    return n;
  };

  // Pass & Play Names List
  const savedNames = store.get("quiplash.localNames", ["", "", ""]);
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
          store.set("quiplash.localNames", localNames);
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
              store.set("quiplash.localNames", localNames);
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
      if (localNames.length < 8) {
        localNames.push("");
        store.set("quiplash.localNames", localNames);
        drawLocalList();
      } else {
        toast("Max 8 players for local play.");
      }
    }
  });

  const startLocalBtn = el("button", {
    className: "btn",
    text: "Start Local Quiplash",
    style: "width:100%;",
    onClick: () => {
      const cleaned = localNames.map((n, idx) => n.trim() || `Player ${idx + 1}`).slice(0, 8);
      if (cleaned.length < 3) {
        toast("Need at least 3 players.");
        return;
      }
      isOnline = false;
      initGame(cleaned);
    }
  });

  // Category Toggles
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
          el("li", { text: "Secret Prompts: Each player is secretly given funny fill-in-the-blank prompts to answer on their device." }),
          el("li", { text: "Matchup Battles: Wacky prompts are displayed alongside two players' anonymized answers." }),
          el("li", { text: "Anonymous Voting: Everyone else votes secretly on their favorite response." }),
          el("li", { text: "Points & Quiplashes: Points are scored based on vote percentages. Get 100% of the votes for a grand QUIPLASH!" })
        ])
      ]);
      showRulesBtn.parentNode.insertBefore(rPanel, showRulesBtn.nextSibling);
    }
  });
  mount(
    gameTopbar("Quiplash Setup", () => { resetAll(); goHome(); }),
    el("div", { className: "panel center", style: "max-width: 440px; margin: 0 auto;" }, [
      el("div", { style: "width:64px; height:64px; margin:0 auto 12px; color:var(--sunset-soft);" }, [icons.meeting()]),
      el("h2", { text: "Quiplash", style: "margin-bottom: 4px;" }),
      el("p", { className: "muted", style: "margin-bottom:12px;", text: "Write hilarious answers to wacky prompts, then vote anonymously on the funniest combinations!" }),
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
      const res = await fetch(`${HTTP_BASE}/rooms/list?game=quiplash`).then(r => r.json());
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
    gameTopbar("Open Quiplash Rooms", () => { clearInterval(roomBrowserRefresh); renderSetup(); }),
    el("div", { className: "panel center" }, [
      el("p", { className: "muted", style: "margin:0; font-size:0.82rem;", text: "Tap Join to enter any open Quiplash lobby." })
    ]),
    el("div", { className: "panel" }, [listEl])
  );
}

// ── WebSockets Networking ──────────────────────────────────────────────────
function connectRoom(type, code = "") {
  isOnline = true;
  mount(
    gameTopbar("Connecting", () => { resetAll(); renderSetup(); }),
    el("div", { className: "panel center", style: "margin:30px auto; max-width:320px;" }, [
      el("div", { className: "spin-indicator", style: "font-size:2rem; margin-bottom:12px;", text: "🌀" }),
      el("p", { text: type === "create" ? "Creating room…" : `Joining ${code}…` })
    ])
  );

  const url = type === "create"
    ? `${WS_BASE}/ws/create?name=${encodeURIComponent(myName)}&game=quiplash`
    : `${WS_BASE}/ws/join?code=${code}&name=${encodeURIComponent(myName)}&game=quiplash`;

  isHost = (type === "create");
  socket = new WebSocket(url);

  socket.onmessage = (ev) => {
    try {
      const d = JSON.parse(ev.data);
      if (d.type === "created" || d.type === "player_joined") {
        roomCode = d.code;
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
      console.error("[Quiplash] Parse error:", e);
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
        game: "quiplash", private: false,
        lastPing: Date.now()
      }),
    });
  } catch (_) {}
}

function applyLobby(players) {
  gState = { phase: "lobby", players };
  myPlayerIdx = players.indexOf(myName);
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
        text: "Start Quiplash",
        style: "width:100%;",
        onClick: () => {
          if (players.length < 3) {
            toast("Need at least 3 players to start Quiplash!");
            return;
          }
          triggerOnlineGameStart();
        }
      })
    : el("div", { className: "muted center", text: "Waiting for host to start..." });

  mount(
    gameTopbar(`Room Code: ${roomCode}`, () => confirmQuitOnline()),
    el("div", { className: "panel center", style: "max-width: 480px; margin: 0 auto;" }, [
      el("h2", { text: "Quiplash Lobby" }),
      el("p", { className: "muted", text: "Gather 3 to 8 players online. Submit wacky answers and vote simultaneously on your screens!" }),
      list,
      el("div", { className: "spacer" }),
      startBtn
    ])
  );
}

function confirmQuitOnline() {
  if (confirm(isOnline ? "Disconnect and quit Quiplash?" : "Quit Quiplash?")) {
    resetAll();
    renderSetup();
  }
}

// ── Quiplash Game Play Coordination ───────────────────────────────────────────
function initGame(players) {
  const shuffledPrompts = shuffle(PROMPTS);
  const scores = {};
  players.forEach(p => { scores[p] = 0; });

  gState = {
    phase: "writing",
    players,
    scores,
    promptsPool: shuffledPrompts,
    round: 1,
    writingQueue: [],
    votingQueue: [],
    submittedAnswers: {}, // key: player -> answers map
    localWritingIdx: 0,
    currentVoteIdx: 0,
    activeVotes: {}, // voter -> option (1 or 2)
    submittedVotesCount: 0
  };

  if (isOnline) {
    // Handled by triggerOnlineGameStart / handleRelay
  } else {
    startRoundWriting();
  }
}

function triggerOnlineGameStart() {
  const scores = {};
  gState.players.forEach(p => { scores[p] = 0; });

  const shuffledPrompts = shuffle(PROMPTS);

  const N = gState.players.length;
  const roundPrompts = [];
  for (let i = 0; i < N; i++) {
    roundPrompts.push(shuffledPrompts.pop());
  }

  // Construct writing queue assignments
  const writingQueue = [];
  for (let i = 0; i < N; i++) {
    const p1 = gState.players[i];
    const p2 = gState.players[(i + 1) % N];
    const promptText = roundPrompts[i];

    writingQueue.push({ player: p1, promptIdx: i, promptText, answer: "" });
    writingQueue.push({ player: p2, promptIdx: i, promptText, answer: "" });
  }

  const startPayload = {
    type: "QUIPLASH_START",
    scores,
    promptsPool: shuffledPrompts,
    writingQueue,
    round: 1
  };

  relay(startPayload);
}

function handleRelay(action, sender) {
  if (action.type === "QUIPLASH_START") {
    gState = {
      phase: "writing",
      players: gState.players,
      scores: action.scores,
      promptsPool: action.promptsPool,
      round: action.round,
      writingQueue: action.writingQueue,
      submittedAnswersCount: 0,
      myTasks: action.writingQueue.filter(t => t.player === (gState.players[myPlayerIdx] ?? myName)),
      localWritingIdx: 0
    };
    renderWritingPhase();
  } 
  
  else if (action.type === "QUIPLASH_SUBMIT_WORD") {
    const task = gState.writingQueue.find(t => t.player === action.player && t.promptIdx === action.promptIdx);
    if (task) {
      task.answer = action.answer;
    }
    gState.submittedAnswersCount = gState.writingQueue.filter(t => t.answer).length;

    const waitingEl = document.getElementById("quip-waiting");
    if (waitingEl) {
      waitingEl.textContent = `Submitted: ${gState.submittedAnswersCount} / ${gState.writingQueue.length} answers`;
    }

    if (isHost) {
      const allAnswersIn = gState.writingQueue.every(t => t.answer);
      if (allAnswersIn) {
        // Compile standard voting queue!
        const N = gState.players.length;
        const votingQueue = [];
        for (let i = 0; i < N; i++) {
          const tasks = gState.writingQueue.filter(t => t.promptIdx === i);
          if (tasks.length === 2) {
            votingQueue.push({
              promptIdx: i,
              promptText: tasks[0].promptText,
              p1: tasks[0].player,
              p2: tasks[1].player,
              ans1: tasks[0].answer,
              ans2: tasks[1].answer,
              votes: {}
            });
          }
        }

        const votePayload = {
          type: "QUIPLASH_START_VOTING",
          votingQueue: shuffle(votingQueue)
        };
        relay(votePayload);
      }
    }
  }

  else if (action.type === "QUIPLASH_START_VOTING") {
    gState.phase = "voting";
    gState.votingQueue = action.votingQueue;
    gState.currentVoteIdx = 0;
    gState.activeVotes = {};
    gState.submittedVotesCount = 0;
    renderVotingRound();
  }

  else if (action.type === "QUIPLASH_CAST_VOTE") {
    const voteItem = gState.votingQueue[gState.currentVoteIdx];
    voteItem.votes[action.voter] = action.option; // 1 or 2
    gState.submittedVotesCount = Object.keys(voteItem.votes).length;

    const eligibleVoters = gState.players.filter(p => p !== voteItem.p1 && p !== voteItem.p2);
    const progressEl = document.getElementById("quip-vote-waiting");
    if (progressEl) {
      progressEl.textContent = `Submitted: ${gState.submittedVotesCount} / ${eligibleVoters.length} votes`;
    }

    if (isHost) {
      const allVotesIn = eligibleVoters.every(vName => voteItem.votes[vName] != null);
      if (allVotesIn) {
        let count1 = 0, count2 = 0;
        eligibleVoters.forEach(vName => {
          if (voteItem.votes[vName] === 1) count1++;
          if (voteItem.votes[vName] === 2) count2++;
        });

        const multiplier = gState.round === 2 ? 200 : 100;
        const pts1 = count1 * multiplier;
        const pts2 = count2 * multiplier;

        let q1 = (count1 > 0 && count2 === 0);
        let q2 = (count2 > 0 && count1 === 0);

        const revealPayload = {
          type: "QUIPLASH_REVEAL_VOTE",
          count1, count2, pts1, pts2, q1, q2
        };
        relay(revealPayload);
      }
    }
  }

  else if (action.type === "QUIPLASH_REVEAL_VOTE") {
    gState.phase = "reveal";
    gState.scores[gState.votingQueue[gState.currentVoteIdx].p1] += action.pts1 + (action.q1 ? 150 : 0);
    gState.scores[gState.votingQueue[gState.currentVoteIdx].p2] += action.pts2 + (action.q2 ? 150 : 0);
    renderSynchedRevealScreen(action);
  }

  else if (action.type === "QUIPLASH_NEXT_VOTE") {
    gState.currentVoteIdx = action.nextIdx;
    gState.submittedVotesCount = 0;
    renderVotingRound();
  }

  else if (action.type === "QUIPLASH_LEADERBOARD") {
    gState.phase = "leaderboard";
    renderLeaderboardScreen();
  }

  else if (action.type === "QUIPLASH_LAST_LASH") {
    gState.phase = "lastlash";
    gState.votingQueue = action.votingQueue;
    gState.activeVotes = {};
    gState.submittedVotesCount = 0;
    renderLastLashVoteScreen();
  }

  else if (action.type === "QUIPLASH_CAST_LAST_LASH") {
    const voteItem = gState.votingQueue[0];
    voteItem.votes[action.voter] = action.ansIdx;
    gState.submittedVotesCount = Object.keys(voteItem.votes).length;

    const progressEl = document.getElementById("quip-vote-waiting");
    if (progressEl) {
      progressEl.textContent = `Submitted: ${gState.submittedVotesCount} / ${gState.players.length} votes`;
    }

    if (isHost) {
      const allVotesIn = gState.players.every(p => voteItem.votes[p] != null);
      if (allVotesIn) {
        const tallies = voteItem.answers.map(() => 0);
        gState.players.forEach(p => {
          tallies[voteItem.votes[p]]++;
        });

        // Award 300 points per vote
        voteItem.answers.forEach((ansObj, aIdx) => {
          const votes = tallies[aIdx];
          const pts = votes * 300;
          gState.scores[ansObj.player] += pts;
          ansObj.votes = votes;
          ansObj.pointsEarned = pts;
        });

        const lastReveal = {
          type: "QUIPLASH_LAST_REVEAL",
          answers: voteItem.answers
        };
        relay(lastReveal);
      }
    }
  }

  else if (action.type === "QUIPLASH_LAST_REVEAL") {
    gState.phase = "lastreveal";
    gState.votingQueue[0].answers = action.answers;
    renderLastRevealScreen();
  }
}

// ── Synced Writing Phase ──────────────────────────────────────────────────────
function startRoundWriting() {
  gState.writingQueue = [];
  gState.votingQueue = [];

  const N = gState.players.length;
  if (gState.round < 3) {
    const roundPrompts = [];
    for (let i = 0; i < N; i++) {
      roundPrompts.push(gState.promptsPool.pop() || "A funny prompt.");
    }
    for (let i = 0; i < N; i++) {
      const p1 = gState.players[i];
      const p2 = gState.players[(i + 1) % N];
      const promptText = roundPrompts[i];

      gState.writingQueue.push({ player: p1, promptIdx: i, promptText, answer: "" });
      gState.writingQueue.push({ player: p2, promptIdx: i, promptText, answer: "" });
    }
  } else {
    const lastLashPrompt = gState.promptsPool.pop() || "The ultimate final prompt.";
    gState.players.forEach(p => {
      gState.writingQueue.push({ player: p, promptIdx: 0, promptText: lastLashPrompt, answer: "" });
    });
  }

  gState.writingQueue = shuffle(gState.writingQueue);
  gState.localWritingIdx = 0;
  
  if (isOnline) {
    // Done inside triggerOnlineGameStart
  } else {
    triggerLocalPassPlayWriting();
  }
}

function triggerLocalPassPlayWriting() {
  const nextTask = gState.writingQueue.find(t => !t.answer);
  if (!nextTask) {
    prepareVotingQueue();
    return;
  }

  mount(
    gameTopbar(`Quiplash — Round ${gState.round}`, () => confirmQuitLocal()),
    el("div", { className: "panel center", style: "max-width: 480px; margin: 30px auto; padding: 24px;" }, [
      el("h2", { text: `Pass the iPad!` }),
      el("p", { className: "muted", style: "font-size: 1.1rem; margin: 20px 0;", html: `Hand the device secretly to <strong style="color:var(--sunset-soft); font-size: 1.3rem;">${nextTask.player}</strong>.` }),
      el("button", {
        className: "btn",
        text: "I am ready to write",
        onClick: () => renderWritingInput(nextTask)
      })
    ])
  );
}

function confirmQuitLocal() {
  if (confirm("Quit Quiplash?")) {
    resetAll();
    renderSetup();
  }
}

function renderWritingPhase() {
  const tasks = isOnline ? gState.myTasks : [gState.writingQueue.find(t => !t.answer)];
  const currentTask = isOnline ? tasks[gState.localWritingIdx] : tasks[0];

  if (!currentTask) {
    // Waiting for other online players
    mount(
      gameTopbar("Mad Libs", () => confirmQuitOnline()),
      el("div", { className: "panel center", style: "max-width: 400px; margin: 30px auto;" }, [
        el("div", { className: "spin-indicator", style: "font-size:2rem; margin-bottom:12px;", text: "⏳" }),
        el("h3", { text: "Awaiting other players..." }),
        el("p", { className: "muted", text: "You have completed your tasks. Relax, voting starts soon!" }),
        el("div", { id: "quip-waiting", style: "font-size:0.9rem; font-weight:bold; color:var(--sunset-soft); margin-top:8px;", text: `Submitted: ${gState.submittedAnswersCount} / ${gState.writingQueue.length} answers` })
      ])
    );
    return;
  }

  renderWritingInput(currentTask);
}

function renderWritingInput(task) {
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
      if (!ans) { toast("Please write something funny!"); return; }
      
      submitBtn.disabled = true;
      inputEl.disabled = true;

      if (isOnline) {
        const action = {
          type: "QUIPLASH_SUBMIT_WORD",
          player: myName,
          promptIdx: task.promptIdx,
          answer: ans
        };
        relay(action);
      } else {
        task.answer = ans;
        triggerLocalPassPlayWriting();
      }
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

  mount(gameTopbar(`Quiplash — Round ${gState.round}`, () => isOnline ? confirmQuitOnline() : confirmQuitLocal()), layout);
  inputEl.focus();
}

// ── Synced Voting Phase ───────────────────────────────────────────────────────
function prepareVotingQueue() {
  const N = gState.players.length;
  if (gState.round < 3) {
    for (let i = 0; i < N; i++) {
      const tasks = gState.writingQueue.filter(t => t.promptIdx === i);
      if (tasks.length === 2) {
        gState.votingQueue.push({
          promptIdx: i,
          promptText: tasks[0].promptText,
          p1: tasks[0].player,
          p2: tasks[1].player,
          ans1: tasks[0].answer,
          ans2: tasks[1].answer,
          votes: {}
        });
      }
    }
  } else {
    const tasks = gState.writingQueue;
    gState.votingQueue = [{
      promptIdx: 0,
      promptText: tasks[0].promptText,
      answers: tasks.map(t => ({ player: t.player, answer: t.answer })),
      votes: {}
    }];
  }

  gState.votingQueue = shuffle(gState.votingQueue);
  gState.currentVoteIdx = 0;
  renderVotingRound();
}

function renderVotingRound() {
  const idx = gState.currentVoteIdx;
  if (idx >= gState.votingQueue.length) {
    renderLeaderboardScreen();
    return;
  }

  const voteItem = gState.votingQueue[idx];
  if (gState.round < 3) {
    renderStandardVoteScreen(voteItem);
  } else {
    renderLastLashVoteScreen(voteItem);
  }
}

function renderStandardVoteScreen(item) {
  const voters = gState.players.filter(p => p !== item.p1 && p !== item.p2);
  const userCanVote = voters.includes(isOnline ? myName : gState.players[0]);

  if (isOnline && !userCanVote) {
    // This player was one of the answers! They just have to wait.
    mount(
      gameTopbar("Quiplash — Voting", () => confirmQuitOnline()),
      el("div", { className: "panel center", style: "max-width: 440px; margin:30px auto;" }, [
        el("div", { className: "spin-indicator", style: "font-size:2rem; margin-bottom:12px;", text: "⏳" }),
        el("h3", { text: "Your Answer is Up!" }),
        el("p", { className: "muted", text: "You cannot vote on your own matchup! Relax while others decide." }),
        el("div", { id: "quip-vote-waiting", style: "font-size:0.9rem; font-weight:bold; color:var(--sunset-soft); margin-top:8px;", text: `Submitted: ${gState.submittedVotesCount} / ${voters.length} votes` })
      ])
    );
    return;
  }

  const activeVotes = {};
  if (isOnline) {
    activeVotes[myName] = null;
  } else {
    voters.forEach(v => { activeVotes[v] = null; });
  }

  const voterGrid = el("div", { style: "margin: 20px 0; display: flex; flex-direction: column; gap: 8px;" });

  function drawVoterGrid() {
    voterGrid.innerHTML = "";
    if (isOnline) {
      const voteVal = activeVotes[myName];
      voterGrid.appendChild(el("div", { style: "display:flex; justify-content:center; gap:12px; margin-top:12px;" }, [
        el("button", {
          className: voteVal === 1 ? "btn" : "btn ghost",
          text: "Vote Option A",
          style: "padding: 8px 24px; margin:0;",
          onClick: () => {
            activeVotes[myName] = 1;
            drawVoterGrid();
            submitOnlineVote(1);
          }
        }),
        el("button", {
          className: voteVal === 2 ? "btn" : "btn ghost",
          text: "Vote Option B",
          style: "padding: 8px 24px; margin:0;",
          onClick: () => {
            activeVotes[myName] = 2;
            drawVoterGrid();
            submitOnlineVote(2);
          }
        })
      ]));
    } else {
      voters.forEach(vName => {
        const voteVal = activeVotes[vName];
        voterGrid.appendChild(el("div", {
          style: "display: flex; justify-content: space-between; align-items: center; padding: 8px 16px; background: rgba(255,255,255,0.02); border-radius: 10px; border: 1px solid rgba(255,255,255,0.05);"
        }, [
          el("span", { text: vName, style: "font-weight: 500;" }),
          el("div", { style: "display: flex; gap: 8px;" }, [
            el("button", {
              className: voteVal === 1 ? "btn small" : "btn ghost small",
              text: "Left",
              style: "padding: 4px 14px; margin:0;",
              onClick: () => { activeVotes[vName] = 1; drawVoterGrid(); checkLocalSubmittable(); }
            }),
            el("button", {
              className: voteVal === 2 ? "btn small" : "btn ghost small",
              text: "Right",
              style: "padding: 4px 14px; margin:0;",
              onClick: () => { activeVotes[vName] = 2; drawVoterGrid(); checkLocalSubmittable(); }
            })
          ])
        ]));
      });
    }
  }

  function submitOnlineVote(opt) {
    const action = {
      type: "QUIPLASH_CAST_VOTE",
      voter: myName,
      option: opt
    };
    relay(action);

    mount(
      gameTopbar("Quiplash — Voting", () => confirmQuitOnline()),
      el("div", { className: "panel center", style: "max-width: 440px; margin: 30px auto;" }, [
        el("div", { className: "spin-indicator", style: "font-size:2rem; margin-bottom:12px;", text: "⏳" }),
        el("h3", { text: "Vote Cast!" }),
        el("p", { className: "muted", text: "Waiting for other players to submit their votes..." }),
        el("div", { id: "quip-vote-waiting", style: "font-size:0.9rem; font-weight:bold; color:var(--sunset-soft); margin-top:8px;", text: `Submitted: ${gState.submittedVotesCount} / ${voters.length} votes` })
      ])
    );
  }

  const submitLocalBtn = el("button", {
    className: "btn",
    text: "Submit & Reveal",
    disabled: true,
    onClick: () => {
      let count1 = 0, count2 = 0;
      voters.forEach(v => {
        if (activeVotes[v] === 1) count1++;
        if (activeVotes[v] === 2) count2++;
      });

      const multiplier = gState.round === 2 ? 200 : 100;
      const pts1 = count1 * multiplier;
      const pts2 = count2 * multiplier;
      
      let q1 = (count1 > 0 && count2 === 0);
      let q2 = (count2 > 0 && count1 === 0);

      gState.scores[item.p1] += pts1 + (q1 ? 150 : 0);
      gState.scores[item.p2] += pts2 + (q2 ? 150 : 0);

      renderLocalStandardReveal(item, count1, count2, pts1, pts2, q1, q2);
    }
  });

  function checkLocalSubmittable() {
    const allVoted = voters.every(v => activeVotes[v] !== null);
    submitLocalBtn.disabled = !allVoted;
  }

  drawVoterGrid();

  const layout = el("div", { className: "panel center", style: "max-width: 600px; margin: 0 auto;" }, [
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
    el("h4", { text: isOnline ? "Cast Your Vote" : "Cast Votes (all other players)", style: "font-size: 0.9rem; letter-spacing: 0.5px;" }),
    voterGrid,
    isOnline ? null : submitLocalBtn
  ]);

  mount(gameTopbar(`Quiplash — Voting`, () => isOnline ? confirmQuitOnline() : confirmQuitLocal()), layout);
}

function renderSynchedRevealScreen(action) {
  const item = gState.votingQueue[gState.currentVoteIdx];
  const count1 = action.count1;
  const count2 = action.count2;

  const nextBtn = isHost
    ? el("button", {
        className: "btn",
        text: gState.currentVoteIdx + 1 < gState.votingQueue.length ? "Next Prompt" : "Show Standings",
        onClick: () => {
          const nextIdx = gState.currentVoteIdx + 1;
          if (nextIdx < gState.votingQueue.length) {
            const nextPayload = {
              type: "QUIPLASH_NEXT_VOTE",
              nextIdx
            };
            relay(nextPayload);
          } else {
            const endPayload = {
              type: "QUIPLASH_LEADERBOARD"
            };
            relay(endPayload);
          }
        }
      })
    : el("div", { className: "muted center", text: "Waiting for host to flip page..." });

  const layout = el("div", { className: "panel center", style: "max-width: 600px; margin: 0 auto; text-align: center;" }, [
    el("blockquote", { text: `"${item.promptText}"`, style: "font-size: 1.3rem; border: none; padding: 0; font-weight: bold; margin-bottom: 24px;" }),
    el("div", { style: "display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;" }, [
      el("div", {
        className: "panel center",
        style: `border: 2px solid ${count1 >= count2 ? "var(--sunset-soft)" : "rgba(255,255,255,0.05)"}; background: rgba(255,255,255,0.01); border-radius: 12px; padding: 16px;`
      }, [
        el("h3", { text: item.ans1, style: "font-size: 1.3rem; font-weight: bold; margin-top: 0;" }),
        el("div", { text: `By ${item.p1}`, style: "font-weight: 500; font-size: 0.9rem; color: var(--sunset-soft);" }),
        el("div", { text: `${count1} ${count1 === 1 ? 'vote' : 'votes'} (+${action.pts1} pts)`, style: "font-size: 0.85rem; margin-top: 4px; font-weight: bold;" }),
        action.q1 ? el("div", { text: "QUIPLASH BONUS (+150 pts)", style: "font-size: 0.7rem; font-weight: bold; color: #00ffaa; margin-top: 6px; letter-spacing: 0.5px;" }) : null
      ]),
      el("div", {
        className: "panel center",
        style: `border: 2px solid ${count2 >= count1 ? "var(--sunset-soft)" : "rgba(255,255,255,0.05)"}; background: rgba(255,255,255,0.01); border-radius: 12px; padding: 16px;`
      }, [
        el("h3", { text: item.ans2, style: "font-size: 1.3rem; font-weight: bold; margin-top: 0;" }),
        el("div", { text: `By ${item.p2}`, style: "font-weight: 500; font-size: 0.9rem; color: var(--sunset-soft);" }),
        el("div", { text: `${count2} ${count2 === 1 ? 'vote' : 'votes'} (+${action.pts2} pts)`, style: "font-size: 0.85rem; margin-top: 4px; font-weight: bold;" }),
        action.q2 ? el("div", { text: "QUIPLASH BONUS (+150 pts)", style: "font-size: 0.7rem; font-weight: bold; color: #00ffaa; margin-top: 6px; letter-spacing: 0.5px;" }) : null
      ])
    ]),
    nextBtn
  ]);

  mount(gameTopbar(`Quiplash — Reveal`, () => confirmQuitOnline()), layout);
}

function renderLocalStandardReveal(item, c1, c2, pts1, pts2, q1, q2) {
  const container = el("div", { className: "panel center", style: "max-width: 600px; margin: 0 auto; text-align: center;" }, [
    el("blockquote", { text: `"${item.promptText}"`, style: "font-size: 1.3rem; border: none; padding: 0; font-weight: bold; margin-bottom: 24px;" }),
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
      onClick: () => {
        gState.currentVoteIdx++;
        renderVotingRound();
      }
    })
  ]);

  mount(gameTopbar(`Quiplash — Reveal`, () => confirmQuitLocal()), container);
}

// ── Last Lash Synced Voting ──────────────────────────────────────────────────
function renderLastLashVoteScreen(item) {
  const voteItem = item || gState.votingQueue[0];
  const userAnswers = voteItem.answers.filter(a => a.player === myName);
  const userHasAnswer = userAnswers.length > 0;

  const allowedOptions = voteItem.answers
    .map((ansObj, aIdx) => ({ ansObj, aIdx }))
    .filter(entry => !isOnline || entry.ansObj.player !== myName);

  if (isOnline) {
    const activeVoteVal = gState.activeVotes[myName];
    const selectOptions = [el("option", { value: "", text: "Choose your favorite..." })];
    allowedOptions.forEach(opt => {
      selectOptions.push(el("option", { value: String(opt.aIdx), text: `"${opt.ansObj.answer}"` }));
    });

    const selectEl = el("select", {
      style: "width: 100%; border-radius: 12px; margin-top:16px;",
      onChange: (e) => {
        if (e.target.value !== "") {
          const opt = parseInt(e.target.value, 10);
          submitOnlineLastLashVote(opt);
        }
      }
    }, selectOptions);

    function submitOnlineLastLashVote(ansIdx) {
      const action = {
        type: "QUIPLASH_CAST_LAST_LASH",
        voter: myName,
        ansIdx
      };
      relay(action);

      mount(
        gameTopbar("Quiplash — Final Lash", () => confirmQuitOnline()),
        el("div", { className: "panel center", style: "max-width: 440px; margin: 30px auto;" }, [
          el("div", { className: "spin-indicator", style: "font-size:2rem; margin-bottom:12px;", text: "⏳" }),
          el("h3", { text: "Final Vote Cast!" }),
          el("p", { className: "muted", text: "Waiting for other players to submit their votes..." }),
          el("div", { id: "quip-vote-waiting", style: "font-size:0.9rem; font-weight:bold; color:var(--sunset-soft); margin-top:8px;", text: `Submitted: ${gState.submittedVotesCount} / ${gState.players.length} votes` })
        ])
      );
    }

    mount(
      gameTopbar(`Quiplash — The Last Lash`, () => confirmQuitOnline()),
      el("div", { className: "panel center", style: "max-width: 600px; margin: 0 auto;" }, [
        el("h3", { text: "THE LAST LASH", style: "color:var(--sunset-soft); letter-spacing:1px; margin-top:0;" }),
        el("blockquote", { text: `"${voteItem.promptText}"`, style: "font-size: 1.4rem; font-weight: bold; border: none; padding: 0;" }),
        el("div", { className: "spacer" }),
        userHasAnswer ? el("p", { className: "muted", text: "Your answer is up! Choose your favorite anonymously from the others." }) : el("p", { className: "muted", text: "Select your favorite answer below." }),
        selectEl
      ])
    );
  } else {
    // Local P&P selection dropdowns for all players
    const activeVotes = {};
    gState.players.forEach(p => { activeVotes[p] = null; });

    const voterGrid = el("div", { style: "margin: 20px 0; display: flex; flex-direction: column; gap: 8px;" });

    function drawVoterGrid() {
      voterGrid.innerHTML = "";
      gState.players.forEach(pName => {
        const allowed = voteItem.answers
          .map((ansObj, aIdx) => ({ ansObj, aIdx }))
          .filter(entry => entry.ansObj.player !== pName);

        const selectOptions = [el("option", { value: "", text: "Choose an answer..." })];
        allowed.forEach(opt => {
          selectOptions.push(el("option", { value: String(opt.aIdx), text: `"${opt.ansObj.answer}"` }));
        });

        const select = el("select", {
          style: "max-width: 260px; font-size: 0.85rem; border-radius: 8px;",
          onChange: (e) => {
            activeVotes[pName] = e.target.value === "" ? null : parseInt(e.target.value, 10);
            checkSubmittable();
          }
        }, selectOptions);

        voterGrid.appendChild(el("div", {
          style: "display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; background: rgba(255,255,255,0.02); border-radius: 10px; border: 1px solid rgba(255,255,255,0.05);"
        }, [
          el("span", { text: pName, style: "font-weight: 500;" }),
          select
        ]));
      });
    }

    const submitBtn = el("button", {
      className: "btn",
      text: "Reveal Last Lash",
      disabled: true,
      onClick: () => {
        const tallies = voteItem.answers.map(() => 0);
        gState.players.forEach(p => {
          const choice = activeVotes[p];
          if (choice !== null) tallies[choice]++;
        });

        voteItem.answers.forEach((ansObj, aIdx) => {
          const votes = tallies[aIdx];
          const pts = votes * 300;
          gState.scores[ansObj.player] += pts;
          ansObj.votes = votes;
          ansObj.pointsEarned = pts;
        });

        renderSynchedRevealScreenLastLash(voteItem.answers);
      }
    });

    function checkSubmittable() {
      const allVoted = gState.players.every(p => activeVotes[p] !== null);
      submitBtn.disabled = !allVoted;
    }

    drawVoterGrid();

    mount(
      gameTopbar("Quiplash — Final Lash", () => confirmQuitLocal()),
      el("div", { className: "panel center", style: "max-width: 600px; margin: 0 auto;" }, [
        el("h3", { text: "THE LAST LASH", style: "color:var(--sunset-soft); letter-spacing:1px; margin-top:0;" }),
        el("blockquote", { text: `"${voteItem.promptText}"`, style: "font-size: 1.4rem; font-weight: bold; border: none; padding: 0;" }),
        el("div", { className: "spacer" }),
        voterGrid,
        submitBtn
      ])
    );
  }
}

function renderSynchedRevealScreenLastLash(answers) {
  const voteItem = gState.votingQueue[0];
  const sorted = answers.slice().sort((a, b) => b.votes - a.votes);

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
        el("div", { text: `+${ansObj.pointsEarned} pts`, style: "font-size: 0.85rem; color:#00ffaa;" })
      ])
    ]);
  });

  const nextBtn = isOnline && !isHost
    ? el("div", { className: "muted center", text: "Waiting for host to flip page..." })
    : el("button", {
        className: "btn",
        text: "Show Final Standings",
        onClick: () => {
          if (isOnline) {
            const endPayload = { type: "QUIPLASH_LEADERBOARD" };
            relay(endPayload);
          } else {
            renderGameResults();
          }
        }
      });

  mount(
    gameTopbar("Quiplash — Final Lash Reveal", () => isOnline ? confirmQuitOnline() : confirmQuitLocal()),
    el("div", { className: "panel center", style: "max-width: 600px; margin: 0 auto;" }, [
      el("blockquote", { text: `"${voteItem.promptText}"`, style: "font-size: 1.3rem; border:none; padding:0; font-weight:bold; margin-bottom:20px;" }),
      ...blockRows,
      el("div", { className: "spacer" }),
      nextBtn
    ])
  );
}

function renderLastRevealScreen() {
  renderSynchedRevealScreenLastLash(gState.votingQueue[0].answers);
}

// ── Sync Leaderboard & Scores ────────────────────────────────────────────────
function renderLeaderboardScreen() {
  const standings = gState.players.map(pName => ({
    name: pName,
    score: gState.scores[pName]
  })).sort((a, b) => b.score - a.score);

  const listRows = standings.map((st, i) => {
    return el("div", {
      style: "display:flex; justify-content:space-between; align-items:center; padding:10px 16px; background:rgba(255,255,255,0.02); border-radius:10px; margin-bottom:8px;"
    }, [
      el("div", { style: "font-weight:500;" }, [document.createTextNode(`${i + 1}. ${st.name}${isOnline && st.name === myName ? " (You)" : ""}`)]),
      el("div", { text: String(st.score), style: "font-weight:bold; color:var(--sunset-soft);" })
    ]);
  });

  const isFinal = gState.round >= 3;
  let btnText = "Start Round 2 (Double Points)";
  if (gState.round === 2) {
    btnText = "Start Round 3 (The Last Lash)";
  }

  let nextBtn = null;
  if (isFinal) {
    nextBtn = isOnline && !isHost
      ? el("div", { className: "muted center", text: "Waiting for host to end game..." })
      : el("button", {
          className: "btn",
          text: "Show Final Standings",
          onClick: () => {
            if (isOnline) {
              // Final results synced
              renderGameResults();
            } else {
              renderGameResults();
            }
          }
        });
  } else {
    nextBtn = isOnline && !isHost
      ? el("div", { className: "muted center", text: "Waiting for host to start next round..." })
      : el("button", {
          className: "btn",
          text: btnText,
          onClick: () => {
            const nextRound = gState.round + 1;
            if (isOnline) {
              const shuffledPrompts = shuffle(gState.promptsPool);
              const N = gState.players.length;
              const writingQueue = [];

              if (nextRound === 2) {
                const roundPrompts = [];
                for (let i = 0; i < N; i++) {
                  roundPrompts.push(shuffledPrompts.pop());
                }
                for (let i = 0; i < N; i++) {
                  const p1 = gState.players[i];
                  const p2 = gState.players[(i + 1) % N];
                  const promptText = roundPrompts[i];

                  writingQueue.push({ player: p1, promptIdx: i, promptText, answer: "" });
                  writingQueue.push({ player: p2, promptIdx: i, promptText, answer: "" });
                }
              } else {
                const lastLashPrompt = shuffledPrompts.pop();
                gState.players.forEach(p => {
                  writingQueue.push({ player: p, promptIdx: 0, promptText: lastLashPrompt, answer: "" });
                });
              }

              const nextPayload = {
                type: "QUIPLASH_START",
                scores: gState.scores,
                promptsPool: shuffledPrompts,
                writingQueue,
                round: nextRound
              };
              relay(nextPayload);
            } else {
              gState.round++;
              startRoundWriting();
            }
          }
        });
  }

  mount(
    gameTopbar(isFinal ? "Final Leaderboard" : `Quiplash — Round ${gState.round} Scores`, () => isOnline ? confirmQuitOnline() : confirmQuitLocal()),
    el("div", { className: "panel center", style: "max-width: 480px; margin: 0 auto;" }, [
      el("h2", { text: isFinal ? "Final Scores" : "Current Standings" }),
      ...listRows,
      el("div", { className: "spacer" }),
      nextBtn
    ])
  );
}

function renderGameResults() {
  const standings = gState.players.map(pName => ({
    name: pName,
    score: gState.scores[pName]
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
    onClick: () => {
      resetAll();
      goHome();
    }
  });

  mount(
    gameTopbar("Quiplash — Final Standings", () => { resetAll(); goHome(); }),
    el("div", { className: "panel center", style: "max-width: 480px; margin: 0 auto;" }, [
      el("h1", { text: "Game Over!", style: "color: var(--sunset-soft); font-size: 2.2rem; font-weight: 900; margin-top: 0;" }),
      el("p", { className: "muted", text: "Congratulations to the champion! Here are the final scores:" }),
      ...listRows,
      el("div", { className: "spacer" }),
      lobbyBtn
    ])
  );
}
