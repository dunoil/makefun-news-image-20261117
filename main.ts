// THE WORLD IN ONE IMAGE — Tuesday 17 November 2026
// A program that draws a one-page newspaper of the day's world news, pixel by
// pixel, with the Node standard library only (no network, no dependencies).
// It writes a 1024x1024 PNG to $MAKEFUN_OUTPUT_DIR/entry.png (or /output).
//
// Every picture element is drawn in code: masthead rules, story panels,
// icons (summit circles, tanker, bridge, globe, aid truck, virus, chip),
// a 5x7 bitmap typeface, and a hand-rolled PNG encoder (zlib + CRC32).

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- palette
const PAPER: RGB = [247, 243, 233];
const INK: RGB = [18, 28, 40];
const RED: RGB = [178, 34, 44];
const BLUE: RGB = [26, 72, 130];
const GOLD: RGB = [198, 142, 32];
const TEAL: RGB = [16, 110, 104];
const GREEN: RGB = [46, 116, 62];
const GREY: RGB = [96, 104, 112];
const WHITE: RGB = [255, 255, 255];
const CREAM: RGB = [255, 251, 240];
const SKY: RGB = [196, 220, 238];
const SEA: RGB = [64, 120, 168];

type RGB = [number, number, number];

const fb = new Uint8Array(W * H * 3);

function px(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  fb[i] = c[0]; fb[i + 1] = c[1]; fb[i + 2] = c[2];
}

function rect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) px(i, j, c);
}

function frame(x: number, y: number, w: number, h: number, t: number, c: RGB): void {
  rect(x, y, w, t, c); rect(x, y + h - t, w, t, c);
  rect(x, y, t, h, c); rect(x + w - t, y, t, h, c);
}

function circle(cx: number, cy: number, r: number, c: RGB): void {
  for (let j = cy - r; j <= cy + r; j++) {
    for (let i = cx - r; i <= cx + r; i++) {
      const dx = i - cx, dy = j - cy;
      if (dx * dx + dy * dy <= r * r) px(i, j, c);
    }
  }
}

function ring(cx: number, cy: number, r: number, t: number, c: RGB): void {
  for (let j = cy - r; j <= cy + r; j++) {
    for (let i = cx - r; i <= cx + r; i++) {
      const d2 = (i - cx) * (i - cx) + (j - cy) * (j - cy);
      if (d2 <= r * r && d2 >= (r - t) * (r - t)) px(i, j, c);
    }
  }
}

function line(x0: number, y0: number, x1: number, y1: number, t: number, c: RGB): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let s = 0; s <= steps; s++) {
    const x = Math.round(x0 + ((x1 - x0) * s) / steps);
    const y = Math.round(y0 + ((y1 - y0) * s) / steps);
    const r = Math.floor(t / 2);
    for (let j = y - r; j <= y + r; j++) for (let i = x - r; i <= x + r; i++) px(i, j, c);
  }
}

function tri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: RGB): void {
  const minX = Math.min(x0, x1, x2), maxX = Math.max(x0, x1, x2);
  const minY = Math.min(y0, y1, y2), maxY = Math.max(y0, y1, y2);
  const d = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
  if (d === 0) return;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const a = ((y1 - y2) * (x - x2) + (x2 - x1) * (y - y2)) / d;
      const b = ((y2 - y0) * (x - x2) + (x0 - x2) * (y - y2)) / d;
      const g = 1 - a - b;
      if (a >= 0 && b >= 0 && g >= 0) px(x, y, c);
    }
  }
}

function star(cx: number, cy: number, r: number, c: RGB): void {
  // five-point star as ten triangles from the centre
  const pts: Array<[number, number]> = [];
  for (let k = 0; k < 10; k++) {
    const ang = -Math.PI / 2 + (k * Math.PI) / 5;
    const rad = k % 2 === 0 ? r : Math.floor(r * 0.45);
    pts.push([Math.round(cx + rad * Math.cos(ang)), Math.round(cy + rad * Math.sin(ang))]);
  }
  for (let k = 0; k < 10; k++) {
    const [ax, ay] = pts[k];
    const [bx, by] = pts[(k + 1) % 10];
    tri(cx, cy, ax, ay, bx, by, c);
  }
}

