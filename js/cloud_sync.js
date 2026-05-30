// Permanent cloud sync for custom cards and prompts across all devices.
// Every device pushes when it adds cards, and pulls on startup to merge others' additions.
// Uses the Cloudflare Worker HTTP API (/sync/push, /sync/pull-all).
import { HTTP_BASE } from "./ui.js";
// Master game map — id must match what the worker stores under, saveKey is localStorage namespace.
const GAME_MAP = [
  { id: "family",      saveKey: "family.game.v1",      hasPrompts: true  },
  { id: "roasts",      saveKey: "roasts.game.v1",      hasPrompts: false },
  { id: "cam",         saveKey: "cam.game.v1",         hasPrompts: true  },
  { id: "cabin",       saveKey: "cabin.game.v1",       hasPrompts: true  },
  { id: "rizz",        saveKey: "rizz.game.v1",        hasPrompts: false },
  { id: "wyr",         saveKey: "wyr.game.v1",         hasPrompts: false },
  { id: "flags",       saveKey: "flags.game.v1",       hasPrompts: false },
  { id: "truths",      saveKey: "truths.game.v1",      hasPrompts: false },
  { id: "catchphrase", saveKey: "catchphrase.game.v1", hasPrompts: false },
];

/**
 * Pull all games' custom cards + prompts from the server and merge into localStorage.
 * Silently skips on network failure (offline). Call on app startup.
 */
export async function pullFromCloud() {
  try {
    const res = await fetch(`${HTTP_BASE}/sync/pull-all`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return;

    const allData = await res.json(); // { cam: { cards: [], prompts: [] }, ... }

    for (const { id, saveKey } of GAME_MAP) {
      const serverData = allData[id];
      if (!serverData) continue;

      // Merge response cards (plain strings)
      if (Array.isArray(serverData.cards) && serverData.cards.length > 0) {
        const key = saveKey + ".custom_cards";
        const local = JSON.parse(localStorage.getItem(key) || "[]");
        let changed = false;
        for (const c of serverData.cards) {
          if (typeof c === "string" && c.trim() && !local.includes(c)) {
            local.push(c);
            changed = true;
          }
        }
        if (changed) localStorage.setItem(key, JSON.stringify(local));
      }

      // Merge prompt cards (objects with .text and .pick)
      if (Array.isArray(serverData.prompts) && serverData.prompts.length > 0) {
        const key = saveKey + ".custom_prompts";
        const local = JSON.parse(localStorage.getItem(key) || "[]");
        const existingTexts = new Set(local.map(p => p && p.text));
        let changed = false;
        for (const p of serverData.prompts) {
          if (p && p.text && !existingTexts.has(p.text)) {
            local.push(p);
            existingTexts.add(p.text);
            changed = true;
          }
        }
        if (changed) localStorage.setItem(key, JSON.stringify(local));
      }
    }

    console.log("[CloudSync] ✓ Pulled latest custom cards from server.");
  } catch (e) {
    // Offline or network error — fail silently, local cards still work
    console.warn("[CloudSync] Pull skipped (offline?):", e.message);
  }
}

/**
 * Push custom cards and/or prompts for a specific game to the cloud.
 * Fire-and-forget — failures are silent so the UI never blocks.
 *
 * @param {string} gameId      - Game ID string (e.g. "cam", "cabin")
 * @param {string[]} cards     - Array of response card strings to push
 * @param {Object[]} prompts   - Array of prompt objects { text, pick } to push
 */
export async function pushToCloud(gameId, cards = [], prompts = []) {
  if (cards.length === 0 && prompts.length === 0) return;
  try {
    await fetch(`${HTTP_BASE}/sync/push`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game: gameId, cards, prompts }),
      signal: AbortSignal.timeout(8000),
    });
    console.log(`[CloudSync] ✓ Pushed ${cards.length} card(s), ${prompts.length} prompt(s) for "${gameId}".`);
  } catch (e) {
    console.warn("[CloudSync] Push skipped (offline?):", e.message);
  }
}
