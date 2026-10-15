// Procedural pseudo-random and easing math functions for botanical growth

export function hash(n: number): number {
  const x = Math.sin(n) * 43758.5453;
  return x - Math.floor(x);
}

export function spring(t: number, k = 7, w = 16): number {
  if (t <= 0) return 0;
  return 1 - Math.exp(-t * k) * Math.cos(t * w);
}

export function easeOutCubic(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 - Math.pow(1 - t, 3);
}

export function easeBack(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function createRng(seedVal: number): () => number {
  let s = seedVal | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function cubicBezier(
  a: number[],
  b: number[],
  c: number[],
  d: number[],
  segments: number
): [number, number][] {
  const P: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments, u = 1 - t;
    P.push([
      u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
      u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
    ]);
  }
  return P;
}

export function curveAt(
  points: [number, number][],
  u: number
): [[number, number], number] {
  const n = points.length;
  const i = Math.min(n - 2, Math.max(1, Math.round(u * (n - 1))));
  const angle = Math.atan2(points[i + 1][1] - points[i - 1][1], points[i + 1][0] - points[i - 1][0]);
  return [points[i], angle];
}

export function jitter(id: number, f: number, amp: number): [number, number, number] {
  if (!amp) return [0, 0, 0];
  return [
    (hash(id * 1.37 + f * 7.13) * 2 - 1) * amp,
    (hash(id * 2.71 + f * 3.11) * 2 - 1) * amp,
    (hash(id * 5.3 + f * 1.7) * 2 - 1) * 0.035,
  ];
}