// ---------------------------------------------------------------- typeface
// A 5x7 bitmap font. Each glyph is seven rows of five bits, '#' = ink.
const GLYPHS: Record<string, string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.####', '#....', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  J: ['..###', '....#', '....#', '....#', '....#', '#...#', '.###.'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '.#.#.', '..#..', '..#..', '..#..', '.#.#.', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '0': ['.###.', '#..##', '#.#.#', '##..#', '#...#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '#.#..', '..#..', '..#..', '..#..', '#####'],
  '2': ['.###.', '#...#', '....#', '..##.', '.#...', '#....', '#####'],
  '3': ['#####', '...#.', '..#..', '...#.', '....#', '#...#', '.###.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.##..', '.##..', '.#...'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  ';': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.#...'],
  "'": ['..#..', '..#..', '.#...', '.....', '.....', '.....', '.....'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  '(': ['...##', '..#..', '.#...', '.#...', '.#...', '..#..', '...##'],
  ')': ['##...', '..#..', '...#.', '...#.', '...#.', '..#..', '##...'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '$': ['..#..', '.####', '#.#..', '.###.', '..#.#', '####.', '..#..'],
  '&': ['.##..', '#..#.', '#.#..', '.#...', '#.#.#', '#..#.', '.##.#'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '..##.', '..#..', '.....', '..#..'],
  '%': ['##..#', '##.#.', '....#', '...#.', '..#..', '.#...', '#..##'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
};

function textWidth(s: string, scale: number): number {
  return s.length === 0 ? 0 : s.length * 6 * scale - scale;
}

function drawText(s: string, x: number, y: number, scale: number, c: RGB, bold = false): void {
  let cx = x;
  for (const raw of s.toUpperCase()) {
    const g = GLYPHS[raw] ?? GLYPHS[' '];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (g[row][col] !== '#') continue;
        rect(cx + col * scale, y + row * scale, scale, scale, c);
        if (bold) rect(cx + col * scale + Math.max(1, scale - 1), y + row * scale, scale, scale, c);
      }
    }
    cx += 6 * scale;
  }
}

function drawCentered(s: string, y: number, scale: number, c: RGB, bold = false): void {
  drawText(s, Math.round((W - textWidth(s, scale)) / 2), y, scale, c, bold);
}

function drawRight(s: string, rightX: number, y: number, scale: number, c: RGB, bold = false): void {
  drawText(s, rightX - textWidth(s, scale), y, scale, c, bold);
}

// Greedy word wrap: returns lines no wider than maxChars characters.
function wrap(s: string, maxChars: number): string[] {
  const words = s.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur === '') cur = w;
    else if ((cur + ' ' + w).length <= maxChars) cur += ' ' + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur !== '') lines.push(cur);
  return lines;
}

function drawWrapped(s: string, x: number, y: number, scale: number, maxChars: number, c: RGB, lineGap = 4): number {
  const lines = wrap(s, maxChars);
  lines.forEach((ln, i) => drawText(ln, x, y + i * (7 * scale + lineGap), scale, c));
  return y + lines.length * (7 * scale + lineGap);
}

function bullet(cx: number, cy: number, r: number, c: RGB): void {
  rect(cx - r, cy - r, r * 2, r * 2, c);
}

// ---------------------------------------------------------------- icons
// All icons are drawn inside a box whose top-left corner is (x, y).

function iconSummit(x: number, y: number): void {
  // Three overlapping circles for three leaders, stars for accord.
  circle(x + 34, y + 40, 30, RED);
  circle(x + 86, y + 40, 30, BLUE);
  circle(x + 60, y + 76, 30, GOLD);
  star(x + 34, y + 40, 11, WHITE);
  star(x + 86, y + 40, 11, WHITE);
  star(x + 60, y + 76, 11, INK);
}

