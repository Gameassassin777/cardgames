// Local Node.js WebSockets Server for Lake House Card Games lobby sync.
// Run this with: node server.js
// It mimics the stateless WebSocket relay of our Cloudflare Workers implementation.

import http from "http";
import { WebSocketServer } from "ws";

const PORT = 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Lake House Card Games multiplayer lobby sync server is running!\n");
});

const wss = new WebSocketServer({ server });

// Map: roomCode (string) -> Set of WebSocket client connections
const rooms = new Map();

// Map: socket -> { roomCode, name }
const socketMetadata = new Map();

function generateRoomCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Ensure uniqueness
  if (rooms.has(code)) return generateRoomCode();
  return code;
}

wss.on("connection", (ws) => {
  console.log("New WebSocket client connected.");

  ws.on("message", (rawMessage) => {
    try {
      const data = JSON.parse(rawMessage);
      console.log("Received action:", data.type, "from room:", data.code);

      switch (data.type) {
        case "create": {
          const code = generateRoomCode();
          rooms.set(code, new Set([ws]));
          socketMetadata.set(ws, { roomCode: code, name: data.name || "Host" });
          
          ws.send(JSON.stringify({
            type: "created",
            code,
            players: [data.name || "Host"]
          }));
          console.log(`Room ${code} created by ${data.name || "Host"}`);
          break;
        }

        case "join": {
          const code = (data.code || "").toUpperCase().trim();
          const name = (data.name || "Guest").trim();

          if (!rooms.has(code)) {
            ws.send(JSON.stringify({ type: "error", message: `Room ${code} not found.` }));
            return;
          }

          const clients = rooms.get(code);
          clients.add(ws);
          socketMetadata.set(ws, { roomCode: code, name });

          // Gather all player names currently in the room
          const playerNames = [];
          clients.forEach(client => {
            const meta = socketMetadata.get(client);
            if (meta) playerNames.push(meta.name);
          });

          // Broadcast to everyone in the room that a player joined
          const joinNotification = JSON.stringify({
            type: "player_joined",
            code,
            name,
            players: playerNames
          });

          clients.forEach(client => {
            if (client.readyState === 1) { // OPEN
              client.send(joinNotification);
            }
          });

          console.log(`Player ${name} joined room ${code}. Total players: ${clients.size}`);
          break;
        }

        case "relay": {
          const code = (data.code || "").toUpperCase();
          if (!rooms.has(code)) return;

          const clients = rooms.get(code);
          const relayPayload = JSON.stringify({
            type: "relay",
            sender: data.sender || "Unknown",
            action: data.action // the actual game event (e.g. SUBMIT, Czar selection)
          });

          // Send to everyone in the room EXCEPT the sender
          clients.forEach(client => {
            if (client !== ws && client.readyState === 1) {
              client.send(relayPayload);
            }
          });
          break;
        }

        default:
          console.warn("Unknown socket message type:", data.type);
      }
    } catch (err) {
      console.error("Error handling message:", err);
      ws.send(JSON.stringify({ type: "error", message: "Invalid message payload." }));
    }
  });

  ws.on("close", () => {
    const meta = socketMetadata.get(ws);
    if (!meta) {
      console.log("Client closed connection (no active room).");
      return;
    }

    const { roomCode, name } = meta;
    socketMetadata.delete(ws);

    if (rooms.has(roomCode)) {
      const clients = rooms.get(roomCode);
      clients.delete(ws);

      console.log(`Player ${name} left room ${roomCode}. remaining: ${clients.size}`);

      if (clients.size === 0) {
        rooms.delete(roomCode);
        console.log(`Room ${roomCode} has been closed (all players left).`);
      } else {
        // Gather remaining player names
        const playerNames = [];
        clients.forEach(client => {
          const m = socketMetadata.get(client);
          if (m) playerNames.push(m.name);
        });

        // Notify remaining players
        const leaveNotification = JSON.stringify({
          type: "player_left",
          name,
          players: playerNames
        });

        clients.forEach(client => {
          if (client.readyState === 1) {
            client.send(leaveNotification);
          }
        });
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Lakehouse multiplayer WebSocket server running on http://localhost:${PORT}`);
  console.log("Press Ctrl+C to stop.");
});
