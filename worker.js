// Cloudflare Worker — real-time WebSocket multiplayer + permanent custom card sync + gartic gallery + open room browser.
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

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    // ── HTTP API (no WebSocket upgrade) ───────────────────────────────────────
    if (request.headers.get("Upgrade") !== "websocket") {
      const store = env.GLOBAL_STORE.get(env.GLOBAL_STORE.idFromName("global"));

      // ── Custom card sync ───────────────────────────────────────────────────
      if (path === "/sync/pull-all" && request.method === "GET") {
        try {
          const res  = await store.fetch("http://global/pull-all");
          const data = await res.text();
          return new Response(data, { headers: { ...CORS, "Content-Type": "application/json" } });
        } catch (e) {
          return json({ error: String(e) }, 500);
        }
      }

      if (path === "/sync/push" && request.method === "POST") {
        try {
          const body = await request.json();
          const res  = await store.fetch("http://global/push", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
          });
          return new Response(await res.text(), { headers: { ...CORS, "Content-Type": "application/json" } });
        } catch (e) {
          return json({ error: String(e) }, 500);
        }
      }

      // ── Gartic gallery ─────────────────────────────────────────────────────
      if (path === "/gartic/gallery" && request.method === "GET") {
        try {
          const res  = await store.fetch("http://global/gartic-gallery");
          return new Response(await res.text(), { headers: { ...CORS, "Content-Type": "application/json" } });
        } catch (e) {
          return new Response("[]", { headers: { ...CORS, "Content-Type": "application/json" } });
        }
      }

      if (path === "/gartic/save" && request.method === "POST") {
        try {
          const body = await request.json();
          const res  = await store.fetch("http://global/gartic-save", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
          });
          return new Response(await res.text(), { headers: { ...CORS, "Content-Type": "application/json" } });
        } catch (e) {
          return json({ error: String(e) }, 500);
        }
      }

      // ── Open room browser ──────────────────────────────────────────────────
      if (path === "/rooms/list" && request.method === "GET") {
        const game = url.searchParams.get("game") || "";
        try {
          const res  = await store.fetch(`http://global/rooms-list?game=${encodeURIComponent(game)}`);
          return new Response(await res.text(), { headers: { ...CORS, "Content-Type": "application/json" } });
        } catch (e) {
          return new Response("[]", { headers: { ...CORS, "Content-Type": "application/json" } });
        }
      }

      if (path === "/rooms/register" && request.method === "POST") {
        try {
          const body = await request.json();
          const res  = await store.fetch("http://global/rooms-register", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
          });
          return new Response(await res.text(), { headers: { ...CORS, "Content-Type": "application/json" } });
        } catch (e) {
          return json({ error: String(e) }, 500);
        }
      }

      if (path === "/rooms/heartbeat" && request.method === "POST") {
        try {
          const body = await request.json();
          const res  = await store.fetch("http://global/rooms-heartbeat", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
          });
          return new Response(await res.text(), { headers: { ...CORS, "Content-Type": "application/json" } });
        } catch (e) {
          return json({ error: String(e) }, 500);
        }
      }

      if (path === "/rooms/unregister" && request.method === "POST") {
        try {
          const body = await request.json();
          const res  = await store.fetch("http://global/rooms-unregister", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
          });
          return new Response(await res.text(), { headers: { ...CORS, "Content-Type": "application/json" } });
        } catch (e) {
          return json({ error: String(e) }, 500);
        }
      }

      return new Response("Lake House Card Games — server active.", {
        status: 200, headers: { ...CORS, "Content-Type": "text/plain" }
      });
    }

    // ── WebSocket multiplayer ─────────────────────────────────────────────────
    if (url.pathname.startsWith("/ws/")) {
      let code = (url.searchParams.get("code") || "").toUpperCase().trim();
      const type = url.pathname.includes("create") ? "create" : "join";
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

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...CORS, "Content-Type": "application/json" }
  });
}

function generateRoomCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ── GlobalStore Durable Object ────────────────────────────────────────────────
export class GlobalStore {
  constructor(state) { this.state = state; }

