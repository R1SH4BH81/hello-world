import {
  createRng,
  spring,
  easeOutCubic,
  cubicBezier,
  curveAt,
  jitter,
} from "./math";
import {
  generateVine,
  generateCurl,
  generateWeave,
  getLayerAt,
  WeaveSegment,
} from "./geometry";
import { FONT_FAMILY } from "../constants/garden";
import { FlowerType, resolveFlowerType } from "../constants/flowers";

export interface StemElement {
  t: "stem";
  id: number;
  pts: [number, number][];
  segs: WeaveSegment[];
  d0: number;
  dur: number;
  w?: number;
  thorns: { u: number; s: number }[];
}

export interface LeafElement {
  t: "leaf";
  id: number;
  x: number;
  y: number;
  a: number;
  L: number;
  bend: number;
  layer: number;
  d0: number;
}

export interface RoseElement {
  t: "rose";
  id: number;
  x: number;
  y: number;
  R: number;
  rot: number;
  ph1: number;
  ph2: number;
  turns: number;
  layer: number;
  d0: number;
  flowerType?: FlowerType;
}

export type BotanicalElement = StemElement | LeafElement | RoseElement;

export interface Letter {
  ch: string;
  id: number;
  birth?: number;
  tb?: number;
  ws?: number;
  wi?: number;
  prev?: Letter | null;
  dead?: number | null;
  cut?: number | null;
  cutRel?: number | null;
  x?: number;
  y?: number;
  tx?: number;
  ty?: number;
  tw?: number;
  line?: number;
  els?: BotanicalElement[];
  endEls?: BotanicalElement[] | null;
  tend?: StemElement[];
  lean?: [number, number];
  b?: number;
  d?: number;
  flowerType?: FlowerType;
}

export interface WordParameters {
  roseP: number;
  leafy: number;
  dens: number;
  lean: number;
  big: number;
  curvy: number;
  bridgeP: number;
  w: number;
  flowerType?: FlowerType;
}

export function createWordParameters(ws: number, density = 1, flowerType?: FlowerType): WordParameters {
  const r = createRng(ws * 7 + 13);
  const resolvedFlower = resolveFlowerType(flowerType, ws);
  return {
    roseP: 0.3 + r() * 0.3,
    leafy: (0.6 + r() * 0.8) * density,
    dens: density,
    lean: (r() - 0.5) * 0.6,
    big: 0.85 + r() * 0.45,
    curvy: 0.8 + r() * 0.6,
    bridgeP: Math.min(0.95, (0.45 + r() * 0.35) * density),
    w: 0.5,
    flowerType: resolvedFlower,
  };
}

