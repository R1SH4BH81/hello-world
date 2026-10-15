import { FONT_FAMILY } from "../constants/garden";

export function drawSmoothPath(
  ctx: CanvasRenderingContext2D,
  points: [number, number][],
  closed: boolean
) {
  const n = points.length;
  if (n < 2) return;
  const midpoint = (a: [number, number], b: [number, number]): [number, number] => [
    (a[0] + b[0]) / 2,
    (a[1] + b[1]) / 2,
  ];

  if (closed) {
    const s = midpoint(points[n - 1], points[0]);
    ctx.moveTo(s[0], s[1]);
    for (let i = 0; i < n; i++) {
      const q = midpoint(points[i], points[(i + 1) % n]);
      ctx.quadraticCurveTo(points[i][0], points[i][1], q[0], q[1]);
    }
    ctx.closePath();
  } else {
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < n - 1; i++) {
      const q = midpoint(points[i], points[i + 1]);
      ctx.quadraticCurveTo(points[i][0], points[i][1], q[0], q[1]);
    }
    ctx.lineTo(points[n - 1][0], points[n - 1][1]);
  }
}

export function createBackend(ctx: CanvasRenderingContext2D) {
  return {
    fill: (points: [number, number][], color: string) => {
      ctx.beginPath();
      drawSmoothPath(ctx, points, true);
      ctx.fillStyle = color;
      ctx.fill();
    },
    stroke: (points: [number, number][], color: string, width: number) => {
      ctx.beginPath();
      drawSmoothPath(ctx, points, false);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    },
    rect: (x: number, y: number, w: number, h: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    },
    text: (ch: string, x: number, y: number, size: number, color: string) => {
      ctx.font = `700 ${size}px ${FONT_FAMILY}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = color;
      ctx.fillText(ch, x, y);
    },
  };
}

export function generateVine(
  base: number[],
  dir: number,
  len: number,
  amp: number,
  waves: number,
  ph: number,
  bend: number,
  n = 40
): [number, number][] {
  const points: [number, number][] = [[base[0], base[1]]];
  const step = len / n;
  let x = base[0], y = base[1];
  for (let i = 1; i <= n; i++) {
    const u = i / n;
    const a = dir + bend * u + amp * Math.sin(u * Math.PI * waves + ph) * Math.min(1, u * 3);
    x += Math.cos(a) * step;
    y += Math.sin(a) * step;
    points.push([x, y]);
  }
  return points;
}

export function generateCurl(
  points: [number, number][],
  sign: number,
  rad: number
): [number, number][] {
  const n = points.length, e = points[n - 1];
  const a = Math.atan2(e[1] - points[n - 2][1], e[0] - points[n - 2][0]);
  const c = [e[0] - Math.sin(a) * sign * rad, e[1] + Math.cos(a) * sign * rad];
  const a0 = Math.atan2(e[1] - c[1], e[0] - c[0]);
  for (let i = 1; i <= 14; i++) {
    const u = i / 14, t = a0 + sign * u * Math.PI * 1.6, rr = rad * (1 - 0.5 * u);
    points.push([c[0] + Math.cos(t) * rr, c[1] + Math.sin(t) * rr]);
  }
  return points;
}

export interface WeaveSegment {
  u0: number;
  u1: number;
  layer: number;
}

export function generateWeave(rng: () => number, startLayer: number): WeaveSegment[] {
  const cuts: number[] = [];
  const nc = 1 + Math.floor(rng() * 3);
  for (let i = 0; i < nc; i++) cuts.push(0.15 + rng() * 0.7);
  cuts.sort((a, b) => a - b);
  const segments: WeaveSegment[] = [];
  let u0 = 0, layer = startLayer;
  for (const c of cuts) {
    if (c <= u0) continue;
    segments.push({ u0, u1: c, layer });
    if (rng() < 0.3) {
      const gap = 0.02 + rng() * 0.03;
      u0 = Math.min(0.98, c + gap);
    } else {
      u0 = c;
    }
    layer = 1 - layer;
  }
  segments.push({ u0, u1: 1, layer });
  return segments;
}

export function getLayerAt(segments: WeaveSegment[], u: number): number {
  for (const s of segments) {
    if (u >= s.u0 && u <= s.u1) return s.layer;
  }
  return segments[segments.length - 1].layer;
}
