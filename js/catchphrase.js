// Lake House Catchphrase — fast-paced hot-potato word guessing game!
import { el, mount, toast, store, shuffle, HTTP_BASE, WS_BASE } from "./ui.js";
import { icons } from "./icons.js";

// Standard Word Pools
const FAM_WORDS = [
  "marshmallow", "canoe", "campfire", "sleeping bag", "bear claw", "fishing rod", "paddle",
  "mosquito", "treehouse", "hot dog", "pinecone", "beaver dam", "hiking boot", "cooler",
  "flashlight", "marshmallow stick", "compass", "hammock", "squirrel", "lake house", "deck chair",
  "wild berries", "tent pole", "life jacket", "picnic basket", "acorn", "sleeping pad", "thermos",
  "muddy boots", "mosquito spray", "starry sky", "wooden dock", "fire pit", "frog catching", "stargazing",
  "kayak", "driftwood", "camp stove", "wild blackberries", "rain poncho", "trail mix", "lake breeze",
  "s'mores", "picnic blanket", "binoculars", "walking stick", "rock skipping", "firewood stack", "log cabin",
  "cattails", "porch swing", "thermos mug", "water bottle", "wooly socks", "sunhat", "pocket knife",
  "lantern light", "water lily", "pine needles", "fishing hook", "morning fog", "sandy beach", "sunset cruise",
  "nature trail", "mud puddle", "crayfish trap", "woodpecker tap", "badger hole", "beaver slap", "owl hoot",
  "deer track", "maple syrup", "cinnamon roll", "pancake stack", "bacon sizzle", "cold splash", "sunny deck",
  "flip flop loss", "fuzzy sweater", "hot cocoa", "iron skillet", "outdoor shower", "hammock sway", "mossy rock",
  "tree swing", "fishing hat", "picnic cooler", "mosquito net", "morning swim", "dock fishing", "canoeing team",
  "card game", "board game", "daisy chain", "stone skipping", "pinecone art", "berry picking", "butterfly net",
  "sandcastle build", "wood carving", "Beaver in a tuxedo", "T-Rex making a bed", "Squirrel wearing sunglasses", "Ghost playing banjo", "Sleeping bag monster",
  "Frog with a golden crown", "Raccoon eating pizza slice", "Moose on a tricycle", "Duck wearing yellow rainboots", "Bear doing yoga poses", "Owl reading a paper map", "Bunny riding a skateboard",
  "Otter juggling shiny pebbles", "Chipmunk hoarding diamonds", "Deer singing opera songs", "Turtle running a marathon", "Fish wearing a tiny snorkel", "Badger playing checkers", "Fox painting a canvas portrait",
  "Porcupine hugging a balloon", "Snail driving a sports car", "Lizard playing laser tag", "Caterpillar doing pushups", "Firefly disco dance party", "Dragonfly helicopter pilot", "Spider knitting a warm sweater",
  "Ladybug wearing polka dots", "Beetle rolling a giant boulder", "Grasshopper playing violin", "Cricket choir harmony", "Tree wearing a cozy scarf", "Cloud shaped like a blue whale", "Moon eating a slice of cheese",
  "Sun wearing cool sunglasses", "Wind blowing a shiny trumpet", "Rain playing a snare drum", "Snowman wearing a swimsuit", "Mountain wearing a top hat", "River doing the worm dance", "Rock wearing a colorful wig",
  "Leaf taking a camera selfie", "Acorn wearing a tiny helmet", "Pinecone bowling league", "Marshmallow weightlifting", "Double decker s'more sandwich", "Campfire telling spooky jokes", "Canoe with training wheels",
  "Tent that won't stand up straight", "Sleeping bag mummy cocoon", "Compass pointing north-ish", "Late night flashlight tag", "Binoculars held on backward", "Hiking boots with golden wings", "Backpack stuffed with heavy rocks",
  "Picnic basket escape room", "Thermos of piping hot soup", "Cooler filled with cold ice cubes", "Life jacket high fashion show", "Paddle board balancing act", "Kayaking splash battle", "Fishing rod line tangle",
  "Bait box slimy surprise", "Fish escaping from the net", "High dock jumping contest", "Giant cannonball splash", "Belly flop championship", "Moat around the sandcastle", "Driftwood sculpture artist",
  "Coloured shell collecting", "Sunscreen white mustache", "Sunglasses perched on head", "Big beach towel cape", "Flip flop blow out", "Wet swimsuit struggle", "Warm dry towel hug",
  "Cozy campfire orange glow", "Clear starry night sky", "Milky Way galaxy view", "Shooting star quick wish", "Moonlit lake silver reflection", "Sparkling morning dew drops", "Foggy lake mirror surface",
  "Sunrise bird chorus", "Sunset pink fluffy clouds", "Secret forest path explore", "Wild blackberry smoothie", "Soft pine needle carpet", "Oak tree bark rubbing", "Mossy green forest floor",
  "Giant fern garden", "Wildflower hand bouquet", "Dandelion puff wish", "Four-leaf clover patch search", "Spooky mushroom fairy ring", "Hollow log dark tunnel", "Wooden footbridge crossing",
  "Babbling brook music", "Cool waterfall mist spray", "Lake wave gentle ripples", "Pine scented breeze", "Aroma of cedar wood cabin", "Cozy cabin kitchen table", "Screen door spring slam",
  "Wooden porch rocking chair", "Late night board game", "Puzzle missing the last piece", "Intense card game showdown", "Shadow puppets on tent wall", "Ghost story whispered low", "Flashlight shining under chin",
  "Spooky forest night sounds", "Friendly resident cabin ghost", "Night owl forest watchman", "Morning rooster wake up call", "Breakfast bacon sizzle sound", "Pancakes flipping in the air", "Golden maple syrup drip",
  "Hot cocoa marshmallow melt", "Warm tea mug hand hug", "Wooly socks floor slide", "Warm flannel shirt comfort", "Rainy day book reading", "Board game marathon day", "Jigsaw puzzle table takeover",
  "Deck card shuffling sound", "Tic-tac-toe tournament bracket", "Chalk drawing on the dock", "Smooth pebble painting art", "Driftwood coloring project", "Pinecone creature creations", "Daisy chain crown making",
  "Clover chain bracelet", "Loud grass whistle attempt", "Tree climbing adventure", "Forest hide and seek", "Tag you are it chase", "Red light green light game", "Capture the flag competition",
  "Camp scavenger hunt list", "Nature bingo scorecard", "Map reading wilderness quest", "Walking stick search mission", "Hiking trail wood marker", "Trail mix chocolate chip search", "Ice cold water bottle gulp",
  "Energy bar peanut crunch", "Backpack zipper teeth stuck", "Favorite hat blowing away", "Sunglasses drop in the lake", "Camera snapping scenic photos", "Binoculars bird watching trip", "Eagle soaring high above",
  "Hawk scanning the field", "Grey heron standing still", "Duck family marching parade", "Loon calling across water", "Angry goose chasing camper", "Seagull stealing potato chips", "Crow talking back to you",
  "Woodpecker rapid drum solo", "Blue jay flash of blue", "Cardinal red feather spark", "Robin hunting for fat worms", "Sparrow chirping outside window", "Chickadee sweet little song", "Hummingbird hovering at flower",
  "Monarch butterfly flutter", "Fluffy moth chasing lantern", "Firefly jar night lantern", "Mosquito swat attempt fail", "Shiny beetle climbing walls", "Ant picnic basket invasion", "Dewy spider web masterpiece",
  "Wiggle worm digging deep", "Green frog jumping high", "Bumpy skin garden toad", "Salamander hiding under rock", "Newt swimming in the shallows", "Big fish jumping splash", "Turtle sunbathing on log",
  "Garden snake sliding in grass", "Lizard sunning on hot rock", "Squirrel winter nut storage", "Chipmunk cheeks full of seeds", "White-tailed deer grazing", "Sly fox running stealthy", "Wild coyote howling night",
  "Raccoon wearing black mask", "Opossum playing dead trick", "Skunk tail lifting warning", "Porcupine sharp quill guard", "Badger digging a deep burrow", "Beaver slapping mud tail", "Playful otter sliding down",
  "Mink running along shore", "Weasel popping out of grass", "Black bear cub climbing tree", "Bull moose wading in lake", "Elk bugling in the valley", "Mountain goat cliff balancing", "Sheep grazing green hillside",
  "Cow pasture wooden fence", "Horse trail riding adventure", "Happy dog fetching wet stick", "Cat napping on sunny porch", "Baby goat chewing sleeve", "Happy pig mud bath splash", "Chicken coop egg hunt",
  "Loud rooster wake up call", "Wild turkey gobble strut", "Wise owl big yellow eyes", "Peregrine falcon diving fast", "Bald eagle nest treetop", "Osprey catching silver fish", "Kingfisher diving head first",
  "Wood duck nesting hollow", "Green mallard duck swimming", "White swan graceful glide", "Statuesque blue heron", "Sandhill crane dancing", "Brown pelican big pouch", "White seagull riding wind",
  "Arctic tern diving surf", "Puffin with colorful beak", "Emperor penguin waddling", "Harbor seal sunning on dock", "Humpback whale blowing water", "Bottlenose dolphin jumping waves", "Fossilized shark tooth search",
  "Hermit crab walking sideways", "Maine lobster claw snap", "Starfish on sandy beach", "Moon jellyfish floating clear", "Seahorse clinging to grass", "Giant octopus hiding in cave", "Squid glowing in the dark",
  "Clam shell closing tight", "Oyster shell pearl search", "Blue mussel rock cluster", "Sharp barnacle dock sticking", "Tooth Fairy", "Piggyback ride", "Pillow fort",
  "Treasure map", "Monkey bars", "Hopscotch", "Jumping rope", "Snow angel", "Sprinkler run", "Lemonade stand",
  "Kite flying", "Balloon animal", "Face painting", "Hula hoop", "Simon says", "Bedtime story", "Birthday candles",
  "Silly straw", "Cartwheel", "Somersault", "Watermelon seeds", "Corn on the cob", "Glow stick", "Carousel",
  "Ferris wheel", "Cotton candy", "Funhouse mirror", "Bumper cars", "Merry-go-round", "Slip and slide", "Sandcastle moat",
  "Bucket and spade", "Floaties", "Popsicle drip", "Backyard campout", "Sunburn stripe", "Sand between toes", "Ice cream drip",
  "Tide pool exploring", "Jellyfish dodge", "Seashell collection", "Water balloon fight", "Three-legged race", "Sack race", "Egg and spoon race",
  "Blindfold tag", "Tug of war", "Duck duck goose", "Musical chairs", "Hot potato", "Freeze dance", "Thumb war",
  "Sock puppet show", "Origami crane", "Paper airplane", "Blanket parachute", "Patty cake", "Wishbone pull", "Rainbow sprinkles"
];

