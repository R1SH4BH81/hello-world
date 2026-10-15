import { drawButterfly } from "./garden-engine";

export interface ButterflyState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  st: "sit" | "fly" | "wander" | "leave";
  pid: string | number | null;
  hx: number;
  hy: number;
  t0: number;
  ph: number;
  sz: number;
  seed: number;
  ang: number;
  open?: number;
  ex?: number;
  ey?: number;
}

export function spawnButterfly(
  flies: ButterflyState[],
  perches: any[],
  cx: number,
  cy: number,
  W: number,
  H: number,
  scale: number
): ButterflyState {
  if (flies.length >= 6) {
    const o = flies.find(f => f.st !== "leave");
    if (o) {
      o.st = "leave";
      o.pid = null;
      o.ex = o.x < W / 2 ? -80 : W + 80;
      o.ey = o.y - H * 0.3;
    }
  }

  const taken = new Set(flies.filter(f => f.st !== "leave").map(f => f.pid));
  let best = null,
    bd = 1e9;
  for (const p of perches) {
    if (taken.has(p.id)) continue;
    const d = Math.hypot(p.x - cx, p.y - cy);
    if (d < bd) {
      bd = d;
      best = p;
    }
  }

  const left = cx < W / 2;
  const sz = Math.max(9, scale * 0.09);
  return {
    x: left ? -40 : W + 40,
    y: cy + (Math.random() - 0.5) * H * 0.4,
    vx: 0,
    vy: 0,
    st: best ? "fly" : "wander",
    pid: best ? best.id : null,
    hx: cx,
    hy: cy,
    t0: performance.now(),
    ph: Math.random() * 6,
    sz,
    seed: Math.random() * 100,
    ang: 0,
  };
}

export function updateAndDrawButterflies(
  backend: any,
  flies: ButterflyState[],
  perches: any[],
  W: number,
  H: number,
  now: number,
  dt: number,
  colors: any
): ButterflyState[] {
  const byId: Record<string | number, any> = {};
  for (const p of perches) byId[p.id] = p;

  return flies.filter(f => {
    const t = (now - f.t0) / 1000;
    let tx: number = f.x,
      ty: number = f.y;

    if (f.st === "sit" || f.st === "fly") {
      const p = byId[f.pid!];
      if (!p) {
        f.st = "leave";
        f.pid = null;
        f.ex = f.x < W / 2 ? -80 : W + 80;
        f.ey = f.y - H * 0.3;
      } else {
        tx = p.x + p.R * 0.05;
        ty = p.y - p.R * 0.55;
      }
    }
    if (f.st === "wander") {
      tx = f.hx + Math.sin(t * 1.3 + f.seed) * 70;
      ty = f.hy + Math.sin(t * 2.1 + f.seed) * 40;
      if (t > 3.5) {
        f.st = "leave";
        f.pid = null;
        f.ex = f.x < W / 2 ? -80 : W + 80;
        f.ey = f.y - H * 0.3;
      }
    }
    if (f.st === "leave") {
      tx = f.ex ?? (f.x < W / 2 ? -80 : W + 80);
      ty = f.ey ?? (f.y - H * 0.3);
    }
    if (f.st === "sit") {
      f.x += (tx - f.x) * 0.35;
      f.y += (ty - f.y) * 0.35;
      f.ang *= 0.85;
      f.ph += dt * 0.004;
      const burst = Math.sin((now / 1000) * 0.9 + f.seed) > 0.75;
      f.open = burst ? 0.2 + 0.8 * Math.abs(Math.cos((now / 1000) * 9 + f.seed)) : 0.25 + 0.15 * Math.sin(f.ph);
    } else {
      const dx = tx - f.x,
        dy = ty - f.y,
        d = Math.hypot(dx, dy) || 1;
      const sp = f.st === "leave" ? 0.42 : Math.min(0.34, 0.06 + d * 0.0016);
      const flut = Math.sin(t * 7 + f.seed) * 0.12,
        wob = Math.cos(t * 4.3 + f.seed) * 0.1;
      const ax = (dx / d) * sp + wob - f.vx,
        ay = (dy / d) * sp + flut - f.vy;
      f.vx += (ax * 0.06 * dt) / 16;
      f.vy += (ay * 0.06 * dt) / 16;
      f.x += f.vx * dt;
      f.y += f.vy * dt + Math.sin(t * 13 + f.seed) * 0.6;
      f.ang += (Math.max(-0.5, Math.min(0.5, f.vx * 1.4)) - f.ang) * 0.1;
      f.open = Math.abs(Math.cos(t * 17 + f.seed));
      if (f.st === "fly" && d < 5) {
        f.st = "sit";
        f.ph = 0;
      }
      if (f.st === "leave" && (f.x < -60 || f.x > W + 60 || f.y < -60)) return false;
    }
    drawButterfly(backend, f.x, f.y, f.sz, f.ang, f.open || 0, colors);
    return true;
  });
}
