# 🛶 Lake House Card Games

A cozy, lake-house themed **Progressive Web App** of party card games — installable,
works fully offline, and built with zero dependencies (plain HTML/CSS/ES modules).

## Games

- **🐒 Cards Against Monkeys** *(18+)* — a chronically-online, brain-rot party game in the
  *Cards Against Humanity* style. One player is the **Card Czar** each round; everyone else
  fills in the blank from their hand, and the Czar crowns the funniest answer. Local
  **pass-and-play** for 3–12 players, with secret-hand handoff screens, score tracking,
  Pick-1 / Pick-2 prompts, and a configurable score-to-win. Games auto-save and can be resumed.
- **🛶 Lake House Truths** — a relaxed draw-a-card deck of would-you-rather, truth, dare,
  never-have-I-ever and most-likely-to prompts for around the firepit.

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
js/app.js               home menu + routing + PWA wiring
js/cam.js               Cards Against Monkeys game
js/truths.js            Lake House Truths game
js/data.js              all card content
js/ui.js                shared DOM/util helpers
icons/                  app icons (SVG + generated PNGs)
```

> Cards Against Monkeys contains adult, internet-meme humor. It's meant for grown-up friend
> groups who are in on the joke.