const ONLINE_WORDS = [
  "Skibidi Toilet", "Ohio final boss", "mewing streak", "looksmaxxing", "sus impostor", "W rizz", "Fanum tax",
  "looksmaxxing surgeon", "Baby Gronk", "Subway Surfers", "aura reading", "Hawk Tuah", "Quandale Dingle", "John Pork",
  "Discord mod", "electrical vent", "sussy baka", "looksmaxxing invoice", "Sigma grindset", "Grimace shake", "TikTok rizz party",
  "W take", "L take", "cooked", "let him cook", "delusional", "certified classic", "main character energy",
  "side quest", "speedrun", "chat is this real", "gatekeep", "gaslight", "girlboss", "touch grass",
  "backrooms", "core memory", "npc behavior", "uncanny", "brain rot", "yap session", "rizzler",
  "glazing", "no cap", "bruh moment", "doomscrolling", "slay", "giving very much", "hits different",
  "maintaining an aura", "negative aura points", "infinite aura cheat", "aura debt collector", "lost aura moment", "streaming to zero viewers", "twitch chat spammer",
  "discord server raid boss", "moderator application rejected", "discord kitten emoji", "minecraft speedrunner split", "sub three minutes pace", "nether portal spawn trap", "diamond pickaxe breaking sound",
  "roblox obby rage quit", "adopt me neon trade", "pet simulator billionaire", "geometry dash 99 percent fail", "osu circle clicker speed", "valorant instalock duelist", "pocket sage healing pocket",
  "league of legends tilt queue", "typing gg ez in defeat", "reporting toxic teammate lobby", "bronze lobby champion title", "silver rank hardstuck forever", "gaming chair sweat mark", "mousepad lint check scrape",
  "rgb lighting room glow", "mechanical keyboard click clack", "blue switch clacking loudness", "dual monitor setup flex", "vtuber model debut live", "faceless streamer face reveal", "green screen chroma key fail",
  "hot tub stream clip viral", "subathon day thirty stretch", "donation text to speech spam", "copypasta spammer timeout", "backrooms level zero carpet", "liminal space empty playground", "analog horror tape static",
  "mandela catalogue lookalike", "creepypasta reader voice", "slenderman static camera screen", "siren head siren wail", "fnaf jumpscare sound effect", "bite of eighty seven reaction", "purple guy dancing gif",
  "freddy fazbear har har song", "animatronic twitching stage", "custom night twenty twenty twenty twenty", "skibidi dop dop dop yes yes", "sigma phonk bass boosted", "slow motion phonk edit walk", "gym bro edit motivational",
  "gigachad jawline meme", "jawline clenching exercise", "mewing guard check routine", "looksmaxxing routine order", "hunter eyes stare mirror", "prey eyes fear expression", "canthal tilt check angle",
  "negative canthal tilt worry", "brow ridge definition highlight", "bonesmashing warning label", "hair theory success story", "buzz cut regret phase", "wolf cut tutorial scissor slip", "broccoli hair cut broccoli head",
  "perm rod removal bouncy", "middle part style comb", "clean girl aesthetic slicked back", "tomato girl summer tomato color", "mob wife style cheetah print", "dark academia look tweed jacket", "cottagecore lifestyle sourdough bread",
  "goblincore rock pile collection", "weirdcore image gallery nostalgic", "dreamcore playground fog", "spacecore telescope night", "kidcore primary colors aesthetic", "barbiecore pink room design", "scene kid haircut striped hair",
  "emo phase revival skinny jeans", "rawr xd typing legacy", "tumblr aesthetic 2014 grids", "vine reference quote loop", "road work ahead sign i sure hope", "fre sh avo cado taco", "looking at all those chickens",
  "target shopping spree cart", "starbucks order complex milk", "pink drink addiction venti", "iced white mocha caramel drizzle", "oat milk substitution charge", "boba tea spill keyboard disaster", "brown sugar milk tea half sweet",
  "taro smoothie purple color", "matcha latte powder green face", "stanley cup collection rainbow", "pink stanley dent crying", "cup holder expander insert", "hydroflask sticker bomb peeling", "scratch sticker peeling corner",
  "crocs in sport mode strap", "jibbitz collection trade deal", "platform crocs heavy steps", "ugg boot scuff mark", "oversized hoodie blanket warmth", "sweatpants tuck socks trick", "low rise jean revival fear",
  "baggy cargo pants pocket search", "thrift store goldmine sweater", "depop seller pricing shipping", "grailed listings bump price", "hypebeast shoe box tower", "sneaker resell market drop", "stockx price check graph",
  "yeezy slide squeak hardwood", "foam runner alien shoe look", "air force one creasing walk", "crease protectors hurt toes", "shoe cleaning kit foaming", "sock sneaker style stretch", "high sock pull calves",
  "ankle socks outdated accusation", "gen z handshake tutorial", "slap hand slide snap", "fist bump miss awkward", "awkward high five hand grab", "left on read three days blue", "blue bubble pressure imessage",
  "green bubble bullying android", "typing bubble waiting forever", "read receipts enabled danger", "unsending a message too late", "accidentally liking post stalker", "deep stalking profile scroll", "private story drama screenshot",
  "close friends list edit circle", "finsta post caption rant", "spam account rants video", "photo dump slide carousel", "no filter filter beauty", "beauty filter glitch real face", "bold glamour makeup mask",
  "anime filter face sparkle", "gender swap filter funny face", "cartoon portrait art avatar", "pixel art creator block", "ai generation extra fingers", "extra fingers error ai art", "ai girlfriend chat log leaked",
  "chatgpt essay prompt bypass", "midjourney prompt craft master", "dalle weird images dog cat", "ai voice clone cover song", "vocaloid concert glowstick green", "Hatsune Miku dancing leek", "ievan polkka onions spin",
  "vocaloid tuning struggle robotic", "nightcore song speed night", "daycore slowed reverb crying", "lofi hip hop beats study", "study girl pen clicking window", "chillhop raccoon sleeping tree", "synthwave sunset grid neon",
  "vaporwave marble statue pink", "arizona green tea can design", "sad boy hour posts late", "real eyes realize real lies quote", "deep quote overlay rain", "editing software crash progress lost", "render bar stuck ninety nine",
  "keyframe moving error twitching", "green screen keying halo", "green screen green skin glitch", "zoom background beach vacation", "camera off zoom class nap", "muted microphone speaking monologue", "screen sharing password leak",
  "desktop clutter shame folders", "tab hoarder browser freeze", "RAM usage warning chrome", "task manager end task force", "windows update restart deadline", "blue screen of death frown", "storage full delete photos",
  "iCloud storage popup cloud", "battery health percentage cry", "battery swelling screen pop", "screen protector bubble dust", "cracked screen glass cut", "phone case yellowing sunlight", "charger cable fraying wire",
  "wireless charger heat pocket", "airpod case missing search", "one airpod dead case", "airpod falling toilet splash", "noise cancellation quiet world", "transparency mode loud chew", "earbud wax clean toothpick",
  "bluetooth pairing loop connection", "device name rename funny", "wifi signal one bar load", "hotspot sharing battery drain", "data roaming charge surprise", "airplane mode switch fly", "offline dino game high score",
  "speedtest running speed ping", "latency ping high lag", "packet loss teleporting wall", "rubber banding hallway bounce", "laggy camera movement twitch", "discord audio lag robot", "robot voice glitch mic",
  "push to talk click noise", "open mic breathing heavy", "mechanical keyboard loud click", "blue yeti microphone gain", "foam pop filter spit", "ring light glare eyes", "dual monitor background panoramic",
  "mouse clicking speed butterfly", "drag clicking test tape", "butterfly clicking practice speed", "scroll wheel jumping page", "side buttons gaming bound", "dpi settings fast slide", "aim trainer accuracy target",
  "gridshot high score score", "flick shot headshot lucky", "lobby mute button instant", "muting the trash talk toxic", "toxicity in lobby screaming", "casual match sweating hard", "ranked game demotion sadness",
  "iron rank matchmaking queue", "smurf account leveling down", "speedrunner keyboard smash rage", "controller drift stick right", "input lag button delay", "screen tearing check rate", "frame rate drop stutter",
  "lag spike freeze death", "packet burst red icon corner", "high ping warning yellow", "server connection lost retry", "reconnecting button click loop", "offline mode play campaign", "local co op setup controller",
  "split screen split line squish", "player two controller broken", "cheat code memory notebook", "konami code buttons controller", "speedrun route planning map", "glitch out of bounds void", "wall clip void fall",
  "sequence break trick skips", "damage boost jump speed", "frame perfect input window", "pixel perfect landing edge", "speedrun timer split gold", "gold split color fast", "green split save time",
  "red split lose time back", "world record reaction scream", "popoff keyboard slam desk", "desk slap loud mic", "microphone peak red bar", "understood the assignment", "it's giving",
  "lowkey", "highkey", "periodt", "ate and left no crumbs", "sending me", "rent free", "I can't even",
  "this slaps", "unalive", "ratio'd", "based", "cringe", "delulu", "chronically online",
  "touch grass challenge", "villain era", "hot girl walk", "that girl", "roman empire", "lucky girl syndrome", "manifestation journal",
  "soft launch", "hard launch", "posting the breakup", "silent quitting", "rage bait", "grief TikTok", "core memory unlocked",
  "glow up", "character development", "plot armor", "final boss unlock", "tutorial failed", "unlocked achievement", "cheat code life",
  "respawn point", "save point", "game over screen", "lore drop", "origin story", "villain origin", "redemption arc",
  "slay era", "main quest skip", "instant regret", "delete account", "go offline", "digital detox", "screen time exceeded",
  "unfollow spree", "block and delete", "private mode", "incognito fail", "clear history quick", "screenshot receipts", "cryptic post",
  "vague booking", "read the room", "typing then deleting", "voice memo ramble", "spam liking", "mutual crush online", "online beef",
  "cancel attempt", "context missing", "main character fall", "chaotic good energy", "chaotic neutral", "chaotic evil plan", "fetch quest grind",
  "open world moment", "subtweet drama", "viral callout", "ratio incoming", "posting an L", "reply guy energy", "thread incoming",
  "cite your sources", "emotional damage"
];

