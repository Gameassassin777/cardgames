// Cloudflare Worker with Durable Objects for global real-time multiplayer WebSockets sync.
// Deploy this with wrangler: npx wrangler deploy

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Only handle WebSocket upgrades
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Lake House Card Games multiplayer lobby sync is active on Cloudflare Workers!", {
        status: 200,
        headers: { "Content-Type": "text/plain" }
      });
    }

    // Paths: /ws/create?name=HostName or /ws/join?code=ABCD&name=PlayerName
    const path = url.pathname;
    
    if (path.startsWith("/ws/")) {
      let code = url.searchParams.get("code") || "";
      code = code.toUpperCase().trim();

      const type = path.includes("create") ? "create" : "join";

      if (type === "create") {
        code = generateRoomCode();
      }

      if (!code || (type === "join" && code.length !== 4)) {
        return new Response("Invalid room code.", { status: 400 });
      }

      // Fetch the Durable Object instance for this room
      const id = env.ROOM_LOBBY.idFromName(code);
      const roomObject = env.ROOM_LOBBY.get(id);

      // Forward request to the Durable Object
      return roomObject.fetch(request);
    }

    return new Response("Not Found", { status: 404 });
  }
};

function generateRoomCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Global Custom Cards Store Durable Object
export class GlobalStore {
  constructor(state, env) {
    this.state = state;
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/add") {
      const card = url.searchParams.get("card");
      if (card && card.trim()) {
        const text = card.trim();
        // Load existing custom cards
        const cards = await this.state.storage.get("custom_cards") || [];
        if (!cards.includes(text)) {
          cards.push(text);
          await this.state.storage.put("custom_cards", cards);
        }
        return new Response(JSON.stringify({ success: true, count: cards.length }), {
          headers: { "Content-Type": "application/json" }
        });
      }
      return new Response("Missing card", { status: 400 });
    }

    if (url.pathname === "/get") {
      const cards = await this.state.storage.get("custom_cards") || [];
      return new Response(JSON.stringify(cards), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response("Not Found", { status: 404 });
  }
}

// Room Lobby Durable Object class coordinating sockets inside an isolated room
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
    const type = url.pathname.includes("create") ? "create" : "join";

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    await this.handleSession(server, code, name, type);

    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }

  async handleSession(ws, code, name, type) {
    ws.accept();

    this.sessions.set(ws, { name });

    // Fetch custom cards permanently saved on Global Store Durable Object
    let customCards = [];
    try {
      const globalId = this.env.GLOBAL_STORE.idFromName("global");
      const globalStore = this.env.GLOBAL_STORE.get(globalId);
      const res = await globalStore.fetch("http://global/get");
      customCards = await res.json();
    } catch(e) {
      console.error("DO: Failed to query GlobalStore:", e);
    }

    if (type === "create") {
      ws.send(JSON.stringify({
        type: "created",
        code,
        players: [name],
        customCards // Send the custom cards list directly to host on creation
      }));
      console.log(`Cloudflare DO: Room ${code} created by host ${name}`);
    } else {
      const playerNames = [];
      this.sessions.forEach(session => {
        playerNames.push(session.name);
      });

      const joinNotification = JSON.stringify({
        type: "player_joined",
        code,
        name,
        players: playerNames,
        customCards // Send the custom cards to guests as well
      });

      this.broadcast(joinNotification);
      console.log(`Cloudflare DO: Player ${name} joined room ${code}`);
    }

    ws.addEventListener("message", async (msg) => {
      try {
        const data = JSON.parse(msg.data);

        if (data.type === "relay") {
          // If a custom card has won and needs to be permanently added to the cloud
          if (data.action && data.action.type === "ADD_CUSTOM_CARD") {
            const cardText = data.action.card;
            if (cardText && cardText.trim()) {
              try {
                // Forward the custom card to our global persistent DO store!
                const globalId = this.env.GLOBAL_STORE.idFromName("global");
                const globalStore = this.env.GLOBAL_STORE.get(globalId);
                await globalStore.fetch(`http://global/add?card=${encodeURIComponent(cardText.trim())}`);
                console.log(`Cloudflare DO: Saved custom card globally: "${cardText}"`);
              } catch(e) {
                console.error("DO: Failed to save custom card:", e);
              }
            }
          }

          const relayPayload = JSON.stringify({
            type: "relay",
            sender: data.sender || name,
            action: data.action
          });

          this.broadcast(relayPayload, ws);
        }
      } catch (err) {
        console.error("DO parsing error:", err);
      }
    });

    const closeHandler = () => {
      this.sessions.delete(ws);
      console.log(`Cloudflare DO: Connection closed for ${name}`);

      if (this.sessions.size === 0) {
        console.log(`Cloudflare DO: Room ${code} is empty, purging memory.`);
      } else {
        const playerNames = [];
        this.sessions.forEach(session => {
          playerNames.push(session.name);
        });

        const leaveNotification = JSON.stringify({
          type: "player_left",
          name,
          players: playerNames
        });

        this.broadcast(leaveNotification);
      }
    };

    ws.addEventListener("close", closeHandler);
    ws.addEventListener("error", closeHandler);
  }

  broadcast(message, excludeWs = null) {
    this.sessions.forEach((session, ws) => {
      if (ws !== excludeWs) {
        try {
          ws.send(message);
        } catch (e) {
          console.error("DO broadcast socket failed, pruning...");
          this.sessions.delete(ws);
        }
      }
    });
  }
}