function iconTanker(x: number, y: number): void {
  // A tanker on waves, one container stack aflame.
  rect(x + 8, y + 62, 104, 10, INK); // hull deck line
  tri(x + 8, y + 72, x + 112, y + 72, x + 96, y + 90, INK); // hull
  tri(x + 8, y + 72, x + 24, y + 90, x + 8, y + 90, INK);
  rect(x + 20, y + 44, 22, 18, RED);
  rect(x + 46, y + 44, 22, 18, BLUE);
  rect(x + 72, y + 44, 22, 18, TEAL);
  rect(x + 94, y + 30, 10, 32, GREY); // bridge tower
  // flame over the middle stack
  tri(x + 57, y + 12, x + 46, y + 44, x + 68, y + 44, GOLD);
  tri(x + 57, y + 24, x + 50, y + 44, x + 64, y + 44, RED);
  // waves
  for (let i = 0; i < 4; i++) {
    const wx = x + 6 + i * 28;
    for (let k = 0; k < 12; k++) px(wx + k, y + 98 + Math.round(3 * Math.sin(k / 2)), SEA);
    for (let k = 0; k < 12; k++) px(wx + k, y + 99 + Math.round(3 * Math.sin(k / 2)), SEA);
    for (let k = 0; k < 12; k++) px(wx + k, y + 100 + Math.round(3 * Math.sin(k / 2)), SEA);
  }
}

function iconBridge(x: number, y: number): void {
  // A river bridge, a missile coming down, a burst where it lands.
  rect(x, y + 84, 120, 8, INK); // deck
  rect(x + 14, y + 52, 8, 32, INK); // pylons
  rect(x + 98, y + 52, 8, 32, INK);
  line(x + 18, y + 52, x + 60, y + 78, 3, INK); // cables
  line(x + 102, y + 52, x + 60, y + 78, 3, INK);
  rect(x, y + 96, 120, 6, SEA); // river
  line(x + 96, y + 6, x + 66, y + 44, 5, RED); // missile trail
  tri(x + 66, y + 44, x + 76, y + 40, x + 70, y + 54, RED);
  star(x + 44, y + 60, 13, GOLD); // burst
  star(x + 44, y + 60, 6, RED);
}

function iconGlobe(x: number, y: number): void {
  // Globe with meridians, a leaf for the climate talks.
  circle(x + 56, y + 52, 46, SKY);
  ring(x + 56, y + 52, 46, 4, BLUE);
  line(x + 10, y + 52, x + 102, y + 52, 3, BLUE);
  line(x + 56, y + 6, x + 56, y + 98, 3, BLUE);
  for (const s of [-1, 1]) {
    for (let a = 0; a <= 40; a++) {
      const yy = y + 52 - 40 + a * 2;
      const xx = x + 56 + s * Math.round(20 * Math.sin((a / 40) * Math.PI));
      px(xx, yy, BLUE); px(xx + 1, yy, BLUE);
    }
  }
  // leaf: a round blade with a pointed tip and a pale vein
  circle(x + 90, y + 88, 13, GREEN);
  tri(x + 79, y + 80, x + 101, y + 80, x + 90, y + 62, GREEN);
  line(x + 83, y + 95, x + 97, y + 74, 3, CREAM);
}

function iconAidTruck(x: number, y: number): void {
  // An aid truck with a red cross, under a sun.
  circle(x + 98, y + 18, 13, GOLD);
  rect(x + 6, y + 34, 62, 44, WHITE);
  frame(x + 6, y + 34, 62, 44, 4, INK);
  rect(x + 30, y + 44, 14, 24, RED); // cross
  rect(x + 25, y + 49, 24, 14, RED);
  rect(x + 68, y + 48, 26, 30, BLUE); // cab
  tri(x + 94, y + 48, x + 108, y + 62, x + 94, y + 62, BLUE);
  rect(x + 6, y + 78, 102, 6, INK); // road line
  circle(x + 26, y + 88, 10, INK);
  circle(x + 26, y + 88, 4, GREY);
  circle(x + 84, y + 88, 10, INK);
  circle(x + 84, y + 88, 4, GREY);
}