const ADULT_WORDS = [
  "canoe full of regret", "burnt marshmallow", "soggy sandwich", "accidental cannonball", "mosquito bite itch", "leaky air mattress", "unloading the dishwasher",
  "losing the remote", "showering at night", "cereal is a soup", "touching grass", "burnt hot dog", "chore evasion", "embarrassing dad joke",
  "full middle name", "shredded cheese at 2 a.m.", "unwashed gym clothes", "accidental reply all", "screen time shame", "social battery dead", "reading the room",
  "unwashed gym bag", "chore evasion specialist", "microwave burrito", "staring at the ceiling", "midnight cheese snack", "silent treatment", "overthinking a text",
  "canceling plans last minute", "buying another plant", "unfinished coffee", "impulse purchase", "laundry pile mountain", "pretending to be asleep", "forgotten password",
  "cardboard box hoarder", "unopened mail panic", "alarm snooze abuser", "awkward elevator silence", "grocery shopping hungry", "roommate passive aggression", "checking the fridge again",
  "staring at the sun", "gym membership guilt", "pretending to work", "bad posture slouch", "staying up too late", "cold brew addiction", "middle name reveal",
  "leftovers from last week", "tax season math panic", "interest rate increase letter", "dental bill surprise amount", "jury duty summons mailbox", "parking ticket dispute letter", "parallel parking under audience pressure",
  "backing into a narrow driveway", "hitting the curb slightly scrape", "checking blind spot twice lane", "merging onto highway panic pedal", "tailgated by large dump truck", "yellow light indecision slam", "speed camera flash night",
  "checking engine light orange glow", "oil change delay mileage", "squeaky windshield wiper streak", "wet seat belt shirt spot", "cold steering wheel winter freeze", "burning seat belt summer metal", "low tire pressure light morning",
  "car key fob battery dead", "lock keys inside car trunk", "locked out of apartment porch", "spare key hidden box search", "landlord text notification rent", "rent payment due tomorrow alert", "security deposit reduction itemized",
  "loud upstairs neighbor bowling ball", "stomping ceiling check broom", "vacuuming at ten PM guilt", "laundry in washer two days", "damp clothes smell mildew", "lint trap full gray blanket", "folding fitted sheet origami fail",
  "duvet cover tuck corner jump", "pillow without pillowcase yellow", "mismatched sock pairing drawer", "inside out shirt walk public", "zipper down zipper check pants", "tag scratching neck red mark", "tight shoe toe pinch blister",
  "blister on heel slow walk", "wet socks inside leather shoe", "umbrella inside out wind rain", "rain wet pant cuffs soggy", "stepping in deep puddle mud", "cold draft under door toes", "drafts from windows cold winter",
  "heater making ticking noise ceiling", "AC unit rattling window frame", "radiator clanking loud steam", "power outage candle match search", "flashlight battery dead again shake", "cold shower surprise scream", "low water pressure drip shower",
  "shower curtain sticking wet leg", "bath towel scratchy stiff dry", "wet towel on bed linen", "moldy shower tile spot scrub", "toilet paper roll empty cardboard", "plunger utility check clog", "sink drain clog hair ball",
  "garbage disposal rattle spoon", "trash bag leak trail hallway", "recycling bin overfilled bottles", "compost fruit fly swarm kitchen", "fruit flies in wine glass", "expired milk smell test sniff", "moldy bread green spot sandwich",
  "freezer burn pizza box ice", "ice cube tray empty plastic", "brittle plastic wrap tearing piece", "aluminum foil roll jam cutter", "dull kitchen knife onion slip", "burnt garlic smell kitchen open", "smoke alarm battery beep chirp",
  "smoke alarm goes off frying bacon", "oven preheat waiting time timer", "microwave popcorn burnt bag smoke", "microwave soup splatter dome", "dishes in sink tower balance", "sponge smells like mildew hand", "dishwasher detergent pod stuck door",
  "wet plastic container lid shake", "tupperware lid mismatch search drawer", "glass food container chip rim", "mug stain ring desk paper", "ring mark on wood table water", "wobbly table leg cardboard fold", "squeaky chair hinge oil spray",
  "floorboard creak night snack walk", "toe stubbed table leg scream", "paper cut under fingernail sting", "paper cut lemon juice squeeze", "hangnail pulling disaster blood", "biting lip eating soft food", "burning tongue hot soup sip",
  "ice cream brain freeze temples", "hot sauce eye rub mistake", "onion crying cooking prep knife", "garlic hands soap wash metal", "smell of bleach cleaning bathroom", "dust bunny under bed corner", "cobweb in corner high ceiling",
  "spider crawling bedroom wall eyes", "mosquito buzzing ear sleeping dark", "mosquito bite scratching madness shin", "itch you cannot reach shoulder", "back pain standing up straight", "neck crick sleeping wrong pillow", "sleeping on left shoulder sore joint",
  "pillow too soft flat pancake", "flat sheet bunching toes bottom", "blanket thief partner fight cold", "partner snoring rhythm noise pillow", "breathing too loud sleep stare", "alarm set for wrong AM PM", "alarm sound dread ringtone jump",
  "snooze button fifth time blanket", "running late traffic jam highway", "car won't start click click battery", "scraping ice off windshield plastic", "scraping ice credit card emergency", "cold hands pocket warmers squeeze", "wet gloves finger freeze snow",
  "running nose sleeve wipe cold", "sneezing three times row head", "sneeze stuck halfway itch nose", "cough during quiet meeting hand", "stomach growl silent room lecture", "yawning during video call zoom", "nodding off during lecture eyes",
  "heavy eyelids computer screen blue", "screen glare headache night room", "dry eyes blink blink monitor", "contact lens dry eye stick finger", "glasses fogging hot soup bowl", "glasses sliding down nose sweat", "smudge on glass lens clean shirt",
  "lint on dark shirt roll tape", "static cling pants stick socks", "shoe squeak office hallway quiet", "squeaky shoe floor walk rubber", "heel click concrete sidewalk echo", "walking behind slow walkers street", "walking into spider web face",
  "stepping on a lego barefoot heel", "stepping on dog toy squeak night", "cat hair on black pants tape", "pet food smell morning coffee", "pet scratching door night open", "pet staring blank corner ghost", "shadow looks like person coat",
  "house creak spooky silence night", "wind howling chimney pipe sound", "rattling window pane storm wind", "floor creaks when empty hall", "basement stairs dark sprint upward", "running up stairs darkness reach", "hand on shoulder scare jump",
  "cold draft neck feeling hair", "keys jingling door outside lock", "wrong key keyhole struggle door", "dropping keys dark porch grass", "phone dropping face reading bed", "phone screen face smudge oil", "screen brightness high night blind",
  "battery one percent panic screen", "battery charger wiggle angle port", "pocket dial awkward voicemail record", "accidental screenshot volume power lock", "typing with wet hands keyboard drop", "auto correct ruined sentence text send", "sending text wrong chat group",
  "typing emoji wrong emotion thumb", "thumbs up reply coldness text", "passive aggressive period punctuation end", "read receipt instant anxiety clock", "three dots disappear typing gone", "calling back immediately phone hand", "phone call from unknown state",
  "scam call duct cleaning house", "answering call silent line hang", "telemarketer robot voice pitch sell", "waiting on hold music crackle", "repetitive hold music loop flute", "call center background noise chatter", "spelling name phonetic alphabet fail",
  "forgot birth year calculation age", "card declined embarrassing moment line", "tapping chip reader error red", "swipe card retry swipe terminal", "inserting card wrong way chip", "atm cash withdrawal fee anger", "checking account double digits wallet",
  "savings account decimal point bank", "credit card payment date past", "subscription auto renew charge credit", "forgot to cancel trial calendar", "free trial card registration code", "gym membership cancel loop forms", "password contains special character limit",
  "password incorrect third try locked", "account locked for thirty minutes red", "verify you are human captcha", "click the traffic lights blue", "missed crosswalk square click reload", "captcha code blurry letters keyboard", "two FA code SMS delay waiting",
  "code expired send again click", "inbox count four digits bubble", "unread emails newsletter spam bulk", "unsubscribe button tiny font blue", "spam filter missed email folder", "email draft sent blank oops", "attachment forgotten follow up email sorry",
  "as per my previous email bite", "hope this email finds you well", "regards instead of best regards threat", "signing off email best wishes", "out of office auto reply test", "slack notification sound dread check", "slack huddle unexpected call join",
  "teams status color orange away", "teams green status cheat jig", "mouse mover jigglers usb device", "coffee spill desk keyboard space", "desk cup coaster stick pickup", "sticky keyboard spacebar stuck syrup", "monitor dust layer swipe finger",
  "office thermostat wars freeze jacket", "fluorescent light buzzing head ache", "cubicle wall listening wall silence", "small talk elevator weather cold", "how was your weekend answer", "did you watch the game shrug", "nod and smile walk fast",
  "forgot coworker name greeting hey", "calling coworker by wrong name blush", "wave back at stranger street", "stranger waving behind you arm", "high five fist bump clash fist", "door holding distance awkward run", "walking same direction correction turn",
  "looking at phone pretend busy wait", "fake phone scroll waiting room", "elevator doors closing button smash", "elevator stop every floor door", "stairs flight heavy breathing door", "stepping off escalator stumble foot", "walk of shame",
  "drunk texting", "ghosted", "situationship", "hangover cure", "ex's hoodie", "third wheel", "red flag",
  "savage comeback", "no filter", "calling in sick", "doomscrolling at 3am", "FOMO", "hot take", "plot twist",
  "clout chasing", "main character", "vibe check", "one-night stand", "body count", "skinny dipping", "truth or dare",
  "after party", "speed dating", "jealousy", "toxic trait", "hot mess", "revenge body", "disaster date",
  "the ick", "breadcrumbing", "love bombing", "dry texting", "rizz", "parasocial", "era of healing",
  "talking stage", "soft block", "orbiting", "benching", "slow fade", "friends with benefits", "drunk confession",
  "3am phone call", "wedding speech fail", "oversharing stranger", "airport bar", "walk of fame", "morning after", "blackout curtains",
  "emotional baggage", "rebound relationship", "toxic positivity", "not my problem", "weaponized incompetence", "gaslighting yourself", "phone anxiety",
  "reply with K", "left on read", "seen at 2am", "sent the wrong text", "unmatched on Tinder", "sliding into DMs", "caught in a lie",
  "mutual breakup", "crying in the car", "retail therapy", "emotional support animal", "self-sabotage", "commitment issues", "attachment style",
  "talking to my therapist", "overscheduled", "burnout spiral", "quarter life crisis", "existential snack break", "doom purchase", "regret tattoo",
  "revenge haircut", "spontaneous road trip", "skincare routine guilt", "forgot sunscreen", "faking being busy", "turning 30 panic", "Sunday scaries",
  "wine not water", "accidentally sober", "sneaky link", "hot coworker", "office romance", "work bestie drama", "passive aggressive email",
  "happy hour regret", "closing the bar", "tabs still open", "swipe right panic", "profile pic catfish", "ghosting guilt", "awkward situationship"
];

// Discovery WebSockets URL
const wsUrl = WS_BASE;

let goHome = () => {};
let timerInterval = null;

