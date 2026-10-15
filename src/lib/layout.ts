import { Letter } from "./garden-engine";
import { FONT_FAMILY } from "../constants/garden";

/**
 * Measures character width in em units (100px font size) with local caching.
 */
export function measureCharWidth(
  ch: string,
  cache: Record<string, number>,
  ctx?: CanvasRenderingContext2D | null
): number {
  if (cache[ch] != null) return cache[ch];
  if (!ctx) return 0.6;
  ctx.font = `700 100px ${FONT_FAMILY}`;
  let w = ctx.measureText(ch).width / 100;
  if (ch === " ") w *= 1.4;
  return (cache[ch] = w);
}

export interface LayoutResult {
  S: number;
  wrapped: boolean;
  n: number;
}

/**
 * Adaptive text layout core that fits any text inside any width / height boundaries,
 * supporting arbitrary screen sizes and poster orientations (Landscape, Portrait, Square).
 */
export function layoutCore(
  A: Letter[],
  W: number,
  H: number,
  prevWrapped: boolean,
  mw: (ch: string) => number
): LayoutResult {
  const isLandscape = W > H;
  const maxW = W * 0.82;
  const S0 = isLandscape ? H * 0.35 : H * 0.26;
  const LH = 2.1;
  const ws = A.map(l => mw(l.ch));
  const words: { sp?: boolean; idx: number[] }[] = [];
  let cur: { idx: number[] } | null = null;

  A.forEach((l, i) => {
    if (l.ch === " ") {
      if (cur) {
        words.push(cur);
        cur = null;
      }
      words.push({ sp: true, idx: [i] });
    } else {
      if (!cur) cur = { idx: [] };
      cur.idx.push(i);
    }
  });
  if (cur) words.push(cur);

  const lineW = (li: number[], scaleVal: number) => {
    let e = li.length;
    while (e > 0 && A[li[e - 1]].ch === " ") e--;
    let w = 0;
    for (let k = 0; k < e; k++) w += ws[li[k]];
    return w * scaleVal;
  };

  const wrap = (scaleVal: number) => {
    const lines: number[][] = [[]];
    let lw = 0;
    for (const w of words) {
      const ww = w.idx.reduce((s, i) => s + ws[i], 0) * scaleVal;
      if (!w.sp && lw > 0 && lw + ww > maxW) {
        lines.push([]);
        lw = 0;
      }
      lines[lines.length - 1].push(...w.idx);
      lw += ww;
    }
    return lines;
  };

  let lines = [A.map((_, i) => i)];
  const unit = lineW(lines[0], 1);
  let scale = unit > 0 ? Math.min(S0, maxW / unit) : S0;
  const multi = words.filter(w => !w.sp).length > 1;
  let wrapped = multi && (scale < H * 0.1 || (prevWrapped && scale < H * 0.14));

  if (wrapped) {
    let lo = H * 0.03,
      hi = isLandscape ? H * 0.22 : H * 0.16;
    for (let k = 0; k < 22; k++) {
      const mid = (lo + hi) / 2;
      const ls = wrap(mid);
      const ok = ls.every(li => lineW(li, mid) <= maxW) && ls.length * LH * mid <= H * 0.82;
      if (ok) lo = mid;
      else hi = mid;
    }
    scale = lo;
    lines = wrap(scale);
    if (lines.length < 2) wrapped = false;
  }

  const n = lines.length,
    lh = LH * scale;
  lines.forEach((li, k) => {
    let x = W / 2 - lineW(li, scale) / 2;
    const y = H / 2 + (k - (n - 1) / 2) * lh + 0.33 * scale;
    li.forEach(i => {
      const l = A[i],
        w = ws[i] * scale;
      l.tx = x + w / 2;
      l.ty = y;
      l.tw = w;
      l.line = k;
      x += w;
    });
  });

  return { S: scale, wrapped, n };
}
