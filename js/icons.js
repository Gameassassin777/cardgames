// Premium SVG Outline Icons for Lake House Card Games.
// Strictly no emojis. Custom high-detail vectors with harmonious styling.

const SVG_ATTRS = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2",
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
  style: "width: 100%; height: 100%; display: block;"
};

function createSvg(paths, extraStyle = "") {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  for (const [k, v] of Object.entries(SVG_ATTRS)) {
    svg.setAttribute(k, v);
  }
  if (extraStyle) {
    svg.style.cssText += ";" + extraStyle;
  }
  [].concat(paths).forEach(pDef => {
    const el = document.createElementNS("http://www.w3.org/2000/svg", pDef.tag || "path");
    for (const [k, v] of Object.entries(pDef)) {
      if (k !== "tag") el.setAttribute(k, v);
    }
    svg.appendChild(el);
  });
  return svg;
}

export const icons = {
  family: () => createSvg([
    { tag: "path", d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" },
    { tag: "circle", cx: "9", cy: "7", r: "4" },
    { tag: "path", d: "M23 21v-2a4 4 0 0 0-3-3.87" },
    { tag: "path", d: "M16 3.13a4 4 0 0 1 0 7.75" }
  ]),

  monkeys: () => createSvg([
    { tag: "circle", cx: "12", cy: "12", r: "10" },
    { tag: "path", d: "M8 14s1.5 2 4 2 4-2 4-2" },
    { tag: "line", x1: "9", y1: "9", x2: "9.01", y2: "9" },
    { tag: "line", x1: "15", y1: "9", x2: "15.01", y2: "9" },
    { tag: "path", d: "M8 5c-1.5 1-2 2.5-2 4 0 2 1.5 3 3 2.5" },
    { tag: "path", d: "M16 5c1.5 1 2 2.5 2 4 0 2-1.5 3-3 2.5" }
  ]),

  cabin: () => createSvg([
    { tag: "path", d: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" },
    { tag: "polyline", points: "9 22 9 12 15 12 15 22" }
  ]),

  meeting: () => createSvg([
    { tag: "path", d: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" },
    { tag: "line", x1: "12", y1: "9", x2: "12", y2: "13" },
    { tag: "line", x1: "12", y1: "17", x2: "12.01", y2: "17" }
  ]),

  rizz: () => createSvg([
    { tag: "path", d: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" },
    { tag: "path", d: "M8 11.5c.5-1 1.5-1.5 2.5-1.5s2 .5 2.5 1.5M13.5 13.5s1 1.5 2.5 1.5 2.5-1.5 2.5-1.5" },
    { tag: "path", d: "M11.5 8.5c1-1 2.5-1 3.5 0" }
  ]),

  wyr: () => createSvg([
    { tag: "polyline", points: "17 11 21 7 17 3" },
    { tag: "path", d: "M21 7H9a4 4 0 0 0-4 4v10" },
    { tag: "polyline", points: "7 13 3 17 7 21" },
    { tag: "path", d: "M3 17h12a4 4 0 0 0 4-4V3" }
  ]),

  flags: () => createSvg([
    { tag: "path", d: "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" },
    { tag: "line", x1: "4", y1: "22", x2: "4", y2: "15" }
  ]),

  truths: () => createSvg([
    { tag: "path", d: "M5 20c0-5 3-9 7-9s7 4 7 9" },
    { tag: "path", d: "M9 20c0-3 1.5-5.5 3-5.5s3 2.5 3 5.5" },
    { tag: "line", x1: "4", y1: "21", x2: "20", y2: "21" },
    { tag: "line", x1: "6", y1: "18", x2: "18", y2: "22" },
    { tag: "line", x1: "18", y1: "18", x2: "6", y2: "22" }
  ]),

  sibling: () => createSvg([
    { tag: "rect", x: "3", y: "3", width: "18", height: "18", rx: "2" },
    { tag: "path", d: "m21 3-9 9" },
    { tag: "path", d: "m12 21 9-9" },
    { tag: "path", d: "m3 12 9-9" },
    { tag: "path", d: "m12 12-9 9" }
  ]),

  roasts: () => createSvg([
    { tag: "path", d: "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" }
  ]),

  catchphrase: () => createSvg([
    { tag: "path", d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" },
    { tag: "line", x1: "8", y1: "9", x2: "16", y2: "9" },
    { tag: "line", x1: "8", y1: "13", x2: "12", y2: "13" }
  ]),

  doodles: () => createSvg([
    { tag: "path", d: "M12 22C17.5228 22 22 17.5228 22 12C22 11.5 21 10.5 20 10.5C19 10.5 18 11.5 17 11.5C16 11.5 15.5 10.5 15.5 9.5C15.5 8.5 16.5 8 16.5 7C16.5 6 15.5 5 14.5 5C13.5 5 13 4 13 3C13 2 12 2 11.5 2C6.02282 2 1.6 6.02282 1.6 11.5C1.6 17.0228 6.02282 22 12 22Z" },
    { tag: "circle", cx: "7.5", cy: "10.5", r: "1.5", fill: "currentColor" },
    { tag: "circle", cx: "11.5", cy: "7.5", r: "1.5", fill: "currentColor" },
    { tag: "circle", cx: "7.5", cy: "15.5", r: "1.5", fill: "currentColor" },
    { tag: "circle", cx: "13.5", cy: "15.5", r: "1.5", fill: "currentColor" }
  ]),

  settings: () => createSvg([
    { tag: "circle", cx: "12", cy: "12", r: "3" },
    { tag: "path", d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" }
  ]),

  gallery: () => createSvg([
    { tag: "rect", x: "3", y: "3", width: "18", height: "18", rx: "2", ry: "2" },
    { tag: "circle", cx: "8.5", cy: "8.5", r: "1.5" },
    { tag: "polyline", points: "21 15 16 10 5 21" }
  ]),

  back: () => createSvg([
    { tag: "polyline", points: "15 18 9 12 15 6" }
  ]),

  spectator: () => createSvg([
    { tag: "path", d: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" },
    { tag: "circle", cx: "12", cy: "12", r: "3" }
  ]),

  search: () => createSvg([
    { tag: "circle", cx: "11", cy: "11", r: "8" },
    { tag: "line", x1: "21", y1: "21", x2: "16.65", y2: "16.65" }
  ]),

  private: () => createSvg([
    { tag: "rect", x: "3", y: "11", width: "18", height: "11", rx: "2", ry: "2" },
    { tag: "path", d: "M7 11V7a5 5 0 0 1 10 0v4" }
  ]),

  public: () => createSvg([
    { tag: "circle", cx: "12", cy: "12", r: "10" },
    { tag: "path", d: "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" },
    { tag: "path", d: "M2 12h20" }
  ]),

  speak: () => createSvg([
    { tag: "polygon", points: "11 5 6 9 2 9 2 15 6 15 11 19 11 5" },
    { tag: "path", d: "M19.07 4.93a10 10 0 0 1 0 14.14" },
    { tag: "path", d: "M15.54 8.46a5 5 0 0 1 0 7.07" }
  ]),

  trash: () => createSvg([
    { tag: "polyline", points: "3 6 5 6 21 6" },
    { tag: "path", d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" },
    { tag: "line", x1: "10", y1: "11", x2: "10", y2: "17" },
    { tag: "line", x1: "14", y1: "11", x2: "14", y2: "17" }
  ]),

  warning: () => createSvg([
    { tag: "path", d: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" },
    { tag: "line", x1: "12", y1: "9", x2: "12", y2: "13" },
    { tag: "line", x1: "12", y1: "17", x2: "12.01", y2: "17" }
  ]),

  eye: () => createSvg([
    { tag: "path", d: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" },
    { tag: "circle", cx: "12", cy: "12", r: "3" }
  ]),

  eyeOff: () => createSvg([
    { tag: "path", d: "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" },
    { tag: "line", x1: "1", y1: "1", x2: "23", y2: "23" }
  ]),

  play: () => createSvg([
    { tag: "polygon", points: "5 3 19 12 5 21 5 3" }
  ]),

  chevronRight: () => createSvg([
    { tag: "polyline", points: "9 18 15 12 9 6" }
  ]),

  timer: () => createSvg([
    { tag: "circle", cx: "12", cy: "12", r: "10" },
    { tag: "polyline", points: "12 6 12 12 16 14" }
  ]),

  shield: () => createSvg([
    { tag: "path", d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" }
  ]),

  pen: () => createSvg([
    { tag: "path", d: "M12 20h9" },
    { tag: "path", d: "M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" }
  ]),

  chat: () => createSvg([
    { tag: "path", d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" }
  ]),

  lock: () => createSvg([
    { tag: "rect", x: "3", y: "11", width: "18", height: "11", rx: "2", ry: "2" },
    { tag: "path", d: "M7 11V7a5 5 0 0 1 10 0v4" }
  ]),

  unlock: () => createSvg([
    { tag: "rect", x: "3", y: "11", width: "18", height: "11", rx: "2", ry: "2" },
    { tag: "path", d: "M7 11V7a5 5 0 0 1 9.9-1" }
  ]),

  duck: () => createSvg([
    { tag: "path", d: "M15 10a4 4 0 0 0 4-4V5a3 3 0 0 0-6 0v1a4 4 0 0 1-4 4H7a5 5 0 0 0-5 5v1a5 5 0 0 0 7 5h10a5 5 0 0 0 5-5v-1a5 5 0 0 0-5-5h-2z" }
  ]),

  moon: () => createSvg([
    { tag: "path", d: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" }
  ]),

  canoe: () => createSvg([
    { tag: "path", d: "M2 12c4-2 8-2 10 0s6 2 10 0c-2 4-6 6-10 6s-8-2-10-6z" },
    { tag: "line", x1: "12", y1: "8", x2: "12", y2: "16" }
  ]),

  boxing: () => createSvg([
    { tag: "path", d: "M18 11V6a4 4 0 0 0-8 0v1H8a4 4 0 0 0-4 4v5a6 6 0 0 0 6 6h4a6 6 0 0 0 6-6v-5z" },
    { tag: "path", d: "M6 14h12" }
  ]),

  fire: () => createSvg([
    { tag: "path", d: "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" }
  ]),

  sparkles: () => createSvg([
    { tag: "path", d: "M12 3v4M12 17v4M3 12h4M17 12h4M5.5 5.5l3 3M15.5 15.5l3 3M5.5 15.5l3-3M15.5 5.5l3-3" }
  ]),

  plus: () => createSvg([
    { tag: "line", x1: "12", y1: "5", x2: "12", y2: "19" },
    { tag: "line", x1: "5", y1: "12", x2: "19", y2: "12" }
  ]),

  cross: () => createSvg([
    { tag: "line", x1: "18", y1: "6", x2: "6", y2: "18" },
    { tag: "line", x1: "6", y1: "6", x2: "18", y2: "18" }
  ]),

  refresh: () => createSvg([
    { tag: "path", d: "M23 4v6h-6" },
    { tag: "path", d: "M20.49 15a9 9 0 1 1-2.12-9.36L23 10" }
  ]),

  star: () => createSvg([
    { tag: "polygon", points: "12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" }
  ]),

  checked: () => createSvg([
    { tag: "polyline", points: "20 6 9 17 4 12" }
  ]),

  dice: () => createSvg([
    { tag: "rect", x: "4", y: "4", width: "16", height: "16", rx: "3", ry: "3" },
    { tag: "circle", cx: "8", cy: "8", r: "1.5", fill: "currentColor" },
    { tag: "circle", cx: "16", cy: "16", r: "1.5", fill: "currentColor" },
    { tag: "circle", cx: "12", cy: "12", r: "1.5", fill: "currentColor" },
    { tag: "circle", cx: "8", cy: "16", r: "1.5", fill: "currentColor" },
    { tag: "circle", cx: "16", cy: "8", r: "1.5", fill: "currentColor" }
  ])
};