// Game State Engine
let game = {
  team1: "Team Blue",
  team2: "Team Green",
  score1: 0,
  score2: 0,
  targetScore: 7,
  roundDuration: 45, // seconds
  category: "family", // "family" | "online" | "adult"
  
  // Active round state
  activeTeam: 1, // 1 or 2
  timeLeft: 45,
  wordPool: [],
  wordIndex: 0,
  wordVisible: true
};

// Online Multiplayer variables
let onlineMode = false;
let socket = null;
let roomCode = "";
let myName = "";
let isHost = false;
let onlinePlayers = [];
let playerTeams = {}; // { player_name: team_id (1 or 2) }
let describerName = ""; // who is currently describing
let activePhase = "lobby"; // "lobby" | "play" | "buzzer" | "next_round" | "game_over"

// Online coordination
let heartbeatInt = null;
let roomBrowserRefresh = null;


function startHeartbeat(playerCount = 1) {
  stopHeartbeat();
  const ping = () => fetch(`${HTTP_BASE}/rooms/heartbeat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: roomCode, playerCount: onlinePlayers.length || playerCount })
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
        code: roomCode, host: myName, playerCount: onlinePlayers.length || 1,
        game: "catchphrase", private: false,
        lastPing: Date.now()
      }),
    });
  } catch (_) {}
}

async function unregisterRoom() {
  if (!roomCode) return;
  try {
    await fetch(`${HTTP_BASE}/rooms/unregister`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: roomCode }),
    });
  } catch (_) {}
}

export function start(homeCallback) {
  document.body.classList.add("arcade-theme");
  goHome = () => {
    document.body.classList.remove("arcade-theme");
    homeCallback();
  };
  resetOnlineState();
  resetGame();
  renderSetup();
}

function resetGame() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  game.score1 = 0;
  game.score2 = 0;
  game.activeTeam = 1;
  game.wordVisible = true;
  describerName = "";
}

function resetOnlineState() {
  onlineMode = false;
  stopHeartbeat();
  if (roomBrowserRefresh) { clearInterval(roomBrowserRefresh); roomBrowserRefresh = null; }
  if (socket) {
    try { socket.close(); } catch (e) {}
    socket = null;
  }
  roomCode = "";
  myName = "";
  isHost = false;
  onlinePlayers = [];
  playerTeams = {};
  describerName = "";
  activePhase = "lobby";
}

function getWordPool() {
  let pool = [];
  if (game.category === "family") {
    pool = FAM_WORDS.slice();
  } else if (game.category === "online") {
    pool = ONLINE_WORDS.slice();
  } else {
    pool = ADULT_WORDS.slice();
  }

  // Mix in custom catchphrases saved in localStorage!
  const customs = store.get("catchphrase.game.v1.custom_cards", []);
  return shuffle(pool.concat(customs));
}

// Relaying actions across online sockets
function sendRelay(action) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "relay", action }));
  }
}

/* ---------------- 1. Setup / Lobby Screen ---------------- */
function renderSetup() {
  resetGame();

  // Mode Selection tab (Pass & Play vs Online)
  const passPlayBtn = el("button", {
    className: "btn" + (onlineMode ? " ghost" : ""),
    style: "flex:1; margin:0; font-weight:700; border-radius:12px; font-size:0.9rem; padding: 10px 14px;",
    text: "📱 Single Phone",
    onClick: () => { resetOnlineState(); renderSetup(); }
  });
  const onlineBtn = el("button", {
    className: "btn" + (onlineMode ? "" : " ghost"),
    style: "flex:1; margin:0; font-weight:700; border-radius:12px; font-size:0.9rem; padding: 10px 14px;",
    text: "🌐 Separate Phones",
    onClick: () => { onlineMode = true; renderSetup(); }
  });
  const modeTab = el("div", {
    className: "btn-row",
    style: "margin-bottom:14px; background:rgba(0,0,0,0.18); padding:6px; border-radius:14px; border:1px solid rgba(255,255,255,0.06);"
  }, [passPlayBtn, onlineBtn]);

  if (onlineMode) {
    if (roomCode) {
      renderOnlineLobby();
    } else {
      renderOnlineJoinHost(modeTab);
    }
  } else {
    renderOfflineSetup(modeTab);
  }
}

/* --- A. Offline Pass & Play Setup --- */
function renderOfflineSetup(modeTab) {
  const name1Input = el("input", { type: "text", value: game.team1, placeholder: "Team 1 Name", onInput: (e) => { game.team1 = e.target.value.trim() || "Team Blue"; } });
  const name2Input = el("input", { type: "text", value: game.team2, placeholder: "Team 2 Name", onInput: (e) => { game.team2 = e.target.value.trim() || "Team Green"; } });

  // Steppers
  let targetVal = el("span", { className: "val", text: String(game.targetScore) });
  const targetStepper = el("div", { className: "stepper" }, [
    el("button", { text: "−", onClick: () => { game.targetScore = Math.max(3, game.targetScore - 1); targetVal.textContent = game.targetScore; } }),
    targetVal,
    el("button", { text: "+", onClick: () => { game.targetScore = Math.min(20, game.targetScore + 1); targetVal.textContent = game.targetScore; } }),
    el("span", { className: "muted", text: "points to win", style: "margin-left:6px" })
  ]);

  let timeVal = el("span", { className: "val", text: `${game.roundDuration}s` });
  const timeStepper = el("div", { className: "stepper" }, [
    el("button", { text: "−", onClick: () => { game.roundDuration = Math.max(15, game.roundDuration - 5); timeVal.textContent = `${game.roundDuration}s`; } }),
    timeVal,
    el("button", { text: "+", onClick: () => { game.roundDuration = Math.min(120, game.roundDuration + 5); timeVal.textContent = `${game.roundDuration}s`; } }),
    el("span", { className: "muted", text: "per round", style: "margin-left:6px" })
  ]);

  // Category Selector
  const weirdUnlocked = localStorage.getItem("lakehouse.weird_unlocked") === "true";
  const famBtn = el("button", {
    className: "btn" + (game.category === "family" ? "" : " ghost"),
    onClick: () => selectCategory("family")
  }, [
    el("span", { style: "width:16px; height:16px; display:inline-block;" }, [icons.truths()]),
    el("span", { text: "Wholesome Campfire" })
  ]);
  const onlineBtn = el("button", {
    className: "btn" + (game.category === "online" ? "" : " ghost"),
    onClick: () => selectCategory("online")
  }, [
    el("span", { style: "width:16px; height:16px; display:inline-block;" }, [weirdUnlocked ? icons.unlock() : icons.lock()]),
    el("span", { text: "Sus Brain-rot" })
  ]);
  const adultBtn = el("button", {
    className: "btn" + (game.category === "adult" ? "" : " ghost"),
    onClick: () => selectCategory("adult")
  }, [
    el("span", { style: "width:16px; height:16px; display:inline-block;" }, [weirdUnlocked ? icons.unlock() : icons.lock()]),
    el("span", { text: "Unhinged Cabin" })
  ]);

  function selectCategory(cat) {
    if (!weirdUnlocked && cat !== "family") {
      toast("Tap the header duck 5 times and enter the secret password!");
      return;
    }
    game.category = cat;
    famBtn.className = cat === "family" ? "btn" : "btn ghost";
    onlineBtn.className = cat === "online" ? "btn" : "btn ghost";
    adultBtn.className = cat === "adult" ? "btn" : "btn ghost";
  }

  if (weirdUnlocked) {
    // Keep it elegant without emojis and let the defined SVG icons stand
  }

  const startBtn = el("button", {
    className: "btn",
    style: "display:flex; align-items:center; justify-content:center; gap:6px; margin:0 auto;",
    onClick: () => {
      game.wordPool = getWordPool();
      if (game.wordPool.length === 0) {
        toast("Word deck is empty! Add custom words in Settings.");
        return;
      }
      game.wordIndex = 0;
      startRound();
    }
  }, [
    el("span", { style: "width:18px; height:18px; display:inline-block;" }, [icons.play()]),
    el("span", { text: "Start Catchphrase!" })
  ]);

  const setupCard = el("div", { className: "panel" }, [
    el("label", { text: "Set Team Names" }),
    el("div", { style: "display:flex; gap:10px; margin-bottom:12px;" }, [name1Input, name2Input]),
    el("hr", { className: "divider" }),
    el("label", { text: "Target Score" }),
    targetStepper,
    el("hr", { className: "divider" }),
    el("label", { text: "Round Timer" }),
    timeStepper,
    el("hr", { className: "divider" }),
    el("label", { text: "Word Category" }),
    el("div", { className: "btn-row", style: "gap:8px; flex-direction:column;" }, [famBtn, onlineBtn, adultBtn]),
    el("hr", { className: "divider" }),
    startBtn
  ]);

  mount(
    el("div", { className: "topbar" }, [
      el("button", { className: "back", text: "‹ Lobby", onClick: goHome }),
      el("div", { className: "title", text: "Lake House Catchphrase" }),
      el("span", { style: "width:64px" })
    ]),
    modeTab,
    el("div", { className: "panel center" }, [
      el("p", { className: "muted", html: "<b>Fast-paced hot-potato word guessing!</b> Describe the phrase to your team without saying the word. As soon as they guess it, click next and <i>pass the device</i> to the other team. Don't get caught holding it when the timer buzzes!" })
    ]),
    setupCard
  );
}

/* --- B. Online Play Join/Host Setup --- */
function renderOnlineJoinHost(modeTab) {
  const savedName = localStorage.getItem("catchphrase.myname") || "";
  const nameInput = el("input", {
    type: "text",
    value: savedName,
    placeholder: "Enter Your Display Name",
    style: "margin-bottom:12px; font-weight:700;",
    onInput: (e) => {
      myName = e.target.value.trim().substring(0, 14);
      localStorage.setItem("catchphrase.myname", myName);
    }
  });
  myName = savedName;

  const hostBtn = el("button", {
    className: "btn",
    text: "🪵 Host a New Online Room",
    onClick: () => {
      if (!myName) { toast("Please enter your display name first!"); return; }
      createRoom();
    }
  });

  const codeInput = el("input", {
    type: "text",
    placeholder: "4-Letter Room Code",
    style: "text-transform: uppercase; text-align: center; font-weight:bold; letter-spacing:3px; font-size:1.15rem; margin-bottom:10px;",
    maxLength: 4
  });

  const joinBtn = el("button", {
    className: "btn secondary",
    text: "⚡ Join Existing Room",
    onClick: () => {
      if (!myName) { toast("Please enter your display name first!"); return; }
      const code = codeInput.value.trim().toUpperCase();
      if (code.length !== 4) { toast("Room code must be exactly 4 letters!"); return; }
      joinRoom(code);
    }
  });

  mount(
    el("div", { className: "topbar" }, [
      el("button", { className: "back", text: "‹ Lobby", onClick: goHome }),
      el("div", { className: "title", text: "Lake House Catchphrase" }),
      el("span", { style: "width:64px" })
    ]),
    modeTab,
    el("div", { className: "panel center" }, [
      el("p", { className: "muted", text: "Play real-time cooperative hot-potato using separate phones! All timers, scores, and words synchronize instantly. Guessers' screens safely hide the word so nobody can cheat." })
    ]),
    el("div", { className: "panel" }, [
      el("label", { text: "1. Who is playing?" }),
      nameInput,
      el("hr", { className: "divider" }),
      el("label", { text: "2. Host a New Match" }),
      hostBtn,
      el("label", { style: "margin-top:14px;", text: "👀 Or Browse Open Rooms" }),
      el("button", {
        className: "btn ghost",
        style: "width:100%; margin-top:6px;",
        text: "📋 Browse Rooms",
        onClick: () => {
          if (!myName) { toast("Please enter your display name first!"); return; }
          renderRoomBrowser();
        }
      }),
      el("hr", { className: "divider" }),
      el("label", { text: "3. Or Join an Active Room" }),
      codeInput,
      joinBtn
    ])
  );
}

/* --- C. Online Connected Lobby Screen --- */
function renderOnlineLobby() {
  const topbar = el("div", { className: "topbar" }, [
    el("button", { className: "back", text: "‹ Leave", onClick: () => { if (confirm("Leave this room?")) { resetOnlineState(); renderSetup(); } } }),
    el("div", { className: "title", text: `Room: ${roomCode}` }),
    el("span", { style: "width:64px" })
  ]);

  // Team Players mapping
  const bluePlayers = onlinePlayers.filter(p => playerTeams[p.name] === 1);
  const greenPlayers = onlinePlayers.filter(p => playerTeams[p.name] === 2);

  const team1List = el("div", { className: "scoreboard", style: "background:rgba(26,122,140,0.15); min-height:80px; padding:10px; border-radius:12px; margin-bottom:8px;" }, [
    el("div", { style: "display:flex; align-items:center; gap:8px; margin-bottom:6px;" }, [
      el("span", { style: "width:12px; height:12px; border-radius:50%; background:#2196f3; display:inline-block;" }),
      el("h4", { style: "margin:0; color:#57b6c4; font-weight:700;", text: "Team Blue" })
    ]),
    ...bluePlayers.map(p => el("div", { style: "font-size:0.9rem; margin-bottom:3px; font-weight:700; color:#fff;", text: p.name + (p.name === myName ? " (You)" : "") })),
    el("button", {
      className: "btn ghost small",
      style: "width:100%; font-size:0.75rem; padding:4px 8px; margin-top:8px;",
      text: "Join Blue",
      disabled: playerTeams[myName] === 1,
      onClick: () => {
        playerTeams[myName] = 1;
        sendRelay({ type: "switch_team", name: myName, team: 1 });
        renderSetup();
      }
    })
  ]);

  const team2List = el("div", { className: "scoreboard", style: "background:rgba(47,90,61,0.15); min-height:80px; padding:10px; border-radius:12px; margin-bottom:8px;" }, [
    el("div", { style: "display:flex; align-items:center; gap:8px; margin-bottom:6px;" }, [
      el("span", { style: "width:12px; height:12px; border-radius:50%; background:#4caf50; display:inline-block;" }),
      el("h4", { style: "margin:0; color:#81c784; font-weight:700;", text: "Team Green" })
    ]),
    ...greenPlayers.map(p => el("div", { style: "font-size:0.9rem; margin-bottom:3px; font-weight:700; color:#fff;", text: p.name + (p.name === myName ? " (You)" : "") })),
    el("button", {
      className: "btn ghost small",
      style: "width:100%; font-size:0.75rem; padding:4px 8px; margin-top:8px;",
      text: "Join Green",
      disabled: playerTeams[myName] === 2,
      onClick: () => {
        playerTeams[myName] = 2;
        sendRelay({ type: "switch_team", name: myName, team: 2 });
        renderSetup();
      }
    })
  ]);

  // Host configuration panels vs Non-Host view
  let settingsArea = null;
  if (isHost) {
    let targetVal = el("span", { className: "val", text: String(game.targetScore) });
    const targetStepper = el("div", { className: "stepper" }, [
      el("button", { text: "−", onClick: () => { game.targetScore = Math.max(3, game.targetScore - 1); targetVal.textContent = game.targetScore; syncLobbySettings(); } }),
      targetVal,
      el("button", { text: "+", onClick: () => { game.targetScore = Math.min(20, game.targetScore + 1); targetVal.textContent = game.targetScore; syncLobbySettings(); } }),
    ]);

    let timeVal = el("span", { className: "val", text: `${game.roundDuration}s` });
    const timeStepper = el("div", { className: "stepper" }, [
      el("button", { text: "−", onClick: () => { game.roundDuration = Math.max(15, game.roundDuration - 5); timeVal.textContent = `${game.roundDuration}s`; syncLobbySettings(); } }),
      timeVal,
      el("button", { text: "+", onClick: () => { game.roundDuration = Math.min(120, game.roundDuration + 5); timeVal.textContent = `${game.roundDuration}s`; syncLobbySettings(); } }),
    ]);

    // Categories Selection
    const weirdUnlocked = localStorage.getItem("lakehouse.weird_unlocked") === "true";
    const famBtn = el("button", {
      className: "btn small" + (game.category === "family" ? "" : " ghost"),
      onClick: () => selectCategory("family")
    }, [
      el("span", { style: "width:14px; height:14px; display:inline-block;" }, [icons.truths()]),
      el("span", { text: "Wholesome" })
    ]);
    const onlineBtn = el("button", {
      className: "btn small" + (game.category === "online" ? "" : " ghost"),
      onClick: () => selectCategory("online")
    }, [
      el("span", { style: "width:14px; height:14px; display:inline-block;" }, [weirdUnlocked ? icons.unlock() : icons.lock()]),
      el("span", { text: "Sus" })
    ]);
    const adultBtn = el("button", {
      className: "btn small" + (game.category === "adult" ? "" : " ghost"),
      onClick: () => selectCategory("adult")
    }, [
      el("span", { style: "width:14px; height:14px; display:inline-block;" }, [weirdUnlocked ? icons.unlock() : icons.lock()]),
      el("span", { text: "Unhinged" })
    ]);

    function selectCategory(cat) {
      if (!weirdUnlocked && cat !== "family") {
        toast("Unlock weird categories first!");
        return;
      }
      game.category = cat;
      famBtn.className = cat === "family" ? "btn small" : "btn small ghost";
      onlineBtn.className = cat === "online" ? "btn small" : "btn small ghost";
      adultBtn.className = cat === "adult" ? "btn small" : "btn small ghost";
      syncLobbySettings();
    }

    settingsArea = el("div", { className: "panel" }, [
      el("label", { text: "Configure Game (Host Controls)" }),
      el("div", { style: "display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;" }, [el("span", { text: "Target score" }), targetStepper]),
      el("div", { style: "display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;" }, [el("span", { text: "Round duration" }), timeStepper]),
      el("div", { style: "display:flex; justify-content:space-between; align-items:center;" }, [el("span", { text: "Category" }), el("div", { style: "display:flex; gap:4px;" }, [famBtn, onlineBtn, adultBtn])])
    ]);
  } else {
    // Read-only settings panel for guests
    settingsArea = el("div", { className: "panel", style: "background:rgba(255,255,255,0.02); text-align:center;" }, [
      el("label", { style: "display:flex; align-items:center; justify-content:center; gap:6px;" }, [
        el("span", { style: "width:14px; height:14px; display:inline-block;" }, [icons.lock()]),
        el("span", { text: "Host Controlled Setup" })
      ]),
      el("p", { className: "muted", style: "margin:5px 0;", text: `Target Score: ${game.targetScore} points  ·  Duration: ${game.roundDuration}s  ·  Category: ${game.category.toUpperCase()}` })
    ]);
  }

  // Footer Start Button
  const playAreaBtn = isHost 
    ? el("button", {
        className: "btn",
        onClick: () => {
          game.wordPool = getWordPool();
          if (game.wordPool.length === 0) {
            toast("Word deck is empty!");
            return;
          }
          sendRelay({ type: "start_game", wordPool: game.wordPool });
          unregisterRoom();
          stopHeartbeat();
          game.wordIndex = 0;
          game.activeTeam = 1;
          game.timeLeft = game.roundDuration;
          describerName = "";
          activePhase = "play";
          startRound();
        }
      }, [
        el("span", { style: "width:18px; height:18px; display:inline-block;" }, [icons.play()]),
        el("span", { text: "Start Online Catchphrase!" })
      ])
    : el("div", { className: "panel center", style: "background:none; border:none; margin:0;" }, [
        el("p", { className: "muted pulse", style: "font-weight:700;", text: "Waiting for host to start match..." })
      ]);

  mount(
    topbar,
    el("div", { style: "display:flex; gap:12px; margin-bottom:12px;" }, [
      el("div", { style: "flex:1" }, team1List),
      el("div", { style: "flex:1" }, team2List)
    ]),
    settingsArea,
    playAreaBtn
  );
}

function syncLobbySettings() {
  sendRelay({
    type: "sync_setup",
    targetScore: game.targetScore,
    roundDuration: game.roundDuration,
    category: game.category,
    playerTeams: playerTeams
  });
}

/* ---------------- ONLINE NETWORKING ENGINE ---------------- */
function createRoom() {
  renderLobbySpinner("Creating online room...");
  socket = new WebSocket(`${wsUrl}/ws/create?name=${encodeURIComponent(myName)}`);
  setupSocketListeners();
}

function joinRoom(code) {
  renderLobbySpinner(`Connecting to room ${code}...`);
  socket = new WebSocket(`${wsUrl}/ws/join?code=${code}&name=${encodeURIComponent(myName)}`);
  setupSocketListeners();
}

function setupSocketListeners() {
  socket.onopen = () => {
    console.log("WebSocket connected.");
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data.type === "created") {
        roomCode = data.code;
        isHost = true;
        onlinePlayers = data.players;
        playerTeams[myName] = 1; // Default Blue
        registerRoom();
        startHeartbeat(data.players.length);
        renderSetup();
      } else if (data.type === "player_joined") {
        onlinePlayers = data.players;
        isHost = (onlinePlayers[0] === myName);
        // Distribute player team
        onlinePlayers.forEach(p => {
          if (!playerTeams[p]) {
            const t1 = onlinePlayers.filter(pl => playerTeams[pl] === 1).length;
            const t2 = onlinePlayers.filter(pl => playerTeams[pl] === 2).length;
            playerTeams[p] = t1 <= t2 ? 1 : 2;
          }
        });

        if (activePhase !== "lobby") {
          sendRelay({
            type: "SYNC_FULL_GAME",
            activePhase,
            game,
            describerName,
            playerTeams
          });
        } else if (isHost) {
          registerRoom();
          startHeartbeat(data.players.length);
          syncLobbySettings();
        }
        renderSetup();
      } else if (data.type === "player_left") {
        onlinePlayers = data.players;
        toast(`${data.name} left the room.`);
        renderSetup();
      } else if (data.type === "error") {
        toast(data.message);
        resetOnlineState();
        renderSetup();
      } else if (data.type === "relay") {
        handleRelayAction(data.action);
      }
    } catch(e) {
      console.error("Socket error processing message:", e);
    }
  };

  socket.onclose = () => {
    console.log("WebSocket disconnected.");
    stopHeartbeat();
    if (onlineMode && roomCode) {
      toast("Disconnected from match server.");
      resetOnlineState();
      renderSetup();
    }
  };

  socket.onerror = (e) => {
    console.error("Socket error:", e);
    toast("Server connection failed.");
    resetOnlineState();
    renderSetup();
  };
}

function renderRoomBrowser() {
  if (roomBrowserRefresh) { clearInterval(roomBrowserRefresh); roomBrowserRefresh = null; }

  const listEl = el("div", { className: "room-browser-list", id: "room-list" });

  const loadRooms = async () => {
    try {
      const res   = await fetch(`${HTTP_BASE}/rooms/list?game=catchphrase`, { signal: AbortSignal.timeout(5000) });
      const rooms = await res.json();
      listEl.innerHTML = "";
      const visible = rooms.filter(r => !r.private); // only show public
      if (visible.length === 0) {
        listEl.appendChild(el("p", { className: "muted center", style: "margin:20px 0; font-style:italic;", text: "No open rooms right now — create one!" }));
        return;
      }
      visible.forEach(r => {
        const row = el("div", { className: "room-row" }, [
          el("div", { className: "room-info" }, [
            el("div", { style: "display:flex; align-items:baseline;" }, [
              el("span", { style: "font-weight:700; color:#fff;", text: r.host }),
              el("span", { style: "margin-left:8px; font-size:0.8rem; color:var(--lake-light);", text: `${r.playerCount} player${r.playerCount !== 1 ? "s" : ""}` })
            ])
          ]),
          el("button", { className: "btn small", style: "margin:0; padding:6px 14px; font-size:0.85rem;", text: "Join",
            onClick: () => { clearInterval(roomBrowserRefresh); joinRoom(r.code); }
          })
        ]);
        listEl.appendChild(row);
      });
    } catch (e) {
      listEl.innerHTML = `<p class="muted center" style="margin:16px 0;">Couldn't load rooms.</p>`;
    }
  };

  loadRooms();
  roomBrowserRefresh = setInterval(loadRooms, 3000);

  mount(
    el("div", { className: "topbar" }, [
      el("button", { className: "back", text: "‹ Back", onClick: () => { clearInterval(roomBrowserRefresh); renderSetup(); } }),
      el("div",    { className: "title", text: "Open Rooms" }),
      el("span",   { style: "width:64px" })
    ]),
    el("div", { className: "panel center", style: "padding:10px 14px;" }, [
      el("p", { className: "muted", style: "margin:0; font-size:0.82rem;", text: "Refreshes every 3s. Tap Join to enter." })
    ]),
    el("div", { className: "panel", style: "padding:10px;" }, [listEl]),
    el("button", { className: "btn ghost", style: "margin-top:4px;", text: "🔄 Refresh",
      onClick: () => loadRooms()
    })
  );
}