export function growBotanicalBranch(
  r: () => number,
  E: BotanicalElement[],
  nid: () => number,
  p: WordParameters,
  o: any
): [number, number][] {
  const tip = o.tip || (r() < p.roseP ? "rose" : r() < 0.45 ? "fan" : r() < 0.6 ? "leaf" : "curl");
  let P = o.pts || generateVine(
    o.base,
    o.dir,
    o.len,
    (0.35 + r() * 0.45) * p.curvy,
    1 + r() * 1.6,
    r() * 6.28,
    (r() - 0.5) * 1.2,
    40
  );
  if (tip === "curl") P = generateCurl(P, r() < 0.5 ? -1 : 1, 0.05 + r() * 0.05);
  const segs = generateWeave(r, o.layer0 != null ? o.layer0 : (r() < 0.5 ? 0 : 1));
  const dur = Math.max(320, (o.len || 0.8) * 620);
  const thorns: { u: number; s: number }[] = [];
  const nt = Math.floor(r() * 2.5);
  for (let i = 0; i < nt; i++) thorns.push({ u: 0.15 + r() * 0.65, s: r() < 0.5 ? -1 : 1 });
  E.push({ t: "stem", id: nid(), pts: P, segs, d0: o.d0, dur, w: o.depth ? 0.82 : 1, thorns });

  const nl = Math.floor(r() * 2.8 * p.leafy);
  let sd = r() < 0.5 ? -1 : 1;
  for (let i = 0; i < nl; i++) {
    const u = 0.25 + r() * 0.6;
    const [q, a] = curveAt(P, u);
    sd = -sd;
    E.push({
      t: "leaf",
      id: nid(),
      x: q[0],
      y: q[1],
      a: a + sd * (0.55 + r() * 0.5),
      L: (0.14 + r() * 0.2) * (o.depth ? 0.8 : 1),
      bend: (r() - 0.5) * 1.2,
      layer: getLayerAt(segs, u),
      d0: o.d0 + dur * u,
    });
  }

  const [tp, ta] = curveAt(P, 1);
  const td = o.d0 + dur * 0.8;
  const tl = getLayerAt(segs, 1);
  if (tip === "rose") {
    const R = (0.13 + r() * 0.15) * p.big * (o.depth ? 0.75 : 1);
    const over = tp[1] > -0.78 && tp[1] < 0.05 && Math.abs(tp[0]) < p.w * 0.5;
    const layer = over ? (r() < 0.22 ? 1 : 0) : (r() < 0.6 ? 1 : tl);
    E.push({
      t: "rose",
      id: nid(),
      x: tp[0],
      y: tp[1],
      R,
      rot: (r() - 0.5) * 1.0,
      ph1: r() * 6.28,
      ph2: r() * 6.28,
      turns: 1.8 + r() * 1,
      layer,
      d0: td,
      flowerType: p.flowerType || "rose",
    });
    if (r() < 0.2) {
      const oo = ta + (r() < 0.5 ? 1 : -1) * 1.3;
      E.push({
        t: "rose",
        id: nid(),
        x: tp[0] + Math.cos(oo) * R * 1.4,
        y: tp[1] + Math.sin(oo) * R * 1.4,
        R: Math.max(R * 0.75, R * (0.6 + r() * 0.3)),
        rot: (r() - 0.5) * 1.2,
        ph1: r() * 6.28,
        ph2: r() * 6.28,
        turns: 1.8 + r(),
        layer,
        d0: td + 120,
        flowerType: p.flowerType || "rose",
      });
    }
  } else if (tip === "fan") {
    const spread = 0.6 + r() * 0.3;
    for (let j = 0; j < 2; j++) {
      E.push({
        t: "leaf",
        id: nid(),
        x: tp[0],
        y: tp[1],
        a: ta + (j - 0.5) * spread,
        L: 0.2 + r() * 0.2,
        bend: (j - 0.5) * 0.8,
        layer: tl,
        d0: td + j * 60,
      });
    }
  } else if (tip === "leaf") {
    E.push({
      t: "leaf",
      id: nid(),
      x: tp[0],
      y: tp[1],
      a: ta + (r() - 0.5) * 0.3,
      L: 0.16 + r() * 0.16,
      bend: r() - 0.5,
      layer: tl,
      d0: td,
    });
  }

  if (!o.depth && r() < 0.3) {
    const u = 0.35 + r() * 0.35;
    const [q, a] = curveAt(P, u);
    growBotanicalBranch(r, E, nid, p, {
      base: q,
      dir: a + (r() < 0.5 ? -1 : 1) * (0.7 + r() * 0.4),
      len: (o.len || 0.8) * (0.35 + r() * 0.2),
      d0: o.d0 + dur * u,
      depth: 1,
      layer0: getLayerAt(segs, u),
    });
  }
  return P;
}

export function makeTransform(
  cx: number,
  cy: number,
  R: number,
  rot: number,
  tl: [number, number] | null
) {
  const cr = Math.cos(rot),
    sr = Math.sin(rot);
  const tm = tl ? Math.hypot(tl[0], tl[1]) : 0;
  const ux = tm ? tl![0] / tm : 0,
    uy = tm ? tl![1] / tm : 0;
  const sq = -0.28 * tm;
  return (x: number, y: number, z = 0): [number, number] => {
    let dx = x * cr - y * sr,
      dy = x * sr + y * cr;
    if (tm) {
      const k = (dx * ux + dy * uy) * sq;
      dx += k * ux + tl![0] * R * z;
      dy += k * uy + tl![1] * R * z;
    }
    return [cx + dx, cy + dy];
  };
}

