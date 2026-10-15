import { Letter } from "./garden-engine";
import { renderGardenScene } from "./scene-renderer";
import { FONT_FAMILY } from "../constants/garden";
import { Palette } from "../constants/palettes";

/**
 * Generates an SVG vector graphic representing the live garden scene.
 */
export function generateGardenSvg(
  letters: Letter[],
  scale: number,
  palette: Palette,
  W: number,
  H: number,
  glyphs: any,
  props: { boil: boolean; recoil: number }
): string {
  const seen: Record<string, number> = {};
  const lid = (ch: string) => {
    const b = ch.toLowerCase() !== ch.toUpperCase() ? ch : /[0-9]/.test(ch) ? "digit-" + ch : "glyph";
    seen[b] = (seen[b] || 0) + 1;
    return seen[b] > 1 ? b + "-" + seen[b] : b;
  };

  const parts: string[] = [];
  const n = (v: number) => Math.round(v * 100) / 100;
  const pb = () => ({
    d: "",
    moveTo(x: number, y: number) { this.d += `M${n(x)} ${n(y)}`; },
    lineTo(x: number, y: number) { this.d += `L${n(x)} ${n(y)}`; },
    quadraticCurveTo(a: number, b: number, x: number, y: number) { this.d += `Q${n(a)} ${n(b)} ${n(x)} ${n(y)}`; },
    closePath() { this.d += "Z"; },
  });

  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const svgBackend = {
    fill: (pts: [number, number][], col: string) => {
      const b = pb();
      b.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) b.lineTo(pts[i][0], pts[i][1]);
      b.closePath();
      parts.push(`<path d="${b.d}" fill="${col}"/>`);
    },
    stroke: (pts: [number, number][], col: string, w: number) => {
      const b = pb();
      b.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) b.lineTo(pts[i][0], pts[i][1]);
      parts.push(
        `<path d="${b.d}" fill="none" stroke="${col}" stroke-width="${n(w)}" stroke-linecap="round" stroke-linejoin="round"/>`
      );
    },
    rect: () => {},
    text: (ch: string, x: number, y: number, scaleVal: number, col: string) => {
      const F = (glyphs && glyphs.faces) || [];
      const f = F.find((o: any) => o.g[ch]);
      const g = f && f.g[ch];
      if (g) {
        const k = scaleVal / f.upm,
          x0 = x - (g[0] * k) / 2;
        let d = "",
          px: number | null = null,
          sep = "";
        for (const tok of g[1].match(/[MLCQZ]|-?[0-9.]+/g) || []) {
          if (tok >= "A") {
            d += tok;
            sep = "";
            continue;
          }
          const v = +tok;
          if (px === null) {
            px = v;
            continue;
          }
          d += sep + n(x0 + px * k) + " " + n(y - v * k);
          sep = " ";
          px = null;
        }
        parts.push(`<path id="${lid(ch)}" d="${d}" fill="${col}"/>`);
      } else {
        parts.push(
          `<text x="${n(x)}" y="${n(y)}" text-anchor="middle" font-family="${FONT_FAMILY}" font-weight="700" font-size="${n(
            scaleVal
          )}" fill="${col}">${esc(ch)}</text>`
        );
      }
    },
  };

  renderGardenScene(svgBackend, performance.now(), {
    letters,
    S: scale,
    C: palette.colors,
    boil: props.boil,
    recoil: props.recoil,
    speed: 1,
    wither: 260,
    face: true,
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${n(W)}" height="${n(H)}" viewBox="0 0 ${n(W)} ${n(
    H
  )}"><rect width="100%" height="100%" fill="${palette.bg}"/>${parts.join("")}</svg>`;
}