function renderLobbySpinner(msg) {
  mount(
    el("div", { className: "topbar" }, [
      el("div", { className: "title", text: "Lake House Catchphrase" })
    ]),
    el("div", { className: "panel center" }, [
      el("div", { className: "big-emoji spin", style: "display: inline-block; font-size: 3rem;", text: "🛶" }),
      el("h3", { style: "margin-top: 15px;", text: msg }),
      el("p", { className: "muted", text: "Connecting to Cloudflare Workers Edge..." })
    ])
  );
}

function handleRelayAction(action) {
  if (action.type === "SYNC_FULL_GAME") {
    activePhase = action.activePhase;
    game = action.game;
    describerName = action.describerName;
    playerTeams = action.playerTeams;
    isHost = (onlinePlayers[0] === myName);

    if (activePhase === "play") {
      renderPlay();
    } else if (activePhase === "buzzer" || activePhase === "next_round") {
      renderBuzzer();
    } else if (activePhase === "game_over") {
      renderGameOver();
    } else {
      renderSetup();
    }
  } else if (action.type === "sync_setup") {
    game.targetScore = action.targetScore;
    game.roundDuration = action.roundDuration;
    game.category = action.category;
    if (action.playerTeams) {
      playerTeams = action.playerTeams;
    }
    renderSetup();
  } else if (action.type === "switch_team") {
    playerTeams[action.name] = action.team;
    renderSetup();
    toast(`${action.name} joined Team ${action.team === 1 ? "Blue" : "Green"}!`);
  } else if (action.type === "start_game") {
    game.wordPool = action.wordPool;
    game.wordIndex = 0;
    game.activeTeam = 1;
    game.timeLeft = game.roundDuration;
    describerName = "";
    activePhase = "play";
    startRound();
  } else if (action.type === "set_describer") {
    describerName = action.describerName;
    game.wordIndex = action.wordIndex;
    game.wordVisible = true;
    if (timerInterval) clearInterval(timerInterval);
    renderPlay();
    toast(`${describerName} is describing!`);
  } else if (action.type === "tick_timer") {
    game.timeLeft = action.timeLeft;
    // Update local timer visual
    const timerBox = document.getElementById("pulsingTimer");
    const timerText = document.getElementById("pulsingTimerText");
    if (timerText) {
      timerText.textContent = `${game.timeLeft}s`;
    }
    if (timerBox) {
      const ratio = game.timeLeft / game.roundDuration;
      if (ratio < 0.25) {
        timerBox.style.color = "#ef5350";
        timerBox.style.animation = "pulse 0.4s infinite alternate";
      } else if (ratio < 0.5) {
        timerBox.style.color = "#ffa726";
        timerBox.style.animation = "pulse 0.8s infinite alternate";
      } else {
        timerBox.style.color = "var(--water-foam)";
        timerBox.style.animation = "pulse 1.5s infinite alternate";
      }
    }
  } else if (action.type === "guess_success") {
    game.wordIndex = action.wordIndex;
    game.activeTeam = action.activeTeam;
    describerName = "";
    game.wordVisible = true;
    renderPlay();
    toast("Passed to opposing team!");
  } else if (action.type === "skip") {
    game.timeLeft = action.timeLeft;
    game.wordIndex = action.wordIndex;
    game.wordVisible = true;
    renderPlay();
    toast("Skipped! -2 seconds penalty.");
  } else if (action.type === "time_up") {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    renderBuzzer();
  } else if (action.type === "award_point") {
    game.score1 = action.score1;
    game.score2 = action.score2;
    if (game.score1 >= game.targetScore || game.score2 >= game.targetScore) {
      renderGameOver();
    } else {
      game.activeTeam = action.nextActiveTeam;
      startNextRoundOverlay();
    }
  } else if (action.type === "start_next_round") {
    game.wordIndex = 0;
    describerName = "";
    game.timeLeft = game.roundDuration;
    startRound();
  } else if (action.type === "restart_lobby") {
    resetGame();
    activePhase = "lobby";
    renderSetup();
  }
}

