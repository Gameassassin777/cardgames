// Local Node.js WebSockets Server for Lake House Card Games lobby sync.
// Run this with: node server.js
// It mimics the stateless WebSocket relay of our Cloudflare Workers implementation.

import http from "http";
import { WebSocketServer } from "ws";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const PORT = 3000;

// Local in-memory store
let openRooms = [];
let garticGames = [];

const server = http.createServer((req, res) => {
  // CORS setup
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // 1. GET /rooms/list
  if (pathname === "/rooms/list" && req.method === "GET") {
    const gameFilter = url.searchParams.get("game") || "";
    const now = Date.now();
    // Clean stale rooms (>12 seconds)
    openRooms = openRooms.filter(r => (now - r.lastPing) < 12000);
    const live = openRooms.filter(r => !gameFilter || r.game === gameFilter);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(live));
    return;
  }

  // Helper to read request body JSON
  const getBody = (callback) => {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      try {
        callback(JSON.parse(body));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
  };

  // 2. POST /rooms/register
  if (pathname === "/rooms/register" && req.method === "POST") {
    getBody((room) => {
      const now = Date.now();
      openRooms = openRooms.filter(r => r.code !== room.code && (now - r.lastPing) < 12000);
      openRooms.push({ ...room, lastPing: now });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true }));
    });
    return;
  }

  // 3. POST /rooms/heartbeat
  if (pathname === "/rooms/heartbeat" && req.method === "POST") {
    getBody((data) => {
      const now = Date.now();
      const idx = openRooms.findIndex(r => r.code === data.code);
      if (idx !== -1) {
        openRooms[idx].lastPing = now;
        if (data.playerCount !== undefined) {
          openRooms[idx].playerCount = data.playerCount;
        }
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true }));
    });
    return;
  }

  // 4. POST /rooms/unregister
  if (pathname === "/rooms/unregister" && req.method === "POST") {
    getBody((data) => {
      openRooms = openRooms.filter(r => r.code !== data.code);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true }));
    });
    return;
  }

  // 5. GET /sync/pull-all
  if (pathname === "/sync/pull-all" && req.method === "GET") {
    const GAME_IDS = ["family","roasts","cam","cabin","rizz","wyr","flags","truths","catchphrase"];
    const result = {};
    const loadedCards = loadCustomCards();
    
    for (const game of GAME_IDS) {
      result[game] = {
        cards: game === "cam" || game === "cabin" ? loadedCards : [],
        prompts: []
      };
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
    return;
  }

  // 6. POST /sync/push
  if (pathname === "/sync/push" && req.method === "POST") {
    getBody((data) => {
      let addedCount = 0;
      if (data && Array.isArray(data.cards)) {
        data.cards.forEach(c => {
          if (c && c.trim()) {
            saveCustomCard(c);
            addedCount++;
          }
        });
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, addedCards: addedCount, addedPrompts: 0 }));
    });
    return;
  }

  // 7. GET /gartic/gallery
  if (pathname === "/gartic/gallery" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(garticGames));
    return;
  }

  // 8. POST /gartic/save
  if (pathname === "/gartic/save" && req.method === "POST") {
    getBody((game) => {
      if (game && game.id) {
        garticGames.unshift(game);
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, total: garticGames.length }));
    });
    return;
  }

  // 9. POST /decks/upload
  if (pathname === "/decks/upload" && req.method === "POST") {
    getBody((deck) => {
      if (deck && deck.gameId && deck.name) {
        const safeGameId = deck.gameId.replace(/[^a-zA-Z0-9_-]/g, "");
        const safeName = deck.name.replace(/[^a-zA-Z0-9_-]/g, "");
        const filename = `${safeGameId}_${safeName}.json`;
        const filePath = path.join(sharedDecksDir, filename);
        try {
          fs.writeFileSync(filePath, JSON.stringify(deck, null, 2), "utf8");
          console.log(`Local Server: Saved shared deck permanently: "${deck.name}" for game "${deck.gameId}"`);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
          return;
        } catch (e) {
          console.error("Local Server: Error writing shared deck file:", e);
        }
      }
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Failed to write shared deck" }));
    });
    return;
  }

  // 10. GET /decks/list
  if (pathname === "/decks/list" && req.method === "GET") {
    try {
      const decks = [];
      if (fs.existsSync(sharedDecksDir)) {
        const files = fs.readdirSync(sharedDecksDir);
        files.forEach(file => {
          if (file.endsWith(".json")) {
            try {
              const fileContent = fs.readFileSync(path.join(sharedDecksDir, file), "utf8");
              const parsed = JSON.parse(fileContent);
              decks.push(parsed);
            } catch (_) {}
          }
        });
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(decks));
      return;
    } catch (e) {
      console.error("Local Server: Error listing shared decks:", e);
    }
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Failed to list shared decks" }));
    return;
  }

  // Serve static files relative to __dirname
  const MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webmanifest": "application/manifest+json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon"
  };

  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, "");
  if (safePath === "/") safePath = "/index.html";
  const filePath = path.join(__dirname, safePath);

  if (fs.existsSync(filePath)) {
    try {
      const stat = fs.statSync(filePath);
      if (stat.isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || "application/octet-stream";
        res.writeHead(200, { "Content-Type": contentType });
        fs.createReadStream(filePath).pipe(res);
        return;
      }
    } catch (err) {
      console.error("Local Server: Error serving static file:", err);
    }
  }

  // Standard fallback
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Lake House Card Games multiplayer lobby sync server is running!\n");
});