function iconVirus(x: number, y: number): void {
  // A measles virus: spiked ball, with a syringe beside it.
  for (let k = 0; k < 12; k++) {
    const ang = (k * Math.PI) / 6;
    const x1 = x + 48 + Math.round(30 * Math.cos(ang));
    const y1 = y + 52 + Math.round(30 * Math.sin(ang));
    const x2 = x + 48 + Math.round(44 * Math.cos(ang));
    const y2 = y + 52 + Math.round(44 * Math.sin(ang));
    line(x1, y1, x2, y2, 4, RED);
    circle(x2, y2, 5, RED);
  }
  circle(x + 48, y + 52, 30, RED);
  circle(x + 38, y + 42, 6, CREAM);
  circle(x + 58, y + 58, 5, CREAM);
  circle(x + 44, y + 66, 4, CREAM);
  // syringe
  line(x + 92, y + 22, x + 108, y + 38, 5, BLUE);
  rect(x + 100, y + 30, 16, 10, BLUE);
  line(x + 112, y + 44, x + 118, y + 58, 3, GREY);
}

function iconChip(x: number, y: number): void {
  // A microchip with pins and circuit traces.
  rect(x + 28, y + 24, 64, 64, INK);
  rect(x + 42, y + 38, 36, 36, GOLD);
  drawText('AI', x + 48, y + 49, 3, INK, true);
  for (let i = 0; i < 4; i++) {
    const p = y + 30 + i * 16;
    rect(x + 10, p, 18, 5, GREY);
    rect(x + 92, p, 18, 5, GREY);
    const q = x + 34 + i * 16;
    rect(q, y + 6, 5, 18, GREY);
    rect(q, y + 88, 5, 18, GREY);
  }
  line(x + 10, y + 100, x + 40, y + 100, 3, TEAL);
  circle(x + 46, y + 100, 4, TEAL);
  line(x + 110, y + 12, x + 84, y + 12, 3, TEAL);
  circle(x + 78, y + 12, 4, TEAL);
}

// ---------------------------------------------------------------- layout
rect(0, 0, W, H, PAPER);
frame(10, 10, W - 20, H - 20, 4, INK);

// Masthead
drawCentered('THE WORLD IN ONE IMAGE', 30, 3, RED, true);
drawCentered('TUESDAY 17 NOVEMBER 2026', 64, 6, INK, true);
drawCentered("THE DAY'S BIG STORIES - ALL ON ONE PAGE", 118, 3, GREY);
rect(28, 150, W - 56, 5, INK);
rect(28, 159, W - 56, 2, INK);

// Lead story: the first Xi-Trump-Putin trilateral summit
rect(28, 172, W - 56, 196, CREAM);
frame(28, 172, W - 56, 196, 3, RED);
drawText('DIPLOMACY - SHENZHEN, CHINA', 48, 188, 3, RED, true);
drawRight('APEC SUMMIT', W - 48, 188, 3, INK, true);
drawText('XI, TRUMP & PUTIN TO MEET', 48, 222, 5, INK, true);
drawText('IN FIRST TRILATERAL SUMMIT', 48, 268, 5, INK, true);
iconSummit(856, 236);
drawWrapped(
  'CHINA CONFIRMS THE THREE LEADERS MEET THURSDAY AT THE APEC SUMMIT IN SHENZHEN.',
  48, 316, 3, 43, INK,
);

// Story panels, two to a row
interface Panel {
  kicker: string;
  color: RGB;
  head1: string;
  head2: string;
  body: string;
  icon: (x: number, y: number) => void;
}

