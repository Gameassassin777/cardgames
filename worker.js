// Cloudflare Worker — real-time WebSocket multiplayer + permanent custom card sync.
// Deploy: npx wrangler deploy

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    // ── HTTP Sync API (no WebSocket upgrade) ──────────────────────────────────
    if (request.headers.get("Upgrade") !== "websocket") {

      // GET /sync/pull-all → { cam: { cards, prompts }, cabin: { ... }, ... }
      if (path === "/sync/pull-all" && request.method === "GET") {
        try {
          const id = env.GLOBAL_STORE.idFromName("global");
          const store = env.GLOBAL_STORE.get(id);
          const res = await store.fetch("http://global/pull-all");
          const data = await res.text();
          return new Response(data, { headers: { ...CORS, "Content-Type": "application/json" } });
        } catch (e) {
          return new Response(JSON.stringify({ error: String(e) }), {
            status: 500, headers: { ...CORS, "Content-Type": "application/json" }
          });
        }
      }

      // POST /sync/push  body: { game, cards: [...], prompts: [...] }
      if (path === "/sync/push" && request.method === "POST") {
        try {
          const body = await request.json();
          const id = env.GLOBAL_STORE.idFromName("global");
          const store = env.GLOBAL_STORE.get(id);
          const res = await store.fetch("http://global/push", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await res.text();
          return new Response(data, { headers: { ...CORS, "Content-Type": "application/json" } });
        } catch (e) {
          return new Response(JSON.stringify({ error: String(e) }), {
            status: 500, headers: { ...CORS, "Content-Type": "application/json" }
          });
        }
      }

      // GET /gartic/gallery → array of saved gartic games
      if (path === "/gartic/gallery" && request.method === "GET") {
        try {
          const id = env.GLOBAL_STORE.idFromName("global");
          const store = env.GLOBAL_STORE.get(id);
          const res = await store.fetch("http://global/gartic-gallery");
          const data = await res.text();
          return new Response(data, { headers: { ...CORS, "Content-Type": "application/json" } });
        } catch (e) {
          return new Response("[]", { headers: { ...CORS, "Content-Type": "application/json" } });
        }
      }

      // POST /gartic/save  body: { id, date, players, isMonkey, chains }
      if (path === "/gartic/save" && request.method === "POST") {
        try {
          const body = await request.json();
          const id = env.GLOBAL_STORE.idFromName("global");
          const store = env.GLOBAL_STORE.get(id);
          const res = await store.fetch("http://global/gartic-save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await res.text();
          return new Response(data, { headers: { ...CORS, "Content-Type": "application/json" } });
        } catch (e) {
          return new Response(JSON.stringify({ error: String(e) }), {
            status: 500, headers: { ...CORS, "Content-Type": "application/json" }
          });
        }
      }

      return new Response("Lake House Card Games — sync server is active.", {
        status: 200, headers: { ...CORS, "Content-Type": "text/plain" }
      });
    }

    // ── WebSocket multiplayer ─────────────────────────────────────────────────
    if (path.startsWith("/ws/")) {
      let code = (url.searchParams.get("code") || "").toUpperCase().trim();
      const type = path.includes("create") ? "create" : "join";
      if (type === "create") code = generateRoomCode();
      if (!code || (type === "join" && code.length !== 4)) {
        return new Response("Invalid room code.", { status: 400 });
      }
      const doId = env.ROOM_LOBBY.idFromName(code);
      return env.ROOM_LOBBY.get(doId).fetch(request);
    }

    return new Response("Not Found", { status: 404 });
  }
};

function generateRoomCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ── GlobalStore Durable Object ────────────────────────────────────────────────
// Stores per-game arrays:
//   cards_<game>   → string[]   (response cards)
//   prompts_<game> → Object[]   ({ text, pick })
export class GlobalStore {
  constructor(state, env) {
    this.state = state;
  }