export function drawRosePetals(
  backend: any,
  cx: number,
  cy: number,
  R: number,
  rot: number,
  e: any,
  a: number,
  tl: [number, number] | null,
  palette: any
) {
  const transform = makeTransform(cx, cy, R, rot, tl);

  const PETALS = [
    [0, -0.36, 0.56, 0.54, 0, 0, 0],
    [-0.5, -0.06, 0.6, 0.6, -0.35, 0, 0],
    [0.52, -0.06, 0.6, 0.6, 0.35, 0, 0],
    [-0.42, 0.3, 0.62, 0.48, 0.2, 0.12, 1],
    [0.47, 0.3, 0.62, 0.48, -0.2, 0.12, 1],
    [0.05, 0.42, 0.56, 0.38, 0, 0.14, 0],
  ];
  const ax0 = 0, ay0 = 0.5, lw = Math.max(0.8, R * 0.045), st = 85;

  PETALS.forEach((q, i) => {
    const s = spring((a - i * st) / 1000, 8, 14);
    if (s <= 0.001) return;
    const open = (1 - Math.min(1, s)) * (q[0] < 0 ? 0.5 : -0.5);
    const ang = q[4] + open, ca = Math.cos(ang), sa = Math.sin(ang);
    const pt = (th: number): [number, number] => {
      const rr = 1 + 0.08 * Math.sin(3 * th + e.ph1 + i) + 0.04 * Math.sin(5 * th + e.ph2);
      const lx = Math.cos(th) * q[2] * rr, ly = Math.sin(th) * q[3] * rr;
      const px = q[0] + lx * ca - ly * sa, py = q[1] + lx * sa + ly * ca;
      return transform((ax0 + (px - ax0) * s) * R, (ay0 + (py - ay0) * s) * R, q[5]);
    };
    const pts: [number, number][] = [];
    for (let k = 0; k < 26; k++) pts.push(pt(k / 26 * Math.PI * 2));
    backend.fill(pts, palette.red);
    backend.stroke(pts, palette.line, Math.max(0.5, lw * 0.5));

    if (q[6] && R >= 12 && s > 0.4) {
      const arc: [number, number][] = [];
      for (let k = 0; k <= 14; k++) arc.push(pt(Math.PI * (1.18 + 0.64 * k / 14)));
      const count = arc.length - 1;
      const bIdx = Math.min(1, (s - 0.4) / 0.5) * count;
      const subPts = arc.slice(0, Math.max(2, Math.floor(bIdx) + 1));
      backend.stroke(subPts, palette.line, lw * 0.8);
    }
  });

  const fr = easeOutCubic((a - PETALS.length * st - 80) / 520);
  if (fr > 0 && R > 3) {
    const spPts: [number, number][] = [];
    const sclPts: [number, number][] = [];
    const turns = R < 20 ? Math.min(e.turns, 1.3) : R < 32 ? e.turns * 0.8 : e.turns;
    for (let i = 0; i <= 70; i++) {
      const u = i / 70, th = e.ph1 + u * turns * Math.PI * 2, rr = R * (0.08 + 0.57 * u);
      spPts.push(transform(Math.cos(th) * rr * 1.05, Math.sin(th) * rr * 0.72 - 0.12 * R, 0.34 - 0.24 * u));
    }
    const endI = Math.max(2, Math.floor(fr * (spPts.length - 1)) + 1);
    backend.stroke(spPts.slice(0, endI), palette.line, lw);

    if (R >= 14) {
      for (let i = 0; i <= 36; i++) {
        const u = i / 36;
        sclPts.push(transform((-0.72 + 1.5 * u) * R, 0.36 * R + 0.16 * R * Math.abs(Math.sin(u * Math.PI * 3)), 0.18));
      }
      const sclEnd = Math.max(2, Math.floor(fr * (sclPts.length - 1)) + 1);
      backend.stroke(sclPts.slice(0, sclEnd), palette.line, lw);
    }
  }
}

/**
 * Sakura / Cherry Blossom: 5 notched heart-shaped petals with delicate radiating stamens & pistils
 */
