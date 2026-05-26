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
      // Extract room code
      let code = url.searchParams.get("code") || "";
      code = code.toUpperCase().trim();

      const type = path.includes("create") ? "create" : "join";

      if (type === "create") {
        // Generate a random room code
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

// Durable Object class coordinating sockets inside an isolated in-memory execution context
export class RoomLobby {
  constructor(state, env) {
    this.state = state;
    // Map: socket -> { name }
    this.sessions = new Map();
  }

  async fetch(request) {
    const url = new URL(request.url);
    const code = url.searchParams.get("code") || generateRoomCode();
    const name = url.searchParams.get("name") || "Guest";
    const type = url.pathname.includes("create") ? "create" : "join";

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept the WebSocket connection on the server side
    await this.handleSession(server, code, name, type);

    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }

  async handleSession(ws, code, name, type) {
    ws.accept();

    // Register session
    this.sessions.set(ws, { name });

    // Handle handshake confirmation
    if (type === "create") {
      ws.send(JSON.stringify({
        type: "created",
        code,
        players: [name]
      }));
      console.log(`Cloudflare DO: Room ${code} created by host ${name}`);
    } else {
      // Gather all players currently in DO session
      const playerNames = [];
      this.sessions.forEach(session => {
        playerNames.push(session.name);
      });

      // Broadcast player joined to ALL sessions in DO
      const joinNotification = JSON.stringify({
        type: "player_joined",
        code,
        name,
        players: playerNames
      });

      this.broadcast(joinNotification);
      console.log(`Cloudflare DO: Player ${name} joined room ${code}`);
    }

    // Set message listener
    ws.addEventListener("message", (msg) => {
      try {
        const data = JSON.parse(msg.data);

        if (data.type === "relay") {
          // Relays the action to all other sockets in this DO instance
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

    // Set close / error listeners
    const closeHandler = () => {
      this.sessions.delete(ws);
      console.log(`Cloudflare DO: Connection closed for ${name}`);

      if (this.sessions.size === 0) {
        console.log(`Cloudflare DO: Room ${code} is empty, purging memory.`);
      } else {
        // Recalculate players
        const playerNames = [];
        this.sessions.forEach(session => {
          playerNames.push(session.name);
        });

        // Notify remaining
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
