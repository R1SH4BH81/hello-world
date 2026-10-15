import { Letter, drawButterfly } from "./garden-engine";
import { getPreset } from "../constants/presets";
import { Palette } from "../constants/palettes";
import { createRng, easeOutCubic } from "./math";
import { createBackend } from "./geometry";
import { layoutCore } from "./layout";
import { generateLetterGrowth, generateLetterEnd } from "./growth";
import { renderGardenScene } from "./scene-renderer";

export interface PosterState {
  letters: Letter[];
  S: number;
  T: number;
  preset: string;
  W: number;
  H: number;
}

/**
 * Builds the letters, botanical growth structures, and bounding layout
 * for the Poster mode across any orientation (Landscape, Portrait, Square).
 */
export function buildPosterLetters(
  text: string,
  presetId: string,
  seed: number,
  PW: number,
  PH: number,
  mw: (ch: string) => number,
  density: number
): PosterState {
  const cleanText = (text || "").slice(0, 50) || " ";
  const pr = getPreset(presetId);
  const rand = createRng(seed * 7919 + 1);

  const L: Letter[] = [];
  let prev: Letter | null = null,
    uid = 1;

  for (const ch of cleanText) {
    if (ch === " ") {
      const sp: Letter = { ch: " ", id: 9000 + uid++, els: [] };
      L.push(sp);
      prev = sp;
      continue;
    }
    const prevL = prev && prev.ch !== " " ? prev : null;
    const l: Letter = {
      ch,
      id: 9000 + uid++,
      ws: prevL ? prevL.ws : Math.floor(rand() * 1e9),
      wi: prevL ? (prevL.wi || 0) + 1 : 0,
      prev: prevL,
    };
    generateLetterGrowth(l, mw, density, Math.floor(rand() * 1e6));
    L.push(l);
    prev = l;
  }

  const n = L.length;
  const isTyped = pr.id === "typed";
  const step =
    pr.id === "grow"
      ? Math.min(110, 3000 / n)
      : isTyped
      ? Math.min(140, 2600 / Math.max(1, n - 1))
      : 0;
  const off = pr.id === "grow" ? 200 : isTyped ? 350 : 0;
  L.forEach((l, i) => {
    l.b = off + i * step;
  });

  if (pr.id === "scatter") {
    const r = createRng(seed * 31 + 5);
    L.forEach(l => {
      l.b = 150 + r() * 2400;
    });
  }

  const wd = Math.min(60, 900 / n);
  L.forEach((l, i) => {
    if (isTyped) {
      l.d = 3900 + (n - 1 - i) * Math.min(80, 500 / Math.max(1, n));
    } else if (pr.id === "scatter") {
      l.d = 4700 + i * 8;
    } else {
      l.d = 4200 + (n - 1 - i) * wd;
    }
    const nx = L[i + 1];
    l.cutRel = null;
    if (pr.id !== "scatter" && l.ch !== " " && nx && nx.ch === " ") {
      l.cutRel = Math.max(30, (nx.b || 0) - (l.b || 0));
      generateLetterEnd(l, l.cutRel!, mw, density, Math.floor(rand() * 1e6));
    }
  });

  // Run layout core with the exact orientation dimensions
  const res = layoutCore(L, PW, PH, false, mw);
  let scale = res.S,
    x0 = 1e9,
    y0 = 1e9,
    x1 = -1e9,
    y1 = -1e9;

  const addP = (l: Letter, x: number, y: number, r?: number) => {
    const X = l.tx! + x * scale,
      Y = l.ty! + y * scale,
      R = (r || 0) * scale;
    x0 = Math.min(x0, X - R);
    x1 = Math.max(x1, X + R);
    y0 = Math.min(y0, Y - R);
    y1 = Math.max(y1, Y + R);
  };

  for (const l of L) {
    if (l.ch === " ") continue;
    addP(l, -l.tw! / scale / 2, -0.75);
    addP(l, l.tw! / scale / 2, 0.1);
    const all = [...(l.els || []), ...(l.endEls || [])];
    for (const e of all) {
      if (e.t === "stem") e.pts.forEach((q: number[]) => addP(l, q[0], q[1], 0.02));
      else if (e.t === "leaf") addP(l, e.x, e.y, e.L);
      else addP(l, e.x, e.y, e.R * 1.15);
    }
  }

  let tx0 = 1e9,
    tx1 = -1e9,
    ty0 = 1e9,
    ty1 = -1e9;
  for (const l of L) {
    if (l.ch !== " ") {
      tx0 = Math.min(tx0, l.tx! - l.tw! / 2);
      tx1 = Math.max(tx1, l.tx! + l.tw! / 2);
      ty0 = Math.min(ty0, l.ty! - 0.72 * scale);
      ty1 = Math.max(ty1, l.ty!);
    }
  }

  const halfW = PW * 0.44,
    halfH = PH * 0.44;
  const bcx = (tx0 + tx1) / 2,
    bcy = (ty0 + ty1) / 2;
  const k = Math.min(1.25, halfW / Math.max(1, bcx - x0, x1 - bcx), halfH / Math.max(1, bcy - y0, y1 - bcy));

  L.forEach(l => {
    l.tx = PW / 2 + (l.tx! - bcx) * k;
    l.ty = PH / 2 + (l.ty! - bcy) * k;
    l.tw = l.tw! * k;
    l.x = l.tx;
    l.y = l.ty;
  });

  return {
    letters: L,
    S: scale * k,
    T: pr.T,
    preset: pr.id,
    W: PW,
    H: PH,
  };
}