export function drawSakuraPetals(
  backend: any,
  cx: number,
  cy: number,
  R: number,
  rot: number,
  e: any,
  a: number,
  tl: [number, number] | null,
  palette: any
) {
  const transform = makeTransform(cx, cy, R, rot, tl);
  const lw = Math.max(0.8, R * 0.04);
  const numPetals = 5;

  for (let i = 0; i < numPetals; i++) {
    const s = spring((a - i * 65) / 850, 8, 14);
    if (s <= 0.001) continue;
    const baseAng = (i * Math.PI * 2) / numPetals;
    const ca = Math.cos(baseAng), sa = Math.sin(baseAng);

    const pts: [number, number][] = [];
    const steps = 24;
    for (let k = 0; k <= steps; k++) {
      const u = (k / steps) * 2 - 1;
      const th = u * 0.55;
      const tipIndent = 1 - 0.22 * Math.exp(-Math.pow(u / 0.22, 2));
      const rVal = R * (0.96 * tipIndent) * (1 - 0.28 * Math.abs(u));
      const px = Math.sin(th) * rVal * s;
      const py = -Math.cos(th) * rVal * s;
      const rx = px * ca - py * sa;
      const ry = px * sa + py * ca;
      pts.push(transform(rx, ry, 0.08));
    }
    pts.push(transform(0, 0, 0));
    backend.fill(pts, palette.red);
    backend.stroke(pts, palette.line, Math.max(0.5, lw * 0.5));

    if (s > 0.45 && R >= 10) {
      const vPts: [number, number][] = [
        transform(0, 0, 0),
        transform(-ca * R * 0.5 * s, -sa * R * 0.5 * s, 0.1),
      ];
      backend.stroke(vPts, palette.line, lw * 0.7);
    }
  }

  const pistilBloom = easeOutCubic((a - numPetals * 65 - 60) / 400);
  if (pistilBloom > 0 && R > 4) {
    const numPistils = 10;
    for (let k = 0; k < numPistils; k++) {
      const pAng = (k * Math.PI * 2) / numPistils + (e.ph1 || 0) * 0.2;
      const pLen = R * 0.32 * pistilBloom;
      const px = Math.cos(pAng) * pLen, py = Math.sin(pAng) * pLen;
      backend.stroke([transform(0, 0, 0), transform(px, py, 0.15)], palette.line, lw * 0.8);
      if (R >= 12) {
        const bead: [number, number][] = [];
        const beadR = Math.max(1, R * 0.04);
        for (let b = 0; b < 8; b++) {
          const ba = (b / 8) * Math.PI * 2;
          bead.push(transform(px + Math.cos(ba) * beadR, py + Math.sin(ba) * beadR, 0.2));
        }
        backend.fill(bead, palette.text || palette.line);
      }
    }
    const centerRing: [number, number][] = [];
    const crR = R * 0.1 * pistilBloom;
    for (let b = 0; b < 12; b++) {
      const ba = (b / 12) * Math.PI * 2;
      centerRing.push(transform(Math.cos(ba) * crR, Math.sin(ba) * crR, 0.2));
    }
    backend.fill(centerRing, palette.line);
  }
}

/**
 * Daisy / Marguerite: Radiating ray petals around a vibrant textured golden sun disc
 */
export function drawDaisyPetals(
  backend: any,
  cx: number,
  cy: number,
  R: number,
  rot: number,
  e: any,
  a: number,
  tl: [number, number] | null,
  palette: any
) {
  const transform = makeTransform(cx, cy, R, rot, tl);
  const lw = Math.max(0.8, R * 0.04);
  const numPetals = 14;

  for (let i = 0; i < numPetals; i++) {
    const s = spring((a - i * 35) / 750, 9, 15);
    if (s <= 0.001) continue;
    const ang = (i * Math.PI * 2) / numPetals;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const pLen = R * 1.18 * s;
    const pW = R * 0.22 * s;

    const pts: [number, number][] = [];
    const steps = 14;
    // Trace first side up to petal tip
    for (let k = 0; k <= steps; k++) {
      const u = k / steps;
      const rad = Math.sin(u * Math.PI) * pW;
      const along = u * pLen;
      const perpX = -sa, perpY = ca;
      pts.push(transform(ca * along + perpX * rad, sa * along + perpY * rad, 0.06));
    }
    // Trace second side back to petal base
    for (let k = steps; k >= 0; k--) {
      const u = k / steps;
      const rad = -Math.sin(u * Math.PI) * pW;
      const along = u * pLen;
      const perpX = -sa, perpY = ca;
      pts.push(transform(ca * along + perpX * rad, sa * along + perpY * rad, 0.06));
    }
    backend.fill(pts, palette.red);
    backend.stroke(pts, palette.line, Math.max(0.5, lw * 0.5));

    if (R >= 12 && s > 0.45) {
      const spine: [number, number][] = [
        transform(ca * pLen * 0.2, sa * pLen * 0.2, 0.1),
        transform(ca * pLen * 0.88, sa * pLen * 0.88, 0.1),
      ];
      backend.stroke(spine, palette.line, lw * 0.6);
    }
  }

  const fr = easeOutCubic((a - 180) / 450);
  if (fr > 0 && R > 3) {
    const discR = R * 0.28 * fr;
    const discPts: [number, number][] = [];
    for (let k = 0; k < 24; k++) {
      const da = (k / 24) * Math.PI * 2;
      discPts.push(transform(Math.cos(da) * discR, Math.sin(da) * discR, 0.22));
    }
    backend.fill(discPts, palette.line);

    if (R >= 10) {
      const innerPts: [number, number][] = [];
      const inR = discR * 0.6;
      for (let k = 0; k < 16; k++) {
        const da = (k / 16) * Math.PI * 2;
        innerPts.push(transform(Math.cos(da) * inR, Math.sin(da) * inR, 0.25));
      }
      backend.stroke(innerPts, palette.vein, lw * 0.9);
    }
  }
}