  async fetch(request) {
    const url = new URL(request.url);

    // ── Custom card sync ───────────────────────────────────────────────────────
    if (url.pathname === "/pull-all") {
      const GAME_IDS = ["family","roasts","cam","cabin","rizz","wyr","flags","truths","catchphrase"];
      const result = {};
      for (const game of GAME_IDS) {
        const cards   = await this.state.storage.get(`cards_${game}`)   || [];
        const prompts = await this.state.storage.get(`prompts_${game}`) || [];
        result[game] = { cards, prompts };
      }
      return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
    }

    if (url.pathname === "/push" && request.method === "POST") {
      const { game, cards: newCards = [], prompts: newPrompts = [] } = await request.json();
      if (!game) return new Response("Missing game", { status: 400 });
      let ac = 0, ap = 0;
      if (newCards.length) {
        const ex = await this.state.storage.get(`cards_${game}`) || [];
        for (const c of newCards) { if (typeof c === "string" && c.trim() && !ex.includes(c)) { ex.push(c); ac++; } }
        if (ac) await this.state.storage.put(`cards_${game}`, ex);
      }
      if (newPrompts.length) {
        const ex = await this.state.storage.get(`prompts_${game}`) || [];
        const seen = new Set(ex.map(p => p.text));
        for (const p of newPrompts) { if (p?.text && !seen.has(p.text)) { ex.push(p); seen.add(p.text); ap++; } }
        if (ap) await this.state.storage.put(`prompts_${game}`, ex);
      }
      return new Response(JSON.stringify({ success: true, addedCards: ac, addedPrompts: ap }), { headers: { "Content-Type": "application/json" } });
    }

    if (url.pathname === "/get") {
      const game  = url.searchParams.get("game") || "cam";
      const cards = await this.state.storage.get(`cards_${game}`) || [];
      return new Response(JSON.stringify(cards), { headers: { "Content-Type": "application/json" } });
    }

    if (url.pathname === "/add") {
      const card = url.searchParams.get("card");
      const game = url.searchParams.get("game") || "cam";
      if (card?.trim()) {
        const key   = `cards_${game}`;
        const cards = await this.state.storage.get(key) || [];
        if (!cards.includes(card.trim())) { cards.push(card.trim()); await this.state.storage.put(key, cards); }
        return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
      }
      return new Response("Missing card", { status: 400 });
    }

    // ── Gartic gallery (UNLIMITED — no cap) ───────────────────────────────────
    if (url.pathname === "/gartic-gallery") {
      const games = await this.state.storage.get("gartic_games") || [];
      return new Response(JSON.stringify(games), { headers: { "Content-Type": "application/json" } });
    }

    if (url.pathname === "/gartic-save" && request.method === "POST") {
      const game = await request.json();
      if (!game?.id) return new Response("Missing id", { status: 400 });
      const games = await this.state.storage.get("gartic_games") || [];
      games.unshift(game); // newest first, NO cap — storage is unlimited
      await this.state.storage.put("gartic_games", games);
      return new Response(JSON.stringify({ success: true, total: games.length }), { headers: { "Content-Type": "application/json" } });
    }

    // ── Open room browser ─────────────────────────────────────────────────────
    // Rooms stored as: { code, host, playerCount, game, private, lastPing }
    // Stale = lastPing older than 60 seconds

    if (url.pathname === "/rooms-list") {
      const gameFilter = url.searchParams.get("game") || "";
      const now   = Date.now();
      const rooms = await this.state.storage.get("open_rooms") || [];
      const live  = rooms.filter(r => (now - r.lastPing) < 60000 && (!gameFilter || r.game === gameFilter));
      return new Response(JSON.stringify(live), { headers: { "Content-Type": "application/json" } });
    }

    if (url.pathname === "/rooms-register" && request.method === "POST") {
      const room  = await request.json();
      const rooms = await this.state.storage.get("open_rooms") || [];
      // Remove stale + any existing with same code
      const now    = Date.now();
      const clean  = rooms.filter(r => r.code !== room.code && (now - r.lastPing) < 60000);
      clean.push({ ...room, lastPing: now });
      await this.state.storage.put("open_rooms", clean);
      return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
    }

    if (url.pathname === "/rooms-heartbeat" && request.method === "POST") {
      const { code, playerCount } = await request.json();
      const rooms = await this.state.storage.get("open_rooms") || [];
      const now   = Date.now();
      const idx   = rooms.findIndex(r => r.code === code);
      if (idx !== -1) { rooms[idx].lastPing = now; rooms[idx].playerCount = playerCount || rooms[idx].playerCount; }
      await this.state.storage.put("open_rooms", rooms);
      return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
    }

    if (url.pathname === "/rooms-unregister" && request.method === "POST") {
      const { code } = await request.json();
      const rooms = await this.state.storage.get("open_rooms") || [];
      await this.state.storage.put("open_rooms", rooms.filter(r => r.code !== code));
      return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
    }

    return new Response("Not Found", { status: 404 });
  }
}

// ── RoomLobby Durable Object ──────────────────────────────────────────────────
export class RoomLobby {
  constructor(state, env) { this.state = state; this.env = env; this.sessions = new Map(); }

  async fetch(request) {
    const url  = new URL(request.url);
    const code = url.searchParams.get("code") || generateRoomCode();
    const name = url.searchParams.get("name") || "Guest";
    const game = url.searchParams.get("game") || "cam";
    const type = url.pathname.includes("create") ? "create" : "join";

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    await this.handleSession(server, code, name, game, type);
    return new Response(null, { status: 101, webSocket: client });
  }

  async handleSession(ws, code, name, game, type) {
    ws.accept();
    this.sessions.set(ws, { name });

    let customCards = [];
    try {
      const id    = this.env.GLOBAL_STORE.idFromName("global");
      const store = this.env.GLOBAL_STORE.get(id);
      const res   = await store.fetch(`http://global/get?game=${encodeURIComponent(game)}`);
      customCards = await res.json();
    } catch (e) { console.error("DO: GlobalStore fetch failed:", e); }

    if (type === "create") {
      ws.send(JSON.stringify({ type: "created", code, players: [name], customCards }));
    } else {
      const playerNames = [];
      this.sessions.forEach(s => playerNames.push(s.name));
      this.broadcast(JSON.stringify({ type: "player_joined", code, name, players: playerNames, customCards }));
    }

    ws.addEventListener("message", async (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data.type !== "relay") return;

        if (data.action?.type === "ADD_CUSTOM_CARD") {
          const cardText = data.action.card;
          if (cardText?.trim()) {
            try {
              const id    = this.env.GLOBAL_STORE.idFromName("global");
              const store = this.env.GLOBAL_STORE.get(id);
              await store.fetch(`http://global/add?game=${encodeURIComponent(game)}&card=${encodeURIComponent(cardText.trim())}`);
            } catch (e) { console.error("DO: Failed to save custom card:", e); }
          }
        }

        const payload = JSON.stringify({ type: "relay", sender: data.sender || name, action: data.action });
        this.broadcast(payload, ws);
      } catch (err) { console.error("DO: Message parse error:", err); }
    });

    const onClose = () => {
      this.sessions.delete(ws);
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
        try { ws.send(message); } catch (e) { this.sessions.delete(ws); }
      }
    });
  }
}