const panels: Panel[] = [
  {
    kicker: 'WAR AT SEA - DAY 264 OF US-IRAN WAR', color: RED,
    head1: 'TANKERS BURN', head2: 'IN HORMUZ',
    body: 'US JETS STRIKE IRGC SITE. SHIPS HIT MINES.',
    icon: iconTanker,
  },
  {
    kicker: 'EUROPE - THE WAR IN UKRAINE', color: BLUE,
    head1: 'KYIV POUNDED,', head2: 'BRIDGE SHUT',
    body: 'KYIV HEAT CUT BY MISSILES. CRIMEAN BRIDGE SHUT.',
    icon: iconBridge,
  },
  {
    kicker: 'CLIMATE - COP31 TALKS, ANTALYA', color: TEAL,
    head1: 'PHASE OUT', head2: 'FOSSIL FUELS',
    body: 'DRAFT: $120BN A YEAR ADAPTATION BY 2035.',
    icon: iconGlobe,
  },
  {
    kicker: 'MIDDLE EAST - THE GAZA AID APPEAL', color: GOLD,
    head1: 'OPEN GAZA', head2: 'CROSSINGS NOW',
    body: 'UK + ALLIES CALL AID CRISIS CATASTROPHIC.',
    icon: iconAidTruck,
  },
  {
    kicker: 'HEALTH - THE AMERICAS', color: RED,
    head1: 'MEASLES-FREE', head2: 'STATUS LOST',
    body: 'PAHO: ENDEMIC AGAIN. 5,412 CASES IN 2026.',
    icon: iconVirus,
  },
  {
    kicker: 'TECH + MARKETS - NEW US RULES', color: BLUE,
    head1: 'AI CHIP CURBS', head2: 'HIT CHINA',
    body: 'NEW EXPORT RULES. NVIDIA EARNS TONIGHT.',
    icon: iconChip,
  },
];

const ROW_Y = [380, 560, 740];
const COL_X = [28, 522];
const PANEL_W = 474;
const PANEL_H = 172;

panels.forEach((p, i) => {
  const x = COL_X[i % 2];
  const y = ROW_Y[Math.floor(i / 2)];
  rect(x, y, PANEL_W, PANEL_H, WHITE);
  frame(x, y, PANEL_W, PANEL_H, 3, p.color);
  drawText(p.kicker, x + 14, y + 12, 2, p.color, true);
  p.icon(x + 12, y + 38);
  drawText(p.head1, x + 144, y + 36, 4, INK, true);
  drawText(p.head2, x + 144, y + 67, 4, INK, true);
  drawWrapped(p.body, x + 144, y + 100, 3, 17, INK, 2);
});

// Ticker band: one more story, in white on ink
rect(28, 920, W - 56, 50, INK);
drawCentered('ALSO TODAY - DEPARDIEU PLEADS GUILTY IN PARIS', 934, 3, CREAM);

// Footer: two more stories, small print
drawCentered('JAPAN SCRAMBLES JETS AS RUSSIAN PLANES ENTER ITS AIRSPACE', 978, 2, GREY);
drawCentered('SPORT - INDIA EDGE PAKISTAN BY 1 WICKET TO WIN THE U19 ASIA CUP FINAL', 994, 2, GREY);

// ---------------------------------------------------------------- PNG out
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  const crcData = new Uint8Array(4 + data.length);
  crcData.set(out.subarray(4, 8), 0);
  crcData.set(data, 4);
  view.setUint32(8 + data.length, crc32(crcData));
  return out;
}

function encodePNG(): Uint8Array {
  const raw = new Uint8Array((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 3 + 1)] = 0; // filter: none
    raw.set(fb.subarray(y * W * 3, (y + 1) * W * 3), y * (W * 3 + 1) + 1);
  }
  const ihdr = new Uint8Array(13);
  const v = new DataView(ihdr.buffer);
  v.setUint32(0, W);
  v.setUint32(4, H);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB
  const parts = [
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', new Uint8Array(0)),
  ];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const png = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { png.set(p, off); off += p.length; }
  return png;
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
const png = encodePNG();
writeFileSync(join(outDir, 'entry.png'), png);
console.log(`wrote entry.png: ${W}x${H}, ${png.length} bytes`);