/**
 * Tulip: Elegant upright chalice/cup with overlapping layered petals and sepal base
 */
export function drawTulipPetals(
  backend: any,
  cx: number,
  cy: number,
  R: number,
  rot: number,
  e: any,
  a: number,
  tl: [number, number] | null,
  palette: any
) {
  const transform = makeTransform(cx, cy, R, rot, tl);
  const lw = Math.max(0.8, R * 0.04);
  const s = spring(a / 850, 8, 13);
  if (s <= 0.001) return;

  const open = Math.min(1, Math.max(0, (s - 0.2) / 0.8));

  // Back Center Petal
  const backPetal: [number, number][] = [
    transform(0, 0.4 * R, -0.1),
    transform(-0.25 * R * (0.6 + 0.4 * open), -0.2 * R, -0.05),
    transform(0, -0.96 * R * s, 0),
    transform(0.25 * R * (0.6 + 0.4 * open), -0.2 * R, -0.05),
    transform(0, 0.4 * R, -0.1),
  ];
  backend.fill(backPetal, palette.red);
  backend.stroke(backPetal, palette.line, Math.max(0.5, lw * 0.5));

  // Left Flared Petal
  const leftPetal: [number, number][] = [
    transform(0, 0.42 * R, 0),
    transform(-0.52 * R * s, 0.05 * R, 0.1),
    transform(-0.48 * R * s, -0.45 * R * s, 0.12),
    transform(-0.18 * R * s, -0.85 * R * s, 0.08),
    transform(0, -0.3 * R, 0.05),
    transform(0, 0.42 * R, 0),
  ];
  backend.fill(leftPetal, palette.red);
  backend.stroke(leftPetal, palette.line, Math.max(0.5, lw * 0.5));

  // Right Overlapping Petal
  const rightPetal: [number, number][] = [
    transform(0, 0.42 * R, 0.15),
    transform(0.52 * R * s, 0.05 * R, 0.2),
    transform(0.48 * R * s, -0.45 * R * s, 0.22),
    transform(0.18 * R * s, -0.85 * R * s, 0.18),
    transform(-0.08 * R * s, -0.35 * R, 0.16),
    transform(0, 0.42 * R, 0.15),
  ];
  backend.fill(rightPetal, palette.red);
  backend.stroke(rightPetal, palette.line, Math.max(0.5, lw * 0.5));

  // Elegant vein strokes
  if (R >= 12 && s > 0.4) {
    const leftVein: [number, number][] = [
      transform(0, 0.35 * R, 0.08),
      transform(-0.35 * R * s, -0.2 * R * s, 0.12),
      transform(-0.18 * R * s, -0.78 * R * s, 0.1),
    ];
    backend.stroke(leftVein, palette.line, lw);

    const rightVein: [number, number][] = [
      transform(0, 0.35 * R, 0.2),
      transform(0.35 * R * s, -0.2 * R * s, 0.22),
      transform(0.18 * R * s, -0.78 * R * s, 0.2),
    ];
    backend.stroke(rightVein, palette.line, lw);
  }

  // Base green sepal cup
  const sepal: [number, number][] = [
    transform(-0.2 * R * s, 0.28 * R, 0.25),
    transform(0, 0.52 * R, 0.25),
    transform(0.2 * R * s, 0.28 * R, 0.25),
    transform(0, 0.38 * R, 0.25),
  ];
  backend.fill(sepal, palette.blue);
}

/**
 * Sunflower: Double-row radiant pointed petals with large textured seed floret disc
 */
