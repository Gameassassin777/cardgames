# 🛶 Lake House Card Games

A cozy, lake-house themed **Progressive Web App** of party card games — installable,
works fully offline, and built with zero dependencies (plain HTML/CSS/ES modules).

## Games

- **🐒 Cards Against Monkeys** *(18+)* — a chronically-online, brain-rot party game in the
  *Cards Against Humanity* style. One player is the **Card Czar** each round; everyone else
  fills in the blank from their hand, and the Czar crowns the funniest answer. Local
  **pass-and-play** for 3–12 players, with secret-hand handoff screens, score tracking,
  Pick-1 / Pick-2 prompts, and a configurable score-to-win. **38 prompts + 168 response cards.**
  Games auto-save and can be resumed.
- **🚨 Emergency Meeting** — a secret-ballot voting game. Each round the group gets a
  *"who's most likely to…"* prompt; everyone votes by passing the device around, the
  most-voted crewmate is **ejected**, and a running *sus-o-meter* crowns the Sussiest Baka.
- **🤔 Would You Rather (Unhinged)** — impossible, chronically-online dilemmas to argue over.
- **🚩 Red Flag / Green Flag** — judge the most cursed personality traits and shout the verdict.
- **🛶 Lake House Truths** — a relaxed draw-a-card deck of would-you-rather, truth, dare,
  never-have-I-ever and most-likely-to prompts for around the firepit.

## Updates

The app **auto-updates**: a service worker caches everything for offline play, and whenever a
new version is deployed the client picks it up and silently reloads on the next launch. To ship
an update, bump the version in **both** `js/version.js` and the `CACHE` constant in `sw.js`
(keep them matched) — the visible version is shown in the home-screen footer.

## Run locally

It's a static site — serve the folder over HTTP (a service worker is required for offline,
which doesn't run from `file://`):

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy

Any static host works. For **GitHub Pages**: enable Pages on this branch/repo with the root
folder as the source, then open the published URL on your phone and choose
*Add to Home Screen* to install it.

## Project layout

```
index.html              app shell
styles.css              lake-house theme
manifest.webmanifest    PWA manifest
sw.js                   service worker (offline cache)
js/app.js               home menu + routing + PWA + auto-update wiring
js/version.js           app version (bump on deploy)
js/cam.js               Cards Against Monkeys game
js/meeting.js           Emergency Meeting (voting game)
js/deckgame.js          generic draw-a-card engine (WYR, Red/Green, Truths)
js/data.js              all card content
js/ui.js                shared DOM/util helpers
icons/                  app icons (SVG + generated PNGs)
```

> Cards Against Monkeys contains adult, internet-meme humor. It's meant for grown-up friend
> groups who are in on the joke.