/* ---------------- 2. Active Round Loop Screen ---------------- */
function startRound() {
  game.timeLeft = game.roundDuration;
  game.wordVisible = true;
  
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;

  // In offline mode, the countdown timer starts immediately!
  if (!onlineMode) {
    timerInterval = setInterval(() => {
      game.timeLeft--;
      
      const timerBox = document.getElementById("pulsingTimer");
      const timerText = document.getElementById("pulsingTimerText");
      if (timerText) {
        timerText.textContent = `${game.timeLeft}s`;
      }
      if (timerBox) {
        const ratio = game.timeLeft / game.roundDuration;
        if (ratio < 0.25) {
          timerBox.style.color = "#ef5350";
          timerBox.style.animation = "pulse 0.4s infinite alternate";
        } else if (ratio < 0.5) {
          timerBox.style.color = "#ffa726";
          timerBox.style.animation = "pulse 0.8s infinite alternate";
        } else {
          timerBox.style.color = "var(--water-foam)";
          timerBox.style.animation = "pulse 1.5s infinite alternate";
        }
      }

      if (game.timeLeft <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        renderBuzzer();
      }
    }, 1000);
  }

  renderPlay();
}

function renderPlay() {
  const currentWord = game.wordPool[game.wordIndex % game.wordPool.length];
  const activeName = game.activeTeam === 1 ? game.team1 : game.team2;

  const timerEl = el("div", {
    id: "pulsingTimer",
    style: "font-size:2.4rem; font-weight:800; display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:12px; color:var(--water-foam); transition: color 0.3s; animation: pulse 1.5s infinite alternate;"
  }, [
    el("span", { style: "width:32px; height:32px; display:inline-block;" }, [icons.timer()]),
    el("span", { id: "pulsingTimerText", text: `${game.timeLeft}s` })
  ]);

  const stopBtn = el("button", { 
    className: "back", 
    text: "✕ Stop", 
    onClick: () => { 
      if (confirm("Stop Catchphrase and return to lobby?")) { 
        if (onlineMode) {
          sendRelay({ type: "restart_lobby" });
        } else {
          resetGame(); 
          renderSetup(); 
        }
      } 
    } 
  });

  const topbar = el("div", { className: "topbar" }, [
    stopBtn,
    el("div", { className: "title", text: "Active Round!" }),
    el("span", { style: "width:64px" })
  ]);

  if (onlineMode) {
    renderOnlinePlay(topbar, timerEl, currentWord);
  } else {
    renderOfflinePlay(topbar, timerEl, currentWord, activeName);
  }
}