export function drawSunflowerPetals(
  backend: any,
  cx: number,
  cy: number,
  R: number,
  rot: number,
  e: any,
  a: number,
  tl: [number, number] | null,
  palette: any
) {
  const transform = makeTransform(cx, cy, R, rot, tl);
  const lw = Math.max(0.8, R * 0.04);
  const numPetals = 14;

  // Outer row of pointed petals
  for (let i = 0; i < numPetals; i++) {
    const s = spring((a - (i % 7) * 40) / 800, 8, 14);
    if (s <= 0.001) continue;
    const ang = (i * Math.PI * 2) / numPetals;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const pLen = R * 1.35 * s;
    const pW = R * 0.25 * s;
    const perpX = -sa, perpY = ca;

    const pts: [number, number][] = [
      transform(ca * R * 0.2, sa * R * 0.2, 0),
      transform(ca * R * 0.55 + perpX * pW, sa * R * 0.55 + perpY * pW, 0.05),
      transform(ca * pLen, sa * pLen, 0.08),
      transform(ca * R * 0.55 - perpX * pW, sa * R * 0.55 - perpY * pW, 0.05),
      transform(ca * R * 0.2, sa * R * 0.2, 0),
    ];
    backend.fill(pts, palette.red);
    backend.stroke(pts, palette.line, Math.max(0.5, lw * 0.5));
  }

  // Inner offset row of pointed petals
  for (let i = 0; i < numPetals; i++) {
    const s = spring((a - 100 - (i % 7) * 40) / 800, 8, 14);
    if (s <= 0.001) continue;
    const ang = (i * Math.PI * 2) / numPetals + Math.PI / numPetals;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const pLen = R * 1.15 * s;
    const pW = R * 0.22 * s;
    const perpX = -sa, perpY = ca;

    const pts: [number, number][] = [
      transform(ca * R * 0.22, sa * R * 0.22, 0.1),
      transform(ca * R * 0.52 + perpX * pW, sa * R * 0.52 + perpY * pW, 0.12),
      transform(ca * pLen, sa * pLen, 0.15),
      transform(ca * R * 0.52 - perpX * pW, sa * R * 0.52 - perpY * pW, 0.12),
      transform(ca * R * 0.22, sa * R * 0.22, 0.1),
    ];
    backend.fill(pts, palette.red);
    backend.stroke(pts, palette.line, Math.max(0.5, lw * 0.5));
  }

  // Center seed floret disc (kept proportional so it never dwarfs the petals)
  const fr = easeOutCubic((a - 200) / 500);
  if (fr > 0 && R > 3) {
    const discR = R * 0.32 * fr;
    const discPts: [number, number][] = [];
    for (let k = 0; k < 28; k++) {
      const da = (k / 28) * Math.PI * 2;
      discPts.push(transform(Math.cos(da) * discR, Math.sin(da) * discR, 0.22));
    }
    backend.fill(discPts, palette.line);

    if (R >= 10) {
      for (let sIdx = 0; sIdx < 5; sIdx++) {
        const spiral: [number, number][] = [];
        const baseA = (sIdx * Math.PI * 2) / 5;
        for (let j = 0; j <= 12; j++) {
          const u = j / 12;
          const sAng = baseA + u * Math.PI * 1.5;
          const sr = discR * (0.15 + 0.8 * u);
          spiral.push(transform(Math.cos(sAng) * sr, Math.sin(sAng) * sr, 0.25));
        }
        backend.stroke(spiral, palette.vein, lw * 0.7);
      }
    }
  }
}

/**
 * Lotus: Sacred tiered boat-shaped pointed petals with peaceful serene unfolding
 */
