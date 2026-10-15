import { Letter, drawRosePetals, drawLeafShape } from "./garden-engine";
import { easeOutCubic, spring, curveAt, jitter } from "./math";
import { getLayerAt } from "./geometry";

export interface GardenSceneOptions {
  letters: Letter[];
  S: number;
  C: {
    blue: string;
    red: string;
    line: string;
    text: string;
    vein: string;
  };
  boil?: boolean;
  recoil?: number;
  speed?: number;
  wither?: number;
  face?: boolean;
  textAll?: boolean;
  perchOn?: boolean;
  warp?: ((x: number, y: number, l: Letter) => [number, number]) | null;
  rotw?: ((e: any) => number) | null;
  nearPointer?: ((x: number, y: number) => [number, number] | null) | null;
  fa?: Record<number, [number, number]>;
  perchList?: any[];
}

export function warpPoint(
  st: GardenSceneOptions,
  l: Letter,
  x: number,
  y: number,
  now: number
): [number, number] {
  if (l.birth != null && now != null) {
    const t = ((now - l.birth) * (st.speed || 1)) / 1000;
    if (t > 0 && t < 2.5) {
      const hh = Math.max(0, (l.y! - y) / st.S);
      const dmp = Math.exp(-t * 3.2);
      const dir = l.id % 2 ? 1 : -1;
      x += st.S * 0.07 * hh * dmp * Math.sin(t * 11) * dir;
      y += st.S * 0.035 * hh * dmp * Math.sin(t * 11 + 1.2);
    }
  }
  if (st.face && l.lean) {
    const hh = Math.min(2.5, Math.max(0, (l.y! - y) / st.S));
    const f = hh * hh * 0.5 + hh * 0.5;
    x += l.lean[0] * st.S * 0.1 * f;
    y += l.lean[1] * st.S * 0.05 * f;
  }
  return st.warp ? st.warp(x, y, l) : [x, y];
}