const wss = new WebSocketServer({ server });

// Room structures
const rooms = new Map();
const socketMetadata = new Map();

// Local persistent store path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const customCardsPath = path.join(__dirname, "custom_cards.json");
const sharedDecksDir = path.join(__dirname, "shared_decks");

if (!fs.existsSync(sharedDecksDir)) {
  fs.mkdirSync(sharedDecksDir, { recursive: true });
}

// Helper to load custom cards
function loadCustomCards() {
  try {
    if (fs.existsSync(customCardsPath)) {
      const data = fs.readFileSync(customCardsPath, "utf8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Local Server: Error reading custom cards file:", e);
  }
  return [];
}

// Helper to save custom cards
function saveCustomCard(cardText) {
  if (!cardText || !cardText.trim()) return;
  const text = cardText.trim();
  const cards = loadCustomCards();
  if (!cards.includes(text)) {
    cards.push(text);
    try {
      fs.writeFileSync(customCardsPath, JSON.stringify(cards, null, 2), "utf8");
      console.log(`Local Server: Saved custom card permanently: "${text}"`);
    } catch (e) {
      console.error("Local Server: Error writing custom cards file:", e);
    }
  }
}

function generateRoomCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  if (rooms.has(code)) return generateRoomCode();
  return code;
}

wss.on("connection", (ws, req) => {
  console.log("New WebSocket client connected.");

  // ── URL-based Room Routing ────────────────────────────────────────────────
  let parsedUrl = null;
  try {
    if (req && req.url) {
      parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    }
  } catch (_) {}

  if (parsedUrl && parsedUrl.pathname.startsWith("/ws/")) {
    const type = parsedUrl.pathname.includes("create") ? "create" : "join";
    const name = decodeURIComponent(parsedUrl.searchParams.get("name") || "Guest").trim();
    const game = parsedUrl.searchParams.get("game") || "cam";
    const code = (parsedUrl.searchParams.get("code") || "").toUpperCase().trim();

    if (type === "create") {
      const newCode = generateRoomCode();
      const clients = new Set([ws]);
      clients.lastState = null;
      clients.lastStateSender = null;
      rooms.set(newCode, clients);
      socketMetadata.set(ws, { roomCode: newCode, name: name || "Host" });
      
      ws.send(JSON.stringify({
        type: "created",
        code: newCode,
        players: [name || "Host"],
        customCards: loadCustomCards()
      }));
      console.log(`Room ${newCode} created by ${name || "Host"} via URL`);
    } else if (type === "join" && code) {
      if (rooms.has(code)) {
        const clients = rooms.get(code);
        clients.add(ws);
        socketMetadata.set(ws, { roomCode: code, name });

        const playerNames = [];
        clients.forEach(client => {
          const meta = socketMetadata.get(client);
          if (meta && !meta.name.startsWith("__")) {
            playerNames.push(meta.name);
          }
        });

        // Broadcast join + custom cards to room
        const joinNotification = JSON.stringify({
          type: "player_joined",
          code,
          name,
          players: playerNames,
          customCards: loadCustomCards()
        });

        clients.forEach(client => {
          if (client.readyState === 1) {
            client.send(joinNotification);
          }
        });

        console.log(`Player ${name} joined room ${code} via URL. Total players: ${clients.size}`);
        
        // PLAYBACK: Play back the last cached relayed state if it exists
        if (clients && clients.lastState) {
          ws.send(JSON.stringify({
            type: "relay",
            sender: clients.lastStateSender || "Host",
            action: clients.lastState
          }));
        }
      } else {
        ws.send(JSON.stringify({ type: "error", message: `Room ${code} not found.` }));
        ws.close();
        return;
      }
    }
  }

  ws.on("message", (rawMessage) => {
    try {
      const data = JSON.parse(rawMessage);
      console.log("Received action:", data.type, "from room:", data.code);

      const customCards = loadCustomCards();

      switch (data.type) {
        case "create": {
          const code = generateRoomCode();
          const clients = new Set([ws]);
          clients.lastState = null;
          clients.lastStateSender = null;
          rooms.set(code, clients);
          socketMetadata.set(ws, { roomCode: code, name: data.name || "Host" });
          
          ws.send(JSON.stringify({
            type: "created",
            code,
            players: [data.name || "Host"],
            customCards
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

          const playerNames = [];
          clients.forEach(client => {
            const meta = socketMetadata.get(client);
            if (meta && !meta.name.startsWith("__")) {
              playerNames.push(meta.name);
            }
          });

          // Broadcast join + custom cards to room
          const joinNotification = JSON.stringify({
            type: "player_joined",
            code,
            name,
            players: playerNames,
            customCards
          });

          clients.forEach(client => {
            if (client.readyState === 1) {
              client.send(joinNotification);
            }
          });

          console.log(`Player ${name} joined room ${code}. Total players: ${clients.size}`);
          
          // PLAYBACK: Play back the last cached relayed state if it exists
          if (clients && clients.lastState) {
            ws.send(JSON.stringify({
              type: "relay",
              sender: clients.lastStateSender || "Host",
              action: clients.lastState
            }));
            console.log(`Played back cached state of type "${clients.lastState.type}" to new player "${name}".`);
          }
          break;
        }

        case "relay": {
          const code = (data.code || "").toUpperCase();
          if (!rooms.has(code)) return;

          if (data.action && data.action.type === "ADD_CUSTOM_CARD") {
            saveCustomCard(data.action.card);
          }

          const clients = rooms.get(code);
          
          // CACHE state relays:
          if (data.action && (data.action.state || data.action.type?.startsWith("QUIPLASH") || data.action.type === "start_game" || data.action.type === "start_round" || data.action.type === "state_update" || data.action.type === "STATE_SYNC")) {
            clients.lastState = data.action;
            clients.lastStateSender = data.sender || "Host";
          }

          const relayPayload = JSON.stringify({
            type: "relay",
            sender: data.sender || "Unknown",
            action: data.action
          });

          clients.forEach(client => {
            if (client !== ws && client.readyState === 1) {
              client.send(relayPayload);
            }
          });
          break;
        }

        case "ping": break; // keep-alive, ignore
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
        const playerNames = [];
        clients.forEach(client => {
          const m = socketMetadata.get(client);
          if (m && !m.name.startsWith("__")) playerNames.push(m.name);
        });

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