  async fetch(request) {
    const url = new URL(request.url);

    // ── /pull-all ─────────────────────────────────────────────────────────────
    if (url.pathname === "/pull-all") {
      const GAME_IDS = ["family", "sibling", "roasts", "cam", "cabin", "rizz", "wyr", "flags", "truths", "catchphrase"];
      const result = {};
      for (const game of GAME_IDS) {
        const cards   = await this.state.storage.get(`cards_${game}`)   || [];
        const prompts = await this.state.storage.get(`prompts_${game}`) || [];
        result[game] = { cards, prompts };
      }
      return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
    }

    // ── /push  (POST, body: { game, cards, prompts }) ─────────────────────────
    if (url.pathname === "/push" && request.method === "POST") {
      const { game, cards: newCards = [], prompts: newPrompts = [] } = await request.json();
      if (!game) return new Response("Missing game", { status: 400 });

      let addedCards = 0;
      let addedPrompts = 0;

      if (newCards.length > 0) {
        const existing = await this.state.storage.get(`cards_${game}`) || [];
        for (const c of newCards) {
          if (typeof c === "string" && c.trim() && !existing.includes(c)) {
            existing.push(c);
            addedCards++;
          }
        }
        if (addedCards > 0) await this.state.storage.put(`cards_${game}`, existing);
      }

      if (newPrompts.length > 0) {
        const existing = await this.state.storage.get(`prompts_${game}`) || [];
        const seen = new Set(existing.map(p => p.text));
        for (const p of newPrompts) {
          if (p && p.text && !seen.has(p.text)) {
            existing.push(p);
            seen.add(p.text);
            addedPrompts++;
          }
        }
        if (addedPrompts > 0) await this.state.storage.put(`prompts_${game}`, existing);
      }

      return new Response(JSON.stringify({ success: true, addedCards, addedPrompts }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // ── /gartic-gallery ────────────────────────────────────────────────────────
    if (url.pathname === "/gartic-gallery") {
      const games = await this.state.storage.get("gartic_games") || [];
      return new Response(JSON.stringify(games), { headers: { "Content-Type": "application/json" } });
    }

    // ── /gartic-save  (POST) ──────────────────────────────────────────────────
    if (url.pathname === "/gartic-save" && request.method === "POST") {
      const game = await request.json();
      if (!game || !game.id) return new Response("Missing id", { status: 400 });
      const games = await this.state.storage.get("gartic_games") || [];
      // Prepend newest first, cap at 40
      games.unshift(game);
      if (games.length > 40) games.length = 40;
      await this.state.storage.put("gartic_games", games);
      return new Response(JSON.stringify({ success: true, total: games.length }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // ── /get?game=<id>  (legacy: used by RoomLobby during player_joined) ──────
    if (url.pathname === "/get") {
      const game = url.searchParams.get("game") || "cam";
      const cards = await this.state.storage.get(`cards_${game}`) || [];
      return new Response(JSON.stringify(cards), { headers: { "Content-Type": "application/json" } });
    }

    // ── /add?game=<id>&card=<text>  (legacy: used by ADD_CUSTOM_CARD relay) ───
    if (url.pathname === "/add") {
      const card = url.searchParams.get("card");
      const game = url.searchParams.get("game") || "cam";
      if (card && card.trim()) {
        const key = `cards_${game}`;
        const cards = await this.state.storage.get(key) || [];
        if (!cards.includes(card.trim())) {
          cards.push(card.trim());
          await this.state.storage.put(key, cards);
        }
        return new Response(JSON.stringify({ success: true, count: cards.length }), {
          headers: { "Content-Type": "application/json" }
        });
      }
      return new Response("Missing card", { status: 400 });
    }

    return new Response("Not Found", { status: 404 });
  }
}

// ── RoomLobby Durable Object ──────────────────────────────────────────────────
export class RoomLobby {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map();
  }

  async fetch(request) {
    const url = new URL(request.url);
    const code = url.searchParams.get("code") || generateRoomCode();
    const name = url.searchParams.get("name") || "Guest";
    const game = url.searchParams.get("game") || "cam";   // ← game ID now propagated
    const type = url.pathname.includes("create") ? "create" : "join";

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    await this.handleSession(server, code, name, game, type);
    return new Response(null, { status: 101, webSocket: client });
  }

  async handleSession(ws, code, name, game, type) {
    ws.accept();
    this.sessions.set(ws, { name });

    // Fetch persisted custom cards for THIS game from GlobalStore
    let customCards = [];
    try {
      const id = this.env.GLOBAL_STORE.idFromName("global");
      const store = this.env.GLOBAL_STORE.get(id);
      const res = await store.fetch(`http://global/get?game=${encodeURIComponent(game)}`);
      customCards = await res.json();
    } catch (e) {
      console.error("DO: GlobalStore fetch failed:", e);
    }

    if (type === "create") {
      ws.send(JSON.stringify({ type: "created", code, players: [name], customCards }));
      console.log(`DO: Room ${code} (game=${game}) created by ${name}`);
    } else {
      const playerNames = [];
      this.sessions.forEach(s => playerNames.push(s.name));
      this.broadcast(JSON.stringify({ type: "player_joined", code, name, players: playerNames, customCards }));
      console.log(`DO: ${name} joined room ${code} (game=${game})`);
    }

    ws.addEventListener("message", async (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data.type !== "relay") return;

        // Special: winning blank card → persist to GlobalStore for this game
        if (data.action?.type === "ADD_CUSTOM_CARD") {
          const cardText = data.action.card;
          if (cardText?.trim()) {
            try {
              const id = this.env.GLOBAL_STORE.idFromName("global");
              const store = this.env.GLOBAL_STORE.get(id);
              await store.fetch(`http://global/add?game=${encodeURIComponent(game)}&card=${encodeURIComponent(cardText.trim())}`);
              console.log(`DO: Saved winning card to game "${game}": "${cardText}"`);
            } catch (e) {
              console.error("DO: Failed to save custom card:", e);
            }
          }
        }

        const payload = JSON.stringify({ type: "relay", sender: data.sender || name, action: data.action });
        this.broadcast(payload, ws); // exclude sender
      } catch (err) {
        console.error("DO: Message parse error:", err);
      }
    });

    const onClose = () => {
      this.sessions.delete(ws);
      console.log(`DO: ${name} disconnected from room ${code}`);
      if (this.sessions.size > 0) {
        const remaining = [];
        this.sessions.forEach(s => remaining.push(s.name));
        this.broadcast(JSON.stringify({ type: "player_left", name, players: remaining }));
      }
    };
    ws.addEventListener("close", onClose);
    ws.addEventListener("error", onClose);
  }

  broadcast(message, excludeWs = null) {
    this.sessions.forEach((session, ws) => {
      if (ws !== excludeWs) {
        try { ws.send(message); } catch (e) {
          console.error("DO: broadcast failed, pruning socket.");
          this.sessions.delete(ws);
        }
      }
    });
  }
}