/**
 * Draws one frame of the animated poster loop on a canvas 2D context.
 */
export function posterDrawFrame(
  g: CanvasRenderingContext2D,
  t: number,
  P: PosterState,
  palette: Palette,
  props: { boil: boolean; recoil: number },
  lightState: [number, number],
  onLightChange?: (lx: number, ly: number) => void
) {
  const PW = P.W,
    PH = P.H;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = palette.bg;
  g.fillRect(0, 0, PW, PH);

  const tt = ((t % P.T) + P.T) % P.T;
  const L = P.letters;
  const backend = createBackend(g);
  const perchList: any[] = [];

  const st: any = {
    letters: L,
    S: P.S,
    C: palette.colors,
    boil: props.boil,
    recoil: props.recoil,
    speed: 1,
    wither: 600,
    textAll: true,
    warp: null,
    rotw: null,
    perchOn: false,
    perchList,
  };

  L.forEach(l => {
    l.x = l.tx;
    l.y = l.ty;
    l.dead = null;
  });

  const setBirth = (base: number) =>
    L.forEach(l => {
      l.birth = base + (l.b || 0);
      l.tb = l.birth;
      l.cut = l.cutRel != null ? l.birth + l.cutRel : null;
    });

  if (P.preset === "breathe") {
    setBirth(-1e5);
    const phVal = (tt / P.T) * Math.PI * 2,
      scale = P.S;
    st.warp = (x: number, y: number, l: Letter) => {
      const hh = Math.max(0, (l.y! - y) / scale);
      return [
        x + Math.sin(phVal + l.x! * 0.004 + hh * 1.1) * scale * 0.03 * hh,
        y + Math.cos(phVal + x * 0.003) * scale * 0.008 * hh,
      ];
    };
    st.rotw = (e: any) => Math.sin(phVal + e.id * 0.7) * 0.12;
  } else if (P.preset === "grow" || P.preset === "scatter") {
    setBirth(0);
    L.forEach(l => {
      if (tt >= l.d!) l.dead = l.d;
    });
  } else if (P.preset === "wind") {
    setBirth(-1e5);
    const scale = P.S,
      u = tt / P.T,
      front = -0.35 + u * 1.9;
    st.warp = (x: number, y: number, l: Letter) => {
      const hh = Math.max(0, (l.y! - y) / scale),
        d = l.x! / PW - front;
      const gVal = d < 0 ? Math.exp(d * 2.2) * Math.cos(-d * 9) : Math.exp(-d * d * 30);
      const idle = Math.sin((tt / 1000) * 1.6 + l.x! * 0.01) * 0.012;
      return [
        x + (gVal * 0.13 + idle) * scale * hh * hh * 0.6 + (gVal * 0.13 + idle) * scale * hh * 0.4,
        y + Math.abs(gVal) * 0.02 * scale * hh,
      ];
    };
    st.rotw = (e: any) => {
      const d = e.x / PW - front;
      return (d < 0 ? Math.exp(d * 2.2) * Math.cos(-d * 9) : Math.exp(-d * d * 30)) * 0.35;
    };
  } else if (P.preset === "reach") {
    setBirth(-1e5);
    const scale = P.S,
      phVal = (tt / P.T) * Math.PI * 2;
    const lx = PW / 2 + Math.sin(phVal) * (PW * 0.4);
    const ly = PH / 2 + Math.sin(phVal * 2) * (PH * 0.24);
    if (onLightChange) onLightChange(lx, ly);
    lightState[0] = lx;
    lightState[1] = ly;

    st.warp = (x: number, y: number, l: Letter) => {
      const dx = lx - l.x!,
        dy = ly - (l.y! - scale * 0.6),
        d = Math.hypot(dx, dy) || 1;
      const w = Math.max(0, 1 - d / (Math.min(PW, PH) * 0.52)),
        s = w * w * (3 - 2 * w);
      const hh = Math.min(2.5, Math.max(0, (l.y! - y) / scale)),
        f = hh * hh * 0.5 + hh * 0.5;
      return [x + (dx / d) * s * scale * 0.12 * f, y + (dy / d) * s * scale * 0.06 * f];
    };
    st.rotw = (e: any) => {
      const a = Math.atan2(ly - e.y, lx - e.x);
      return Math.sin(a) * 0.15;
    };
  } else if (P.preset === "visit") {
    setBirth(-1e5);
    st.perchOn = true;
    const phVal = (tt / P.T) * Math.PI * 2;
    st.warp = (x: number, y: number, l: Letter) => {
      const hh = Math.max(0, (l.y! - y) / P.S);
      return [x + Math.sin(phVal + l.x! * 0.004 + hh) * P.S * 0.015 * hh, y];
    };
  } else if (P.preset === "typed") {
    const born = L.filter(l => tt >= (l.b || 0));
    const k = born.length;
    st.textAll = false;
    st.speed = 1;
    st.wither = 320;

    // Smooth dynamic horizontal centering shift (matching home page typing animation)
    let currentShift = 0;
    if (k > 0) {
      const first = L[0];
      const lastBorn = born[k - 1];
      const prevPrefixCenter =
        (first.tx! -
          first.tw! / 2 +
          (k > 1 ? born[k - 2].tx! + born[k - 2].tw! / 2 : first.tx! + first.tw! / 2)) /
        2;
      const targetPrefixCenter =
        (first.tx! - first.tw! / 2 + lastBorn.tx! + lastBorn.tw! / 2) / 2;

      const timeSinceBorn = Math.max(0, tt - (lastBorn.b || 0));
      const slide = easeOutCubic(Math.min(1, timeSinceBorn / 140));
      const activeCenter =
        prevPrefixCenter + (targetPrefixCenter - prevPrefixCenter) * slide;

      currentShift = PW / 2 - activeCenter;
    }

    L.forEach(l => {
      l.x = l.tx! + currentShift;
      l.y = l.ty!;
      l.birth = l.b;
      l.tb = l.b;
      l.cut = l.cutRel != null ? (l.b || 0) + l.cutRel : null;
      if (tt >= (l.d || 1e9)) {
        l.dead = l.d;
      } else {
        l.dead = null;
      }
    });

    st.letters = born;
  } else {
    if (tt >= 5000) return;
    setBirth(0);
    st.letters = L.filter(l => tt >= (l.birth || 0));
    st.textAll = false;
  }

  renderGardenScene(backend, tt, st);

  if (P.preset === "reach") {
    const lx = lightState[0],
      ly = lightState[1];
    const r = P.S * 0.09,
      pts: [number, number][] = [];
    for (let k = 0; k < 20; k++) {
      const a = (k / 20) * Math.PI * 2;
      pts.push([lx + Math.cos(a) * r, ly + Math.sin(a) * r]);
    }
    backend.fill(pts, st.C.line);
  }

  if (P.preset === "visit") {
    const ps = perchList.slice().sort((a, b) => a.x - b.x);
    if (ps.length) {
      const p1 = ps[Math.floor(ps.length * 0.25)];
      const p2 = ps[Math.min(ps.length - 1, Math.floor(ps.length * 0.75))];
      const A = [-80, PH * 0.28],
        s1 = [p1.x, p1.y - p1.R * 0.55],
        s2 = [p2.x, p2.y - p2.R * 0.55],
        E = [PW + 80, PH * 0.24];
      const sz = Math.max(12, P.S * 0.09),
        tSec = tt / 1000;
      const leg = (aPts: number[], bPts: number[], u: number, lift: number): [number, number] => {
        const e = easeOutCubic(Math.max(0, Math.min(1, u)));
        return [aPts[0] + (bPts[0] - aPts[0]) * e, aPts[1] + (bPts[1] - aPts[1]) * e - Math.sin(e * Math.PI) * lift];
      };
      let p: [number, number],
        flying = true,
        vx = 0;
      if (tSec < 1.8) {
        p = leg(A, s1, tSec / 1.8, 160);
        vx = 1;
      } else if (tSec < 3.4) {
        p = s1 as [number, number];
        flying = false;
      } else if (tSec < 4.6) {
        p = leg(s1, s2, (tSec - 3.4) / 1.2, 140);
        vx = s2[0] > s1[0] ? 1 : -1;
      } else if (tSec < 5.8) {
        p = s2 as [number, number];
        flying = false;
      } else {
        p = leg(s2, E, (tSec - 5.8) / 1.2, 60);
        vx = 1;
      }
      let o = 0,
        ang = 0;
      if (flying) {
        o = Math.abs(Math.cos(tSec * 17));
        p = [p[0] + Math.sin(tSec * 7) * 6, p[1] + Math.sin(tSec * 13) * 4];
        ang = vx * 0.3;
      } else {
        const burst = (tSec > 2.4 && tSec < 2.8) || (tSec > 5 && tSec < 5.3);
        o = burst ? 0.2 + 0.8 * Math.abs(Math.cos(tSec * 9)) : 0.3 + 0.1 * Math.sin(tSec * 3);
        ang = 0;
      }
      drawButterfly(backend, p[0], p[1], sz, ang, o, st.C);
    }
  }

  if (P.preset === "typed") {
    const born = st.letters;
    const last = born[born.length - 1];
    const scale = P.S;
    if (tt < 3900) {
      const on = Math.floor(tt / 450) % 2 === 0 || (last && tt - (last.b || 0) < 280);
      if (on) {
        const x = last ? last.x! + last.tw! / 2 + 0.07 * scale : PW / 2;
        const y = last ? last.y! - 0.33 * scale : PH / 2;
        const wVal = Math.max(2, scale * 0.03),
          hVal = 0.8 * scale;
        backend.rect(x - wVal / 2, y - hVal / 2, wVal, hVal, st.C.text);
      }
    }
  }
}