export function drawLotusPetals(
  backend: any,
  cx: number,
  cy: number,
  R: number,
  rot: number,
  e: any,
  a: number,
  tl: [number, number] | null,
  palette: any
) {
  const transform = makeTransform(cx, cy, R, rot, tl);
  const lw = Math.max(0.8, R * 0.04);

  const numBase = 5;
  for (let i = 0; i < numBase; i++) {
    const s = spring((a - i * 50) / 900, 8, 14);
    if (s <= 0.001) continue;
    const ang = (i * Math.PI * 2) / numBase;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const pLen = R * 1.15 * s;
    const pW = R * 0.28 * s;
    const perpX = -sa, perpY = ca;

    const pts: [number, number][] = [
      transform(ca * R * 0.1, sa * R * 0.1, 0),
      transform(ca * R * 0.5 + perpX * pW, sa * R * 0.5 + perpY * pW, 0.05),
      transform(ca * pLen, sa * pLen, 0.08),
      transform(ca * R * 0.5 - perpX * pW, sa * R * 0.5 - perpY * pW, 0.05),
      transform(ca * R * 0.1, sa * R * 0.1, 0),
    ];
    backend.fill(pts, palette.red);
    backend.stroke(pts, palette.line, Math.max(0.5, lw * 0.5));

    if (R >= 10) {
      const spine: [number, number][] = [
        transform(ca * R * 0.2, sa * R * 0.2, 0.06),
        transform(ca * pLen * 0.88, sa * pLen * 0.88, 0.09),
      ];
      backend.stroke(spine, palette.line, lw * 0.7);
    }
  }

  const numMid = 6;
  for (let i = 0; i < numMid; i++) {
    const s = spring((a - 150 - i * 40) / 850, 8, 14);
    if (s <= 0.001) continue;
    const ang = (i * Math.PI * 2) / numMid + Math.PI / numMid;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const pLen = R * 0.88 * s;
    const pW = R * 0.24 * s;
    const perpX = -sa, perpY = ca;

    const pts: [number, number][] = [
      transform(ca * R * 0.1, sa * R * 0.1, 0.12),
      transform(ca * R * 0.45 + perpX * pW, sa * R * 0.45 + perpY * pW, 0.16),
      transform(ca * pLen, sa * pLen, 0.2),
      transform(ca * R * 0.45 - perpX * pW, sa * R * 0.45 - perpY * pW, 0.16),
      transform(ca * R * 0.1, sa * R * 0.1, 0.12),
    ];
    backend.fill(pts, palette.red);
    backend.stroke(pts, palette.line, Math.max(0.5, lw * 0.5));
  }

  const fr = easeOutCubic((a - 250) / 450);
  if (fr > 0 && R > 3) {
    const podR = R * 0.22 * fr;
    const podPts: [number, number][] = [];
    for (let k = 0; k < 20; k++) {
      const da = (k / 20) * Math.PI * 2;
      podPts.push(transform(Math.cos(da) * podR, Math.sin(da) * podR, 0.28));
    }
    backend.fill(podPts, palette.line);

    if (R >= 12) {
      for (let pIdx = 0; pIdx < 5; pIdx++) {
        const sAng = (pIdx * Math.PI * 2) / 5;
        const sx = Math.cos(sAng) * podR * 0.52;
        const sy = Math.sin(sAng) * podR * 0.52;
        const seedPts: [number, number][] = [];
        const sRad = Math.max(0.8, R * 0.03);
        for (let b = 0; b < 6; b++) {
          const ba = (b / 6) * Math.PI * 2;
          seedPts.push(transform(sx + Math.cos(ba) * sRad, sy + Math.sin(ba) * sRad, 0.32));
        }
        backend.fill(seedPts, palette.text || palette.vein);
      }
    }
  }
}

/**
 * Poppy: 4 wide crinkly undulating papery petals with dark central star seed capsule
 */
export function drawPoppyPetals(
  backend: any,
  cx: number,
  cy: number,
  R: number,
  rot: number,
  e: any,
  a: number,
  tl: [number, number] | null,
  palette: any
) {
  const transform = makeTransform(cx, cy, R, rot, tl);
  const lw = Math.max(0.8, R * 0.04);
  const numPetals = 4;

  for (let i = 0; i < numPetals; i++) {
    const s = spring((a - i * 70) / 850, 8, 14);
    if (s <= 0.001) continue;
    const baseAng = (i * Math.PI * 2) / numPetals;
    const ca = Math.cos(baseAng), sa = Math.sin(baseAng);

    const pts: [number, number][] = [transform(0, 0, 0)];
    const steps = 22;
    for (let k = 0; k <= steps; k++) {
      const u = (k / steps) * 2 - 1;
      const th = u * 0.68;
      const ripple = 1 + 0.08 * Math.sin(u * Math.PI * 4 + (e.ph1 || 0));
      const rVal = R * 1.12 * ripple * s * (1 - 0.22 * u * u);
      const px = Math.sin(th) * rVal;
      const py = -Math.cos(th) * rVal;
      const rx = px * ca - py * sa;
      const ry = px * sa + py * ca;
      pts.push(transform(rx, ry, 0.06 + i * 0.03));
    }
    pts.push(transform(0, 0, 0));
    backend.fill(pts, palette.red);
    backend.stroke(pts, palette.line, Math.max(0.5, lw * 0.5));

    if (R >= 10 && s > 0.45) {
      const rim = pts.slice(1, pts.length - 1);
      backend.stroke(rim, palette.line, lw * 0.75);
    }
  }

  const fr = easeOutCubic((a - 220) / 450);
  if (fr > 0 && R > 3) {
    const capR = R * 0.22 * fr;
    const capPts: [number, number][] = [];
    for (let k = 0; k < 22; k++) {
      const da = (k / 22) * Math.PI * 2;
      capPts.push(transform(Math.cos(da) * capR, Math.sin(da) * capR, 0.22));
    }
    backend.fill(capPts, palette.line);

    if (R >= 10) {
      for (let ray = 0; ray < 6; ray++) {
        const rAng = (ray * Math.PI * 2) / 6;
        const rx = Math.cos(rAng) * capR * 0.85;
        const ry = Math.sin(rAng) * capR * 0.85;
        backend.stroke([transform(0, 0, 0.25), transform(rx, ry, 0.25)], palette.vein, lw * 0.9);
      }
    }
  }
}

