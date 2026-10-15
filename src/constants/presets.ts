export interface MotionPreset {
  id: string;
  label: string;
  sub: string;
  T: number;
}

export const PRESETS: MotionPreset[] = [
  { id: "breathe", label: "Breathe", sub: "Slow sway · 3s", T: 3000 },
  { id: "grow", label: "Grow & wither", sub: "Bloom, then back · 6s", T: 6000 },
  { id: "typed", label: "Typed", sub: "Type, cut, repeat · 5s", T: 5000 },
  { id: "wind", label: "Gust", sub: "Wind sweeps through · 4s", T: 4000 },
  { id: "reach", label: "Reach", sub: "Stems follow a light · 6s", T: 6000 },
  { id: "scatter", label: "Scatter", sub: "Random bloom, fade · 6s", T: 6000 },
  { id: "visit", label: "Visitor", sub: "Butterfly drops by · 7s", T: 7000 },
];

export function getPreset(id: string): MotionPreset {
  return PRESETS.find(p => p.id === id) || PRESETS[0];
}