/* --- A. Offline Play UI Controls --- */
function renderOfflinePlay(topbar, timerEl, currentWord, activeName) {
  const wordCardText = el("span", {
    style: "font-size:1.6rem; font-weight:800; color:#fff; transition: opacity 0.15s; " + (game.wordVisible ? "opacity:1" : "opacity:0;"),
    text: currentWord
  });

  const wordCard = el("div", {
    className: "play-card response",
    style: "min-height:160px; justify-content:center; align-items:center; text-align:center; padding:18px; margin: 18px 0; background:linear-gradient(135deg, rgba(8,40,47,0.85), rgba(8,40,47,0.5)); border:2px solid rgba(205,238,242,0.3);"
  }, [
    wordCardText,
    el("div", {
      className: "muted",
      style: "font-size:0.8rem; font-weight:normal; position:absolute; bottom:8px; width:100%; left:0; display:flex; align-items:center; justify-content:center; gap:6px; " + (game.wordVisible ? "display:none;" : "")
    }, [
      el("span", { style: "width:12px; height:12px; display:inline-block;" }, [icons.warning()]),
      el("span", { text: "WORD HIDDEN (Tap show to read)" })
    ])
  ]);

  const toggleShowBtn = el("button", {
    className: "btn ghost small",
    style: "width:100%; margin-bottom:12px; font-weight:700; display:flex; align-items:center; justify-content:center; gap:6px;",
    onClick: () => {
      game.wordVisible = !game.wordVisible;
      renderPlay();
    }
  }, [
    el("span", { style: "width:16px; height:16px; display:inline-block;" }, [game.wordVisible ? icons.eyeOff() : icons.eye()]),
    el("span", { text: game.wordVisible ? "Hide Word (Pass Device Safely)" : "Show Word" })
  ]);

  const correctBtn = el("button", {
    className: "btn",
    style: "background:#2e7d32; color:#fff; font-weight:800; font-size:1.1rem; box-shadow:0 4px #1b5e20; margin-bottom:8px; display:flex; align-items:center; justify-content:center; gap:6px;",
    onClick: () => {
      game.wordIndex++;
      game.wordVisible = true;
      game.activeTeam = game.activeTeam === 1 ? 2 : 1;
      renderPlay();
      toast("Passed turn to opposing team!");
    }
  }, [
    el("span", { style: "width:18px; height:18px; display:inline-block;" }, [icons.checked()]),
    el("span", { text: "Guessed! Next & Pass" })
  ]);

  const skipBtn = el("button", {
    className: "btn ghost small",
    style: "width:100%; margin:0; border-color:#c62828; color:#ef5350; font-weight:700; display:flex; align-items:center; justify-content:center; gap:6px;",
    onClick: () => {
      game.timeLeft = Math.max(0, game.timeLeft - 2);
      game.wordIndex++;
      game.wordVisible = true;
      renderPlay();
      toast("Skipped! -2 seconds penalty.");
    }
  }, [
    el("span", { style: "width:16px; height:16px; display:inline-block;" }, [icons.chevronRight()]),
    el("span", { text: "Skip (-2s Penalty)" })
  ]);

  const turnPanel = el("div", {
    className: "panel center",
    style: "background:rgba(255,255,255,0.06); padding:10px; border-radius:12px; margin-bottom:12px;"
  }, [
    el("h3", {
      style: "margin:0; font-size:1.15rem; color:#fff; display:flex; align-items:center; justify-content:center; gap:8px;"
    }, [
      el("span", { style: "animation: pulse 1s infinite alternate;", text: "📣" }),
      el("span", { text: `${activeName}'s Turn to Describe!` })
    ])
  ]);

  mount(
    topbar,
    turnPanel,
    timerEl,
    wordCard,
    toggleShowBtn,
    correctBtn,
    skipBtn
  );
}

/* --- B. Online Synced Separate-Phones Play UI --- */
function renderOnlinePlay(topbar, timerEl, currentWord) {
  const activeName = game.activeTeam === 1 ? game.team1 : game.team2;
  const myTeam = playerTeams[myName] || 1;

  // Turn Header Panel
  const turnPanel = el("div", {
    className: "panel center",
    style: `background:${game.activeTeam === 1 ? "rgba(26,122,140,0.12)" : "rgba(47,90,61,0.12)"}; padding:10px; border-radius:12px; margin-bottom:12px; border:1px solid rgba(255,255,255,0.06); display:flex; align-items:center; justify-content:center; gap:8px;`
  }, [
    el("span", { style: `width:10px; height:10px; border-radius:50%; background:${game.activeTeam === 1 ? "#2196f3" : "#4caf50"}; display:inline-block;` }),
    el("h3", {
      style: "margin:0; font-size:1.1rem; color:#fff; text-align:center;",
      text: `Turn: ${activeName}`
    })
  ]);

  // Phase 1: No active describer has claimed this turn yet
  if (!describerName) {
    let playActionNode = null;
    if (myTeam === game.activeTeam) {
      playActionNode = el("div", { className: "panel center", style: "padding:20px;" }, [
        el("p", { style: "font-weight:bold; margin-bottom:14px; font-size:1rem; color:var(--water-foam);", text: "Your team is active! Who will describe the phrase?" }),
        el("button", {
          className: "btn",
          style: "display:flex; align-items:center; justify-content:center; gap:6px; margin:0 auto;",
          onClick: () => {
            describerName = myName;
            sendRelay({ type: "set_describer", describerName: myName, wordIndex: game.wordIndex });
            
            // Start local ticking interval (active describer drives the clock)
            if (timerInterval) clearInterval(timerInterval);
            timerInterval = setInterval(() => {
              game.timeLeft--;
              sendRelay({ type: "tick_timer", timeLeft: game.timeLeft });
              
              if (game.timeLeft <= 0) {
                clearInterval(timerInterval);
                timerInterval = null;
                sendRelay({ type: "time_up" });
                renderBuzzer();
              }
            }, 1000);
            
            renderPlay();
            toast("You are describing! Do not show your screen to guessers.");
          }
        }, [
          el("span", { style: "width:18px; height:18px; display:inline-block;" }, [icons.speak()]),
          el("span", { text: "I will Describe!" })
        ])
      ]);
    } else {
      playActionNode = el("div", { className: "panel center", style: "padding:24px; background:rgba(0,0,0,0.15);" }, [
        el("div", { className: "spin", style: "width:36px; height:36px; margin:0 auto 10px; color:var(--water-foam);" }, [icons.refresh()]),
        el("p", { className: "muted", style: "font-weight:700;", text: "Waiting for the other team to choose their describer..." })
      ]);
    }

    mount(
      topbar,
      turnPanel,
      playActionNode
    );
    return;
  }

  // Phase 2: Active describer has been chosen
  const isMeDescribing = describerName === myName;

  let wordCardNode = null;
  let controlRowNode = null;
  let statusPanelNode = null;

  if (isMeDescribing) {
    // Active Describer: Sees word, next and skip actions
    const wordCardText = el("span", {
      style: "font-size:1.6rem; font-weight:800; color:#fff; transition: opacity 0.15s; " + (game.wordVisible ? "opacity:1" : "opacity:0;"),
      text: currentWord
    });

    wordCardNode = el("div", {
      className: "play-card response",
      style: "min-height:160px; justify-content:center; align-items:center; text-align:center; padding:18px; margin: 18px 0; background:linear-gradient(135deg, rgba(8,40,47,0.85), rgba(8,40,47,0.5)); border:2px solid rgba(205,238,242,0.3);"
    }, [
      wordCardText,
      el("div", {
        className: "muted",
        style: "font-size:0.8rem; font-weight:normal; position:absolute; bottom:8px; width:100%; left:0; display:flex; align-items:center; justify-content:center; gap:6px; " + (game.wordVisible ? "display:none;" : "")
      }, [
        el("span", { style: "width:12px; height:12px; display:inline-block;" }, [icons.warning()]),
        el("span", { text: "WORD HIDDEN (Tap show to read)" })
      ])
    ]);

    const toggleShowBtn = el("button", {
      className: "btn ghost small",
      style: "width:100%; margin-bottom:12px; font-weight:700; display:flex; align-items:center; justify-content:center; gap:6px;",
      onClick: () => {
        game.wordVisible = !game.wordVisible;
        renderPlay();
      }
    }, [
      el("span", { style: "width:16px; height:16px; display:inline-block;" }, [game.wordVisible ? icons.eyeOff() : icons.eye()]),
      el("span", { text: game.wordVisible ? "Hide Word (Pass Phone Safely)" : "Show Word" })
    ]);

    const correctBtn = el("button", {
      className: "btn",
      style: "background:#2e7d32; color:#fff; font-weight:800; font-size:1.1rem; box-shadow:0 4px #1b5e20; margin-bottom:8px; display:flex; align-items:center; justify-content:center; gap:6px;",
      onClick: () => {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = null;
        
        const nextTeam = game.activeTeam === 1 ? 2 : 1;
        game.wordIndex++;
        game.activeTeam = nextTeam;
        describerName = "";
        
        sendRelay({ type: "guess_success", wordIndex: game.wordIndex, activeTeam: nextTeam });
        renderPlay();
        toast("Passed turn to the other team!");
      }
    }, [
      el("span", { style: "width:18px; height:18px; display:inline-block;" }, [icons.checked()]),
      el("span", { text: "Guessed! Next & Pass" })
    ]);

    const skipBtn = el("button", {
      className: "btn ghost small",
      style: "width:100%; margin:0; border-color:#c62828; color:#ef5350; font-weight:700; display:flex; align-items:center; justify-content:center; gap:6px;",
      onClick: () => {
        game.timeLeft = Math.max(0, game.timeLeft - 2);
        game.wordIndex++;
        sendRelay({ type: "skip", wordIndex: game.wordIndex, timeLeft: game.timeLeft });
        renderPlay();
        toast("Skipped! -2 seconds penalty.");
      }
    }, [
      el("span", { style: "width:16px; height:16px; display:inline-block;" }, [icons.chevronRight()]),
      el("span", { text: "Skip (-2s Penalty)" })
    ]);

    statusPanelNode = el("div", {
      className: "panel center",
      style: "background:rgba(232,121,74,0.15); padding:10px; border-radius:12px; margin-bottom:12px; border:1px dashed var(--sunset);"
    }, [
      el("div", { style: "display:flex; align-items:center; justify-content:center; gap:8px;" }, [
        el("span", { style: "width:18px; height:18px; display:inline-block;" }, [icons.speak()]),
        el("span", { style: "margin:0; font-size:0.95rem; font-weight:bold; color:var(--sunset-soft);", text: "YOU ARE DESCRIBING! Guessers are listening..." })
      ])
    ]);

    controlRowNode = el("div", { style: "display:flex; flex-direction:column; width:100%;" }, [
      toggleShowBtn,
      correctBtn,
      skipBtn
    ]);
  } else {
    // Guesser (teammate or opponent): Word card is locked and blanked out
    wordCardNode = el("div", {
      className: "play-card response locked",
      style: "min-height:160px; justify-content:center; align-items:center; text-align:center; padding:18px; margin: 18px 0; background:linear-gradient(135deg, rgba(0,0,0,0.4), rgba(0,0,0,0.25)); border:2px dashed rgba(255,255,255,0.08);"
    }, [
      el("div", { style: "width:48px; height:48px; margin:0 auto 6px; color:var(--sunset-soft);" }, [icons.lock()]),
      el("span", { style: "font-size:1.15rem; font-weight:800; color:var(--water-foam);", text: "Word Hidden (Guessing Phase)" })
    ]);

    const isTeammate = myTeam === game.activeTeam;
    statusPanelNode = el("div", {
      className: "panel center",
      style: "background:rgba(255,255,255,0.04); padding:12px; border-radius:12px; margin-bottom:12px; display:flex; align-items:center; justify-content:center; gap:8px;"
    }, [
      el("span", { style: "width:18px; height:18px; display:inline-block; color:var(--water-foam);" }, [isTeammate ? icons.speak() : icons.shield()]),
      el("span", {
        style: "margin:0; font-size:0.92rem; font-weight:700; color:#fff;",
        text: isTeammate 
          ? `Listen closely! Teammate ${describerName} is describing!`
          : `Intercept! Opponent ${describerName} is describing to their team!`
      })
    ]);

    controlRowNode = el("div", { className: "panel center", style: "background:none; border:none; margin:0;" }, [
      el("p", { className: "muted pulse", text: "Active word synchronization active..." })
    ]);
  }

  mount(
    topbar,
    turnPanel,
    statusPanelNode,
    timerEl,
    wordCardNode,
    controlRowNode
  );
}