/**
 * Dispatcher to render the appropriate flower species
 */
export function drawFlowerPetals(
  flowerType: FlowerType | undefined,
  backend: any,
  cx: number,
  cy: number,
  R: number,
  rot: number,
  e: any,
  a: number,
  tl: [number, number] | null,
  palette: any
) {
  const type = flowerType || e.flowerType || "rose";
  switch (type) {
    case "sakura":
      drawSakuraPetals(backend, cx, cy, R, rot, e, a, tl, palette);
      break;
    case "daisy":
      drawDaisyPetals(backend, cx, cy, R, rot, e, a, tl, palette);
      break;
    case "tulip":
      drawTulipPetals(backend, cx, cy, R, rot, e, a, tl, palette);
      break;
    case "sunflower":
      drawSunflowerPetals(backend, cx, cy, R, rot, e, a, tl, palette);
      break;
    case "lotus":
      drawLotusPetals(backend, cx, cy, R, rot, e, a, tl, palette);
      break;
    case "poppy":
      drawPoppyPetals(backend, cx, cy, R, rot, e, a, tl, palette);
      break;
    case "rose":
    default:
      drawRosePetals(backend, cx, cy, R, rot, e, a, tl, palette);
      break;
  }
}

export function drawLeafShape(
  backend: any,
  bx: number,
  by: number,
  a: number,
  L: number,
  bend: number,
  stemColor: string,
  veinColor: string
) {
  if (L < 0.5) return;
  const ca = Math.cos(a), sa = Math.sin(a), px = -sa, py = ca;
  const ax = (u: number): [number, number] => {
    const b = Math.sin(Math.PI * u) * bend * 0.15 * L;
    return [bx + ca * u * L + px * b, by + sa * u * L + py * b];
  };
  const hw = (u: number) => L * 0.18 * Math.sin(Math.PI * Math.pow(u, 0.8));
  const N = 12, s1: [number, number][] = [], s2: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, c = ax(u), w = hw(u);
    s1.push([c[0] + px * w, c[1] + py * w]);
    s2.push([c[0] - px * w, c[1] - py * w]);
  }
  const tip = ax(1), base = ax(0);
  backend.fill([base, ...s1.slice(1, N), tip, tip, ...s2.slice(1, N).reverse(), base], stemColor);
  if (L > 6) {
    const v: [number, number][] = [];
    for (let i = 0; i <= 8; i++) v.push(ax(0.08 + 0.72 * i / 8));
    backend.stroke(v, veinColor, Math.max(0.8, L * 0.03));
  }
}

export function drawButterfly(
  backend: any,
  x: number,
  y: number,
  s: number,
  ang: number,
  open: number,
  colors: any
) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const transform = (px: number, py: number): [number, number] => [
    x + (px * ca - py * sa) * s,
    y + (px * sa + py * ca) * s,
  ];
  const wing = (cx: number, cy: number, rx: number, ry: number, a: number, side: number) => {
    const pts: [number, number][] = [];
    const c = Math.cos(a), sn = Math.sin(a);
    for (let k = 0; k < 22; k++) {
      const th = k / 22 * Math.PI * 2;
      const r = 1 + 0.08 * Math.sin(th * 3);
      const lx = Math.cos(th) * rx * r, ly = Math.sin(th) * ry * r;
      pts.push(transform(side * (cx + lx * c - ly * sn) * (0.12 + 0.88 * open), cy + lx * sn + ly * c));
    }
    return pts;
  };
  for (const sd of [-1, 1]) {
    backend.fill(wing(0.46, 0.28, 0.36, 0.3, 0.5 * sd * sd, sd), colors.text);
    backend.fill(wing(0.55, -0.32, 0.55, 0.36, -0.55, sd), colors.text);
    if (open > 0.35) backend.fill(wing(0.66, -0.4, 0.13, 0.11, 0, sd), colors.red);
  }
  const body: [number, number][] = [];
  for (let k = 0; k < 18; k++) {
    const th = k / 18 * Math.PI * 2;
    body.push(transform(Math.cos(th) * 0.08, Math.sin(th) * 0.48));
  }
  backend.fill(body, colors.blue);
  const lw = Math.max(0.8, s * 0.05);
  backend.stroke([transform(0, -0.42), transform(-0.14, -0.72), transform(-0.24, -0.86)], colors.blue, lw);
  backend.stroke([transform(0, -0.42), transform(0.14, -0.72), transform(0.24, -0.86)], colors.blue, lw);
}