export function renderGardenScene(
  backend: any,
  now: number,
  st: GardenSceneOptions
) {
  const scale = st.S;
  const L = st.letters;
  const act = L.filter(l => !l.dead);
  const sp = st.speed || 1;
  const witherDuration = st.wither || 260;

  if (st.face && st.nearPointer) {
    for (const l of L) {
      let tx = 0,
        ty = 0;
      const A = !l.dead && l.ch !== " " ? st.nearPointer(l.x!, l.y! - scale * 0.6) : null;
      if (A) {
        const dx = A[0] - l.x!,
          dy = A[1] - (l.y! - scale * 0.6),
          d = Math.hypot(dx, dy),
          reach = Math.max(260, scale * 3.2);
        if (d < reach && d > 1) {
          const w = 1 - d / reach,
            s = w * w * (3 - 2 * w);
          tx = (dx / d) * s;
          ty = (dy / d) * s;
        }
      }
      const c = l.lean || (l.lean = [0, 0]);
      c[0] += (tx - c[0]) * 0.07;
      c[1] += (ty - c[1]) * 0.07;
    }
  }

  const f = st.boil ? Math.floor(now / 120) : 0;
  const amp = st.boil ? Math.max(0.8, scale * 0.01) : 0;
  const kd = (l: Letter) => (l.dead ? 1 - easeOutCubic((now - l.dead) / witherDuration) : 1);

  const faceTurn = (e: any, x: number, y: number): [number, number] => {
    let wx = 0,
      wy = 0;
    if (st.nearPointer) {
      const A = st.nearPointer(x, y);
      if (A) {
        const dx = A[0] - x,
          dy = A[1] - y,
          d = Math.hypot(dx, dy),
          reach = 300;
        if (d < reach && d > 0.001) {
          const w = 1 - d / reach,
            s = w * w * (3 - 2 * w) * Math.min(1, d / 40);
          wx = (dx / d) * s;
          wy = (dy / d) * s;
        }
      }
    }
    const c = (st.fa && st.fa[e.id]) || [0, 0];
    c[0] += (wx - c[0]) * 0.09;
    c[1] += (wy - c[1]) * 0.09;
    if (st.fa) st.fa[e.id] = c;
    return c;
  };

  const drawLayer = (layer: number) => {
    for (const l of L) {
      if (l.ch === " " || !l.els) continue;
      const age = (now - (l.birth || 0)) * sp;
      const kk = kd(l);
      const each = (e: any) => {
        if (e.t === "stem") {
          const fr = easeOutCubic((age - e.d0) / e.dur) * kk;
          if (fr <= 0) return;
          const j = jitter(e.id, f, amp);
          const P = e.pts.map((p: number[]) =>
            warpPoint(st, l, l.x! + p[0] * scale + j[0], l.y! + p[1] * scale + j[1], now)
          );
          for (const sg of e.segs) {
            if (sg.layer !== layer) continue;
            const b = Math.min(sg.u1, fr);
            if (b <= sg.u0) continue;
            const n = P.length - 1;
            const subPts = P.slice(Math.floor(sg.u0 * n), Math.min(n + 1, Math.floor(b * n) + 2));
            if (subPts.length >= 2) backend.stroke(subPts, st.C.blue, scale * 0.022 * (e.w || 1));
          }
          for (const th of e.thorns) {
            if (fr > th.u && getLayerAt(e.segs, th.u) === layer) {
              const [p, a] = curveAt(P, th.u);
              const d = a + th.s * 2.3;
              const LVal = scale * 0.045;
              backend.stroke(
                [p, [p[0] + Math.cos(d) * LVal, p[1] + Math.sin(d) * LVal]],
                st.C.blue,
                scale * 0.022
              );
            }
          }
        } else if (e.layer === layer) {
          const j = jitter(e.id, f, amp);
          const wx = (x: number, y: number) =>
            warpPoint(st, l, l.x! + x * scale + j[0], l.y! + y * scale + j[1], now);
          const rw = st.rotw ? st.rotw(e) : 0;
          if (e.t === "leaf") {
            const sc = spring((age - e.d0) / 1000, 7, 15) * kk;
            if (sc <= 0) return;
            const p = wx(e.x, e.y);
            drawLeafShape(backend, p[0], p[1], e.a + j[2] + rw, e.L * scale * sc, e.bend, st.C.blue, st.C.vein);
          } else if (e.t === "rose") {
            const a = age - e.d0;
            if (a < 0 || kk <= 0.001) return;
            const p = wx(e.x, e.y);
            const tl = st.face ? faceTurn(e, p[0], p[1]) : null;
            if ((st.face || st.perchOn) && !l.dead && a > 700 && st.perchList) {
              st.perchList.push({ id: e.id, x: p[0], y: p[1], R: e.R * scale * kk });
            }
            drawRosePetals(
              backend,
              p[0],
              p[1],
              e.R * scale * kk,
              e.rot + j[2] + rw + (tl ? tl[0] * 0.22 : 0),
              e,
              a,
              tl,
              st.C
            );
          }
        }
      };
      l.els.forEach(each);
      if (l.endEls) l.endEls.forEach(each);
      const i = act.indexOf(l),
        nx = i >= 0 ? act[i + 1] : null;
      if (l.tend && (l.dead || !nx || nx.ch === " ")) {
        let fr = easeOutCubic(((now - (l.tb || 0)) * sp - 150) / 450);
        if (l.cut != null)
          fr *= 1 - easeOutCubic(((now - l.cut) * sp) / 150) * Math.min(0.85, (st.recoil || 20) / (0.6 * scale));
        for (const e of l.tend) {
          const actualFr = fr * kk;
          if (actualFr <= 0) continue;
          const j = jitter(e.id, f, amp);
          const P = e.pts.map((p: number[]) =>
            warpPoint(st, l, l.x! + p[0] * scale + j[0], l.y! + p[1] * scale + j[1], now)
          );
          for (const sg of e.segs) {
            if (sg.layer !== layer) continue;
            const b = Math.min(sg.u1, actualFr);
            if (b <= sg.u0) continue;
            const n = P.length - 1;
            const subPts = P.slice(Math.floor(sg.u0 * n), Math.min(n + 1, Math.floor(b * n) + 2));
            if (subPts.length >= 2) backend.stroke(subPts, st.C.blue, scale * 0.022 * (e.w || 1));
          }
        }
      }
    }
  };

  drawLayer(0);
  for (const l of L) {
    if (l.ch !== " " && (st.textAll || !l.dead)) backend.text(l.ch, l.x!, l.y!, scale, st.C.text);
  }
  drawLayer(1);
}