/* ---------------- 3. Buzzer / Round Scoring Screen ---------------- */
function renderBuzzer() {
  const activeName = game.activeTeam === 1 ? game.team1 : game.team2;
  const winnerName = game.activeTeam === 1 ? game.team2 : game.team1;
  const winningTeamId = game.activeTeam === 1 ? 2 : 1;

  const scorePanel = el("div", { className: "scoreboard" }, [
    el("div", { className: "score-row" + (game.score1 >= game.score2 && game.score1 > 0 ? " leader" : "") }, [
      el("div", { style: "display:flex; align-items:center; gap:8px;" }, [
        el("span", { style: "width:12px; height:12px; border-radius:50%; background:#2196f3; display:inline-block;" }),
        el("span", { className: "nm", text: game.team1 })
      ]),
      el("span", { className: "pts", text: `${game.score1}/${game.targetScore}` })
    ]),
    el("div", { className: "score-row" + (game.score2 >= game.score1 && game.score2 > 0 ? " leader" : "") }, [
      el("div", { style: "display:flex; align-items:center; gap:8px;" }, [
        el("span", { style: "width:12px; height:12px; border-radius:50%; background:#4caf50; display:inline-block;" }),
        el("span", { className: "nm", text: game.team2 })
      ]),
      el("span", { className: "pts", text: `${game.score2}/${game.targetScore}` })
    ])
  ]);

  let scoreAction = null;
  if (onlineMode) {
    if (isHost) {
      scoreAction = el("button", {
        className: "btn",
        style: "display:flex; align-items:center; justify-content:center; gap:6px; margin: 12px auto 0;",
        onClick: () => {
          if (game.activeTeam === 1) {
            game.score2++;
          } else {
            game.score1++;
          }
          sendRelay({
            type: "award_point",
            team: winningTeamId,
            score1: game.score1,
            score2: game.score2,
            nextActiveTeam: game.activeTeam === 1 ? 2 : 1
          });

          if (game.score1 >= game.targetScore || game.score2 >= game.targetScore) {
            renderGameOver();
          } else {
            game.activeTeam = game.activeTeam === 1 ? 2 : 1;
            startNextRoundOverlay();
          }
        }
      }, [
        el("span", { style: "width:18px; height:18px; display:inline-block;" }, [icons.star()]),
        el("span", { text: `Award Point to ${winnerName}` })
      ]);
    } else {
      scoreAction = el("div", { className: "panel center", style: "background:none; border:none; margin:0;" }, [
        el("p", { className: "muted pulse", style: "font-weight:700;", text: `Waiting for Host to award point to ${winnerName}...` })
      ]);
    }
  } else {
    // Offline scoring button
    scoreAction = el("button", {
      className: "btn",
      style: "display:flex; align-items:center; justify-content:center; gap:6px; margin: 12px auto 0;",
      onClick: () => {
        if (game.activeTeam === 1) {
          game.score2++;
        } else {
          game.score1++;
        }
        
        if (game.score1 >= game.targetScore || game.score2 >= game.targetScore) {
          renderGameOver();
        } else {
          game.activeTeam = game.activeTeam === 1 ? 2 : 1;
          startNextRoundOverlay();
        }
      }
    }, [
      el("span", { style: "width:18px; height:18px; display:inline-block;" }, [icons.star()]),
      el("span", { text: `Award Point to ${winnerName}` })
    ]);
  }

  mount(
    el("div", { className: "topbar" }, [
      el("div", { className: "title", text: "Round Over!" }),
    ]),
    el("div", { className: "panel center", style: "background:rgba(198,40,40,0.15); border:1.5px solid #c62828; animation: shake 0.5s;" }, [
      el("div", { style: "width:64px; height:64px; margin:0 auto 10px; color:#ef5350; animation: pulse 0.5s infinite alternate;" }, [icons.warning()]),
      el("h2", { style: "color:#ef5350; margin:10px 0 4px 0;", text: "TIME'S UP!" }),
      el("p", { className: "muted", style: "margin:0;", text: `${activeName} was caught holding the device when the timer buzzed!` })
    ]),
    el("div", { className: "panel" }, [
      el("label", { text: "Current Scores" }),
      scorePanel
    ]),
    scoreAction
  );
}

function startNextRoundOverlay() {
  const activeName = game.activeTeam === 1 ? game.team1 : game.team2;

  const scorePanel = el("div", { className: "scoreboard" }, [
    el("div", { className: "score-row" }, [
      el("div", { style: "display:flex; align-items:center; gap:8px;" }, [
        el("span", { style: "width:12px; height:12px; border-radius:50%; background:#2196f3; display:inline-block;" }),
        el("span", { className: "nm", text: game.team1 })
      ]),
      el("span", { className: "pts", text: `${game.score1}/${game.targetScore}` })
    ]),
    el("div", { className: "score-row" }, [
      el("div", { style: "display:flex; align-items:center; gap:8px;" }, [
        el("span", { style: "width:12px; height:12px; border-radius:50%; background:#4caf50; display:inline-block;" }),
        el("span", { className: "nm", text: game.team2 })
      ]),
      el("span", { className: "pts", text: `${game.score2}/${game.targetScore}` })
    ])
  ]);

  let nextActionBtn = null;
  if (onlineMode) {
    if (isHost) {
      nextActionBtn = el("button", {
        className: "btn",
        style: "display:flex; align-items:center; justify-content:center; gap:6px; margin:0 auto;",
        onClick: () => {
          sendRelay({ type: "start_next_round" });
          game.wordIndex = 0;
          describerName = "";
          game.timeLeft = game.roundDuration;
          startRound();
        }
      }, [
        el("span", { style: "width:18px; height:18px; display:inline-block;" }, [icons.play()]),
        el("span", { text: `Start next round with ${activeName}` })
      ]);
    } else {
      nextActionBtn = el("div", { className: "panel center", style: "background:none; border:none; margin:0;" }, [
        el("p", { className: "muted pulse", style: "font-weight:700;", text: `Waiting for Host to start next round with ${activeName}...` })
      ]);
    }
  } else {
    // Offline start next round button
    nextActionBtn = el("button", {
      className: "btn",
      style: "display:flex; align-items:center; justify-content:center; gap:6px; margin:0 auto;",
      onClick: () => {
        game.wordPool = getWordPool();
        game.wordIndex = 0;
        startRound();
      }
    }, [
      el("span", { style: "width:18px; height:18px; display:inline-block;" }, [icons.play()]),
      el("span", { text: `Start next round with ${activeName}` })
    ]);
  }

  mount(
    el("div", { className: "topbar" }, [
      el("div", { className: "title", text: "Get Ready!" }),
    ]),
    el("div", { className: "panel center" }, [
      el("h3", { text: "Prepare to Pass!" }),
      el("p", { className: "muted", text: `Round scored! The first turn goes to ${activeName}. Get ready to describe and pass!` })
    ]),
    el("div", { className: "panel" }, [
      scorePanel
    ]),
    nextActionBtn
  );
}

/* ---------------- 4. Game Over Screen ---------------- */
function renderGameOver() {
  const isWinner1 = game.score1 >= game.targetScore;
  const winnerName = isWinner1 ? game.team1 : game.team2;
  const runnerUpName = isWinner1 ? game.team2 : game.team1;
  const winnerPoints = Math.max(game.score1, game.score2);
  const runnerUpPoints = Math.min(game.score1, game.score2);

  const board = el("div", { className: "scoreboard" }, [
    el("div", { className: "score-row leader" }, [
      el("div", { style: "display:flex; align-items:center; gap:8px;" }, [
        el("span", { style: `width:12px; height:12px; border-radius:50%; background:${isWinner1 ? "#2196f3" : "#4caf50"}; display:inline-block;` }),
        el("span", { className: "nm", text: winnerName })
      ]),
      el("span", { className: "pts", text: `${winnerPoints} points` })
    ]),
    el("div", { className: "score-row" }, [
      el("div", { style: "display:flex; align-items:center; gap:8px;" }, [
        el("span", { style: `width:12px; height:12px; border-radius:50%; background:${isWinner1 ? "#4caf50" : "#2196f3"}; display:inline-block;` }),
        el("span", { className: "nm", text: runnerUpName })
      ]),
      el("span", { className: "pts", text: `${runnerUpPoints} points` })
    ])
  ]);

  let actionBtns = [];
  if (onlineMode) {
    if (isHost) {
      actionBtns.push(el("button", {
        className: "btn",
        text: "Play Again",
        onClick: () => {
          sendRelay({ type: "restart_lobby" });
          resetGame();
          activePhase = "lobby";
          renderSetup();
        }
      }));
    } else {
      actionBtns.push(el("div", { className: "panel center", style: "background:none; border:none; margin:0;" }, [
        el("p", { className: "muted pulse", style: "font-weight:700;", text: "Waiting for Host to return to lobby..." })
      ]));
    }
    actionBtns.push(el("div", { className: "spacer" }));
    actionBtns.push(el("button", {
      className: "btn ghost",
      text: "Leave Room",
      onClick: () => {
        resetOnlineState();
        renderSetup();
      }
    }));
  } else {
    // Offline game over buttons
    actionBtns.push(el("button", { className: "btn", text: "Play Again", onClick: renderSetup }));
    actionBtns.push(el("div", { className: "spacer" }));
    actionBtns.push(el("button", { className: "btn ghost", text: "Back to Lobby", onClick: goHome }));
  }

  mount(
    el("div", { className: "topbar" }, [
      el("div", { className: "title", text: "Game Over" }),
    ]),
    el("div", { className: "panel center" }, [
      el("div", { style: "width:64px; height:64px; margin:0 auto 10px; color:var(--sunset-soft);" }, [icons.star()]),
      el("h2", { text: `${winnerName} Wins the Match!` }),
      el("p", { className: "muted", text: "Absolute catchphrase legends!" })
    ]),
    el("div", { className: "panel" }, [
      board
    ]),
    ...actionBtns
  );
}
