import { Letter, createWordParameters, growBotanicalBranch } from "./garden-engine";
import { createRng, cubicBezier } from "./math";
import { FlowerType } from "../constants/flowers";

/**
 * Generates botanical branch geometry, thorns, leaves, roses, and tendrils for a single letter.
 */
export function generateLetterGrowth(
  l: Letter,
  mw: (ch: string) => number,
  density: number,
  randSeed: number,
  flowerType?: FlowerType
) {
  const r = createRng((l.ws! ^ Math.imul(l.wi! + 1, 2654435761)) + Math.floor(randSeed));
  const activeFlower = flowerType || l.flowerType;
  const p = createWordParameters(l.ws!, density, activeFlower);
  const E: any[] = [];
  let k0 = 0;
  const nid = () => l.id * 100 + (k0++);
  const w = mw(l.ch);
  const inX = () => (r() - 0.5) * w * 0.7;
  p.w = w;

  const nUp = 1 + (r() < 0.45 * p.dens ? 1 : 0);
  for (let i = 0; i < nUp; i++) {
    growBotanicalBranch(r, E, nid, p, {
      base: [inX(), -r() * 0.3],
      dir: -Math.PI / 2 + p.lean * 0.5 + (r() - 0.5) * 0.7,
      len: 0.6 + r() * 0.5,
      d0: 40 + i * 130,
      tip: l.wi === 0 && i === 0 ? "rose" : null,
    });
  }

  if (r() < 0.4 * p.dens) {
    growBotanicalBranch(r, E, nid, p, {
      base: [inX(), -0.1 - r() * 0.35],
      dir: Math.PI / 2 + (r() - 0.5) * 0.8,
      len: 0.35 + r() * 0.35,
      d0: 160,
    });
  }

  if (l.prev && r() < p.bridgeP) {
    const px = -(mw(l.prev.ch) + w) / 2;
    const a = [inX(), -0.05 - r() * 0.55];
    const b = [px + (r() - 0.5) * 0.25, -0.05 - r() * 0.55];
    const bulge = (r() < 0.55 ? -1 : 1) * (0.4 + r() * 0.4);
    const dx = b[0] - a[0];
    let P = cubicBezier(a, [a[0] + dx * 0.15, a[1] + bulge], [b[0] - dx * 0.15, b[1] + bulge * 0.9], b, 40);
    if (r() < 0.45) P = P.slice(0, Math.floor(P.length * (0.7 + r() * 0.2)));
    growBotanicalBranch(r, E, nid, p, {
      pts: P,
      len: Math.abs(dx) + Math.abs(bulge),
      d0: 90,
      tip: r() < 0.5 ? "curl" : r() < 0.5 ? "leaf" : "rose",
    });
  }

  if (l.wi === 0) {
    growBotanicalBranch(r, E, nid, p, {
      base: [-w * 0.3, -0.15 - r() * 0.4],
      dir: Math.PI + (r() - 0.5) * 1.2,
      len: 0.45 + r() * 0.3,
      d0: 120,
      tip: "curl",
    });
  }

  l.els = E;
  l.endEls = null;

  const T: any[] = [];
  const tr = createRng(l.id * 977 + Math.floor(randSeed));
  growBotanicalBranch(tr, T, () => l.id * 100 + 90 + T.length, p, {
    base: [w * 0.25, -0.1 - tr() * 0.45],
    dir: (tr() - 0.5) * 1.4,
    len: 0.45 + tr() * 0.25,
    d0: 0,
    tip: "curl",
    depth: 1,
  });
  l.tend = T.filter(e => e.t === "stem").slice(0, 1) as any;
}

/**
 * Generates terminal blossom branches when a word is completed or cut with space.
 */
export function generateLetterEnd(
  l: Letter,
  rel: number,
  mw: (ch: string) => number,
  density: number,
  randSeed: number,
  flowerType?: FlowerType
) {
  const r = createRng(l.ws! + l.wi! * 31 + Math.floor(randSeed));
  const activeFlower = flowerType || l.flowerType;
  const p = createWordParameters(l.ws!, density, activeFlower);
  const E: any[] = [];
  let k0 = 50;
  const nid = () => l.id * 100 + (k0++);
  const w = mw(l.ch);
  const n = 1 + Math.floor(r() * 2.5);
  p.w = w;

  for (let i = 0; i < n; i++) {
    const dir = -Math.PI / 2 + 0.6 + (i - (n - 1) / 2) * 0.9 + (r() - 0.5) * 0.4;
    growBotanicalBranch(r, E, nid, p, {
      base: [(r() - 0.2) * w * 0.6, -r() * 0.5],
      dir,
      len: 0.4 + r() * 0.45,
      d0: rel + 40 + i * 90,
      depth: 1,
      tip: i === 0 || r() < 0.5 ? "rose" : "fan",
    });
  }
  l.endEls = E;
}
